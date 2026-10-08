$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Install Git for Windows first: https://git-scm.com/download/win' }
if (-not (Test-Path '.git')) { git init -b main; if ($LASTEXITCODE -ne 0) { throw 'git init failed' } }
$remote = (git remote get-url origin 2>$null)
if ($LASTEXITCODE -ne 0) { git remote add origin https://github.com/BULLS192/Omnidite-Desk.git }
elseif ($remote -ne 'https://github.com/BULLS192/Omnidite-Desk.git') { throw "Unexpected origin remote $remote — review before proceeding" }
git branch -M main
# Publish only source; .gitignore protects local backups.
git add .gitignore .github README.md app.js background.js icons index.html manifest.json sidepanel.html styles.css tools publish-to-github.ps1 update-from-github.ps1
if ($LASTEXITCODE -ne 0) { throw 'git add failed' }
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m 'Build Omnidite Desk v0.2 modular dashboard'
  if ($LASTEXITCODE -ne 0) { throw 'Commit failed. Configure your Git name and email, then retry.' }
}
Write-Host 'Publishing to GitHub. This never force-pushes.'
git push -u origin main
if ($LASTEXITCODE -ne 0) { throw 'Push rejected or authentication failed. Check your GitHub access and current remote branch, then resolve manually.' }
Write-Host 'Published: https://github.com/BULLS192/Omnidite-Desk'