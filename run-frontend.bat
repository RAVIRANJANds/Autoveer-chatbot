@echo off
chcp 65001 >nul
cd /d "%~dp0"
"%~dp0venv\Scripts\python.exe" -m http.server 5500 --bind 127.0.0.1
pause
