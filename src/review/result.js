// result.js — the shared "ReviewResult" shape both modes return.
//
// Whether the review came from the fixed workflow or the autonomous agent, it
// is reported in this identical structure. That lets the report writers and the
// comparison engine treat both modes uniformly.

/** Merge-readiness statuses (the vocabulary from the api-contract). */
export const STATUS = {
  READY: "ready",
  MINOR: "ready with minor issues",
  BLOCKED: "blocked",
  HUMAN: "needs human review",
};

/** Severity levels for findings. */
export const SEVERITY = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "info",
};

/**
 * @typedef {Object} Finding
 * @property {string} severity  - one of SEVERITY
 * @property {string} title     - short summary
 * @property {string} detail    - explanation
 * @property {string} [evidence]- file:line or diff reference backing the claim
 *
 * @typedef {Object} ReviewResult
 * @property {string} mode        - "fixed" | "agent"
 * @property {string} method      - human-readable method name
 * @property {string} status      - one of STATUS
 * @property {string} summary     - one-paragraph overview
 * @property {Finding[]} findings - findings grouped later by severity
 * @property {string[]} stages    - ordered stages (fixed) or action trace (agent)
 * @property {string[]} limitations
 * @property {object} metrics     - Metrics.toJSON()
 */

/** Helper to build a finding with validation-friendly defaults. */
export function finding(severity, title, detail, evidence = "") {
  return { severity, title, detail, evidence };
}
