@echo off
echo ============================================
echo   JB Shopee Scraper Extension - Install
echo ============================================
echo.
echo Cara install extension di Chrome/Edge:
echo.
echo   1. Browser akan terbuka di halaman Extensions
echo   2. Aktifkan "Developer mode" (toggle kanan atas)
echo   3. Klik tombol "Load unpacked"
echo   4. Pilih folder: C:\jb-telegram-bot\extension
echo   5. Icon JB Scraper muncul di toolbar!
echo.
echo ============================================
echo.

:: Generate icons dulu
echo 🎨 Generate icons...
node create-icons.js
echo.

:: Buka browser Extensions — cek Chrome atau Edge
echo 🌐 Membuka browser Extensions...

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo    ✅ Chrome ditemukan, buka Chrome Extensions...
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" chrome://extensions
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo    ✅ Chrome ditemukan, buka Chrome Extensions...
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" chrome://extensions
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    echo    ✅ Edge ditemukan, buka Edge Extensions...
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" edge://extensions
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    echo    ✅ Edge ditemukan, buka Edge Extensions...
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" edge://extensions
) else (
    echo    ⚠️ Gak ketemu Chrome atau Edge!
    echo       Buka browser manual, lalu ketik: edge://extensions
)

echo.
echo ✅ Browser terbuka! Ikuti langkah di atas.
echo.
echo 💡 Setelah install, buka Shopee dan klik icon JB Scraper!
echo.
echo ⚠️ PENTING untuk Edge:
echo    Di halaman Extensions, pastikan:
echo    - Developer mode: ON (toggle kanan atas)
echo    - Klik "Load unpacked"
echo    - Pilih folder: C:\jb-telegram-bot\extension
echo.
pause
