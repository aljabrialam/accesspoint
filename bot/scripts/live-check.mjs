// Real Meta Model API check: Muse Spark plans a step and SAM 3.1 finds the button, on the app's screenshots.
//   npm run live-check            (reads MODEL_API_KEY from ../.env or ../.env.local; never prints it)
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { decide } from "../src/guard.js";
import { dataUrl, locate, planStep } from "../src/meta.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
for (const f of [".env.local", ".env"]) if (existsSync(join(root, f))) process.loadEnvFile(join(root, f));
if (!process.env.MODEL_API_KEY) { console.error("MODEL_API_KEY is empty. Add it to .env at the project root."); process.exit(1); }
const env = { MODEL_API_KEY: process.env.MODEL_API_KEY };

const shots = join(root, "bot", "test", "fixtures");
// Clean, hint-free machine screens rendered from test/fixtures/screens.html (tilted, with glare).
const cases = [
  ["airport-passport.jpg", "", "check in for my flight", "English", "step"],
  ["airport-seat.jpg", "", "check in for my flight", "English", "choice"],
  ["ticket-trip.jpg", "", "go to Changi Airport", "English", "choice"],
  ["checkout-overcharge.jpg", "", "buy one carton of milk", "English", "stop"],
  ["kiosk-pin.jpg", "", "buy a train ticket", "English", "pin"],
  ["clinic-jp.jpg", "", "check in for my appointment", "Tagalog", "choice"],
  ["checkout-scan.jpg", "", "pay for my groceries", "Indonesian", "step"],
];
let passed = 0;
for (const [file, machine, goal, langName, expected] of cases) {
  const image = dataUrl(readFileSync(join(shots, file)), "image/jpeg");
  const t0 = Date.now();
  try {
    const plan = await planStep(env, { image, langName, machine, goal });
    const verdict = decide(plan, { goal });
    const box = plan.action?.target_concept ? await locate(env, { image, concept: plan.action.target_concept }) : null;
    console.log(`\n${file}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    console.log(`  screen:  ${plan.screen_type} · ${plan.screen_says}`);
    console.log(`  step:    ${plan.instruction}`);
    const ok = verdict.type === expected;
    passed += ok;
    console.log(`  verdict: ${verdict.type}${verdict.reason ? " (" + verdict.reason + ")" : ""}  ${ok ? "as expected" : "EXPECTED " + expected}`);
    console.log(`  SAM 3.1: ${plan.action?.target_concept || "-"} → ${box ? `box ${box.x1},${box.y1}-${box.x2},${box.y2} c=${box.c}` : "not found"}`);
  } catch (e) {
    console.log(`\n${file}: ${e.message}`);
  }
}

console.log(`\n${passed}/${cases.length} screens got the expected verdict.`);
