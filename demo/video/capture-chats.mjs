// Runs the real bot conversation code (bot/src/converse.js) against the real Meta models and the real
// voice service, and saves every reply. The video's chat scenes replay exactly these replies.
//   node demo/video/capture-chats.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const R = new URL("../../", import.meta.url).pathname;
process.loadEnvFile(R + ".env");
for (const l of readFileSync(R + ".env.local", "utf8").split("\n")) { const m = l.match(/^(AUDIO_URL|AUDIO_TOKEN)=(.*)$/); if (m) process.env[m[1]] = m[2]; }
const { converse } = await import(R + "bot/src/converse.js");
const OUT = R + "demo/video/assets/chat/";
mkdirSync(OUT, { recursive: true });

const kvStore = new Map();
const kv = {
  async get(k, type) { const v = kvStore.get(k)?.value; if (v == null) return null; return type === "json" ? JSON.parse(v) : type === "arrayBuffer" ? v : v; },
  async getWithMetadata(k) { const e = kvStore.get(k); return { value: e?.value ?? null, metadata: e?.metadata ?? null }; },
  async put(k, value, o = {}) { kvStore.set(k, { value: value instanceof Uint8Array ? value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) : value, metadata: o.metadata }); },
  async delete(k) { kvStore.delete(k); },
};
const env = { MODEL_API_KEY: process.env.MODEL_API_KEY, AUDIO_URL: process.env.AUDIO_URL, AUDIO_TOKEN: process.env.AUDIO_TOKEN, AP_KV: kv };

async function chat(name, channel, turns) {
  const log = [];
  let voiceN = 0;
  for (const t of turns) {
    log.push({ from: "user", ...t.show });
    const io = {
      channel, user: name, voiceFormat: "mp3",
      say: async (r) => { log.push({ from: "bot", text: r.text, choices: (r.choices ?? []).map((c) => c.title), link: r.link?.title ?? null }); },
      sayVoice: async (bytes) => { const f = `${name}-voice-${++voiceN}.mp3`; writeFileSync(OUT + f, bytes); log.at(-1).voice = f; },
      fetchMedia: async (m) => m,
    };
    const t0 = Date.now();
    await converse(io, t.input, env, "https://accesspoint-bot.aljabrialam.workers.dev");
    log.at(-1).ms = Date.now() - t0;
    const mark = [...kvStore.entries()].filter(([k]) => k.startsWith("b:")).at(-1);
    if (mark) { log.at(-1).mark = JSON.parse(mark[1].value); kvStore.delete(mark[0]); }
  }
  writeFileSync(OUT + `${name}.json`, JSON.stringify(log, null, 2));
  console.log(`\n== ${name} (${channel})`);
  for (const m of log) console.log(m.from === "user" ? `  > ${m.text ?? "[photo " + m.photo + "]"}` : `  < ${m.text.replace(/\n+/g, " / ")}${m.choices?.length ? "  [" + m.choices.join(" | ") + "]" : ""}${m.link ? "  (" + m.link + ")" : ""}${m.voice ? "  🔊" : ""}${m.mark ? "  BOX " + JSON.stringify(m.mark.box) : ""}${m.ms ? `  ${(m.ms / 1000).toFixed(1)}s` : ""}`);
}
const photo = (f) => ({ kind: "image", media: { bytes: new Uint8Array(readFileSync(R + "bot/test/fixtures/" + f)), mime: "image/jpeg" } });

await chat("amara", "telegram", [
  { show: { text: "/start" }, input: { kind: "start", ref: "" } },
  { show: { text: "English", tap: true }, input: { kind: "choice", id: "L:en" } },
  { show: { photo: "airport-seat.jpg" }, input: photo("airport-seat.jpg") },
  { show: { text: "Window 14A", tap: true }, input: { kind: "choice", id: "OPT:0" } },
]);
await chat("siti", "whatsapp", [
  { show: { text: "Hi AccessPoint #checkout" }, input: { kind: "text", text: "Hi AccessPoint #checkout" } },
  { show: { text: "Bahasa Indonesia", tap: true }, input: { kind: "choice", id: "L:id" } },
  { show: { photo: "checkout-scan.jpg" }, input: photo("checkout-scan.jpg") },
]);
await chat("lim", "messenger", [
  { show: { text: "Get Started", tap: true }, input: { kind: "start", ref: "checkout" } },
  { show: { text: "English", tap: true }, input: { kind: "choice", id: "L:en" } },
  { show: { text: "I'm buying one carton of milk" }, input: { kind: "text", text: "I'm buying one carton of milk" } },
  { show: { photo: "checkout-overcharge.jpg" }, input: photo("checkout-overcharge.jpg") },
]);
await chat("rosa", "telegram", [
  { show: { text: "/start" }, input: { kind: "start", ref: "clinic" } },
  { show: { text: "Filipino", tap: true }, input: { kind: "choice", id: "L:tl" } },
  { show: { photo: "clinic-jp.jpg" }, input: photo("clinic-jp.jpg") },
  { show: { text: "はい", tap: true }, input: { kind: "choice", id: "OPT:0" } },
]);
