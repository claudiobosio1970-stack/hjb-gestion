"use client";

import { getPrecioReferencia } from "./valoresMovilesData";

export type EtapaCorralId = "guachera" | "rm1" | "rm2" | "rm3" | "terminacion";

export interface ComponenteDieta {
  insumoId: string;
  nombre: string;
  cantidadKgDia: number; // o litros en caso de leche
  unidad: string;
}

export interface DefinicionCorral {
  id: EtapaCorralId;
  numero: number;
  nombreCorto: string;
  nombreCompleto: string;
  icono: string;
  pesoEntradaKg: number;
  pesoObjetivoKg: number;
  diasEstimados: number;
  diasAcumulados: number;
  color: string;
  descripcion: string;
  dietaBase: ComponenteDieta[];
}

export interface TropaGanadera {
  id: string;
  codigo: string;
  nombre: string;
  corralId: EtapaCorralId;
  cabezas: number;
  fechaIngreso: string;
  diasEnCorral: number;
  pesoInicialKg: number;
  pesoActualKg: number;
  gdpvKgDia: number; // Ganancia Diaria de Peso Vivo
  origen: string;
}

export interface PesajeRegistro {
  id: string;
  tropaId: string;
  tropaNombre: string;
  corralId: EtapaCorralId;
  fecha: string;
  cabezas: number;
  pesoPromedioKg: number;
  pesoTotalKg: number;
  gdpvCalculada: number;
  observaciones?: string;
}

export interface FichaVentaFrigorifico {
  id: string;
  fecha: string;
  tropaId: string;
  tropaCodigo: string;
  frigorifico: string;
  remitoDte: string;
  cabezas: number;
  pesoBrutoTotalKg: number;
  pesoBrutoPromedioKg: number;
  desbastePct: number; // 7% estándar frigorífico en 370-420 kg
  pesoNetoTotalKg: number;
  pesoNetoPromedioKg: number;
  precioKgVivoArs: number; // $/kg vivo neto pactado
  facturacionTotalArs: number; // pesoNetoTotalKg * precioKgVivoArs
  costoAlimentacionTotalArs: number;
  otrosGastosArs: number; // Flete / DTe
  costoTotalArs: number;
  gananciaNetaTotalArs: number;
  gananciaNetaPorCabezaArs: number;
  margenSobreCostoPct: number;
  diasCicloTotal: number;
}

// =========================================================================
// 1. DEFINICIÓN DEFAULT DE LAS 5 ETAPAS EXACTAS DEL EXCEL HJB
// =========================================================================
export const CORRALES_DEFINICION_DEFAULT: DefinicionCorral[] = [
  {
    id: "guachera",
    numero: 1,
    nombreCorto: "Guachera Machos",
    nombreCompleto: "1- Guachera / Estaca (Machos) hasta 80kg",
    icono: "🍼",
    pesoEntradaKg: 38,
    pesoObjetivoKg: 80,
    diasEstimados: 60,
    diasAcumulados: 60,
    color: "#3b82f6",
    descripcion: "Crianza inicial individual de terneros machos nacidos en el tambo hasta el desleche.",
    dietaBase: [
      { insumoId: "leche", nombre: "Leche entera tambo", cantidadKgDia: 4.0, unidad: "lt" },
      { insumoId: "balanceado-iniciador", nombre: "Balanceado iniciador", cantidadKgDia: 0.5, unidad: "kg" },
    ],
  },
  {
    id: "rm1",
    numero: 2,
    nombreCorto: "Recría Machos 1",
    nombreCompleto: "2- RM1 - Recría Machos 1 hasta 115kg",
    icono: "🥣",
    pesoEntradaKg: 80,
    pesoObjetivoKg: 115,
    diasEstimados: 30,
    diasAcumulados: 90,
    color: "#06b6d4",
    descripcion: "Adaptación post-desleche de terneros machos a ración sólida y desarrollo ruminal temprano.",
    dietaBase: [
      { insumoId: "balanceado-recria", nombre: "Alimento balanceado", cantidadKgDia: 3.0, unidad: "kg" },
      { insumoId: "rollo-alfalfa", nombre: "Rollo de alfalfa picado", cantidadKgDia: 1.11, unidad: "kg" },
    ],
  },
  {
    id: "rm2",
    numero: 3,
    nombreCorto: "Recría Machos 2",
    nombreCompleto: "3- RM2 - Recría Machos 2 hasta 170kg",
    icono: "🌽",
    pesoEntradaKg: 115,
    pesoObjetivoKg: 170,
    diasEstimados: 60,
    diasAcumulados: 150,
    color: "#eab308",
    descripcion: "Crecimiento estructural y óseo de machos a corral con ración energética y proteica.",
    dietaBase: [
      { insumoId: "maiz", nombre: "Maíz grano quebrado", cantidadKgDia: 3.0, unidad: "kg" },
      { insumoId: "pellet-soja", nombre: "Pellet de soja", cantidadKgDia: 0.5, unidad: "kg" },
      { insumoId: "rollo-alfalfa", nombre: "Rollo de alfalfa", cantidadKgDia: 3.0, unidad: "kg" },
      { insumoId: "sal-mineral", nombre: "Sal mineral / premezcla", cantidadKgDia: 0.02, unidad: "kg" },
    ],
  },
  {
    id: "rm3",
    numero: 4,
    nombreCorto: "Recría Machos 3",
    nombreCompleto: "4- RM3 - Recría Machos 3 hasta 270kg",
    icono: "🌿",
    pesoEntradaKg: 170,
    pesoObjetivoKg: 270,
    diasEstimados: 120,
    diasAcumulados: 270,
    color: "#10b981",
    descripcion: "Desarrollo muscular de novillos con inclusión de silaje de maíz y preparación para engorde.",
    dietaBase: [
      { insumoId: "silo-maiz-kg", nombre: "Silo de maíz planta entera", cantidadKgDia: 1.0, unidad: "kg" },
      { insumoId: "maiz", nombre: "Maíz grano", cantidadKgDia: 3.0, unidad: "kg" },
      { insumoId: "pellet-soja", nombre: "Pellet de soja", cantidadKgDia: 0.5, unidad: "kg" },
      { insumoId: "rollo-alfalfa", nombre: "Rollo de alfalfa", cantidadKgDia: 4.0, unidad: "kg" },
      { insumoId: "sal-mineral", nombre: "Sal mineral / premezcla", cantidadKgDia: 0.03, unidad: "kg" },
    ],
  },
  {
    id: "terminacion",
    numero: 5,
    nombreCorto: "Terminación Gordos",
    nombreCompleto: "5- CG - Cría Gordos (Terminación) hasta 400kg",
    icono: "🥩",
    pesoEntradaKg: 270,
    pesoObjetivoKg: 410,
    diasEstimados: 90,
    diasAcumulados: 360,
    color: "#f97316",
    descripcion: "Terminación intensiva de machos a corral para lograr terminación comercial y grasa adecuada.",
    dietaBase: [
      { insumoId: "maiz", nombre: "Maíz grano", cantidadKgDia: 5.5, unidad: "kg" },
      { insumoId: "silo-maiz-kg", nombre: "Silo de maíz", cantidadKgDia: 2.0, unidad: "kg" },
      { insumoId: "pellet-soja", nombre: "Pellet de soja", cantidadKgDia: 1.0, unidad: "kg" },
      { insumoId: "rollo-alfalfa", nombre: "Rollo de alfalfa", cantidadKgDia: 2.0, unidad: "kg" },
      { insumoId: "sal-mineral", nombre: "Sal mineral terminación", cantidadKgDia: 0.03, unidad: "kg" },
    ],
  },
];

export const CORRALES_DEFINICION = CORRALES_DEFINICION_DEFAULT;

// =========================================================================
// 2. DATOS INICIALES REALISTAS DE HJB (EN PRODUCCIÓN)
// =========================================================================
export const TROPAS_DEFAULT: TropaGanadera[] = [
  {
    id: "tropa-guachera-1",
    codigo: "TR-26-G1",
    nombre: "Camada Machos Guachera 1",
    corralId: "guachera",
    cabezas: 9,
    fechaIngreso: "20/07/26",
    diasEnCorral: 57,
    pesoInicialKg: 38,
    pesoActualKg: 73.5,
    gdpvKgDia: 0.62,
    origen: "Nacimientos Tambo HJB",
  },
  {
    id: "tropa-rm1-1",
    codigo: "TR-26-R1",
    nombre: "Lote Transición RM1 (Machos)",
    corralId: "rm1",
    cabezas: 22,
    fechaIngreso: "22/08/26",
    diasEnCorral: 24,
    pesoInicialKg: 75,
    pesoActualKg: 106.0,
    gdpvKgDia: 1.29,
    origen: "Pase desde Guachera",
  },
  {
    id: "tropa-rm2-1",
    codigo: "TR-26-R2",
    nombre: "Lote Crecimiento RM2 (Machos)",
    corralId: "rm2",
    cabezas: 28,
    fechaIngreso: "25/07/26",
    diasEnCorral: 52,
    pesoInicialKg: 116,
    pesoActualKg: 164.5,
    gdpvKgDia: 0.93,
    origen: "Pase desde RM1",
  },
  {
    id: "tropa-rm3-1",
    codigo: "TR-26-R3",
    nombre: "Lote Desarrollo RM3 (Machos)",
    corralId: "rm3",
    cabezas: 15,
    fechaIngreso: "10/05/26",
    diasEnCorral: 108,
    pesoInicialKg: 172,
    pesoActualKg: 262.0,
    gdpvKgDia: 0.83,
    origen: "Pase desde RM2",
  },
  {
    id: "tropa-cg-1",
    codigo: "TR-26-GORDOS",
    nombre: "Lote Terminación Frigorífico (Machos)",
    corralId: "terminacion",
    cabezas: 25,
    fechaIngreso: "20/06/26",
    diasEnCorral: 87,
    pesoInicialKg: 274,
    pesoActualKg: 404.0,
    gdpvKgDia: 1.49,
    origen: "Pase desde RM3",
  },
];

export const PESAJES_DEFAULT: PesajeRegistro[] = [
  {
    id: "pes-01",
    tropaId: "tropa-cg-1",
    tropaNombre: "Lote Terminación Frigorífico",
    corralId: "terminacion",
    fecha: "12/09/26",
    cabezas: 26,
    pesoPromedioKg: 404.0,
    pesoTotalKg: 10504,
    gdpvCalculada: 1.49,
    observaciones: "Pesaje previo a despacho a frigorífico. Lote homogéneo terminado.",
  },
  {
    id: "pes-02",
    tropaId: "tropa-rm3-1",
    tropaNombre: "Lote Desarrollo RM3",
    corralId: "rm3",
    fecha: "05/09/26",
    cabezas: 30,
    pesoPromedioKg: 262.0,
    pesoTotalKg: 7860,
    gdpvCalculada: 0.85,
    observaciones: "Próximos a pasar a corral de terminación final.",
  },
  {
    id: "pes-03",
    tropaId: "tropa-rm2-1",
    tropaNombre: "Lote Crecimiento RM2",
    corralId: "rm2",
    fecha: "28/08/26",
    cabezas: 28,
    pesoPromedioKg: 164.5,
    pesoTotalKg: 4606,
    gdpvCalculada: 0.95,
    observaciones: "Buen desarrollo de estructura ósea.",
  },
  {
    id: "pes-04",
    tropaId: "tropa-rm1-1",
    tropaNombre: "Lote Transición RM1",
    corralId: "rm1",
    fecha: "10/09/26",
    cabezas: 22,
    pesoPromedioKg: 106.0,
    pesoTotalKg: 2332,
    gdpvCalculada: 1.30,
    observaciones: "Excelente respuesta a la ración seca post-desleche.",
  },
  {
    id: "pes-05",
    tropaId: "tropa-guachera-1",
    tropaNombre: "Camada Machos Guachera 1",
    corralId: "guachera",
    fecha: "08/09/26",
    cabezas: 24,
    pesoPromedioKg: 73.5,
    pesoTotalKg: 1764,
    gdpvCalculada: 0.62,
    observaciones: "Control de desleche a los 60 días.",
  },
];

export const FICHAS_VENTAS_DEFAULT: FichaVentaFrigorifico[] = [
  {
    id: "venta-26-08",
    fecha: "18/08/26",
    tropaId: "tropa-cg-ant",
    tropaCodigo: "TR-26-GORDOS-01",
    frigorifico: "Frigorífico Logros S.A.",
    remitoDte: "DTe 0048-289104",
    cabezas: 25,
    pesoBrutoTotalKg: 10250,
    pesoBrutoPromedioKg: 410.0,
    desbastePct: 7.0,
    pesoNetoTotalKg: 9532.5,
    pesoNetoPromedioKg: 381.3,
    precioKgVivoArs: 4200,
    facturacionTotalArs: 40036500,
    costoAlimentacionTotalArs: 18026450,
    otrosGastosArs: 950000,
    costoTotalArs: 18976450,
    gananciaNetaTotalArs: 21060050,
    gananciaNetaPorCabezaArs: 842402,
    margenSobreCostoPct: 110.9,
    diasCicloTotal: 362,
  },
  {
    id: "venta-26-06",
    fecha: "20/06/26",
    tropaId: "tropa-cg-may",
    tropaCodigo: "TR-26-GORDOS-02",
    frigorifico: "Frigorífico Swift Argentina",
    remitoDte: "DTe 0048-278451",
    cabezas: 22,
    pesoBrutoTotalKg: 8976,
    pesoBrutoPromedioKg: 408.0,
    desbastePct: 7.0,
    pesoNetoTotalKg: 8347.7,
    pesoNetoPromedioKg: 379.4,
    precioKgVivoArs: 4050,
    facturacionTotalArs: 33808185,
    costoAlimentacionTotalArs: 15642000,
    otrosGastosArs: 880000,
    costoTotalArs: 16522000,
    gananciaNetaTotalArs: 17286185,
    gananciaNetaPorCabezaArs: 785735,
    margenSobreCostoPct: 104.6,
    diasCicloTotal: 358,
  },
];

// =========================================================================
// 3. PERSISTENCIA EN LOCAL STORAGE
// =========================================================================
const STORAGE_CORRALES = "hjb_ganaderia_corrales_v02";
const STORAGE_TROPAS = "hjb_ganaderia_tropas_v02";
const STORAGE_PESAJES = "hjb_ganaderia_pesajes_v02";
const STORAGE_VENTAS = "hjb_ganaderia_ventas_v02";

export function getCorrales(): DefinicionCorral[] {
  if (typeof window === "undefined") return CORRALES_DEFINICION_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_CORRALES);
    if (!raw) return CORRALES_DEFINICION_DEFAULT;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : CORRALES_DEFINICION_DEFAULT;
  } catch {
    return CORRALES_DEFINICION_DEFAULT;
  }
}

export function saveCorrales(corrales: DefinicionCorral[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_CORRALES, JSON.stringify(corrales));
}

export function resetCorralesToDefault(): DefinicionCorral[] {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_CORRALES);
  }
  return JSON.parse(JSON.stringify(CORRALES_DEFINICION_DEFAULT));
}


export function getTropas(): TropaGanadera[] {
  if (typeof window === "undefined") return TROPAS_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_TROPAS);
    return raw ? JSON.parse(raw) : TROPAS_DEFAULT;
  } catch {
    return TROPAS_DEFAULT;
  }
}

export const HJB_GANADERIA_SYNC_EVENT = "hjb_ganaderia_sync_event";

export function saveTropas(tropas: TropaGanadera[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_TROPAS, JSON.stringify(tropas));
  window.dispatchEvent(new CustomEvent(HJB_GANADERIA_SYNC_EVENT, { detail: { tropas } }));
}

/**
 * Sincroniza automáticamente las cabezas de machos en recría y terminación
 * a partir de las extracciones de DeLaval DelPro.
 */
export function sincronizarGanaderiaDesdeDelPro(
  machosPorCorral?: {
    guachera?: number;
    rm1?: number;
    rm2?: number;
    rm3?: number;
    terminacion?: number;
  },
  partosRecientes?: Array<{
    id: string;
    fecha: string;
    rpMadre: string;
    rpCria: string;
    sexo: "Macho" | "Hembra";
    pesoNacimientoKg: number;
    destino: string;
    estado: string;
    observaciones?: string;
  }>
): TropaGanadera[] {
  if (typeof window === "undefined") return TROPAS_DEFAULT;

  const currentTropas = getTropas();
  let updatedTropas = [...currentTropas];

  if (machosPorCorral) {
    updatedTropas = updatedTropas.map((tropa) => {
      if (tropa.corralId === "guachera" && machosPorCorral.guachera !== undefined) {
        return { ...tropa, cabezas: Math.max(0, machosPorCorral.guachera) };
      }
      if (tropa.corralId === "rm1" && machosPorCorral.rm1 !== undefined) {
        return { ...tropa, cabezas: Math.max(0, machosPorCorral.rm1) };
      }
      if (tropa.corralId === "rm2" && machosPorCorral.rm2 !== undefined) {
        return { ...tropa, cabezas: Math.max(0, machosPorCorral.rm2) };
      }
      if (tropa.corralId === "rm3" && machosPorCorral.rm3 !== undefined) {
        return { ...tropa, cabezas: Math.max(0, machosPorCorral.rm3) };
      }
      if (tropa.corralId === "terminacion" && machosPorCorral.terminacion !== undefined) {
        return { ...tropa, cabezas: Math.max(0, machosPorCorral.terminacion) };
      }
      return tropa;
    });
  }

  saveTropas(updatedTropas);

  if (partosRecientes && partosRecientes.length > 0) {
    try {
      localStorage.setItem("hjb_delpro_partos_recientes", JSON.stringify(partosRecientes));
    } catch {
      // ignore
    }
  }

  window.dispatchEvent(new CustomEvent(HJB_GANADERIA_SYNC_EVENT, { detail: { tropas: updatedTropas, machosPorCorral } }));
  return updatedTropas;
}

export function getPartosRecientesDelPro(): Array<{
  id: string;
  fecha: string;
  rpMadre: string;
  rpCria: string;
  sexo: "Macho" | "Hembra";
  pesoNacimientoKg: number;
  destino: string;
  estado: string;
  observaciones?: string;
}> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("hjb_delpro_partos_recientes");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}


export function getPesajes(): PesajeRegistro[] {
  if (typeof window === "undefined") return PESAJES_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_PESAJES);
    return raw ? JSON.parse(raw) : PESAJES_DEFAULT;
  } catch {
    return PESAJES_DEFAULT;
  }
}

export function savePesajes(pesajes: PesajeRegistro[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_PESAJES, JSON.stringify(pesajes));
}

export function getVentas(): FichaVentaFrigorifico[] {
  if (typeof window === "undefined") return FICHAS_VENTAS_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_VENTAS);
    return raw ? JSON.parse(raw) : FICHAS_VENTAS_DEFAULT;
  } catch {
    return FICHAS_VENTAS_DEFAULT;
  }
}

export function saveVentas(ventas: FichaVentaFrigorifico[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_VENTAS, JSON.stringify(ventas));
}

// =========================================================================
// 4. CÁLCULO DINÁMICO DE COSTOS DE ALIMENTACIÓN CRUZADOS CON VALORES MÓVILES
// =========================================================================
export function getCostoInsumoDieta(insumoId: string): number {
  if (insumoId === "maiz") {
    const p = getPrecioReferencia("maiz");
    return p > 0 ? p / 1000 : 295.2; // $/kg
  }
  if (insumoId === "silo-maiz-kg") {
    const p = getPrecioReferencia("silo-maiz-kg");
    return p > 0 ? p : 39.1; // $/kg
  }
  if (insumoId === "pellet-soja") {
    const p = getPrecioReferencia("pellet-soja");
    return p > 0 ? p / 1000 : 489.7; // $/kg
  }
  if (insumoId === "rollo-alfalfa") {
    const p = getPrecioReferencia("rollo-alfalfa");
    return p > 0 ? p / 500 : 69.0; // $/kg
  }
  if (insumoId === "leche") {
    return 549.0; // $/lt
  }
  if (insumoId === "balanceado-iniciador") {
    return 340.0; // $/kg
  }
  if (insumoId === "balanceado-recria") {
    return 340.0; // $/kg
  }
  if (insumoId === "sal-mineral") {
    return 888.0; // $/kg
  }
  return 100.0;
}

export function getCostoDiarioPorAnimal(corralId: EtapaCorralId, corralesList?: DefinicionCorral[]): number {
  const list = corralesList || getCorrales();
  const def = list.find((c) => c.id === corralId);
  if (!def) return 0;
  let total = 0;
  for (const c of def.dietaBase) {
    const precioUnit = getCostoInsumoDieta(c.insumoId);
    total += c.cantidadKgDia * precioUnit;
  }
  return Math.round(total);
}

export function getResumenGanaderia(corralesList?: DefinicionCorral[], tropasCustom?: TropaGanadera[]) {
  const tropas = tropasCustom || getTropas();
  const corrales = corralesList || getCorrales();
  let totalCabezas = 0;
  let totalKilos = 0;
  let listosFrigorifico = 0;
  let costoDiarioTotal = 0;

  for (const t of tropas) {
    totalCabezas += t.cabezas;
    totalKilos += t.cabezas * t.pesoActualKg;
    if (t.corralId === "terminacion" && t.pesoActualKg >= 370) {
      listosFrigorifico += t.cabezas;
    }
    const costoAnimal = getCostoDiarioPorAnimal(t.corralId, corrales);
    costoDiarioTotal += t.cabezas * costoAnimal;
  }

  return {
    totalCabezas,
    totalKilos: Math.round(totalKilos),
    pesoPromedioGeneral: totalCabezas > 0 ? Math.round(totalKilos / totalCabezas) : 0,
    listosFrigorifico,
    costoDiarioTotal,
  };
}

// =========================================================================
// 5. CÁLCULO PREDICTIVO DELPRO Y CONFIRMACIÓN DE FAENA ESCALONADA
// =========================================================================
export interface NovilloTerminacion {
  id: string;
  caravana: string;
  rpMadre?: string;
  fechaIngreso: string;
  diasEnCorral: number;
  pesoIngresoKg: number;
  pesoActualEstimadoKg: number;
  gdpvKgDia: number;
  categoriaFaena: "listo_para_venta" | "engorde_medio" | "recien_ingresado";
  confirmadoVenta: boolean;
}

export const HJB_NOVILLOS_CONFIRMADOS_EVENT = "hjb_novillos_confirmados_event";
const STORAGE_NOVILLOS_TERMINACION = "hjb_novillos_terminacion_v01";

export const NOVILLOS_TERMINACION_DEFAULT: NovilloTerminacion[] = [
  // Lote 1: Punta de Tropa (84 a 92 días en corral - Listos para faena) - 10 novillos
  { id: "nov-01", caravana: "RP-8101", rpMadre: "RP-3890", fechaIngreso: "15/06/26", diasEnCorral: 92, pesoIngresoKg: 278, pesoActualEstimadoKg: 415.0, gdpvKgDia: 1.49, categoriaFaena: "listo_para_venta", confirmadoVenta: true },
  { id: "nov-02", caravana: "RP-8102", rpMadre: "RP-4102", fechaIngreso: "16/06/26", diasEnCorral: 91, pesoIngresoKg: 280, pesoActualEstimadoKg: 415.5, gdpvKgDia: 1.49, categoriaFaena: "listo_para_venta", confirmadoVenta: true },
  { id: "nov-03", caravana: "RP-8103", rpMadre: "RP-3750", fechaIngreso: "18/06/26", diasEnCorral: 89, pesoIngresoKg: 275, pesoActualEstimadoKg: 407.6, gdpvKgDia: 1.49, categoriaFaena: "listo_para_venta", confirmadoVenta: true },
  { id: "nov-04", caravana: "RP-8104", rpMadre: "RP-4215", fechaIngreso: "18/06/26", diasEnCorral: 89, pesoIngresoKg: 282, pesoActualEstimadoKg: 414.6, gdpvKgDia: 1.49, categoriaFaena: "listo_para_venta", confirmadoVenta: true },
  { id: "nov-05", caravana: "RP-8105", rpMadre: "RP-3990", fechaIngreso: "20/06/26", diasEnCorral: 87, pesoIngresoKg: 274, pesoActualEstimadoKg: 403.6, gdpvKgDia: 1.49, categoriaFaena: "listo_para_venta", confirmadoVenta: true },
  { id: "nov-06", caravana: "RP-8106", rpMadre: "RP-4050", fechaIngreso: "20/06/26", diasEnCorral: 87, pesoIngresoKg: 279, pesoActualEstimadoKg: 408.6, gdpvKgDia: 1.49, categoriaFaena: "listo_para_venta", confirmadoVenta: true },
  { id: "nov-07", caravana: "RP-8107", rpMadre: "RP-3820", fechaIngreso: "21/06/26", diasEnCorral: 86, pesoIngresoKg: 276, pesoActualEstimadoKg: 404.1, gdpvKgDia: 1.49, categoriaFaena: "listo_para_venta", confirmadoVenta: true },
  { id: "nov-08", caravana: "RP-8108", rpMadre: "RP-4110", fechaIngreso: "22/06/26", diasEnCorral: 85, pesoIngresoKg: 281, pesoActualEstimadoKg: 407.6, gdpvKgDia: 1.49, categoriaFaena: "listo_para_venta", confirmadoVenta: true },
  { id: "nov-09", caravana: "RP-8109", rpMadre: "RP-3920", fechaIngreso: "22/06/26", diasEnCorral: 85, pesoIngresoKg: 277, pesoActualEstimadoKg: 403.6, gdpvKgDia: 1.49, categoriaFaena: "listo_para_venta", confirmadoVenta: true },
  { id: "nov-10", caravana: "RP-8110", rpMadre: "RP-4300", fechaIngreso: "23/06/26", diasEnCorral: 84, pesoIngresoKg: 283, pesoActualEstimadoKg: 408.1, gdpvKgDia: 1.49, categoriaFaena: "listo_para_venta", confirmadoVenta: true },

  // Lote 2: En Engorde Medio (40 a 52 días en corral) - 10 novillos
  { id: "nov-11", caravana: "RP-8111", rpMadre: "RP-3650", fechaIngreso: "25/07/26", diasEnCorral: 52, pesoIngresoKg: 270, pesoActualEstimadoKg: 347.5, gdpvKgDia: 1.49, categoriaFaena: "engorde_medio", confirmadoVenta: false },
  { id: "nov-12", caravana: "RP-8112", rpMadre: "RP-4020", fechaIngreso: "25/07/26", diasEnCorral: 52, pesoIngresoKg: 274, pesoActualEstimadoKg: 351.5, gdpvKgDia: 1.49, categoriaFaena: "engorde_medio", confirmadoVenta: false },
  { id: "nov-13", caravana: "RP-8113", rpMadre: "RP-4150", fechaIngreso: "28/07/26", diasEnCorral: 49, pesoIngresoKg: 272, pesoActualEstimadoKg: 345.0, gdpvKgDia: 1.49, categoriaFaena: "engorde_medio", confirmadoVenta: false },
  { id: "nov-14", caravana: "RP-8114", rpMadre: "RP-3780", fechaIngreso: "30/07/26", diasEnCorral: 47, pesoIngresoKg: 268, pesoActualEstimadoKg: 338.0, gdpvKgDia: 1.49, categoriaFaena: "engorde_medio", confirmadoVenta: false },
  { id: "nov-15", caravana: "RP-8115", rpMadre: "RP-4220", fechaIngreso: "01/08/26", diasEnCorral: 45, pesoIngresoKg: 275, pesoActualEstimadoKg: 342.0, gdpvKgDia: 1.49, categoriaFaena: "engorde_medio", confirmadoVenta: false },
  { id: "nov-16", caravana: "RP-8116", rpMadre: "RP-3910", fechaIngreso: "02/08/26", diasEnCorral: 44, pesoIngresoKg: 273, pesoActualEstimadoKg: 338.5, gdpvKgDia: 1.49, categoriaFaena: "engorde_medio", confirmadoVenta: false },
  { id: "nov-17", caravana: "RP-8117", rpMadre: "RP-4080", fechaIngreso: "04/08/26", diasEnCorral: 42, pesoIngresoKg: 276, pesoActualEstimadoKg: 338.5, gdpvKgDia: 1.49, categoriaFaena: "engorde_medio", confirmadoVenta: false },
  { id: "nov-18", caravana: "RP-8118", rpMadre: "RP-3850", fechaIngreso: "04/08/26", diasEnCorral: 42, pesoIngresoKg: 270, pesoActualEstimadoKg: 332.5, gdpvKgDia: 1.49, categoriaFaena: "engorde_medio", confirmadoVenta: false },
  { id: "nov-19", caravana: "RP-8119", rpMadre: "RP-4310", fechaIngreso: "05/08/26", diasEnCorral: 41, pesoIngresoKg: 274, pesoActualEstimadoKg: 335.0, gdpvKgDia: 1.49, categoriaFaena: "engorde_medio", confirmadoVenta: false },
  { id: "nov-20", caravana: "RP-8120", rpMadre: "RP-3720", fechaIngreso: "06/08/26", diasEnCorral: 40, pesoIngresoKg: 278, pesoActualEstimadoKg: 337.5, gdpvKgDia: 1.49, categoriaFaena: "engorde_medio", confirmadoVenta: false },

  // Lote 3: Recién Ingresados a Terminación (11 a 21 días en corral) - 6 novillos
  { id: "nov-21", caravana: "RP-8121", rpMadre: "RP-4400", fechaIngreso: "25/08/26", diasEnCorral: 21, pesoIngresoKg: 268, pesoActualEstimadoKg: 299.3, gdpvKgDia: 1.49, categoriaFaena: "recien_ingresado", confirmadoVenta: false },
  { id: "nov-22", caravana: "RP-8122", rpMadre: "RP-4180", fechaIngreso: "27/08/26", diasEnCorral: 19, pesoIngresoKg: 272, pesoActualEstimadoKg: 300.3, gdpvKgDia: 1.49, categoriaFaena: "recien_ingresado", confirmadoVenta: false },
  { id: "nov-23", caravana: "RP-8123", rpMadre: "RP-3995", fechaIngreso: "28/08/26", diasEnCorral: 18, pesoIngresoKg: 270, pesoActualEstimadoKg: 296.8, gdpvKgDia: 1.49, categoriaFaena: "recien_ingresado", confirmadoVenta: false },
  { id: "nov-24", caravana: "RP-8124", rpMadre: "RP-4250", fechaIngreso: "30/08/26", diasEnCorral: 16, pesoIngresoKg: 275, pesoActualEstimadoKg: 298.8, gdpvKgDia: 1.49, categoriaFaena: "recien_ingresado", confirmadoVenta: false },
  { id: "nov-25", caravana: "RP-8125", rpMadre: "RP-4090", fechaIngreso: "02/09/26", diasEnCorral: 13, pesoIngresoKg: 271, pesoActualEstimadoKg: 290.4, gdpvKgDia: 1.49, categoriaFaena: "recien_ingresado", confirmadoVenta: false },
  { id: "nov-26", caravana: "RP-8126", rpMadre: "RP-3880", fechaIngreso: "04/09/26", diasEnCorral: 11, pesoIngresoKg: 274, pesoActualEstimadoKg: 290.4, gdpvKgDia: 1.49, categoriaFaena: "recien_ingresado", confirmadoVenta: false },
];

export function getNovillosTerminacion(): NovilloTerminacion[] {
  if (typeof window === "undefined") return NOVILLOS_TERMINACION_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_NOVILLOS_TERMINACION);
    return raw ? JSON.parse(raw) : NOVILLOS_TERMINACION_DEFAULT;
  } catch {
    return NOVILLOS_TERMINACION_DEFAULT;
  }
}

export function saveNovillosTerminacion(novillos: NovilloTerminacion[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_NOVILLOS_TERMINACION, JSON.stringify(novillos));
  window.dispatchEvent(new CustomEvent(HJB_NOVILLOS_CONFIRMADOS_EVENT, { detail: novillos }));
}

export function toggleConfirmacionNovillo(id: string): NovilloTerminacion[] {
  const list = getNovillosTerminacion().map((n) => {
    if (n.id === id) return { ...n, confirmadoVenta: !n.confirmadoVenta };
    return n;
  });
  saveNovillosTerminacion(list);
  return list;
}

export function confirmarListaNovillos(ids: string[]): NovilloTerminacion[] {
  const list = getNovillosTerminacion().map((n) => ({
    ...n,
    confirmadoVenta: ids.includes(n.id),
  }));
  saveNovillosTerminacion(list);
  return list;
}
