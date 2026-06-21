// render.js — turn ReviewResult objects into markdown.
//
// Pure functions: (data) -> markdown string. No filesystem here (that's
// write.js). Keeping rendering pure makes the output easy to snapshot-test.

import { SEVERITY } from "../review/result.js";

const SEVERITY_ORDER = [
  SEVERITY.CRITICAL,
  SEVERITY.HIGH,
  SEVERITY.MEDIUM,
  SEVERITY.LOW,
  SEVERITY.INFO,
];

/** Render one review (fixed or agent) into a full markdown report. */
export function renderReviewReport(result, context) {
  const isAgent = result.mode === "agent";
  const traceHeading = isAgent ? "Action / Tool Trace" : "Stages Run (in order)";

  return [
    `# ${titleCase(result.mode)} Review — PR #${context.pr.number}`,
    "",
    `**PR:** ${context.pr.title}`,
    `**Repo:** ${context.pr.repo || "(unknown)"}`,
    `**Author:** ${context.pr.author}`,
    `**Review method:** ${result.method}`,
    `**Merge-readiness:** \`${result.status}\``,
    "",
    "## Summary",
    "",
    result.summary,
    "",
    `## ${traceHeading}`,
    "",
    numberedList(result.stages),
    "",
    "## Findings",
    "",
    renderFindingsSummary(result),
    "",
    renderFindings(result.findings),
    "",
    "## Limitations",
    "",
    bulletList(result.limitations),
    "",
    "## Metrics",
    "",
    renderMetrics(result.metrics),
    "",
  ].join("\n");
}

/** Render the side-by-side comparison report. */
export function renderComparison(fixed, agent, context) {
  const f = fixed.metrics;
  const a = agent.metrics;
  return [
    `# Comparison — PR #${context.pr.number}`,
    "",
    `**PR:** ${context.pr.title}`,
    "",
    "Both modes reviewed the **same** normalized PR context. Differences below",
    "come only from *how* each approach works, not from different inputs.",
    "",
    "## Outcome",
    "",
    "| | Fixed workflow | Autonomous agent |",
    "| --- | --- | --- |",
    `| Merge-readiness | \`${fixed.status}\` | \`${agent.status}\` |`,
    `| Findings | ${fixed.findings.length} | ${agent.findings.length} |`,
    "",
    "## Operational comparison",
    "",
    "| Metric | Fixed workflow | Autonomous agent |",
    "| --- | --- | --- |",
    `| Latency (ms) | ${ms(f.elapsedMs)} | ${ms(a.elapsedMs)} |`,
    `| LLM calls | ${f.llmCalls} | ${a.llmCalls} |`,
    `| Tool calls | ${f.toolCalls} | ${a.toolCalls} |`,
    `| Steps / iterations | ${f.steps} | ${a.steps} |`,
    `| Tokens (in/out) | ${f.tokens.input}/${f.tokens.output} | ${a.tokens.input}/${a.tokens.output} |`,
    `| Est. cost (USD) | ${f.estCostUsd} | ${a.estCostUsd} |`,
    "",
    "## Qualitative comparison",
    "",
    "| Dimension | Fixed workflow | Autonomous agent |",
    "| --- | --- | --- |",
    "| Control flow | Predefined stages, fixed order | Model chooses next action in a bounded loop |",
    "| Predictability | High — same path every run | Lower — path varies with the PR |",
    "| Debuggability | High — stage in, stage out | Needs the action trace to follow decisions |",
    "| Adaptivity | Low — cannot deviate | High — can dig where it matters |",
    "",
    "## When to prefer which",
    "",
    bulletList([
      "Prefer the **fixed workflow** when you need predictable cost/latency and auditable steps.",
      "Prefer the **autonomous agent** when PRs vary widely and adaptive investigation pays off.",
    ]),
    "",
    "## Note",
    "",
    "Spec-1 stub: numbers reflect scaffolding, not real review reasoning. " +
      "They become meaningful once specs 2 & 3 and the Gemini provider land.",
    "",
  ].join("\n");
}

// ---- helpers ----

function renderFindingsSummary(result) {
  const c = result.counts;
  if (!c) return "";
  return (
    `**${result.findings.length} finding(s):** ` +
    `${c.critical} critical · ${c.high} high · ${c.medium} medium · ` +
    `${c.low} low · ${c.info} info`
  );
}

function renderFindings(findings) {
  if (!findings || findings.length === 0) {
    return "_No findings recorded._";
  }
  const out = [];
  for (const sev of SEVERITY_ORDER) {
    const group = findings.filter((x) => x.severity === sev);
    if (group.length === 0) continue;
    out.push(`### ${titleCase(sev)}`, "");
    for (const x of group) {
      out.push(`- **${x.title}** — ${x.detail}${x.evidence ? ` _(evidence: ${x.evidence})_` : ""}`);
    }
    out.push("");
  }
  return out.join("\n").trim();
}

function renderMetrics(m) {
  return [
    "| Metric | Value |",
    "| --- | --- |",
    `| Latency (ms) | ${ms(m.elapsedMs)} |`,
    `| LLM calls | ${m.llmCalls} |`,
    `| Tool calls | ${m.toolCalls} |`,
    `| Steps | ${m.steps} |`,
    `| Tokens (in/out) | ${m.tokens.input}/${m.tokens.output} |`,
    `| Est. cost (USD) | ${m.estCostUsd} |`,
    `| Model | ${m.model} |`,
  ].join("\n");
}

function numberedList(items) {
  if (!items || items.length === 0) return "_none_";
  return items.map((s, i) => `${i + 1}. ${s}`).join("\n");
}

function bulletList(items) {
  if (!items || items.length === 0) return "_none_";
  return items.map((s) => `- ${s}`).join("\n");
}

function titleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ms(n) {
  return Math.round(n);
}
