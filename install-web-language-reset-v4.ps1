$ErrorActionPreference = 'Stop'
$Project = Split-Path -Parent $MyInvocation.MyCommand.Path
$Pages = @(
  'apps\master-admin\app\page.tsx',
  'apps\tenant-web\app\page.tsx',
  'apps\merchant-web\app\page.tsx'
)
$OldUrl = "'http://localhost:3003/reset-password'"
$ProductionUrl = "'https://lottivexa-public-site.onrender.com/reset-password'"

foreach ($RelativePath in $Pages) {
  $File = Join-Path $Project $RelativePath
  if (-not (Test-Path $File)) { throw "Fichye pa jwenn: $RelativePath" }
  $Source = Get-Content $File -Raw
  $Source = $Source.Replace($OldUrl, $ProductionUrl)
  Set-Content -Path $File -Value $Source -Encoding UTF8
}

Write-Host 'Lyen modpas la korije epi meni lang lan deplase anle.' -ForegroundColor Green
