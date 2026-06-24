// mock.js — a deterministic, offline LLM stand-in.
//
// It does NOT call any model. Given the same prompt it always returns the same
// reply, so demos and tests are perfectly repeatable. It also reports a token
// "usage" estimate (~4 chars per token) so the metrics/cost plumbing has real
// numbers before we ever spend on Gemini.
//
// For spec 2 it understands two request kinds:
//   - a "Dimension: X" JSON request  -> returns canned SAMPLE findings for X
//   - a risk-summary request         -> returns a short canned risk summary
// These samples are clearly labelled placeholders. A real model (GeminiProvider)
// exposes the same .complete() shape and will actually read the prompts.

/** Rough token estimate used when a provider can't give exact counts. */
export function estimateTokens(text = "") {
  return Math.ceil(text.length / 4);
}

// Canned sample findings keyed by the first dimension named in the prompt.
// Chosen to span severities so the rubric roll-up is demonstrable:
// one high (correctness) -> overall "needs human review".
const SAMPLE_FINDINGS = {
  correctness: [
    {
      severity: "high",
      title: "[sample] Unhandled edge case in changed logic",
      detail:
        "A code path added in this PR may not handle empty/invalid input. Verify boundary conditions before merge.",
    },
  ],
  tests: [
    {
      severity: "medium",
      title: "[sample] New logic lacks accompanying tests",
      detail: "Behaviour changes are not covered by tests in this diff.",
    },
  ],
  security: [
    {
      severity: "low",
      title: "[sample] Validate externally-influenced input",
      detail: "Inputs from the environment/network should be validated and bounded.",
    },
    {
      severity: "info",
      title: "[sample] Documentation could note new behaviour",
      detail: "Consider documenting the new option/flow for maintainers.",
    },
  ],
};

export class MockProvider {
  constructor(options = {}) {
    this.name = "mock";
    this.model = options.model ?? "mock-1";
  }

  /**
   * @param {{ system?: string, prompt?: string, json?: boolean }} req
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

  #reply(prompt, json) {
    // Judge request? Return a deterministic quality score keyed off the verdict.
    if (/Grade this review/i.test(prompt)) {
      return this.#judgeScore(prompt);
    }
    // Agent decision request? Return the next scripted action (deterministic).
    if (/Decide the next action/i.test(prompt)) {
      return this.#agentAction(prompt);
    }
    if (json) {
      const dim = this.#firstDimension(prompt);
      const evidence = this.#firstFile(prompt);
      const findings = (SAMPLE_FINDINGS[dim] ?? []).map((f) => ({ ...f, evidence }));
      return JSON.stringify({ findings });
    }
    if (/highest-risk|risk areas/i.test(prompt)) {
      return [
        "- [sample] Core logic changes warrant close correctness review.",
        "- [sample] Test coverage for new behaviour appears thin.",
        "- [sample] Inputs crossing a trust boundary should be validated.",
      ].join("\n");
    }
    const firstLine = (prompt.split("\n").find((l) => l.trim()) ?? "").slice(0, 120);
    return `Mock response to: "${firstLine}"`;
  }

  // Deterministic judge: score the review by its verdict. Tuned so a permissive
  // "ready" verdict falls below the default 0.7 bar while thorough verdicts pass
  // — making cost-per-correct differ by mode in the offline demo.
  #judgeScore(prompt) {
    const m = prompt.match(/Verdict:\s*(.+)/i);
    const verdict = (m ? m[1] : "").trim().toLowerCase();
    const score =
      verdict.startsWith("blocked") ? 0.88 :
      verdict.startsWith("needs human review") ? 0.82 :
      verdict.startsWith("ready with minor") ? 0.72 :
      verdict.startsWith("ready") ? 0.6 :
      0.5;
    return JSON.stringify({
      score,
      justification: `[sample] Deterministic mock score for verdict "${verdict}".`,
    });
  }

  // Deterministic agent "policy": pick the next action by how many steps the
  // transcript already shows. The real model would reason here instead.
  #agentAction(prompt) {
    const step = (prompt.match(/OBSERVATION:/g) ?? []).length;
    const file = this.#firstPrFile(prompt);
    const script = [
      { thought: "Start by understanding the PR.", action: { tool: "get_pr_summary", args: {} } },
      { thought: "See what changed.", action: { tool: "list_changed_files", args: {} } },
      { thought: "Inspect the most relevant diff.", action: { tool: "read_file_diff", args: { path: file } } },
      {
        thought: "Record a correctness concern.",
        action: {
          tool: "record_finding",
          args: {
            severity: "high",
            title: "[sample] Edge case may be unhandled in changed code",
            detail: "Boundary/invalid input handling should be verified before merge.",
            evidence: file,
          },
        },
      },
      {
        thought: "Note a minor maintainability point.",
        action: {
          tool: "record_finding",
          args: {
            severity: "low",
            title: "[sample] Consider documenting new behaviour",
            detail: "A short note would help future maintainers.",
            evidence: file,
          },
        },
      },
      { thought: "Enough evidence to judge.", action: { tool: "finalize_review", args: {} } },
    ];
    const choice = script[Math.min(step, script.length - 1)];
    return JSON.stringify(choice);
  }

  // First file path from the "Files in this PR: a, b, c" line of the prompt.
  #firstPrFile(prompt) {
    const m = prompt.match(/Files in this PR:\s*([^\n]+)/i);
    if (!m) return "(file)";
    return m[1].split(",")[0].trim() || "(file)";
  }

  // Read the "Dimension: a, b, c" marker the prompt builder writes.
  #firstDimension(prompt) {
    const m = prompt.match(/Dimension:\s*([a-z]+)/i);
    return m ? m[1].toLowerCase() : "";
  }

  // Reference a real changed file from the diff view, if present.
  #firstFile(prompt) {
    const m = prompt.match(/^###\s+(\S+)/m);
    return m ? m[1] : "(diff)";
  }
}
