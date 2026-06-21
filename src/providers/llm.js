// llm.js — the LLM provider interface + factory.
//
// Reviewers depend on THIS, never on a concrete SDK. That decoupling is the
// whole point: we develop and test against a deterministic mock (no API key,
// no cost, no network), then swap in real Gemini by changing one name.
//
// The contract every provider implements:
//
//   provider.complete({ system, prompt, json }) -> Promise<{
//     text:  string,                       // the model's reply
//     usage: { inputTokens, outputTokens } // for cost/metrics; estimated if unknown
//     model: string                        // which model produced this
//   }>
//
// Keeping the surface this small means the fixed workflow and the agent share
// identical access to "the model" — another piece of keeping the comparison fair.

import { MockProvider } from "./mock.js";

/**
 * Create a provider by name.
 * @param {string} name           - "mock" (default) | "gemini"
 * @param {object} [options]      - provider-specific options (model, apiKey, ...)
 * @returns {{ complete: Function, name: string, model: string }}
 */
export function createProvider(name = "mock", options = {}) {
  switch (name) {
    case "mock":
      return new MockProvider(options);
    case "gemini":
      // Wired up in a later step (step: swap mock -> real Gemini).
      throw new ProviderError(
        "Gemini provider is not implemented yet. Use --provider mock for now."
      );
    default:
      throw new ProviderError(`Unknown provider: "${name}". Try "mock" or "gemini".`);
  }
}

/** Thrown for provider/config failures so the CLI can exit with code 3. */
export class ProviderError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProviderError";
  }
}
