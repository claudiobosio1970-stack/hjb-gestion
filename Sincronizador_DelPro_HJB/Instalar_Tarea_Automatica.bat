@echo off
title HJB Gestion - Instalador de Tarea Automatica DelPro
color 0B

:: 1. Verificar permisos de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo =====================================================================
    echo   ATENCION: SE REQUIEREN PERMISOS DE ADMINISTRADOR
    echo =====================================================================
    echo.
    echo Para poder programar la tarea en Windows:
    echo  1. Cerre esta ventana.
    echo  2. Hace CLIC DERECHO sobre 'Instalar_Tarea_Automatica.bat'
    echo  3. Hace clic en 'Ejecutar como administrador'
    echo.
    echo =====================================================================
    pause
    exit /b 1
)

echo =====================================================================
echo   HJB GESTION - PROGRAMACION AUTOMATICA DE SINCRONIZACION DELPRO
echo =====================================================================
echo.
echo [1/2] Programando sincronizacion automatica en Windows...
echo       - Turno Manana: 07:30 hs
echo       - Turno Tarde:  18:30 hs
echo.

schtasks /create /tn "HJB_Sincronizar_DelPro_Manana" /tr "\"%~dp0Sincronizar_DelPro.bat\"" /sc daily /st 07:30 /f
schtasks /create /tn "HJB_Sincronizar_DelPro_Tarde" /tr "\"%~dp0Sincronizar_DelPro.bat\"" /sc daily /st 18:30 /f

echo.
echo =====================================================================
echo [2/2] Ejecutando sincronizacion ahora mismo para probar la conexion...
echo =====================================================================
echo.
call "%~dp0Sincronizar_DelPro.bat"

echo.
echo =====================================================================
echo   INSTALACION Y SINCRONIZACION COMPLETADAS
echo   DeLaval DelPro ya quedo conectado y automatizado todos los dias.
echo =====================================================================
pause
