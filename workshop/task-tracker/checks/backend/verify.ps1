param([Parameter(Mandatory)][string]$Repo)

$ErrorActionPreference = 'Stop'
$totalChecks = 10
$repoPath = (Resolve-Path $Repo).Path
$checksDir = Join-Path $repoPath 'src\test\java\com\workshop\tasktracker\checks'
$compiledDir = Join-Path $repoPath 'target\test-classes\com\workshop\tasktracker\checks'
$reportsDir = Join-Path $repoPath 'target\surefire-reports'
$hiddenClass = 'com.workshop.tasktracker.checks.HiddenChecks'

$passed = 0
$existing = 'FAIL'

try {
    if (Test-Path $reportsDir) { Remove-Item $reportsDir -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $checksDir | Out-Null
    Copy-Item (Join-Path $PSScriptRoot 'HiddenChecks.java') $checksDir -Force

    Push-Location $repoPath
    try {
        # HiddenChecks does not match surefire's default name patterns, so include it explicitly
        & mvn -q test '-Dtest=*Test,*Tests,HiddenChecks' '-Dsurefire.failIfNoSpecifiedTests=false' *> $null
    } finally {
        Pop-Location
    }

    $cases = @()
    foreach ($file in Get-ChildItem $reportsDir -Filter 'TEST-*.xml' -ErrorAction SilentlyContinue) {
        $cases += ([xml](Get-Content $file.FullName -Raw)).testsuite.testcase
    }
    $cases = @($cases | Where-Object { $_ })

    $hidden = @($cases | Where-Object { $_.classname -eq $hiddenClass })
    $others = @($cases | Where-Object { $_.classname -ne $hiddenClass })

    $passed = @($hidden | Where-Object { -not ($_.failure -or $_.error) }).Count
    $othersFailed = @($others | Where-Object { $_.failure -or $_.error }).Count
    if ($others.Count -gt 0 -and $othersFailed -eq 0) { $existing = 'PASS' }
} catch {
    $passed = 0
    $existing = 'FAIL'
} finally {
    if (Test-Path $checksDir) { Remove-Item $checksDir -Recurse -Force }
    if (Test-Path $compiledDir) { Remove-Item $compiledDir -Recurse -Force }
}

Write-Output "Hidden checks: $passed / $totalChecks passed · Existing tests: $existing"
exit 0
