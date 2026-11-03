// End to end: real webhook payloads through the Worker, with Meta's APIs mocked at fetch().
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { beforeEach, test } from "node:test";

import worker from "../src/worker.js";

const SECRET = "test-app-secret";
const ORIGIN = "https://bot.example";

function memoryKV() {
  const m = new Map();
  return {
    m,
    async get(k, type) { const v = m.get(k)?.value; if (v == null) return null; return type === "json" ? JSON.parse(v) : v; },
    async getWithMetadata(k) { const e = m.get(k); return { value: e?.value ?? null, metadata: e?.metadata ?? null }; },
    async put(k, value, opts = {}) { m.set(k, { value: value instanceof Uint8Array ? value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) : value, metadata: opts.metadata }); },
    async delete(k) { m.delete(k); },
  };
}

let env, sent, nextPlan, samText, heard, calls;
beforeEach(() => {
  env = { APP_SECRET: SECRET, VERIFY_TOKEN: "v", PAGE_TOKEN: "page", WA_TOKEN: "wa", WA_PHONE_ID: "123", MODEL_API_KEY: "k", AUDIO_URL: "https://audio.example/wav", AUDIO_TOKEN: "t", AP_KV: memoryKV() };
  sent = []; calls = []; nextPlan = null; samText = ""; heard = "";
});

globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  calls.push(url);
  const json = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  if (url.includes("graph.facebook.com") && url.endsWith("/messages")) { sent.push(JSON.parse(init.body)); return json({ ok: true }); }
  if (url.includes("graph.facebook.com/v21.0/media-")) return json({ url: "https://lookaside.example/media", mime_type: "image/jpeg" });
  if (url.startsWith("https://lookaside.example") || url.startsWith("https://cdn.example")) return new Response(new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]), { headers: { "content-type": url.includes("voice") ? "audio/mp4" : "image/jpeg" } });
  if (url === "https://api.meta.ai/v1/chat/completions") {
    const body = JSON.parse(init.body);
    assert.equal(body.model, "muse-spark-1.3");
    assert.equal(body.response_format.type, "json_schema");
    assert.match(body.messages[1].content[1].image_url.url, /^data:image\/jpeg;base64,/);
    return json({ choices: [{ message: { content: JSON.stringify(nextPlan) } }] });
  }
  if (url === "https://api.meta.ai/v1/responses") {
    const body = JSON.parse(init.body);
    assert.equal(body.model, "sam-3.1");
    return json({ output: [{ type: "message", content: [{ type: "output_text", text: samText }] }] });
  }
  if (url === "https://audio.example/wav") return new Response(new Uint8Array([82, 73, 70, 70]), { headers: { "content-type": "audio/wav" } });
  if (url === "https://api.meta.ai/v1/asr/transcribe") return new Response(heard);
  throw new Error("unexpected fetch " + url);
};

const sign = (raw) => "sha256=" + createHmac("sha256", SECRET).update(raw).digest("hex");
async function post(body, signature) {
  const raw = JSON.stringify(body);
  const waits = [];
  const res = await worker.fetch(new Request(`${ORIGIN}/webhook`, { method: "POST", body: raw, headers: { "x-hub-signature-256": signature ?? sign(raw) } }), env, { waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);
  return res;
}
let n = 0;
const fb = (ev) => post({ object: "page", entry: [{ messaging: [{ sender: { id: "psid1" }, timestamp: ++n, ...ev }] }] });
const wa = (msg) => post({ object: "whatsapp_business_account", entry: [{ changes: [{ value: { messages: [{ from: "6591234567", id: `wamid.${++n}`, ...msg }] } }] }] });
const fbPhoto = () => fb({ message: { mid: `m${++n}`, attachments: [{ type: "image", payload: { url: "https://cdn.example/photo.jpg" } }] } });
const lastText = () => { const m = sent.at(-1)?.message ?? sent.at(-1); return m?.text ?? m?.attachment?.payload?.text ?? m?.text?.body ?? m?.interactive?.body?.text; };

const PLAN = {
  readable: true, screen_type: "choice", screen_says: "Choose an account: Savings or Current.",
  options: [{ label: "Savings", meaning: "savings account" }, { label: "Current", meaning: "current account" }],
  action: { kind: "ask_user", target_label: "", target_concept: "", location_hint: "" },
  instruction: "Choose the account you want to use.", question: "Which account do you want to use?",
  money: { amount: "", is_transfer: false }, progress: "first", risk: "none",
};

test("Messenger: sticker → language → photo → voice answer → marked photo", async () => {
  await fb({ referral: { ref: "atm", source: "SHORTLINK" } });
  assert.equal(sent.at(-1).message.quick_replies.length, 6, "language picker first");

  await fb({ message: { mid: "m-lang", text: "English", quick_reply: { payload: "L:en" } } });
  assert.match(lastText(), /You're at an ATM\./);

  nextPlan = PLAN;
  await fbPhoto();
  assert.match(lastText(), /Which account do you want to use\?/);
  assert.deepEqual(sent.at(-1).message.quick_replies.map((q) => q.title), ["Savings", "Current", "Repeat"]);

  heard = "savings po";
  samText = "<0f>1<|box;x1=100;y1=900;x2=400;y2=1000;w=1200;h=1200;c=0.88|>";
  await fb({ message: { mid: "m-voice", attachments: [{ type: "audio", payload: { url: "https://cdn.example/voice.mp4" } }] } });
  const texts = sent.filter((s) => s.message).slice(-2).map((s) => s.message.text ?? s.message.attachment.payload.text);
  assert.match(texts[0], /I heard: "savings po"/);
  assert.match(texts[1], /Press "Savings"\. "Savings" is at the bottom, on the left\./);
  const button = sent.at(-1).message.attachment.payload.buttons[0];
  assert.equal(button.title, "See where");

  const page = await worker.fetch(new Request(button.url), env, {});
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Press &quot;Savings&quot;\./);
  const id = new URL(button.url).pathname.split("/").at(-1);
  const img = await worker.fetch(new Request(`${ORIGIN}/img/${id}`), env, {});
  assert.equal(img.headers.get("content-type"), "image/jpeg");
});

test("Messenger: an unexpected transfer is stopped, and PIN photos are deleted at once", async () => {
  await fb({ message: { mid: "a", quick_reply: { payload: "L:en" }, text: "English" } });
  await fb({ message: { mid: "b", text: "withdraw S$100" } });
  nextPlan = { ...PLAN, screen_type: "confirm", options: [], action: { kind: "press", target_label: "Confirm", target_concept: "confirm button", location_hint: "" }, money: { amount: "S$1,000", is_transfer: true } };
  await fbPhoto();
  assert.match(lastText(), /^Stop\. Don't press anything yet\./);
  assert.ok(!calls.includes("https://api.meta.ai/v1/responses"), "no SAM call for a stopped screen");

  nextPlan = { ...PLAN, screen_type: "pin_entry", options: [], risk: "pin_request" };
  const before = [...env.AP_KV.m.keys()].filter((k) => k.startsWith("p:")).length;
  await fbPhoto();
  assert.match(lastText(), /This screen asks for your PIN\./);
  assert.equal([...env.AP_KV.m.keys()].filter((k) => k.startsWith("p:")).length, before, "PIN photo not kept");
});

test("Messenger: SAM can't find the button → no pointer, check the label", async () => {
  await fb({ message: { mid: "c", quick_reply: { payload: "L:tl" }, text: "Filipino" } });
  nextPlan = { ...PLAN, screen_type: "confirm", options: [], action: { kind: "press", target_label: "Confirm", target_concept: "confirm button", location_hint: "kanan sa ibaba" }, instruction: "Pindutin ang Confirm." };
  samText = "";
  await fbPhoto();
  assert.match(lastText(), /Hindi ko matukoy ang "Confirm" sa litrato\./);
  assert.equal(sent.at(-1).message.attachment, undefined, "no See where link without a SAM box");
});

test("WhatsApp: wa.me sticker text → list picker → Bahasa step with link and buttons", async () => {
  await wa({ type: "text", text: { body: "Hi AccessPoint #checkout" } });
  assert.equal(sent.at(-1).interactive.type, "list");
  await wa({ type: "interactive", interactive: { type: "list_reply", list_reply: { id: "L:id", title: "Bahasa Indonesia" } } });
  assert.match(lastText(), /Kamu di kasir mandiri\./);

  nextPlan = { ...PLAN, screen_type: "other", options: [], action: { kind: "press", target_label: "Scan", target_concept: "scanner glass", location_hint: "" }, instruction: "Arahkan barcode ke kaca pemindai." };
  samText = "<0f>1<|box;x1=500;y1=500;x2=700;y2=700;w=1200;h=1200;c=0.9|>";
  await wa({ type: "image", image: { id: "media-1", mime_type: "image/jpeg" } });
  const [link, buttons] = sent.slice(-2);
  assert.equal(link.interactive.type, "cta_url");
  assert.match(link.interactive.body.text, /Arahkan barcode ke kaca pemindai\./);
  assert.equal(link.interactive.action.parameters.display_text, "Lihat letaknya");
  assert.deepEqual(buttons.interactive.action.buttons.map((b) => b.reply.title), ["Sudah", "Ulangi"]);
});

test("Webhook security: bad signatures rejected; retries handled once; delete clears state", async () => {
  const res = await post({ object: "page", entry: [] }, "sha256=00");
  assert.equal(res.status, 401);

  const ev = { object: "page", entry: [{ messaging: [{ sender: { id: "psid9" }, timestamp: 1, message: { mid: "dup", text: "hi" } }] }] };
  await post(ev); await post(ev);
  assert.equal(sent.length, 1);

  await post({ object: "page", entry: [{ messaging: [{ sender: { id: "psid9" }, timestamp: 2, message: { mid: "lang9", quick_reply: { payload: "L:en" }, text: "English" } }] }] });
  assert.ok(env.AP_KV.m.has("s:messenger:psid9"));
  await post({ object: "page", entry: [{ messaging: [{ sender: { id: "psid9" }, timestamp: 3, message: { mid: "del9", text: "delete" } }] }] });
  assert.ok(!env.AP_KV.m.has("s:messenger:psid9"));
  assert.match(lastText(), /I deleted everything/);
});
