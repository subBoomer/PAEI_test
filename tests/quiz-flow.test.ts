import { test } from "node:test";
import assert from "node:assert/strict";
import { decideSelection } from "../lib/quizFlow";

test("guardrail: a click while locked is ignored", () => {
  assert.deepEqual(decideSelection(0, 4, true), { kind: "ignore" });
  assert.deepEqual(decideSelection(3, 5, true), { kind: "ignore" });
});

test("first selection on an unanswered question commits", () => {
  assert.deepEqual(decideSelection(0, 3, false), { kind: "commit" });
});

test("re-clicking the same value commits (and advances)", () => {
  assert.deepEqual(decideSelection(3, 3, false), { kind: "commit" });
});

test("changing an answered question asks for confirmation", () => {
  assert.deepEqual(decideSelection(3, 5, false), { kind: "confirm", from: 3 });
});

test("rapid double click cannot overwrite an answer", () => {
  const first = decideSelection(0, 2, false);
  assert.equal(first.kind, "commit");
  // After committing, the selector is locked until the quiz advances.
  const second = decideSelection(2, 4, true);
  assert.equal(second.kind, "ignore");
});

test("when unlocked again, a change is offered as a confirmation, not silent", () => {
  const change = decideSelection(2, 4, false);
  assert.deepEqual(change, { kind: "confirm", from: 2 });
});
