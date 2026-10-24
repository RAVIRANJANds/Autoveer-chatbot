@echo off
chcp 65001 >nul
cd /d "%~dp0backend"
"%~dp0venv\Scripts\python.exe" -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
pause
