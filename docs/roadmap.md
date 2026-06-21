# Roadmap

## Phase 0 - Setup and Specs

- Create playbook-compatible project scaffolding.
- Capture BRD-derived product and architecture docs.
- Create open questions registry.
- Draft specs for review.
- Stop until `spec approved`.

## Phase 1 - Minimal Offline Demo

- Load PR data from fixtures.
- Run fixed workflow review.
- Run autonomous agent review against fixture-backed tools.
- Generate all three markdown reports.
- Capture basic latency and step-count metrics.

## Phase 2 - Live GitHub Integration

- Parse GitHub PR URLs.
- Fetch metadata, changed files, diffs, commits, reviews, and check status.
- Add error handling for auth, rate limits, and unavailable data.

## Phase 3 - Cost and Trace Instrumentation

- Track model calls, token usage, estimated spend, tool calls, and elapsed time.
- Write raw traces separately from final reports.
- Improve comparison report with measured evidence.

## Phase 4 - Training Polish

- Add sample fixtures for common PR types.
- Add documentation for team training sessions.
- Add example report snapshots.
