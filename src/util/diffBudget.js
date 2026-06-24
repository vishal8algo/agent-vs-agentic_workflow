// diffBudget.js — keep what we send to the model bounded.
//
// Real PRs can have huge diffs. We cap each file's patch so prompts stay within
// reason (token cost + context limits) and note when we truncated, so the
// report never silently hides that it only saw part of a file.

const DEFAULT_MAX_PATCH_LINES = 150;

/**
 * Return a compact, capped textual view of the changed files for a prompt.
 * @param {Array} files            - normalized PRContext.files
 * @param {number} [maxLines]      - max patch lines per file
 * @returns {{ text: string, truncatedFiles: string[] }}
 */
export function buildDiffView(files, maxLines = DEFAULT_MAX_PATCH_LINES) {
  const truncatedFiles = [];
  const blocks = files.map((f) => {
    const header = `### ${f.path} (${f.status}, +${f.additions}/-${f.deletions})`;
    if (!f.patch) return `${header}\n(no textual diff — binary or too large)`;

    const lines = f.patch.split("\n");
    if (lines.length > maxLines) {
      truncatedFiles.push(f.path);
      const shown = lines.slice(0, maxLines).join("\n");
      return `${header}\n${shown}\n... [truncated ${lines.length - maxLines} more lines]`;
    }
    return `${header}\n${f.patch}`;
  });

  return { text: blocks.join("\n\n"), truncatedFiles };
}
