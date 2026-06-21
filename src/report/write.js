// write.js — the only place that touches the filesystem for reports.
//
// Separating "render" (pure strings) from "write" (side effects) keeps the
// rendering testable and the I/O in one obvious spot.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderReviewReport, renderComparison } from "./render.js";

/**
 * Write whichever reports were produced into outDir.
 * @param {string} outDir
 * @param {object} ctx                 - normalized PRContext
 * @param {object} results             - { fixed?, agent? } ReviewResults
 * @returns {Promise<string[]>}        - paths written
 */
export async function writeReports(outDir, ctx, results) {
  await mkdir(outDir, { recursive: true });
  const written = [];

  if (results.fixed) {
    const p = join(outDir, "fixed-review.md");
    await writeFile(p, renderReviewReport(results.fixed, ctx), "utf8");
    written.push(p);
  }

  if (results.agent) {
    const p = join(outDir, "agent-review.md");
    await writeFile(p, renderReviewReport(results.agent, ctx), "utf8");
    written.push(p);
  }

  // Comparison only makes sense when we have both.
  if (results.fixed && results.agent) {
    const p = join(outDir, "comparison.md");
    await writeFile(p, renderComparison(results.fixed, results.agent, ctx), "utf8");
    written.push(p);
  }

  return written;
}
