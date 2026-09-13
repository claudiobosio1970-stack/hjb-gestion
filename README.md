# HJB Gestión — MVP v0.4

Versión dedicada a madurar **Agricultura** antes de conectar SQL Connect.

## Qué incorpora

- Firebase Authentication real de v0.3.
- Capa de datos desacoplada (`src/lib/agricultureData.ts`).
- Pestañas funcionales en Aguilera:
  - Resumen
  - Actividades
  - Insumos
  - Suelos
  - Documentos
- Actividades con **Plan vs. Real**.
- Varios insumos por actividad.
- Insumos agregados automáticamente desde las actividades.
- Carga local de análisis de suelo.
- Registro local de documentos.
- Migración automática de actividades de v0.2/v0.3 al nuevo modelo.

## Importante

Hoy el repositorio de datos usa `localStorage`.
Las pantallas ya no dependen directamente de él.

Más adelante reemplazaremos el repositorio local por SQL Connect sin rehacer la interfaz.

## Ejecutar

1. Detener la versión anterior con `Ctrl + C`.
2. Abrir esta carpeta completa en VS Code.
3. Ejecutar:

```powershell
npm.cmd install
npm.cmd run dev
```

4. Abrir:

`http://localhost:3000`

## Prueba recomendada

### Actividad planificada
Aguilera → Actividades → Nueva actividad:

- Fertilización
- Planificada
- fecha planificada
- superficie planificada
- Urea
- dosis planificada

Guardar.

### Convertirla en realizada
Editar esa misma actividad:

- Estado: Realizada
- fecha real
- superficie real
- dosis real

Guardar.

Debe seguir siendo **una sola actividad**.

### Insumos
Ir a Insumos.
Debe aparecer automáticamente la Urea con:

- cantidad planificada;
- cantidad real;
- diferencia.

### Suelos
Agregar un análisis con algunos parámetros.

### Documentos
Registrar un documento y seleccionar un archivo local.

En v0.4 se guarda la ficha y el nombre del archivo, no el archivo real.

## Qué NO hace todavía

- SQL Connect
- Base multiusuario para Agricultura
- Firebase Storage real
- Costos
- Stock
- Compras
- GIS
- Resto de campos completamente operativos

## Próximo hito sugerido

Madurar Tambo, Racca y Kitty; soportar ciclos dobles como Avena → Maíz; después congelar Modelo Agricultura v1 y recién entonces pasar a SQL Connect.
