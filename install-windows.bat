@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================
echo   Autoveer Chatbot - Windows Setup
echo ============================================
echo.

set "PY=python"
where python >nul 2>&1
if errorlevel 1 (
    where py >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python not found.
        echo Install Python 3.10+ from https://www.python.org/downloads/
        echo During install, check "Add python.exe to PATH".
        pause
        exit /b 1
    )
    set "PY=py -3"
)

echo Using: %PY%
%PY% --version
echo.

if not exist "venv\Scripts\python.exe" (
    echo Creating virtual environment...
    %PY% -m venv venv
    if errorlevel 1 (
        echo [ERROR] Could not create venv.
        pause
        exit /b 1
    )
)

echo Installing Python packages...
"venv\Scripts\python.exe" -m pip install --upgrade pip
"venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] pip install failed.
    pause
    exit /b 1
)

if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy /Y "backend\.env.example" "backend\.env" >nul
        echo Created backend\.env - add your GEMINI_API_KEY inside.
    )
)

echo.
echo Setup complete.
echo Next: double-click start-autoveer-chatbot.bat
echo.
pause
endlocal
