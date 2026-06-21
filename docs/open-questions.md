# Open Questions Registry

Decisions recorded 2026-06-21 during build kickoff (Node/JS stack, fixtures-first, Gemini provider, build-together learning mode).

| ID | Status | Question | Impact | Decision / Current Assumption |
| --- | --- | --- | --- | --- |
| Q01 | RESOLVED | Which implementation stack should be used? | High | Node.js + JavaScript, CLI-first. |
| Q02 | RESOLVED | Which LLM provider and model tiers should be used? | High | Google Gemini via Google AI Studio API key, accessed behind a provider interface with a deterministic mock provider for offline/test runs. |
| Q03 | RESOLVED | Should live GitHub API access be required for v1, or should fixtures be the default? | High | Fixtures-first for v1. Live GitHub deferred to a later phase. |
| Q04 | RESOLVED | What exact rubric defines merge readiness? | High | 6 dimensions: correctness, tests, security, maintainability, operations, documentation. Status roll-up: any `critical`→`blocked`; any `high`→`needs human review`; only `medium`/`low`→`ready with minor issues`; none→`ready`. |
| Q05 | RESOLVED | How should spend be measured if provider APIs do not return exact costs? | Medium | Record tokens (exact from provider when available, else estimate at ~4 chars/token) and multiply by a per-model `pricing` table. Mock provider priced at 0. |
| Q06 | OPEN | Should the autonomous agent be allowed to inspect files outside the PR diff? | High | [assumption] Allow only PR metadata and diff in v1 unless explicitly configured. |
| Q07 | OPEN | What is the maximum acceptable runtime for each mode? | Medium | [assumption] Fixed workflow should be faster and bounded; autonomous mode should have strict max steps. |
| Q08 | RESOLVED | Should reports include raw prompts and tool traces? | Medium | Reports include a summarized stage/action log. Raw prompts + responses are written to `reports/traces/*.json` only when a `--trace` flag is passed. |
| Q09 | OPEN | Should the tool post results back to GitHub? | Low | [assumption] No for initial version. |
| Q10 | RESOLVED | Is this intended as a library, CLI, web UI, or all of these? | Medium | CLI first; web UI out of scope for v1. |
