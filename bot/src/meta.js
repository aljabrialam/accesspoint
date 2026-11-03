// Meta Model API clients (https://dev.meta.ai/docs). One key: MODEL_API_KEY, kept as a Worker secret.
import { Buffer } from "node:buffer";
import { PLAN_SCHEMA, bestBox, parseSamBoxes, planPrompt } from "./guard.js";

const BASE = "https://api.meta.ai/v1";
export const MODELS = { spark: "muse-spark-1.3", sam: "sam-3.1", voice: "muse-voice-transcribe-1.0", image: "muse-image-1.0" };

const auth = (env) => ({ Authorization: `Bearer ${env.MODEL_API_KEY}` });
export const dataUrl = (bytes, mime = "image/jpeg") => `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;

async function post(env, path, body, timeoutMs = 25000) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { ...auth(env), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

// Responses API output → concatenated output_text.
export function outputText(resp) {
  if (typeof resp?.output_text === "string") return resp.output_text;
  return (resp?.output ?? []).flatMap((o) => o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text).join("");
}

// Muse Spark: read the photo, return ONE step as JSON matching PLAN_SCHEMA.
export async function planStep(env, { image, langName, machine, goal, prev }) {
  const resp = await post(env, "/chat/completions", {
    model: MODELS.spark,
    reasoning_effort: "low",
    messages: [
      { role: "system", content: planPrompt({ langName, machine, goal, prev }) },
      { role: "user", content: [
        { type: "text", text: "Here is the photo of the machine screen." },
        { type: "image_url", image_url: { url: image } },
      ] },
    ],
    response_format: { type: "json_schema", json_schema: { name: "accesspoint_step", schema: PLAN_SCHEMA, strict: true } },
  });
  const text = resp?.choices?.[0]?.message?.content;
  return JSON.parse(typeof text === "string" ? text : JSON.stringify(text));
}

// SAM 3.1: find the named control in the same photo. Returns the most confident box, or null.
export async function locate(env, { image, concept }) {
  const phrase = String(concept ?? "").replace(/[^\p{L}\p{N} -]/gu, " ").trim().split(/\s+/).slice(0, 4).join(" ");
  if (!phrase) return null;
  const resp = await post(env, "/responses", {
    model: MODELS.sam,
    input: [{ type: "message", role: "user", content: [
      { type: "input_text", text: phrase },
      { type: "input_image", image_url: image },
    ] }],
    metadata: { include_confidence: "true" },
  });
  return bestBox(parseSamBoxes(outputText(resp)));
}

// Muse Voice Transcribe: 16 kHz mono WAV → text. Biased toward the words on screen.
export async function transcribe(env, { wav, language, keywords = [] }) {
  const form = new FormData();
  const request = { model: MODELS.voice, audioEncoding: "WAV", mode: "PUSH_TO_TALK" };
  if (keywords.length) request.keywords = keywords.slice(0, 50);
  if (language) request.languageBias = [language];
  form.append("request", new Blob([JSON.stringify(request)], { type: "application/json" }));
  form.append("audio", new Blob([wav], { type: "audio/wav" }), "note.wav");
  const res = await fetch(`${BASE}/asr/transcribe`, { method: "POST", headers: { ...auth(env), Accept: "text/plain" }, body: form, signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`asr ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.text()).split("\n").map((l) => l.replace(/^[A-Za-z]+:/, "").trim()).filter(Boolean).join(" ");
}

// Voice notes arrive as AAC (Messenger) or OGG/Opus (WhatsApp). The Modal service turns them into WAV.
export async function toWav(env, bytes, mime) {
  const res = await fetch(env.AUDIO_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.AUDIO_TOKEN}`, "Content-Type": mime || "application/octet-stream" },
    body: bytes,
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`audio ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

// Muse Image: artwork for the machine sticker kit only. Never used to show where to press.
export async function stickerArt(env, prompt) {
  const resp = await post(env, "/images/generations", { model: MODELS.image, prompt, size: "1024x1024" }, 90000);
  return resp?.data?.[0];
}
