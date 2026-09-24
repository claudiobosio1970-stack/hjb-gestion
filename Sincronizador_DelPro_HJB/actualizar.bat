@echo off
title HJB Gestion - Actualizar y Sincronizar DelPro
color 0B
echo =====================================================================
echo   HJB GESTION - ACTUALIZACION DE CONECTOR DELPRO
echo =====================================================================
echo.
cd /d "C:\HJB\Connector"

echo [1/2] Descargando ultima version del conector desde GitHub...
curl.exe -s -o connector.js https://raw.githubusercontent.com/claudiobosio1970-stack/hjb-gestion/staging/Sincronizador_DelPro_HJB/connector.js

if %errorlevel% neq 0 (
    echo [ERROR] No se pudo descargar la actualizacion. Verifique la conexion a Internet.
    pause
    exit /b %errorlevel%
)

echo [OK] Version actualizada con exito.
echo.
echo [2/2] Ejecutando sincronizacion con DelPro y envio a la nube...
echo =====================================================================
node connector.js

echo.
echo =====================================================================
echo Proceso finalizado.
echo =====================================================================
pause
