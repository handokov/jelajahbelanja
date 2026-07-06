@echo off
title JB Image Server
echo.
echo ============================================
echo    JB Image Server - Simpan Gambar Lokal
echo ============================================
echo.

REM Cek kalau node_modules belum ada
if not exist "%~dp0node_modules\" (
    echo [INFO] Install dependencies dulu...
    cd /d "%~dp0"
    npm install
    echo.
)

echo [INFO] Starting server di http://localhost:3000
echo [INFO] Tekan Ctrl+C buat stop
echo.

cd /d "%~dp0"
node server.js
pause
