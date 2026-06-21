// fixedReview.js — the FIXED WORKFLOW reviewer (spec 2: real logic).
//
// Pattern: prompt chaining. The same stages run in the same order every time;
// the CODE decides the control flow, not the model. Stages 1-2 and 7 are pure
// deterministic code (no LLM); stages 3-6 each make one bounded LLM call.
// Stage 3's risk summary is fed into stages 4-6 — that feed-forward is the
// "chain". Findings roll up into a status via the shared rubric.
//
// Contrast with agentReview.js, where the model picks the next action.

import { STATUS } from "../review/result.js";
import { rollupStatus, severityCounts } from "../review/rubric.js";
import { buildDiffView } from "../util/diffBudget.js";
import { parseFindings } from "../util/parseFindings.js";
import { riskPrompt, analysisPrompt } from "./prompts.js";

/** Human-readable names of every stage, in fixed order (for the report). */
export const STAGES = [
  "Summarize PR metadata",
  "Summarize changed files and diff size",
  "Identify risk areas",
  "Review correctness risks",
  "Review test coverage and missing tests",
  "Review security, operations, maintainability, and documentation",
  "Produce merge-readiness recommendation",
];

/** The LLM-backed analysis stages (4-6). Each maps to rubric dimensions. */
const ANALYSIS_STAGES = [
  { key: "correctness", label: "correctness risks", dimensions: ["correctness"] },
  { key: "tests", label: "test coverage and missing tests", dimensions: ["tests"] },
  {
    key: "security_ops",
    label: "security, operations, maintainability, and documentation",
    dimensions: ["security", "operations", "maintainability", "documentation"],
  },
];

/**
 * @param {object} context  - normalized PRContext
 * @param {object} provider - LLM provider
 * @param {object} metrics  - Metrics instance (mode "fixed")
 * @returns {Promise<import("../review/result.js").ReviewResult>}
 */
export async function fixedReview(context, provider, metrics) {
  const stagesRun = [];
  const findings = [];
  const trace = []; // raw prompts/responses, surfaced via --trace

  // --- Stage 1: metadata summary (deterministic, no LLM) ---
  metrics.recordStep();
  stagesRun.push(STAGES[0]);

  // --- Stage 2: diff summary + build the capped diff view (deterministic) ---
  metrics.recordStep();
  stagesRun.push(STAGES[1]);
  const { text: diffView, truncatedFiles } = buildDiffView(context.files);

  // --- Stage 3: identify risk areas (LLM, prose) — feeds later stages ---
  metrics.recordStep();
  stagesRun.push(STAGES[2]);
  const rPrompt = riskPrompt(context, diffView);
  const riskRes = await provider.complete(rPrompt);
  metrics.recordLLMCall(riskRes.usage);
  const riskSummary = riskRes.text;
  trace.push({ stage: "risks", prompt: rPrompt, response: riskRes.text });

  // --- Stages 4-6: per-dimension analysis (LLM, JSON findings) ---
  for (let i = 0; i < ANALYSIS_STAGES.length; i++) {
    const stage = ANALYSIS_STAGES[i];
    metrics.recordStep();
    stagesRun.push(STAGES[3 + i]);

    const aPrompt = analysisPrompt(stage, context, riskSummary, diffView);
    const res = await provider.complete(aPrompt);
    metrics.recordLLMCall(res.usage);

    const stageFindings = parseFindings(res.text, stage.key);
    findings.push(...stageFindings);
    trace.push({ stage: stage.key, prompt: aPrompt, response: res.text });
  }

  // --- Stage 7: roll-up to a merge-readiness status (deterministic) ---
  metrics.recordStep();
  stagesRun.push(STAGES[6]);
  const status = rollupStatus(findings);
  const counts = severityCounts(findings);

  const limitations = [
    provider.name === "mock"
      ? "Mock provider: findings are deterministic samples, not real model analysis."
      : "Findings reflect only the diff the model was shown.",
  ];
  if (truncatedFiles.length) {
    limitations.push(
      `Large diffs were truncated for ${truncatedFiles.length} file(s): ${truncatedFiles.join(", ")}.`
    );
  }

  return {
    mode: "fixed",
    method: "Fixed agentic workflow (prompt chaining over predefined stages)",
    status,
    summary:
      `Ran ${STAGES.length} fixed stages over PR #${context.pr.number} ` +
      `"${context.pr.title}" (${context.stats.filesChanged} files). ` +
      `Found ${findings.length} finding(s) — ` +
      `${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ` +
      `${counts.low} low, ${counts.info} info. Verdict: ${status}.`,
    findings,
    stages: stagesRun,
    counts,
    limitations,
    metrics: metrics.toJSON(),
    trace, // consumed by the CLI only when --trace is set
  };
}
