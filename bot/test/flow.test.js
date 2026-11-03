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

let env, sent, nextPlan, samText, heard, calls, tgSent, voices;
beforeEach(() => {
  env = { APP_SECRET: SECRET, VERIFY_TOKEN: "v", PAGE_TOKEN: "page", WA_TOKEN: "wa", WA_PHONE_ID: "123", MODEL_API_KEY: "k", AUDIO_URL: "https://audio.example/wav", AUDIO_TOKEN: "t", AP_KV: memoryKV() };
  sent = []; calls = []; tgSent = []; voices = []; nextPlan = null; samText = ""; heard = "";
});

globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  calls.push(url);
  const json = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  if (url === "https://audio.example/wav/speak") return new Response(new Uint8Array([79, 103, 103, 83]), { headers: { "content-type": "audio/ogg" } });
  if (init.body instanceof FormData && (url.includes("api.telegram.org") || url.includes("graph.facebook.com"))) {
    voices.push({ url, file: init.body.get("voice") ?? init.body.get("filedata") ?? init.body.get("file") });
    return json(url.endsWith("/media") ? { id: "media-up-1" } : { ok: true });
  }
  if (url.startsWith("https://api.telegram.org/bottg/getFile")) return json({ ok: true, result: { file_path: "photos/f.jpg" } });
  if (url.startsWith("https://api.telegram.org/file/bottg/")) return new Response(new Uint8Array([0xff, 0xd8, 0xff, 7]), { headers: { "content-type": "image/jpeg" } });
  if (url.startsWith("https://api.telegram.org/bottg/")) { tgSent.push({ method: url.split("/").at(-1), body: JSON.parse(init.body) }); return json({ ok: true }); }
  if (url.includes("graph.facebook.com") && url.endsWith("/messages")) { sent.push(JSON.parse(init.body)); return json({ ok: true }); }
  if (url.includes("graph.facebook.com/v21.0/media-")) return json({ url: "https://lookaside.example/media", mime_type: "image/jpeg" });
  if (url.startsWith("https://raw.githubusercontent.com/aljabrialam/accesspoint/")) return new Response(new Uint8Array([0xff, 0xd8, 0xff, 9]), { headers: { "content-type": "image/jpeg" } });
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
const textOf = (e) => { const m = e?.message ?? e; return m?.text?.body ?? (typeof m?.text === "string" ? m.text : undefined) ?? m?.attachment?.payload?.text ?? m?.interactive?.body?.text; };
const lastText = () => textOf([...sent].reverse().find((e) => textOf(e) !== undefined));

const PLAN = {
  machine: "atm", machine_name: "an ATM",
  readable: true, screen_type: "choice", screen_says: "Choose an account: Savings or Current.",
  options: [{ label: "Savings", meaning: "savings account", box: { x1: 90, y1: 760, x2: 330, y2: 830 } }, { label: "Current", meaning: "current account", box: { x1: 600, y1: 760, x2: 900, y2: 830 } }],
  action: { kind: "ask_user", target_label: "", target_concept: "", target_box: { x1: 0, y1: 0, x2: 0, y2: 0 }, location_hint: "" },
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

test("Messenger: no sticker, photo first → language → it names the machine and answers that photo", async () => {
  nextPlan = PLAN;
  await fbPhoto();
  assert.equal(sent.at(-1).message.quick_replies.length, 6, "asks for a language, keeps the photo");
  assert.ok(!calls.includes("https://api.meta.ai/v1/chat/completions"), "no model call before a language is chosen");
  assert.equal([...env.AP_KV.m.keys()].filter((k) => k.startsWith("p:")).length, 1, "photo held for the answer");

  await fb({ message: { mid: "m-lang2", text: "English", quick_reply: { payload: "L:en" } } });
  assert.match(lastText(), /^This looks like an ATM\.\n\nThe screen says: Choose an account/);
  assert.deepEqual(sent.at(-1).message.quick_replies.map((q) => q.title), ["Savings", "Current", "Repeat"]);
  assert.ok(env.AP_KV.m.get("s:messenger:psid1").value.includes('"machine":"atm"'), "machine remembered for later steps");

  nextPlan = { ...PLAN, screen_says: "Enter the amount." };
  await fbPhoto();
  assert.doesNotMatch(lastText(), /This looks like/, "says it once, not on every photo");
});

test("A pending choice is asked again when the answer is unclear or tied, never guessed", async () => {
  await fb({ message: { mid: "q1", quick_reply: { payload: "L:en" }, text: "English" } });
  nextPlan = PLAN;
  await fbPhoto();
  await fb({ message: { mid: "q2", text: "savings or current" } });
  assert.match(lastText(), /^Which account do you want to use\?/, "tie: question again");
  assert.deepEqual(sent.filter((m) => m.message).at(-1).message.quick_replies.map((q) => q.title), ["Savings", "Current", "Repeat"]);
  await fb({ message: { mid: "q3", text: "banana" } });
  assert.match(lastText(), /^Which account do you want to use\?/, "no match: question again");
  await fb({ message: { mid: "q4", text: "current" } });
  assert.match(lastText(), /Press "Current"/, "a clear answer still works");
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

  nextPlan = { ...PLAN, screen_type: "other", options: [], action: { kind: "press", target_label: "Scan", target_concept: "scanner glass", target_box: { x1: 430, y1: 430, x2: 570, y2: 570 }, location_hint: "" }, instruction: "Arahkan barcode ke kaca pemindai." };
  samText = "<0f>1<|box;x1=500;y1=500;x2=700;y2=700;w=1200;h=1200;c=0.9|>";
  await wa({ type: "image", image: { id: "media-1", mime_type: "image/jpeg" } });
  const [link, buttons] = sent.filter((m) => m.type !== "audio").slice(-2);
  assert.equal(sent.at(-1).type, "audio", "then the step as a WhatsApp voice note");
  assert.equal(sent.at(-1).audio.voice, true);
  assert.equal(link.interactive.type, "cta_url");
  assert.match(link.interactive.body.text, /Arahkan barcode ke kaca pemindai\./);
  assert.equal(link.interactive.action.parameters.display_text, "Lihat letaknya");
  assert.deepEqual(buttons.interactive.action.buttons.map((b) => b.reply.title), ["Sudah", "Ulangi"]);
});

test("Webhook security: bad signatures rejected; retries handled once; delete clears state", async () => {
  const res = await post({ object: "page", entry: [] }, "sha256=00");
  assert.equal(res.status, 401);
  env.WA_APP_SECRET = "second-app-secret";
  const raw = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
  const second = await worker.fetch(new Request(`${ORIGIN}/webhook`, { method: "POST", body: raw, headers: { "x-hub-signature-256": "sha256=" + createHmac("sha256", "second-app-secret").update(raw).digest("hex") } }), env, { waitUntil() {} });
  assert.equal(second.status, 200, "a second app's signature is accepted when WA_APP_SECRET is set");

  const ev = { object: "page", entry: [{ messaging: [{ sender: { id: "psid9" }, timestamp: 1, message: { mid: "dup", text: "hi" } }] }] };
  await post(ev); await post(ev);
  assert.equal(sent.length, 1);

  await post({ object: "page", entry: [{ messaging: [{ sender: { id: "psid9" }, timestamp: 2, message: { mid: "lang9", quick_reply: { payload: "L:en" }, text: "English" } }] }] });
  assert.ok(env.AP_KV.m.has("s:messenger:psid9"));
  await post({ object: "page", entry: [{ messaging: [{ sender: { id: "psid9" }, timestamp: 3, message: { mid: "del9", text: "delete" } }] }] });
  assert.ok(!env.AP_KV.m.has("s:messenger:psid9"));
  assert.match(lastText(), /I deleted everything/);
});

test("Web console /try: page, start, language, sample screen and upload use the same conversation", async () => {
  assert.equal((await worker.fetch(new Request(`${ORIGIN}/try`, { method: "HEAD" }), env, {})).status, 200, "HEAD works for uptime checks");
  const page = await worker.fetch(new Request(`${ORIGIN}/try?m=atm`), env, {});
  assert.equal(page.status, 200);
  assert.match(await page.text(), /same conversation code and guardrails/);

  const api = async (fields, file) => {
    const fd = new FormData();
    fd.append("sid", "websession1234567890");
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    if (file) fd.append("file", file);
    const res = await worker.fetch(new Request(`${ORIGIN}/try/api`, { method: "POST", body: fd }), env, {});
    return { status: res.status, body: await res.json() };
  };
  let r = await api({ kind: "start", ref: "atm" });
  assert.equal(r.body.replies[0].choices.length, 6, "language picker");
  r = await api({ kind: "choice", id: "L:en" });
  assert.match(r.body.replies[0].text, /You're at an ATM\./);

  nextPlan = PLAN;
  r = await api({ kind: "sample", sample: "ticket-trip" });
  assert.deepEqual(r.body.replies[0].choices.map((c) => c.title), ["Savings", "Current", "Repeat"]);

  nextPlan = { ...PLAN, screen_type: "confirm", options: [], money: { amount: "S$1,000", is_transfer: true } };
  r = await api({ kind: "image" }, new File([new Uint8Array([0xff, 0xd8, 0xff, 1])], "p.jpg", { type: "image/jpeg" }));
  assert.match(r.body.replies[0].text, /^Stop\./);

  assert.equal((await api({ kind: "sample", sample: "../secret" })).status, 400, "only known samples");
  const bad = new FormData(); bad.append("sid", "x"); bad.append("kind", "text");
  assert.equal((await worker.fetch(new Request(`${ORIGIN}/try/api`, { method: "POST", body: bad }), env, {})).status, 400, "session id checked");
});

test("Telegram test channel: secret header required, deep link, buttons acknowledged, photo answered", async () => {
  env.TG_TOKEN = "tg";
  const { tgSecret } = await import("../src/channels.js");
  const secret = await tgSecret(env);
  const tgPost = async (update, s = secret) => {
    const waits = [];
    const res = await worker.fetch(new Request(`${ORIGIN}/telegram`, { method: "POST", body: JSON.stringify(update), headers: { "x-telegram-bot-api-secret-token": s } }), env, { waitUntil: (p) => waits.push(p) });
    await Promise.all(waits);
    return res;
  };
  assert.equal((await tgPost({ update_id: 1 }, "wrong")).status, 403);

  await tgPost({ update_id: 2, message: { chat: { id: 42 }, text: "/start atm" } });
  const picker = tgSent.filter((m) => m.method === "sendMessage").at(-1).body;
  assert.equal(picker.reply_markup.inline_keyboard.flat().length, 6, "language buttons");

  await tgPost({ update_id: 3, callback_query: { id: "cq1", data: "L:en", message: { chat: { id: 42 } } } });
  assert.ok(tgSent.some((m) => m.method === "answerCallbackQuery" && m.body.callback_query_id === "cq1"), "button tap acknowledged");
  assert.match(tgSent.filter((m) => m.method === "sendMessage").at(-1).body.text, /You're at an ATM\./);

  nextPlan = PLAN;
  await tgPost({ update_id: 4, message: { chat: { id: 42 }, photo: [{ file_id: "small" }, { file_id: "big" }] } });
  const reply = tgSent.filter((m) => m.method === "sendMessage").at(-1).body;
  assert.match(reply.text, /Which account do you want to use\?/);
  assert.deepEqual(reply.reply_markup.inline_keyboard.flat().map((b) => b.text), ["Savings", "Current", "Repeat"]);
  assert.ok(calls.some((u) => u.includes("getFile?file_id=big")), "uses the largest photo size");
});

test("Voice replies: spoken after the text on Telegram and /try, and 'voice off' stops them", async () => {
  env.TG_TOKEN = "tg";
  const { tgSecret } = await import("../src/channels.js");
  const secret = await tgSecret(env);
  const tgPost = async (update) => {
    const waits = [];
    await worker.fetch(new Request(`${ORIGIN}/telegram`, { method: "POST", body: JSON.stringify(update), headers: { "x-telegram-bot-api-secret-token": secret } }), env, { waitUntil: (p) => waits.push(p) });
    await Promise.all(waits);
  };
  await tgPost({ update_id: 10, message: { chat: { id: 7 }, text: "/start" } });
  assert.equal(voices.length, 0, "the language picker isn't spoken (no language yet)");
  await tgPost({ update_id: 11, callback_query: { id: "c", data: "L:tl", message: { chat: { id: 7 } } } });
  assert.equal(voices.length, 1, "greeting spoken");
  assert.match(voices[0].url, /sendVoice$/);
  assert.ok(calls.indexOf("https://audio.example/wav/speak") > calls.findLastIndex((u) => u.endsWith("/sendMessage")) - 1, "text first, then voice");

  await tgPost({ update_id: 12, message: { chat: { id: 7 }, text: "voice off" } });
  const before = voices.length;
  await tgPost({ update_id: 13, message: { chat: { id: 7 }, text: "help" } });
  assert.equal(voices.length, before, "no voice after 'voice off'");

  const fd = new FormData(); fd.append("sid", "voicesession12345678"); fd.append("kind", "choice"); fd.append("id", "L:en");
  const r = await (await worker.fetch(new Request(`${ORIGIN}/try/api`, { method: "POST", body: fd }), env, {})).json();
  assert.match(r.replies[0].audio, /^data:audio\/mpeg;base64,/, "/try gets the spoken reply to play");
});
