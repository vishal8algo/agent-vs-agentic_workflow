$ErrorActionPreference = "Stop"

param(
    [Parameter(Mandatory = $true)]
    [string]$Name
)

$existing = Get-ChildItem -LiteralPath "specs" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^[0-9]+-' } |
    ForEach-Object { [int]($_.Name -replace '^([0-9]+)-.*$', '$1') }

$next = 1
if ($existing) {
    $next = ($existing | Measure-Object -Maximum).Maximum + 1
}

$prefix = "{0:D2}" -f $next
$dest = "specs/$prefix-$Name.md"
Copy-Item -LiteralPath "specs/_template.md" -Destination $dest
(Get-Content -LiteralPath $dest) -replace '\[Feature Name\]', $Name | Set-Content -LiteralPath $dest

Write-Host "wrote $dest"
