@echo off
cd /d "%~dp0"
call npm.cmd run share
if errorlevel 1 pause
