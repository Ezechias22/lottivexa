$ErrorActionPreference = 'Stop'
$Source = Split-Path -Parent $MyInvocation.MyCommand.Path
$Project = Join-Path $env:USERPROFILE 'Documents\LOTTIVEXA'
if (!(Test-Path -LiteralPath (Join-Path $Project '.git'))) { throw "Pwojè Git la pa jwenn nan $Project" }
foreach ($required in @('apps\mobile\pubspec.yaml','apps\merchant-web\package.json','services\api\package.json')) {
  if (!(Test-Path -LiteralPath (Join-Path $Source $required))) { throw "Fichye obligatwa manke: $required" }
}
$before = @(git -C $Project status --porcelain)
if ($before.Count -gt 0) { throw 'Gen chanjman lokal. Pa gen fichye ki kopye pou pwoteje travay ou.' }
robocopy $Source $Project /E /XD .git node_modules .next build dist .dart_tool /XF .env .env.local .env.development .env.production .env.test | Out-Host
if ($LASTEXITCODE -ge 8) { throw 'Kopi fichye yo echwe.' }
Set-Location $Project
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw 'pnpm install echwe.' }
pnpm --filter @lottivexa/database generate
if ($LASTEXITCODE -ne 0) { throw 'Prisma generate echwe.' }
pnpm --filter @lottivexa/api test -- --run
if ($LASTEXITCODE -ne 0) { throw 'Tès API echwe.' }
pnpm --filter @lottivexa/api build
if ($LASTEXITCODE -ne 0) { throw 'Build API echwe.' }
pnpm --filter @lottivexa/tenant-web build
if ($LASTEXITCODE -ne 0) { throw 'Build tenant echwe.' }
pnpm --filter @lottivexa/merchant-web test -- --run
if ($LASTEXITCODE -ne 0) { throw 'Tès merchant echwe.' }
pnpm --filter @lottivexa/merchant-web build
if ($LASTEXITCODE -ne 0) { throw 'Build merchant echwe.' }
pnpm --filter @lottivexa/master-admin build
if ($LASTEXITCODE -ne 0) { throw 'Build master admin echwe.' }
git add -A
git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Git diff --check echwe.' }
$files = @(git diff --cached --name-only)
if ($files.Count -gt 0) {
  git commit -m 'Improve account controls and optional Redis health'
  if ($LASTEXITCODE -ne 0) { throw 'Commit echwe.' }
  git push origin main
  if ($LASTEXITCODE -ne 0) { throw 'Push echwe; commit la rete lokal.' }
}
git status -sb
Write-Host 'Fini. Pa gen APK build nan script sa a.' -ForegroundColor Green
