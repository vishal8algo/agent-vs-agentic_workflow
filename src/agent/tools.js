// tools.js — the agent's tool box.
//
// These are the ONLY actions the autonomous agent can take. Every tool reads
// from the normalized PR context — no disk, no network, no repo files outside
// the PR (docs/open-questions.md Q06). record_finding and finalize_review write
// to the run's mutable `state`. Each tool returns a short text "observation"
// that gets fed back into the next decision prompt.
//
// The agent never imports these directly; the loop dispatches by name, so the
// tool list is the agent's whole world.

import { buildDiffView } from "../util/diffBudget.js";
import { finding } from "../review/result.js";

/**
 * Tool registry. Each entry: { description, run(args, ctx) -> string }
 * where ctx = { context (PRContext), state (mutable run state) }.
 */
export const TOOLS = {
  get_pr_summary: {
    description: "Get PR title, author, branches, and change totals.",
    run: (_args, { context }) => {
      const p = context.pr;
      return (
        `PR #${p.number} "${p.title}" by ${p.author} ` +
        `(${p.headBranch} -> ${p.baseBranch}). ` +
        `${context.stats.filesChanged} files, +${context.stats.additions}/-${context.stats.deletions}. ` +
        `Description: ${p.description ? p.description.slice(0, 200) : "(none)"}`
      );
    },
  },

  list_changed_files: {
    description: "List changed files with their status and line counts.",
    run: (_args, { context }) =>
      context.files
        .map((f) => `- ${f.path} (${f.status}, +${f.additions}/-${f.deletions})`)
        .join("\n") || "(no files)",
  },

  read_file_diff: {
    description: "Read the diff for one file. args: { path }",
    run: (args, { context }) => {
      const file = context.files.find((f) => f.path === args?.path);
      if (!file) return `No such file in this PR: ${args?.path}`;
      const { text } = buildDiffView([file]);
      return text;
    },
  },

  search_diff: {
    description: "Search all diffs for a substring. args: { query }",
    run: (args, { context }) => {
      const q = String(args?.query ?? "").toLowerCase();
      if (!q) return "Provide a non-empty query.";
      const hits = [];
      for (const f of context.files) {
        for (const line of f.patch.split("\n")) {
          if (line.toLowerCase().includes(q)) hits.push(`${f.path}: ${line.trim()}`);
          if (hits.length >= 20) break;
        }
        if (hits.length >= 20) break;
      }
      return hits.length ? hits.join("\n") : `No matches for "${q}".`;
    },
  },

  get_checks_summary: {
    description: "Get CI/check results for the PR.",
    run: (_args, { context }) =>
      context.checks.length
        ? context.checks.map((c) => `- ${c.name}: ${c.status}`).join("\n")
        : "No check data available for this PR.",
  },

  record_finding: {
    description:
      "Record a review finding. args: { severity, title, detail, evidence }",
    run: (args, { state }) => {
      const f = finding(
        String(args?.severity ?? "info").toLowerCase(),
        String(args?.title ?? "(untitled)"),
        String(args?.detail ?? ""),
        String(args?.evidence ?? "")
      );
      state.findings.push(f);
      return `Recorded ${f.severity} finding: ${f.title}`;
    },
  },

  finalize_review: {
    description: "Finish the review. The loop stops after this.",
    run: (_args, { state }) => {
      state.done = true;
      return `Finalized with ${state.findings.length} finding(s).`;
    },
  },
};

/** Names + descriptions, for injecting into the decision prompt. */
export function toolCatalog() {
  return Object.entries(TOOLS)
    .map(([name, t]) => `- ${name}: ${t.description}`)
    .join("\n");
}
