// Public pages: home, legal pages Meta asks for, and the "See where" page for a marked photo.
import { LANGS, S } from "./strings.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MARK = `<svg width="30" height="30" viewBox="58 22 140 212" aria-hidden="true"><path fill="#2B47C9" fill-rule="evenodd" d="M61.5 58a31.5 31.5 0 1 0 63 0a31.5 31.5 0 1 0-63 0ZM133 58a30 30 0 1 0 60 0a30 30 0 1 0-60 0ZM151 58a12 12 0 1 0 24 0a12 12 0 1 0-24 0ZM63 128a30 30 0 1 0 60 0a30 30 0 1 0-60 0ZM81 128a12 12 0 1 0 24 0a12 12 0 1 0-24 0ZM133 128a30 30 0 1 0 60 0a30 30 0 1 0-60 0ZM151 128a12 12 0 1 0 24 0a12 12 0 1 0-24 0ZM63 198a30 30 0 1 0 60 0a30 30 0 1 0-60 0ZM81 198a12 12 0 1 0 24 0a12 12 0 1 0-24 0ZM133 198a30 30 0 1 0 60 0a30 30 0 1 0-60 0ZM151 198a12 12 0 1 0 24 0a12 12 0 1 0-24 0Z"/></svg>`;

export const html = (body, { title = "AccessPoint", lang = "en", status = 200, cache = "no-store" } = {}) => new Response(
  `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>:root{--brand:#2B47C9;--amber:#FFB224;--ink:#101828;--ink2:#475467;--mist:#F4F6FB}*{box-sizing:border-box}body{margin:0;background:var(--mist);color:var(--ink);font:17px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:640px;margin:0 auto;padding:20px 18px 48px}.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px}h1{font-size:28px;line-height:1.15;margin:20px 0 8px}h2{font-size:19px;margin:24px 0 6px}a{color:var(--brand)}
.photo{position:relative;margin-top:16px;border-radius:18px;overflow:hidden;background:#000}.photo img{display:block;width:100%;height:auto}.photo svg{position:absolute;inset:0;width:100%;height:100%}
.label{margin-top:16px;padding:16px;border-radius:16px;background:#fff;font-size:22px;font-weight:700}.note{color:var(--ink2);font-size:15px;margin-top:14px}</style></head>
<body><main><div class="brand">${MARK}AccessPoint</div>${body}</main></body></html>`,
  { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": cache, "x-robots-tag": "noindex" } },
);

export function seePage(id, l, mark) {
  const L = S[LANGS.includes(l) ? l : "en"];
  if (!mark) return html(`<h1>${esc(L.seeTitle)}</h1><p>${esc(L.seeGone)}</p>`, { lang: l, status: 404 });
  const { box, label } = mark;
  const pad = Math.max(box.w, box.h) * 0.012;
  const rect = `<rect x="${box.x1 - pad}" y="${box.y1 - pad}" width="${box.x2 - box.x1 + 2 * pad}" height="${box.y2 - box.y1 + 2 * pad}" rx="${pad * 1.5}" fill="rgba(255,178,36,.18)" stroke="#FFB224" stroke-width="${pad * 0.9}"/>`;
  return html(`<h1>${esc(L.seeTitle)}</h1>
<div class="photo"><img src="/img/${esc(id)}" alt="${esc(L.seeTitle)}: ${esc(label)}"><svg viewBox="0 0 ${box.w} ${box.h}" preserveAspectRatio="none" aria-hidden="true">
<rect width="${box.w}" height="${box.h}" fill="rgba(16,24,40,.35)" mask="url(#m)"/><mask id="m"><rect width="${box.w}" height="${box.h}" fill="#fff"/><rect x="${box.x1 - pad}" y="${box.y1 - pad}" width="${box.x2 - box.x1 + 2 * pad}" height="${box.y2 - box.y1 + 2 * pad}" fill="#000"/></mask>${rect}</svg></div>
<div class="label">${esc(L.press(label))}</div><p class="note">${esc(L.seeNote)}</p>`, { title: L.seeTitle, lang: l });
}

export const HOME = () => html(`<h1>Stuck at a machine? Send a photo. Get the next step.</h1>
<p>AccessPoint helps people who struggle with self-service machines (ATMs, ticket machines, check-in kiosks, self-checkouts) get through them safely: send a photo of the screen on Messenger or WhatsApp, and get the next step in your own language.</p>
<p>For older people, blind and low-vision people, and migrants and travellers. It never presses, pays or types for you, and never needs your PIN.</p>
<p><a href="/try"><b>Try it in your browser</b></a> (same code as the Messenger and WhatsApp bot).</p>
<p>Built for the Meta Global AI Developer Hackathon with Muse Spark, SAM 3.1 and Muse Voice Transcribe.</p>
<p><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/data-deletion">Data deletion</a></p>`, { cache: "public, max-age=3600" });

export const PRIVACY = () => html(`<h1>Privacy policy</h1><p>Last updated: 3 November 2026</p>
<p>AccessPoint helps people use public machines from a photo of the screen, on Messenger and WhatsApp.</p>
<h2>What we receive</h2><p>Your messages, photos and voice notes, and the ID Meta gives your chat with us. We don't receive your name, phone contacts or location. On WhatsApp, Meta shares your phone number with us to reply; we don't store it anywhere else.</p>
<h2>How we use it</h2><p>Photos are sent to Meta's Muse Spark and SAM 3.1 models to read the screen and find the button. Voice notes are converted to audio for Meta's Muse Voice Transcribe and then discarded. To read our replies aloud, the reply text (not your photo or voice) is sent to Microsoft's text-to-speech service. We use all of this only to reply to you.</p>
<h2>What we keep, and for how long</h2><p>Your language, the machine you're at, your goal and the last step, for up to 1 hour. A photo is kept for up to 10 minutes so you can open "See where" and answer the next question. Photos of PIN screens and unreadable photos are deleted straight away. Voice notes are never stored.</p>
<h2>What we never do</h2><p>We never ask for your PIN or passwords, never sell or share your data, and never use it for advertising or training.</p>
<h2>Deleting your data</h2><p>See <a href="/data-deletion">data deletion</a>.</p>`, { title: "Privacy · AccessPoint", cache: "public, max-age=3600" });

export const TERMS = () => html(`<h1>Terms of service</h1><p>Last updated: 3 November 2026</p>
<p>AccessPoint is a free assistant built for a hackathon. It explains what a machine's screen says and suggests one next step. You stay in control: you press every button yourself.</p>
<h2>Limits</h2><p>It can be wrong. Check button labels before you press, follow staff instructions, and contact your bank or the operator if anything looks unusual. It gives no financial, medical or legal advice.</p>
<h2>Use</h2><p>Provided as is, without warranties. Don't use it to harass anyone or to send spam. We may change or stop it at any time.</p>`, { title: "Terms · AccessPoint", cache: "public, max-age=3600" });

export const DELETION = () => html(`<h1>Data deletion</h1>
<p>Everything AccessPoint keeps deletes itself: chat state after 1 hour, photos after 10 minutes, voice notes are never stored.</p>
<p>To delete it right away, send the word <b>delete</b> in the chat, or message the AccessPoint Page.</p>`, { title: "Data deletion · AccessPoint", cache: "public, max-age=3600" });
