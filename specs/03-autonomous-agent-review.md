# Autonomous Agent Review

Status: Draft - implementation blocked until `spec approved`

## Goal

Generate `reports/agent-review.md` by giving an autonomous agent a PR review goal, controlled tools, and stopping rules, allowing it to decide the review steps.

## Context

Read:

- `AGENTS.md`
- `docs/product.md`
- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/open-questions.md`
- `specs/01-pr-review-tool.md`

## In Scope

- Goal-driven review loop.
- Tool access for normalized PR data.
- Agent-selected sequence of actions.
- Explicit stopping conditions.
- Tool trace and decision summary.
- Metrics for elapsed time, tool calls, LLM calls, token usage when available, estimated spend, and iteration count.

## Candidate Tools

- `get_pr_summary`
- `list_changed_files`
- `read_file_diff`
- `search_diff`
- `get_checks_summary`
- `record_finding`
- `finalize_review`

## Guardrails

- Maximum iterations must be configurable.
- Maximum tool calls must be configurable.
- The agent must not access files or systems outside the approved PR context unless a later spec allows it.
- The final report must distinguish evidence-backed findings from uncertainty.

## Functional Requirements

- The agent receives the same normalized PR context as the fixed workflow.
- The agent decides what to inspect next within the tool boundary.
- The agent must stop when it finalizes, reaches max steps, or hits a fatal error.
- The trace must make the agent's choices inspectable.

## Acceptance Criteria

- The report identifies the review method as autonomous agent.
- The report includes a summarized action/tool trace.
- The report includes findings grouped by severity.
- The report includes merge-readiness status: ready, ready with minor issues, blocked, or needs human review.
- The report includes metrics and limitations.

## Open Questions

- Q02: LLM provider/model.
- Q06: whether context outside the diff is allowed.
- Q07: maximum acceptable runtime.
- Q08: raw trace visibility.
