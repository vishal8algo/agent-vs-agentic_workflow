// mock.js — a deterministic, offline LLM stand-in.
//
// It does NOT call any model. Given the same prompt it always returns the same
// reply, so demos and tests are perfectly repeatable. It also reports a token
// "usage" estimate (~4 chars per token) so the metrics/cost plumbing has real
// numbers to work with before we ever spend a cent on Gemini.
//
// Later, the real GeminiProvider will expose the same .complete() shape, so the
// reviewers won't know or care which one they're talking to.

/** Rough token estimate used when a provider can't give exact counts. */
export function estimateTokens(text = "") {
  return Math.ceil(text.length / 4);
}

export class MockProvider {
  constructor(options = {}) {
    this.name = "mock";
    this.model = options.model ?? "mock-1";
  }

  /**
   * @param {{ system?: string, prompt: string, json?: boolean }} req
   * @returns {Promise<{ text: string, usage: object, model: string }>}
   */
  async complete({ system = "", prompt = "", json = false } = {}) {
    const text = this.#reply(prompt, json);
    return {
      text,
      model: this.model,
      usage: {
        inputTokens: estimateTokens(system + prompt),
        outputTokens: estimateTokens(text),
      },
    };
  }

  // Produce a stable, vaguely-sensible reply derived from the prompt so the
  // pipeline has something non-empty to render. Real reasoning arrives with
  // specs 2 & 3 + the Gemini provider.
  #reply(prompt, json) {
    if (json) {
      return JSON.stringify({
        summary: "Mock structured response.",
        findings: [],
        note: "Deterministic placeholder from MockProvider.",
      });
    }
    const firstLine = (prompt.split("\n").find((l) => l.trim()) ?? "").slice(0, 120);
    return `Mock response to: "${firstLine}"`;
  }
}
