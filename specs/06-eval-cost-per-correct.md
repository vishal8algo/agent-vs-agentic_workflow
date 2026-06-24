# Evaluation and Cost per Correct Answer

Status: Draft - implementation blocked until `spec approved`

## Goal

Score each review run for correctness with an LLM-as-judge, attach the score to
its Langfuse trace, and report **cost per correct answer** for the fixed
workflow vs the autonomous agent.

## Context

Read:

- `AGENTS.md`
- `docs/product.md`
- `docs/open-questions.md`
- `specs/04-comparison-report.md`
- `specs/05-observability-tracing.md`
- `src/review/rubric.js`, `src/report/compare.js`, `src/metrics.js`

## In Scope

- An LLM-as-judge that grades a completed review against a rubric and returns a
  structured verdict: `correct` (bool) + 0..1 score + short justification.
- Attaching the judge score to the run's Langfuse trace (Scores API).
- Computing cost-per-correct = total estimated cost / number of runs judged
  correct, per mode, across an evaluation set.
- An evaluation set larger than one PR (cost-per-correct is meaningless on a
  single task) — either multiple PR fixtures or repeated sampling.
- Surfacing the metric in `reports/comparison.md` and/or a new eval report.

## Out of Scope

- Human labeling pipelines.
- Training or fine-tuning any model.
- Treating the judge as ground truth without disclosing its limitations.

## User Flow

1. User runs an evaluation over the fixture set (`--eval` or a dedicated
   script).
2. For each PR and mode, the tool runs the review, then the judge scores it.
3. Scores post to Langfuse; the tool prints/writes cost-per-correct per mode.

## Functional Requirements

- The judge prompt is bounded, rubric-based, temperature 0, and returns strict
  JSON (reuse the fail-soft JSON parsing).
- The judge runs as its own provider call (its cost is tracked separately and
  NOT counted in the reviewer's cost-per-answer numerator).
- Correctness is a disclosed approximation (judge model + rubric), never
  presented as objective truth.
- Cost-per-correct is computed over the whole eval set, per mode, with the
  counts shown (e.g., "$0.012 over 5 correct of 6 runs").
- The eval is reproducible: same inputs + same judge model + temperature 0.

## Data and Interfaces

- New module: `src/eval/judge.js` (judge prompt + scoring) and an eval runner.
- Eval set: additional fixtures under `fixtures/` OR a sampling count.
- Judge model is configurable (`--judge-model`), defaulting to a capable model
  distinct from the one under test where possible.

## Acceptance Criteria

- Each review run gets a judge score visible on its Langfuse trace.
- The eval output reports cost-per-correct-answer for both modes with the
  underlying correct/total counts.
- The judge's role and limitations are stated in the report.
- Running the eval twice yields the same scores (determinism).

## Verification

- Mock reviews + judge (mock) produce deterministic scores and a finite
  cost-per-correct.
- Gemini reviews + judge produce plausible scores; numerator/denominator math
  checks out by hand for a small set.

## Open Questions

- Q13: evaluation set design — how many PR fixtures, or sample N per PR?
- Q14: judge model choice and how to mitigate self-preference bias.
- Q15: how to treat "needs human review" verdicts in correctness scoring.
