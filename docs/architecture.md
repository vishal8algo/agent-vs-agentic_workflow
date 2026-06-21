# Technical Architecture Draft

Status: Draft. Implementation blocked pending `spec approved`.

## Proposed Shape

The tool should be CLI-first with a small set of modules:

- Input layer: parse PR URL and runtime options.
- GitHub data layer: fetch PR metadata, changed files, diffs, commits, checks, and review comments.
- Review context builder: normalize PR data into a common structure shared by both modes.
- Fixed workflow reviewer: execute deterministic review stages.
- Autonomous agent reviewer: execute goal-driven loop with tool access and stopping rules.
- Report writer: render markdown reports.
- Metrics collector: track latency, model calls, estimated spend, tool calls, and trace information.

## Data Flow

```txt
PR URL
  -> input validation
  -> GitHub data fetch or fixture load
  -> normalized PR review context
  -> fixed workflow reviewer
  -> autonomous agent reviewer
  -> comparison engine
  -> reports/*.md
```

## Fixed Workflow Concept

The fixed workflow should run known steps in a known order. Candidate steps:

1. Collect PR metadata and diff summary.
2. Classify files and risk areas.
3. Review correctness risks.
4. Review test coverage implications.
5. Review security and operational risks.
6. Produce merge-readiness recommendation.

LLM calls should be bounded and tied to explicit prompts per step.

## Autonomous Agent Concept

The autonomous agent should receive a goal and tool list, then decide the next action until it reaches a stopping condition. Candidate tools:

- Read PR metadata.
- Read changed file list.
- Read selected diff.
- Search within diff.
- Read checks/status summary.
- Record finding.
- Finalize report.

The agent must have guardrails for max iterations, max tool calls, and max spend.

## Reporting

Reports should be markdown because they are easy to inspect in training sessions and diff in version control.

## Persistence

Initial version should write files locally under `reports/` and optionally traces under `reports/traces/` or `runs/` after spec approval.

## External Integrations

- GitHub API for live PR data.
- LLM provider for review reasoning.

Both integrations should have fixture-backed alternatives for repeatable demos and tests.
