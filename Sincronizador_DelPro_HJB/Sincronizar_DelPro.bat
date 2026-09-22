@echo off
title HJB Gestion - Sincronizador DeLaval DelPro (PC Tambo)
color 0A
echo =====================================================================
echo   HJB GESTION - CONECTOR DELAVAL DELPRO (DESKTOP-9PTRDI9\DELPRO)
echo =====================================================================
echo.

cd /d "C:\HJB\Connector"
node "C:\HJB\Connector\connector.js" %*

echo.
echo =====================================================================
echo Proceso finalizado.
echo =====================================================================
pause
