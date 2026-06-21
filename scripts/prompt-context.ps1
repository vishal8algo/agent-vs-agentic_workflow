$ErrorActionPreference = "Stop"

function Write-IfExists {
    param([string]$Path)

    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        Write-Output "# === $Path ==="
        Get-Content -LiteralPath $Path
        Write-Output ""
    }
}

Write-IfExists "AGENTS.md"
Write-IfExists "agent-reference.md"
Write-IfExists "conventions.md"
Write-IfExists "docs/product.md"
Write-IfExists "docs/open-questions.md"
