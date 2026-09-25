@echo off
title HJB - Configurar Tareas Automaticas DelPro
color 0A

:: Verificar si tiene permisos de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo ==========================================================
echo   CREANDO TAREAS AUTOMATICAS (07:30 Y 18:30)
echo ==========================================================
echo.

schtasks /create /tn "HJB_Sincronizar_DelPro_Manana" /tr "C:\HJB\Connector\ejecutar_tarea.bat" /sc daily /st 07:30 /f
echo.
schtasks /create /tn "HJB_Sincronizar_DelPro_Tarde" /tr "C:\HJB\Connector\ejecutar_tarea.bat" /sc daily /st 18:30 /f

echo.
echo ==========================================================
echo   TAREAS CREADAS CON EXITO.
echo ==========================================================
pause
