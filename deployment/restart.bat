@echo off
setlocal
set PORT=3000

echo === EJAH DEV - redemarrage (port %PORT%) ===
echo.
echo Arret eventuel du serveur en cours...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /C:":%PORT% " ^| findstr LISTENING') do (
    taskkill /F /PID %%P >nul 2>&1
)
echo (rien a faire si rien n'etait lance)
echo.
echo Demarrage du serveur EJAH DEV...
start "EJAH - DEV (port %PORT%)" "%~dp0_run.bat"

endlocal
exit /b 0
