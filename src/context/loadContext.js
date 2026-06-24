// loadContext.js
//
// Turns a raw fixture file into ONE normalized "PR review context" object.
//
// Why this matters: both the fixed workflow AND the autonomous agent must
// review the exact same data. If they saw different inputs, any difference in
// their reports could just be noise. This module is the single source of truth
// that both modes consume, so the comparison stays fair.
//
// The shape produced here is the contract. Capture scripts (GitHub, git diff)
// must produce a fixture that normalizes into this shape.

import { readFile } from "node:fs/promises";

/**
 * @typedef {Object} ReviewFile
 * @property {string} path        - file path in the repo
 * @property {string} status      - "added" | "modified" | "removed" | "renamed"
 * @property {number} additions   - lines added
 * @property {number} deletions   - lines removed
 * @property {string} patch       - unified diff hunk for this file ("" if none)
 *
 * @typedef {Object} PRContext
 * @property {string} source                 - where the data came from, e.g. "fixture:github"
 * @property {Object} pr                      - PR identity + summary
 * @property {ReviewFile[]} files             - changed files with diffs
 * @property {Object} stats                   - rollup counts
 * @property {Array}  checks                  - CI/check summaries ([] if unknown)
 * @property {Array}  commits                 - commit summaries ([] if unknown)
 */

/**
 * Load a fixture file from disk and normalize it into a PRContext.
 * @param {string} fixturePath
 * @returns {Promise<PRContext>}
 */
export async function loadContext(fixturePath) {
  let raw;
  try {
    const text = await readFile(fixturePath, "utf8");
    raw = JSON.parse(text);
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new InputError(`Fixture not found: ${fixturePath}`);
    }
    if (err instanceof SyntaxError) {
      throw new InputError(`Fixture is not valid JSON: ${fixturePath} (${err.message})`);
    }
    throw err;
  }

  return normalize(raw, fixturePath);
}

/**
 * Normalize a raw fixture object into the shared PRContext shape.
 * Tolerant of missing optional fields; strict about the essentials.
 */
export function normalize(raw, sourceLabel = "fixture") {
  if (!raw || typeof raw !== "object") {
    throw new InputError("Fixture must be a JSON object.");
  }

  const pr = raw.pr ?? {};
  if (!pr.number && pr.number !== 0) {
    throw new InputError("Fixture is missing pr.number — cannot identify the PR.");
  }

  const files = Array.isArray(raw.files)
    ? raw.files.map(normalizeFile)
    : [];

  const stats = {
    filesChanged: files.length,
    additions: files.reduce((sum, f) => sum + f.additions, 0),
    deletions: files.reduce((sum, f) => sum + f.deletions, 0),
  };

  return {
    source: raw.source ?? sourceLabel,
    pr: {
      url: pr.url ?? "",
      repo: pr.repo ?? "",
      number: pr.number,
      title: pr.title ?? "(untitled)",
      author: pr.author ?? "(unknown)",
      description: pr.description ?? "",
      baseBranch: pr.baseBranch ?? "",
      headBranch: pr.headBranch ?? "",
      state: pr.state ?? "open",
    },
    files,
    stats,
    checks: Array.isArray(raw.checks) ? raw.checks : [],
    commits: Array.isArray(raw.commits) ? raw.commits : [],
  };
}

function normalizeFile(f, i) {
  if (!f || typeof f !== "object" || !f.path) {
    throw new InputError(`files[${i}] is missing a "path".`);
  }
  return {
    path: f.path,
    status: f.status ?? "modified",
    additions: Number(f.additions ?? 0),
    deletions: Number(f.deletions ?? 0),
    patch: typeof f.patch === "string" ? f.patch : "",
  };
}

/** Thrown for bad/missing input so the CLI can exit with code 1. */
export class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = "InputError";
  }
}
