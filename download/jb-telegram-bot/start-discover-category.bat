@echo off
cd /d "%~dp0"
echo 🔍 AI-1 DISCOVER (1 Kategori)
echo ============================================
echo.
set /p CATEGORY="Masukkan nama kategori (contoh: Beauty, Fashion): "
echo.
node jb-discover.js --cat %CATEGORY%
echo.
pause
