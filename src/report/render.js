// render.js — turn ReviewResult objects into markdown.
//
// Pure functions: (data) -> markdown string. No filesystem here (that's
// write.js). Keeping rendering pure makes the output easy to snapshot-test.

import { SEVERITY } from "../review/result.js";
import { computeComparison } from "./compare.js";

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

/** Render the analytical side-by-side comparison report (spec 4). */
export function renderComparison(fixed, agent, context) {
  const cmp = computeComparison(fixed, agent);
  const c = cmp.cost;

  return [
    `# Comparison — PR #${context.pr.number}`,
    "",
    `**PR:** ${context.pr.title}`,
    "",
    "Both modes reviewed the **same** normalized PR context, so every difference",
    "below comes from *how* each approach works — not from different inputs.",
    "",
    "Underlying reports: [fixed-review.md](fixed-review.md) · [agent-review.md](agent-review.md)",
    "",
    "## Outcome & agreement",
    "",
    "| | Fixed workflow | Autonomous agent |",
    "| --- | --- | --- |",
    `| Merge-readiness | \`${fixed.status}\` | \`${agent.status}\` |`,
    `| Findings | ${cmp.findings.fixedTotal} | ${cmp.findings.agentTotal} |`,
    `| Worst severity | ${cmp.findings.fixedTopSeverity ?? "—"} | ${cmp.findings.agentTopSeverity ?? "—"} |`,
    "",
    cmp.agreement.agree
      ? `**Agreement:** both reached the same verdict (\`${cmp.agreement.fixedStatus}\`).`
      : `**Disagreement:** fixed → \`${cmp.agreement.fixedStatus}\`, agent → \`${cmp.agreement.agentStatus}\`.`,
    "",
    "## Findings, side by side",
    "",
    "| Mode | crit | high | med | low | info |",
    "| --- | --- | --- | --- | --- | --- |",
    severityRow("Fixed", cmp.findings.fixedCounts),
    severityRow("Agent", cmp.findings.agentCounts),
    "",
    "_Findings are compared structurally (counts + severity). Semantic overlap" +
      " detection — 'did autonomy surface a genuinely new issue?' — needs the" +
      " real model and is a later enhancement._",
    "",
    "## Operational comparison",
    "",
    "| Metric | Fixed | Agent | Δ (agent vs fixed) |",
    "| --- | --- | --- | --- |",
    metricRow("Latency (ms)", ms(c.elapsedMs.fixed), ms(c.elapsedMs.agent), c.elapsedMs),
    metricRow("LLM calls", c.llmCalls.fixed, c.llmCalls.agent, c.llmCalls),
    metricRow("Tool calls", c.toolCalls.fixed, c.toolCalls.agent, c.toolCalls),
    metricRow("Steps / iterations", c.steps.fixed, c.steps.agent, c.steps),
    metricRow("Input tokens", c.inputTokens.fixed, c.inputTokens.agent, c.inputTokens),
    metricRow("Output tokens", c.outputTokens.fixed, c.outputTokens.agent, c.outputTokens),
    metricRow("Est. cost (USD)", c.estCostUsd.fixed, c.estCostUsd.agent, c.estCostUsd),
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
    "## When the fixed workflow is better",
    "",
    bulletList([
      "You need **predictable cost and latency** — the stage count is fixed.",
      "The review must be **auditable**: same steps, same order, every run.",
      "You want **uniform coverage** — every dimension is reviewed whether or not the model thinks it matters.",
    ]),
    "",
    "## When the autonomous agent is better",
    "",
    bulletList([
      "PRs **vary widely** and a fixed checklist would waste effort or miss the point.",
      "**Targeted investigation** pays off — the agent reads only what looks relevant.",
      "You value **adaptivity** over strict repeatability.",
    ]),
    "",
    "## Cost of extra autonomy",
    "",
    cmp.autonomyVerdict,
    "",
    bulletList([
      `Round-trips: ${c.llmCalls.fixed} → ${c.llmCalls.agent} model calls${pctNote(c.llmCalls.deltaPct)}.`,
      `Input tokens: ${c.inputTokens.fixed} → ${c.inputTokens.agent}${pctNote(c.inputTokens.deltaPct)}.`,
      `Extra moving parts: ${c.toolCalls.agent} tool call(s) + a decision trace to audit.`,
    ]),
    "",
    "## Recommendation for training discussion",
    "",
    "Use the fixed workflow as the **default** for routine, comparable reviews;" +
      " reach for the agent when a PR is unusual enough that adaptive digging" +
      " earns back its extra round-trips and reduced predictability. Read the two" +
      " linked reports alongside this one to see *how* each reached its verdict.",
    "",
    fixed.metrics.model === "mock-1"
      ? "_Note: run on the deterministic mock provider — findings are labelled samples." +
        " Numbers are real; the review reasoning becomes real once Gemini is wired._"
      : "",
    "",
  ].join("\n");
}

function severityRow(label, counts = {}) {
  return `| ${label} | ${counts.critical ?? 0} | ${counts.high ?? 0} | ${counts.medium ?? 0} | ${counts.low ?? 0} | ${counts.info ?? 0} |`;
}

function metricRow(label, fixedVal, agentVal, pair) {
  return `| ${label} | ${fixedVal} | ${agentVal} | ${formatDelta(pair)} |`;
}

function formatDelta(pair) {
  const sign = pair.delta > 0 ? "+" : "";
  const pct = pair.deltaPct === null ? "" : ` (${sign}${pair.deltaPct}%)`;
  return `${sign}${round(pair.delta)}${pct}`;
}

function pctNote(pct) {
  if (pct === null) return "";
  return pct === 0 ? " (no change)" : ` (${pct > 0 ? "+" : ""}${pct}%)`;
}

function round(n) {
  // Whole numbers for sizeable values (ms, tokens, calls); keep small decimals
  // for tiny ones (USD cost deltas).
  if (Math.abs(n) >= 1) return Math.round(n);
  return Math.round(n * 1e6) / 1e6;
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
