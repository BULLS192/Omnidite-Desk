# Run once on Windows to register the dashboard's one-click updater.
# Compiles native-host/DeskNativeHost.cs locally with Windows PowerShell + .NET Framework.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$hostFolder = $PSScriptRoot
$manifestPath = Join-Path $root 'manifest.json'
if (-not (Test-Path (Join-Path $root '.git'))) { throw "Install from the GitHub clone, not a ZIP." }
if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) { throw "Git for Windows must be installed." }
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
if (-not $manifest.key) { throw "Extension manifest public key is missing." }
# Chrome derives the stable extension ID from the SHA256 of its public key.
$bytes = [Convert]::FromBase64String($manifest.key)
$sha = [System.Security.Cryptography.SHA256]::Create()
$hash = $sha.ComputeHash($bytes)
$chars = New-Object System.Text.StringBuilder
for ($i = 0; $i -lt 16; $i++) {
  [void]$chars.Append([char](97 + ($hash[$i] -shr 4)))
  [void]$chars.Append([char](97 + ($hash[$i] -band 15)))
}
$id = $chars.ToString()
$exe = Join-Path $hostFolder 'OmniditeDeskHost.exe'
$source = Join-Path $hostFolder 'DeskNativeHost.cs'
if (Test-Path $exe) { Remove-Item $exe -Force }
Add-Type -Path $source -ReferencedAssemblies @('System.Web.Extensions.dll') -OutputAssembly $exe -OutputType ConsoleApplication -ErrorAction Stop
if (-not (Test-Path $exe)) { throw "Native helper compilation did not produce an executable." }
$hostManifest = @{
  name = 'com.omnidite.desk_updater'
  description = 'Omnidite Desk local-only Git updater'
  path = $exe
  type = 'stdio'
  allowed_origins = @("chrome-extension://$id/")
}
$jsonPath = Join-Path $hostFolder 'com.omnidite.desk_updater.json'
$hostManifest | ConvertTo-Json -Depth 5 | Set-Content -Path $jsonPath -Encoding UTF8
# Windows PowerShell 5.1 Set-Content UTF8 adds a BOM, which JSON manifests may reject.
[System.IO.File]::WriteAllText($jsonPath, ($hostManifest | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding($false)))
$reg = 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.omnidite.desk_updater'
New-Item -Path $reg -Force | Out-Null
Set-Item -Path $reg -Value $jsonPath
Write-Host ""
Write-Host "Omnidite Desk one-click updater registered!" -ForegroundColor Green
Write-Host "Extension ID: $id"
Write-Host "Refresh chrome://extensions, open a new tab, then click Updates."
Write-Host "No administrator rights, server, or Vercel deployment required."
