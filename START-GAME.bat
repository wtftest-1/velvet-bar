@echo off
title The Velvet Note
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Download it from https://nodejs.org then run this again. & pause & exit /b)
if not exist node_modules (echo First start: installing, please wait... & call npm install)
echo Starting the game. Keep this window open while you play.
start "" http://localhost:5173
npm run dev
pause
