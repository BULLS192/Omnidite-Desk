@echo off
setlocal
cd /d "%~dp0"
echo Omnidite Desk - One-time update-button setup
echo This registers a local helper for this Chrome extension only.
echo Uses your existing Git clone and Git for Windows. No admin rights required.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0native-host\install.ps1"
if errorlevel 1 (
 echo.
 echo Setup failed. Copy the PowerShell error and send it to ChatGPT.
 pause
 exit /b 1
)
echo.
echo Setup complete. Reload Omnidite Desk in chrome://extensions.
pause
