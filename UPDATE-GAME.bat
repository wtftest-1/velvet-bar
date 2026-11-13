@echo off
title Update The Velvet Note
cd /d "%~dp0"
where git >nul 2>nul || (echo Git is not installed. Get it from https://git-scm.com then run this again. & pause & exit /b)
git pull
call npm install
echo.
echo Done. Now double-click START-GAME.bat
pause
