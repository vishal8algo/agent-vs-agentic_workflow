// agentPrompt.js — how we ask the model "what next?" and read its answer.
//
// This is the agent's control protocol (a small ReAct-style loop):
//   - we show the goal, the available tools, the PR's files, and the running
//     transcript (past actions + observations)
//   - the model replies with ONE JSON action: a tool call, or finalize
//   - we parse it and the loop dispatches the tool
//
// On the mock provider these decisions are deterministic; on Gemini the model
// genuinely chooses. The prompt text is written for the real model.

import { toolCatalog } from "./tools.js";

const SYSTEM = `You are an autonomous pull-request review agent.
You assess merge-readiness by choosing tools one at a time, observing results,
and recording findings. Only use the provided tools; you cannot access anything
outside the PR. Record concrete, evidence-backed findings, then finalize.`;

/**
 * Build the decision prompt for the current loop state.
 * @param {object} context     - PRContext
 * @param {string[]} transcript- rendered lines of prior actions/observations
 */
export function decisionPrompt(context, transcript) {
  const files = context.files.map((f) => f.path).join(", ");
  return {
    system: SYSTEM,
    json: true,
    prompt: [
      `GOAL: Decide the next action to assess merge-readiness of PR #${context.pr.number} "${context.pr.title}".`,
      "",
      "TOOLS:",
      toolCatalog(),
      "",
      `Files in this PR: ${files}`,
      "",
      "TRANSCRIPT SO FAR:",
      transcript.length ? transcript.join("\n") : "(nothing yet)",
      "",
      'Decide the next action. Reply with ONLY JSON:',
      '{"thought":"brief reasoning","action":{"tool":"<tool_name>","args":{...}}}',
      "When you have enough to judge merge-readiness, use the finalize_review tool.",
    ].join("\n"),
  };
}

/**
 * Parse the model's JSON decision into { thought, tool, args }.
 * Fails soft: returns null if it cannot be understood (loop treats as a no-op).
 */
export function parseDecision(text) {
  const json = extractJson(text);
  if (!json || !json.action || !json.action.tool) return null;
  return {
    thought: String(json.thought ?? ""),
    tool: String(json.action.tool),
    args: json.action.args ?? {},
  };
}

// Tolerant JSON extraction (fences / surrounding prose).
function extractJson(text = "") {
  if (typeof text !== "string") return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const a = candidate.indexOf("{");
  const b = candidate.lastIndexOf("}");
  const slice = a !== -1 && b > a ? candidate.slice(a, b + 1) : candidate;
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}
