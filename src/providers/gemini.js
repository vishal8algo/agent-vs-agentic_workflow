// gemini.js — real LLM provider backed by Google's Gemini API.
//
// Implements the SAME .complete() contract as MockProvider, so the reviewers
// don't change at all when we switch to it — that's the payoff of the provider
// seam. Uses the REST endpoint via global fetch (no SDK dependency).
//
//   complete({ system, prompt, json }) -> { text, usage:{inputTokens,outputTokens}, model }
//
// temperature is pinned to 0 for as-deterministic-as-possible output. When
// json:true we ask Gemini for application/json so replies parse cleanly.

import { estimateTokens } from "./mock.js";
import { ProviderError } from "./llm.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiProvider {
  constructor(options = {}) {
    this.name = "gemini";
    this.model = options.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || "";
    if (!this.apiKey) {
      throw new ProviderError(
        "GEMINI_API_KEY is not set. Add it to .env or the environment."
      );
    }
  }

  async complete({ system = "", prompt = "", json = false } = {}) {
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    };
    if (system) body.system_instruction = { parts: [{ text: system }] };

    const data = await this.#requestWithRetry(body);
    const text = extractText(data);
    const usage = data.usageMetadata ?? {};

    return {
      text,
      model: this.model,
      usage: {
        inputTokens: usage.promptTokenCount ?? estimateTokens(system + prompt),
        outputTokens: usage.candidatesTokenCount ?? estimateTokens(text),
      },
    };
  }

  // POST with retry on rate limits (429) and transient 503s. Honors the
  // retryDelay Google returns, else exponential backoff. Free-tier RPM limits
  // are the common case here, so a short wait usually clears them.
  async #requestWithRetry(body, maxRetries = 5) {
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetch(`${BASE}/${this.model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
          body: JSON.stringify(body),
        });
      } catch (err) {
        throw new ProviderError(`Gemini request failed: ${err.message}`);
      }

      if (res.ok) return res.json();

      const detail = await res.text();
      const retriable = res.status === 429 || res.status === 503;
      if (!retriable || attempt >= maxRetries) {
        throw new ProviderError(`Gemini API ${res.status}: ${detail.slice(0, 300)}`);
      }

      const waitMs = retryDelayMs(detail, attempt);
      await sleep(waitMs);
    }
  }
}

/** Parse Google's suggested retryDelay (e.g. "31s"), else exponential backoff. */
function retryDelayMs(detail, attempt) {
  const m = detail.match(/"retryDelay":\s*"(\d+)s"/);
  if (m) return (Number(m[1]) + 1) * 1000;
  return Math.min(60000, 2000 * 2 ** attempt); // 2s,4s,8s,16s,32s
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Pull the reply text out of a generateContent response. */
function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    return parts.map((p) => p.text ?? "").join("").trim();
  }
  // Blocked / empty response — surface why if we can.
  const reason = data?.candidates?.[0]?.finishReason ?? data?.promptFeedback?.blockReason;
  return reason ? `(no content — finishReason: ${reason})` : "";
}
