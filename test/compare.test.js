// Tests for the comparison analysis. Run with: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeComparison } from "../src/report/compare.js";

// Minimal ReviewResult-shaped fixtures.
function result(status, findings, metrics) {
  return { status, findings, counts: count(findings), metrics };
}
function count(findings) {
  const c = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) c[f.severity]++;
  return c;
}
function metrics(over = {}) {
  return {
    elapsedMs: 10,
    llmCalls: 4,
    toolCalls: 0,
    steps: 7,
    tokens: { input: 1000, output: 100 },
    estCostUsd: 0,
    ...over,
  };
}

test("detects agreement when verdicts match", () => {
  const fixed = result("blocked", [{ severity: "critical" }], metrics());
  const agent = result("blocked", [{ severity: "critical" }], metrics({ llmCalls: 6, toolCalls: 6 }));
  const cmp = computeComparison(fixed, agent);
  assert.equal(cmp.agreement.agree, true);
});

test("detects disagreement when verdicts differ", () => {
  const fixed = result("blocked", [{ severity: "critical" }], metrics());
  const agent = result("ready", [], metrics());
  const cmp = computeComparison(fixed, agent);
  assert.equal(cmp.agreement.agree, false);
  assert.equal(cmp.agreement.agentStatus, "ready");
});

test("computes agent-vs-fixed deltas and percent", () => {
  const fixed = result("ready", [], metrics({ inputTokens: undefined, tokens: { input: 1000, output: 100 } }));
  const agent = result("ready", [], metrics({ tokens: { input: 500, output: 100 }, llmCalls: 6 }));
  const cmp = computeComparison(fixed, agent);
  assert.equal(cmp.cost.inputTokens.delta, -500);
  assert.equal(cmp.cost.inputTokens.deltaPct, -50);
  assert.equal(cmp.cost.llmCalls.delta, 2);
});

test("topSeverity reflects the worst finding", () => {
  const fixed = result("blocked", [{ severity: "low" }, { severity: "critical" }], metrics());
  const agent = result("ready", [], metrics());
  const cmp = computeComparison(fixed, agent);
  assert.equal(cmp.findings.fixedTopSeverity, "critical");
  assert.equal(cmp.findings.agentTopSeverity, null);
});
