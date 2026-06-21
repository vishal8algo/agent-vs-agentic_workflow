$ErrorActionPreference = "Stop"

param(
    [Parameter(Mandatory = $true)]
    [string]$Name
)

$existing = Get-ChildItem -LiteralPath "specs" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^cr-[0-9]+-' } |
    ForEach-Object { [int]($_.Name -replace '^cr-([0-9]+)-.*$', '$1') }

$next = 1
if ($existing) {
    $next = ($existing | Measure-Object -Maximum).Maximum + 1
}

$prefix = "{0:D2}" -f $next
$dest = "specs/cr-$prefix-$Name.md"
Copy-Item -LiteralPath "specs/_change-request-template.md" -Destination $dest
$content = Get-Content -LiteralPath $dest
$content = $content -replace 'CR-NN', "CR-$prefix"
$content = $content -replace '\[short name\]', $Name
$content | Set-Content -LiteralPath $dest

Write-Host "wrote $dest"
