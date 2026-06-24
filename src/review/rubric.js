// rubric.js — what "merge-ready" means, and how findings roll up into a status.
//
// This is the SINGLE place that decides the final verdict. Both the fixed
// workflow (spec 2) and the agent (spec 3) use the same roll-up, so their
// statuses are comparable. Pure functions only — trivial to test.
//
// Decision (docs/open-questions.md Q04):
//   dimensions: correctness, tests, security, maintainability, operations, documentation
//   roll-up:
//     any critical  -> blocked
//     any high      -> needs human review
//     only med/low  -> ready with minor issues
//     none          -> ready

import { STATUS, SEVERITY } from "./result.js";

/** The six review dimensions, in report order. */
export const DIMENSIONS = [
  { key: "correctness", label: "Correctness" },
  { key: "tests", label: "Tests" },
  { key: "security", label: "Security" },
  { key: "maintainability", label: "Maintainability" },
  { key: "operations", label: "Operations" },
  { key: "documentation", label: "Documentation" },
];

/**
 * Decide the merge-readiness status from a flat list of findings.
 * @param {Array<{severity:string}>} findings
 * @returns {string} one of STATUS
 */
export function rollupStatus(findings = []) {
  const has = (sev) => findings.some((f) => f.severity === sev);
  if (has(SEVERITY.CRITICAL)) return STATUS.BLOCKED;
  if (has(SEVERITY.HIGH)) return STATUS.HUMAN;
  if (has(SEVERITY.MEDIUM) || has(SEVERITY.LOW)) return STATUS.MINOR;
  return STATUS.READY;
}

/**
 * Count findings per severity — handy for the report summary line.
 * @param {Array<{severity:string}>} findings
 */
export function severityCounts(findings = []) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    if (counts[f.severity] !== undefined) counts[f.severity] += 1;
  }
  return counts;
}
