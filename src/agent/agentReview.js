// agentReview.js — the AUTONOMOUS AGENT reviewer (spec 3: real loop).
//
// Pattern: agent (open loop). The model is asked "what next?" each turn; it
// picks a tool; we run the tool; the observation feeds the next decision. The
// loop stops when the model finalizes OR a guardrail trips. The CONTROL FLOW is
// the model's, not the code's — the opposite of fixedReview.js.
//
// Guardrails (Q07): maxIterations and maxToolCalls. If neither finalize fires,
// we force-finalize with whatever findings were gathered.
//
// On the mock provider the decisions are deterministic; with Gemini they are
// genuinely model-chosen. Either way the harness below is identical.

import { rollupStatus, severityCounts } from "../review/rubric.js";
import { TOOLS } from "./tools.js";
import { decisionPrompt, parseDecision } from "./agentPrompt.js";

/**
 * @param {object} context  - normalized PRContext
 * @param {object} provider - LLM provider
 * @param {object} metrics  - Metrics instance (mode "agent")
 * @param {object} [opts]   - { maxIterations, maxToolCalls }
 */
export async function agentReview(context, provider, metrics, opts = {}) {
  const maxIterations = opts.maxIterations ?? 8;
  const maxToolCalls = opts.maxToolCalls ?? 12;
  const tracer = opts.tracer ?? null; // optional Langfuse tracer (spec 05)

  const state = { findings: [], done: false }; // tools mutate this
  const transcript = []; // human-readable lines fed back into each decision
  const traceSteps = []; // raw prompt/response/action, surfaced via --trace
  let stopReason = "finalized";

  for (let i = 0; i < maxIterations; i++) {
    if (state.done) break;
    if (metrics.toolCalls >= maxToolCalls) {
      stopReason = "hit max tool calls";
      break;
    }

    metrics.recordStep(); // one agent iteration

    // 1. Ask the model what to do next.
    const prompt = decisionPrompt(context, transcript);
    const res = await provider.complete(prompt);
    metrics.recordLLMCall(res.usage);

    // 2. Parse its chosen action.
    const decision = parseDecision(res.text);
    if (!decision) {
      transcript.push("OBSERVATION: (could not parse the agent's action; skipping)");
      traceSteps.push({ iteration: i + 1, prompt, response: res.text, action: null });
      continue;
    }

    // 3. Dispatch the tool.
    const tool = TOOLS[decision.tool];
    let observation;
    if (!tool) {
      observation = `Unknown tool "${decision.tool}".`;
    } else {
      observation = tool.run(decision.args, { context, state });
      metrics.recordToolCall();
      tracer?.toolSpan(decision.tool, decision.args, observation);
    }

    transcript.push(`ACTION: ${decision.tool} ${compactArgs(decision.args)}`);
    transcript.push(`OBSERVATION: ${observation}`);
    traceSteps.push({ iteration: i + 1, prompt, response: res.text, action: decision, observation });

    if (decision.tool === "finalize_review") break;
  }

  if (!state.done && stopReason === "finalized") stopReason = "hit max iterations";

  // Roll up with the SAME rubric the fixed workflow uses (comparable verdicts).
  const status = rollupStatus(state.findings);
  const counts = severityCounts(state.findings);

  const limitations = [
    provider.name === "mock"
      ? "Mock provider: tool choices and findings are deterministic samples, not real model reasoning."
      : "Findings reflect only what the agent chose to inspect within the PR.",
    `Bounded by guardrails (max ${maxIterations} iterations, ${maxToolCalls} tool calls).`,
  ];

  return {
    mode: "agent",
    method: "Autonomous agent (goal-driven tool loop)",
    status,
    summary:
      `Ran an autonomous loop over PR #${context.pr.number} "${context.pr.title}". ` +
      `Stopped: ${stopReason}. Used ${metrics.toolCalls} tool call(s) across ` +
      `${metrics.steps} iteration(s); recorded ${state.findings.length} finding(s). ` +
      `Verdict: ${status}.`,
    findings: state.findings,
    stages: transcript, // for the agent, "stages" carries the action trace
    counts,
    limitations,
    metrics: metrics.toJSON(),
    trace: traceSteps,
  };
}

function compactArgs(args) {
  if (!args || Object.keys(args).length === 0) return "";
  const s = JSON.stringify(args);
  return s.length > 120 ? s.slice(0, 117) + "..." : s;
}
