// judge.js — LLM-as-judge for review quality (spec 06).
//
// Reference-free: the judge reads the PR diff AND a completed review, then
// rates whether the review's verdict and findings are JUSTIFIED by the diff.
// There is no gold answer; the judge IS the (approximate) oracle. That
// limitation is real and is disclosed in the eval report.
//
// Output is a single 0..1 score + justification. "Correct" is decided by a
// threshold (default 0.7) in the eval runner, not here — so the bar stays
// tunable and transparent.

import { buildDiffView } from "../util/diffBudget.js";

const SYSTEM = `You are a strict meta-reviewer grading the QUALITY of a pull-request review.
You judge whether the review's verdict and findings are well-justified by the
actual diff: accurate, relevant, not hallucinated, and neither over- nor
under-stated. You are not lenient. Reply with JSON only.`;

/**
 * Build the judge prompt for one review result.
 * @param {object} context - normalized PRContext
 * @param {object} review  - a ReviewResult (fixed or agent)
 */
export function judgePrompt(context, review) {
  const { text: diffView } = buildDiffView(context.files);
  const findingsText = review.findings.length
    ? review.findings
        .map((f, i) => `${i + 1}. [${f.severity}] ${f.title} — ${f.detail} (evidence: ${f.evidence || "none"})`)
        .join("\n")
    : "(no findings)";

  return {
    system: SYSTEM,
    json: true,
    prompt: [
      `PR #${context.pr.number}: ${context.pr.title}`,
      "",
      "DIFF (capped):",
      diffView,
      "",
      "REVIEW UNDER EVALUATION:",
      `Method: ${review.method}`,
      `Verdict: ${review.status}`,
      `Findings:`,
      findingsText,
      "",
      "Grade this review's quality from 0.0 to 1.0, where:",
      "- 1.0 = verdict and findings are accurate, well-evidenced, and appropriately scoped",
      "- 0.5 = partially right but misses important issues or overstates minor ones",
      "- 0.0 = wrong verdict, hallucinated or irrelevant findings",
      "A well-justified 'needs human review' or 'blocked' can score high if the diff warrants caution.",
      "",
      'Reply with ONLY: {"score": <0..1>, "justification": "<one or two sentences>"}',
    ].join("\n"),
  };
}

/**
 * Run the judge over a review and return a normalized verdict.
 * @returns {Promise<{score:number, justification:string}>}
 */
export async function judgeReview(context, review, provider) {
  const res = await provider.complete(judgePrompt(context, review));
  const parsed = parseScore(res.text);
  return { ...parsed, usage: res.usage, model: provider.model };
}

function parseScore(text = "") {
  const json = extractJson(text);
  let score = Number(json?.score);
  if (!Number.isFinite(score)) score = 0; // unparseable -> worst case
  score = Math.max(0, Math.min(1, score));
  return { score, justification: String(json?.justification ?? "(no justification)") };
}

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
