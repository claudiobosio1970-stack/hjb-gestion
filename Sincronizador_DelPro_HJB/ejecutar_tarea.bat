@echo off
rem ==========================================================
rem   HJB GESTION - Sincronizacion Automatica en Segundo Plano
rem ==========================================================
cd /d "C:\HJB\Connector"

echo [%date% %time%] Iniciando sincronizacion automatica DelPro... >> "C:\HJB\Connector\registro_sincronizacion.log"
node connector.js >> "C:\HJB\Connector\registro_sincronizacion.log" 2>&1
echo [%date% %time%] Sincronizacion finalizada con codigo de salida %errorlevel%. >> "C:\HJB\Connector\registro_sincronizacion.log"
echo. >> "C:\HJB\Connector\registro_sincronizacion.log"
