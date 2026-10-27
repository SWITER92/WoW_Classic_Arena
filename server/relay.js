/* Сервер комнат для сетевой арены.
   Хост (тот, кто создал комнату) по-прежнему считает бой у себя в браузере,
   а все игроки соединяются не напрямую друг с другом, а через этот сервер по WebSocket.
   Так вход работает через любой роутер и мобильный интернет, а бесплатный PeerJS больше не нужен.

   Подключение: wss://<домен>/arena?room=ABCD&role=host|client
   Хост шлёт {o} всем гостям или {to:id,o} одному, {kick:id} отключает гостя.
   Гость шлёт сам объект o, хост получает {t:"_m",from:id,o}.
   Служебные сообщения сервера: _hosted, _open, _close, _err. */
"use strict";
const http = require("http");
const { WebSocketServer } = require("ws");
const admin = require("./admin");
const { spawn } = require("child_process");
const path = require("path");

const PORT = +process.env.PORT || 8080;
const MAX_GUESTS = 6;
const MAX_ROOMS = 200;
const MAX_PER_IP = 12;
const ORIGINS = (process.env.ALLOWED_ORIGINS || "https://switer92.github.io").split(",").map(s => s.trim()).filter(Boolean);

const rooms = new Map();
const MAX_SIMS = +process.env.MAX_SIMS || 8;
const sims = new Map();
const createdAt = new Map();
const perIp = new Map();

const server = http.createServer((req, res) => {
  if (req.url === "/arena/api/lobby" && req.method === "GET") {
    /* открытые комнаты и сколько людей сейчас в игре: видно всем в меню игры */
    const list = [];
    for (const [code, r] of rooms) {
      if (!r.pub || !r.info || r.host.readyState !== 1) continue;
      /* в серверной комнате хост — сам сервер, людей считаем только гостей; пустую не показываем */
      const n = sims.has(code) ? r.guests.size : 1 + r.guests.size;
      if (n > 0) list.push({ code, ...r.info, n });
    }
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" });
    res.end(JSON.stringify({ online: admin.onlineCount(), rooms: list.slice(0, 50) }));
    return;
  }
  if (req.url === "/arena/api/create" && (req.method === "POST" || req.method === "OPTIONS")) { createRoom(req, res); return; }
  if (req.url.startsWith("/arena/admin") || req.url.startsWith("/arena/api/")) {
    admin.handle(req, res).catch(() => { try { res.writeHead(500); res.end(); } catch (e) {} });
    return;
  }
  if (req.url === "/health" || req.url === "/arena/health") {
    res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, players: [...rooms.values()].reduce((n, r) => n + 1 + r.guests.size, 0) }));
    return;
  }
  res.writeHead(404);
  res.end();
});

/* сжатие выключено: сообщения маленькие, а задержка важнее трафика */
const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: 64 * 1024 });

const originOk = o => !o || ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);

server.on("upgrade", (req, sock, head) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname !== "/arena" || !originOk(req.headers.origin)) { sock.destroy(); return; }
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if ((perIp.get(ip) || 0) >= MAX_PER_IP) { sock.destroy(); return; }
  wss.handleUpgrade(req, sock, head, ws => {
    perIp.set(ip, (perIp.get(ip) || 0) + 1);
    ws.on("close", () => { const n = (perIp.get(ip) || 1) - 1; if (n > 0) perIp.set(ip, n); else perIp.delete(ip); });
    onConnect(ws, url.searchParams.get("room") || "", url.searchParams.get("role"), url.searchParams.get("pub") === "1");
  });
});

const send = (ws, o) => { if (ws.readyState === 1) ws.send(typeof o === "string" ? o : JSON.stringify(o)); };
const fail = (ws, e) => { send(ws, { t: "_err", e }); ws.close(); };

function onConnect(ws, code, role, pub) {
  code = code.toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code) || (role !== "host" && role !== "client")) return fail(ws, "bad-request");
  ws.alive = true;
  ws.on("pong", () => { ws.alive = true; });

  if (role === "host") {
    const old = rooms.get(code);
    if (old && old.host.readyState === 1) return fail(ws, "unavailable-id");
    if (!old && rooms.size >= MAX_ROOMS) return fail(ws, "server-full");
    const room = { host: ws, guests: new Map(), next: 1, pub, info: null };
    rooms.set(code, room);
    send(ws, { t: "_hosted" });
    ws.on("message", data => {
      let m;
      try { m = JSON.parse(data); } catch (e) { return; }
      if (!m || typeof m !== "object") return;
      if (m.info && typeof m.info === "object") {
        const i = m.info, str = (v, n) => String(v || "").replace(/[<>]/g, "").slice(0, n);
        room.info = { nick: str(i.nick, 16) || "Игрок", fmt: ["2v2", "3v3"].includes(i.fmt) ? i.fmt : "1v1", max: Math.min(6, Math.max(2, i.max | 0)), fight: !!i.fight };
        return;
      }
      if (m.kick) { const g = room.guests.get(m.kick); if (g) g.close(); return; }
      if (m.o === undefined) return;
      const s = JSON.stringify(m.o);
      if (m.to) { const g = room.guests.get(m.to); if (g) send(g, s); }
      else for (const g of room.guests.values()) send(g, s);
    });
    ws.on("close", () => {
      if (rooms.get(code) !== room) return;
      rooms.delete(code);
      for (const g of room.guests.values()) { send(g, { t: "_close" }); g.close(); }
    });
    return;
  }

  const room = rooms.get(code);
  if (!room || room.host.readyState !== 1) return fail(ws, "peer-unavailable");
  if (room.guests.size >= MAX_GUESTS) { send(ws, { t: "full" }); ws.close(); return; }
  const id = "g" + room.next++;
  room.guests.set(id, ws);
  send(room.host, { t: "_open", id });
  send(ws, { t: "_open" });
  ws.on("message", data => {
    /* гость не может притвориться другим: сервер сам подписывает, от кого сообщение */
    let o;
    try { o = JSON.parse(data); } catch (e) { return; }
    if (!o || typeof o !== "object") return;
    send(room.host, { t: "_m", from: id, o });
  });
  ws.on("close", () => {
    if (room.guests.get(id) !== ws) return;
    room.guests.delete(id);
    send(room.host, { t: "_close", id });
  });
}

/* комната на сервере: отдельный процесс sim.js считает бой как хост и подключается сюда же */
function createRoom(req, res) {
  const origin = req.headers.origin;
  const h = { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": originOk(origin) && origin ? origin : ORIGINS[0], vary: "origin" };
  if (req.method === "OPTIONS") { res.writeHead(204, h); res.end(); return; }
  const reply = (code, o) => { res.writeHead(code, h); res.end(JSON.stringify(o)); };
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (Date.now() - (createdAt.get(ip) || 0) < 5000) return reply(429, { error: "Подождите несколько секунд" });
  if (sims.size >= MAX_SIMS) return reply(503, { error: "Сервер занят" });
  let body = "";
  req.on("data", c => { body += c; if (body.length > 2000) req.destroy(); });
  req.on("end", () => {
    let b = {};
    try { b = JSON.parse(body || "{}"); } catch (e) {}
    createdAt.set(ip, Date.now());
    let code;
    do { code = Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.random() * 32 | 0]).join(""); } while (rooms.has(code) || sims.has(code));
    const nick = String(b.nick || "Игрок").replace(/[<>]/g, "").slice(0, 16);
    const child = spawn(process.execPath, ["--max-old-space-size=256", path.join(__dirname, "sim.js"), code, ["2v2", "3v3"].includes(b.mode) ? b.mode : "1v1", b.pub ? "1" : "0", nick, String(PORT)], { stdio: ["ignore", "inherit", "inherit"] });
    sims.set(code, child);
    child.on("exit", () => sims.delete(code));
    const t0 = Date.now();
    const wait = setInterval(() => {
      const r = rooms.get(code);
      if (r && r.host.readyState === 1) { clearInterval(wait); reply(200, { code }); }
      else if (Date.now() - t0 > 20000 || !sims.has(code)) { clearInterval(wait); try { child.kill(); } catch (e) {} reply(500, { error: "Не удалось создать комнату" }); }
    }, 100);
  });
}

/* оборванные соединения (уснувший ноутбук, пропавший Wi-Fi) убираем через 30 секунд */
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false;
    try { ws.ping(); } catch (e) {}
  }
}, 15000);

admin.setRelayStats(() => ({ rooms: rooms.size, players: [...rooms.values()].reduce((n, r) => n + 1 + r.guests.size, 0) }));
server.listen(PORT, "127.0.0.1", () => console.log(`arena relay on 127.0.0.1:${PORT}`));
