import assert from "node:assert/strict";
import {
  advanceSequence,
  decodeEmailDraft,
  draftsDiffer,
  encodeEmailDraft,
  isDueForSequence,
  isNoShow,
  normalizeStep,
  parseSheetDate,
} from "./leadSequence";

const today = new Date(2026, 9, 29);

assert.equal(normalizeStep(""), 1);
assert.equal(normalizeStep("3"), 3);
assert.equal(normalizeStep("step 4"), 4);

assert.equal(isDueForSequence({ stage: "New", nextFollowUp: "10/29/2026", sequenceStep: "1", today }), true);
assert.equal(isDueForSequence({ stage: "Contacted", nextFollowUp: "10/28/2026", sequenceStep: "2", today }), true);
assert.equal(isDueForSequence({ stage: "Replied", nextFollowUp: "10/28/2026", sequenceStep: "1", today }), false);
assert.equal(isDueForSequence({ stage: "New", nextFollowUp: "10/30/2026", sequenceStep: "1", today }), false);
assert.equal(isDueForSequence({ stage: "New", nextFollowUp: "", sequenceStep: "1", today }), false);
assert.equal(isDueForSequence({ stage: "Lost", nextFollowUp: "10/1/2026", sequenceStep: "1", today }), false);
assert.equal(isDueForSequence({ stage: "New", nextFollowUp: "10/1/2026", sequenceStep: "5", today }), false);

assert.equal(isNoShow({ stage: "Trial Booked", classDate: "10/28/2026", status: "", today }), true);
assert.equal(isNoShow({ stage: "Trial Booked", classDate: "10/29/2026", status: "", today }), false);
assert.equal(isNoShow({ stage: "Trial Booked", classDate: "10/1/2026", status: "Joined", today }), false);
assert.equal(isNoShow({ stage: "Joined", classDate: "10/1/2026", status: "", today }), false);

const next = advanceSequence(1, today);
assert.equal(next.step, 2);
assert.equal(next.nextDate, "10/31/2026");
assert.deepEqual(advanceSequence(4, today), { step: 5, nextDate: "" });

const encoded = encodeEmailDraft("Hello", "Come train.");
assert.deepEqual(decodeEmailDraft(encoded), { subject: "Hello", body: "Come train." });
assert.equal(draftsDiffer(encoded, encodeEmailDraft("Hello", "Come train tomorrow.")), true);
assert.equal(draftsDiffer("", encoded), false);
assert.ok(parseSheetDate("2026-10-29"));

console.log("leadSequence tests passed");
