$ErrorActionPreference = "Stop"

Write-Host "Checking project documentation scaffold..."

$requiredFiles = @(
    "AGENTS.md",
    "agent-reference.md",
    "conventions.md",
    "docs/product.md",
    "docs/architecture.md",
    "docs/api-contract.md",
    "docs/open-questions.md",
    "docs/roadmap.md",
    "specs/_template.md",
    "specs/_change-request-template.md",
    "specs/01-pr-review-tool.md",
    "specs/02-fixed-workflow-review.md",
    "specs/03-autonomous-agent-review.md",
    "specs/04-comparison-report.md"
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        throw "missing required file: $file"
    }
}

$searchFiles = @(
    "AGENTS.md",
    "agent-reference.md",
    "conventions.md"
)

$searchFiles += Get-ChildItem -LiteralPath "docs", "specs" -Recurse -File -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty FullName

$todoMatches = Select-String -Path $searchFiles -Pattern "TODO" -ErrorAction SilentlyContinue
if ($todoMatches) {
    throw "found TODO markers in documentation"
}

Write-Host "Documentation scaffold OK."
