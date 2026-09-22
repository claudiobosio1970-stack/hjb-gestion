"use client";

import { saveDietaTambo, getDietaTambo } from "./stockInsumosData";
import {
  getCorrales,
  getTropas,
  saveTropas,
  TropaGanadera,
  sincronizarGanaderiaDesdeDelPro,
  HJB_GANADERIA_SYNC_EVENT,
} from "./ganaderiaData";
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

export interface VacaTamboIndividual {
  rp: string;
  estadoProductivo: "En Ordeñe" | "Seca";
  estadoReproductivo: "Preñada" | "Vacía" | "Inseminada";
  diasLactancia: number; // DEL
  diasGestacion?: number;
  fechaProbableParto?: string;
  litrosAyer: number;
}

export interface CensoRodeoTambo {
  totalVacasAdultas: number;
  vacasEnOrdenie: number;
  vacasSecas: number;
  vacasPreniadas: number;
  vacasVacias: number;
  vaquillonasReposicion: number;
  vaquillonasPreniadas: number;
  detalleVacas?: VacaTamboIndividual[];
}

export interface AnimalRecriaIndividual {
  rp: string;
  corralId: "guachera" | "rm1" | "rm2" | "rm3" | "terminacion";
  pesoActualKg: number;
  diasEnCorral: number;
  fechaIngresoCorral: string;
  gdpvKgDia: number;
  origen: string;
  listoFaena?: boolean;
}

export interface TraspasoCorralRegistro {
  id: string;
  fecha: string;
  rpAnimal: string;
  corralOrigen: "guachera" | "rm1" | "rm2" | "rm3" | "terminacion";
  corralDestino: "guachera" | "rm1" | "rm2" | "rm3" | "terminacion";
  pesoAlTraspaso: number;
  motivo: string;
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
  censoRodeoTambo?: CensoRodeoTambo;
  animalesRecria?: AnimalRecriaIndividual[];
  traspasosAutomaticos?: TraspasoCorralRegistro[];
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
const STORAGE_ANIMALES_RECRIA = "hjb_delpro_animales_recria_v01";
const STORAGE_TRASPASOS_CORRALES = "hjb_delpro_traspasos_corrales_v01";
export const HJB_DELPRO_SYNC_EVENT = "hjb_delpro_sync_event";

export function generateDefaultVacasTambo(): VacaTamboIndividual[] {
  const vacas: VacaTamboIndividual[] = [];
  // 187 vacas en lactancia activa (VO)
  for (let i = 1; i <= 187; i++) {
    const rpNum = 3000 + i * 7;
    const del = 30 + ((i * 17) % 270);
    const isPreniada = (i % 4 !== 0); // 75% preñadas
    const diasGest = isPreniada ? 40 + ((i * 23) % 220) : undefined;
    const lts = Number((22.0 + ((i * 13) % 150) / 10).toFixed(1));
    const fechaPartoProb = diasGest
      ? new Date(Date.now() + (282 - diasGest) * 86400000).toLocaleDateString("es-AR")
      : undefined;

    vacas.push({
      rp: `RP-${rpNum}`,
      estadoProductivo: "En Ordeñe",
      estadoReproductivo: isPreniada ? "Preñada" : (i % 2 === 0 ? "Inseminada" : "Vacía"),
      diasLactancia: del,
      diasGestacion: diasGest,
      fechaProbableParto: fechaPartoProb,
      litrosAyer: lts,
    });
  }
  // 25 vacas secas preparto
  for (let i = 1; i <= 25; i++) {
    const rpNum = 4400 + i * 5;
    const diasGest = 220 + (i * 2);
    const fechaPartoProb = new Date(Date.now() + (282 - diasGest) * 86400000).toLocaleDateString("es-AR");

    vacas.push({
      rp: `RP-${rpNum}`,
      estadoProductivo: "Seca",
      estadoReproductivo: "Preñada",
      diasLactancia: 0,
      diasGestacion: diasGest,
      fechaProbableParto: fechaPartoProb,
      litrosAyer: 0,
    });
  }
  return vacas;
}

export function generateDefaultAnimalesRecria(): AnimalRecriaIndividual[] {
  const animales: AnimalRecriaIndividual[] = [];
  // Guachera: 24 animales (38 a 79 kg)
  for (let i = 1; i <= 24; i++) {
    const peso = Number((42.0 + (i * 1.5)).toFixed(1));
    animales.push({
      rp: `RP-${8800 + i}`,
      corralId: "guachera",
      pesoActualKg: peso,
      diasEnCorral: 10 + i * 2,
      fechaIngresoCorral: new Date(Date.now() - (10 + i * 2) * 86400000).toLocaleDateString("es-AR"),
      gdpvKgDia: 0.62,
      origen: "Nacimiento Tambo HJB",
    });
  }
  // RM1: 22 animales (80 a 119 kg)
  for (let i = 1; i <= 22; i++) {
    const peso = Number((82.0 + (i * 1.7)).toFixed(1));
    animales.push({
      rp: `RP-${8750 + i}`,
      corralId: "rm1",
      pesoActualKg: peso,
      diasEnCorral: 12 + i * 2,
      fechaIngresoCorral: new Date(Date.now() - (12 + i * 2) * 86400000).toLocaleDateString("es-AR"),
      gdpvKgDia: 1.29,
      origen: "Pase desde Guachera",
    });
  }
  // RM2: 28 animales (120 a 169 kg)
  for (let i = 1; i <= 28; i++) {
    const peso = Number((122.0 + (i * 1.65)).toFixed(1));
    animales.push({
      rp: `RP-${8700 + i}`,
      corralId: "rm2",
      pesoActualKg: peso,
      diasEnCorral: 15 + i * 2,
      fechaIngresoCorral: new Date(Date.now() - (15 + i * 2) * 86400000).toLocaleDateString("es-AR"),
      gdpvKgDia: 0.93,
      origen: "Pase desde RM1",
    });
  }
  // RM3: 30 animales (170 a 269 kg)
  for (let i = 1; i <= 30; i++) {
    const peso = Number((172.0 + (i * 3.2)).toFixed(1));
    animales.push({
      rp: `RP-${8650 + i}`,
      corralId: "rm3",
      pesoActualKg: peso,
      diasEnCorral: 20 + i * 3,
      fechaIngresoCorral: new Date(Date.now() - (20 + i * 3) * 86400000).toLocaleDateString("es-AR"),
      gdpvKgDia: 0.83,
      origen: "Pase desde RM2",
    });
  }
  // Terminación: 26 animales (270 a 415 kg)
  for (let i = 1; i <= 26; i++) {
    const peso = Number((280.0 + (i * 5.0)).toFixed(1));
    animales.push({
      rp: `RP-${8600 + i}`,
      corralId: "terminacion",
      pesoActualKg: peso,
      diasEnCorral: 15 + i * 2,
      fechaIngresoCorral: new Date(Date.now() - (15 + i * 2) * 86400000).toLocaleDateString("es-AR"),
      gdpvKgDia: 1.49,
      origen: "Pase desde RM3",
      listoFaena: peso >= 370,
    });
  }
  return animales;
}

const defaultVacas = generateDefaultVacasTambo();
const defaultAnimales = generateDefaultAnimalesRecria();

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
    censoRodeoTambo: {
      totalVacasAdultas: 212,
      vacasEnOrdenie: 187,
      vacasSecas: 25,
      vacasPreniadas: 142,
      vacasVacias: 45,
      vaquillonasReposicion: 48,
      vaquillonasPreniadas: 22,
      detalleVacas: defaultVacas,
    },
    animalesRecria: defaultAnimales,
    traspasosAutomaticos: [
      {
        id: "tr-hist-1",
        fecha: "18/09/26",
        rpAnimal: "RP-8749",
        corralOrigen: "rm1",
        corralDestino: "rm2",
        pesoAlTraspaso: 121.5,
        motivo: "Alcanzó 121.5 kg (Corte 120 kg RM1 -> RM2)",
      },
      {
        id: "tr-hist-2",
        fecha: "15/09/26",
        rpAnimal: "RP-8699",
        corralOrigen: "rm2",
        corralDestino: "rm3",
        pesoAlTraspaso: 172.0,
        motivo: "Alcanzó 172.0 kg (Corte 170 kg RM2 -> RM3)",
      },
      {
        id: "tr-hist-3",
        fecha: "10/09/26",
        rpAnimal: "RP-8649",
        corralOrigen: "rm3",
        corralDestino: "terminacion",
        pesoAlTraspaso: 274.0,
        motivo: "Alcanzó 274.0 kg (Corte 270 kg RM3 -> Terminación)",
      },
    ],
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
        censoRodeoTambo: parsed.datosSincronizados?.censoRodeoTambo || DELPRO_CONFIG_DEFAULT.datosSincronizados.censoRodeoTambo,
        animalesRecria: parsed.datosSincronizados?.animalesRecria || DELPRO_CONFIG_DEFAULT.datosSincronizados.animalesRecria,
        traspasosAutomaticos: parsed.datosSincronizados?.traspasosAutomaticos || DELPRO_CONFIG_DEFAULT.datosSincronizados.traspasosAutomaticos,
      },
    };
  } catch {
    return DELPRO_CONFIG_DEFAULT;
  }
}

export function getAnimalesRecria(): AnimalRecriaIndividual[] {
  if (typeof window === "undefined") return defaultAnimales;
  try {
    const raw = localStorage.getItem(STORAGE_ANIMALES_RECRIA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return getDelProConfig().datosSincronizados.animalesRecria || defaultAnimales;
}

export function saveAnimalesRecria(animales: AnimalRecriaIndividual[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_ANIMALES_RECRIA, JSON.stringify(animales));
}

export function getTraspasosCorrales(): TraspasoCorralRegistro[] {
  if (typeof window === "undefined") return DELPRO_CONFIG_DEFAULT.datosSincronizados.traspasosAutomaticos || [];
  try {
    const raw = localStorage.getItem(STORAGE_TRASPASOS_CORRALES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return getDelProConfig().datosSincronizados.traspasosAutomaticos || [];
}

export function saveTraspasosCorrales(traspasos: TraspasoCorralRegistro[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_TRASPASOS_CORRALES, JSON.stringify(traspasos));
}

export function getCensoRodeoTambo(): CensoRodeoTambo {
  const config = getDelProConfig();
  if (config.datosSincronizados.censoRodeoTambo) {
    return config.datosSincronizados.censoRodeoTambo;
  }
  return {
    totalVacasAdultas: 212,
    vacasEnOrdenie: config.datosSincronizados.vacasEnOrdeñe,
    vacasSecas: config.datosSincronizados.vacasSecasPreparto || 25,
    vacasPreniadas: 142,
    vacasVacias: 45,
    vaquillonasReposicion: config.datosSincronizados.hembrasEnReposicionTambo || 48,
    vaquillonasPreniadas: 22,
    detalleVacas: defaultVacas,
  };
}

/**
 * Motor de Traspasos Automáticos entre Corrales de Recría según peso y días (Escala HJB)
 */
export function evaluarYEjecutarTraspasosAutomaticos(
  animalesActuales: AnimalRecriaIndividual[]
): {
  animalesActualizados: AnimalRecriaIndividual[];
  traspasosRealizados: TraspasoCorralRegistro[];
  resumenPorCorral: { guachera: number; rm1: number; rm2: number; rm3: number; terminacion: number };
} {
  const hoy = new Date().toLocaleDateString("es-AR");
  const traspasos: TraspasoCorralRegistro[] = [];
  const actualizados: AnimalRecriaIndividual[] = [];

  for (const a of animalesActuales) {
    let nuevoCorral: "guachera" | "rm1" | "rm2" | "rm3" | "terminacion" = a.corralId;
    let motivo = "";

    // 1. Guachera -> RM1: corte 80 kg o 60 días
    if (a.corralId === "guachera" && (a.pesoActualKg >= 80 || a.diasEnCorral >= 60)) {
      nuevoCorral = "rm1";
      motivo = `Alcanzó ${a.pesoActualKg} kg / desleche (Corte 80 kg Guachera -> RM1)`;
    }
    // 2. RM1 -> RM2: corte 120 kg
    else if (a.corralId === "rm1" && a.pesoActualKg >= 120) {
      nuevoCorral = "rm2";
      motivo = `Alcanzó ${a.pesoActualKg} kg (Corte 120 kg RM1 -> RM2)`;
    }
    // 3. RM2 -> RM3: corte 170 kg
    else if (a.corralId === "rm2" && a.pesoActualKg >= 170) {
      nuevoCorral = "rm3";
      motivo = `Alcanzó ${a.pesoActualKg} kg (Corte 170 kg RM2 -> RM3)`;
    }
    // 4. RM3 -> Terminación: corte 270 kg
    else if (a.corralId === "rm3" && a.pesoActualKg >= 270) {
      nuevoCorral = "terminacion";
      motivo = `Alcanzó ${a.pesoActualKg} kg (Corte 270 kg RM3 -> Terminación)`;
    }

    if (nuevoCorral !== a.corralId) {
      traspasos.push({
        id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        fecha: hoy,
        rpAnimal: a.rp,
        corralOrigen: a.corralId,
        corralDestino: nuevoCorral,
        pesoAlTraspaso: a.pesoActualKg,
        motivo,
      });

      actualizados.push({
        ...a,
        corralId: nuevoCorral,
        diasEnCorral: 0,
        fechaIngresoCorral: hoy,
        listoFaena: nuevoCorral === "terminacion" && a.pesoActualKg >= 370,
      });
    } else {
      actualizados.push({
        ...a,
        listoFaena: a.corralId === "terminacion" && a.pesoActualKg >= 370,
      });
    }
  }

  const resumen = {
    guachera: actualizados.filter((x) => x.corralId === "guachera").length,
    rm1: actualizados.filter((x) => x.corralId === "rm1").length,
    rm2: actualizados.filter((x) => x.corralId === "rm2").length,
    rm3: actualizados.filter((x) => x.corralId === "rm3").length,
    terminacion: actualizados.filter((x) => x.corralId === "terminacion").length,
  };

  return {
    animalesActualizados: actualizados,
    traspasosRealizados: traspasos,
    resumenPorCorral: resumen,
  };
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
        const payloadData: Partial<DelProSyncPayload> = {
          ...(payload || {}),
          litrosTotalesDia: Number(data.litrosTotalesDia ?? payload?.litrosTotalesDia ?? current.datosSincronizados.litrosTotalesDia),
          vacasEnOrdeñe: Number(data.vacasEnOrdeñe ?? payload?.vacasEnOrdeñe ?? current.datosSincronizados.vacasEnOrdeñe),
          litrosPromedioVO: Number(data.litrosPromedioVO ?? payload?.litrosPromedioVO ?? current.datosSincronizados.litrosPromedioVO),
          fechaSincronizacion: data.fechaSincronizacion || current.ultimaSincronizacion || new Date().toISOString(),
          censoRodeoTambo: payload?.censoRodeoTambo || current.datosSincronizados.censoRodeoTambo,
          animalesRecria: payload?.animalesRecria || current.datosSincronizados.animalesRecria,
          traspasosAutomaticos: payload?.traspasosAutomaticos || current.datosSincronizados.traspasosAutomaticos,
        };

        const updatedConfig = propagarDatosDelProATodoElSistema(payloadData, {
          estadoConexion: (data.estadoConexion as EstadoConexionDelPro) || "conectado",
          servidorHost: data.servidorHost || current.servidorHost,
          baseDatosSql: data.baseDatosSql || current.baseDatosSql,
          mensajeEstado: data.mensajeEstado || `Sincronizado con DelPro (${new Date().toLocaleTimeString("es-AR")})`,
        });

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
 * Propaga los datos extraídos de DeLaval DelPro a TODO el sistema HJB:
 * 1. Tambo (Litros del día, vacas en ordeñe, vacas secas, promedio lts/VO, raciones)
 * 2. Insumos (Recalcula consumo diario por cabeza de pellets, silos y granos, y días de autonomía)
 * 3. Ganadería (Actualiza cabezas de machos en recría/terminación y registra nacimientos segregados)
 * 4. Dashboard e Inicio (Refleja facturación y costos operativos del tambo en tiempo real)
 */
export function propagarDatosDelProATodoElSistema(
  payload: Partial<DelProSyncPayload>,
  metadatos?: { servidorHost?: string; baseDatosSql?: string; mensajeEstado?: string; estadoConexion?: EstadoConexionDelPro }
): DelProConfig {
  const current = getDelProConfig();
  const mergedDatos: DelProSyncPayload = {
    ...current.datosSincronizados,
    ...payload,
    fechaSincronizacion: payload.fechaSincronizacion || new Date().toISOString(),
  };

  // Calcular litros promedio si vienen litros y vacas
  if (mergedDatos.litrosTotalesDia > 0 && mergedDatos.vacasEnOrdeñe > 0) {
    mergedDatos.litrosPromedioVO = Number((mergedDatos.litrosTotalesDia / mergedDatos.vacasEnOrdeñe).toFixed(2));
  }

  // 1. Sincronizar Módulo Tambo & Dieta / Stock
  const currentDieta = getDietaTambo();
  const racionesActualizadas = { ...currentDieta.racionesKgDia };
  if (mergedDatos.dietaAsignada) {
    if (mergedDatos.dietaAsignada.pelletSojaKg !== undefined && mergedDatos.dietaAsignada.pelletSojaKg > 0) {
      racionesActualizadas["pellet-soja"] = mergedDatos.dietaAsignada.pelletSojaKg;
    }
    if (mergedDatos.dietaAsignada.pelletTrigoKg !== undefined && mergedDatos.dietaAsignada.pelletTrigoKg > 0) {
      racionesActualizadas["pellet-trigo"] = mergedDatos.dietaAsignada.pelletTrigoKg;
    }
    if (mergedDatos.dietaAsignada.siloMaizKg !== undefined && mergedDatos.dietaAsignada.siloMaizKg > 0) {
      racionesActualizadas["silo-maiz"] = mergedDatos.dietaAsignada.siloMaizKg;
    }
    if (mergedDatos.dietaAsignada.maizKg !== undefined && mergedDatos.dietaAsignada.maizKg > 0) {
      racionesActualizadas["maiz"] = mergedDatos.dietaAsignada.maizKg;
    }
  }

  saveDietaTambo({
    vacasEnOrdeñe: mergedDatos.vacasEnOrdeñe,
    vacasPreparto: mergedDatos.vacasSecasPreparto,
    litrosPromedioVO: mergedDatos.litrosPromedioVO,
    racionesKgDia: racionesActualizadas,
    actualizadoPor: "DeLaval DelPro (Sincronización Automática)",
  });

  // 2. Procesar animales de recría y ejecutar traspasos automáticos si corresponde
  let animalesActuales = mergedDatos.animalesRecria || getAnimalesRecria();
  const resultadoTraspasos = evaluarYEjecutarTraspasosAutomaticos(animalesActuales);
  saveAnimalesRecria(resultadoTraspasos.animalesActualizados);

  if (resultadoTraspasos.traspasosRealizados.length > 0) {
    const historialActual = getTraspasosCorrales();
    const nuevoHistorial = [...resultadoTraspasos.traspasosRealizados, ...historialActual].slice(0, 50);
    saveTraspasosCorrales(nuevoHistorial);
    mergedDatos.traspasosAutomaticos = nuevoHistorial;
  } else if (!mergedDatos.traspasosAutomaticos) {
    mergedDatos.traspasosAutomaticos = getTraspasosCorrales();
  }
  mergedDatos.animalesRecria = resultadoTraspasos.animalesActualizados;
  mergedDatos.machosEnRecriaEngorde = resultadoTraspasos.resumenPorCorral;

  // 3. Sincronizar Módulo Ganadería (Machos a recría, hembras a reposición tambo)
  sincronizarGanaderiaDesdeDelPro(
    mergedDatos.machosEnRecriaEngorde,
    mergedDatos.partosRecientes
  );

  // 4. Guardar estado y configuración DelPro
  const updatedConfig = saveDelProConfig({
    estadoConexion: metadatos?.estadoConexion || "conectado",
    tipoConexion: "sql_server",
    servidorHost: metadatos?.servidorHost || current.servidorHost,
    baseDatosSql: metadatos?.baseDatosSql || current.baseDatosSql,
    mensajeEstado: metadatos?.mensajeEstado || `Sincronizado con DelPro exitosamente (${new Date().toLocaleTimeString("es-AR")})`,
    datosSincronizados: mergedDatos,
  });

  return updatedConfig;
}

/**
 * Ingesta de paquete de datos desde DeLaval DelPro.
 */
export function aplicarSincronizacionDelPro(payload: Partial<DelProSyncPayload>): DelProConfig {
  return propagarDatosDelProATodoElSistema(payload);
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
      censoRodeoTambo: parsed.censoRodeoTambo,
      animalesRecria: parsed.animalesRecria,
      traspasosAutomaticos: parsed.traspasosAutomaticos,
    };

    const host = parsed.servidorHost || parsed.origenExtraccion || "SQL Server Local";
    const base = parsed.baseDatosSql || "DelProFarmManager";

    const config = propagarDatosDelProATodoElSistema(payload, {
      servidorHost: host,
      baseDatosSql: base,
      mensajeEstado: `Datos extraídos de SQL Server (${new Date().toLocaleTimeString("es-AR")})`,
    });

    return {
      success: true,
      mensaje: `✓ Sincronización exitosa: ${payload.vacasEnOrdeñe} VO, ${payload.litrosTotalesDia?.toLocaleString("es-AR")} lts/día, ${payload.partosRecientes?.length || 0} partos procesados. Todo el sistema actualizado.`,
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
ORDER BY c.EventDate DESC;

-- 3. CENSO DEL RODEO Y ESTADO REPRODUCTIVO INDIVIDUAL (RP / CARAVANA)
SELECT 
    a.VisualID AS RP,
    CASE WHEN a.LactationStatus = 1 THEN 'En Ordeñe' ELSE 'Seca' END AS EstadoProductivo,
    CASE WHEN a.Pregnant = 1 THEN 'Preñada' ELSE 'Vacía' END AS EstadoReproductivo,
    ISNULL(DATEDIFF(day, c.EventDate, GETDATE()), 120) AS DiasLactancia,
    ROUND(ISNULL(y.TotalYield, 27.0), 1) AS LitrosAyer
FROM Animal a WITH (NOLOCK)
LEFT JOIN (SELECT MotherAnimalOID, MAX(EventDate) AS EventDate FROM Calving WITH (NOLOCK) GROUP BY MotherAnimalOID) c ON c.MotherAnimalOID = a.OID
LEFT JOIN (SELECT AnimalOID, TotalYield FROM DailyMilkYield WITH (NOLOCK) WHERE YieldDate >= CAST(DATEADD(day, -2, GETDATE()) AS DATE)) y ON y.AnimalOID = a.OID
WHERE a.Sex = 2 AND a.VisualID IS NOT NULL
ORDER BY a.VisualID;

-- 4. TERNEROS EN RECRÍA Y ENGORDE (INDIVIDUAL POR CARAVANA / RP)
SELECT 
    a.VisualID AS RP,
    ISNULL(w.Weight, 120.0) AS PesoActualKg,
    DATEDIFF(day, a.BirthDate, GETDATE()) AS DiasVida
FROM Animal a WITH (NOLOCK)
LEFT JOIN (SELECT AnimalOID, MAX(Weight) AS Weight FROM WeightEvent WITH (NOLOCK) GROUP BY AnimalOID) w ON w.AnimalOID = a.OID
WHERE a.Sex = 1 AND a.VisualID IS NOT NULL
ORDER BY a.VisualID;`;
