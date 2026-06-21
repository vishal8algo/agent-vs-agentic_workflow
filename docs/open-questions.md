# Open Questions Registry

| ID | Status | Question | Impact | Current Assumption |
| --- | --- | --- | --- | --- |
| Q01 | OPEN | Which implementation stack should be used? | High | [assumption] CLI-first Node.js or Python would both fit; choose after review. |
| Q02 | OPEN | Which LLM provider and model tiers should be used? | High | [assumption] Keep provider abstract and configurable. |
| Q03 | OPEN | Should live GitHub API access be required for v1, or should fixtures be the default? | High | [assumption] Support both, with fixtures used for tests and training demos. |
| Q04 | OPEN | What exact rubric defines merge readiness? | High | [assumption] Use correctness, tests, security, maintainability, operations, and documentation. |
| Q05 | OPEN | How should spend be measured if provider APIs do not return exact costs? | Medium | [assumption] Record tokens when available and estimate cost from configured pricing. |
| Q06 | OPEN | Should the autonomous agent be allowed to inspect files outside the PR diff? | High | [assumption] Allow only PR metadata and diff in v1 unless explicitly configured. |
| Q07 | OPEN | What is the maximum acceptable runtime for each mode? | Medium | [assumption] Fixed workflow should be faster and bounded; autonomous mode should have strict max steps. |
| Q08 | OPEN | Should reports include raw prompts and tool traces? | Medium | [assumption] Include summarized traces in reports and raw traces in separate files if enabled. |
| Q09 | OPEN | Should the tool post results back to GitHub? | Low | [assumption] No for initial version. |
| Q10 | OPEN | Is this intended as a library, CLI, web UI, or all of these? | Medium | [assumption] CLI first; web UI out of scope for v1. |
