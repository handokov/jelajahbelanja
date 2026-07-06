@echo off
title Setup JB Image Server
echo.
echo ============================================
echo    SETUP JB Image Server + Cloudinary
echo ============================================
echo.

REM Step 1: npm install
if not exist "%~dp0node_modules\" (
    echo [1/2] Install dependencies...
    cd /d "%~dp0"
    npm install
    echo.
) else (
    echo [1/2] Dependencies sudah ada, skip install.
    echo.
)

REM Step 2: Test Cloudinary connection
echo [2/2] Test koneksi Cloudinary...
cd /d "%~dp0"
node -e "const c=require('cloudinary').v2;c.config({cloud_name:'bfvtb4xp',api_key:'455851493531962',api_secret:'3-sWr7_Z2mAFZR-mPLrheTVymPg',secure:true});c.api.ping().then(r=>console.log(r.status==='ok'?'Cloudinary CONNECTED!':'GAGAL: '+JSON.stringify(r))).catch(e=>console.log('ERROR: '+e.message))"

echo.
echo ============================================
echo    Setup selesai!
echo    Sekarang jalankan: start.bat
echo ============================================
echo.
pause
