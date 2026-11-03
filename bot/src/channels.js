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
