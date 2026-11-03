param(
    [Parameter(Mandatory)][string]$Overlay,
    [Parameter(Mandatory)][string]$Repo
)

$ErrorActionPreference = 'Stop'
$overlayPath = (Resolve-Path $Overlay).Path
$repoPath = (Resolve-Path $Repo).Path

foreach ($file in Get-ChildItem $overlayPath -Recurse -File) {
    $relativePath = $file.FullName.Substring($overlayPath.Length).TrimStart('\', '/')
    $target = Join-Path $repoPath $relativePath
    New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
    Copy-Item $file.FullName $target -Force
}

Write-Output "Applied overlay $overlayPath to $repoPath"
