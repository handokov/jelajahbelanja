@echo off
echo ============================================
echo   JB Telegram Bot - Setup v3.0
echo ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js belum terinstall!
    echo    Download: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js ditemukan:
node --version
echo.

:: Install dependencies
echo 📦 Install dependencies...
echo    (puppeteer-core ringan, gak download Chrome!)
echo.
call npm install
echo.

if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm install gagal!
    pause
    exit /b 1
)

echo ✅ Dependencies terinstall!
echo.

:: Generate extension icons
echo 🎨 Generate extension icons...
node create-icons.js
echo.

:: Check browser
echo 🌐 Cek browser di komputer...
set "BROWSER_FOUND=0"

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo    ✅ Chrome ditemukan
    set "BROWSER_FOUND=1"
)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo    ✅ Chrome ditemukan
    set "BROWSER_FOUND=1"
)
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    echo    ✅ Edge ditemukan
    set "BROWSER_FOUND=1"
)
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    echo    ✅ Edge ditemukan
    set "BROWSER_FOUND=1"
)

if "%BROWSER_FOUND%"=="0" (
    echo    ⚠️ Chrome/Edge gak ketemu — Puppeteer scraper gak bisa jalan
    echo       Tapi Chrome Extension tetap bisa dipakai!
) else (
    echo    ✅ Browser siap!
)

echo.
echo ============================================
echo   Setup selesai! 🎉
echo.
echo   CARA PAKAI:
echo.
echo   🧩 Cara PALING AMAN (Chrome Extension):
echo   1. Double-click start-bot.bat
echo   2. Double-click install-extension.bat
echo   3. Buka Shopee di Chrome, klik icon JB Scraper
echo.
echo   🤖 Cara Otomatis (Puppeteer):
echo   1. Double-click start-bot.bat
echo   2. Double-click start-scrape-quick.bat
echo   3. Double-click start-discover.bat
echo ============================================
echo.
pause
