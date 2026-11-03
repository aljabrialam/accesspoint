// AccessPoint bot: Messenger + WhatsApp, on a Cloudflare Worker, powered by Meta's models.
//
// Secrets (wrangler secret put …):
//   VERIFY_TOKEN   any string; paste the same in Meta's webhook setup
//   APP_SECRET     Meta app secret (verifies webhook signatures for Messenger and WhatsApp)
//   PAGE_TOKEN     Page access token for the AccessPoint Facebook Page (Messenger)
//   WA_TOKEN       WhatsApp Cloud API access token
//   WA_PHONE_ID    WhatsApp business phone number ID
//   MODEL_API_KEY  Meta Model API key (Muse Spark, SAM 3.1, Muse Voice Transcribe, Muse Image)
//   AUDIO_URL, AUDIO_TOKEN   Modal voice-note converter (modal/audio.py)
// KV binding AP_KV: chat state (1 h) and photos (10 min).
import { converse } from "./converse.js";
import { messengerIO, messengerInput, whatsappIO, whatsappInput } from "./channels.js";
import { DELETION, HOME, PRIVACY, TERMS, seePage } from "./pages.js";
import { S } from "./strings.js";

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const { pathname } = url;

    if (req.method === "GET") {
      if (pathname === "/") return HOME();
      if (pathname === "/privacy") return PRIVACY();
      if (pathname === "/terms") return TERMS();
      if (pathname === "/data-deletion") return DELETION();
      if (pathname.startsWith("/see/")) {
        const id = pathname.slice(5).replace(/[^a-z0-9]/gi, "");
        const [mark, exists] = await Promise.all([env.AP_KV.get(`b:${id}`, "json"), env.AP_KV.get(`p:${id}`, "arrayBuffer")]);
        return seePage(id, url.searchParams.get("l"), exists ? mark : null);
      }
      if (pathname.startsWith("/img/")) {
        const id = pathname.slice(5).replace(/[^a-z0-9]/gi, "");
        const { value, metadata } = await env.AP_KV.getWithMetadata(`p:${id}`, "arrayBuffer");
        if (!value) return new Response("Gone", { status: 404 });
        return new Response(value, { headers: { "content-type": metadata?.mime ?? "image/jpeg", "cache-control": "private, no-store" } });
      }
      if (pathname === "/webhook") {
        const ok = url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === env.VERIFY_TOKEN;
        return ok ? new Response(url.searchParams.get("hub.challenge")) : new Response("Forbidden", { status: 403 });
      }
      if (pathname === "/setup") {
        if (url.searchParams.get("token") !== env.VERIFY_TOKEN) return new Response("Forbidden", { status: 403 });
        return setupMessenger(env);
      }
    }

    if (req.method === "POST" && pathname === "/webhook") {
      const raw = await req.text();
      if (!(await validSignature(raw, req.headers.get("x-hub-signature-256"), env.APP_SECRET))) return new Response("Bad signature", { status: 401 });
      const body = JSON.parse(raw);
      const run = (io, input, mid) => ctx.waitUntil(once(env, mid).then((fresh) => fresh && converse(io, input, env, url.origin)).catch((e) => console.log("bot error", e?.stack ?? e)));
      if (body.object === "page") {
        for (const entry of body.entry ?? []) for (const ev of entry.messaging ?? []) {
          const input = messengerInput(ev);
          if (input) run(messengerIO(env, ev.sender.id), input, ev.message?.mid ?? `${ev.sender.id}:${ev.timestamp}`);
        }
      }
      if (body.object === "whatsapp_business_account") {
        for (const entry of body.entry ?? []) for (const change of entry.changes ?? []) for (const msg of change.value?.messages ?? []) {
          const parsed = whatsappInput(msg);
          if (parsed) run(whatsappIO(env, parsed.user, msg.id), parsed.input, msg.id);
        }
      }
      return new Response("EVENT_RECEIVED"); // reply to Meta fast; the work continues in the background
    }
    return new Response("Not found", { status: 404 });
  },
};

// Meta retries webhooks; handle each message once.
async function once(env, mid) {
  if (!mid) return true;
  const k = `d:${mid}`;
  if (await env.AP_KV.get(k)) return false;
  await env.AP_KV.put(k, "1", { expirationTtl: 600 });
  return true;
}

export async function validSignature(raw, header, secret) {
  if (!header?.startsWith("sha256=") || !secret) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const hex = [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
  const given = header.slice(7);
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

// One-time: Get Started, greeting, ice breakers and the persistent menu.
async function setupMessenger(env) {
  const r = await fetch(`https://graph.facebook.com/v21.0/me/messenger_profile`, {
    method: "POST", headers: { Authorization: `Bearer ${env.PAGE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      get_started: { payload: "GET_STARTED" },
      greeting: [{ locale: "default", text: "Point your phone at a machine. Send a photo of the screen and I'll tell you the next step, in your language." }],
      ice_breakers: [{ locale: "default", call_to_actions: [
        { question: "Help me use this ATM", payload: "L:en" },
        { question: "Tulungan mo ako sa makinang ito", payload: "L:tl" },
        { question: "Bantu saya pakai mesin ini", payload: "L:id" },
        { question: "帮我用这台机器", payload: "L:zh" },
      ] }],
      persistent_menu: [{ locale: "default", composer_input_disabled: false, call_to_actions: [
        { type: "postback", title: "Start over", payload: "START" },
        { type: "postback", title: "Language · Wika · Bahasa", payload: "LANG" },
        { type: "postback", title: S.en.btnHelp, payload: "HELP" },
      ] }],
    }),
  });
  return new Response(r.ok ? "Messenger profile set. Close the chat and open it again." : `Meta said: ${await r.text()}`, { status: r.ok ? 200 : 500 });
}
