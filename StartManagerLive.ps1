param([switch]$CheckOnly,[ValidateRange(1024,65535)][int]$WebPort=5174)
$ErrorActionPreference='Stop'
$portal=$PSScriptRoot
$apiProcess=$null
$webProcess=$null
function Get-ProjectListener([int]$port,[string]$expectedPath) {
 $listeners=@(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
 if(!$listeners.Count){return $null}
 $owners=@($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
 if($owners.Count -ne 1){throw "Port $port has unexpected listeners. No process was stopped."}
 $process=Get-CimInstance Win32_Process -Filter "ProcessId=$($owners[0])"
 $normalized=([string]$process.CommandLine).Replace('/','\')
 $path=$expectedPath.Replace('/','\')
 if(!$process -or (!$normalized.Contains('"'+$path+'"') -and !$normalized.Contains(' '+$path+' '))){throw "Port $port belongs to another application. No process was stopped."}
 return $process
}
function Assert-ManagerApi([string]$url) {
 $health=Invoke-RestMethod $url -TimeoutSec 4
 if($health.service -ne 'customer360-local-manager' -or $health.database -ne 'JamunaCustomer360' -or $health.mockDatabase -ne $false -or $health.workersEnabled -ne $false){throw 'Existing service is not the expected LIVE Manager API with workers disabled.'}
}
function Wait-Ready([string]$url,[string]$identity) {
 $deadline=(Get-Date).AddSeconds(40)
 do {
  try {
   $r=Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 2
   if($r.StatusCode -eq 200 -and (!$identity -or $r.Content.Contains($identity))){return}
  } catch {}
  Start-Sleep -Milliseconds 500
 } while((Get-Date) -lt $deadline)
 throw "Service did not become ready: $url. Check logs in $portal\TestResults\Live."
}
try {
 Set-Location $portal
 $node=(Get-Command node.exe -ErrorAction Stop).Source
 $npm=Join-Path (Split-Path $node) 'node_modules/npm/bin/npm-cli.js'
 $dotnet=(Get-Command dotnet.exe -ErrorAction Stop).Source
 $dll=Join-Path $portal 'Server/bin/Debug/net10.0/ManagerServer.dll'
 $vite=Join-Path $portal 'node_modules/vite/bin/vite.js'
 $existingApi=Get-ProjectListener 7247 $dll
 $existingWeb=Get-ProjectListener $WebPort $vite
 if($existingApi){
  Assert-ManagerApi 'http://localhost:7247/health'
  $sources=@(Get-ChildItem (Join-Path $portal 'Server') -Recurse -Filter *.cs | Where-Object FullName -NotMatch '\\(bin|obj)\\')
  $sources+=@(Get-ChildItem (Join-Path $portal '../Api/src/Customer360.Api') -Recurse -Filter *.cs | Where-Object FullName -NotMatch '\\(bin|obj)\\')
  if((Get-Item $dll).LastWriteTimeUtc -gt $existingApi.CreationDate.ToUniversalTime() -or ($sources | Where-Object LastWriteTimeUtc -GT (Get-Item $dll).LastWriteTimeUtc)){
   throw 'The running Manager API is older than its source or build. Stop the previous Manager launcher, then run this launcher again. No process was stopped.'
  }
  Write-Host 'Reusing the existing LIVE Manager API on port 7247.'
 }
 if($existingWeb){
  $main=(Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$WebPort/manager/src/main.tsx" -TimeoutSec 4).Content
  if($main -notmatch '"VITE_MANAGER_MODE"\s*:\s*"LIVE"'){throw 'The existing Manager web server is not in LIVE mode. Close its original window before starting LIVE mode.'}
  Assert-ManagerApi "http://127.0.0.1:$WebPort/health"
  Write-Host "Reusing the existing LIVE Manager web portal on port $WebPort."
 }
 if(!(Test-Path node_modules/vite/bin/vite.js)) {
  & $node $npm ci
  if($LASTEXITCODE){throw 'npm ci failed'}
 }
 if(!$existingApi){
  & $dotnet build (Join-Path $portal 'Server/ManagerServer.csproj')
  if($LASTEXITCODE){throw 'Manager API build failed'}
 }
 $env:ASPNETCORE_ENVIRONMENT='Development'
 $env:Development__EnableMockDatabase='false'
 $env:Development__EnableMockAuth='false'
 $env:Development__EnableMockIntegrations='true'
 $env:Development__AllowLoopbackHttp='true'
 $env:Development__Port='7247'
 $env:Testing__AllowLoopbackHttp='false'
 $env:Workers__Enabled='false'
 $env:DevelopmentTls__PemPath=$null
 $env:DevelopmentTls__KeyPath=$null
 $env:Database__ExpectedServer='DESKTOP-BUDV4V7'
 $env:Database__ExpectedDatabase='JamunaCustomer360'
 $env:Database__Connections__MANAGER='Server=DESKTOP-BUDV4V7;Database=JamunaCustomer360;Integrated Security=True;Encrypt=False;TrustServerCertificate=True;'
 $env:Database__ExpectedUsers__MANAGER='Customer360_LocalManager'
 $env:Database__AllowUnencryptedLocalDevelopment='true'
 $env:Database__LiveValidationApproved='true'
 $env:Database__IdentityVerificationReferences__MANAGER='Local Manager host verifies SQL USER_NAME and Manager role after EXECUTE AS USER on every connection.'
 $env:VITE_MANAGER_MODE='LIVE'
 $env:VITE_ENABLE_DEVELOPMENT_LOGIN='false'
 $env:VITE_MANAGER_API_TARGET='http://localhost:7247'
 $logs=New-Item -ItemType Directory -Force (Join-Path $portal 'TestResults/Live')
 if(!$existingApi){$apiProcess=Start-Process $dotnet -ArgumentList @('"'+$dll+'"','--contentRoot','"'+(Join-Path $portal 'Server')+'"') -WorkingDirectory $portal -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs 'api.stdout.log') -RedirectStandardError (Join-Path $logs 'api.stderr.log')}
 Wait-Ready 'http://localhost:7247/health' 'customer360-local-manager'
 if(!$existingWeb){$webProcess=Start-Process $node -ArgumentList @('"'+$vite+'"','--host','127.0.0.1','--port',[string]$WebPort,'--strictPort') -WorkingDirectory $portal -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs 'web.stdout.log') -RedirectStandardError (Join-Path $logs 'web.stderr.log')}
 Wait-Ready "http://127.0.0.1:$WebPort/manager/pending" ''
 Wait-Ready "http://127.0.0.1:$WebPort/health" 'customer360-local-manager'
 Write-Host 'Manager Portal is LIVE against JamunaCustomer360.' -ForegroundColor Green
 Write-Host 'Email: manager@local.test'
 Write-Host 'Password: Manager@Test123!'
 Write-Host 'Local test login only. SQL requests run as Customer360_LocalManager; workers are OFF.'
 if($CheckOnly){Write-Host 'PASS: Manager API, frontend and LIVE API proxy are ready.'}
 else {
  Start-Process "http://127.0.0.1:$WebPort/manager/pending"
  if($existingApi -and $existingWeb){Read-Host 'Press Enter to close this launcher. The existing Manager services will stay running'}
  else {Read-Host 'Keep this window open. Press Enter to stop services started here; reused services stay running'}
 }
} finally {
 foreach($process in @($webProcess,$apiProcess)) {
  if($process -and !$process.HasExited){Stop-Process -Id $process.Id -ErrorAction SilentlyContinue}
 }
}



