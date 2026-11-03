// One conversation turn, the same for Messenger and WhatsApp.
// io: { channel, user, say(reply), typing(), fetchMedia(media) }   reply: { text, choices?: [{ title, id }], link?: { title, url }, next? }
// input: { kind: "text" | "choice" | "image" | "audio" | "start", text?, id?, media?, ref? }
import { COMMANDS, LANGS, LANG_MODEL, LANG_NAME, S, position } from "./strings.js";
import { decide, matchOption } from "./guard.js";
import { dataUrl, locate, planStep, toWav, transcribe } from "./meta.js";

export const MACHINES = ["atm", "ticket", "clinic", "order", "checkout", "airport"];
const PHOTO_TTL = 600; // seconds: photos live 10 minutes, only for "See where" and the next answer
const SESSION_TTL = 3600;

export const machineFrom = (ref) => MACHINES.find((m) => new RegExp(`(^|[^a-z])${m}([^a-z]|$)`, "i").test(String(ref ?? "")));
const PICKER = LANGS.map((l) => S[l].picker).filter((v, i, a) => a.indexOf(v) === i).join(" · ");
const rid = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
const slim = (plan) => plan && { screen_type: plan.screen_type, screen_says: plan.screen_says, options: plan.options, action: plan.action, instruction: plan.instruction };

export async function converse(io, input, env, origin) {
  const kv = env.AP_KV;
  const key = `s:${io.channel}:${io.user}`;
  const s = (await kv.get(key, "json").catch(() => null)) ?? {};
  const save = () => kv.put(key, JSON.stringify(s), { expirationTtl: SESSION_TTL });
  const L = () => S[s.lang] ?? S.en;
  const say = async (reply, remember = true) => { if (remember) s.last = reply; await save(); return io.say(reply); };
  const btn = (title, id) => ({ title, id });
  const stepButtons = () => [btn(L().btnDone, "DONE"), btn(L().btnRepeat, "REPEAT")];

  const id = input.id ?? "";
  const text = (input.text ?? "").trim();
  const m = machineFrom(input.ref) ?? machineFrom(text.match(/#\w+/)?.[0]);
  if (m) s.machine = m;

  const greet = () => {
    const t = L();
    s.goal = null; s.plan = null; s.photo = null;
    return say({ text: [t.greet, s.machine ? t.machine(t.machines[s.machine]) : null, t.goalAsk].filter(Boolean).join("\n\n"), choices: [btn(t.btnHelp, "HELP"), btn(t.btnLang, "LANG")] });
  };
  const picker = () => say({ text: PICKER, choices: LANGS.map((l) => btn(LANG_NAME[l], "L:" + l)), list: "Language" }, false);

  if (COMMANDS.delete.test(text)) {
    await Promise.all([kv.delete(key), s.photo && kv.delete(`p:${s.photo}`), s.photo && kv.delete(`b:${s.photo}`)].filter(Boolean));
    return io.say({ text: L().deleted });
  }
  if (id.startsWith("L:") && LANGS.includes(id.slice(2))) { s.lang = id.slice(2); return greet(); }
  if (id === "LANG" || COMMANDS.lang.test(text)) return picker();
  if (!s.lang) return picker();
  if (id === "START" || input.kind === "start" || m || COMMANDS.start.test(text)) return greet();
  if (id === "HELP" || COMMANDS.help.test(text)) return say({ text: L().help, choices: [btn(L().btnLang, "LANG")] }, false);
  if (id === "REPEAT" || COMMANDS.repeat.test(text)) return io.say(s.last ?? { text: L().help });
  if (id === "DONE" || COMMANDS.done.test(text)) return say({ text: L().photoAsk }, false);

  try {
    if (input.kind === "image") return await onPhoto(io, input, env, origin, s, say, L(), stepButtons);
    if (id.startsWith("OPT:")) return await onOption(io, Number(id.slice(4)), env, origin, s, say, L(), stepButtons);
    if (input.kind === "audio") {
      await io.typing?.();
      const { bytes, mime } = await io.fetchMedia(input.media);
      const wav = await toWav(env, bytes, mime);
      const keywords = [...(s.plan?.options ?? []).flatMap((o) => [o.label, o.meaning]), "done", "repeat", "cancel"];
      const heard = await transcribe(env, { wav, language: LANG_MODEL[s.lang], keywords });
      if (!heard) return say({ text: L().voiceFail }, false);
      await io.say({ text: L().heard(heard) });
      return converse(io, { kind: "text", text: heard }, env, origin);
    }
    // Typed or spoken text: an answer to the screen's question, or the person's goal.
    if (s.plan?.options?.length) {
      const i = matchOption(text, s.plan.options);
      if (i >= 0) return await onOption(io, i, env, origin, s, say, L(), stepButtons);
    }
    if (text) { s.goal = text.slice(0, 200); s.plan = null; return say({ text: L().goalSet(s.goal) }); }
    return say({ text: L().photoAsk }, false);
  } catch (e) {
    console.log("converse error", e?.stack ?? e);
    return say({ text: L().error }, false);
  }
}

async function onPhoto(io, input, env, origin, s, say, L, stepButtons) {
  await io.typing?.();
  const { bytes, mime } = await io.fetchMedia(input.media);
  const image = dataUrl(bytes, mime || "image/jpeg");
  const photo = rid();
  await env.AP_KV.put(`p:${photo}`, bytes, { expirationTtl: PHOTO_TTL, metadata: { mime: mime || "image/jpeg" } });

  const plan = await planStep(env, { image, langName: LANG_MODEL[s.lang], machine: s.machine && S.en.machines[s.machine], goal: s.goal, prev: s.plan?.instruction });
  const verdict = decide(plan, s);
  const screen = plan.screen_says ? L.screen(plan.screen_says) : null;
  const join = (...parts) => parts.filter(Boolean).join("\n\n");

  if (verdict.type === "pin") {
    await env.AP_KV.delete(`p:${photo}`); // never keep a PIN screen
    s.plan = { instruction: "Type the PIN privately." };
    return say({ text: L.pin, choices: [stepButtons()[0]] });
  }
  if (verdict.type === "unreadable") { await env.AP_KV.delete(`p:${photo}`); return say({ text: L.unreadable }, false); }
  s.plan = slim(plan); s.photo = photo;
  if (verdict.type === "stop") {
    s.plan.options = [];
    const msg = verdict.reason === "amount" ? L.stopAmount(verdict.want, verdict.seen) : verdict.reason === "suspicious" ? L.stopSuspicious : L.stopTransfer;
    return say({ text: join(msg, screen), choices: [{ title: L.btnStart, id: "START" }] });
  }
  if (verdict.type === "done") return say({ text: join(screen, plan.instruction, L.done), choices: [{ title: L.btnStart, id: "START" }] });
  if (verdict.type === "choice") {
    const list = plan.options.map((o) => `• ${o.label}${o.meaning && o.meaning !== o.label ? `: ${o.meaning}` : ""}`).join("\n");
    return say({
      text: join(screen, `${plan.question || L.which}\n${list}`),
      choices: [...plan.options.map((o, i) => ({ title: o.label, id: `OPT:${i}` })), stepButtons()[1]],
      list: L.choose,
    });
  }
  // A step: SAM 3.1 must find the control Muse Spark named, or we say we couldn't pinpoint it.
  const a = plan.action ?? {};
  const box = ["press", "insert", "take"].includes(a.kind) && a.target_concept ? await locate(env, { image, concept: a.target_concept }).catch(() => null) : null;
  const label = a.target_label || a.target_concept;
  const where = box ? L.found(label, position(L, box)) : label ? L.checkLabel(label) : null;
  if (box) await env.AP_KV.put(`b:${photo}`, JSON.stringify({ box, label, lang: s.lang }), { expirationTtl: PHOTO_TTL });
  return say({
    text: join(plan.progress === "unchanged" ? L.notChanged : null, screen, plan.instruction, where),
    choices: stepButtons(),
    link: box ? { title: L.btnSee, url: `${origin}/see/${photo}?l=${s.lang}` } : null,
    next: L.tapNext,
  });
}

// The person picked an option (button, text or voice). SAM 3.1 finds it on the last photo.
async function onOption(io, i, env, origin, s, say, L, stepButtons) {
  const opt = s.plan?.options?.[i];
  if (!opt) return say({ text: L.photoAsk }, false);
  await io.typing?.();
  let box = null;
  const bytes = s.photo ? await env.AP_KV.get(`p:${s.photo}`, "arrayBuffer") : null;
  if (bytes) box = await locate(env, { image: dataUrl(bytes), concept: `${opt.label} button` }).catch(() => null);
  if (box) await env.AP_KV.put(`b:${s.photo}`, JSON.stringify({ box, label: opt.label, lang: s.lang }), { expirationTtl: PHOTO_TTL });
  s.plan = { ...s.plan, options: [], instruction: L.press(opt.label) };
  return say({
    text: [L.press(opt.label), box ? L.found(opt.label, position(L, box)) : L.checkLabel(opt.label)].join(" "),
    choices: stepButtons(),
    link: box ? { title: L.btnSee, url: `${origin}/see/${s.photo}?l=${s.lang}` } : null,
    next: L.tapNext,
  });
}
