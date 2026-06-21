# Product Requirements - PR Review Agentic Workflow Demo

## Objective

Build a small practical tool that demonstrates the difference between a fixed agentic workflow and an autonomous AI agent by applying both to the same SDLC task: reviewing a GitHub pull request and generating merge-readiness reports.

## Primary Users

- Software developers
- Team leads
- Engineering managers
- Developers learning GenAI and agentic systems

## Secondary Users

- QA team members
- DevOps team members
- Technical reviewers

## Core Use Case

A user provides a GitHub Pull Request URL. The system reviews the PR in two modes:

1. Fixed workflow: predefined review steps with controlled LLM usage.
2. Autonomous agent: goal-driven review where the agent chooses what tools and steps to use.

The system generates:

```txt
reports/fixed-review.md
reports/agent-review.md
reports/comparison.md
```

## Learning Outcomes

The reports should help users understand:

- When a fixed workflow is better.
- When an autonomous agent is better.
- What autonomy costs in latency, spend, predictability, and debuggability.
- How tool traces and decision logs differ between the two approaches.

## Functional Requirements

- Accept a GitHub PR URL as input.
- Retrieve or load equivalent PR data for both review modes.
- Generate a fixed workflow review report.
- Generate an autonomous agent review report.
- Generate a comparison report.
- Show evidence behind merge-readiness conclusions.
- Capture operational metrics for both modes.
- Keep implementation blocked until `spec approved`.

## Non-Goals

- Replacing human code review.
- Automatically merging pull requests.
- Posting comments to GitHub in the initial version.
- Supporting every Git hosting platform in the initial version.
- Building a full web application unless later approved by spec.

## Success Criteria

- A user can run the same PR through both review approaches.
- All three reports are written to `reports/`.
- The comparison clearly distinguishes workflow structure, autonomy, latency, cost, predictability, and debuggability.
- The demo is usable for internal team training without requiring code changes.

## Source BRD Status

Initial BRD has enough detail for spec drafting, but several implementation decisions remain open in `docs/open-questions.md`.
