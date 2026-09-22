@echo off
setlocal
set PORT=3000
set GATEWAY_PORT=9010
echo Arret du serveur EJAH DEV (port %PORT%) et de la gateway Python (port %GATEWAY_PORT%)...

set FOUND=0
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /C:":%PORT% " ^| findstr LISTENING') do (
    set FOUND=1
    taskkill /F /PID %%P >nul 2>&1
)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /C:":%GATEWAY_PORT% " ^| findstr LISTENING') do (
    set FOUND=1
    taskkill /F /PID %%P >nul 2>&1
)

if "%FOUND%"=="1" (
    echo Arrete.
) else (
    echo Rien n'etait lance sur les ports %PORT%/%GATEWAY_PORT% - rien a faire.
)

endlocal
exit /b 0
