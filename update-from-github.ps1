$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
if (-not (Test-Path '.git')) { throw 'Git is not initialized. Run publish-to-github.ps1 first, or clone the repository.' }
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw 'Update failed. Resolve local modifications or divergent history manually before retrying.' }
Write-Host 'Code updated. Reload Omnidite Desk from chrome://extensions and refresh your Chrome tabs.'