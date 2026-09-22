@echo off
title HJB Gestion - Probar Sincronizacion en la Nube
color 0B
echo =====================================================================
echo   HJB GESTION - PRUEBA DE SINCRONIZACION CON LA NUBE
echo =====================================================================
echo.
echo Enviando paquete de datos de prueba a la plataforma web HJB Gestion...
echo.

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File ".\extraer_delpro.ps1" -Simular

echo.
echo =====================================================================
echo Prueba finalizada. Mira tu pantalla en HJB Gestion.
echo =====================================================================
pause
