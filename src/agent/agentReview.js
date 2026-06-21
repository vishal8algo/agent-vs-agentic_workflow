// agentReview.js — the AUTONOMOUS AGENT reviewer.
//
// STUB (spec 1): demonstrates the SHAPE of an agent loop without real
// model-driven decisions yet. Spec 3 turns this into a true goal-driven loop
// where the model chooses the next tool each iteration. What is already visible
// here, and is the point of the "agent" approach:
//
//   - control flow is a LOOP bounded by guardrails (max iterations / tool calls)
//   - the agent records an action TRACE as it goes (debuggability via trace)
//   - stopping is a decision ("finalize"), not a fixed end of a list
//
// Contrast with fixedReview.js, where the stages are hard-coded.

import { STATUS } from "../review/result.js";

/**
 * @param {object} context  - normalized PRContext
 * @param {object} provider - LLM provider (mock for now)
 * @param {object} metrics  - Metrics instance (mode "agent")
 * @param {object} [opts]   - { maxIterations, maxToolCalls }
 */
export async function agentReview(context, provider, metrics, opts = {}) {
  const maxIterations = opts.maxIterations ?? 8;
  const trace = [];

  // STUB plan: a tiny scripted sequence standing in for model-chosen actions.
  // Spec 3 replaces this with: ask the model -> it returns a tool choice ->
  // execute tool -> feed observation back -> repeat until "finalize".
  const scriptedActions = [
    "get_pr_summary",
    "list_changed_files",
    "read_file_diff",
    "finalize_review",
  ];

  for (let i = 0; i < scriptedActions.length && i < maxIterations; i++) {
    const action = scriptedActions[i];
    metrics.recordStep(); // one agent iteration
    metrics.recordToolCall(); // the agent "used a tool"
    trace.push(`iteration ${i + 1}: ${action}`);

    if (action === "finalize_review") break;

    // STUB: a model touch per iteration so metrics/cost are exercised.
    const res = await provider.complete({
      system: "You are an autonomous PR-review agent. Choose the next action.",
      prompt: `Goal: assess merge-readiness of PR #${context.pr.number}.\nLast action: ${action}`,
    });
    metrics.recordLLMCall(res.usage);
  }

  return {
    mode: "agent",
    method: "Autonomous agent (goal-driven loop with tools)",
    status: STATUS.HUMAN, // honest default until real analysis lands in spec 3
    summary:
      `Ran a bounded agent loop (max ${maxIterations} iterations) against ` +
      `PR #${context.pr.number} "${context.pr.title}". ` +
      `This is a spec-1 stub: the loop and trace are real, but actions are ` +
      `scripted rather than model-chosen.`,
    findings: [],
    stages: trace, // for the agent, "stages" carries the action trace
    limitations: [
      "Stub implementation — actions are scripted, not chosen by the model yet (spec 3).",
      "Using the deterministic mock provider, not a real model.",
    ],
    metrics: metrics.toJSON(),
  };
}
