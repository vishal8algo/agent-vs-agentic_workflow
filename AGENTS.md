# PR Review Agentic Workflow Demo - Working Agreement

This project demonstrates the difference between a fixed agentic workflow and an autonomous AI agent for the same SDLC task: reviewing a GitHub pull request and producing a merge-readiness report.

## Product Guardrail

Implementation must not start until a human explicitly writes:

```txt
spec approved
```

Until then, only BRD review, technical specification creation, specification updates, clarification, and project setup artifacts are allowed.

## Workflow

1. Read this file, `agent-reference.md`, `conventions.md`, `docs/product.md`, and `docs/open-questions.md`.
2. Review the relevant spec before planning:
   - What is missing, contradictory, or under-specified?
   - What assumptions would implementation require?
   - Which open questions affect the work?
3. Update the spec or ask for clarification.
4. After `spec approved`, produce an implementation plan:
   - Files to create or modify
   - Approach
   - Verification steps
   - Remaining risks
5. Implement only after the plan is accepted.
6. Verify behavior with the project check script and focused manual checks.
7. Commit only when requested. The post-commit hook appends to `logs/history.md`.

## Scope Discipline

- Do not build features outside the approved spec.
- Do not add dependencies without calling them out in the plan.
- Do not contact external services in tests unless explicitly allowed by the spec.
- Prefer deterministic fixtures for repeatable comparison between the fixed workflow and autonomous agent.

## Current Phase

Spec drafting and project setup. Implementation is blocked pending `spec approved`.
