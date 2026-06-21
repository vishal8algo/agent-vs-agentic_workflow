// prompts.js — the REAL prompts for the fixed workflow's analysis stages.
//
// These are bounded, per-stage prompts (the "controlled LLM usage" the spec
// asks for). Each analysis stage gets:
//   - the PR identity + a capped diff view
//   - the risk summary produced by stage 3 (the prompt CHAIN)
// and is told to answer in strict JSON so we can parse findings deterministically.
//
// Note: the mock provider returns canned sample findings; a real model (Gemini)
// will actually read these prompts. The prompt text is written for the real model.

const SYSTEM = `You are a senior software engineer doing a focused, evidence-based pull-request review.
Be precise and conservative: only report issues you can justify from the diff.
When you cite evidence, reference a file path (and line/hunk if visible).`;

const JSON_CONTRACT = `Respond with ONLY a JSON object, no prose, in exactly this shape:
{"findings":[{"severity":"critical|high|medium|low|info","title":"short title","detail":"why it matters","evidence":"path or path:line"}]}
If you find nothing for this dimension, return {"findings":[]}.`;

/** Stage 3: produce a short risk summary that later stages consume (prose, not findings). */
export function riskPrompt(context, diffView) {
  return {
    system: SYSTEM,
    json: false,
    prompt: [
      `PR #${context.pr.number}: ${context.pr.title}`,
      context.pr.description ? `Description: ${context.pr.description}` : "",
      `Changed files (${context.stats.filesChanged}, +${context.stats.additions}/-${context.stats.deletions}):`,
      diffView,
      "",
      "Task: In 3-5 short bullet points, identify the highest-risk areas of this PR a reviewer should focus on. Plain text, no JSON.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

/**
 * Stages 4-6: analyze one or more dimensions and return JSON findings.
 * @param {object} stage   - { label, dimensions: string[] }
 * @param {object} context
 * @param {string} riskSummary - output of the risk stage (the chain link)
 * @param {string} diffView
 */
export function analysisPrompt(stage, context, riskSummary, diffView) {
  return {
    system: SYSTEM,
    json: true,
    // Marker line lets the deterministic mock vary its canned findings per stage.
    prompt: [
      `Dimension: ${stage.dimensions.join(", ")}`,
      `PR #${context.pr.number}: ${context.pr.title}`,
      "",
      "Risk summary from the earlier stage (focus your review here):",
      riskSummary || "(none provided)",
      "",
      `Changed files (capped):`,
      diffView,
      "",
      `Task: Review ONLY for ${stage.label}. ${JSON_CONTRACT}`,
    ].join("\n"),
  };
}
