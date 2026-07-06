@echo off
title JB Image Server (Cloudinary)
echo.
echo ============================================
echo    JB Image Server v2.0 - Cloudinary
echo    Upload gambar ke Cloudinary (PERMANEN!)
echo ============================================
echo.

REM Cek kalau .env belum diisi
findstr /C:"CLOUDINARY_CLOUD_NAME=" "%~dp0.env" >nul 2>&1
for /f "tokens=2 delims==" %%a in ('findstr /C:"CLOUDINARY_CLOUD_NAME=" "%~dp0.env"') do set CLOUD_NAME=%%a

if "%CLOUD_NAME%"=="" (
    echo [ERROR] Cloudinary belum dikonfigurasi!
    echo.
    echo Cara setup:
    echo   1. Buka file .env di folder ini pakai Notepad
    echo   2. Daftar gratis di https://cloudinary.com
    echo   3. Dari Dashboard, copy: Cloud Name, API Key, API Secret
    echo   4. Isi di file .env
    echo   5. Jalankan start.bat lagi
    echo.
    echo Buka .env sekarang? (Y/N)
    set /p OPENENV=
    if /i "%OPENENV%"=="Y" notepad "%~dp0.env"
    pause
    exit /b
)

REM Cek kalau node_modules belum ada
if not exist "%~dp0node_modules\" (
    echo [INFO] Install dependencies dulu...
    cd /d "%~dp0"
    npm install
    echo.
)

echo [INFO] Starting server di http://localhost:3000
echo [INFO] Gambar di-upload ke Cloudinary (permanen!)
echo [INFO] Tekan Ctrl+C buat stop
echo.

cd /d "%~dp0"
node server.js
pause
