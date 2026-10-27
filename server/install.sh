#!/usr/bin/env bash
# Установка сервера комнат на чистый Ubuntu 24.04. Запуск от root:
#   curl -fsSL https://raw.githubusercontent.com/SWITER92/WoW_Classic_Arena/main/server/install.sh | bash -s -- <домен>
# Ставит Node.js 22, Caddy (https-сертификат сам), сервер комнат как службу,
# автообновление с GitHub раз в 2 минуты, файрвол (22, 80, 443) и fail2ban.
# Повторный запуск безопасен: просто обновит всё до текущей версии.
set -euo pipefail

DOMAIN="${1:-}"
REPO="https://github.com/SWITER92/WoW_Classic_Arena.git"
DIR=/opt/arena
if [ -z "$DOMAIN" ]; then echo "Укажите домен: bash install.sh имя.duckdns.org"; exit 1; fi
if [ "$(id -u)" != 0 ]; then echo "Запустите от root"; exit 1; fi
export DEBIAN_FRONTEND=noninteractive

echo "== Пакеты"
apt-get update -q
apt-get install -y -q curl git ufw fail2ban gnupg debian-keyring debian-archive-keyring apt-transport-https ca-certificates

echo "== Node.js 22"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -q nodejs
fi

echo "== Caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get install -y -q caddy
fi

echo "== Код сервера"
id arena >/dev/null 2>&1 || useradd --system --home "$DIR" --shell /usr/sbin/nologin arena
mkdir -p "$DIR"
if [ -d "$DIR/repo/.git" ]; then
  runuser -u arena -- git -C "$DIR/repo" fetch -q --depth 1 origin main
  runuser -u arena -- git -C "$DIR/repo" reset -q --hard origin/main
else
  git clone -q --depth 1 "$REPO" "$DIR/repo"
fi
(cd "$DIR/repo/server" && npm ci --omit=dev --no-audit --no-fund)
chown -R arena:arena "$DIR"

echo "== Службы"
cat > /etc/systemd/system/arena-relay.service <<EOF
[Unit]
Description=WoW arena room relay
After=network.target

[Service]
User=arena
WorkingDirectory=$DIR/repo/server
Environment=PORT=8080
ExecStart=/usr/bin/node relay.js
Restart=always
RestartSec=2
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# автообновление: подтянуть main с GitHub, перезапустить сервер только если менялась папка server
cat > /usr/local/bin/arena-update <<EOF
#!/usr/bin/env bash
set -e
cd $DIR/repo
old=\$(runuser -u arena -- git rev-parse HEAD:server)
runuser -u arena -- git fetch -q --depth 1 origin main
runuser -u arena -- git reset -q --hard origin/main
new=\$(runuser -u arena -- git rev-parse HEAD:server)
if [ "\$old" != "\$new" ]; then
  (cd server && runuser -u arena -- env HOME=/opt/arena npm ci --omit=dev --no-audit --no-fund)
  systemctl restart arena-relay
  echo "arena relay updated to \$(runuser -u arena -- git rev-parse --short HEAD)"
fi
EOF
chmod +x /usr/local/bin/arena-update

cat > /etc/systemd/system/arena-update.service <<EOF
[Unit]
Description=Pull WoW arena relay from GitHub

[Service]
Type=oneshot
ExecStart=/usr/local/bin/arena-update
EOF

cat > /etc/systemd/system/arena-update.timer <<EOF
[Unit]
Description=Check GitHub for arena relay updates every 2 minutes

[Timer]
OnBootSec=1min
OnUnitActiveSec=2min

[Install]
WantedBy=timers.target
EOF

echo "== https через Caddy"
cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
	handle /arena* {
		reverse_proxy 127.0.0.1:8080
	}
	handle /health {
		reverse_proxy 127.0.0.1:8080
	}
	handle {
		respond "WoW arena relay" 200
	}
}
EOF

echo "== Файрвол"
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
systemctl enable --now fail2ban >/dev/null 2>&1 || true

systemctl daemon-reload
systemctl enable --now arena-relay arena-update.timer
systemctl restart arena-relay
systemctl reload caddy || systemctl restart caddy

echo "== Проверка"
sleep 3
curl -fsS http://127.0.0.1:8080/health && echo
for i in $(seq 1 30); do
  if curl -fsS "https://$DOMAIN/health" >/dev/null 2>&1; then
    echo "ГОТОВО: https://$DOMAIN/health отвечает, сервер комнат работает."
    exit 0
  fi
  sleep 4
done
echo "Сервер запущен, но https://$DOMAIN пока не отвечает."
echo "Проверьте, что $DOMAIN указывает на IP этого сервера, и подождите пару минут: Caddy получит сертификат сам."
