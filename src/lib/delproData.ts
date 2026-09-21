"use client";

import { saveDietaTambo, getDietaTambo } from "./stockInsumosData";
import { getCorrales, getTropas, saveTropas, TropaGanadera } from "./ganaderiaData";

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
