@echo off
setlocal
set PORT=3002
echo Arret du serveur EJAH PROD (port %PORT%)...

set FOUND=0
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /C:":%PORT% " ^| findstr LISTENING') do (
    set FOUND=1
    taskkill /F /PID %%P >nul 2>&1
)

if "%FOUND%"=="1" (
    echo Serveur arrete.
) else (
    echo Rien n'etait lance sur le port %PORT% - rien a faire.
)

endlocal
exit /b 0
