@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

title Autoveer Chatbot Launcher

if not exist "venv\Scripts\python.exe" (
    echo First-time setup required...
    call "%~dp0install-windows.bat"
    if not exist "venv\Scripts\python.exe" exit /b 1
)

echo Starting Autoveer Chatbot on Windows...
echo.
echo   Frontend: http://127.0.0.1:5500
echo   Backend:  http://127.0.0.1:8000
echo.
echo Two command windows will open. Close them to stop the chatbot.
echo.

start "Autoveer Backend" "%~dp0run-backend.bat"

timeout /t 2 /nobreak >nul

start "Autoveer Frontend" "%~dp0run-frontend.bat"

timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5500"

echo Browser opened. Keep both server windows running.
pause
endlocal
