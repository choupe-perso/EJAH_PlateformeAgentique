@echo off
setlocal
set PORT=3000
set GATEWAY_PORT=9010

echo === EJAH DEV - redemarrage (port %PORT%, gateway Python port %GATEWAY_PORT%) ===
echo.
echo Arret eventuel du serveur en cours...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /C:":%PORT% " ^| findstr LISTENING') do (
    taskkill /F /PID %%P >nul 2>&1
)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /C:":%GATEWAY_PORT% " ^| findstr LISTENING') do (
    taskkill /F /PID %%P >nul 2>&1
)
echo (rien a faire si rien n'etait lance)
echo.
echo Demarrage de la gateway Python EJAH DEV...
start "EJAH - Gateway Python DEV (port %GATEWAY_PORT%)" "%~dp0_run_gateway.bat"
echo Demarrage du serveur EJAH DEV...
start "EJAH - DEV (port %PORT%)" "%~dp0_run.bat"

endlocal
exit /b 0
