@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0..\python\gateway"
set GATEWAY_PORT=9010
if not exist ".venv\Scripts\python.exe" (
    echo Environnement Python de la gateway introuvable ^(python\gateway\.venv^).
    echo Voir python\README.md pour l'installer.
    pause
    exit /b 1
)
".venv\Scripts\python.exe" run.py
