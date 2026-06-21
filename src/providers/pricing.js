// pricing.js — USD per 1,000,000 tokens, keyed by model.
//
// Spend (docs/open-questions.md Q05) = tokens * this table. The mock is free.
// Real model prices live here so the estimate updates in one place. Values are
// approximate and easy to adjust; treat the reported cost as an estimate.

export const PRICING = {
  "mock-1": { input: 0, output: 0 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "gemini-1.5-pro": { input: 1.25, output: 5.0 },
};

/** Look up pricing for a model, defaulting to free if unknown. */
export function priceFor(model) {
  return PRICING[model] ?? { input: 0, output: 0 };
}
