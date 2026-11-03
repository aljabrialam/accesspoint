// /try: a web test console that runs the exact same conversation code as Messenger and WhatsApp.
// Anyone with the link can use it (Messenger only answers app testers until Meta's app review).
import { Buffer } from "node:buffer";
import { converse } from "./converse.js";

const MAX_BYTES = 8 * 1024 * 1024;
const SAMPLES = ["airport-passport", "airport-seat", "ticket-trip", "checkout-overcharge", "kiosk-pin", "clinic-jp", "checkout-scan"];
const SAMPLE_URL = (name) => `https://raw.githubusercontent.com/aljabrialam/accesspoint/main/bot/test/fixtures/${name}.jpg`;

export async function tryApi(req, env, origin) {
  if (env.TRY_LIMIT) {
    const { success } = await env.TRY_LIMIT.limit({ key: req.headers.get("cf-connecting-ip") ?? "anon" });
    if (!success) return Response.json({ replies: [{ text: "Too many messages in a minute. Wait a moment and try again." }] }, { status: 429 });
  }
  const form = await req.formData();
  const sid = String(form.get("sid") ?? "");
  if (!/^[a-z0-9]{16,40}$/.test(sid)) return Response.json({ error: "bad session" }, { status: 400 });

  const kind = String(form.get("kind") ?? "text");
  let input;
  if (kind === "image" || kind === "audio") {
    const file = form.get("file");
    if (!file || typeof file === "string" || file.size > MAX_BYTES) return Response.json({ error: "bad file" }, { status: 400 });
    input = { kind, media: { bytes: new Uint8Array(await file.arrayBuffer()), mime: file.type } };
  } else if (kind === "sample") {
    const name = String(form.get("sample") ?? "");
    if (!SAMPLES.includes(name)) return Response.json({ error: "bad sample" }, { status: 400 });
    const r = await fetch(SAMPLE_URL(name));
    if (!r.ok) return Response.json({ error: "sample unavailable" }, { status: 502 });
    input = { kind: "image", media: { bytes: new Uint8Array(await r.arrayBuffer()), mime: "image/jpeg" } };
  } else if (kind === "choice") {
    input = { kind: "choice", id: String(form.get("id") ?? "") };
  } else if (kind === "start") {
    input = { kind: "start", ref: String(form.get("ref") ?? "") };
  } else {
    input = { kind: "text", text: String(form.get("text") ?? "").slice(0, 500) };
  }

  const replies = [];
  const io = {
    channel: "web", user: sid, voiceFormat: "mp3",
    say: async (r) => { replies.push({ ...r }); },
    sayVoice: async (bytes) => { if (replies.length) replies.at(-1).audio = `data:audio/mpeg;base64,${Buffer.from(bytes).toString("base64")}`; },
    fetchMedia: async (m) => m,
  };
  await converse(io, input, env, origin);
  return Response.json({ replies });
}

export function tryPage(url) {
  const ref = (url.searchParams.get("m") ?? "").replace(/[^a-z]/g, "");
  return new Response(PAGE.replace("__REF__", ref), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Try AccessPoint</title>
<style>
:root{--brand:#2B47C9;--soft:rgba(43,71,201,.1);--ink:#101828;--ink2:#475467;--mist:#F4F6FB;--line:#E4E8F2}
*{box-sizing:border-box}html,body{height:100%;margin:0;overflow-x:hidden}body{background:var(--mist);color:var(--ink);font:17px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column}
header{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#fff;border-bottom:1px solid var(--line)}
header b{font-size:18px}header small{display:block;color:var(--ink2);font-size:13px}
header label{margin-left:auto;font-size:14px;color:var(--ink2);display:flex;align-items:center;gap:6px;white-space:nowrap}header div{min-width:0}
main{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;max-width:720px;width:100%;margin:0 auto}
.b{max-width:85%;padding:12px 14px;border-radius:18px;white-space:pre-wrap;word-wrap:break-word}
.bot{align-self:flex-start;background:#fff;border:1px solid var(--line);border-bottom-left-radius:6px}
.me{align-self:flex-end;background:var(--brand);color:#fff;border-bottom-right-radius:6px}
.me img{display:block;max-width:220px;border-radius:12px}
.chips{display:flex;flex-wrap:wrap;gap:8px;align-self:flex-start;max-width:90%}
.chips button,.chips a{min-height:44px;padding:0 16px;border-radius:22px;border:1.5px solid var(--brand);background:#fff;color:var(--brand);font:600 16px inherit;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;text-decoration:none}
.chips a{background:var(--brand);color:#fff}
.typing{color:var(--ink2);font-style:italic;align-self:flex-start}
.samples{max-width:720px;width:100%;margin:0 auto;padding:0 16px 8px;font-size:14px;color:var(--ink2);display:flex;flex-wrap:wrap;gap:6px;align-items:center}.samples span{width:100%}
.samples button{min-height:36px;padding:0 12px;border-radius:18px;border:1px solid var(--line);background:#fff;font:14px inherit;font-family:inherit;cursor:pointer}
footer{background:#fff;border-top:1px solid var(--line);padding:10px 12px calc(10px + env(safe-area-inset-bottom))}
form{display:flex;gap:8px;max-width:720px;margin:0 auto}
input[type=text]{flex:1;min-width:0;min-height:48px;border:1.5px solid var(--line);border-radius:24px;padding:0 16px;font:17px inherit;font-family:inherit}
.icon{width:48px;height:48px;border-radius:24px;border:0;background:var(--soft);color:var(--brand);font-size:20px;cursor:pointer;display:grid;place-items:center;flex:none}
.icon.rec{background:#D92D20;color:#fff}.send{background:var(--brand);color:#fff}
.note{max-width:720px;margin:6px auto 0;padding:0 4px;font-size:12px;color:var(--ink2);text-align:center}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
</style></head><body>
<header><svg width="26" height="26" viewBox="58 22 140 212" aria-hidden="true"><path fill="#2B47C9" fill-rule="evenodd" d="M61.5 58a31.5 31.5 0 1 0 63 0a31.5 31.5 0 1 0-63 0ZM133 58a30 30 0 1 0 60 0a30 30 0 1 0-60 0ZM151 58a12 12 0 1 0 24 0a12 12 0 1 0-24 0ZM63 128a30 30 0 1 0 60 0a30 30 0 1 0-60 0ZM81 128a12 12 0 1 0 24 0a12 12 0 1 0-24 0ZM133 128a30 30 0 1 0 60 0a30 30 0 1 0-60 0ZM151 128a12 12 0 1 0 24 0a12 12 0 1 0-24 0ZM63 198a30 30 0 1 0 60 0a30 30 0 1 0-60 0ZM81 198a12 12 0 1 0 24 0a12 12 0 1 0-24 0ZM133 198a30 30 0 1 0 60 0a30 30 0 1 0-60 0ZM151 198a12 12 0 1 0 24 0a12 12 0 1 0-24 0Z"/></svg>
<div><b>AccessPoint</b><small>Stuck at a machine? Send a photo.</small></div>
<label><input type="checkbox" id="speak" checked> Voice</label></header>
<main id="log" aria-live="polite"></main>
<div class="samples"><span>No machine nearby? Try a sample screen:</span>
<button data-s="airport-passport">Airport: scan passport</button><button data-s="airport-seat">Airport: pick a seat</button><button data-s="ticket-trip">Train ticket</button><button data-s="checkout-overcharge">Self-checkout: wrong total</button><button data-s="kiosk-pin">Card PIN</button><button data-s="clinic-jp">Clinic (Japanese)</button></div>
<footer><form id="f">
<label class="icon" title="Send a photo of the screen" aria-label="Send a photo of the screen">📷<input type="file" id="photo" accept="image/*" capture="environment" class="sr"></label>
<button type="button" class="icon" id="mic" aria-label="Record a voice note">🎤</button>
<input type="text" id="t" placeholder="Type, or send a photo" autocomplete="off" aria-label="Message">
<button class="icon send" aria-label="Send">➤</button></form>
<p class="note">Web test console: the same conversation code and guardrails as the AccessPoint Messenger and WhatsApp bot. Replies are spoken with Microsoft Edge neural voices. Photos are kept 10 minutes, voice notes never. Don't photograph your PIN.</p></footer>
<script>
const REF = "__REF__";
const log = document.getElementById("log");
let sid = localStorage.getItem("ap_sid");
if (!sid || !/^[a-z0-9]{16,40}$/.test(sid)) { sid = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(36).padStart(2, "0")).join("").slice(0, 20); localStorage.setItem("ap_sid", sid); }
function bubble(cls, text, img) { const d = document.createElement("div"); d.className = "b " + cls; if (img) { const i = new Image(); i.src = img; i.alt = "Photo sent"; d.append(i); } if (text) d.append(document.createTextNode(text)); log.append(d); log.scrollTop = log.scrollHeight; return d; }
let player;
function play(src) { if (!src || !document.getElementById("speak").checked) return; player?.pause(); player = new Audio(src); player.play().catch(() => {}); }
function render(r) {
  bubble("bot", r.text); play(r.audio);
  if (r.choices?.length || r.link) {
    const c = document.createElement("div"); c.className = "chips";
    if (r.link) { const a = document.createElement("a"); a.href = r.link.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = r.link.title; c.append(a); }
    for (const ch of r.choices ?? []) { const b = document.createElement("button"); b.textContent = ch.title; b.onclick = () => { bubble("me", ch.title); send({ kind: "choice", id: ch.id }); }; c.append(b); }
    log.append(c);
  }
  log.scrollTop = log.scrollHeight;
}
async function send(fields, file) {
  const fd = new FormData(); fd.append("sid", sid);
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  if (file) fd.append("file", file, file.name || "upload");
  const t = document.createElement("div"); t.className = "typing"; t.textContent = "AccessPoint is reading…"; log.append(t); log.scrollTop = log.scrollHeight;
  try { const res = await fetch("/try/api", { method: "POST", body: fd }); const j = await res.json(); (j.replies ?? [{ text: j.error || "Something went wrong." }]).forEach(render); }
  catch { render({ text: "Couldn't reach AccessPoint. Check your connection and try again." }); }
  finally { t.remove(); }
}
async function shrink(file) {
  const img = await createImageBitmap(file); const s = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(b => r(new File([b], "photo.jpg", { type: "image/jpeg" })), "image/jpeg", 0.85));
}
document.getElementById("photo").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const small = await shrink(f).catch(() => f); bubble("me", "", URL.createObjectURL(small)); send({ kind: "image" }, small); e.target.value = ""; };
document.querySelectorAll(".samples button").forEach(b => b.onclick = () => { bubble("me", "", "https://raw.githubusercontent.com/aljabrialam/accesspoint/main/bot/test/fixtures/" + b.dataset.s + ".jpg"); send({ kind: "sample", sample: b.dataset.s }); });
document.getElementById("f").onsubmit = (e) => { e.preventDefault(); const i = document.getElementById("t"); const v = i.value.trim(); if (!v) return; bubble("me", v); i.value = ""; send({ kind: "text", text: v }); };
let rec, chunks = [];
document.getElementById("mic").onclick = async (e) => {
  const btn = e.currentTarget;
  if (rec && rec.state === "recording") { rec.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    rec = new MediaRecorder(stream); chunks = [];
    rec.ondataavailable = (ev) => chunks.push(ev.data);
    rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); btn.classList.remove("rec"); btn.textContent = "🎤"; const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" }); bubble("me", "🎤 Voice note"); send({ kind: "audio" }, new File([blob], "note", { type: blob.type })); };
    rec.start(); btn.classList.add("rec"); btn.textContent = "■";
  } catch { render({ text: "The microphone isn't available. You can type instead." }); }
};
send({ kind: "start", ref: REF });
</script></body></html>`;
