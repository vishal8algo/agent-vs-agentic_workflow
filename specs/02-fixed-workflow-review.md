# Fixed Workflow Review

Status: Draft - implementation blocked until `spec approved`

## Goal

Generate `reports/fixed-review.md` by executing a predefined PR review workflow with controlled LLM usage inside bounded steps.

## Context

Read:

- `AGENTS.md`
- `docs/product.md`
- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/open-questions.md`
- `specs/01-pr-review-tool.md`

## In Scope

- Deterministic ordered review stages.
- Bounded prompts for each LLM-assisted stage.
- Findings with severity, evidence, and recommendation.
- Metrics for elapsed time, LLM calls, token usage when available, estimated spend, and step count.

## Proposed Workflow

1. Summarize PR metadata.
2. Summarize changed files and diff size.
3. Identify risk areas.
4. Review correctness risks.
5. Review test coverage and missing tests.
6. Review security, operations, and maintainability concerns.
7. Produce merge-readiness recommendation.
8. Render `reports/fixed-review.md`.

## Functional Requirements

- Steps must always run in the same order.
- Each step must declare its input and output.
- The workflow must not choose new tools or unplanned steps at runtime.
- Failure in a step must be reported with enough context to debug.

## Acceptance Criteria

- The report identifies the review method as fixed workflow.
- The report includes the ordered stages that ran.
- The report includes findings grouped by severity.
- The report includes merge-readiness status: ready, ready with minor issues, blocked, or needs human review.
- The report includes metrics and limitations.

## Open Questions

- Q04: final rubric.
- Q05: spend calculation.
- Q08: prompt and trace visibility.
