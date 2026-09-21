# Extracción Directa desde DeLaval DelPro FarmManager vía Microsoft SQL Server

Esta carpeta contiene las herramientas para extraer los datos operativos del tambo directamente desde el motor de base de datos **Microsoft SQL Server** donde opera **DeLaval DelPro FarmManager**.

---

## 1. Archivos Disponibles

1. **`extraer_delpro.ps1`**: Script ejecutable de Windows PowerShell que se conecta a SQL Server mediante `.NET SqlClient` nativo (no requiere instalar librerías externas), ejecuta las consultas de solo lectura y genera `delpro_sync.json`.
2. **`delpro_queries.sql`**: Script SQL con todas las consultas documentadas y directivas `WITH (NOLOCK)` para auditar o probar manualmente desde **SQL Server Management Studio (SSMS)**.
3. **`delpro_sync.json`**: Archivo de intercambio generado que se importa en la plataforma web HJB con 1 clic.

---

## 2. Parámetros de Conexión Habituales en DeLaval DelPro

* **Instancia SQL**: Habitualmente `.\DELPRO`, `localhost\DELPRO` o `<NOMBRE-EQUIPO>\DELPRO`.
* **Base de Datos**: `DelProFarmManager` (en algunas versiones `DelPro` o `FarmManager`).
* **Autenticación**:
  * **Windows Authentication**: El usuario de Windows que inicia sesión en la PC del tambo suele tener permisos de lectura sobre la base.
  * **Usuario SQL**: Si se configuró con usuario `sa` o usuario propio de DeLaval.

---

## 3. Modos de Uso del Script

### A. Probar la Conexión a la Base de Datos
Abre PowerShell y ejecuta:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\delpro\extraer_delpro.ps1 -TestConexion
```
Si la instancia está en otra máquina de la red local:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\delpro\extraer_delpro.ps1 -Servidor "192.168.1.50\DELPRO" -TestConexion
```

### B. Ejecutar la Extracción Completa
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\delpro\extraer_delpro.ps1
```
Esto genera el archivo `delpro_sync.json` en la carpeta actual.

### C. Modo Simulación / Prueba (Sin SQL Server físico presente)
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\delpro\extraer_delpro.ps1 -Simular
```

---

## 4. Automatización con el Programador de Tareas de Windows (Task Scheduler)

Para que la extracción se realice automáticamente después de cada turno de ordeño:
1. Abrir **Programador de Tareas** (`taskschd.msc`) en la computadora del tambo.
2. Crear Tarea Básica: `HJB - Extracción DelPro`.
3. Desencadenador: Diariamente a las **07:30** y a las **18:30** (tras la finalización de los dos ordeñes diarios).
4. Acción: **Iniciar un programa**.
   * Programa o script: `powershell.exe`
   * Argumentos: `-ExecutionPolicy Bypass -File "C:\proyectos\hjb-gestion\scripts\delpro\extraer_delpro.ps1"`
   * Iniciar en: `C:\proyectos\hjb-gestion\`

---

## 5. Carga en la Plataforma Web HJB

1. Ingresar a **[https://hjb-gestion-tester.web.app/inicio](https://hjb-gestion-tester.web.app/inicio)**.
2. Hacer clic en el botón superior **`🔗 DeLaval DelPro`**.
3. Seleccionar la pestaña **"Extracción SQL Server"**.
4. Arrastrar o seleccionar el archivo `delpro_sync.json`.
5. El sistema actualiza instantáneamente:
   * Litros de leche medidos por caudalímetros.
   * Vacas en ordeñe (VO).
   * Raciones y costos de alimentación.
   * Nuevos terneros machos al engorde y hembras a reposición del tambo.
