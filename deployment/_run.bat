@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0.."
set PORT=3000
npm run dev
