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
    echo  1. Cerra esta ventana.
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
echo [1/3] Limpiando tareas anteriores o desactualizadas...
schtasks /delete /tn "HJB_DelPro_Sync_Manana" /f >nul 2>&1
schtasks /delete /tn "HJB_DelPro_Sync_Tarde" /f >nul 2>&1
schtasks /delete /tn "DelProSync" /f >nul 2>&1
schtasks /delete /tn "HJB_Sincronizar_DelPro_Manana" /f >nul 2>&1
schtasks /delete /tn "HJB_Sincronizar_DelPro_Tarde" /f >nul 2>&1

echo.
echo [2/3] Programando sincronizacion oficial en Windows Task Scheduler...
echo       - Turno Manana: 07:30 hs
echo       - Turno Tarde:  18:30 hs
echo.

schtasks /create /tn "HJB_Sincronizar_DelPro_Manana" /tr "\"C:\HJB\Connector\Sincronizar_DelPro.bat\" --silent" /sc daily /st 07:30 /rl HIGHEST /f
schtasks /create /tn "HJB_Sincronizar_DelPro_Tarde" /tr "\"C:\HJB\Connector\Sincronizar_DelPro.bat\" --silent" /sc daily /st 18:30 /rl HIGHEST /f

echo.
echo =====================================================================
echo [3/3] Ejecutando sincronizacion ahora mismo para probar la conexion...
echo =====================================================================
echo.
call "C:\HJB\Connector\Sincronizar_DelPro.bat"

echo.
echo =====================================================================
echo   INSTALACION Y SINCRONIZACION COMPLETADAS
echo   DeLaval DelPro ya quedo conectado y automatizado todos los dias.
echo =====================================================================
pause
