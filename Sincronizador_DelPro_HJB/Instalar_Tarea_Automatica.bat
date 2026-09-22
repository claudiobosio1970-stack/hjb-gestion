@echo off
title HJB Gestion - Instalador de Tarea Automatica DelPro
color 0B
echo =====================================================================
echo   HJB GESTION - PROGRAMACION AUTOMATICA DE SINCRONIZACION DELPRO
echo =====================================================================
echo.
echo Esta accion programara la sincronizacion automatica de DelPro en esta
echo computadora todos los dias a las 07:30 y 18:30 (fin de cada ordenie).
echo.
echo Presione una tecla para continuar o cierre la ventana para cancelar...
pause >nul

schtasks /create /tn "HJB_Sincronizar_DelPro_Manana" /tr "\"%~dp0Sincronizar_DelPro.bat\"" /sc daily /st 07:30 /f
schtasks /create /tn "HJB_Sincronizar_DelPro_Tarde" /tr "\"%~dp0Sincronizar_DelPro.bat\"" /sc daily /st 18:30 /f

echo.
echo =====================================================================
echo Tareas programadas con exito en Windows.
echo DelPro se sincronizara automaticamente con HJB Gestion dos veces al dia.
echo =====================================================================
pause
