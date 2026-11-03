// Muse Spark writes the video narration from our facts and scene plan.
// Output: spark-script.json (the draft as Spark returned it). build.py uses the edited lines.
//   node demo/video/spark-script.mjs
import { writeFileSync } from "node:fs";
const R = new URL("../../", import.meta.url).pathname;
process.loadEnvFile(R + ".env");

const scenes = [
  ["hero", 5, "A woman's voice says 'I can't read this screen. Help me.' Narrator follows with one line about how common this is."],
  ["brand", 3, "Logo and tagline 'Stuck at a machine? Send a photo. Get the next step.'"],
  ["problem", 8, "Machines replaced counters just as the world ages (1.4B people 60+ by 2030, 2.2B with vision impairment, 281M migrants). Then: a general chatbot at a machine can do harm (wrong button, guesses, rushes)."],
  ["arch", 12, "How it works, four nodes lit in turn: Muse Spark reads the photo and plans one step; SAM 3.1 outlines every button precisely; code points only where the two agree and stops anything you didn't ask for; Muse Voice hears answers in 25 languages."],
  ["guard", 7, "Guardrails: never needs your PIN, asks instead of guessing, stops wrong totals and transfers, you press every button yourself."],
  ["demo-airport", 24, "App demo 1: Amara, first flight, scans the 'Need help? Scan me' sticker on the check-in kiosk, one Start button, puts passport on the reader, answers 'yes' and 'window' by voice, boarding pass prints. Narrator has 2 short lines; the app speaks the rest."],
  ["demo-checkout", 14, "App demo 2: Siti, a helper in Singapore, at an English self-checkout, hears every step in Bahasa Indonesia, including 'unexpected item in the bagging area'. 1 narrator line."],
  ["demo-ticket", 12, "App demo 3: Daniel is blind; AccessPoint guides his hand to the card slot of a train ticket machine. 1 narrator line."],
  ["demo-mismatch", 12, "Safety 1: Mr Lim buys one carton of milk, the self-checkout total says S$42.00 instead of S$4.20; AccessPoint says stop, press Cancel. 1 narrator line."],
  ["demo-glare", 8, "Safety 2: glare hides the screen; it asks for a better angle instead of guessing. 1 narrator line."],
  ["chat-telegram", 15, "No app needed: the same assistant in a chat. Telegram, live: Amara sends a photo of the seat screen; real Muse Spark answer asks window or aisle; she taps Window 14A; it says where it is and sends a voice note. 2 narrator lines."],
  ["chat-whatsapp", 14, "WhatsApp: Siti sends a photo, gets the step in Bahasa Indonesia, as text and a voice note. 1-2 narrator lines."],
  ["chat-messenger", 14, "Messenger: Mr Lim sends a photo of the S$42 total; it says stop. Scan the sticker, chat opens, nothing to install. 1-2 narrator lines."],
  ["results", 6, "We measured it on the real models: Muse Spark 7 of 7 screens right, Spark plus SAM 3.1 pointed at the right button 5 of 5, Muse Voice understood 3 of 3 languages, 20 of 20 bot tests, 11 of 11 app flows."],
  ["close", 6, "Close: 'Independence by design.' Try it in your browser, link and QR on screen. Built on Meta's models."],
];

const prompt = `You are writing the voice-over for a 3-minute hackathon demo video of AccessPoint, an assistant for people who struggle with self-service machines (older people, blind and low-vision people, migrants). The video is judged by busy hackathon judges.

Rules for every line:
- Plain, warm, confident English. Short sentences. No jargon, no hype words ("revolutionary", "seamless", "cutting-edge"), no em dashes.
- At most 12 words per line, so each fits one caption.
- About 2.6 words per second of speaking time: never write more lines than fit the scene's seconds.
- Only state facts given in the scene description. Never invent numbers or features.
- Name Meta's models exactly: Muse Spark, SAM 3.1, Muse Voice.

Scenes (id, seconds, what's on screen):
${scenes.map(([id, s, d]) => `- ${id} (${s} s): ${d}`).join("\n")}`;

const schema = {
  type: "object", additionalProperties: false,
  properties: { scenes: { type: "array", items: { type: "object", additionalProperties: false, properties: { id: { type: "string" }, lines: { type: "array", items: { type: "string" } } }, required: ["id", "lines"] } } },
  required: ["scenes"],
};
const res = await fetch("https://api.meta.ai/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.MODEL_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ model: "muse-spark-1.3", messages: [{ role: "user", content: prompt }], response_format: { type: "json_schema", json_schema: { name: "voiceover", strict: true, schema } } }),
});
const j = await res.json();
if (!res.ok) { console.error(JSON.stringify(j).slice(0, 500)); process.exit(1); }
const out = JSON.parse(j.choices[0].message.content);
writeFileSync(new URL("spark-script.json", import.meta.url), JSON.stringify({ model: "muse-spark-1.3", written: new Date().toISOString(), prompt, ...out }, null, 2));
for (const s of out.scenes) console.log(`${s.id}:\n  ${s.lines.join("\n  ")}`);
