# Conventions

## Project Type

This is expected to become a small CLI-first developer tool. The implementation stack is not approved yet.

## Naming

- Use lowercase kebab-case for markdown spec filenames.
- Use explicit report names matching the BRD:
  - `fixed-review.md`
  - `agent-review.md`
  - `comparison.md`
- Use clear domain terms:
  - `fixed workflow`
  - `autonomous agent`
  - `merge readiness`
  - `evidence`
  - `tool trace`

## Documentation

- Every non-trivial feature must have a spec in `specs/`.
- Open decisions must be recorded in `docs/open-questions.md`.
- Guesses must be tagged `[assumption]` or `[inferred - confirm]`.

## Future Implementation Expectations

- Keep GitHub access behind a small adapter.
- Keep LLM access behind a provider interface.
- Keep report generation deterministic where possible.
- Store intermediate traces separately from final human-readable reports.
- Avoid embedding secrets in source files, fixtures, reports, or logs.

## Test Expectations

- Use local fixtures for pull request metadata, file diffs, commits, and comments.
- Include tests that verify both approaches process the same PR input.
- Include tests that verify all three report files are generated.
- Include tests for failure cases such as invalid PR URL, missing token, and rate limit responses.
