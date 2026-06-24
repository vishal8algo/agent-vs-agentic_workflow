// metrics.js — operational measurement for one review run.
//
// The comparison report is built almost entirely from these numbers. Both the
// fixed workflow and the autonomous agent get their own Metrics instance and
// record into the SAME shape, so they can be put side by side honestly:
//
//   - elapsedMs   : wall-clock latency
//   - llmCalls    : how many times we hit the model
//   - toolCalls   : how many tool invocations (mostly relevant to the agent)
//   - steps       : workflow stages run, or agent iterations
//   - tokens      : input/output totals (for spend estimation)
//   - estCostUsd  : tokens * configured price
//
// A simple wrapper, but it keeps measurement consistent and out of the
// reviewers' business logic.

export class Metrics {
  constructor({ mode, model, pricePerMTokens = { input: 0, output: 0 } } = {}) {
    this.mode = mode; // "fixed" | "agent"
    this.model = model;
    this.pricePerMTokens = pricePerMTokens; // USD per 1M tokens
    this.llmCalls = 0;
    this.toolCalls = 0;
    this.steps = 0;
    this.tokens = { input: 0, output: 0 };
    this._start = null;
    this._end = null;
  }

  start() {
    this._start = nowMs();
    return this;
  }

  stop() {
    this._end = nowMs();
    return this;
  }

  /** Record one model call and fold in its token usage. */
  recordLLMCall(usage = {}) {
    this.llmCalls += 1;
    this.tokens.input += usage.inputTokens ?? 0;
    this.tokens.output += usage.outputTokens ?? 0;
  }

  recordToolCall() {
    this.toolCalls += 1;
  }

  recordStep() {
    this.steps += 1;
  }

  get elapsedMs() {
    if (this._start == null) return 0;
    return (this._end ?? nowMs()) - this._start;
  }

  /** Estimated spend in USD from token usage and configured pricing. */
  get estCostUsd() {
    const inCost = (this.tokens.input / 1_000_000) * this.pricePerMTokens.input;
    const outCost = (this.tokens.output / 1_000_000) * this.pricePerMTokens.output;
    return inCost + outCost;
  }

  /** Plain object for rendering into reports. */
  toJSON() {
    return {
      mode: this.mode,
      model: this.model,
      elapsedMs: this.elapsedMs,
      llmCalls: this.llmCalls,
      toolCalls: this.toolCalls,
      steps: this.steps,
      tokens: { ...this.tokens },
      estCostUsd: Number(this.estCostUsd.toFixed(6)),
    };
  }
}

// Wall-clock helper. Uses performance.now() when available for precision.
function nowMs() {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}
