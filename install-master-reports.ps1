$ErrorActionPreference = 'Stop'
$Project = Split-Path -Parent $MyInvocation.MyCommand.Path
$PageFile = Join-Path $Project 'apps\master-admin\app\page.tsx'

if (-not (Test-Path $PageFile)) {
  throw 'Fichye apps\master-admin\app\page.tsx pa jwenn. Verifye ZIP la nan rasin LOTTIVEXA.'
}

$Source = Get-Content $PageFile -Raw

if ($Source -notmatch "reports-dashboard") {
  $Source = $Source.Replace(
    "import{FormEvent,useEffect,useState}from'react';",
    "import{FormEvent,useEffect,useState}from'react';import ReportsDashboard from'./reports-dashboard';"
  )
}

if ($Source -notmatch "system-health-dashboard") {
  $Source = $Source.Replace(
    "import ReportsDashboard from'./reports-dashboard';",
    "import ReportsDashboard from'./reports-dashboard';import SystemHealthDashboard from'./system-health-dashboard';"
  )
}

$Source = $Source.Replace(
  "(next==='Tenants'||next==='Subscriptions')&&!plans.length",
  "(next==='Tenants'||next==='Subscriptions'||next==='Reports')&&!plans.length"
)

$OldReports = @'
{view==='Reports'&&data&&<pre className="panel">{JSON.stringify(data,null,2)}</pre>}
'@
$NewReports = @'
{view==='Reports'&&data&&<ReportsDashboard data={data} plans={plans}/>}
'@
$Source = $Source.Replace($OldReports.Trim(), $NewReports.Trim())

$OldHealth = @'
{view==='Health'&&data&&<pre className="panel">{JSON.stringify(data,null,2)}</pre>}
'@
$NewHealth = @'
{view==='Health'&&data&&<SystemHealthDashboard data={data}/>}
'@
$Source = $Source.Replace($OldHealth.Trim(), $NewHealth.Trim())

$OldTenantActions = @'
<div className="actions"><button onClick={()=>action(`/tenants/${r.id}/activate`)}>Activate</button><button className="danger" onClick={()=>action(`/tenants/${r.id}/suspend`)}>Suspend</button></div>
'@
$NewTenantActions = @'
<div className="actions"><button onClick={()=>action(`/tenants/${r.id}/activate`)}>Activate</button><button onClick={()=>{const temporaryPassword=prompt('Nouvo modpas tanporè tenant owner la (omwen 12 karaktè)');if(temporaryPassword&&temporaryPassword.length>=12&&confirm(`Retabli modpas owner ${r.legalName}?`))void action(`/tenants/${r.id}/reset-owner-password`,'POST',{temporaryPassword});else if(temporaryPassword)alert('Modpas la dwe gen omwen 12 karaktè.')}}>Reset owner password</button><button className="danger" onClick={()=>action(`/tenants/${r.id}/suspend`)}>Suspend</button></div>
'@
if ($Source -notmatch 'reset-owner-password') {
  $Source = $Source.Replace($OldTenantActions.Trim(), $NewTenantActions.Trim())
}

if ($Source -notmatch 'ReportsDashboard data=') {
  throw 'Enstalè a pa jwenn ansyen blòk Reports la. Pa fè git commit; voye page.tsx aktyèl la.'
}
if ($Source -notmatch 'SystemHealthDashboard data=') {
  throw 'Enstalè a pa jwenn ansyen blòk Health la. Pa fè git commit; voye page.tsx aktyèl la.'
}
if ($Source -notmatch 'reset-owner-password') {
  throw 'Enstalè a pa jwenn aksyon tenant yo pou ajoute reset modpas la.'
}

Set-Content -Path $PageFile -Value $Source -Encoding UTF8
Write-Host 'Enstalasyon konplè: Reports, Health, lang ak reset modpas yo pare.' -ForegroundColor Green
