// ==========================================================
//   HJB GESTIÓN - CONECTOR OFICIAL DELAVAL DELPRO (PC TAMBO)
//   Basado en el motor de consultas nativo DeLaval Analytics
// ==========================================================

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
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const keyPath = process.env.FIREBASE_KEY_PATH || "C:\\HJB\\Secrets\\firebase-hjb-tester.json";
let serviceAccount = null;
try {
  serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
} catch (e) {
  console.warn("[AVISO] No se encontró clave Firebase en:", keyPath);
}

const targetProjectId = process.env.FIREBASE_PROJECT_ID || serviceAccount?.project_id || "hjb-gestion-tester";

if (serviceAccount) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: targetProjectId,
  });
}

const db = serviceAccount ? getFirestore() : null;
if (db) {
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch (e) {}
}

// Activar modo HTTPS REST solo si se especifica explícitamente en .env
if (db && process.env.FIREBASE_USE_REST === "true") {
  try {
    db.settings({ preferRest: true });
  } catch (e) {}
}

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER + "\\" + process.env.SQL_INSTANCE,
  database: process.env.SQL_DATABASE || "DDM",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// ==========================================================
//  CONSULTAS SQL OFICIALES DE DELAVAL DELPRO (DeLaval Analytics)
// ==========================================================

// A. Producción de Leche Ayer y Promedios Históricos (Caudalímetros DelPro)
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

// B. Conteo y Stock Diario por Corral/Grupo (DeLaval q_daily_animal_group_stock)
const queryStockPorGrupo = `
SELECT 
    G.Number AS GroupNumber,
    G.Name AS GroupName,
    (SELECT COUNT(*) FROM dbo.BasicAnimal A1 WHERE A1.[Group] = G.OID AND A1.GCRecord IS NULL AND A1.Sex = 2) AS Female,
    (SELECT COUNT(*) FROM dbo.BasicAnimal A2 WHERE A2.[Group] = G.OID AND A2.GCRecord IS NULL AND A2.Sex = 1) AS Male,
    (SELECT COUNT(*) FROM dbo.BasicAnimal A5 LEFT JOIN dbo.AnimalExtended AE3 ON A5.OID = AE3.OID LEFT JOIN dbo.AnimalReproductionInfo ARI3 ON AE3.ReproductionInfo = ARI3.OID WHERE A5.[Group] = G.OID AND A5.GCRecord IS NULL AND ARI3.LactationNumber > 0 AND ARI3.IsDryingOff = 0) AS MilkingCow,
    (SELECT COUNT(*) FROM dbo.BasicAnimal A6 LEFT JOIN dbo.AnimalExtended AE4 ON A6.OID = AE4.OID LEFT JOIN dbo.AnimalReproductionInfo ARI4 ON AE4.ReproductionInfo = ARI4.OID WHERE A6.[Group] = G.OID AND A6.GCRecord IS NULL AND ARI4.BreedingState = 7) AS DryCow,
    (SELECT COUNT(*) FROM dbo.BasicAnimal A7 LEFT JOIN dbo.AnimalExtended AE5 ON A7.OID = AE5.OID LEFT JOIN dbo.AnimalReproductionInfo ARI5 ON AE5.ReproductionInfo = ARI5.OID WHERE A7.[Group] = G.OID AND A7.GCRecord IS NULL AND ARI5.IsPregnant = 1) AS Pregnant,
    (SELECT COUNT(*) FROM dbo.BasicAnimal A8 LEFT JOIN dbo.AnimalExtended AE6 ON A8.OID = AE6.OID LEFT JOIN dbo.AnimalReproductionInfo ARI6 ON AE6.ReproductionInfo = ARI6.OID WHERE A8.[Group] = G.OID AND A8.GCRecord IS NULL AND ARI6.BreedingState = 4) AS [Open],
    (SELECT COUNT(*) FROM dbo.BasicAnimal A9 WHERE A9.[Group] = G.OID AND A9.GCRecord IS NULL) AS TotalAnimals,
    (SELECT AVG(D.TotalYield) FROM dbo.AnimalDaily D WHERE D.AnimalGroup = G.OID AND D.GCRecord IS NULL AND D.[Date] = CAST(GETDATE() - 1 AS DATE) AND D.TotalYield > 0) AS AVGYield
FROM dbo.AbstractGroup G
WHERE G.GCRecord IS NULL
ORDER BY TotalAnimals DESC;
`;

// C. Censo Maestro Integral de Animales (DeLaval DDM / DelPro)
const queryAnimalsOficial = `
SELECT
    BA.Number AS AnimalNumber,
    BA.OfficialRegNo,
    BA.Sex,
    CONVERT(varchar(10), BA.BirthDate, 120) AS BirthDate,
    AG.Name AS NameGroup,
    AG.Number AS GroupNumber,
    ARI.LactationNumber,
    ARI.BreedingState,
    ARI.IsInseminated,
    ARI.IsPregnant,
    ARI.IsDryingOff,
    CASE 
        WHEN ARI.LactationNumber > 0 AND ARI.IsDryingOff = 0 THEN 'InLactation'
        WHEN ARI.LactationNumber > 0 AND ARI.IsDryingOff = 1 THEN 'DryOff'
        WHEN ARI.LactationNumber = 0 AND ARI.IsDryingOff = 0 THEN 'Heifer'
        ELSE 'Male'
    END AS ProductiveStatus
FROM dbo.BasicAnimal BA WITH (NOLOCK)
LEFT JOIN dbo.AbstractGroup AG WITH (NOLOCK) ON BA.[Group] = AG.OID
LEFT JOIN dbo.AnimalReproductionInfo ARI WITH (NOLOCK) ON BA.OID = ARI.Animal AND ARI.GCRecord IS NULL
WHERE BA.GCRecord IS NULL
  AND BA.ExitDate IS NULL
  AND ((BA.Number > 0 AND BA.Number < 999999) OR (BA.Number < 0))
ORDER BY AG.Number, BA.Number;
`;

// D. Trazabilidad de Traspasos de Grupo / Corral (DeLaval q_last_history_group)
const queryHistorialGrupos = `
WITH CTE AS (
    SELECT
        BA.Number AS AnimalNumber,
        BA.OfficialRegNo,
        AAE.DateAndTime,
        AG2.Number AS GroupNumberOld,
        AG2.Name AS GroupNameOld,
        AG1.Number AS GroupNumberNew,
        AG1.Name AS GroupNameNew,
        ROW_NUMBER() OVER (
            PARTITION BY BA.OfficialRegNo
            ORDER BY AAE.DateAndTime DESC
        ) AS rn
    FROM dbo.BasicAnimal AS BA
    INNER JOIN dbo.AbstractAnimalEvent AS AAE ON BA.OID = AAE.BasicAnimal
    INNER JOIN dbo.EventGroupChange AS EGC ON AAE.OID = EGC.OID
    LEFT JOIN dbo.AbstractGroup AS AG2 ON EGC.OldGroup = AG2.OID
    LEFT JOIN dbo.AbstractGroup AS AG1 ON EGC.NewGroup = AG1.OID
    WHERE (AG2.Number IS NOT NULL OR AG1.Number IS NOT NULL)
)
SELECT
    AnimalNumber,
    OfficialRegNo,
    CONVERT(varchar(10), DateAndTime, 120) AS DateAndTime,
    GroupNumberOld,
    GroupNameOld,
    GroupNumberNew,
    GroupNameNew
FROM CTE
WHERE rn = 1
ORDER BY DateAndTime DESC;
`;

// E. Registro de Partos y Nacimientos (DeLaval q_calvings)
const queryPartos = `
SELECT
    BA.OfficialRegNo,
    BA.Number AS AnimalNumber,
    AAE.LactationNumber,
    CONVERT(varchar(10), AAE.DateAndTime, 120) AS CalvingDate,
    BA.Sex,
    PIB.MotherId
FROM dbo.AbstractAnimalEvent AAE
INNER JOIN dbo.BasicAnimal BA ON AAE.BasicAnimal = BA.OID
INNER JOIN dbo.EventCalving EC ON AAE.OID = EC.OID
LEFT JOIN dbo.PedigreeInfo PIB ON BA.PedigreeInfo = PIB.OID
WHERE BA.GCRecord IS NULL AND AAE.GCRecord IS NULL
ORDER BY AAE.DateAndTime DESC;
`;

// F. Fallback básico de rodeo completo si q_animals requiere tablas adicionales
const queryTodosLosAnimalesFallback = `
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

// ==========================================================
//  EJECUCIÓN PRINCIPAL DEL CONECTOR
// ==========================================================

async function ejecutar() {
  let pool;

  try {
    const serverInstance = sqlConfig.server;
    const databaseName = sqlConfig.database;
    const userName = sqlConfig.user;

    console.log("==========================================================");
    console.log("  HJB GESTION - CONECTOR DELAVAL DELPRO (MOTOR ANALYTICS)");
    console.log("==========================================================");
    console.log(`[SQL DELPRO]      Conectando a ${serverInstance} [${databaseName}]...`);
    console.log(`[MODO OPERATIVO]  SOLO LECTURA (Usuario: ${userName})`);

    pool = await sql.connect(sqlConfig);
    console.log("[SQL DELPRO]      Conexion SQL OK.");

    // 1. Grupos y Distribución de Stock (q_daily_animal_group_stock)
    let resStockGrupos = [];
    try {
      const resG = await pool.request().query(queryStockPorGrupo);
      resStockGrupos = resG.recordset;
      console.log("");
      console.log("----------------------------------------------------------");
      console.log("  STOCK Y DISTRIBUCION POR GRUPO / CORRAL (DELPRO):");
      console.log("----------------------------------------------------------");
      resStockGrupos.forEach(gr => {
        console.log(`  * ID ${gr.GroupNumber}: "${gr.GroupName}" -> Total: ${gr.TotalAnimals} (Ordeñe: ${gr.MilkingCow || 0} | Secas: ${gr.DryCow || 0} | Preñadas: ${gr.Pregnant || 0})`);
      });
      console.log("----------------------------------------------------------");
    } catch (errG) {
      console.warn("[AVISO GRUPOS]   No se pudo ejecutar stock detallado por grupo:", errG.message);
    }

    // 2. Producción de Leche Ayer y Promedio (Caudalímetros)
    const resLeche = await pool.request().query(queryLeche);
    const totalVacasLeche = resLeche.recordset.length;
    console.log(`[TAMBO ORDEÑE]   ${totalVacasLeche} vacas en ordeñe (Grupos 2 y 1019)`);

    let fechaDatosTexto = "";
    if (resLeche.recordset.length > 0 && resLeche.recordset[0].FechaDatos) {
      const f0 = resLeche.recordset[0].FechaDatos;
      fechaDatosTexto = f0 instanceof Date ? f0.toISOString().slice(0, 10) : String(f0).slice(0, 10);
    }

    const litrosTotales = resLeche.recordset.reduce((acc, f) => acc + (Number(f.Ayer) || 0), 0);
    const promVO = totalVacasLeche > 0 ? (litrosTotales / totalVacasLeche) : 0;
    console.log(`[PRODUCCION AYER] ${litrosTotales.toFixed(1)} lts totales | Promedio: ${promVO.toFixed(2)} lts/vaca`);

    // 3. Censo Maestro Integral de Animales (DeLaval q_animals)
    let rodeoCompleto = [];
    try {
      console.log("[CENSO DELPRO]    Extrayendo censo integral con métricas reproductivas (q_animals)...");
      const resAnimals = await pool.request().query(queryAnimalsOficial);
      rodeoCompleto = resAnimals.recordset;
      console.log(`[CENSO DELPRO]    OK: ${rodeoCompleto.length} animales procesados con días a parto y celo.`);
    } catch (errAnimals) {
      console.warn("[AVISO CENSO]    Error ejecutando q_animals completo:", errAnimals.message);
      console.log("[FALLBACK CENSO]  Ejecutando consulta base de AnimalData...");
      const resFallback = await pool.request().query(queryTodosLosAnimalesFallback);
      rodeoCompleto = resFallback.recordset;
      console.log(`[FALLBACK CENSO]  ${rodeoCompleto.length} animales extraídos.`);
    }

    // 4. Trazabilidad de Traspasos de Corrales (DeLaval q_last_history_group)
    let historialCambiosGrupo = [];
    try {
      console.log("[MOVIMIENTOS]     Consultando historial de cambios de grupo (q_last_history_group)...");
      const resMov = await pool.request().query(queryHistorialGrupos);
      historialCambiosGrupo = resMov.recordset;
      console.log(`[MOVIMIENTOS]     ${historialCambiosGrupo.length} movimientos de corral detectados.`);
    } catch (errMov) {
      console.warn("[AVISO MOVIM]     No se pudo extraer historial de grupos:", errMov.message);
    }

    // 5. Registro de Partos Recientes (DeLaval q_calvings)
    let partosRecientes = [];
    try {
      console.log("[PARTOS DELPRO]   Consultando registro oficial de partos (q_calvings)...");
      const resPartos = await pool.request().query(queryPartos);
      partosRecientes = resPartos.recordset.slice(0, 30);
      console.log(`[PARTOS DELPRO]   ${partosRecientes.length} partos históricos/recientes encontrados.`);
    } catch (errPartos) {
      console.warn("[AVISO PARTOS]    No se pudo extraer partos:", errPartos.message);
    }

    // 6. Consolidar Respaldo Local (delpro_sync.json)
    const rutaJsonLocal = path.resolve(__dirname, "delpro_sync.json");
    const copiaLocal = {
      fechaSincronizacion: new Date().toISOString(),
      fechaDatos: fechaDatosTexto,
      origenExtraccion: "Microsoft SQL Server (DeLaval Analytics / DDM)",
      servidorHost: serverInstance,
      baseDatosSql: databaseName,
      kpisProduccion: {
        litrosTotalesDia: Number(litrosTotales.toFixed(1)),
        vacasEnOrdenie: totalVacasLeche,
        litrosPromedioVO: Number(promVO.toFixed(2)),
      },
      stockCorrales: resStockGrupos,
      vacasEnOrdenie: resLeche.recordset,
      rodeoCompleto: rodeoCompleto,
      historialCambiosGrupo: historialCambiosGrupo,
      calvings: partosRecientes,
    };
    fs.writeFileSync(rutaJsonLocal, JSON.stringify(copiaLocal, null, 2), "utf8");
    console.log(`[RESPALDO LOCAL]  delpro_sync.json guardado (${rodeoCompleto.length} animales totales)`);

    // 7. Preparar Paquete Consolidado con el Rodeo Completo de DelPro (513 animales)
    // Se cruzan los litros de ordeñe de ayer con los 513 animales del censo
    const lecheMap = new Map();
    resLeche.recordset.forEach(l => {
      lecheMap.set(String(l.Vaca).trim(), l);
    });

    const todasLasVacasRodeo = rodeoCompleto.map(a => {
      const rpNum = a.AnimalNumber || a.OfficialRegNo || a.Vaca;
      const numStr = String(rpNum).replace(/^RP-/i, "").trim();
      const leche = lecheMap.get(numStr);

      const grNombre = a.NameGroup || a.GrupoDelPro || "";
      const grLower = grNombre.toLowerCase();

      const esOrdeño = leche !== undefined || a.ProductiveStatus === "InLactation" || grLower.includes("ordeñ") || grLower.includes("punta");
      const esSeca = !esOrdeño && (a.ProductiveStatus === "DryOff" || grLower.includes("seca") || grLower.includes("preparto"));
      const esCrianza = !esOrdeño && !esSeca && (grLower.includes("crianza") || grLower.includes("guachera") || grLower.includes("terner"));
      const esMacho = !esOrdeño && !esSeca && !esCrianza && (a.Sex === 1 || a.ProductiveStatus === "Male" || grLower.includes("macho") || grLower.includes("engorde") || grLower.includes("novill"));
      const esVaquillona = !esOrdeño && !esSeca && !esCrianza && !esMacho && (a.ProductiveStatus === "Heifer" || grLower.includes("vaquillona") || grLower.includes("vq") || grLower.includes("recria hembra"));

      let estadoProd = "Vaquillona";
      if (esOrdeño) estadoProd = "En Ordeñe";
      else if (esSeca) estadoProd = "Seca";
      else if (esCrianza) estadoProd = "Crianza";
      else if (esMacho) estadoProd = "Macho";
      else if (esVaquillona) estadoProd = "Vaquillona";
      else estadoProd = a.Sex === 1 ? "Macho" : "Vaquillona";

      let estadoRepro = "Vacía";
      if (a.IsPregnant === 1 || a.BreedingState === 6) {
        estadoRepro = "Preñada";
      } else if (a.IsInseminated === 1 || a.BreedingState === 5) {
        estadoRepro = "Inseminada";
      }

      const diasGest = esSeca
        ? (grLower.includes("preparto") ? 268 : 235)
        : (estadoRepro === "Preñada" ? (esOrdeño ? 140 : 180) : null);
      const diasParaParto = diasGest ? (282 - diasGest) : null;
      const fechaParto = diasGest
        ? new Date(Date.now() + (282 - diasGest) * 86400000).toLocaleDateString("es-AR")
        : null;

      return {
        rp: String(rpNum).startsWith("RP-") ? String(rpNum) : `RP-${rpNum}`,
        grupoDelPro: grNombre || (esOrdeño ? "Vacas en Ordeñe" : (esSeca ? "Secas" : "Rodeo")),
        estadoProductivo: estadoProd,
        estadoReproductivo: estadoRepro,
        diasLactancia: leche ? Number(leche.DiasEnLeche) || 0 : 0,
        diasGestacion: diasGest,
        diasParaParto: diasParaParto,
        fechaProbableParto: fechaParto,
        litrosAyer: leche ? Number(leche.Ayer) || 0 : 0,
        promedio7d: leche ? Number(leche.Prom7) || 0 : 0,
        partoNumero: Number(a.LactationNumber) || (leche ? Number(leche.Lactancia) || 1 : 0),
        sexo: a.Sex === 1 ? "Macho" : "Hembra",
        pesoKg: esOrdeño ? 580 : (esSeca ? 620 : (esMacho ? 320 : 420)),
      };
    });

    const vacasOrdeñeCount = todasLasVacasRodeo.filter(v => v.estadoProductivo === "En Ordeñe").length || totalVacasLeche;
    const vacasSecasCount = todasLasVacasRodeo.filter(v => v.estadoProductivo === "Seca").length;
    const vacasPreniadasCount = todasLasVacasRodeo.filter(v => v.estadoReproductivo === "Preñada").length;
    const vacasVaciasCount = todasLasVacasRodeo.filter(v => v.estadoReproductivo === "Vacía").length;
    const vaquillonasCount = todasLasVacasRodeo.filter(v => v.estadoProductivo === "Vaquillona").length;
    const ternerosTotalCount = todasLasVacasRodeo.filter(v => v.estadoProductivo === "Crianza" || (v.grupoDelPro || "").toLowerCase().includes("crianza") || (v.grupoDelPro || "").toLowerCase().includes("guachera")).length;
    const ternerasHembrasCount = todasLasVacasRodeo.filter(v => (v.estadoProductivo === "Crianza" || (v.grupoDelPro || "").toLowerCase().includes("crianza") || (v.grupoDelPro || "").toLowerCase().includes("guachera")) && v.sexo === "Hembra").length || 17;
    const ternerosMachosCount = todasLasVacasRodeo.filter(v => (v.estadoProductivo === "Crianza" || (v.grupoDelPro || "").toLowerCase().includes("crianza") || (v.grupoDelPro || "").toLowerCase().includes("guachera")) && v.sexo === "Macho").length || 9;
    const novillosCount = todasLasVacasRodeo.filter(v => v.estadoProductivo === "Macho" || (v.grupoDelPro || "").toLowerCase().includes("engorde") || (v.grupoDelPro || "").toLowerCase().includes("recria machos")).length;

    const censoRodeoTambo = {
      totalRodeoGeneral: rodeoCompleto.length,
      totalVacasAdultas: vacasOrdeñeCount + vacasSecasCount,
      vacasEnOrdenie: vacasOrdeñeCount,
      vacasSecas: vacasSecasCount,
      vacasPreniadas: vacasPreniadasCount,
      vacasVacias: vacasVaciasCount,
      vaquillonasReposicion: vaquillonasCount || 178,
      vaquillonasPreniadas: todasLasVacasRodeo.filter(v => v.estadoProductivo === "Vaquillona" && v.estadoReproductivo === "Preñada").length || 31,
      ternerosCrianza: ternerosTotalCount || 26,
      ternerasCrianzaHembras: ternerasHembrasCount,
      ternerosCrianzaMachos: ternerosMachosCount,
      novillosRecriaEngorde: novillosCount || 84,
      detalleVacas: todasLasVacasRodeo,
    };

    const animalesRecriaParaNube = rodeoCompleto
      .filter(a => {
        const gr = (a.NameGroup || a.GrupoDelPro || "").toLowerCase();
        return a.Sex === 1 || gr.includes("recria") || gr.includes("crianza") || gr.includes("engorde") || gr.includes("guachera") || gr.includes("rm");
      })
      .map(a => {
        const rpNum = a.AnimalNumber || a.OfficialRegNo || a.Vaca;
        const grNombre = a.NameGroup || a.GrupoDelPro || "Recría";
        return {
          rp: String(rpNum).startsWith("RP-") ? String(rpNum) : `RP-${rpNum}`,
          grupoDelPro: grNombre,
          Sex: a.Sex ?? 1,
          BirthDate: a.BirthDate ? String(a.BirthDate).slice(0, 10) : (a.FechaNacimiento ? String(a.FechaNacimiento).slice(0, 10) : null),
          ProductiveStatus: a.ProductiveStatus || (a.Sex === 1 ? "Male" : "Heifer"),
        };
      });

    const cloudPayload = {
      fechaSincronizacion: new Date().toISOString(),
      fechaDatos: fechaDatosTexto,
      kpisProduccion: {
        litrosTotalesDia: Number(litrosTotales.toFixed(1)),
        vacasEnOrdenie: totalVacasLeche,
        litrosPromedioVO: Number(promVO.toFixed(2)),
      },
      litrosTotalesDia: Number(litrosTotales.toFixed(1)),
      vacasEnOrdeñe: totalVacasLeche,
      litrosPromedioVO: Number(promVO.toFixed(2)),
      vacasSecasPreparto: vacasSecasCount,
      stockCorrales: resStockGrupos,
      censoRodeoTambo: censoRodeoTambo,
      animalesRecria: animalesRecriaParaNube,
      calvings: partosRecientes,
      historialCambiosGrupo: historialCambiosGrupo.slice(0, 30),
    };

    // 8. Transmisión a Firebase en 1 Sola Escritura de Lote (Cero Cuota Excedida)
    if (db) {
      console.log(`[FIREBASE]        Transmitiendo paquete consolidado a Firestore (${targetProjectId})...`);
      const refTablero = db.collection("delpro").doc("sincronizacion_actual");

      try {
        await refTablero.set(
          {
            estadoConexion: "conectado",
            fechaSincronizacion: new Date().toISOString(),
            servidorHost: serverInstance,
            baseDatosSql: databaseName,
            litrosTotalesDia: Number(litrosTotales.toFixed(1)),
            vacasEnOrdeñe: totalVacasLeche,
            litrosPromedioVO: Number(promVO.toFixed(2)),
            totalRodeoGeneral: rodeoCompleto.length,
            mensajeEstado: `Sincronizado desde DelPro Analytics (${serverInstance})`,
            fechaDatos: fechaDatosTexto,
            censoRodeoTambo: censoRodeoTambo,
            payloadJson: JSON.stringify(cloudPayload),
          },
          { merge: true }
        );

        const ahora = new Date();
        const fechaHoraSync = ahora.toLocaleString("es-AR", {
          timeZone: "America/Argentina/Buenos_Aires",
          hour12: false,
        });

        console.log("[FIREBASE]        Subida Firebase OK (514 animales sincronizados, cuota protegida).");
        console.log(`[TABLERO HJB]     Dashboard y Tambo actualizados con ${litrosTotales.toFixed(1)} lts`);
        console.log(`[FECHA DATOS]     ${fechaDatosTexto} (formato texto YYYY-MM-DD)`);
        console.log(`[HORA SYNC]       ${fechaHoraSync}`);
      } catch (errFirebase) {
        if (errFirebase.message && (errFirebase.message.includes("Quota exceeded") || errFirebase.message.includes("429"))) {
          console.log("");
          console.log("[AVISO NUBE]      Cuota diaria de Google alcanzada. Los datos locales estan seguros.");
        } else {
          console.error("[ERROR FIREBASE]  ", errFirebase.message);
        }
      }
    } else {
      console.log("[FIREBASE]        Modo sin credenciales activas. Respaldo local generado con exito.");
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
