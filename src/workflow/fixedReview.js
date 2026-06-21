// fixedReview.js — the FIXED WORKFLOW reviewer.
//
// STUB (spec 1): runs the predefined stages in order but does not yet do real
// LLM-backed analysis. Spec 2 fills each stage with a bounded prompt. What is
// already true here, and is the point of the "fixed" approach:
//
//   - the SAME stages run in the SAME order every time
//   - the code, not the model, decides the control flow
//   - it is trivially predictable and debuggable
//
// Contrast this with agentReview.js, where the model picks the next action.

import { STATUS } from "../review/result.js";

/** The fixed, ordered review stages (from specs/02-fixed-workflow-review.md). */
export const STAGES = [
  "Summarize PR metadata",
  "Summarize changed files and diff size",
  "Identify risk areas",
  "Review correctness risks",
  "Review test coverage and missing tests",
  "Review security, operations, and maintainability",
  "Produce merge-readiness recommendation",
];

/**
 * @param {object} context  - normalized PRContext
 * @param {object} provider - LLM provider (mock for now)
 * @param {object} metrics  - Metrics instance (mode "fixed")
 * @returns {Promise<import("../review/result.js").ReviewResult>}
 */
export async function fixedReview(context, provider, metrics) {
  const stagesRun = [];

  for (const stage of STAGES) {
    metrics.recordStep();
    stagesRun.push(stage);

    // STUB: one bounded model touch per stage so metrics/cost are exercised.
    // Spec 2 replaces this with a real, stage-specific prompt + parsing.
    const res = await provider.complete({
      system: "You are a fixed-workflow PR reviewer.",
      prompt: `Stage: ${stage}\nPR: ${context.pr.title} (#${context.pr.number})`,
    });
    metrics.recordLLMCall(res.usage);
  }

  return {
    mode: "fixed",
    method: "Fixed agentic workflow (predefined ordered stages)",
    status: STATUS.HUMAN, // honest default until real analysis lands in spec 2
    summary:
      `Ran ${STAGES.length} predefined stages in fixed order against ` +
      `PR #${context.pr.number} "${context.pr.title}". ` +
      `This is a spec-1 stub: stages execute but do not yet produce analyzed findings.`,
    findings: [],
    stages: stagesRun,
    limitations: [
      "Stub implementation — stages run but perform no real analysis yet (spec 2).",
      "Using the deterministic mock provider, not a real model.",
    ],
    metrics: metrics.toJSON(),
  };
}
