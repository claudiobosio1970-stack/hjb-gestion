"use client";

import { saveDietaTambo, getDietaTambo } from "./stockInsumosData";
import { getCorrales, getTropas, saveTropas, TropaGanadera } from "./ganaderiaData";
import { db } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { sanitizeForFirestore } from "./agricultureData";

export type EstadoConexionDelPro = "vinculando" | "conectado" | "error" | "desconectado";
export type TipoConexionDelPro = "sql_server" | "delpro_sync_agent" | "archivo_exportacion" | "manual";

export interface PartoDelPro {
  id: string;
  fecha: string;
  rpMadre: string;
  rpCria: string;
  sexo: "Macho" | "Hembra";
  pesoNacimientoKg: number;
  destino: "Engorde / Novillo (Venta Comercial)" | "Tambo (Vaquillona de Reposición)";
  estado: "En Guachera" | "Transferido" | "Baja";
  observaciones?: string;
}

export interface DelProSyncPayload {
  fechaSincronizacion: string;
  litrosTotalesDia: number; // Litros totales medidos por caudalímetros DelPro / tanque
  vacasEnOrdeñe: number; // Vacas en lactancia activa según DelPro
  vacasSecasPreparto?: number;
  litrosPromedioVO?: number; // Calculado: litrosTotalesDia / vacasEnOrdeñe
  dietaAsignada?: {
    pelletSojaKg?: number;
    pelletTrigoKg?: number;
    siloMaizKg?: number;
    maizKg?: number;
    rolloAlfalfaKg?: number;
    salMineralGramos?: number;
  };
  partosRecientes?: PartoDelPro[];
  machosEnRecriaEngorde?: {
    guachera: number;
    rm1: number;
    rm2: number;
    rm3: number;
    terminacion: number;
  };
  hembrasEnReposicionTambo?: number; // Vaquillonas y terneras que van exclusivamente al Tambo
}

export interface DelProConfig {
  estadoConexion: EstadoConexionDelPro;
  tipoConexion: TipoConexionDelPro;
  servidorHost?: string; // ej: "SRV-DELPRO\DELPRO" o IP local
  instanciaSql?: string; // "DELPRO"
  baseDatosSql?: string; // "DelProFarmManager"
  ultimaSincronizacion?: string;
  mensajeEstado: string;
  datosSincronizados: DelProSyncPayload;
}

const STORAGE_DELPRO_CONFIG = "hjb_delpro_integration_config_v01";
export const HJB_DELPRO_SYNC_EVENT = "hjb_delpro_sync_event";

// Datos por defecto mientras se completa la vinculación con DelPro
export const DELPRO_CONFIG_DEFAULT: DelProConfig = {
  estadoConexion: "vinculando",
  tipoConexion: "sql_server",
  servidorHost: "192.168.1.50\\DELPRO",
  instanciaSql: "DELPRO",
  baseDatosSql: "DelProFarmManager",
  ultimaSincronizacion: new Date().toISOString(),
  mensajeEstado: "Vinculación con DeLaval DelPro en proceso (Extracción SQL Server / Agente HJB)",
  datosSincronizados: {
    fechaSincronizacion: new Date().toISOString(),
    litrosTotalesDia: 5049, // 187 VO × 27.0 lts
    vacasEnOrdeñe: 187,
    vacasSecasPreparto: 25,
    litrosPromedioVO: 27.0,
    dietaAsignada: {
      pelletSojaKg: 2.5,
      pelletTrigoKg: 3.0,
      siloMaizKg: 22.0,
      maizKg: 5.5,
      rolloAlfalfaKg: 3.0,
      salMineralGramos: 150,
    },
    hembrasEnReposicionTambo: 48, // 100% de las hembras nacidas van a reposición del tambo
    machosEnRecriaEngorde: {
      guachera: 24,
      rm1: 22,
      rm2: 28,
      rm3: 30,
      terminacion: 26, // Solo machos van a venta comercial / faena
    },
    partosRecientes: [
      {
        id: "p-26-0901",
        fecha: "18/09/26",
        rpMadre: "RP-4102",
        rpCria: "RP-8812 (Macho)",
        sexo: "Macho",
        pesoNacimientoKg: 39,
        destino: "Engorde / Novillo (Venta Comercial)",
        estado: "En Guachera",
        observaciones: "Ternero macho ingresado al circuito de recría para faena",
      },
      {
        id: "p-26-0902",
        fecha: "19/09/26",
        rpMadre: "RP-3890",
        rpCria: "RP-8813 (Hembra)",
        sexo: "Hembra",
        pesoNacimientoKg: 37,
        destino: "Tambo (Vaquillona de Reposición)",
        estado: "En Guachera",
        observaciones: "Ternera hembra reservada para futura vaca lechera del tambo HJB",
      },
      {
        id: "p-26-0903",
        fecha: "20/09/26",
        rpMadre: "RP-4215",
        rpCria: "RP-8814 (Hembra)",
        sexo: "Hembra",
        pesoNacimientoKg: 38,
        destino: "Tambo (Vaquillona de Reposición)",
        estado: "En Guachera",
        observaciones: "Ternera hembra para reposición",
      },
    ],
  },
};

export function getDelProConfig(): DelProConfig {
  if (typeof window === "undefined") return DELPRO_CONFIG_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_DELPRO_CONFIG);
    if (!raw) return DELPRO_CONFIG_DEFAULT;
    const parsed = JSON.parse(raw);
    return {
      ...DELPRO_CONFIG_DEFAULT,
      ...parsed,
      datosSincronizados: {
        ...DELPRO_CONFIG_DEFAULT.datosSincronizados,
        ...(parsed.datosSincronizados || {}),
      },
    };
  } catch {
    return DELPRO_CONFIG_DEFAULT;
  }
}

let isDelProFirestoreSyncInitialized = false;

export function initDelProFirestoreSync(onUpdate?: (config: DelProConfig) => void) {
  if (typeof window === "undefined" || !db) return;
  if (isDelProFirestoreSyncInitialized) return;
  isDelProFirestoreSyncInitialized = true;

  try {
    const docRef = doc(db, "delpro", "sincronizacion_actual");
    onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        let payload: DelProSyncPayload | null = null;
        if (data.payloadJson) {
          try {
            payload = JSON.parse(data.payloadJson);
          } catch {
            // fallback si no es json valido
          }
        }
        
        const current = getDelProConfig();
        const updatedConfig: DelProConfig = {
          ...current,
          estadoConexion: (data.estadoConexion as EstadoConexionDelPro) || "conectado",
          mensajeEstado: data.mensajeEstado || `Sincronizado con DelPro (${new Date().toLocaleTimeString("es-AR")})`,
          servidorHost: data.servidorHost || current.servidorHost,
          baseDatosSql: data.baseDatosSql || current.baseDatosSql,
          ultimaSincronizacion: data.fechaSincronizacion || current.ultimaSincronizacion || new Date().toISOString(),
          datosSincronizados: {
            ...current.datosSincronizados,
            ...(payload || {}),
            litrosTotalesDia: Number(data.litrosTotalesDia ?? payload?.litrosTotalesDia ?? current.datosSincronizados.litrosTotalesDia),
            vacasEnOrdeñe: Number(data.vacasEnOrdeñe ?? payload?.vacasEnOrdeñe ?? current.datosSincronizados.vacasEnOrdeñe),
            litrosPromedioVO: Number(data.litrosPromedioVO ?? payload?.litrosPromedioVO ?? current.datosSincronizados.litrosPromedioVO),
          },
        };

        localStorage.setItem(STORAGE_DELPRO_CONFIG, JSON.stringify(updatedConfig));
        window.dispatchEvent(new CustomEvent(HJB_DELPRO_SYNC_EVENT, { detail: updatedConfig }));
        if (onUpdate) onUpdate(updatedConfig);
      }
    }, (error) => {
      console.warn("Error en listener Firestore DelPro:", error);
    });
  } catch (err) {
    console.warn("No se pudo inicializar listener Firestore DelPro:", err);
  }
}

export function saveDelProConfig(config: Partial<DelProConfig>): DelProConfig {
  if (typeof window === "undefined") return DELPRO_CONFIG_DEFAULT;
  const current = getDelProConfig();
  const updated: DelProConfig = {
    ...current,
    ...config,
    ultimaSincronizacion: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_DELPRO_CONFIG, JSON.stringify(updated));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(HJB_DELPRO_SYNC_EVENT, { detail: updated }));
  }

  // Persistir en Firestore en la nube para sincronización multidispositivo
  if (typeof window !== "undefined" && db) {
    try {
      const firestoreData = {
        estadoConexion: updated.estadoConexion,
        tipoConexion: updated.tipoConexion,
        servidorHost: updated.servidorHost || "localhost\\DELPRO",
        baseDatosSql: updated.baseDatosSql || "DelProFarmManager",
        fechaSincronizacion: updated.ultimaSincronizacion || new Date().toISOString(),
        mensajeEstado: updated.mensajeEstado,
        litrosTotalesDia: updated.datosSincronizados.litrosTotalesDia,
        vacasEnOrdeñe: updated.datosSincronizados.vacasEnOrdeñe,
        litrosPromedioVO: updated.datosSincronizados.litrosPromedioVO,
        payloadJson: JSON.stringify(updated.datosSincronizados),
      };
      setDoc(doc(db, "delpro", "sincronizacion_actual"), sanitizeForFirestore(firestoreData), { merge: true }).catch((err) => {
        console.warn("Error al persistir DelPro en Firestore:", err);
      });
    } catch (err) {
      console.warn("No se pudo escribir en Firestore DelPro:", err);
    }
  }

  return updated;
}

/**
 * Ingesta de paquete de datos desde DeLaval DelPro.
 * Actualiza automáticamente:
 * 1. Litros totales y Vacas en Ordeñe en el módulo Tambo
 * 2. Dieta activa
 * 3. Segregación de partos: Hembras al Tambo, Machos al engorde
 */
export function aplicarSincronizacionDelPro(payload: Partial<DelProSyncPayload>): DelProConfig {
  const current = getDelProConfig();
  const mergedDatos: DelProSyncPayload = {
    ...current.datosSincronizados,
    ...payload,
    fechaSincronizacion: new Date().toISOString(),
  };

  // Calcular litros promedio si vienen litros y vacas
  if (mergedDatos.litrosTotalesDia > 0 && mergedDatos.vacasEnOrdeñe > 0) {
    mergedDatos.litrosPromedioVO = Number((mergedDatos.litrosTotalesDia / mergedDatos.vacasEnOrdeñe).toFixed(2));
  }

  // 1. Sincronizar Tambo (Dieta y Rodeo)
  saveDietaTambo({
    vacasEnOrdeñe: mergedDatos.vacasEnOrdeñe,
    vacasPreparto: mergedDatos.vacasSecasPreparto,
    litrosPromedioVO: mergedDatos.litrosPromedioVO,
    actualizadoPor: "DeLaval DelPro (Sincronización Automática)",
  });

  // 2. Guardar estado DelPro
  const updatedConfig = saveDelProConfig({
    estadoConexion: "conectado",
    mensajeEstado: `Sincronizado con DelPro exitosamente (${new Date().toLocaleTimeString("es-AR")})`,
    datosSincronizados: mergedDatos,
  });

  return updatedConfig;
}

/**
 * Importa y aplica un archivo delpro_sync.json extraído mediante Microsoft SQL Server
 */
export function importarPayloadDesdeJson(jsonString: string): { success: boolean; mensaje: string; config?: DelProConfig } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== "object") {
      return { success: false, mensaje: "El archivo no contiene un objeto JSON válido." };
    }

    const payload: Partial<DelProSyncPayload> = {
      fechaSincronizacion: parsed.fechaSincronizacion || new Date().toISOString(),
      litrosTotalesDia: Number(parsed.litrosTotalesDia) || 0,
      vacasEnOrdeñe: Number(parsed.vacasEnOrdeñe || parsed.vacasEnOrdenie) || 0,
      vacasSecasPreparto: Number(parsed.vacasSecasPreparto) || 0,
      litrosPromedioVO: Number(parsed.litrosPromedioVO) || (parsed.vacasEnOrdeñe > 0 ? Number((parsed.litrosTotalesDia / parsed.vacasEnOrdeñe).toFixed(2)) : 27.0),
      dietaAsignada: parsed.dietaAsignada,
      hembrasEnReposicionTambo: parsed.hembrasEnReposicionTambo,
      machosEnRecriaEngorde: parsed.machosEnRecriaEngorde,
      partosRecientes: Array.isArray(parsed.partosRecientes) ? parsed.partosRecientes : [],
    };

    const host = parsed.servidorHost || parsed.origenExtraccion || "SQL Server Local";
    const base = parsed.baseDatosSql || "DelProFarmManager";

    const config = saveDelProConfig({
      estadoConexion: "conectado",
      tipoConexion: "sql_server",
      servidorHost: host,
      baseDatosSql: base,
      mensajeEstado: `Datos extraídos de SQL Server (${new Date().toLocaleTimeString("es-AR")})`,
      datosSincronizados: {
        ...getDelProConfig().datosSincronizados,
        ...payload,
      },
    });

    // Sincronizar también con la dieta del tambo
    saveDietaTambo({
      vacasEnOrdeñe: payload.vacasEnOrdeñe || 187,
      vacasPreparto: payload.vacasSecasPreparto || 25,
      litrosPromedioVO: payload.litrosPromedioVO || 27.0,
      actualizadoPor: `Extracción SQL Server (${host})`,
    });

    return {
      success: true,
      mensaje: `✓ Sincronización exitosa: ${payload.vacasEnOrdeñe} VO, ${payload.litrosTotalesDia?.toLocaleString("es-AR")} lts/día, ${payload.partosRecientes?.length || 0} partos procesados.`,
      config,
    };
  } catch (err: any) {
    return {
      success: false,
      mensaje: `Error al procesar archivo JSON: ${err?.message || "Formato no válido"}`,
    };
  }
}

export const DELPRO_SQL_QUERIES_SAMPLE = `-- =========================================================================================
-- CONSULTAS SQL OFICIALES DE EXTRACCIÓN - DELAVAL DELPRO FARMMANAGER (HJB)
-- =========================================================================================

-- 1. PRODUCCIÓN DIARIA Y VACAS EN ORDEÑE (VO)
SELECT 
    COUNT(DISTINCT dm.AnimalOID) AS VacasEnOrdeñe,
    ROUND(SUM(dm.TotalYield), 1) AS LitrosTotalesDia,
    ROUND(AVG(dm.TotalYield), 2) AS LitrosPromedioVO
FROM DailyMilkYield dm WITH (NOLOCK)
WHERE dm.YieldDate >= CAST(DATEADD(day, -1, GETDATE()) AS DATE);

-- 2. PARTOS RECIENTES Y SEGREGACIÓN HJB (HEMBRAS A REPOSICIÓN / MACHOS A FAENA)
SELECT TOP 20
    c.OID AS PartoId,
    CONVERT(VARCHAR(10), c.EventDate, 103) AS FechaParto,
    m.VisualID AS RPMadre,
    k.VisualID AS RPCria,
    CASE WHEN k.Sex = 1 THEN 'Macho' ELSE 'Hembra' END AS Sexo,
    ROUND(ISNULL(k.BirthWeight, 38.0), 1) AS PesoKg,
    CASE 
        WHEN k.Sex = 1 THEN 'Engorde / Novillo (Venta Comercial)'
        ELSE 'Tambo (Vaquillona de Reposición)'
    END AS DestinoHJB
FROM Calving c WITH (NOLOCK)
JOIN Animal m WITH (NOLOCK) ON c.MotherAnimalOID = m.OID
LEFT JOIN Animal k WITH (NOLOCK) ON c.CalfAnimalOID = k.OID
ORDER BY c.EventDate DESC;`;
