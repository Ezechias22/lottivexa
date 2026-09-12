$ErrorActionPreference = 'Stop'
$Project = Split-Path -Parent $MyInvocation.MyCommand.Path
$PageFile = Join-Path $Project 'apps\master-admin\app\page.tsx'
if (-not (Test-Path $PageFile)) { throw 'Master Admin page.tsx pa jwenn.' }
$Source = Get-Content $PageFile -Raw

if ($Source -notmatch "tenant-manager") {
  $Source = $Source.Replace(
    "import SystemHealthDashboard from'./system-health-dashboard';",
    "import SystemHealthDashboard from'./system-health-dashboard';import TenantManager from'./tenant-manager';"
  )
}

$OldTable = "</form><Table rows={data??[]} columns={['slug','legalName','status','createdAt']}"
$NewTable = "</form><TenantManager tenants={data??[]} request={request} reload={()=>load('Tenants')}/><Table rows={data??[]} columns={['slug','legalName','status','createdAt']}"
if ($Source -notmatch 'TenantManager tenants=') { $Source = $Source.Replace($OldTable, $NewTable) }
if ($Source -notmatch 'TenantManager tenants=') { throw 'Enstalè a pa jwenn tablo Clients lan; pa fè commit.' }

Set-Content -Path $PageFile -Value $Source -Encoding UTF8
Write-Host 'Jesyon konple tenant ak modpas la enstale.' -ForegroundColor Green
