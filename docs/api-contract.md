# API and CLI Contract Draft

Status: Draft. Implementation blocked pending `spec approved`.

## CLI Contract

Proposed command:

```bash
pr-review-demo review <github-pr-url> [options]
```

Proposed options:

```bash
--mode both|fixed|agent
--out reports
--fixture <path>
--max-agent-steps <number>
--model <name>
--dry-run
--verbose
```

## Inputs

- GitHub pull request URL.
- GitHub token via environment variable for live mode. Proposed: `GITHUB_TOKEN`.
- LLM API key via environment variable. Exact provider and variable name are open.
- Optional fixture path for offline/repeatable runs.

## Outputs

When run in `both` mode:

```txt
reports/fixed-review.md
reports/agent-review.md
reports/comparison.md
```

Optional trace outputs are proposed but not approved:

```txt
reports/traces/fixed-trace.json
reports/traces/agent-trace.json
```

## Exit Codes

- `0` - reports generated successfully.
- `1` - invalid input or configuration.
- `2` - GitHub data retrieval failed.
- `3` - LLM provider failed.
- `4` - report generation failed.

## Report Contract

Each review report should include:

- PR identity and summary.
- Review method used.
- Findings grouped by severity.
- Evidence references.
- Merge-readiness recommendation.
- Known limitations.
- Metrics summary.

The comparison report should include:

- Side-by-side outcome comparison.
- Latency comparison.
- Estimated spend comparison.
- Predictability comparison.
- Debuggability comparison.
- Recommended use cases for each approach.
