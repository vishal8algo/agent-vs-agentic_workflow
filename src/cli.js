#!/usr/bin/env node
// cli.js — entry point for the PR review demo.
//
//   node src/cli.js review --fixture fixtures/sample-pr.json [options]
//
// Responsibilities, in order:
//   1. parse args
//   2. load ONE normalized PR context from the fixture
//   3. run the selected mode(s) against that SAME context
//   4. write the markdown reports
//   5. exit with the contract's status codes
//
// Exit codes (docs/api-contract.md):
//   0 ok | 1 bad input/config | 2 data retrieval | 3 provider | 4 report gen

import { loadContext, InputError } from "./context/loadContext.js";
import { createProvider, ProviderError } from "./providers/llm.js";
import { priceFor } from "./providers/pricing.js";
import { Metrics } from "./metrics.js";
import { startRun, tracingEnabled, shutdownTracing } from "./observability/tracing.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { fixedReview } from "./workflow/fixedReview.js";
import { agentReview } from "./agent/agentReview.js";
import { writeReports } from "./report/write.js";

const USAGE = `pr-review-demo — compare a fixed workflow vs an autonomous agent on a PR

Usage:
  node src/cli.js review --fixture <path> [options]

Options:
  --mode <both|fixed|agent>   which reviewer(s) to run     (default: both)
  --fixture <path>            normalized PR fixture JSON    (required)
  --out <dir>                 report output directory       (default: reports)
  --provider <mock|gemini>    LLM provider                  (default: mock)
  --model <name>              model name for the provider
  --max-agent-steps <n>       agent loop guardrail          (default: 8)
  --trace                     also write raw prompts/responses to reports/traces/
  --no-trace-remote           disable Langfuse tracing for this run
  --verbose                   print progress
  --help                      show this help
`;

async function main(argv) {
  // Load .env (GEMINI_API_KEY, GEMINI_MODEL, ...) if present. Harmless if absent.
  try {
    process.loadEnvFile(".env");
  } catch {
    /* no .env — fine for mock runs */
  }

  const args = parseArgs(argv);

  if (args.help || args._[0] !== "review") {
    process.stdout.write(USAGE);
    return args.help ? 0 : 1;
  }

  if (!args.fixture) {
    process.stderr.write("Error: --fixture <path> is required.\n\n" + USAGE);
    return 1;
  }

  const mode = args.mode ?? "both";
  if (!["both", "fixed", "agent"].includes(mode)) {
    process.stderr.write(`Error: invalid --mode "${mode}".\n`);
    return 1;
  }
  const outDir = args.out ?? "reports";
  const providerName = args.provider ?? "mock";
  const log = args.verbose ? (m) => process.stderr.write(m + "\n") : () => {};

  // Observability (spec 05): trace to Langfuse when keys exist, unless disabled.
  const useTrace = !args["no-trace-remote"] && tracingEnabled();
  const sessionId = randomUUID();
  if (useTrace) log(`Tracing to Langfuse (session ${sessionId}).`);

  // 2. Load the shared context.
  let ctx;
  try {
    ctx = await loadContext(args.fixture);
    log(`Loaded PR #${ctx.pr.number} "${ctx.pr.title}" (${ctx.stats.filesChanged} files)`);
  } catch (err) {
    if (err instanceof InputError) {
      process.stderr.write(`Input error: ${err.message}\n`);
      return 1;
    }
    process.stderr.write(`Data error: ${err.message}\n`);
    return 2;
  }

  // 3. Run the selected mode(s) against that same context.
  const results = {};
  try {
    if (mode === "both" || mode === "fixed") {
      log("Running fixed workflow...");
      const provider = createProvider(providerName, { model: args.model });
      const tracer = useTrace
        ? startRun({ mode: "fixed", providerName, model: provider.model, pr: ctx.pr, fixture: args.fixture, sessionId })
        : null;
      const metrics = new Metrics({
        mode: "fixed",
        model: provider.model,
        pricePerMTokens: priceFor(provider.model),
      }).start();
      results.fixed = await fixedReview(ctx, tracer ? tracer.wrap(provider) : provider, metrics);
      metrics.stop();
      results.fixed.metrics = metrics.toJSON();
      tracer?.finish(results.fixed);
    }
    if (mode === "both" || mode === "agent") {
      log("Running autonomous agent...");
      const provider = createProvider(providerName, { model: args.model });
      const tracer = useTrace
        ? startRun({ mode: "agent", providerName, model: provider.model, pr: ctx.pr, fixture: args.fixture, sessionId })
        : null;
      const metrics = new Metrics({
        mode: "agent",
        model: provider.model,
        pricePerMTokens: priceFor(provider.model),
      }).start();
      const maxIterations = Number(args["max-agent-steps"] ?? 8);
      results.agent = await agentReview(ctx, tracer ? tracer.wrap(provider) : provider, metrics, {
        maxIterations,
        tracer,
      });
      metrics.stop();
      results.agent.metrics = metrics.toJSON();
      tracer?.finish(results.agent);
    }
  } catch (err) {
    await shutdownTracing();
    if (err instanceof ProviderError) {
      process.stderr.write(`Provider error: ${err.message}\n`);
      return 3;
    }
    throw err;
  }

  // 4. Write reports.
  try {
    const written = await writeReports(outDir, ctx, results);
    for (const p of written) process.stdout.write(`Wrote ${p}\n`);

    // Optional: raw prompt/response traces (docs/open-questions.md Q08).
    if (args.trace) {
      const traceDir = join(outDir, "traces");
      await mkdir(traceDir, { recursive: true });
      for (const m of ["fixed", "agent"]) {
        if (results[m]?.trace) {
          const p = join(traceDir, `${m}-trace.json`);
          await writeFile(p, JSON.stringify(results[m].trace, null, 2) + "\n", "utf8");
          process.stdout.write(`Wrote ${p}\n`);
        }
      }
    }
  } catch (err) {
    await shutdownTracing();
    process.stderr.write(`Report generation failed: ${err.message}\n`);
    return 4;
  }

  await shutdownTracing(); // flush pending Langfuse events before exit
  return 0;
}

/** Minimal flag parser: --key value, --bool, and positional args in _. */
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        out[key] = true; // boolean flag
      } else {
        out[key] = next;
        i++;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`Unexpected error: ${err.stack ?? err}\n`);
    process.exit(1);
  });
