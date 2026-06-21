$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path "logs" | Out-Null
$today = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd")

try {
    $hash = git rev-parse --short HEAD 2>$null
    if (-not $hash) { $hash = "no-git" }
} catch {
    $hash = "no-git"
}

try {
    $subject = git log -1 --pretty=%s 2>$null
    if (-not $subject) { $subject = "manual-entry" }
} catch {
    $subject = "manual-entry"
}

Add-Content -LiteralPath "logs/history.md" -Value "- $today $hash $subject"
