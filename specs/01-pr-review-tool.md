# PR Review Tool

Status: Draft - implementation blocked until `spec approved`

## Goal

Create a CLI-first demo tool that accepts a GitHub PR URL or fixture and generates merge-readiness reports using both a fixed workflow and an autonomous agent.

## Context

Read:

- `AGENTS.md`
- `agent-reference.md`
- `conventions.md`
- `docs/product.md`
- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/open-questions.md`

## In Scope

- Validate a GitHub PR URL or fixture input.
- Build one normalized PR review context used by both review modes.
- Generate `reports/fixed-review.md`.
- Generate `reports/agent-review.md`.
- Generate `reports/comparison.md`.
- Capture operational metrics for both modes.

## Out of Scope

- Posting comments to GitHub.
- Automatically approving or merging PRs.
- Full web UI.
- Multi-repository dashboards.

## Functional Requirements

- The same PR data must be used by both modes.
- The tool must support deterministic fixture-based execution for tests and training.
- The tool must fail clearly when required credentials or inputs are missing.
- Reports must be generated in markdown.
- The comparison report must describe tradeoffs in latency, spend, predictability, and debuggability.

## Acceptance Criteria

- Running the approved command with valid input creates all three report files.
- Each report includes a merge-readiness recommendation.
- The comparison report makes the difference between fixed workflow and autonomous agent visible to a learner.
- Metrics are displayed or recorded for both modes.
- Fixture-based tests can run without network access.

## Open Questions

- Q01: implementation stack.
- Q02: LLM provider/model.
- Q03: live GitHub versus fixture default.
- Q04: exact merge-readiness rubric.
