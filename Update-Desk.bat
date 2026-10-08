@echo off
setlocal
cd /d "%~dp0"
echo =====================================
echo  Omnidite Desk - Update from GitHub
echo =====================================
where git >nul 2>nul
if errorlevel 1 (
  echo ERROR: Git is not installed or is not on PATH.
  echo Install Git for Windows and retry.
  pause
  exit /b 1
)
if not exist ".git" (
  echo ERROR: This folder is not a Git clone.
  echo Clone https://github.com/BULLS192/Omnidite-Desk first.
  pause
  exit /b 1
)
echo Pulling latest changes from origin/main...
git pull --ff-only origin main
if errorlevel 1 (
  echo.
  echo Update stopped. Your local files were not force-reset.
  echo Review the Git error above before trying again.
  pause
  exit /b 1
)
echo.
echo Code is up to date.
echo Open chrome://extensions, click Reload for Omnidite Desk,
echo then refresh any existing dashboard tabs.
echo.
pause
