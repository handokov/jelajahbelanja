@echo off
echo =============================
echo   Stop JB Bot
echo =============================
echo.
echo Menghentikan bot...
taskkill /f /im node.exe 2>nul
if %errorlevel% == 0 (
    echo ✅ Bot berhenti!
) else (
    echo ℹ️ Bot gak lagi jalan
)
echo.
pause
