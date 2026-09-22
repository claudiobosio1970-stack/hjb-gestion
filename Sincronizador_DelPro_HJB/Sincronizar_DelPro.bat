@echo off
title HJB Gestion - Sincronizador DeLaval DelPro
color 0A
echo =====================================================================
echo   HJB GESTION - SINCRONIZADOR DE DATOS DELAVAL DELPRO (SQL SERVER)
echo =====================================================================
echo.
echo Conectando con DeLaval DelPro FarmManager en esta computadora...
echo.

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File ".\extraer_delpro.ps1" %*

echo.
echo =====================================================================
echo Proceso finalizado.
echo =====================================================================
pause
