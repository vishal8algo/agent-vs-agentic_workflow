$ErrorActionPreference = "Stop"

$date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd")
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$out = "docs/snapshots/state-$date.md"
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# Project snapshot - $timestamp")
$lines.Add("")
$lines.Add("## Specs")
if (Test-Path -LiteralPath "specs") {
    Get-ChildItem -LiteralPath "specs" -File -Filter "*.md" | Sort-Object Name | ForEach-Object { $lines.Add($_.FullName) }
}
$lines.Add("")
$lines.Add("## Docs")
if (Test-Path -LiteralPath "docs") {
    Get-ChildItem -LiteralPath "docs" -Recurse -File -Filter "*.md" | Sort-Object FullName | ForEach-Object { $lines.Add($_.FullName) }
}
$lines.Add("")
$lines.Add("## Recent commits")
try {
    $commits = git log -10 --pretty=format:'%h %s' 2>$null
    if ($commits) {
        $commits | ForEach-Object { $lines.Add($_) }
    } else {
        $lines.Add("(not a git repository)")
    }
} catch {
    $lines.Add("(not a git repository)")
}
$lines.Add("")
$lines.Add("## Open OQR items")
$openItems = Select-String -LiteralPath "docs/open-questions.md" -Pattern '^\| Q[0-9]+ \| OPEN ' -ErrorAction SilentlyContinue
if ($openItems) {
    $openItems | ForEach-Object { $lines.Add($_.Line) }
} else {
    $lines.Add("(none open)")
}

Set-Content -LiteralPath $out -Value $lines
Write-Host "wrote $out"
