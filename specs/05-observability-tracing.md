# Observability and Tracing (Langfuse)

Status: Draft - implementation blocked until `spec approved`

## Goal

Trace every LLM call the tool makes to Langfuse, capturing latency, token
usage, and estimated cost per call, grouped into one trace per review run.
Establishes the standing policy: from here on, every review run is traced.

## Context

Read:

- `AGENTS.md`
- `agent-reference.md`
- `docs/architecture.md`
- `docs/open-questions.md`
- `specs/01-pr-review-tool.md`
- `specs/02-fixed-workflow-review.md`
- `specs/03-autonomous-agent-review.md`
- `src/providers/llm.js`, `src/providers/gemini.js`, `src/metrics.js`

## In Scope

- A tracing wrapper around the provider seam (`provider.complete()`), so both
  the fixed workflow and the autonomous agent are instrumented in one place.
- One Langfuse **trace** per review run; each `complete()` call is a
  **generation** under it (input, output, model, tokens, latency, cost).
- Agent **tool calls** recorded as nested **spans** within the agent trace.
- Cost computed from the existing `pricing.js` table and sent with each
  generation (so Langfuse shows real spend even for custom/mock models).
- Run metadata on the trace: mode (fixed/agent), provider, model, PR id,
  fixture path, final verdict.
- Graceful degradation: if Langfuse credentials are absent, tracing is a no-op
  and the tool still runs fully offline on the mock.

## Out of Scope

- Correctness scoring and cost-per-correct-answer (covered by `specs/06`).
- Self-hosting Langfuse (we use Langfuse Cloud free tier in v1).
- Tracing non-LLM internal functions.

## User Flow

1. User sets `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST` in
   `.env`.
2. User runs a review as normal (`node src/cli.js review ...`).
3. Each LLM call is traced; at run end the trace is flushed to Langfuse.
4. User opens Langfuse and sees per-run traces with latency/tokens/cost.

## Functional Requirements

- Instrumentation lives at the provider seam, not in prompt builders or review
  logic; reviewers are unchanged.
- A trace groups all calls from a single run; fixed and agent runs are separate
  traces, linked by a shared run/session id when run together.
- Every generation records: model, input, output, input/output tokens, latency
  (ms), and estimated USD cost.
- Tracing is controllable: on when credentials exist (default), forced off with
  a `--no-trace-remote` flag, never blocks or crashes the run on failure.
- Trace export failures are logged, not fatal.

## Data and Interfaces

- New env vars: `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST`.
- New dependency: the `langfuse` SDK (first runtime dependency; called out per
  scope discipline).
- New module: `src/observability/tracing.js` exposing a `withTracing(provider,
  runContext)` wrapper that returns a provider with the same `.complete()`
  contract.

## Acceptance Criteria

- Running with credentials produces, per review run, one Langfuse trace whose
  generations match the run's LLM calls.
- Each generation shows latency, input/output tokens, and a cost figure.
- Running without credentials still completes and writes all reports (no-op
  tracing).
- The fixed and agent reviewers' source code is unchanged except for receiving
  an already-wrapped provider.

## Verification

- Mock run without keys: reports generated, no tracing errors.
- Mock run with keys: a trace appears with the expected number of generations.
- Gemini run with keys: latency/tokens/cost on each generation match the local
  metrics within rounding.

## Open Questions

- Q11: trace granularity for agent tool calls (spans vs events).
- Q12: one trace per mode vs one parent trace with two children when `--mode both`.
