# Agent Reference

## Important Paths

- `docs/product.md` - BRD-derived product requirements.
- `docs/architecture.md` - proposed technical architecture.
- `docs/api-contract.md` - CLI inputs, environment, and output contract.
- `docs/open-questions.md` - unresolved decisions and assumptions.
- `docs/roadmap.md` - staged delivery plan.
- `specs/01-pr-review-tool.md` - umbrella feature spec.
- `specs/02-fixed-workflow-review.md` - fixed workflow spec.
- `specs/03-autonomous-agent-review.md` - autonomous agent spec.
- `specs/04-comparison-report.md` - comparison report spec.
- `reports/` - expected generated report output directory once implemented.

## Expected Outputs

The tool must eventually generate:

```txt
reports/fixed-review.md
reports/agent-review.md
reports/comparison.md
```

## Commands

No implementation commands exist yet. Setup scripts are available for documentation workflow:

PowerShell on this machine:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prompt-context.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/snapshot.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/scaffold-spec.ps1 <feature-name>
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/scaffold-cr.ps1 <change-name>
```

Unix or Git-Bash environments:

```bash
bash scripts/check.sh
bash scripts/prompt-context.sh
bash scripts/snapshot.sh
bash scripts/scaffold-spec.sh <feature-name>
bash scripts/scaffold-cr.sh <change-name>
```

## Anti-Patterns

- Implementing before `spec approved`.
- Letting the autonomous agent and fixed workflow use different source data.
- Comparing report quality without also comparing latency, token/cost estimate, predictability, and debuggability.
- Depending on live GitHub or live model calls in tests without fixtures.
- Producing opaque markdown that cannot explain how the conclusion was reached.
