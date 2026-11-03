import assert from "node:assert/strict";
import { test } from "node:test";

import { amountOf, bestBox, decide, matchOption, parseSamBoxes } from "../src/guard.js";
import { machineFrom } from "../src/converse.js";
import { S, position } from "../src/strings.js";

const plan = (over = {}) => ({
  readable: true, screen_type: "choice", screen_says: "Choose account", options: [], question: "",
  action: { kind: "press", target_label: "Confirm", target_concept: "confirm button", location_hint: "" },
  instruction: "Press Confirm.", money: { amount: "", is_transfer: false }, progress: "first", risk: "none", ...over,
});

test("PIN screens always get the fixed PIN message, even if unreadable", () => {
  assert.equal(decide(plan({ screen_type: "pin_entry" })).type, "pin");
  assert.equal(decide(plan({ risk: "pin_request", readable: false })).type, "pin");
});

test("unreadable photos never produce a step", () => {
  assert.equal(decide(plan({ readable: false })).type, "unreadable");
  assert.equal(decide(plan({ risk: "unclear" })).type, "unreadable");
  assert.equal(decide(null).type, "unreadable");
});

test("a transfer the person didn't ask for is stopped", () => {
  const p = plan({ screen_type: "confirm", money: { amount: "S$1,000", is_transfer: true } });
  assert.deepEqual(decide(p, { goal: "withdraw cash" }), { type: "stop", reason: "transfer" });
  assert.equal(decide(p, { goal: "transfer money to my son" }).type, "step");
});

test("a different amount on the confirm screen is stopped", () => {
  const p = plan({ screen_type: "confirm", money: { amount: "S$1,000", is_transfer: false } });
  assert.equal(decide(p, { goal: "withdraw S$100" }).reason, "amount");
  assert.equal(decide(plan({ screen_type: "confirm", money: { amount: "S$100", is_transfer: false } }), { goal: "withdraw S$100" }).type, "step");
});

test("suspicious screens stop; done and choices are recognised", () => {
  assert.equal(decide(plan({ risk: "suspicious" })).reason, "suspicious");
  assert.equal(decide(plan({ screen_type: "done" })).type, "done");
  const opts = [{ label: "Savings", meaning: "savings" }, { label: "Current", meaning: "current" }];
  assert.equal(decide(plan({ action: { kind: "ask_user" }, options: opts })).type, "choice");
});

test("answers match options; ties are not guessed", () => {
  const opts = [{ label: "Savings", meaning: "Tabungan" }, { label: "Current", meaning: "Giro" }];
  assert.equal(matchOption("savings", opts), 0);
  assert.equal(matchOption("yung current po", opts), 1);
  assert.equal(matchOption("tabungan", opts), 0);
  assert.equal(matchOption("banana", opts), -1);
  assert.equal(matchOption("savings or current", opts), -1);
});

test("amounts parse across formats", () => {
  assert.equal(amountOf("S$1,000"), 1000);
  assert.equal(amountOf("withdraw S$100 please"), 100);
  assert.equal(amountOf("Rp 50.000"), 50000);
  assert.equal(amountOf("withdraw cash"), null);
});

test("SAM 3.1 records parse; low confidence is dropped", () => {
  const text = "<0f>1<|box;x1=444;y1=625;x2=679;y2=850;w=1800;h=1200;c=0.91|><|mask;x=0;y=0;data=1,2|>,2<|box;x1=10;y1=10;x2=20;y2=20;w=1800;h=1200;c=0.2|>";
  const boxes = parseSamBoxes(text);
  assert.equal(boxes.length, 2);
  assert.deepEqual(bestBox(boxes), { x1: 444, y1: 625, x2: 679, y2: 850, w: 1800, h: 1200, c: 0.91 });
  assert.equal(bestBox(parseSamBoxes("")), null);
});

test("positions come from the box, in the person's language", () => {
  assert.equal(position(S.en, { x1: 0, y1: 1000, x2: 300, y2: 1150, w: 1800, h: 1200 }), "at the bottom, on the left");
  assert.equal(position(S.tl, { x1: 800, y1: 500, x2: 1000, y2: 700, w: 1800, h: 1200 }), "sa gitna");
});

test("the sticker ref names the machine", () => {
  assert.equal(machineFrom("atm"), "atm");
  assert.equal(machineFrom("Hi AccessPoint #airport"), "airport");
  assert.equal(machineFrom("hello"), undefined);
});
