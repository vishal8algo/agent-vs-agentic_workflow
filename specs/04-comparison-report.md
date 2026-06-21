# Comparison Report

Status: Draft - implementation blocked until `spec approved`

## Goal

Generate `reports/comparison.md` that explains the practical difference between the fixed workflow and autonomous agent review outputs for the same PR.

## Context

Read:

- `AGENTS.md`
- `docs/product.md`
- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/open-questions.md`
- `specs/01-pr-review-tool.md`
- `specs/02-fixed-workflow-review.md`
- `specs/03-autonomous-agent-review.md`

## In Scope

- Side-by-side comparison of recommendations and findings.
- Operational comparison of latency, spend, step/tool count, and failure modes.
- Qualitative comparison of predictability and debuggability.
- Training-oriented explanation of when to prefer each approach.

## Functional Requirements

- Use metrics captured from both review modes.
- Highlight agreement and disagreement between recommendations.
- Explain whether autonomy produced additional useful findings.
- Explain whether autonomy increased latency, cost, or trace complexity.
- Include a concise recommendation for internal training discussion.

## Acceptance Criteria

- The report includes a side-by-side table.
- The report includes measured or clearly marked estimated metrics.
- The report includes "When fixed workflow is better".
- The report includes "When autonomous agent is better".
- The report includes "Cost of extra autonomy".
- The report links or references the two underlying reports.

## Open Questions

- Q05: exact spend estimation.
- Q08: raw prompt and trace visibility.
