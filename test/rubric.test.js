// Tests for the merge-readiness roll-up — the rule that turns findings into a
// verdict. Run with: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { rollupStatus, severityCounts } from "../src/review/rubric.js";
import { STATUS } from "../src/review/result.js";

test("no findings -> ready", () => {
  assert.equal(rollupStatus([]), STATUS.READY);
});

test("only medium/low -> ready with minor issues", () => {
  assert.equal(rollupStatus([{ severity: "medium" }, { severity: "low" }]), STATUS.MINOR);
});

test("any high -> needs human review", () => {
  assert.equal(rollupStatus([{ severity: "low" }, { severity: "high" }]), STATUS.HUMAN);
});

test("any critical -> blocked (overrides high)", () => {
  assert.equal(rollupStatus([{ severity: "high" }, { severity: "critical" }]), STATUS.BLOCKED);
});

test("severityCounts tallies each level", () => {
  const c = severityCounts([{ severity: "high" }, { severity: "high" }, { severity: "low" }]);
  assert.equal(c.high, 2);
  assert.equal(c.low, 1);
  assert.equal(c.critical, 0);
});
