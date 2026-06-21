// compare.js — turn two ReviewResults into a structured comparison.
//
// This is the analytical core of spec 4: it does not render anything, it just
// computes the facts the comparison report needs — did the verdicts agree, how
// did the findings differ, and what did the extra autonomy cost. Pure function,
// easy to test. render.js turns this object into markdown.

/**
 * @param {object} fixed - fixed-mode ReviewResult
 * @param {object} agent - agent-mode ReviewResult
 */
export function computeComparison(fixed, agent) {
  const fm = fixed.metrics;
  const am = agent.metrics;

  const agreement = {
    agree: fixed.status === agent.status,
    fixedStatus: fixed.status,
    agentStatus: agent.status,
  };

  const findings = {
    fixedTotal: fixed.findings.length,
    agentTotal: agent.findings.length,
    fixedCounts: fixed.counts ?? {},
    agentCounts: agent.counts ?? {},
    // Severity of the worst finding each mode raised (drives the verdict).
    fixedTopSeverity: topSeverity(fixed.findings),
    agentTopSeverity: topSeverity(agent.findings),
  };

  const cost = {
    elapsedMs: pair(fm.elapsedMs, am.elapsedMs),
    llmCalls: pair(fm.llmCalls, am.llmCalls),
    toolCalls: pair(fm.toolCalls, am.toolCalls),
    steps: pair(fm.steps, am.steps),
    inputTokens: pair(fm.tokens.input, am.tokens.input),
    outputTokens: pair(fm.tokens.output, am.tokens.output),
    estCostUsd: pair(fm.estCostUsd, am.estCostUsd),
  };

  return { agreement, findings, cost, autonomyVerdict: autonomyVerdict(agreement, cost) };
}

/** One metric for both modes, with agent-vs-fixed delta and percent. */
function pair(fixedVal, agentVal) {
  const delta = agentVal - fixedVal;
  const deltaPct = fixedVal === 0 ? null : Math.round((delta / fixedVal) * 100);
  return { fixed: fixedVal, agent: agentVal, delta, deltaPct };
}

const SEVERITY_RANK = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

function topSeverity(findings = []) {
  let best = null;
  let bestRank = 0;
  for (const f of findings) {
    const r = SEVERITY_RANK[f.severity] ?? 0;
    if (r > bestRank) {
      bestRank = r;
      best = f.severity;
    }
  }
  return best;
}

/** Plain-English "cost of extra autonomy" sentence, derived from the numbers. */
function autonomyVerdict(agreement, cost) {
  const verdictPart = agreement.agree
    ? `Both approaches reached the same verdict (\`${agreement.fixedStatus}\`).`
    : `The approaches disagreed: fixed said \`${agreement.fixedStatus}\`, agent said \`${agreement.agentStatus}\`.`;

  const calls = describe(cost.llmCalls.deltaPct, "model round-trips");
  const tokens = describe(cost.inputTokens.deltaPct, "input tokens");
  const tools = cost.toolCalls.agent > 0 ? `${cost.toolCalls.agent} tool call(s)` : "no tools";

  return (
    `${verdictPart} For this PR the agent used ${calls} and ${tokens} than the fixed ` +
    `workflow, plus ${tools} and its own decision trace to follow. ` +
    `That is the practical cost (or saving) of letting the model drive.`
  );
}

function describe(pct, label) {
  if (pct === null) return `a different number of ${label}`;
  if (pct === 0) return `the same number of ${label}`;
  return `${Math.abs(pct)}% ${pct > 0 ? "more" : "fewer"} ${label}`;
}
