#!/usr/bin/env node
// serve-reports.js — a tiny zero-dependency viewer for the generated reports.
//
// Not a "web app" — just a local, read-only window onto reports/*.md so you can
// see the comparison visually instead of reading raw markdown. Markdown is
// rendered in the browser via marked from a CDN; the server only serves files.
//
// Usage:
//   node scripts/serve-reports.js [--port 5173] [--dir reports]
// Then open the printed URL.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const args = process.argv.slice(2);
const port = Number(getArg("--port") ?? 5173);
const dir = getArg("--dir") ?? "reports";

const REPORTS = [
  { id: "comparison", file: "comparison.md", label: "Comparison" },
  { id: "fixed", file: "fixed-review.md", label: "Fixed workflow" },
  { id: "agent", file: "agent-review.md", label: "Autonomous agent" },
];

const server = createServer(async (req, res) => {
  try {
    if (req.url === "/" || req.url === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(PAGE);
      return;
    }
    const match = req.url.match(/^\/raw\/([a-z-]+)$/);
    if (match) {
      const entry = REPORTS.find((r) => r.id === match[1]);
      const text = entry ? await safeRead(join(dir, entry.file)) : "Not found.";
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(text);
      return;
    }
    res.writeHead(404).end("Not found");
  } catch (err) {
    res.writeHead(500).end(String(err));
  }
});

server.listen(port, () => {
  console.log(`Report viewer running at http://localhost:${port}`);
  console.log(`Serving markdown from ./${dir}  (regenerate with: node src/cli.js review ...)`);
});

async function safeRead(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return `_Report not found: ${path}. Run a review first._`;
  }
}

function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
}

const tabs = REPORTS.map(
  (r, i) => `<button class="tab${i === 0 ? " active" : ""}" data-id="${r.id}">${r.label}</button>`
).join("");

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>PR Review — Fixed vs Agent</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>
  :root { color-scheme: light dark; }
  body { font: 15px/1.6 -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; }
  header { padding: 16px 24px; border-bottom: 1px solid #8884; }
  header h1 { font-size: 18px; margin: 0 0 10px; }
  .tabs { display: flex; gap: 8px; }
  .tab { padding: 6px 14px; border: 1px solid #8886; border-radius: 8px; background: transparent; cursor: pointer; font: inherit; }
  .tab.active { background: #4f8cff22; border-color: #4f8cff; font-weight: 600; }
  main { max-width: 920px; margin: 0 auto; padding: 24px; }
  table { border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #8885; padding: 6px 10px; text-align: left; }
  code { background: #8882; padding: 1px 5px; border-radius: 4px; }
  pre code { display: block; padding: 12px; overflow-x: auto; }
  h2 { border-bottom: 1px solid #8883; padding-bottom: 4px; margin-top: 32px; }
  .refresh { float: right; font-size: 13px; }
</style>
</head>
<body>
<header>
  <h1>PR Review — Fixed Workflow vs Autonomous Agent
    <a class="refresh" href="javascript:load(current)">↻ refresh</a></h1>
  <div class="tabs">${tabs}</div>
</header>
<main id="content">Loading…</main>
<script>
  let current = "comparison";
  async function load(id) {
    current = id;
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.id === id));
    const md = await (await fetch("/raw/" + id)).text();
    document.getElementById("content").innerHTML = marked.parse(md);
  }
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => load(t.dataset.id)));
  load(current);
</script>
</body>
</html>`;
