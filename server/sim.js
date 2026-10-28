/* Бой на сервере: запускает страницу игры (index.html) без графики в jsdom.
   Страница работает как хост комнаты (режим ?srv): подключается к relay.js по WebSocket,
   все люди в комнате — гости, бой считается здесь, поэтому у всех одинаковый пинг и подкрутить бой из браузера нельзя.
   Запуск: node sim.js <код> <1v1|2v2> <pub 0|1> <ник создателя> <порт relay>. Процесс сам завершается, когда комната пустеет. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM, VirtualConsole } = require("jsdom");
const WebSocket = require("ws");

const [code, mode, pub, nick, port] = process.argv.slice(2);
const ROOT = path.join(__dirname, "..");
const LOCAL = `http://127.0.0.1:${port}`;

let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").replace(/<script src="[^"]*"><\/script>/g, "");
const vc = new VirtualConsole();
vc.on("jsdomError", e => console.error("page:", String(e.message).slice(0, 300)));
vc.on("warn", (...a) => { const m = a.join(" "); if (m.startsWith("[anticheat]")) console.log(m.slice(0, 300)); });
const q = new URLSearchParams({ srv: "1", mode, pub, nick, ws: `ws://127.0.0.1:${port}/arena` });
const dom = new JSDOM(html, { runScripts: "outside-only", url: "https://switer92.github.io/WoW_Classic_Arena/?" + q, pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, ctx = dom.getInternalVMContext();
const run = (src, f) => new vm.Script(src, { filename: f }).runInContext(ctx);

/* three.js нужен ради математики и сцены; рисовать нечем и незачем, поэтому рендерер — заглушка */
run(fs.readFileSync(require.resolve("three/build/three.min.js"), "utf8"), "three.js");
class NoRenderer {
  constructor() { this.domElement = w.document.createElement("canvas"); this.shadowMap = {}; this.capabilities = { getMaxAnisotropy: () => 1 }; this.info = { render: {} }; }
  setPixelRatio() {} setSize() {} render() {} setClearColor() {} compile() {} dispose() {} getPixelRatio() { return 1 } setRenderTarget() {} clear() {}
}
w.THREE.WebGLRenderer = NoRenderer;
w.THREE.GLTFLoader = class { load(u, ok, p, err) { if (err) err(new Error("no models on server")); } setPath() { return this } };
w.THREE.SkeletonUtils = { clone: o => o.clone() };
w.HTMLCanvasElement.prototype.getContext = function () {
  const self = this;
  return new Proxy({}, { get: (t, k) => k === "canvas" ? self : k === "measureText" ? () => ({ width: 10 })
    : (k === "getImageData" || k === "createImageData") ? () => ({ data: new Uint8ClampedArray(4 * 64 * 64) }) : () => ({ addColorStop() {} }) });
};
/* файлы игры читаем с диска, баланс из админки берём у своего сервера, остальная сеть не нужна */
w.fetch = async u => {
  u = String(u);
  if (u.includes("/arena/api/balance")) return fetch(LOCAL + "/arena/api/balance");
  if (/^https?:/.test(u) && !u.startsWith(w.location.origin)) throw new Error("offline");
  const rel = decodeURIComponent(u.replace(/^https?:\/\/[^/]+\/WoW_Classic_Arena\//, "").split("?")[0]);
  const p = path.join(ROOT, rel);
  if (!p.startsWith(path.join(ROOT, "assets"))) throw new Error("not found");
  const b = fs.readFileSync(p);
  return { ok: true, json: async () => JSON.parse(b), arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.length), text: async () => b.toString() };
};
w.WebSocket = WebSocket;
w.TextDecoder = TextDecoder; w.TextEncoder = TextEncoder;
w.AudioContext = undefined; w.webkitAudioContext = undefined;
w.Worker = class { postMessage() {} terminate() {} };
w.URL.createObjectURL = () => "blob:none";

for (const s of w.document.querySelectorAll("script")) run(s.textContent, "index.html");

const started = Date.now();
let emptySince = Date.now();
w.srvHost(code).then(() => console.log(`room ${code} (${mode}) is up, map ${run("MAP?\"nagrand\":\"fallback\"","m")}`)).catch(e => { console.error("host failed", e && e.type); process.exit(1); });
/* пустая комната живёт минуту, потом процесс завершается */
setInterval(() => {
  const n = run("netGuests().length", "check");
  if (n) emptySince = Date.now();
  else if (Date.now() - emptySince > 60000) process.exit(0);
  if (Date.now() - started > 6 * 3600 * 1000) process.exit(0);
}, 5000);
