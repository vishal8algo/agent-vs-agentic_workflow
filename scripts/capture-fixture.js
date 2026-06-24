#!/usr/bin/env node
// capture-fixture.js — ONE-TIME dev tool (not part of the runtime).
//
// Fetches a real GitHub PR via the REST API and writes it into our normalized
// fixture shape (the same shape src/context/loadContext.js expects). After this
// runs once, every demo/test reads the committed fixture offline — keeping us
// "fixtures-first".
//
// Usage:
//   GITHUB_TOKEN=ghp_xxx node scripts/capture-fixture.js <pr-url> [outPath]
//
// Example:
//   node scripts/capture-fixture.js https://github.com/owner/repo/pull/3
//
// Auth: reads GITHUB_TOKEN (or GH_TOKEN). A token avoids the 60/hr
// unauthenticated rate limit and is required for private repos.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const API = "https://api.github.com";

async function main(argv) {
  const url = argv[0];
  const outPath = argv[1] ?? "fixtures/sample-pr.json";
  if (!url) {
    fail("Usage: node scripts/capture-fixture.js <pr-url> [outPath]");
  }

  const { owner, repo, number } = parsePrUrl(url);
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  if (!token) {
    console.warn("Warning: no GITHUB_TOKEN set — using unauthenticated requests (60/hr limit).");
  }

  console.log(`Fetching ${owner}/${repo} PR #${number} ...`);
  const pr = await gh(`/repos/${owner}/${repo}/pulls/${number}`, token);
  const files = await ghPaged(`/repos/${owner}/${repo}/pulls/${number}/files`, token);
  const commits = await ghPaged(`/repos/${owner}/${repo}/pulls/${number}/commits`, token);

  const fixture = {
    source: "fixture:github",
    capturedFrom: url,
    pr: {
      url: pr.html_url,
      repo: `${owner}/${repo}`,
      number: pr.number,
      title: pr.title,
      author: pr.user?.login ?? "(unknown)",
      description: pr.body ?? "",
      baseBranch: pr.base?.ref ?? "",
      headBranch: pr.head?.ref ?? "",
      state: pr.state,
    },
    files: files.map((f) => ({
      path: f.filename,
      status: f.status,
      additions: f.additions ?? 0,
      deletions: f.deletions ?? 0,
      patch: f.patch ?? "", // huge/binary files may have no patch
    })),
    commits: commits.map((c) => ({
      sha: c.sha?.slice(0, 7) ?? "",
      message: c.commit?.message?.split("\n")[0] ?? "",
    })),
    checks: [], // populated in a later phase (live checks/status)
  };

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(fixture, null, 2) + "\n", "utf8");
  console.log(
    `Wrote ${outPath} — ${fixture.files.length} files, ${fixture.commits.length} commits.`
  );
}

/** Parse https://github.com/<owner>/<repo>/pull/<n> */
function parsePrUrl(url) {
  const m = String(url).match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!m) fail(`Not a GitHub PR URL: ${url}`);
  return { owner: m[1], repo: m[2], number: Number(m[3]) };
}

async function gh(path, token) {
  const res = await fetch(API + path, { headers: headers(token) });
  if (!res.ok) {
    const body = await res.text();
    fail(`GitHub API ${res.status} for ${path}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

/** Follow Link-header pagination and concatenate all pages. */
async function ghPaged(path, token) {
  const out = [];
  let url = API + path + (path.includes("?") ? "&" : "?") + "per_page=100";
  while (url) {
    const res = await fetch(url, { headers: headers(token) });
    if (!res.ok) {
      const body = await res.text();
      fail(`GitHub API ${res.status} for ${url}: ${body.slice(0, 200)}`);
    }
    out.push(...(await res.json()));
    url = nextLink(res.headers.get("link"));
  }
  return out;
}

function nextLink(linkHeader) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    const m = part.match(/<([^>]+)>;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}

function headers(token) {
  const h = {
    Accept: "application/vnd.github+json",
    "User-Agent": "pr-review-demo",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function fail(msg) {
  console.error("Error: " + msg);
  process.exit(1);
}

main(process.argv.slice(2)).catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
