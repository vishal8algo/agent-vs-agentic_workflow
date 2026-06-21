// tracing.js — Langfuse observability at the provider seam (spec 05).
//
// The whole point: instrument in ONE place. startRun() opens a Langfuse trace
// for a review run and returns a tracer whose .wrap(provider) returns a
// provider with the SAME .complete() contract — so each model call becomes a
// Langfuse "generation" (input, output, tokens, latency, cost) with zero
// changes to the reviewers' logic.
//
// Graceful by design: if Langfuse keys are absent, startRun() returns a no-op
// tracer and everything still runs offline. Export failures never crash a run.

import { Langfuse } from "langfuse";
import { priceFor } from "../providers/pricing.js";

let client = null;

/** True when Langfuse credentials are present. */
export function tracingEnabled() {
  return Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

function getClient() {
  if (!tracingEnabled()) return null;
  if (!client) {
    client = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL || process.env.LANGFUSE_HOST,
    });
  }
  return client;
}

/** Flush pending events. Call once before the process exits. */
export async function shutdownTracing() {
  if (client) {
    try {
      await client.shutdownAsync();
    } catch {
      /* never let trace flushing fail the run */
    }
  }
}

const NOOP_TRACER = {
  enabled: false,
  wrap: (provider) => provider,
  toolSpan: () => {},
  finish: () => {},
  score: () => {},
};

/**
 * Begin a traced review run.
 * @param {object} opts - { mode, providerName, model, pr, fixture, sessionId }
 * @returns tracer with wrap(), toolSpan(), finish()
 */
export function startRun(opts = {}) {
  const lf = getClient();
  if (!lf) return NOOP_TRACER;

  let trace;
  try {
    trace = lf.trace({
      name: `review:${opts.mode}`,
      sessionId: opts.sessionId,
      metadata: {
        mode: opts.mode,
        provider: opts.providerName,
        model: opts.model,
        prNumber: opts.pr?.number,
        prTitle: opts.pr?.title,
        fixture: opts.fixture,
      },
      input: { pr: opts.pr?.number, title: opts.pr?.title },
    });
  } catch {
    return NOOP_TRACER;
  }

  return {
    enabled: true,

    // Return a provider that records each complete() as a generation.
    wrap(provider) {
      return {
        name: provider.name,
        model: provider.model,
        async complete(req) {
          let gen;
          try {
            gen = trace.generation({
              name: "llm.complete",
              model: provider.model,
              input: { system: req.system, prompt: req.prompt },
              modelParameters: { json: Boolean(req.json) },
            });
          } catch {
            /* if tracing setup fails, still make the real call */
          }
          const res = await provider.complete(req);
          try {
            gen?.end({ output: res.text, usage: usageWithCost(provider.model, res.usage) });
          } catch {
            /* swallow trace errors */
          }
          return res;
        },
      };
    },

    // Record one agent tool call as a nested span.
    toolSpan(name, input, output) {
      try {
        const s = trace.span({ name: `tool:${name}`, input, output });
        s.end();
      } catch {
        /* ignore */
      }
    },

    // Attach the run's final verdict/finding count to the trace.
    finish(result) {
      try {
        trace.update({
          output: { status: result?.status, findings: result?.findings?.length ?? 0 },
        });
      } catch {
        /* ignore */
      }
    },

    // Attach an evaluation score (e.g. the LLM judge) to this run's trace.
    score({ name = "judge", value, comment } = {}) {
      try {
        trace.score({ name, value, comment });
      } catch {
        /* ignore */
      }
    },
  };
}

// Build a Langfuse usage object including token counts AND explicit cost, so
// spend shows even for models Langfuse doesn't price natively (e.g. the mock).
function usageWithCost(model, usage = {}) {
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  const price = priceFor(model);
  const inputCost = (input / 1_000_000) * price.input;
  const outputCost = (output / 1_000_000) * price.output;
  return {
    input,
    output,
    total: input + output,
    unit: "TOKENS",
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}
