// 1. Forzar IPv4 para evitar esperas en redes con IPv6 inestable
const dns = require("dns");
try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {}

const path = require("path");
// 2. Cargar .env directamente desde la misma carpeta del conector
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const sql = require("mssql");
const fs = require("fs");

const { initializeApp, cert } = require("firebase-admin/app");
const {
  getFirestore,
  FieldValue
} = require("firebase-admin/firestore");

const keyPath = process.env.FIREBASE_KEY_PATH || "C:\\HJB\\Secrets\\firebase-hjb-tester.json";
const serviceAccount = JSON.parse(
  fs.readFileSync(keyPath, "utf8")
);

const targetProjectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id || "hjb-gestion-tester";

initializeApp({
  credential: cert(serviceAccount),
  projectId: targetProjectId,
});

const db = getFirestore();

// 3. Activar modo HTTPS REST para mayor compatibilidad con routers rurales/4G
try {
  db.settings({ preferRest: true });
} catch (e) {}

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER + "\\" + process.env.SQL_INSTANCE,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const queryLeche = `
DECLARE @FechaCorte date;
SET @FechaCorte = DATEADD(day,-1,CAST(GETDATE() AS date));

;WITH Datos AS
(
    SELECT
        a.Number AS Vaca,
        g.Name AS Rodeo,
        MAX(d.DIM) AS DiasEnLeche,
        MAX(d.LactationNumber) AS Lactancia,

        MAX(CASE
            WHEN d.Date = @FechaCorte
            THEN d.TotalYield
        END) AS Ayer,

        AVG(CASE
            WHEN d.Date BETWEEN DATEADD(day,-6,@FechaCorte) AND @FechaCorte
            THEN d.TotalYield
        END) AS Prom7,

        AVG(CASE
            WHEN d.Date BETWEEN DATEADD(day,-13,@FechaCorte) AND @FechaCorte
            THEN d.TotalYield
        END) AS Prom14,

        AVG(CASE
            WHEN d.Date BETWEEN DATEADD(day,-20,@FechaCorte) AND @FechaCorte
            THEN d.TotalYield
        END) AS Prom21

    FROM dbo.AnimalData a

    INNER JOIN dbo.AbstractGroup g
        ON a.GroupOid = g.Oid

    LEFT JOIN dbo.AnimalDaily d
        ON d.BasicAnimal = a.Oid
        AND d.IsYieldValid = 1
        AND d.Date BETWEEN DATEADD(day,-20,@FechaCorte) AND @FechaCorte

    WHERE
        a.IsExited = 0
        AND a.IsCulled = 0
        AND a.GroupOid IN (2,1019)

    GROUP BY
        a.Number,
        g.Name
)

SELECT
    CONVERT(varchar(10), @FechaCorte, 120) AS FechaDatos,
    Vaca,
    Rodeo,
    DiasEnLeche,
    Lactancia,

    CAST(Ayer AS decimal(10,2)) AS Ayer,
    CAST(Prom7 AS decimal(10,2)) AS Prom7,
    CAST(Prom14 AS decimal(10,2)) AS Prom14,
    CAST(Prom21 AS decimal(10,2)) AS Prom21,

    CAST(
        CASE
            WHEN Ayer IS NOT NULL
             AND Prom7 IS NOT NULL
             AND Prom14 IS NOT NULL
             AND Prom21 IS NOT NULL
            THEN
                Ayer   * 0.05 +
                Prom7  * 0.50 +
                Prom14 * 0.27 +
                Prom21 * 0.18
        END
    AS decimal(10,2)) AS Pronostico15,

    CASE
        WHEN Ayer IS NULL THEN 'Falta Ayer'
        ELSE 'OK'
    END AS ControlDato

FROM Datos
ORDER BY Pronostico15 DESC, Vaca;
`;

const queryTodosLosAnimales = `
SELECT 
    a.Number AS Vaca,
    g.Oid AS GroupOid,
    g.Name AS GrupoDelPro,
    a.Sex,
    CONVERT(varchar(10), a.BirthDate, 120) AS FechaNacimiento
FROM dbo.AnimalData a WITH (NOLOCK)
INNER JOIN dbo.AbstractGroup g WITH (NOLOCK) ON a.GroupOid = g.Oid
WHERE a.IsExited = 0 AND a.IsCulled = 0
ORDER BY g.Oid, a.Number;
`;

const queryGrupos = `
SELECT 
    g.Oid AS GroupOid,
    g.Name AS GroupName,
    COUNT(a.Oid) AS CantidadAnimales
FROM dbo.AbstractGroup g WITH (NOLOCK)
LEFT JOIN dbo.AnimalData a WITH (NOLOCK) 
    ON a.GroupOid = g.Oid AND a.IsExited = 0 AND a.IsCulled = 0
GROUP BY g.Oid, g.Name
ORDER BY CantidadAnimales DESC, g.Oid;
`;

async function ejecutar() {
  let pool;

  try {
    const serverInstance = sqlConfig.server;
    const databaseName = sqlConfig.database;
    const userName = sqlConfig.user;

    console.log("==========================================================");
    console.log("  HJB GESTION - CONECTOR DELAVAL DELPRO (PC TAMBO)");
    console.log("==========================================================");
    console.log(`[SQL DELPRO]      Conectando a ${serverInstance} [${databaseName}]...`);
    console.log(`[MODO OPERATIVO]  SOLO LECTURA (Usuario: ${userName})`);

    pool = await sql.connect(sqlConfig);
    console.log("[SQL DELPRO]      Conexion SQL OK.");

    // A. Descubrir Grupos / Corrales de DelPro
    const resGrupos = await pool.request().query(queryGrupos);
    console.log("");
    console.log("----------------------------------------------------------");
    console.log("  GRUPOS / CORRALES REGISTRADOS EN DELPRO:");
    console.log("----------------------------------------------------------");
    resGrupos.recordset.forEach(gr => {
      console.log(`  * ID ${gr.GroupOid}: "${gr.GroupName}" -> ${gr.CantidadAnimales} animales`);
    });
    console.log("----------------------------------------------------------");
    console.log("");

    // B. Extraer Producción de Vacas en Ordeñe
    const resLeche = await pool.request().query(queryLeche);
    const totalVacasLeche = resLeche.recordset.length;
    console.log(`[TAMBO ORDEÑE]   ${totalVacasLeche} vacas en ordeñe (Grupos 2 y 1019)`);

    // C. Extraer Censo Total de Animales (Tambo + Ganadería + Recría)
    const resTodos = await pool.request().query(queryTodosLosAnimales);
    const totalRodeoCompleto = resTodos.recordset.length;
    console.log(`[RODEO COMPLETO]  ${totalRodeoCompleto} animales activos en total en el campo`);

    // D. Calcular métricas para el Dashboard
    let fechaDatosTexto = "";
    if (resLeche.recordset.length > 0 && resLeche.recordset[0].FechaDatos) {
      const f0 = resLeche.recordset[0].FechaDatos;
      fechaDatosTexto = f0 instanceof Date ? f0.toISOString().slice(0, 10) : String(f0).slice(0, 10);
    }

    const litrosTotales = resLeche.recordset.reduce((acc, f) => acc + (Number(f.Ayer) || 0), 0);
    const promVO = totalVacasLeche > 0 ? (litrosTotales / totalVacasLeche) : 0;

    console.log(`[PRODUCCION AYER] ${litrosTotales.toFixed(1)} lts totales | Promedio: ${promVO.toFixed(2)} lts/vaca`);

    // E. Guardar Respaldo Local Integral (Tambo + Ganadería) en JSON
    const rutaJsonLocal = path.resolve(__dirname, "delpro_sync.json");
    const copiaLocal = {
      fechaSincronizacion: new Date().toISOString(),
      fechaDatos: fechaDatosTexto,
      origenExtraccion: "Microsoft SQL Server (DeLaval DelPro)",
      servidorHost: serverInstance,
      baseDatosSql: databaseName,
      kpisProduccion: {
        litrosTotalesDia: Number(litrosTotales.toFixed(1)),
        vacasEnOrdenie: totalVacasLeche,
        litrosPromedioVO: Number(promVO.toFixed(2)),
      },
      gruposDelPro: resGrupos.recordset,
      vacasEnOrdenie: resLeche.recordset,
      rodeoCompleto: resTodos.recordset,
    };
    fs.writeFileSync(rutaJsonLocal, JSON.stringify(copiaLocal, null, 2), "utf8");
    console.log(`[RESPALDO LOCAL]  delpro_sync.json guardado (${totalRodeoCompleto} animales totales)`);

    // F. Preparar Lote para Firestore
    console.log(`[FIREBASE]        Preparando sincronizacion a Firestore (${targetProjectId})...`);
    const batch = db.batch();

    // 1) Actualizar resumen principal de Tambo y Dashboard
    const refTablero = db.collection("delpro").doc("sincronizacion_actual");
    batch.set(
      refTablero,
      {
        estadoConexion: "conectado",
        fechaSincronizacion: new Date().toISOString(),
        servidorHost: serverInstance,
        baseDatosSql: databaseName,
        litrosTotalesDia: Number(litrosTotales.toFixed(1)),
        vacasEnOrdeñe: totalVacasLeche,
        litrosPromedioVO: Number(promVO.toFixed(2)),
        totalRodeoGeneral: totalRodeoCompleto,
        mensajeEstado: `Sincronizado desde DelPro (${serverInstance})`,
        fechaDatos: fechaDatosTexto,
      },
      { merge: true }
    );

    // 2) Actualizar vacas de ordeñe individuales en delpro_animales
    for (const fila of resLeche.recordset) {
      const fechaStr = fila.FechaDatos instanceof Date
        ? fila.FechaDatos.toISOString().slice(0, 10)
        : String(fila.FechaDatos || "").slice(0, 10);

      const ref = db.collection("delpro_animales").doc(String(fila.Vaca));
      batch.set(
        ref,
        {
          vaca: fila.Vaca,
          rodeo: fila.Rodeo,
          diasEnLeche: fila.DiasEnLeche,
          lactancia: fila.Lactancia,
          ayer: fila.Ayer,
          prom7: fila.Prom7,
          prom14: fila.Prom14,
          prom21: fila.Prom21,
          pronostico15: fila.Pronostico15,
          controlDato: fila.ControlDato,
          fechaDatos: fechaStr,
          actualizadoEn: FieldValue.serverTimestamp(),
          origen: "DelPro",
        },
        { merge: true }
      );
    }

    // G. Transmitir a Firestore
    console.log(`[FIREBASE]        Transmitiendo via HTTPS REST a Google...`);
    try {
      await batch.commit();

      const ahora = new Date();
      const fechaHoraSync = ahora.toLocaleString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour12: false,
      });

      console.log("[FIREBASE]        Conexion y subida Firebase OK.");
      console.log(`[TABLERO HJB]     Dashboard y Tambo actualizados con ${litrosTotales.toFixed(1)} lts`);
      console.log(`[FECHA DATOS]     ${fechaDatosTexto} (formato texto YYYY-MM-DD)`);
      console.log(`[HORA SYNC]       ${fechaHoraSync}`);
    } catch (errFirebase) {
      if (errFirebase.message && (errFirebase.message.includes("Quota exceeded") || errFirebase.message.includes("429"))) {
        console.log("");
        console.log("[AVISO NUBE]      Cuota gratuita de Google alcanzada por hoy (20.000 escrituras).");
        console.log("[AVISO NUBE]      Se reinicia automaticamente a las 04:00 AM (o al pasar a plan Blaze).");
        console.log("[RESPALDO LOCAL]  Los datos estan 100% seguros y guardados en delpro_sync.json.");
      } else {
        throw errFirebase;
      }
    }

    console.log("[ESTADO DELPRO]   SIN MODIFICACIONES (estrictamente solo lectura)");
    console.log("==========================================================");
    console.log("Sincronizacion completada con exito.");

  } catch (error) {
    console.error("");
    console.error("==========================================================");
    console.error("  ERROR EN CONECTOR DELAVAL DELPRO");
    console.error("==========================================================");
    console.error("[ERROR]           ", error.message);
    if (error.code) {
      console.error("[CODIGO]          ", error.code);
    }
    console.error("[SEGURIDAD]       DelPro no sufrio ninguna modificacion.");
    console.error("==========================================================");
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit();
  }
}

ejecutar();
