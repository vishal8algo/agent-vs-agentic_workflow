#!/usr/bin/env node
// eval.js — cost-per-correct-answer evaluation (spec 06).
//
// For every PR fixture in the set, runs BOTH review modes, has an LLM judge
// score each review (reference-free), then reports cost-per-correct-answer per
// mode = total review cost / number of reviews judged correct (score >= bar).
//
// Reviews are traced to Langfuse and the judge score is attached to each run's
// trace. The judge's cost is tracked separately and is NOT in the numerator.
//
// Usage:
//   node scripts/eval.js [--fixtures-dir fixtures/eval] [--provider mock|gemini]
//                        [--judge-model gemini-2.5-pro] [--threshold 0.7]
//                        [--out reports/eval.md] [--no-trace-remote]

import { readdir, mkdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import { loadContext } from "../src/context/loadContext.js";
import { createProvider } from "../src/providers/llm.js";
import { priceFor } from "../src/providers/pricing.js";
import { Metrics } from "../src/metrics.js";
import { fixedReview } from "../src/workflow/fixedReview.js";
import { agentReview } from "../src/agent/agentReview.js";
import { judgeReview } from "../src/eval/judge.js";
import { startRun, tracingEnabled, shutdownTracing } from "../src/observability/tracing.js";

try {
  process.loadEnvFile(".env");
} catch {
  /* no .env — fine for mock */
}

async function main(argv) {
  const args = parseArgs(argv);
  const providerName = args.provider ?? "mock";
  const judgeModel = args["judge-model"] ?? "gemini-2.5-pro";
  const threshold = Number(args.threshold ?? 0.7);
  const outPath = args.out ?? "reports/eval.md";
  const fixturesDir = args["fixtures-dir"] ?? "fixtures/eval";

  const fixtures = await collectFixtures(fixturesDir);
  if (fixtures.length === 0) {
    console.error(`No fixtures found in ${fixturesDir} (and no fallback). Capture some first.`);
    process.exit(1);
  }

  const useTrace = !args["no-trace-remote"] && tracingEnabled();
  const sessionId = randomUUID();
  console.log(
    `Eval: ${fixtures.length} PR(s) x 2 modes | provider=${providerName} | judge=${providerName === "gemini" ? judgeModel : "mock"} | bar=${threshold}` +
      (useTrace ? ` | tracing session ${sessionId}` : "")
  );

  const agg = { fixed: newAgg(), agent: newAgg() };
  const rows = [];

  for (const fx of fixtures) {
    const ctx = await loadContext(fx);
    for (const mode of ["fixed", "agent"]) {
      const provider = createProvider(providerName, { model: args.model });
      const tracer = useTrace
        ? startRun({ mode, providerName, model: provider.model, pr: ctx.pr, fixture: fx, sessionId })
        : null;
      const tp = tracer ? tracer.wrap(provider) : provider;

      const metrics = new Metrics({
        mode,
        model: provider.model,
        pricePerMTokens: priceFor(provider.model),
      }).start();

      const review =
        mode === "fixed"
          ? await fixedReview(ctx, tp, metrics)
          : await agentReview(ctx, tp, metrics, { tracer });
      metrics.stop();
      review.metrics = metrics.toJSON();
      tracer?.finish(review);

      // Judge (its own provider/model; mock when reviews are on mock).
      const judgeProvider = createProvider(providerName, {
        model: providerName === "gemini" ? judgeModel : undefined,
      });
      const j = await judgeReview(ctx, review, judgeProvider);
      const correct = j.score >= threshold;
      tracer?.score({ name: "judge", value: j.score, comment: j.justification });

      const a = agg[mode];
      a.runs += 1;
      a.cost += review.metrics.estCostUsd;
      a.judgeCost += costOf(judgeProvider.model, j.usage);
      if (correct) a.correct += 1;

      rows.push({
        pr: ctx.pr.number,
        mode,
        verdict: review.status,
        score: j.score,
        correct,
        cost: review.metrics.estCostUsd,
      });
      console.log(
        `  PR#${ctx.pr.number} ${mode.padEnd(5)} verdict=${review.status} score=${j.score.toFixed(2)} ${correct ? "OK" : "x"} cost=$${review.metrics.estCostUsd.toFixed(6)}`
      );
    }
  }

  await shutdownTracing();

  const report = renderEval({ rows, agg, providerName, judgeModel, threshold, fixtures });
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, report, "utf8");
  console.log(`\nWrote ${outPath}`);
  printSummary(agg, threshold);
}

function newAgg() {
  return { runs: 0, correct: 0, cost: 0, judgeCost: 0 };
}

function costOf(model, usage = {}) {
  const p = priceFor(model);
  return (
    ((usage.inputTokens ?? 0) / 1e6) * p.input + ((usage.outputTokens ?? 0) / 1e6) * p.output
  );
}

function costPerCorrect(a) {
  return a.correct > 0 ? a.cost / a.correct : null;
}

async function collectFixtures(dir) {
  let entries = [];
  try {
    const names = await readdir(dir);
    entries = names.filter((n) => n.endsWith(".json")).map((n) => join(dir, n));
  } catch {
    /* dir missing */
  }
  if (entries.length === 0) {
    // Fall back to the main sample fixture so the harness is always runnable.
    try {
      await stat("fixtures/sample-pr.json");
      entries = ["fixtures/sample-pr.json"];
    } catch {
      /* none */
    }
  }
  return entries.sort();
}

function renderEval({ rows, agg, providerName, judgeModel, threshold, fixtures }) {
  const cpc = (a) => {
    const v = costPerCorrect(a);
    return v === null ? "n/a (0 correct)" : `$${v.toFixed(6)}`;
  };
  return [
    `# Evaluation — Cost per Correct Answer`,
    "",
    `Provider: **${providerName}** · Judge: **${providerName === "gemini" ? judgeModel : "mock"}** · ` +
      `Correct bar: **score ≥ ${threshold}** · PRs: **${fixtures.length}**`,
    "",
    "## Cost per correct answer",
    "",
    "| Mode | Correct / runs | Total review cost | Cost per correct | Judge cost (separate) |",
    "| --- | --- | --- | --- | --- |",
    `| Fixed | ${agg.fixed.correct}/${agg.fixed.runs} | $${agg.fixed.cost.toFixed(6)} | ${cpc(agg.fixed)} | $${agg.fixed.judgeCost.toFixed(6)} |`,
    `| Agent | ${agg.agent.correct}/${agg.agent.runs} | $${agg.agent.cost.toFixed(6)} | ${cpc(agg.agent)} | $${agg.agent.judgeCost.toFixed(6)} |`,
    "",
    "## Per-run detail",
    "",
    "| PR | Mode | Verdict | Judge score | Correct | Review cost |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (r) =>
        `| #${r.pr} | ${r.mode} | \`${r.verdict}\` | ${r.score.toFixed(2)} | ${r.correct ? "yes" : "no"} | $${r.cost.toFixed(6)} |`
    ),
    "",
    "## Method & limitations",
    "",
    "- **Reference-free LLM-as-judge**: the judge rates whether each review's verdict and findings are justified by the diff. There is no gold answer — the judge is an *approximate* oracle and can be wrong.",
    "- **Self-preference bias**: when the same model family produces and judges a review, scores may be inflated. We mitigate by judging with a stronger/distinct tier (e.g. gemini-2.5-pro) and disclosing it here.",
    "- **Cost per correct** = total review cost / reviews scoring ≥ the bar. Judge cost is reported separately and excluded from the numerator.",
    "- Mock runs are deterministic samples, not real reasoning.",
    "",
  ].join("\n");
}

function printSummary(agg, threshold) {
  const f = costPerCorrect(agg.fixed);
  const a = costPerCorrect(agg.agent);
  console.log(`\nCost per correct answer (bar ${threshold}):`);
  console.log(`  Fixed: ${f === null ? "n/a" : "$" + f.toFixed(6)}  (${agg.fixed.correct}/${agg.fixed.runs} correct)`);
  console.log(`  Agent: ${a === null ? "n/a" : "$" + a.toFixed(6)}  (${agg.agent.correct}/${agg.agent.runs} correct)`);
}

function dirname(p) {
  const i = p.lastIndexOf("/");
  return i === -1 ? "." : p.slice(0, i);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) out[key] = true;
      else (out[key] = next), i++;
    } else out._.push(a);
  }
  return out;
}

main(process.argv.slice(2)).catch((err) => {
  console.error("Eval failed:", err);
  process.exit(1);
});
