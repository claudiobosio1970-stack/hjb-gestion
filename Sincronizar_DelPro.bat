@echo off
title HJB Gestion - Sincronizacion DeLaval DelPro
color 0A
echo =====================================================================
echo   HJB GESTION - SINCRONIZADOR DE DATOS DELAVAL DELPRO (SQL SERVER)
echo =====================================================================
echo.
echo Conectando con DeLaval DelPro FarmManager...
echo.

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File ".\scripts\delpro\extraer_delpro.ps1" %*

echo.
echo =====================================================================
echo Proceso finalizado.
echo =====================================================================
pause
