@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0.."
set PORT=3002
call npm run build
if errorlevel 1 (
    echo.
    echo La construction a echoue - arret.
    pause
    exit /b 1
)
npm run start
