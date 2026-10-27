/* Админка баланса: хранение правок, вход по паролю, история версий.
   Правки хранятся как частичный объект поверх значений игры по умолчанию (defaults.json):
   только числа и массивы чисел по путям, которые есть в игре. Игра берёт их через GET /arena/api/balance.
   Файлы в DATA_DIR: admin.json (хеш пароля), balance.json (текущие правки), history/<n>.json (все версии). */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA = process.env.DATA_DIR || "/opt/arena/data";
const HIST = path.join(DATA, "history");
const DEFAULTS = JSON.parse(fs.readFileSync(path.join(__dirname, "defaults.json"), "utf8"));
const ADMIN_HTML = path.join(__dirname, "admin.html");
const ORIGINS = (process.env.ALLOWED_ORIGINS || "https://switer92.github.io").split(",").map(s => s.trim()).filter(Boolean);
const TOKEN_TTL = 12 * 3600 * 1000;
const BAD = new Set(["__proto__", "constructor", "prototype"]);

const tokens = new Map();
const online = new Map();
let relayStats = () => ({ rooms: 0, players: 0 });
const fails = new Map();

try { fs.mkdirSync(HIST, { recursive: true }); } catch (e) {}
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return d; } };
const writeJson = (f, o) => { const t = f + ".tmp"; fs.writeFileSync(t, JSON.stringify(o, null, 1)); fs.renameSync(t, f); };

let current = readJson(path.join(DATA, "balance.json"), { version: 0, at: null, note: "", data: {} });

/* оставляем только то, что есть в игре и имеет тот же тип: число или массив чисел той же длины */
function clean(over, def) {
  const out = {};
  if (!over || typeof over !== "object" || Array.isArray(over)) return out;
  for (const k of Object.keys(over)) {
    if (BAD.has(k) || !(k in def)) continue;
    const v = over[k], d = def[k];
    if (typeof d === "number") { if (typeof v === "number" && isFinite(v)) out[k] = v; }
    else if (Array.isArray(d)) { if (Array.isArray(v) && v.length === d.length && v.every(x => typeof x === "number" && isFinite(x))) out[k] = v; }
    else if (d && typeof d === "object") { const c = clean(v, d); if (Object.keys(c).length) out[k] = c; }
  }
  return out;
}

function checkPassword(pw) {
  const a = readJson(path.join(DATA, "admin.json"), null);
  if (!a || !a.salt || !a.hash || typeof pw !== "string") return false;
  const h = crypto.scryptSync(pw, Buffer.from(a.salt, "hex"), 64);
  return crypto.timingSafeEqual(h, Buffer.from(a.hash, "hex"));
}

function authed(req) {
  const m = /^Bearer (\w+)$/.exec(req.headers.authorization || "");
  const t = m && tokens.get(m[1]);
  if (!t || t < Date.now()) return false;
  return true;
}

function body(req) {
  return new Promise((ok, no) => {
    let s = "";
    req.on("data", c => { s += c; if (s.length > 512 * 1024) { no(new Error("too big")); req.destroy(); } });
    req.on("end", () => { try { ok(JSON.parse(s || "{}")); } catch (e) { no(e); } });
  });
}

function json(req, res, code, o) {
  const h = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
  const origin = req.headers.origin;
  if (origin && (ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) { h["access-control-allow-origin"] = origin; h.vary = "origin"; }
  res.writeHead(code, h);
  res.end(JSON.stringify(o));
}

const flat = (o, pre, out) => { for (const k in o || {}) { const v = o[k], p = pre.concat(k); if (v && typeof v === "object" && !Array.isArray(v)) flat(v, p, out); else out.push(p); } return out; };
const getp = (o, p) => p.reduce((a, k) => a == null ? a : a[k], o);
/* что изменилось относительно прошлой версии: путь, было, стало */
function diff(prev, next) {
  const keys = new Map();
  for (const p of flat(prev, [], []).concat(flat(next, [], []))) keys.set(p.join("\u0001"), p);
  const out = [];
  for (const p of keys.values()) {
    const d = getp(DEFAULTS.def, p), a = getp(prev, p), b = getp(next, p);
    const from = a !== undefined ? a : d, to = b !== undefined ? b : d;
    if (JSON.stringify(from) !== JSON.stringify(to)) out.push({ p, from, to });
  }
  return out;
}

function publish(data, note) {
  const v = { version: current.version + 1, at: new Date().toISOString(), note: String(note || "").slice(0, 300), data, changes: diff(current.data, data) };
  writeJson(path.join(HIST, v.version + ".json"), v);
  writeJson(path.join(DATA, "balance.json"), v);
  current = v;
  return v;
}

/* возвращает true, если запрос обработан */
async function handle(req, res) {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  if (p === "/arena/admin" || p === "/arena/admin/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY" });
    res.end(fs.readFileSync(ADMIN_HTML));
    return true;
  }
  if (!p.startsWith("/arena/api/")) return false;
  const r = p.slice(11);
  try {
    if (req.method === "OPTIONS") { json(req, res, 204, {}); return true; }
    if (r === "balance" && req.method === "GET") { json(req, res, 200, { version: current.version, at: current.at, data: current.data }); return true; }
    if (r === "defaults" && req.method === "GET") { json(req, res, 200, DEFAULTS); return true; }
    if (r === "ping" && req.method === "POST") {
      const b = await body(req);
      if (typeof b.sid === "string" && /^[a-z0-9]{8,32}$/.test(b.sid) && (online.has(b.sid) || online.size < 5000))
        online.set(b.sid, { t: Date.now(), fight: !!b.fight, net: !!b.net });
      json(req, res, 200, { ok: true });
      return true;
    }
    if (r === "login" && req.method === "POST") {
      const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
      const f = fails.get(ip) || { n: 0, until: 0 };
      if (f.until > Date.now()) { json(req, res, 429, { error: "Слишком много попыток, подождите минуту" }); return true; }
      const b = await body(req);
      if (!checkPassword(b.password)) {
        f.n++; if (f.n >= 5) { f.until = Date.now() + 60000; f.n = 0; } fails.set(ip, f);
        json(req, res, 401, { error: "Неверный пароль" }); return true;
      }
      fails.delete(ip);
      const t = crypto.randomBytes(24).toString("hex");
      tokens.set(t, Date.now() + TOKEN_TTL);
      json(req, res, 200, { token: t });
      return true;
    }
    if (!authed(req)) { json(req, res, 401, { error: "Нужен вход" }); return true; }
    if (r === "balance" && req.method === "POST") {
      const b = await body(req);
      const v = publish(clean(b.data, DEFAULTS.def), b.note);
      json(req, res, 200, { version: v.version, at: v.at });
      return true;
    }
    if (r === "overview" && req.method === "GET") {
      const t = Date.now(), list = [...online.values()].filter(o => t - o.t < 75000);
      const last = current.version ? readJson(path.join(HIST, current.version + ".json"), {}) : null;
      json(req, res, 200, { online: list.length, fight: list.filter(o => o.fight).length, net: list.filter(o => o.net).length, relay: relayStats(),
        version: current.version, overrides: count(current.data), last: last && { version: last.version, at: last.at, note: last.note, changes: last.changes || [] } });
      return true;
    }
    if (r === "history" && req.method === "GET") {
      const list = fs.readdirSync(HIST).map(f => parseInt(f)).filter(n => n > 0).sort((a, b) => b - a).slice(0, 100)
        .map(n => { const v = readJson(path.join(HIST, n + ".json"), {}); return { version: n, at: v.at, note: v.note, total: count(v.data), changes: v.changes || [] }; });
      json(req, res, 200, { current: current.version, list });
      return true;
    }
    if (r === "rollback" && req.method === "POST") {
      const b = await body(req);
      const old = readJson(path.join(HIST, (parseInt(b.version) || 0) + ".json"), null);
      if (!old) { json(req, res, 404, { error: "Нет такой версии" }); return true; }
      const v = publish(clean(old.data, DEFAULTS.def), "Откат к версии " + old.version);
      json(req, res, 200, { version: v.version, at: v.at });
      return true;
    }
    json(req, res, 404, { error: "not found" });
  } catch (e) {
    json(req, res, 400, { error: "Плохой запрос" });
  }
  return true;
}

function count(o) { let n = 0; for (const k in o || {}) n += o[k] && typeof o[k] === "object" && !Array.isArray(o[k]) ? count(o[k]) : 1; return n; }

setInterval(() => { const t = Date.now(); for (const [k, v] of tokens) if (v < t) tokens.delete(k); for (const [k, v] of online) if (t - v.t > 120000) online.delete(k); }, 60000);

module.exports = { handle, setRelayStats: f => { relayStats = f; } };
