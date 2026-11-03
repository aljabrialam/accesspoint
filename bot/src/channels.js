// Messenger and WhatsApp: turn webhooks into conversation input, and replies into each platform's messages.
const GRAPH = "https://graph.facebook.com/v21.0";
const clip = (s, n) => { s = String(s ?? ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

async function graph(path, token, body) {
  const res = await fetch(`${GRAPH}${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) console.log("Graph API error", path, res.status, (await res.text()).slice(0, 500));
  return res;
}

// ---- Messenger -------------------------------------------------------------
export function messengerInput(ev) {
  if (!ev.sender?.id || ev.message?.is_echo || ev.read || ev.delivery) return null;
  const ref = ev.referral?.ref ?? ev.postback?.referral?.ref ?? ev.message?.referral?.ref;
  if (ev.postback) return { kind: ev.postback.payload === "GET_STARTED" ? "start" : "choice", id: ev.postback.payload === "GET_STARTED" ? "" : ev.postback.payload, ref };
  if (ev.referral) return { kind: "start", ref };
  const msg = ev.message;
  if (!msg) return null;
  if (msg.quick_reply?.payload) return { kind: "choice", id: msg.quick_reply.payload, ref };
  const att = (msg.attachments ?? []).find((a) => (a.type === "image" && !a.payload?.sticker_id) || a.type === "audio");
  if (att) return { kind: att.type, media: { url: att.payload.url } };
  if (msg.text) return { kind: "text", text: msg.text, ref };
  return null;
}

export function messengerIO(env, psid) {
  const send = (message) => graph(`/me/messages`, env.PAGE_TOKEN, { recipient: { id: psid }, messaging_type: "RESPONSE", message });
  return {
    channel: "messenger",
    user: psid,
    voiceFormat: "mp3",
    sayVoice: async (bytes) => {
      const form = new FormData();
      form.append("recipient", JSON.stringify({ id: psid }));
      form.append("messaging_type", "RESPONSE");
      form.append("message", JSON.stringify({ attachment: { type: "audio", payload: { is_reusable: false } } }));
      form.append("filedata", new Blob([bytes], { type: "audio/mpeg" }), "accesspoint.mp3");
      const res = await fetch(`${GRAPH}/me/messages`, { method: "POST", headers: { Authorization: `Bearer ${env.PAGE_TOKEN}` }, body: form });
      if (!res.ok) console.log("Messenger audio error", res.status, (await res.text()).slice(0, 300));
    },
    typing: () => graph(`/me/messages`, env.PAGE_TOKEN, { recipient: { id: psid }, sender_action: "typing_on" }),
    fetchMedia: async ({ url }) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error("media " + r.status);
      return { bytes: new Uint8Array(await r.arrayBuffer()), mime: (r.headers.get("content-type") ?? "").split(";")[0] };
    },
    say: async (reply) => {
      const quick_replies = (reply.choices ?? []).slice(0, 13).map((c) => ({ content_type: "text", title: clip(c.title, 20), payload: c.id }));
      const qr = quick_replies.length ? { quick_replies } : {};
      if (reply.link) {
        let text = reply.text;
        if (text.length > 640) { await send({ text: clip(text, 2000) }); text = reply.next || reply.link.title; }
        return send({ attachment: { type: "template", payload: { template_type: "button", text: clip(text, 640),
          buttons: [{ type: "web_url", url: reply.link.url, title: clip(reply.link.title, 20), webview_height_ratio: "tall" }] } }, ...qr });
      }
      return send({ text: clip(reply.text, 2000), ...qr });
    },
  };
}

// ---- WhatsApp (Cloud API) -------------------------------------------------
export function whatsappInput(msg) {
  const user = msg.from;
  if (!user) return null;
  if (msg.type === "text") return { user, input: { kind: "text", text: msg.text?.body ?? "", ref: msg.text?.body } };
  if (msg.type === "interactive") return { user, input: { kind: "choice", id: msg.interactive?.button_reply?.id ?? msg.interactive?.list_reply?.id ?? "" } };
  if (msg.type === "button") return { user, input: { kind: "choice", id: msg.button?.payload ?? "" } };
  if (msg.type === "image") return { user, input: { kind: "image", media: { id: msg.image.id, mime: msg.image.mime_type } } };
  if (msg.type === "audio") return { user, input: { kind: "audio", media: { id: msg.audio.id, mime: msg.audio.mime_type } } };
  return null;
}

export function whatsappIO(env, to, messageId) {
  const send = (body) => graph(`/${env.WA_PHONE_ID}/messages`, env.WA_TOKEN, { messaging_product: "whatsapp", recipient_type: "individual", to, ...body });
  const choicesMessage = (body, choices, listLabel) => {
    if (choices.length <= 3) {
      return send({ type: "interactive", interactive: { type: "button", body: { text: clip(body, 1024) },
        action: { buttons: choices.map((c) => ({ type: "reply", reply: { id: c.id, title: clip(c.title, 20) } })) } } });
    }
    return send({ type: "interactive", interactive: { type: "list", body: { text: clip(body, 4096) },
      action: { button: clip(listLabel || "Choose", 20), sections: [{ title: clip(listLabel || "Choose", 24), rows: choices.slice(0, 10).map((c) => ({ id: c.id, title: clip(c.title, 24) })) }] } } });
  };
  return {
    channel: "whatsapp",
    user: to,
    voiceFormat: "ogg",
    sayVoice: async (bytes) => {
      const form = new FormData();
      form.append("messaging_product", "whatsapp");
      form.append("type", "audio/ogg");
      form.append("file", new Blob([bytes], { type: "audio/ogg" }), "accesspoint.ogg");
      const up = await fetch(`${GRAPH}/${env.WA_PHONE_ID}/media`, { method: "POST", headers: { Authorization: `Bearer ${env.WA_TOKEN}` }, body: form }).then((r) => r.json());
      if (!up.id) { console.log("WhatsApp media upload error", JSON.stringify(up).slice(0, 300)); return; }
      await send({ type: "audio", audio: { id: up.id, voice: true } });
    },
    typing: () => messageId && graph(`/${env.WA_PHONE_ID}/messages`, env.WA_TOKEN, { messaging_product: "whatsapp", status: "read", message_id: messageId, typing_indicator: { type: "text" } }),
    fetchMedia: async ({ id, mime }) => {
      const meta = await fetch(`${GRAPH}/${id}`, { headers: { Authorization: `Bearer ${env.WA_TOKEN}` } }).then((r) => r.json());
      const r = await fetch(meta.url, { headers: { Authorization: `Bearer ${env.WA_TOKEN}` } });
      if (!r.ok) throw new Error("media " + r.status);
      return { bytes: new Uint8Array(await r.arrayBuffer()), mime: (meta.mime_type ?? mime ?? "").split(";")[0] };
    },
    say: async (reply) => {
      const choices = reply.choices ?? [];
      if (reply.link) {
        await send({ type: "interactive", interactive: { type: "cta_url", body: { text: clip(reply.text, 1024) },
          action: { name: "cta_url", parameters: { display_text: clip(reply.link.title, 20), url: reply.link.url } } } });
        return choices.length ? choicesMessage(reply.next || "…", choices, reply.list) : undefined;
      }
      if (choices.length) return choicesMessage(reply.text, choices, reply.list);
      return send({ type: "text", text: { body: clip(reply.text, 4096), preview_url: false } });
    },
  };
}

// ---- Telegram (test channel while Meta app review is pending) -------------
const TG = (env, method) => `https://api.telegram.org/bot${env.TG_TOKEN}/${method}`;
async function tg(env, method, body) {
  const res = await fetch(TG(env, method), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) console.log("Telegram API error", method, res.status, (await res.text()).slice(0, 300));
  return res;
}

// Webhook secret derived from the bot token, so there is nothing extra to configure.
export async function tgSecret(env) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("accesspoint-tg:" + env.TG_TOKEN));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 48);
}

export function telegramInput(update) {
  const cq = update.callback_query;
  if (cq) return { chat: cq.message?.chat?.id, cq: cq.id, input: { kind: "choice", id: cq.data ?? "" } };
  const msg = update.message;
  const chat = msg?.chat?.id;
  if (!chat) return null;
  const start = msg.text?.match(/^\/start(?:\s+(\S+))?/);
  if (start) return { chat, input: { kind: "start", ref: start[1] ?? "" } };
  if (/^\/language\b/.test(msg.text ?? "")) return { chat, input: { kind: "choice", id: "LANG" } };
  if (/^\/help\b/.test(msg.text ?? "")) return { chat, input: { kind: "choice", id: "HELP" } };
  if (msg.photo?.length) return { chat, input: { kind: "image", media: { tgFile: msg.photo.at(-1).file_id, mime: "image/jpeg" } } };
  if (msg.document?.mime_type?.startsWith("image/")) return { chat, input: { kind: "image", media: { tgFile: msg.document.file_id, mime: msg.document.mime_type } } };
  const voice = msg.voice ?? msg.audio;
  if (voice) return { chat, input: { kind: "audio", media: { tgFile: voice.file_id, mime: voice.mime_type ?? "audio/ogg" } } };
  if (msg.text) return { chat, input: { kind: "text", text: msg.text } };
  return null;
}

export function telegramIO(env, chat, cqId) {
  let acked = !cqId; // a tapped button spins until we acknowledge it
  const ack = async () => { if (!acked) { acked = true; await tg(env, "answerCallbackQuery", { callback_query_id: cqId }); } };
  return {
    channel: "telegram",
    user: String(chat),
    voiceFormat: "ogg",
    sayVoice: async (bytes) => {
      const form = new FormData();
      form.append("chat_id", String(chat));
      form.append("voice", new Blob([bytes], { type: "audio/ogg" }), "accesspoint.ogg");
      const res = await fetch(TG(env, "sendVoice"), { method: "POST", body: form });
      if (!res.ok) console.log("Telegram voice error", res.status, (await res.text()).slice(0, 300));
    },
    typing: async () => { await ack(); await tg(env, "sendChatAction", { chat_id: chat, action: "typing" }); },
    fetchMedia: async ({ tgFile, mime }) => {
      const info = await fetch(`${TG(env, "getFile")}?file_id=${encodeURIComponent(tgFile)}`).then((r) => r.json());
      const r = await fetch(`https://api.telegram.org/file/bot${env.TG_TOKEN}/${info.result.file_path}`);
      if (!r.ok) throw new Error("media " + r.status);
      return { bytes: new Uint8Array(await r.arrayBuffer()), mime };
    },
    say: async (reply) => {
      await ack();
      const rows = [];
      if (reply.link) rows.push([{ text: clip(reply.link.title, 40), url: reply.link.url }]);
      const choices = reply.choices ?? [];
      for (let i = 0; i < choices.length; i += 2) rows.push(choices.slice(i, i + 2).map((c) => ({ text: clip(c.title, 40), callback_data: c.id.slice(0, 64) })));
      return tg(env, "sendMessage", { chat_id: chat, text: clip(reply.text, 4096), link_preview_options: { is_disabled: true }, ...(rows.length ? { reply_markup: { inline_keyboard: rows } } : {}) });
    },
  };
}

export async function telegramSetup(env, origin) {
  const steps = [
    ["setWebhook", { url: `${origin}/telegram`, secret_token: await tgSecret(env), allowed_updates: ["message", "callback_query"], drop_pending_updates: true }],
    ["setMyCommands", { commands: [{ command: "start", description: "Start over" }, { command: "language", description: "Change language" }, { command: "help", description: "How it works" }] }],
    ["setMyShortDescription", { short_description: "Stuck at a machine? Send a photo of the screen and get the next step, in your language." }],
    ["setMyDescription", { description: "AccessPoint helps you use ATMs, ticket machines, check-in kiosks and self-checkouts. Send a photo of the screen and get one safe next step in your language. It never needs your PIN.\n\nTest channel for the AccessPoint Messenger and WhatsApp bot, built on Meta's Muse Spark, SAM 3.1 and Muse Voice Transcribe." }],
  ];
  const out = [];
  for (const [method, body] of steps) out.push(`${method}: ${(await tg(env, method, body)).ok ? "OK" : "FAILED"}`);
  const me = await fetch(TG(env, "getMe")).then((r) => r.json()).catch(() => ({}));
  return new Response(out.join("\n") + (me.result?.username ? `\n\nYour bot: https://t.me/${me.result.username}` : ""), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
