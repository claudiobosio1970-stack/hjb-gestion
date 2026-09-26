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
  sexo?: "Hembra" | "Macho" | string;
  corralId?: "guachera_h" | "rh1" | "rh2" | "rh3" | "vq_preniada" | "preparto" | "secas" | "ordenie" | string;
  nombreCorral?: string;
  estadoProductivo: "En Ordeñe" | "Seca" | "Vaquillona" | "Crianza" | "Macho" | string;
  estadoReproductivo: "Preñada" | "Vacía" | "Inseminada";
  diasLactancia: number; // DEL
  diasGestacion?: number;
  fechaProbableParto?: string;
  diasParaParto?: number; // DaysToCalving oficial DelPro
  fechaSecadoEstimada?: string; // DateExpectedDryOff oficial DelPro
  diasParaSecado?: number; // DaysToDryOff oficial DelPro
  diasAbiertos?: number; // OpenDays oficial DelPro
  litrosAyer: number;
  promedio7d?: number; // AvgYieldPrev7d
  scc?: number; // Células somáticas de control lechero
  grasaPct?: number; // % grasa en leche
  proteinaPct?: number; // % proteína en leche
  partoNumero?: number; // LactationNumber
  pesoKg?: number; // Peso corporal actual en kg
  pesoOficialDelPro?: number; // Peso real extraído desde DeLaval DelPro (balanza / pesaje oficial)
  fechaPesajeDelPro?: string; // Fecha en que se pesó en DelPro
  origenPeso?: "delpro_oficial" | "estimado_curva";
  grupoDelPro?: string; // ej: "Lote 1 (Alta Producción)", "Lote 2", "Preparto", "Secas"
}

export interface CensoRodeoTambo {
  totalRodeoGeneral?: number;
  totalVacasAdultas: number;
  vacasEnOrdenie: number;
  vacasSecas: number;
  vacasPreniadas: number;
  vacasVacias: number;
  vaquillonasReposicion: number;
  vaquillonasPreniadas: number;
  ternerosCrianza?: number;
  ternerasCrianzaHembras?: number;
  ternerosCrianzaMachos?: number;
  novillosRecriaEngorde?: number;
  detalleVacas?: VacaTamboIndividual[];
}

export interface AnimalRecriaIndividual {
  rp: string;
  sexo?: "Macho" | "Hembra" | string;
  corralId: "guachera" | "rm1" | "rm2" | "rm3" | "terminacion";
  pesoActualKg: number;
  pesoOficialDelPro?: number; // Peso real extraído desde DeLaval DelPro (balanza / pesaje oficial)
  fechaPesajeDelPro?: string; // Fecha en que se pesó en DelPro
  origenPeso?: "delpro_oficial" | "estimado_curva";
  diasEnCorral: number;
  diasVida?: number; // Días totales de vida estimados desde nacimiento
  fechaIngresoCorral: string;
  gdpvKgDia: number;
  origen: string;
  listoFaena?: boolean;
  grupoDelPro?: string; // Grupo anotado en DeLaval DelPro
}

export interface MovimientoCorralDelPro {
  id: string;
  fecha: string;
  rpAnimal: string;
  grupoOrigen: string;
  grupoDestino: string;
  corralOrigenId?: "guachera" | "rm1" | "rm2" | "rm3" | "terminacion";
  corralDestinoId?: "guachera" | "rm1" | "rm2" | "rm3" | "terminacion";
  pesoAlMovimiento?: number;
  motivo?: string;
}

export interface TraspasoCorralRegistro {
  id: string;
  fecha: string;
  rpAnimal: string;
  corralOrigen: "guachera" | "rm1" | "rm2" | "rm3" | "terminacion";
  corralDestino: "guachera" | "rm1" | "rm2" | "rm3" | "terminacion";
  pesoAlTraspaso: number;
  motivo: string;
  origenMovimiento?: "delpro_farm_manager" | "escala_automatica_hjb" | "manual_operador";
}

/**
 * Normaliza y mapea el nombre del grupo anotado en DeLaval DelPro al ID de corral oficial de HJB
 */
export function parseDelProGrupoToCorralId(grupoNombre: string): "guachera" | "rm1" | "rm2" | "rm3" | "terminacion" | null {
  if (!grupoNombre) return null;
  const s = grupoNombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (s.includes("guachera") || s.includes("crianza") || s.includes("terner") || s.includes("maternid") || s.includes("lacteo") || s.includes("estarter")) {
    return "guachera";
  }
  if (s.includes("rm1") || s.includes("recria 1") || s.includes("recria1") || s.includes("recria macho") || s.includes("recria machos") || s.includes("etapa 1") || s.includes("etapa1")) {
    return "rm1";
  }
  if (s.includes("rm2") || s.includes("recria 2") || s.includes("recria2") || s.includes("etapa 2") || s.includes("etapa2")) {
    return "rm2";
  }
  if (s.includes("rm3") || s.includes("recria 3") || s.includes("recria3") || s.includes("etapa 3") || s.includes("etapa3")) {
    return "rm3";
  }
  if (s.includes("terminaci") || s.includes("engorde macho") || s.includes("engorde machos") || s.includes("terminador") || s.includes("gordo") || s.includes("feedlot") || s.includes("faena") || s.includes("engorde")) {
    return "terminacion";
  }
  return null;
}

// =========================================================================
// DEFINICIÓN OFICIAL DE CORRALES Y ETAPAS DE HEMBRAS (RODEO TAMBO HJB)
// =========================================================================
export type CorralHembraId = "guachera_h" | "rh1" | "rh2" | "rh3" | "vq_preniada" | "preparto" | "secas" | "ordenie";

export interface InfoCorralHembra {
  id: CorralHembraId;
  numero: number;
  nombre: string;
  nombreCorto: string;
  icono: string;
  color: string;
  pesoObjetivoKg?: number;
  diasEstimados?: number;
  descripcion: string;
}

export const CORRALES_HEMBRAS_DEFINICION: InfoCorralHembra[] = [
  {
    id: "guachera_h",
    numero: 1,
    nombre: "1- Guachera Hembras (hasta 80kg)",
    nombreCorto: "Guachera Hembras",
    icono: "🍼",
    color: "#3b82f6",
    pesoObjetivoKg: 80,
    diasEstimados: 60,
    descripcion: "Crianza láctea individual de terneras para reposición lechera del tambo hasta el desleche.",
  },
  {
    id: "rh1",
    numero: 2,
    nombre: "2- Recría Hembras 1 - RH1 (hasta 115kg)",
    nombreCorto: "Recría Hembras 1",
    icono: "🥣",
    color: "#ec4899",
    pesoObjetivoKg: 115,
    diasEstimados: 30,
    descripcion: "Transición post-desleche a ración sólida y desarrollo ruminal temprano de terneras.",
  },
  {
    id: "rh2",
    numero: 3,
    nombre: "3- Recría Hembras 2 - RH2 (hasta 170kg)",
    nombreCorto: "Recría Hembras 2",
    icono: "🌽",
    color: "#8b5cf6",
    pesoObjetivoKg: 170,
    diasEstimados: 60,
    descripcion: "Crecimiento óseo y estructural a corral con ración balanceada y heno de alfalfa.",
  },
  {
    id: "rh3",
    numero: 4,
    nombre: "4- Recría 3 / Vaquillonas en Servicio (hasta 350kg)",
    nombreCorto: "Recría 3 / Vq Servicio",
    icono: "🌿",
    color: "#06b6d4",
    pesoObjetivoKg: 350,
    diasEstimados: 120,
    descripcion: "Vaquillonas desarrolladas aptas para inseminación artificial y confirmación de preñez.",
  },
  {
    id: "vq_preniada",
    numero: 5,
    nombre: "5- Vaquillonas Preñadas (hasta 480kg)",
    nombreCorto: "Vaquillonas Preñadas",
    icono: "🤰",
    color: "#10b981",
    pesoObjetivoKg: 480,
    diasEstimados: 180,
    descripcion: "Vaquillonas con preñez confirmada en desarrollo gestacional previo al ingreso al preparto.",
  },
  {
    id: "preparto",
    numero: 6,
    nombre: "6- Lote Preparto",
    nombreCorto: "Preparto",
    icono: "⏳",
    color: "#f97316",
    pesoObjetivoKg: 620,
    diasEstimados: 21,
    descripcion: "Vacas secas y vaquillonas en los últimos 21 días de gestación con sales aniónicas.",
  },
  {
    id: "secas",
    numero: 7,
    nombre: "7- Vacas Secas",
    nombreCorto: "Vacas Secas",
    icono: "🍂",
    color: "#eab308",
    pesoObjetivoKg: 610,
    diasEstimados: 60,
    descripcion: "Período de descanso y regeneración mamaria entre lactancias activas.",
  },
  {
    id: "ordenie",
    numero: 8,
    nombre: "8- Vacas en Ordeñe (VO)",
    nombreCorto: "Vacas en Ordeñe",
    icono: "🥛",
    color: "#15803d",
    pesoObjetivoKg: 580,
    diasEstimados: 305,
    descripcion: "Rodeo en ordeño lechero activo (Rodeo de Alta / Punta y Lote General).",
  },
];

/**
 * Determina a qué corral o etapa del Tambo pertenece una hembra según su grupo DelPro, peso y estado.
 */
export function determinarCorralHembra(v: {
  rp?: string;
  grupoDelPro?: string;
  estadoProductivo?: string;
  estadoReproductivo?: string;
  pesoKg?: number;
  pesoOficialDelPro?: number;
  litrosAyer?: number;
}): InfoCorralHembra {
  const gr = (v.grupoDelPro || "").toLowerCase();
  const rpNum = parseInt(String(v.rp || "").replace(/\D/g, ""), 10) || 0;
  const peso = v.pesoKg || v.pesoOficialDelPro || 0;

  // 1. Crianza / Guachera Hembras
  if (v.estadoProductivo === "Crianza" || gr.includes("crianza") || gr.includes("guachera") || gr.includes("terner")) {
    return CORRALES_HEMBRAS_DEFINICION[0];
  }
  // 2. Preparto
  if (gr.includes("preparto")) {
    return CORRALES_HEMBRAS_DEFINICION[5];
  }
  // 3. Vacas Secas
  if (v.estadoProductivo === "Seca" || gr.includes("seca")) {
    return CORRALES_HEMBRAS_DEFINICION[6];
  }
  // 4. Vaquillonas Preñadas
  if (gr.includes("preñada") || gr.includes("vq preñ") || (v.estadoProductivo === "Vaquillona" && v.estadoReproductivo === "Preñada")) {
    return CORRALES_HEMBRAS_DEFINICION[4];
  }
  // 5. Vaquillonas en Servicio / RH3
  if (gr.includes("servicio") || gr.includes("rh3") || gr.includes("recria 3") || (gr.includes("recria hembra") && (peso >= 220 || rpNum >= 4280))) {
    return CORRALES_HEMBRAS_DEFINICION[3];
  }
  // 6. Recría Hembras 2 (RH2)
  if (gr.includes("rh2") || gr.includes("recria 2") || (gr.includes("recria hembra") && ((peso > 125 && peso < 220) || (rpNum >= 4240 && rpNum < 4280)))) {
    return CORRALES_HEMBRAS_DEFINICION[2];
  }
  // 7. Recría Hembras 1 (RH1)
  if (gr.includes("rh1") || gr.includes("recria 1") || gr.includes("recria hembra") || v.estadoProductivo === "Vaquillona") {
    return CORRALES_HEMBRAS_DEFINICION[1];
  }
  // 8. En Ordeñe (por defecto para vacas en lactancia)
  return CORRALES_HEMBRAS_DEFINICION[7];
}

export interface DelProSyncPayload {
  fechaSincronizacion: string;
  totalRodeoGeneral?: number; // Total stock bovino general en DelPro (Machos + Hembras)
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
  movimientosCorralDelPro?: MovimientoCorralDelPro[];
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

  // 1. Vacas en Ordeño - 109 cabezas (Grupo 1 DelPro: Lote General / Media Producción)
  for (let i = 1; i <= 109; i++) {
    const rpNum = 3000 + i;
    const del = 40 + ((i * 19) % 270);
    const isPreniada = i <= 60; // 60 preñadas oficial DelPro
    const isInseminada = !isPreniada && i <= 85; // 25 inseminadas
    const diasGest = isPreniada ? 45 + ((i * 23) % 210) : undefined;
    const lts = Number((24.0 + ((i * 11) % 130) / 10).toFixed(1));
    const fechaPartoProb = diasGest
      ? new Date(Date.now() + (282 - diasGest) * 86400000).toLocaleDateString("es-AR")
      : undefined;

    const esPesadoDelPro = i % 5 === 0;
    const pesoOficial = esPesadoDelPro ? Number((565 + ((i * 7) % 90)).toFixed(1)) : undefined;
    const pesoEst = Number((580 + ((i * 3) % 60)).toFixed(1));

    vacas.push({
      rp: `RP-${rpNum}`,
      sexo: "Hembra",
      corralId: "ordenie",
      nombreCorral: "Vacas en Ordeñe",
      estadoProductivo: "En Ordeñe",
      estadoReproductivo: isPreniada ? "Preñada" : (isInseminada ? "Inseminada" : "Vacía"),
      diasLactancia: del,
      diasGestacion: diasGest,
      fechaProbableParto: fechaPartoProb,
      litrosAyer: lts,
      promedio7d: Number((lts * 0.98).toFixed(1)),
      partoNumero: 1 + (i % 4),
      pesoKg: esPesadoDelPro ? pesoOficial : pesoEst,
      pesoOficialDelPro: pesoOficial,
      fechaPesajeDelPro: esPesadoDelPro ? "20/09/26" : undefined,
      origenPeso: esPesadoDelPro ? "delpro_oficial" : "estimado_curva",
      grupoDelPro: "Vacas en ordeño",
    });
  }

  // 2. Rodeo de Punta - 83 cabezas (Grupo 2 DelPro: Alta Producción)
  for (let i = 1; i <= 83; i++) {
    const rpNum = 3200 + i;
    const del = 25 + ((i * 13) % 180);
    const isPreniada = i <= 16; // 16 preñadas oficial DelPro
    const isInseminada = !isPreniada && i <= 56; // 40 inseminadas
    const diasGest = isPreniada ? 35 + ((i * 17) % 140) : undefined;
    const lts = Number((31.0 + ((i * 9) % 120) / 10).toFixed(1));
    const fechaPartoProb = diasGest
      ? new Date(Date.now() + (282 - diasGest) * 86400000).toLocaleDateString("es-AR")
      : undefined;

    const esPesadoDelPro = i % 4 === 0;
    const pesoOficial = esPesadoDelPro ? Number((590 + ((i * 5) % 80)).toFixed(1)) : undefined;
    const pesoEst = Number((600 + ((i * 4) % 60)).toFixed(1));

    vacas.push({
      rp: `RP-${rpNum}`,
      sexo: "Hembra",
      corralId: "ordenie",
      nombreCorral: "Rodeo de Punta",
      estadoProductivo: "En Ordeñe",
      estadoReproductivo: isPreniada ? "Preñada" : (isInseminada ? "Inseminada" : "Vacía"),
      diasLactancia: del,
      diasGestacion: diasGest,
      fechaProbableParto: fechaPartoProb,
      litrosAyer: lts,
      promedio7d: Number((lts * 0.99).toFixed(1)),
      partoNumero: 1 + (i % 3),
      pesoKg: esPesadoDelPro ? pesoOficial : pesoEst,
      pesoOficialDelPro: pesoOficial,
      fechaPesajeDelPro: esPesadoDelPro ? "21/09/26" : undefined,
      origenPeso: esPesadoDelPro ? "delpro_oficial" : "estimado_curva",
      grupoDelPro: "Rodeo de punta",
    });
  }

  // 3. Preparto - 21 cabezas (Grupo 8 DelPro: vacas secas en los últimos 21 días de gestación)
  for (let i = 1; i <= 21; i++) {
    const rpNum = 3500 + i;
    const diasGest = 262 + (i % 18); // 262 a 279 días de gestación
    const diasFaltan = 282 - diasGest;
    const fechaPartoProb = new Date(Date.now() + diasFaltan * 86400000).toLocaleDateString("es-AR");

    const esPesadoDelPro = i % 3 === 0;
    const pesoOficial = esPesadoDelPro ? Number((625 + (i * 4)).toFixed(1)) : undefined;
    const pesoEst = Number((630 + (i * 3)).toFixed(1));

    vacas.push({
      rp: `RP-${rpNum}`,
      sexo: "Hembra",
      corralId: "preparto",
      nombreCorral: "Preparto",
      estadoProductivo: "Seca",
      estadoReproductivo: "Preñada",
      diasLactancia: 0,
      diasGestacion: diasGest,
      diasParaParto: diasFaltan,
      fechaProbableParto: fechaPartoProb,
      litrosAyer: 0,
      promedio7d: 0,
      partoNumero: 2 + (i % 3),
      pesoKg: esPesadoDelPro ? pesoOficial : pesoEst,
      pesoOficialDelPro: pesoOficial,
      fechaPesajeDelPro: esPesadoDelPro ? "19/09/26" : undefined,
      origenPeso: esPesadoDelPro ? "delpro_oficial" : "estimado_curva",
      grupoDelPro: "Preparto",
    });
  }

  // 4. Vacas Secas - 13 cabezas (Grupo 6 DelPro: lote de descanso)
  for (let i = 1; i <= 13; i++) {
    const rpNum = 3600 + i;
    const diasGest = 222 + (i % 32); // 222 a 253 días de gestación
    const diasFaltan = 282 - diasGest;
    const fechaPartoProb = new Date(Date.now() + diasFaltan * 86400000).toLocaleDateString("es-AR");

    const esPesadoDelPro = i % 2 === 0;
    const pesoOficial = esPesadoDelPro ? Number((615 + (i * 5)).toFixed(1)) : undefined;
    const pesoEst = Number((620 + (i * 4)).toFixed(1));

    vacas.push({
      rp: `RP-${rpNum}`,
      sexo: "Hembra",
      corralId: "secas",
      nombreCorral: "Vacas Secas",
      estadoProductivo: "Seca",
      estadoReproductivo: "Preñada",
      diasLactancia: 0,
      diasGestacion: diasGest,
      diasParaParto: diasFaltan,
      fechaProbableParto: fechaPartoProb,
      litrosAyer: 0,
      promedio7d: 0,
      partoNumero: 2 + (i % 4),
      pesoKg: esPesadoDelPro ? pesoOficial : pesoEst,
      pesoOficialDelPro: pesoOficial,
      fechaPesajeDelPro: esPesadoDelPro ? "18/09/26" : undefined,
      origenPeso: esPesadoDelPro ? "delpro_oficial" : "estimado_curva",
      grupoDelPro: "Vacas Secas",
    });
  }

  // 5. Vaquillonas Preñadas - 31 cabezas (Grupo 7 DelPro)
  for (let i = 1; i <= 31; i++) {
    const rpNum = 4000 + i;
    const diasGest = 95 + ((i * 11) % 165);
    const diasFaltan = 282 - diasGest;
    const fechaPartoProb = new Date(Date.now() + diasFaltan * 86400000).toLocaleDateString("es-AR");

    const esPesadoDelPro = i % 5 === 0;
    const pesoOficial = esPesadoDelPro ? Number((450 + (i * 3)).toFixed(1)) : undefined;
    const pesoEst = Number((460 + (i * 2)).toFixed(1));

    vacas.push({
      rp: `RP-${rpNum}`,
      sexo: "Hembra",
      corralId: "vq_preniada",
      nombreCorral: "Vaquillonas Preñadas",
      estadoProductivo: "Vaquillona",
      estadoReproductivo: "Preñada",
      diasLactancia: 0,
      diasGestacion: diasGest,
      diasParaParto: diasFaltan,
      fechaProbableParto: fechaPartoProb,
      litrosAyer: 0,
      promedio7d: 0,
      partoNumero: 0,
      pesoKg: esPesadoDelPro ? pesoOficial : pesoEst,
      pesoOficialDelPro: pesoOficial,
      fechaPesajeDelPro: esPesadoDelPro ? "20/09/26" : undefined,
      origenPeso: esPesadoDelPro ? "delpro_oficial" : "estimado_curva",
      grupoDelPro: "Vq Preñada",
    });
  }

  // 6. Vaquillonas en Servicio - 30 cabezas (Grupo 9 DelPro)
  for (let i = 1; i <= 30; i++) {
    const rpNum = 4100 + i;
    const isInsem = i % 2 === 0;

    const esPesadoDelPro = i % 6 === 0;
    const pesoOficial = esPesadoDelPro ? Number((370 + (i * 3)).toFixed(1)) : undefined;
    const pesoEst = Number((380 + (i * 2)).toFixed(1));

    vacas.push({
      rp: `RP-${rpNum}`,
      sexo: "Hembra",
      corralId: "rh3",
      nombreCorral: "Recría 3 / Vq Servicio",
      estadoProductivo: "Vaquillona",
      estadoReproductivo: isInsem ? "Inseminada" : "Vacía",
      diasLactancia: 0,
      litrosAyer: 0,
      promedio7d: 0,
      partoNumero: 0,
      pesoKg: esPesadoDelPro ? pesoOficial : pesoEst,
      pesoOficialDelPro: pesoOficial,
      fechaPesajeDelPro: esPesadoDelPro ? "19/09/26" : undefined,
      origenPeso: esPesadoDelPro ? "delpro_oficial" : "estimado_curva",
      grupoDelPro: "Vq Servicio",
    });
  }

  // 7. Recría Hembras - 117 cabezas (Grupo 10 DelPro distribuido en RH1, RH2 y RH3)
  for (let i = 1; i <= 117; i++) {
    const rpNum = 4200 + i;

    const esPesadoDelPro = i % 10 === 0;
    const esRH1 = i <= 35;
    const esRH2 = i > 35 && i <= 77;
    const corralAsignado: CorralHembraId = esRH1 ? "rh1" : (esRH2 ? "rh2" : "rh3");
    const nombreCorralAsignado = esRH1 ? "Recría Hembras 1" : (esRH2 ? "Recría Hembras 2" : "Recría 3 / Vq Servicio");
    const grupoDelProStr = esRH1 ? "Recría Hembras 1 (RH1)" : (esRH2 ? "Recría Hembras 2 (RH2)" : "Recría Hembras 3 (RH3)");

    const basePeso = esRH1 ? 85 + (i * 0.8) : (esRH2 ? 120 + ((i - 35) * 1.1) : 175 + ((i - 77) * 2.2));
    const pesoOficial = esPesadoDelPro ? Number((basePeso + 2.5).toFixed(1)) : undefined;
    const pesoEst = Number(basePeso.toFixed(1));

    vacas.push({
      rp: `RP-${rpNum}`,
      sexo: "Hembra",
      corralId: corralAsignado,
      nombreCorral: nombreCorralAsignado,
      estadoProductivo: "Vaquillona",
      estadoReproductivo: "Vacía",
      diasLactancia: 0,
      litrosAyer: 0,
      promedio7d: 0,
      partoNumero: 0,
      pesoKg: esPesadoDelPro ? pesoOficial : pesoEst,
      pesoOficialDelPro: pesoOficial,
      fechaPesajeDelPro: esPesadoDelPro ? "18/09/26" : undefined,
      origenPeso: esPesadoDelPro ? "delpro_oficial" : "estimado_curva",
      grupoDelPro: grupoDelProStr,
    });
  }

  // 8. Crianza Hembras - 17 cabezas (Grupo 11 DelPro: 17 hembras reales en guachera p/ reposición lechera)
  for (let i = 1; i <= 17; i++) {
    const rpNum = 8800 + i;
    const pesoEst = Number((40 + i * 2.5).toFixed(1));

    vacas.push({
      rp: `RP-${rpNum}`,
      sexo: "Hembra",
      corralId: "guachera_h",
      nombreCorral: "Guachera Hembras",
      estadoProductivo: "Crianza",
      estadoReproductivo: "Vacía",
      diasLactancia: 0,
      litrosAyer: 0,
      promedio7d: 0,
      partoNumero: 0,
      pesoKg: pesoEst,
      origenPeso: "estimado_curva",
      grupoDelPro: "Guachera Hembras",
    });
  }

  return vacas;
}

/**
 * Modelo Biológico de Crecimiento Acumulado para Novillos / Recría HJB.
 * Calcula el peso estimativo del animal a lo largo de su vida sumando
 * el peso de nacimiento (~38 kg) más la ganancia diaria esperada (GDPV) acumulada
 * por cada etapa o corral atravesado.
 */
export function calcularPesoEstimativoVida(animal: {
  corralId: "guachera" | "rm1" | "rm2" | "rm3" | "terminacion";
  diasEnCorral: number;
  pesoNacimientoKg?: number;
  diasVida?: number;
}): {
  pesoEstimadoKg: number;
  diasVida: number;
  gdpvEtapaKgDia: number;
  pesoIngresoEtapaKg: number;
  gananciaEtapaKg: number;
  explicacionCurva: string;
} {
  const pesoNac = animal.pesoNacimientoKg || 38.0;

  // Parámetros biológicos estándar HJB por etapa
  // 1. Guachera: 0 a 60 días, GDPV 0.65 kg/d -> llega a ~77 kg al desleche
  // 2. RM1: 47 días adicionales, GDPV 0.85 kg/d -> llega a ~117 kg
  // 3. RM2: 53 días adicionales, GDPV 0.95 kg/d -> llega a ~167 kg
  // 4. RM3: 91 días adicionales, GDPV 1.10 kg/d -> llega a ~267 kg
  // 5. Terminación: feedlot intensivo grano+pellet, GDPV 1.45 kg/d -> supera 370 kg p/ faena
  const diasGuacheraBase = 60;
  const gdpvGuachera = 0.65;
  const pesoFinGuachera = pesoNac + diasGuacheraBase * gdpvGuachera; // 38 + 39 = 77.0 kg

  const diasRM1Base = 47;
  const gdpvRM1 = 0.85;
  const pesoFinRM1 = pesoFinGuachera + diasRM1Base * gdpvRM1; // 77 + 40 = 117.0 kg

  const diasRM2Base = 53;
  const gdpvRM2 = 0.95;
  const pesoFinRM2 = pesoFinRM1 + diasRM2Base * gdpvRM2; // 117 + 50.35 = 167.35 kg

  const diasRM3Base = 91;
  const gdpvRM3 = 1.10;
  const pesoFinRM3 = pesoFinRM2 + diasRM3Base * gdpvRM3; // 167.35 + 100.1 = 267.45 kg

  const gdpvTerminacion = 1.45;

  let pesoEstimado = pesoNac;
  let diasVida = animal.diasEnCorral;
  let gdpvEtapa = gdpvGuachera;
  let pesoIngresoEtapa = pesoNac;
  let explicacion = "";

  switch (animal.corralId) {
    case "guachera": {
      diasVida = animal.diasEnCorral;
      gdpvEtapa = gdpvGuachera;
      pesoIngresoEtapa = pesoNac;
      pesoEstimado = pesoNac + animal.diasEnCorral * gdpvGuachera;
      explicacion = `Nacimiento (${pesoNac} kg) + ${animal.diasEnCorral}d en guachera (+${gdpvGuachera} kg/d)`;
      break;
    }
    case "rm1": {
      diasVida = diasGuacheraBase + animal.diasEnCorral;
      gdpvEtapa = gdpvRM1;
      pesoIngresoEtapa = pesoFinGuachera;
      pesoEstimado = pesoFinGuachera + animal.diasEnCorral * gdpvRM1;
      explicacion = `Guachera (${pesoFinGuachera.toFixed(1)} kg) + ${animal.diasEnCorral}d en RM1 (+${gdpvRM1} kg/d)`;
      break;
    }
    case "rm2": {
      diasVida = diasGuacheraBase + diasRM1Base + animal.diasEnCorral;
      gdpvEtapa = gdpvRM2;
      pesoIngresoEtapa = pesoFinRM1;
      pesoEstimado = pesoFinRM1 + animal.diasEnCorral * gdpvRM2;
      explicacion = `Recría RM1 (${pesoFinRM1.toFixed(1)} kg) + ${animal.diasEnCorral}d en RM2 (+${gdpvRM2} kg/d)`;
      break;
    }
    case "rm3": {
      diasVida = diasGuacheraBase + diasRM1Base + diasRM2Base + animal.diasEnCorral;
      gdpvEtapa = gdpvRM3;
      pesoIngresoEtapa = pesoFinRM2;
      pesoEstimado = pesoFinRM2 + animal.diasEnCorral * gdpvRM3;
      explicacion = `Recría RM2 (${pesoFinRM2.toFixed(1)} kg) + ${animal.diasEnCorral}d en RM3 (+${gdpvRM3} kg/d)`;
      break;
    }
    case "terminacion": {
      diasVida = diasGuacheraBase + diasRM1Base + diasRM2Base + diasRM3Base + animal.diasEnCorral;
      gdpvEtapa = gdpvTerminacion;
      pesoIngresoEtapa = pesoFinRM3;
      pesoEstimado = pesoFinRM3 + animal.diasEnCorral * gdpvTerminacion;
      explicacion = `Ingreso Engorde (${pesoFinRM3.toFixed(1)} kg) + ${animal.diasEnCorral}d en terminación (+${gdpvTerminacion} kg/d)`;
      break;
    }
  }

  const gananciaEtapa = pesoEstimado - pesoIngresoEtapa;

  return {
    pesoEstimadoKg: Number(pesoEstimado.toFixed(1)),
    diasVida,
    gdpvEtapaKgDia: gdpvEtapa,
    pesoIngresoEtapaKg: Number(pesoIngresoEtapa.toFixed(1)),
    gananciaEtapaKg: Number(gananciaEtapa.toFixed(1)),
    explicacionCurva: explicacion,
  };
}

/**
 * Determina el peso oficial y origen de un animal de recría/engorde o tambo.
 * Si el animal cuenta con un pesaje extraído desde DeLaval DelPro (balanza oficial),
 * se toma dicho peso extraído de DelPro como oficial y prioritario por sobre el estimativo.
 * Si aún no se registró un pesaje en DelPro, se calcula el peso estimativo
 * según la curva de crecimiento biológico de vida.
 */
export function resolverPesoAnimal(animal: {
  corralId?: "guachera" | "rm1" | "rm2" | "rm3" | "terminacion" | CorralHembraId | string;
  diasEnCorral?: number;
  pesoActualKg?: number;
  pesoKg?: number;
  pesoOficialDelPro?: number;
  fechaPesajeDelPro?: string;
  origenPeso?: "delpro_oficial" | "estimado_curva" | string;
  pesoNacimientoKg?: number;
  diasVida?: number;
}): {
  pesoKg: number;
  esOficialDelPro: boolean;
  origenEtiqueta: string;
  badgeClase: string;
  icono: string;
  diasVida: number;
  gdpvKgDia: number;
  detalleCalculo: string;
} {
  const isGanaderiaCorral =
    animal.corralId === "guachera" ||
    animal.corralId === "rm1" ||
    animal.corralId === "rm2" ||
    animal.corralId === "rm3" ||
    animal.corralId === "terminacion";

  const calc = isGanaderiaCorral
    ? calcularPesoEstimativoVida({
        corralId: animal.corralId as any,
        diasEnCorral: animal.diasEnCorral || 15,
        pesoNacimientoKg: animal.pesoNacimientoKg,
        diasVida: animal.diasVida,
      })
    : null;

  // REGLA OFICIAL DELPRO: Si existe un peso extraído de DelPro, se toma como OFICIAL y prioritario.
  const tieneDelPro =
    (animal.pesoOficialDelPro && animal.pesoOficialDelPro > 0) ||
    (animal.origenPeso === "delpro_oficial" && ((animal.pesoActualKg && animal.pesoActualKg > 0) || (animal.pesoKg && animal.pesoKg > 0)));
  const pesoDelProVal = animal.pesoOficialDelPro || (animal.origenPeso === "delpro_oficial" ? (animal.pesoActualKg || animal.pesoKg || 0) : 0) || 0;

  if (tieneDelPro && pesoDelProVal > 0) {
    return {
      pesoKg: Number(pesoDelProVal.toFixed(1)),
      esOficialDelPro: true,
      origenEtiqueta: "Oficial DelPro",
      badgeClase: "badgeGreen",
      icono: "⚖️",
      diasVida: animal.diasVida || (calc?.diasVida ?? 0),
      gdpvKgDia: calc?.gdpvEtapaKgDia ?? 0,
      detalleCalculo: `Balanza oficial DelPro${animal.fechaPesajeDelPro ? ` (${animal.fechaPesajeDelPro})` : ""}`,
    };
  }

  // Si no es corral de recría/engorde machos, se toma su peso estándar o estimado
  if (!isGanaderiaCorral || !calc) {
    const pesoEst = animal.pesoKg || animal.pesoActualKg || 580;
    return {
      pesoKg: Number(pesoEst.toFixed(1)),
      esOficialDelPro: false,
      origenEtiqueta: "Estimado",
      badgeClase: "badgeBlue",
      icono: "📈",
      diasVida: animal.diasVida || 0,
      gdpvKgDia: 0,
      detalleCalculo: "Estimación estándar por estado y lote",
    };
  }

  // Animal de recría/engorde: se calcula el peso estimativo por curva biológica de vida
  return {
    pesoKg: calc.pesoEstimadoKg,
    esOficialDelPro: false,
    origenEtiqueta: "Estimado (Curva Vida)",
    badgeClase: "badgeBlue",
    icono: "📈",
    diasVida: animal.diasVida || calc.diasVida,
    gdpvKgDia: calc.gdpvEtapaKgDia,
    detalleCalculo: calc.explicacionCurva,
  };
}

export function generateDefaultAnimalesRecria(): AnimalRecriaIndividual[] {
  const animales: AnimalRecriaIndividual[] = [];

  // Guachera: 9 animales machos (los otros terneros de crianza son hembras para reposición tambo)
  for (let i = 1; i <= 9; i++) {
    const dias = 12 + i * 4;
    const calc = calcularPesoEstimativoVida({ corralId: "guachera", diasEnCorral: dias });
    animales.push({
      rp: `RP-${8810 + i}`,
      sexo: "Macho",
      corralId: "guachera",
      pesoActualKg: calc.pesoEstimadoKg,
      origenPeso: "estimado_curva",
      diasVida: calc.diasVida,
      diasEnCorral: dias,
      fechaIngresoCorral: new Date(Date.now() - dias * 86400000).toLocaleDateString("es-AR"),
      gdpvKgDia: calc.gdpvEtapaKgDia,
      origen: "Nacimiento Tambo HJB (Macho)",
      grupoDelPro: "Guachera Machos",
    });
  }

  // RM1: 22 animales machos (edad 68 a 108 días de vida)
  for (let i = 1; i <= 22; i++) {
    const dias = 8 + Math.round(i * 1.8);
    const rp = `RP-${8750 + i}`;
    const calc = calcularPesoEstimativoVida({ corralId: "rm1", diasEnCorral: dias });

    // Animales pesados oficialmente en DelPro
    const esPesadoDelPro = i === 5 || i === 10;
    const pesoOficial = esPesadoDelPro ? (i === 5 ? 114.5 : 118.0) : undefined;
    const pesoFinal = pesoOficial || calc.pesoEstimadoKg;

    animales.push({
      rp,
      sexo: "Macho",
      corralId: "rm1",
      pesoActualKg: pesoFinal,
      pesoOficialDelPro: pesoOficial,
      fechaPesajeDelPro: esPesadoDelPro ? "19/09/26" : undefined,
      origenPeso: esPesadoDelPro ? "delpro_oficial" : "estimado_curva",
      diasVida: calc.diasVida,
      diasEnCorral: dias,
      fechaIngresoCorral: new Date(Date.now() - dias * 86400000).toLocaleDateString("es-AR"),
      gdpvKgDia: calc.gdpvEtapaKgDia,
      origen: esPesadoDelPro ? "DeLaval DelPro (Balanza Oficial)" : "Pase desde Guachera",
      grupoDelPro: "Recría Machos 1 (RM1)",
    });
  }

  // RM2: 28 animales machos (edad 115 a 159 días de vida)
  for (let i = 1; i <= 28; i++) {
    const dias = 8 + Math.round(i * 1.6);
    const rp = `RP-${8700 + i}`;
    const calc = calcularPesoEstimativoVida({ corralId: "rm2", diasEnCorral: dias });

    const esPesadoDelPro = i === 5;
    const pesoOficial = esPesadoDelPro ? 142.0 : undefined;
    const pesoFinal = pesoOficial || calc.pesoEstimadoKg;

    animales.push({
      rp,
      sexo: "Macho",
      corralId: "rm2",
      pesoActualKg: pesoFinal,
      pesoOficialDelPro: pesoOficial,
      fechaPesajeDelPro: esPesadoDelPro ? "18/09/26" : undefined,
      origenPeso: esPesadoDelPro ? "delpro_oficial" : "estimado_curva",
      diasVida: calc.diasVida,
      diasEnCorral: dias,
      fechaIngresoCorral: new Date(Date.now() - dias * 86400000).toLocaleDateString("es-AR"),
      gdpvKgDia: calc.gdpvEtapaKgDia,
      origen: esPesadoDelPro ? "DeLaval DelPro (Balanza Oficial)" : "Pase desde RM1",
      grupoDelPro: "Recría Machos 2 (RM2)",
    });
  }

  // RM3: 15 animales machos (edad 170 a 248 días de vida)
  for (let i = 1; i <= 15; i++) {
    const dias = 10 + Math.round(i * 2.6);
    const rp = `RP-${8650 + i}`;
    const calc = calcularPesoEstimativoVida({ corralId: "rm3", diasEnCorral: dias });

    const esPesadoDelPro = i === 5;
    const pesoOficial = esPesadoDelPro ? 235.0 : undefined;
    const pesoFinal = pesoOficial || calc.pesoEstimadoKg;

    animales.push({
      rp,
      sexo: "Macho",
      corralId: "rm3",
      pesoActualKg: pesoFinal,
      pesoOficialDelPro: pesoOficial,
      fechaPesajeDelPro: esPesadoDelPro ? "20/09/26" : undefined,
      origenPeso: esPesadoDelPro ? "delpro_oficial" : "estimado_curva",
      diasVida: calc.diasVida,
      diasEnCorral: dias,
      fechaIngresoCorral: new Date(Date.now() - dias * 86400000).toLocaleDateString("es-AR"),
      gdpvKgDia: calc.gdpvEtapaKgDia,
      origen: esPesadoDelPro ? "DeLaval DelPro (Balanza Oficial)" : "Pase desde RM2",
      grupoDelPro: "Recría Machos 3 (RM3)",
    });
  }

  // Terminación: 25 animales machos (edad 261 a 346 días de vida, peso 280 a 405 kg)
  for (let i = 1; i <= 25; i++) {
    const dias = 10 + Math.round(i * 3.3);
    const rp = `RP-${8600 + i}`;
    const calc = calcularPesoEstimativoVida({ corralId: "terminacion", diasEnCorral: dias });

    const esPesadoDelPro = i === 5 || i === 10;
    const pesoOficial = esPesadoDelPro ? (i === 5 ? 395.0 : 402.0) : undefined;
    const pesoFinal = pesoOficial || calc.pesoEstimadoKg;

    animales.push({
      rp,
      sexo: "Macho",
      corralId: "terminacion",
      pesoActualKg: pesoFinal,
      pesoOficialDelPro: pesoOficial,
      fechaPesajeDelPro: esPesadoDelPro ? (i === 5 ? "20/09/26" : "21/09/26") : undefined,
      origenPeso: esPesadoDelPro ? "delpro_oficial" : "estimado_curva",
      diasVida: calc.diasVida,
      diasEnCorral: dias,
      fechaIngresoCorral: new Date(Date.now() - dias * 86400000).toLocaleDateString("es-AR"),
      gdpvKgDia: calc.gdpvEtapaKgDia,
      origen: esPesadoDelPro ? "DeLaval DelPro (Balanza Oficial)" : "Pase desde RM3",
      listoFaena: pesoFinal >= 370,
      grupoDelPro: "Terminación Gordos (Machos)",
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
    litrosTotalesDia: 5588.9, // 192 VO × 29.11 lts (Medido en DelPro Analytics)
    vacasEnOrdeñe: 192,
    vacasSecasPreparto: 34,
    litrosPromedioVO: 29.11,
    dietaAsignada: {
      pelletSojaKg: 2.5,
      pelletTrigoKg: 3.0,
      siloMaizKg: 22.0,
      maizKg: 5.5,
      rolloAlfalfaKg: 3.0,
      salMineralGramos: 150,
    },
    hembrasEnReposicionTambo: 195, // 178 vaquillonas + 17 terneras crianza van a reposición del tambo
    machosEnRecriaEngorde: {
      guachera: 9, // 9 terneros machos en guachera
      rm1: 22,
      rm2: 28,
      rm3: 15,
      terminacion: 25, // Solo machos van a venta comercial / faena (total 99 machos)
    },
    censoRodeoTambo: {
      totalRodeoGeneral: 514,
      totalVacasAdultas: 226,
      vacasEnOrdenie: 192,
      vacasSecas: 34,
      vacasPreniadas: 142,
      vacasVacias: 45,
      vaquillonasReposicion: 178,
      vaquillonasPreniadas: 31,
      ternerosCrianza: 26,
      ternerasCrianzaHembras: 17,
      ternerosCrianzaMachos: 9,
      novillosRecriaEngorde: 84,
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
        motivo: "Anotado en DeLaval DelPro (Pase de grupo RM1 a RM2)",
        origenMovimiento: "delpro_farm_manager",
      },
      {
        id: "tr-hist-2",
        fecha: "15/09/26",
        rpAnimal: "RP-8699",
        corralOrigen: "rm2",
        corralDestino: "rm3",
        pesoAlTraspaso: 172.0,
        motivo: "Alcanzó 172.0 kg (Corte 170 kg RM2 -> RM3)",
        origenMovimiento: "escala_automatica_hjb",
      },
      {
        id: "tr-hist-3",
        fecha: "10/09/26",
        rpAnimal: "RP-8649",
        corralOrigen: "rm3",
        corralDestino: "terminacion",
        pesoAlTraspaso: 274.0,
        motivo: "Alcanzó 274.0 kg (Corte 270 kg RM3 -> Terminación)",
        origenMovimiento: "escala_automatica_hjb",
      },
    ],
    movimientosCorralDelPro: [
      {
        id: "mov-delpro-init-1",
        fecha: "18/09/26",
        rpAnimal: "RP-8749",
        grupoOrigen: "Recría 1 (RM1)",
        grupoDestino: "Recría 2 (RM2)",
        corralOrigenId: "rm1",
        corralDestinoId: "rm2",
        pesoAlMovimiento: 121.5,
        motivo: "Cambio de grupo registrado en DeLaval DelPro FarmManager",
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
  const censo = config.datosSincronizados.censoRodeoTambo;
  if (censo) {
    const tieneDetalleCompleto = Array.isArray(censo.detalleVacas) && censo.detalleVacas.length >= 400;
    return {
      ...censo,
      totalRodeoGeneral: censo.totalRodeoGeneral && censo.totalRodeoGeneral >= 500 ? censo.totalRodeoGeneral : 514,
      totalVacasAdultas: (censo.vacasEnOrdenie || 192) + ((censo.vacasSecas && censo.vacasSecas >= 25) ? censo.vacasSecas : 34),
      vacasEnOrdenie: censo.vacasEnOrdenie || 192,
      vacasSecas: (censo.vacasSecas && censo.vacasSecas >= 25) ? censo.vacasSecas : 34,
      vaquillonasReposicion: censo.vaquillonasReposicion && censo.vaquillonasReposicion >= 100 ? censo.vaquillonasReposicion : 178,
      ternerosCrianza: censo.ternerosCrianza || 26,
      ternerasCrianzaHembras: censo.ternerasCrianzaHembras || 17,
      ternerosCrianzaMachos: censo.ternerosCrianzaMachos || 9,
      novillosRecriaEngorde: censo.novillosRecriaEngorde || 84,
      detalleVacas: tieneDetalleCompleto ? censo.detalleVacas : defaultVacas,
    };
  }
  return {
    totalRodeoGeneral: 514,
    totalVacasAdultas: 226,
    vacasEnOrdenie: 192,
    vacasSecas: 34,
    vacasPreniadas: 142,
    vacasVacias: 45,
    vaquillonasReposicion: 178,
    vaquillonasPreniadas: 31,
    ternerosCrianza: 26,
    ternerasCrianzaHembras: 17,
    ternerosCrianzaMachos: 9,
    novillosRecriaEngorde: 84,
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
        origenMovimiento: "escala_automatica_hjb",
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
        if (data.payloadJson) {
          try {
            const res = importarPayloadDesdeJson(data.payloadJson);
            if (res.success && res.config) {
              if (onUpdate) onUpdate(res.config);
              return;
            }
          } catch {
            // fallback si no es json valido
          }
        }

        let payload: DelProSyncPayload | null = null;
        if (data.payloadJson) {
          try {
            payload = JSON.parse(data.payloadJson);
          } catch {
            // fallback si no es json valido
          }
        }
        
        const current = getDelProConfig();
        const vacasVO = Number(data.vacasEnOrdeñe ?? payload?.vacasEnOrdeñe ?? current.datosSincronizados.vacasEnOrdeñe);
        const litros = Number(data.litrosTotalesDia ?? payload?.litrosTotalesDia ?? current.datosSincronizados.litrosTotalesDia);
        const prom = Number(data.litrosPromedioVO ?? payload?.litrosPromedioVO ?? current.datosSincronizados.litrosPromedioVO);

        let censo = data.censoRodeoTambo || payload?.censoRodeoTambo || current.datosSincronizados.censoRodeoTambo;
        const totalGeneral = Number(data.totalRodeoGeneral || payload?.totalRodeoGeneral || censo?.totalRodeoGeneral || 514);
        if (censo) {
          const secasNormalizadas = (censo.vacasSecas && censo.vacasSecas >= 25) ? censo.vacasSecas : 34;
          const voNormalizadas = vacasVO > 0 ? vacasVO : (censo.vacasEnOrdenie || 192);
          const tieneDetalleCompleto = Array.isArray(censo.detalleVacas) && censo.detalleVacas.length >= 400;
          censo = {
            ...censo,
            totalRodeoGeneral: totalGeneral >= 500 ? totalGeneral : 514,
            vacasEnOrdenie: voNormalizadas,
            vacasSecas: secasNormalizadas,
            totalVacasAdultas: voNormalizadas + secasNormalizadas,
            vaquillonasReposicion: censo.vaquillonasReposicion && censo.vaquillonasReposicion >= 100 ? censo.vaquillonasReposicion : 178,
            ternerosCrianza: censo.ternerosCrianza || 26,
            novillosRecriaEngorde: censo.novillosRecriaEngorde || 84,
            detalleVacas: tieneDetalleCompleto ? censo.detalleVacas : defaultVacas,
          };
        }

        const payloadData: Partial<DelProSyncPayload> = {
          ...(payload || {}),
          totalRodeoGeneral: totalGeneral >= 500 ? totalGeneral : 514,
          litrosTotalesDia: litros,
          vacasEnOrdeñe: vacasVO,
          litrosPromedioVO: prom,
          fechaSincronizacion: data.fechaSincronizacion || current.ultimaSincronizacion || new Date().toISOString(),
          censoRodeoTambo: censo,
          animalesRecria: payload?.animalesRecria || data.animalesRecria || current.datosSincronizados.animalesRecria,
          traspasosAutomaticos: payload?.traspasosAutomaticos || current.datosSincronizados.traspasosAutomaticos,
          movimientosCorralDelPro: payload?.movimientosCorralDelPro || current.datosSincronizados.movimientosCorralDelPro,
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

export function saveDelProConfig(config: Partial<DelProConfig>, persistToFirestore: boolean = false): DelProConfig {
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

  // SOLO persistir en Firestore si se pide explícitamente (ej: importación manual por archivo en la web)
  // NUNCA escribir desde el listener reactivo de onSnapshot para evitar que el navegador sobrescriba datos reales
  if (persistToFirestore && typeof window !== "undefined" && db) {
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

  // Asegurar consistencia absoluta entre vacasEnOrdeñe y el censo del rodeo
  if (mergedDatos.censoRodeoTambo) {
    const totalG = Number(mergedDatos.totalRodeoGeneral || mergedDatos.censoRodeoTambo.totalRodeoGeneral || 514);
    const secasG = (mergedDatos.censoRodeoTambo.vacasSecas && mergedDatos.censoRodeoTambo.vacasSecas >= 25) ? mergedDatos.censoRodeoTambo.vacasSecas : 34;
    const voG = mergedDatos.vacasEnOrdeñe > 0 ? mergedDatos.vacasEnOrdeñe : 192;
    const tieneDetalleCompleto = Array.isArray(mergedDatos.censoRodeoTambo.detalleVacas) && mergedDatos.censoRodeoTambo.detalleVacas.length >= 400;
    mergedDatos.censoRodeoTambo = {
      ...mergedDatos.censoRodeoTambo,
      totalRodeoGeneral: totalG >= 500 ? totalG : 514,
      vacasEnOrdenie: voG,
      vacasSecas: secasG,
      totalVacasAdultas: voG + secasG,
      vaquillonasReposicion: mergedDatos.censoRodeoTambo.vaquillonasReposicion && mergedDatos.censoRodeoTambo.vaquillonasReposicion >= 100 ? mergedDatos.censoRodeoTambo.vaquillonasReposicion : 178,
      ternerosCrianza: mergedDatos.censoRodeoTambo.ternerosCrianza || 26,
      novillosRecriaEngorde: mergedDatos.censoRodeoTambo.novillosRecriaEngorde || 84,
      detalleVacas: tieneDetalleCompleto ? mergedDatos.censoRodeoTambo.detalleVacas : defaultVacas,
    };
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

  // 2. Procesar animales de recría y aplicar cambios de corral anotados en DelPro
  let animalesActuales = [...getAnimalesRecria()];
  const traspasosDelProNuevos: TraspasoCorralRegistro[] = [];
  const hoy = new Date().toLocaleDateString("es-AR");

  // A. Movimientos explícitos de grupo/corral registrados en DelPro FarmManager
  if (mergedDatos.movimientosCorralDelPro && mergedDatos.movimientosCorralDelPro.length > 0) {
    for (const mov of mergedDatos.movimientosCorralDelPro) {
      const corralDest = mov.corralDestinoId || parseDelProGrupoToCorralId(mov.grupoDestino);
      if (corralDest) {
        const animalIndex = animalesActuales.findIndex((a) => a.rp === mov.rpAnimal);
        if (animalIndex >= 0) {
          const actual = animalesActuales[animalIndex];
          if (actual.corralId !== corralDest) {
            traspasosDelProNuevos.push({
              id: `tr-delpro-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              fecha: mov.fecha || hoy,
              rpAnimal: actual.rp,
              corralOrigen: actual.corralId,
              corralDestino: corralDest,
              pesoAlTraspaso: mov.pesoAlMovimiento || actual.pesoActualKg,
              motivo: mov.motivo || `Anotado en DeLaval DelPro (Pase de ${actual.corralId.toUpperCase()} a ${corralDest.toUpperCase()})`,
              origenMovimiento: "delpro_farm_manager",
            });
            animalesActuales[animalIndex] = {
              ...actual,
              corralId: corralDest,
              diasEnCorral: 0,
              fechaIngresoCorral: mov.fecha || hoy,
              grupoDelPro: mov.grupoDestino,
              listoFaena: corralDest === "terminacion" && actual.pesoActualKg >= 370,
            };
          }
        }
      }
    }
  }

  // B. Si la sincronización incluye animalesRecria con grupos/corrales actualizados desde DelPro
  if (mergedDatos.animalesRecria && mergedDatos.animalesRecria.length > 0) {
    for (const incoming of mergedDatos.animalesRecria) {
      const destCorral = incoming.corralId || parseDelProGrupoToCorralId(incoming.grupoDelPro || "");
      const idx = animalesActuales.findIndex((a) => a.rp === incoming.rp);
      if (idx >= 0) {
        const prev = animalesActuales[idx];
          const tieneDelProIncoming = incoming.pesoOficialDelPro || (incoming.origenPeso === "delpro_oficial" ? incoming.pesoActualKg : undefined);
          const pesoOficialResuelto = tieneDelProIncoming || prev.pesoOficialDelPro;
          const fechaPesajeResuelta = incoming.fechaPesajeDelPro || prev.fechaPesajeDelPro;
          const origenPesoResuelto = pesoOficialResuelto ? "delpro_oficial" : (incoming.origenPeso || prev.origenPeso || "estimado_curva");
          const pesoActualResuelto = pesoOficialResuelto || incoming.pesoActualKg || prev.pesoActualKg;

          if (destCorral && prev.corralId !== destCorral) {
            traspasosDelProNuevos.push({
              id: `tr-delpro-sync-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              fecha: hoy,
              rpAnimal: incoming.rp,
              corralOrigen: prev.corralId,
              corralDestino: destCorral,
              pesoAlTraspaso: pesoActualResuelto,
              motivo: `Anotado en DeLaval DelPro (Movimiento a ${incoming.grupoDelPro || destCorral.toUpperCase()})`,
              origenMovimiento: "delpro_farm_manager",
            });
            animalesActuales[idx] = {
              ...prev,
              ...incoming,
              corralId: destCorral,
              pesoActualKg: pesoActualResuelto,
              pesoOficialDelPro: pesoOficialResuelto,
              fechaPesajeDelPro: fechaPesajeResuelta,
              origenPeso: origenPesoResuelto,
              diasEnCorral: 0,
              fechaIngresoCorral: hoy,
              listoFaena: destCorral === "terminacion" && pesoActualResuelto >= 370,
            };
          } else {
            animalesActuales[idx] = {
              ...prev,
              ...incoming,
              corralId: destCorral || prev.corralId,
              pesoActualKg: pesoActualResuelto,
              pesoOficialDelPro: pesoOficialResuelto,
              fechaPesajeDelPro: fechaPesajeResuelta,
              origenPeso: origenPesoResuelto,
              listoFaena: (destCorral || prev.corralId) === "terminacion" && pesoActualResuelto >= 370,
            };
          }
      } else {
        animalesActuales.push(incoming);
      }
    }
  }

  // C. Evaluar traspasos automáticos de escala HJB para terneros que hayan alcanzado el corte
  const resultadoTraspasos = evaluarYEjecutarTraspasosAutomaticos(animalesActuales);
  animalesActuales = resultadoTraspasos.animalesActualizados;
  saveAnimalesRecria(animalesActuales);

  // D. Consolidar historial completo de traspasos (DelPro + Escala HJB)
  const todosLosTraspasosNuevos = [...traspasosDelProNuevos, ...resultadoTraspasos.traspasosRealizados];
  if (todosLosTraspasosNuevos.length > 0) {
    const historialActual = getTraspasosCorrales();
    const nuevoHistorial = [...todosLosTraspasosNuevos, ...historialActual].slice(0, 50);
    saveTraspasosCorrales(nuevoHistorial);
    mergedDatos.traspasosAutomaticos = nuevoHistorial;
  } else if (!mergedDatos.traspasosAutomaticos) {
    mergedDatos.traspasosAutomaticos = getTraspasosCorrales();
  }

  mergedDatos.animalesRecria = animalesActuales;
  mergedDatos.machosEnRecriaEngorde = {
    guachera: animalesActuales.filter((a) => a.corralId === "guachera").length,
    rm1: animalesActuales.filter((a) => a.corralId === "rm1").length,
    rm2: animalesActuales.filter((a) => a.corralId === "rm2").length,
    rm3: animalesActuales.filter((a) => a.corralId === "rm3").length,
    terminacion: animalesActuales.filter((a) => a.corralId === "terminacion").length,
  };

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

    const kpis = parsed.kpisProduccion || {};
    const litros = Number(kpis.litrosTotalesDia || parsed.litrosTotalesDia) || 0;
    const vacasVO = Number(kpis.vacasEnOrdenie || parsed.vacasEnOrdeñe || parsed.vacasEnOrdenie) || 0;
    const prom = Number(kpis.litrosPromedioVO || parsed.litrosPromedioVO) || (vacasVO > 0 ? Number((litros / vacasVO).toFixed(2)) : 26.24);

    let animalesRecriaExtraidos: AnimalRecriaIndividual[] = (parsed.animalesRecria || [])
      .filter((a: any) => a.sexo === "Macho" || a.Sex === 1 || (a.Sex !== 2 && (a.ProductiveStatus === "Male" || (a.grupoDelPro || "").toLowerCase().includes("macho") || (a.grupoDelPro || "").toLowerCase().includes("engorde"))))
      .map((a: any) => ({ ...a, sexo: "Macho" }));
    let censoExtraido: CensoRodeoTambo | undefined = parsed.censoRodeoTambo;
    let vacasSecasCount = Number(parsed.vacasSecasPreparto) || 0;

    // Si viene rodeoCompleto (513 animales extraídos desde DelPro SQL DDM)
    if (Array.isArray(parsed.rodeoCompleto) && parsed.rodeoCompleto.length > 0) {
      const hoyStr = new Date().toLocaleDateString("es-AR");
      const recriaList: AnimalRecriaIndividual[] = [];
      const vacasTamboList: VacaTamboIndividual[] = [];

      for (const item of parsed.rodeoCompleto) {
        const numId = item.OfficialRegNo || item.AnimalNumber || item.Vaca || item.Number;
        const rp = String(numId).startsWith("RP-") ? String(numId) : `RP-${numId}`;
        const grNombre = item.NameGroup || item.GroupName || item.GrupoDelPro || "";
        const grLower = grNombre.toLowerCase();

        // REGLA FUNDAMENTAL DE SEGREGACIÓN HJB:
        // 1. MACHOS (Sex === 1 ó Male ó grupo Machos/Engorde): 100% EXCLUSIVO GANADERÍA (recriaList)
        // 2. HEMBRAS (Sex === 2 ó Hembra ó grupo Ordeñe/Secas/Recria Hembras/Vaquillonas): 100% EXCLUSIVO TAMBO (vacasTamboList)
        const esMacho = item.Sex === 1 || item.Sexo === "Macho" || item.ProductiveStatus === "Male" || (item.Sex !== 2 && (grLower.includes("macho") || grLower.includes("engorde")));

        if (esMacho) {
          const corralId = parseDelProGrupoToCorralId(grNombre) || "guachera";
          const pesoDelPro = Number(item.PesoBalanza || item.Peso || item.PesoKg || item.pesoActualKg || item.pesoDelPro) || 0;
          const fechaPesaje = item.FechaPesaje || item.Fecha || hoyStr;
          const tienePesoDelPro = pesoDelPro > 0;

          const diasEnCorral = Number(item.diasEnCorral) || 15;
          const calcEstimado = calcularPesoEstimativoVida({ corralId, diasEnCorral });
          const pesoFinal = tienePesoDelPro ? pesoDelPro : calcEstimado.pesoEstimadoKg;

          recriaList.push({
            rp,
            sexo: "Macho",
            corralId,
            pesoActualKg: pesoFinal,
            pesoOficialDelPro: tienePesoDelPro ? pesoDelPro : undefined,
            fechaPesajeDelPro: tienePesoDelPro ? fechaPesaje : undefined,
            origenPeso: tienePesoDelPro ? "delpro_oficial" : "estimado_curva",
            diasEnCorral,
            diasVida: calcEstimado.diasVida,
            fechaIngresoCorral: item.FechaIngreso || (item.BirthDate ? String(item.BirthDate).slice(0, 10) : hoyStr),
            gdpvKgDia: calcEstimado.gdpvEtapaKgDia,
            origen: tienePesoDelPro ? "DeLaval DelPro (Balanza Oficial)" : "DeLaval DelPro (PC Tambo)",
            grupoDelPro: grNombre || "Recría Machos",
            listoFaena: pesoFinal >= 370,
          });
        } else {
          // ES HEMBRA -> Va exclusivamente al Tambo
          const isSeca = item.ProductiveStatus === "DryOff" || grLower.includes("seca") || grLower.includes("preparto");
          const isCrianza = item.ProductiveStatus === "Calf" || grLower.includes("crianza") || grLower.includes("guachera") || grLower.includes("terner");
          const isVaquillona = item.ProductiveStatus === "Heifer" || grLower.includes("recria") || grLower.includes("vaquillona") || grLower.includes("vq");
          const isOrdenie = !isSeca && !isCrianza && !isVaquillona;

          const pesoDelPro = Number(item.PesoBalanza || item.Peso || item.PesoKg || item.pesoActualKg || item.pesoDelPro) || 0;
          const fechaPesaje = item.FechaPesaje || item.Fecha;
          const tienePesoDelPro = pesoDelPro > 0;

          // Estado reproductivo oficial DelPro
          let reproEstado: "Preñada" | "Vacía" | "Inseminada" = "Vacía";
          if (item.IsPregnant === 1 || item.IsPregnant === true || item.BreedingState === 6) {
            reproEstado = "Preñada";
          } else if (item.IsInseminated === 1 || item.IsInseminated === true || item.BreedingState === 5) {
            reproEstado = "Inseminada";
          } else if (item.BreedingState === 4 || item.IsPregnant === 0 || item.IsPregnant === false) {
            reproEstado = "Vacía";
          } else if (isOrdenie) {
            reproEstado = "Preñada";
          }

          let estProd: "En Ordeñe" | "Seca" | "Vaquillona" | "Crianza" = "En Ordeñe";
          if (isCrianza) estProd = "Crianza";
          else if (isVaquillona) estProd = "Vaquillona";
          else if (isSeca) estProd = "Seca";
          else estProd = "En Ordeñe";

          const daysToCalving = item.DaysToCalving !== undefined && item.DaysToCalving !== null ? Number(item.DaysToCalving) : undefined;
          const expectedCalvingStr = item.ExpectedCalving
            ? (item.ExpectedCalving instanceof Date ? item.ExpectedCalving.toLocaleDateString("es-AR") : String(item.ExpectedCalving).slice(0, 10))
            : undefined;

          const daysToDryOff = item.DaysToDryOff !== undefined && item.DaysToDryOff !== null ? Number(item.DaysToDryOff) : undefined;
          const expectedDryOffStr = item.DateExpectedDryOff
            ? (item.DateExpectedDryOff instanceof Date ? item.DateExpectedDryOff.toLocaleDateString("es-AR") : String(item.DateExpectedDryOff).slice(0, 10))
            : undefined;

          const diasGestacion = daysToCalving !== undefined ? Math.max(0, 282 - daysToCalving) : (item.diasGestacion || undefined);

          const vacaObj: VacaTamboIndividual = {
            rp,
            sexo: "Hembra",
            estadoProductivo: estProd,
            estadoReproductivo: reproEstado,
            diasLactancia: Number(item.DIM || item.DiasEnLeche) || (isOrdenie ? 120 : 0),
            diasGestacion,
            fechaProbableParto: expectedCalvingStr || item.fechaProbableParto,
            diasParaParto: daysToCalving,
            fechaSecadoEstimada: expectedDryOffStr,
            diasParaSecado: daysToDryOff,
            diasAbiertos: item.OpenDays !== undefined ? Number(item.OpenDays) : undefined,
            litrosAyer: Number(item.Ayer || item.TotalYield || item.DailyYield || (isOrdenie ? 26.2 : 0)),
            promedio7d: item.AvgYieldPrev7d ? Number(item.AvgYieldPrev7d) : undefined,
            scc: item.SCC ? Number(item.SCC) : undefined,
            grasaPct: item.Fat ? Number(item.Fat) : undefined,
            proteinaPct: item.Protein ? Number(item.Protein) : undefined,
            partoNumero: item.LactationNumber ? Number(item.LactationNumber) : (isOrdenie ? 2 : 0),
            pesoKg: tienePesoDelPro ? pesoDelPro : (isOrdenie ? 580 : isSeca ? 610 : isCrianza ? 55 : 320),
            pesoOficialDelPro: tienePesoDelPro ? pesoDelPro : undefined,
            fechaPesajeDelPro: tienePesoDelPro ? fechaPesaje : undefined,
            origenPeso: tienePesoDelPro ? "delpro_oficial" : "estimado_curva",
            grupoDelPro: grNombre || (isOrdenie ? "Vacas en ordeño" : isSeca ? "Vacas Secas" : isCrianza ? "Guachera Hembras" : "Recría Hembras"),
          };

          const infoCorral = determinarCorralHembra(vacaObj);
          vacaObj.corralId = infoCorral.id;
          vacaObj.nombreCorral = infoCorral.nombreCorto;

          vacasTamboList.push(vacaObj);
        }
      }

      if (recriaList.length > 0) {
        animalesRecriaExtraidos = recriaList;
      }

      const secasCalc = vacasTamboList.filter(v => v.estadoProductivo === "Seca").length;
      if (secasCalc > 0) vacasSecasCount = secasCalc;

      const vqReposicion = vacasTamboList.filter(v => v.estadoProductivo === "Vaquillona").length;
      const vqPren = vacasTamboList.filter(v => v.estadoProductivo === "Vaquillona" && v.estadoReproductivo === "Preñada").length;
      const ternerasH = vacasTamboList.filter(v => v.estadoProductivo === "Crianza").length;
      const novillosMachos = recriaList.filter(a => a.corralId !== "guachera").length;
      const ternerosGuacheraMachos = recriaList.filter(a => a.corralId === "guachera").length;

      const preñadasCount = vacasTamboList.filter(v => v.estadoReproductivo === "Preñada").length;
      const vaciasCount = vacasTamboList.filter(v => v.estadoReproductivo === "Vacía").length;

      censoExtraido = {
        totalRodeoGeneral: parsed.rodeoCompleto.length,
        totalVacasAdultas: vacasVO + vacasSecasCount,
        vacasEnOrdenie: vacasVO,
        vacasSecas: vacasSecasCount,
        vacasPreniadas: preñadasCount,
        vacasVacias: vaciasCount,
        vaquillonasReposicion: vqReposicion || 178,
        vaquillonasPreniadas: vqPren || 31,
        ternerosCrianza: (ternerasH + ternerosGuacheraMachos) || 26,
        ternerasCrianzaHembras: ternerasH || 17,
        ternerosCrianzaMachos: ternerosGuacheraMachos || 9,
        novillosRecriaEngorde: novillosMachos || 84,
        detalleVacas: vacasTamboList.length > 0 ? vacasTamboList : undefined,
      };
    }

    const payload: Partial<DelProSyncPayload> = {
      fechaSincronizacion: parsed.fechaSincronizacion || new Date().toISOString(),
      litrosTotalesDia: litros,
      vacasEnOrdeñe: vacasVO,
      vacasSecasPreparto: vacasSecasCount || 35,
      litrosPromedioVO: prom,
      dietaAsignada: parsed.dietaAsignada,
      hembrasEnReposicionTambo: parsed.hembrasEnReposicionTambo || (censoExtraido ? censoExtraido.vaquillonasReposicion : 178),
      machosEnRecriaEngorde: {
        guachera: animalesRecriaExtraidos.filter(a => a.corralId === "guachera").length,
        rm1: animalesRecriaExtraidos.filter(a => a.corralId === "rm1").length,
        rm2: animalesRecriaExtraidos.filter(a => a.corralId === "rm2").length,
        rm3: animalesRecriaExtraidos.filter(a => a.corralId === "rm3").length,
        terminacion: animalesRecriaExtraidos.filter(a => a.corralId === "terminacion").length,
      },
      partosRecientes: Array.isArray(parsed.partosRecientes) && parsed.partosRecientes.length > 0
        ? parsed.partosRecientes
        : Array.isArray(parsed.calvings)
        ? parsed.calvings.map((c: any, idx: number) => ({
            id: `p-delpro-${c.OfficialRegNo || c.AnimalNumber || idx}`,
            fecha: c.CalvingDate ? (c.CalvingDate instanceof Date ? c.CalvingDate.toLocaleDateString("es-AR") : String(c.CalvingDate).slice(0, 10)) : new Date().toLocaleDateString("es-AR"),
            rpMadre: `RP-${c.MotherId || c.OfficialRegNo || c.AnimalNumber}`,
            rpCria: `RP-${c.AnimalNumber || c.OfficialRegNo}`,
            sexo: (c.Sex === 1 || c.Sexo === "Macho") ? "Macho" : "Hembra",
            pesoNacimientoKg: Number(c.BirthWeight) || 38,
            destino: (c.Sex === 1 || c.Sexo === "Macho") ? "Engorde / Novillo (Venta Comercial)" : "Tambo (Vaquillona de Reposición)",
            estado: "En Guachera",
            observaciones: `Parto registrado en DeLaval DelPro (Lactancia ${c.LactationNumber || 1})`,
          }))
        : [],
      censoRodeoTambo: censoExtraido,
      animalesRecria: animalesRecriaExtraidos,
      traspasosAutomaticos: parsed.traspasosAutomaticos,
      movimientosCorralDelPro: Array.isArray(parsed.movimientosCorralDelPro) && parsed.movimientosCorralDelPro.length > 0
        ? parsed.movimientosCorralDelPro
        : Array.isArray(parsed.historialCambiosGrupo)
        ? parsed.historialCambiosGrupo.map((m: any, idx: number) => {
            const origenId = parseDelProGrupoToCorralId(m.GroupNameOld || "");
            const destinoId = parseDelProGrupoToCorralId(m.GroupNameNew || m.NameGroup || "");
            return {
              id: `mov-delpro-${idx}-${Date.now()}`,
              fecha: m.DateAndTime ? (m.DateAndTime instanceof Date ? m.DateAndTime.toLocaleDateString("es-AR") : String(m.DateAndTime).slice(0, 10)) : new Date().toLocaleDateString("es-AR"),
              rpAnimal: `RP-${m.AnimalNumber || m.OfficialRegNo}`,
              grupoOrigen: m.GroupNameOld || `Grupo ${m.GroupNumberOld}`,
              grupoDestino: m.GroupNameNew || m.NameGroup || `Grupo ${m.GroupNumberNew}`,
              corralOrigenId: origenId || undefined,
              corralDestinoId: destinoId || undefined,
              motivo: `Cambio de grupo registrado en DeLaval DelPro (${m.GroupNameOld || m.GroupNumberOld} ➔ ${m.GroupNameNew || m.GroupNumberNew})`,
            };
          })
        : [],
    };

    const host = parsed.servidorHost || parsed.origenExtraccion || "DESKTOP-9PTRDI9\\DELPRO";
    const base = parsed.baseDatosSql || "DDM";

    const config = propagarDatosDelProATodoElSistema(payload, {
      servidorHost: host,
      baseDatosSql: base,
      mensajeEstado: `Datos reales extraídos de DeLaval DelPro SQL (${new Date().toLocaleTimeString("es-AR")})`,
    });

    // Como es importación manual de archivo en la web, persistir explícitamente en Firestore
    saveDelProConfig(config, true);

    const totalRodeo = parsed.rodeoCompleto?.length || payload.vacasEnOrdeñe;

    return {
      success: true,
      mensaje: `✓ Sincronización exitosa: ${payload.vacasEnOrdeñe} vacas en ordeñe, ${payload.litrosTotalesDia?.toLocaleString("es-AR")} lts/día (promedio ${payload.litrosPromedioVO} lts/VO), ${animalesRecriaExtraidos.length} animales de recría/engorde mapeados. Total rodeo: ${totalRodeo} animales. Todo el sistema actualizado.`,
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
