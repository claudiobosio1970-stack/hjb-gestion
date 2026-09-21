"use client";

import { Activity, agricultureData, realQuantity, plannedQuantity, sanitizeForFirestore } from "./agricultureData";
import { getDolarBnaVenta, getPrecioReferencia, getValoresMoviles } from "./valoresMovilesData";
import { db } from "./firebase";
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";

export type CategoriaInsumo =
  | "Fitosanitarios"
  | "Semillas"
  | "Fertilizantes"
  | "Granos"
  | "Forrajes"
  | "Forrajes & Granos"
  | "Combustibles";

export interface CanjeGranoPellet {
  id: string;
  fecha: string;
  cerealInsumoId: string; // ej: "soja-grano" o "maiz-grano"
  cerealNombre: string;
  acopioOrigen: string; // "AFA Los Cardos"
  toneladasGrano: number;
  kgGrano: number;
  porcentajeCanje: number; // ej: 75 (%)
  toneladasPellet: number;
  kgPellet: number;
  pelletInsumoId: string; // "pellet-soja"
  pelletNombre: string;
  destinoPellet: string; // "Galpón de Raciones - Tambo"
  comprobante?: string;
  observaciones?: string;
  createdAt: string;
}

export interface StockUbicacionMovimiento {
  id: string;
  fecha: string;
  tipo: string;
  campo: string;
  lote?: string;
  cantidad: number;
  cantidadTn?: number;
  unidad: string;
  referencia?: string;
  detalle: string;
}

export interface StockUbicacionBreakdown {
  lugar: string; // ej: "Silos", "Cooperativa", "Puerto (San Lorenzo)", "AFA Los Cardos", "Campo Keuneke", "Tambo"
  tipoLugar: "silo" | "cooperativa" | "puerto" | "afa" | "campo" | "tambo" | "galpon" | "otro";
  icono: string;
  cantidad: number; // en unidad original (kg o rollos)
  cantidadTn?: number; // para cereales en Toneladas (Tn)
  unidad: string;
  porcentaje: number;
  movimientosCount: number;
  detalles: StockUbicacionMovimiento[];
}

export interface InsumoStockItem {
  id: string;
  nombre: string;
  categoria: CategoriaInsumo;
  unidad: string;
  stockInicial: number;
  stockMinimoAlerta: number;
  ubicacion: string;
  valorMovilId: string;
  aliasLabores: string[];
  // Campos calculados
  stockActual: number;
  consumoAgricola: number;
  ingresosCompras: number;
  produccionPropia: number;
  canjeIngresos?: number;
  canjeSalidas?: number;
  ajustesInventario?: number;
  precioUnitarioArs: number;
  precioUnitarioUsd: number;
  valorTotalArs: number;
  valorTotalUsd: number;
  enAlerta: boolean;
  porcentajeStock: number; // % sobre stock inicial
  // Campos de ubicación y acopio de granos y rollos
  stockPorUbicacion?: StockUbicacionBreakdown[];
  totalTn?: number; // Stock disponible en Toneladas (Tn)
  esCerealOGrano?: boolean;
  esRollo?: boolean;
}

export interface MovimientoStockItem {
  id: string;
  insumoId: string;
  insumoNombre: string;
  fecha: string;
  tipo:
    | "Ingreso / Compra"
    | "Consumo Agrícola"
    | "Consumo Ganadería"
    | "Ajuste de Inventario"
    | "Producción Propia"
    | "Traslado / Destino"
    | "Canje a Pellet (AFA)"
    | "Ingreso por Canje";
  cantidad: number; // Positivo para ingresos y producción, negativo para consumos
  cantidadTn?: number;
  unidad: string;
  ubicacion?: string;
  referencia?: string;
  detalle: string;
  remitoProveedor?: string;
  costoArs?: number;
}

export interface IngresoStockManual {
  id: string;
  insumoId: string;
  fecha: string;
  cantidad: number;
  cantidadTn?: number;
  remitoProveedor: string;
  costoUnitarioArs?: number;
  observaciones?: string;
  ubicacion?: string; // ej: "AFA Los Cardos", "Silos", "Cooperativa", "Puerto (San Lorenzo)", "Depósito de Químicos - Aguilera", etc.
  tipoLugar?: StockUbicacionBreakdown["tipoLugar"];
  deleted?: boolean;
}

// =========================================================================
// INVENTARIO BASE Y CATÁLOGO DE INSUMOS DE HJB
// =========================================================================
export const INSUMOS_BASE_CATALOGO: Omit<
  InsumoStockItem,
  | "stockActual"
  | "consumoAgricola"
  | "ingresosCompras"
  | "produccionPropia"
  | "canjeIngresos"
  | "canjeSalidas"
  | "ajustesInventario"
  | "precioUnitarioArs"
  | "precioUnitarioUsd"
  | "valorTotalArs"
  | "valorTotalUsd"
  | "enAlerta"
  | "porcentajeStock"
  | "stockPorUbicacion"
  | "totalTn"
  | "esCerealOGrano"
  | "esRollo"
>[] = [
  // 1. FITOSANITARIOS & AGROQUÍMICOS
  {
    id: "glifosato",
    nombre: "Glifosato 66% (Concentrado Soluble)",
    categoria: "Fitosanitarios",
    unidad: "Lts",
    stockInicial: 0,
    stockMinimoAlerta: 300,
    ubicacion: "Depósito de Químicos - Aguilera",
    valorMovilId: "glifosato",
    aliasLabores: ["glifosato", "glifo", "roundup", "glifosato 66%"],
  },
  {
    id: "2-4-d",
    nombre: "2,4-D Enlist Colex-D / Dédalo Elite",
    categoria: "Fitosanitarios",
    unidad: "Lts",
    stockInicial: 0,
    stockMinimoAlerta: 200,
    ubicacion: "Depósito de Químicos - Aguilera",
    valorMovilId: "2-4-d",
    aliasLabores: ["2,4-d", "2-4-d", "2.4-d", "enlist", "dédalo", "dedalo elite"],
  },
  {
    id: "atrazina",
    nombre: "Atrazina 90% Granulada (WG)",
    categoria: "Fitosanitarios",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 150,
    ubicacion: "Depósito de Químicos - Aguilera",
    valorMovilId: "atrazina",
    aliasLabores: ["atrazina", "atrazina 90%", "atrazina wg"],
  },
  {
    id: "cletodim",
    nombre: "Cletodim 24% EC (Graminicida)",
    categoria: "Fitosanitarios",
    unidad: "Lts",
    stockInicial: 0,
    stockMinimoAlerta: 80,
    ubicacion: "Depósito de Químicos - Aguilera",
    valorMovilId: "cletodim",
    aliasLabores: ["cletodim", "graminicida", "cletodim 24%"],
  },
  {
    id: "coadyuvante",
    nombre: "Coadyuvante / Aceite Vegetal Metilado",
    categoria: "Fitosanitarios",
    unidad: "Lts",
    stockInicial: 0,
    stockMinimoAlerta: 100,
    ubicacion: "Depósito de Químicos - Aguilera",
    valorMovilId: "coadyuvante",
    aliasLabores: ["coadyuvante", "aceite", "aceite metilado", "tensioactivo"],
  },
  {
    id: "paraquat",
    nombre: "Paraquat 27.6% (Desecante / Quemador)",
    categoria: "Fitosanitarios",
    unidad: "Lts",
    stockInicial: 0,
    stockMinimoAlerta: 100,
    ubicacion: "Depósito de Químicos - Aguilera",
    valorMovilId: "paraquat",
    aliasLabores: ["paraquat", "cerillo", "desecante"],
  },

  // 2. SEMILLAS
  {
    id: "semilla-maiz",
    nombre: "Semilla Maíz Híbrido VT3P / VIP3",
    categoria: "Semillas",
    unidad: "Bolsas",
    stockInicial: 0,
    stockMinimoAlerta: 30,
    ubicacion: "Galpón de Semillas - Aguilera",
    valorMovilId: "semilla-maiz",
    aliasLabores: ["maíz", "maiz", "semilla maíz", "semilla maiz", "maíz híbrido", "dekalb", "pioneer"],
  },
  {
    id: "semilla-soja",
    nombre: "Semilla Soja Primera DM / Enlist",
    categoria: "Semillas",
    unidad: "Bolsas",
    stockInicial: 0,
    stockMinimoAlerta: 50,
    ubicacion: "Galpón de Semillas - Aguilera",
    valorMovilId: "semilla-soja",
    aliasLabores: ["soja", "semilla soja", "soja 1ra", "soja dm", "don mario"],
  },
  {
    id: "semilla-alfalfa",
    nombre: "Semilla Alfalfa Monarca Pelleteada",
    categoria: "Semillas",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 100,
    ubicacion: "Galpón de Semillas - Tambo",
    valorMovilId: "semilla-alfalfa",
    aliasLabores: ["alfalfa", "semilla alfalfa", "monarca"],
  },
  {
    id: "semilla-avena",
    nombre: "Semilla Avena / Vicia (Verdeo de Invierno)",
    categoria: "Semillas",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 300,
    ubicacion: "Galpón de Semillas - Tambo",
    valorMovilId: "semilla-avena",
    aliasLabores: ["avena", "vicia", "verdeo", "centeno"],
  },

  // 3. FERTILIZANTES Y ENMIENDAS
  {
    id: "urea",
    nombre: "Urea Granulada 46-0-0",
    categoria: "Fertilizantes",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 4000,
    ubicacion: "Silo Fertilizante Sólido - Tambo",
    valorMovilId: "urea",
    aliasLabores: ["urea", "urea granulada", "nitrógeno", "fertilizante nitrogenado"],
  },
  {
    id: "map",
    nombre: "MAP (Fosfato Monoamónico 11-52-0)",
    categoria: "Fertilizantes",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 3000,
    ubicacion: "Silo Fertilizante Sólido - Tambo",
    valorMovilId: "map",
    aliasLabores: ["map", "fosfato", "monoamónico", "fósforo"],
  },
  {
    id: "biofertilizante-liq",
    nombre: "Biofertilizante Líquido (Efluente Tratado)",
    categoria: "Fertilizantes",
    unidad: "kL",
    stockInicial: 0,
    stockMinimoAlerta: 50,
    ubicacion: "Laguna de Efluentes - Tambo",
    valorMovilId: "biofertilizante-liq",
    aliasLabores: ["biofertilizante", "efluente", "purín", "biofertilización"],
  },
  {
    id: "enmienda-solida",
    nombre: "Enmienda Orgánica Sólida / Compost",
    categoria: "Fertilizantes",
    unidad: "Tn",
    stockInicial: 0,
    stockMinimoAlerta: 20,
    ubicacion: "Playa de Estiércol Sólido - Tambo",
    valorMovilId: "enmienda-solida",
    aliasLabores: ["enmienda", "estiércol", "compost"],
  },

  // 4. GRANOS Y CEREALES COMERCIALES
  {
    id: "maiz-grano",
    nombre: "Maíz Grano Comercial",
    categoria: "Granos",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 10000,
    ubicacion: "Silos / Acopios",
    valorMovilId: "maiz",
    aliasLabores: ["maíz grano", "maíz", "maiz grano", "maiz", "cosecha maiz", "cosecha maíz", "maíz comercial"],
  },
  {
    id: "soja-grano",
    nombre: "Soja Grano Comercial",
    categoria: "Granos",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 10000,
    ubicacion: "Silos / Acopios / AFA Los Cardos",
    valorMovilId: "soja",
    aliasLabores: ["soja grano", "soja", "soja 1ra", "soja de 1ra", "soja 2da", "cosecha soja", "cosecha soja 1ra"],
  },
  {
    id: "trigo-grano",
    nombre: "Trigo Grano Comercial",
    categoria: "Granos",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 5000,
    ubicacion: "Silos / Acopios",
    valorMovilId: "trigo",
    aliasLabores: ["trigo", "trigo grano", "cosecha trigo", "trigo pan"],
  },

  // 5. FORRAJES, SUBPRODUCTOS Y ALIMENTACIÓN
  {
    id: "silo-maiz",
    nombre: "Silo de Maíz Picado Fino (Bolsa)",
    categoria: "Forrajes",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 25000,
    ubicacion: "Silobolsa #1 - Tambo",
    valorMovilId: "silo-maiz-kg",
    aliasLabores: ["silo", "silo de maíz", "silo picado"],
  },
  {
    id: "pellet-soja",
    nombre: "Pellet de Soja Proteico (Harina)",
    categoria: "Forrajes",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 3000,
    ubicacion: "Tambo",
    valorMovilId: "pellet-soja",
    aliasLabores: ["pellet", "pellet de soja", "pellet soja"],
  },
  {
    id: "pellet-trigo",
    nombre: "Pellet de Trigo (Afrechillo)",
    categoria: "Forrajes",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 3000,
    ubicacion: "Tambo",
    valorMovilId: "pellet-trigo",
    aliasLabores: ["pellet trigo", "pellet de trigo", "afrechillo"],
  },
  {
    id: "rollo-alfalfa",
    nombre: "Rollos de Alfalfa Primera Henificada",
    categoria: "Forrajes",
    unidad: "Rollos",
    stockInicial: 0,
    stockMinimoAlerta: 40,
    ubicacion: "Tinglado de Forrajes",
    valorMovilId: "rollo-alfalfa",
    aliasLabores: ["rollo alfalfa", "rollos alfalfa", "rollo de alfalfa"],
  },
  {
    id: "rollo-avena",
    nombre: "Rollos de Avena Henificada",
    categoria: "Forrajes",
    unidad: "Rollos",
    stockInicial: 0,
    stockMinimoAlerta: 30,
    ubicacion: "Tinglado de Forrajes",
    valorMovilId: "rollo-avena",
    aliasLabores: ["rollo avena", "rollos avena", "rollo de avena", "avena para rollos"],
  },
  {
    id: "rollo-rastrojo",
    nombre: "Rollos de Rastrojo / Chala",
    categoria: "Forrajes",
    unidad: "Rollos",
    stockInicial: 0,
    stockMinimoAlerta: 30,
    ubicacion: "Tinglado de Forrajes",
    valorMovilId: "rollo-rastrojo",
    aliasLabores: ["rollo rastrojo", "rollo chala"],
  },
  {
    id: "balanceado-iniciador",
    nombre: "Balanceado Iniciador Terneros Guachera",
    categoria: "Forrajes",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 600,
    ubicacion: "Depósito Guachera",
    valorMovilId: "balanceado-iniciador",
    aliasLabores: ["balanceado", "iniciador", "balanceado terneros"],
  },
  {
    id: "sal-mineral",
    nombre: "Sal Mineral V.O. (MZM con Levadura)",
    categoria: "Forrajes",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 500,
    ubicacion: "Galpón de Raciones - Tambo",
    valorMovilId: "sal-mineral",
    aliasLabores: ["sal", "sales", "sal mineral", "sales minerales", "mzm", "sal con levadura"],
  },
  {
    id: "sal-anionica",
    nombre: "Sal Aniónica Preparto",
    categoria: "Forrajes",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 300,
    ubicacion: "Galpón de Raciones - Tambo",
    valorMovilId: "sal-anionica",
    aliasLabores: ["sal aniónica", "sales aniónicas", "anionica", "preparto"],
  },

  // 6. COMBUSTIBLES
  {
    id: "gasoil",
    nombre: "Gas oil Agropecuario Grado 2 (DIESEL 500)",
    categoria: "Combustibles",
    unidad: "Lts",
    stockInicial: 0,
    stockMinimoAlerta: 2000,
    ubicacion: "Tanque Surtidor Central 12.000 Lts",
    valorMovilId: "gasoil",
    aliasLabores: ["gas oil", "gasoil", "diesel", "combustible"],
  },
];

// LocalStorage Keys
const STORAGE_INGRESOS_STOCK = "hjb_stock_ingresos_manuales_v01";
export const STORAGE_CANJES_STOCK = "hjb_stock_canjes_afa_v01";

export const HJB_STOCK_SYNC_EVENT = "hjb_stock_sync";

export function notifyStockSync() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(HJB_STOCK_SYNC_EVENT));
  }
}

// =========================================================================
// MÉTODOS DE PERSISTENCIA Y RECUPERACIÓN DE INGRESOS MANUALES
// =========================================================================
export function getIngresosManuales(): IngresoStockManual[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_INGRESOS_STOCK);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveIngresosManuales(ingresos: IngresoStockManual[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_INGRESOS_STOCK, JSON.stringify(ingresos));
}

// =========================================================================
// MÉTODOS DE PERSISTENCIA Y RECUPERACIÓN DE AJUSTES MANUALES DE STOCK
// (Corrección por error de carga, mermas, restas de toneladas)
// =========================================================================
export interface AjusteStockManual {
  id: string;
  insumoId: string;
  fecha: string;
  tipo: "restar" | "sumar" | "fijar";
  cantidadDelta: number; // negativo si resta, positivo si suma (en unidad base)
  cantidadTn?: number;
  stockResultante?: number;
  motivo: string;
  ubicacion?: string;
  tipoLugar?: StockUbicacionBreakdown["tipoLugar"];
  deleted?: boolean;
  createdAt: string;
}

const STORAGE_AJUSTES_STOCK = "hjb_stock_ajustes_manuales_v01";

export function getAjustesStock(): AjusteStockManual[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_AJUSTES_STOCK);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAjustesStock(ajustes: AjusteStockManual[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_AJUSTES_STOCK, JSON.stringify(ajustes));
}

export function registrarAjusteStock(nuevo: Omit<AjusteStockManual, "id" | "createdAt">): AjusteStockManual {
  const all = getAjustesStock();
  const id = `ajuste-${Date.now()}`;
  const item: AjusteStockManual = {
    ...nuevo,
    id,
    createdAt: new Date().toISOString(),
  };
  all.unshift(item);
  saveAjustesStock(all);
  notifyStockSync();

  if (typeof window !== "undefined" && db) {
    setDoc(doc(db, "stock_ajustes", item.id), sanitizeForFirestore(item)).catch((err) => {
      console.error("Error al guardar ajuste de stock en Firestore:", err);
    });
  }

  return item;
}

export function eliminarAjusteStock(id: string): boolean {
  const all = getAjustesStock();
  const filtered = all.filter((x) => x.id !== id);
  saveAjustesStock(filtered);
  notifyStockSync();

  if (typeof window !== "undefined" && db) {
    setDoc(doc(db, "stock_ajustes", id), { deleted: true }, { merge: true }).catch((err) => {
      console.error("Error al marcar ajuste de stock como eliminado en Firestore:", err);
    });
  }

  return true;
}

// =========================================================================
// PARÁMETROS DE DIETA Y CONSUMO DEL RODEO LECHERO EN TAMBO HJB
// (Fuente: Planilla Oficial Costo Alimentación Vacas en Ordeño - HJB)
// =========================================================================
export interface DietaTamboConfig {
  vacasEnOrdeñe: number;
  racionesKgDia: {
    "pellet-soja": number;
    "pellet-trigo": number;
    "silo-maiz": number;
    "maiz": number;
    [key: string]: number;
  };
  ultimaActualizacion?: string;
  actualizadoPor?: string;
}

export const DIETA_TAMBO_HJB_DEFAULT: DietaTamboConfig = {
  vacasEnOrdeñe: 187, // Rodeo lechero promedio en ordeño (~186.5 VO)
  racionesKgDia: {
    "pellet-soja": 2.5, // 2.5 kg/VO/día de Pellet de Soja Proteico (Harina)
    "pellet-trigo": 3.0, // 3.0 kg/VO/día de Pellet de Trigo (Afrechillo)
    "silo-maiz": 22.0, // 22.0 kg/VO/día de Silo de Maíz Picado Fino
    "maiz": 5.5, // 5.5 kg/VO/día de Maíz grano molido
  },
  ultimaActualizacion: "2026-08-18T00:00:00.000Z",
  actualizadoPor: "Planilla Costo Alimentación VO (HJB)",
};

export const STORAGE_DIETA_TAMBO = "hjb_dieta_tambo_config_v01";
export const HJB_DIETA_SYNC_EVENT = "hjb_dieta_sync_event";

export function getDietaTambo(): DietaTamboConfig {
  if (typeof window === "undefined") return { ...DIETA_TAMBO_HJB_DEFAULT };
  try {
    const raw = localStorage.getItem(STORAGE_DIETA_TAMBO);
    if (!raw) return { ...DIETA_TAMBO_HJB_DEFAULT };
    const parsed = JSON.parse(raw);
    return {
      vacasEnOrdeñe: parsed.vacasEnOrdeñe || DIETA_TAMBO_HJB_DEFAULT.vacasEnOrdeñe,
      racionesKgDia: {
        ...DIETA_TAMBO_HJB_DEFAULT.racionesKgDia,
        ...(parsed.racionesKgDia || {}),
      },
      ultimaActualizacion: parsed.ultimaActualizacion,
      actualizadoPor: parsed.actualizadoPor,
    };
  } catch {
    return { ...DIETA_TAMBO_HJB_DEFAULT };
  }
}

export function saveDietaTambo(nueva: Partial<DietaTamboConfig>): DietaTamboConfig {
  if (typeof window === "undefined") return { ...DIETA_TAMBO_HJB_DEFAULT };
  const current = getDietaTambo();
  const updated: DietaTamboConfig = {
    vacasEnOrdeñe: nueva.vacasEnOrdeñe !== undefined ? Math.max(1, nueva.vacasEnOrdeñe) : current.vacasEnOrdeñe,
    racionesKgDia: {
      ...current.racionesKgDia,
      ...(nueva.racionesKgDia || {}),
    },
    ultimaActualizacion: new Date().toISOString(),
    actualizadoPor: nueva.actualizadoPor || "Usuario HJB",
  };

  localStorage.setItem(STORAGE_DIETA_TAMBO, JSON.stringify(updated));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(HJB_DIETA_SYNC_EVENT, { detail: updated }));
    notifyStockSync();
  }

  if (typeof window !== "undefined" && db) {
    setDoc(doc(db, "tambo_config", "dieta_actual"), sanitizeForFirestore(updated), { merge: true }).catch((err) => {
      console.warn("Error guardando dieta de tambo en Firestore:", err);
    });
  }

  return updated;
}

export function calcularAutonomiaPelletTambo(
  kgPellet: number,
  pelletInsumoId: string = "pellet-soja",
  vacasOrdeñe?: number,
  kgPorVacaDia?: number
) {
  const dietaActual = getDietaTambo();
  const vacas = vacasOrdeñe !== undefined && vacasOrdeñe > 0 ? vacasOrdeñe : dietaActual.vacasEnOrdeñe;
  const racion = kgPorVacaDia !== undefined && kgPorVacaDia > 0
    ? kgPorVacaDia
    : (dietaActual.racionesKgDia[pelletInsumoId as keyof typeof dietaActual.racionesKgDia] ?? 2.5);

  const consumoDiarioTotalKg = Math.round(vacas * racion * 10) / 10;
  const diasAutonomia = consumoDiarioTotalKg > 0 ? Math.floor(kgPellet / consumoDiarioTotalKg) : 0;
  const mesesAutonomia = Number((diasAutonomia / 30).toFixed(1));

  return {
    vacasOrdeñe: vacas,
    racionKgVacaDia: racion,
    consumoDiarioTotalKg,
    diasAutonomia,
    mesesAutonomia,
    ultimaActualizacion: dietaActual.ultimaActualizacion,
    actualizadoPor: dietaActual.actualizadoPor,
  };
}

// =========================================================================
// MÉTODOS DE PERSISTENCIA Y RECUPERACIÓN DE CANJES DE GRANO A PELLET (AFA)
// =========================================================================
export function getCanjesGranoPellet(): CanjeGranoPellet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_CANJES_STOCK);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCanjesGranoPellet(canjes: CanjeGranoPellet[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_CANJES_STOCK, JSON.stringify(canjes));
}

export function registrarCanjeGranoPellet(nuevo: Omit<CanjeGranoPellet, "id" | "createdAt">): CanjeGranoPellet {
  const all = getCanjesGranoPellet();
  const id = `canje-${Date.now()}`;
  const item: CanjeGranoPellet = {
    ...nuevo,
    id,
    createdAt: new Date().toISOString(),
  };
  all.unshift(item);
  saveCanjesGranoPellet(all);
  notifyStockSync();

  if (typeof window !== "undefined" && db) {
    setDoc(doc(db, "stock_canjes", item.id), sanitizeForFirestore(item)).catch((err) => {
      console.error("Error al guardar canje de stock en Firestore:", err);
    });
  }

  return item;
}

export function eliminarCanjeGranoPellet(id: string) {
  const all = getCanjesGranoPellet();
  const filtered = all.filter((c) => c.id !== id);
  saveCanjesGranoPellet(filtered);
  notifyStockSync();

  if (typeof window !== "undefined" && db) {
    setDoc(doc(db, "stock_canjes", id), { deleted: true }, { merge: true }).catch((err) => {
      console.error("Error al eliminar canje de stock en Firestore:", err);
    });
  }
}

let isStockFirestoreSyncInitialized = false;

export function initStockFirestoreSync() {
  if (typeof window === "undefined" || isStockFirestoreSyncInitialized || !db) return;
  isStockFirestoreSyncInitialized = true;

  try {
    // 1. Sincronización de ingresos manuales
    const colIngresos = collection(db, "stock_ingresos");
    onSnapshot(
      colIngresos,
      (snapshot) => {
        if (!snapshot.empty) {
          const remote: IngresoStockManual[] = [];
          snapshot.forEach((d) => {
            const val = d.data() as any;
            if (!val.deleted) {
              remote.push(val as IngresoStockManual);
            }
          });
          remote.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
          saveIngresosManuales(remote);
          notifyStockSync();
        }
      },
      (error) => {
        console.warn("Firestore sync stock ingresos error:", error);
      }
    );

    // 2. Sincronización de canjes de grano a pellet en AFA
    const colCanjes = collection(db, "stock_canjes");
    onSnapshot(
      colCanjes,
      (snapshot) => {
        if (!snapshot.empty) {
          const remote: CanjeGranoPellet[] = [];
          snapshot.forEach((d) => {
            const val = d.data() as any;
            if (!val.deleted) {
              remote.push(val as CanjeGranoPellet);
            }
          });
          remote.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
          saveCanjesGranoPellet(remote);
          notifyStockSync();
        }
      },
      (error) => {
        console.warn("Firestore sync stock canjes error:", error);
      }
    );

    // 3. Sincronización de Dieta y Consumo de Tambo
    const docDieta = doc(db, "tambo_config", "dieta_actual");
    onSnapshot(
      docDieta,
      (snapshot) => {
        if (snapshot.exists()) {
          const remote = snapshot.data() as DietaTamboConfig;
          if (remote && typeof window !== "undefined") {
            localStorage.setItem(STORAGE_DIETA_TAMBO, JSON.stringify(remote));
            window.dispatchEvent(new CustomEvent(HJB_DIETA_SYNC_EVENT, { detail: remote }));
            notifyStockSync();
          }
        }
      },
      (error) => {
        console.warn("Firestore sync dieta tambo error:", error);
      }
    );

    // 4. Sincronización de ajustes manuales de stock
    const colAjustes = collection(db, "stock_ajustes");
    onSnapshot(
      colAjustes,
      (snapshot) => {
        if (!snapshot.empty) {
          const remote: AjusteStockManual[] = [];
          snapshot.forEach((d) => {
            const val = d.data() as any;
            if (!val.deleted) {
              remote.push(val as AjusteStockManual);
            }
          });
          remote.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
          saveAjustesStock(remote);
          notifyStockSync();
        }
      },
      (error) => {
        console.warn("Firestore sync stock ajustes error:", error);
      }
    );
  } catch (err) {
    console.warn("Stock Firestore init error:", err);
  }
}

if (typeof window !== "undefined") {
  setTimeout(() => {
    initStockFirestoreSync();
  }, 100);
}

export function registrarIngresoStock(nuevo: Omit<IngresoStockManual, "id">): IngresoStockManual {
  const all = getIngresosManuales();
  const id = `ingreso-${Date.now()}`;
  const item: IngresoStockManual = { ...nuevo, id };
  all.unshift(item);
  saveIngresosManuales(all);
  notifyStockSync();

  if (typeof window !== "undefined" && db) {
    setDoc(doc(db, "stock_ingresos", item.id), sanitizeForFirestore(item)).catch((err) => {
      console.error("Error al guardar ingreso de stock en Firestore:", err);
    });
  }

  return item;
}

export function actualizarIngresoStock(id: string, cambios: Partial<IngresoStockManual>): IngresoStockManual | null {
  const all = getIngresosManuales();
  const idx = all.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  const updated = { ...all[idx], ...cambios };
  all[idx] = updated;
  saveIngresosManuales(all);
  notifyStockSync();

  if (typeof window !== "undefined" && db) {
    setDoc(doc(db, "stock_ingresos", id), sanitizeForFirestore(updated), { merge: true }).catch((err) => {
      console.error("Error al actualizar ingreso de stock en Firestore:", err);
    });
  }

  return updated;
}

export function eliminarIngresoStock(id: string): boolean {
  const all = getIngresosManuales();
  const filtered = all.filter((x) => x.id !== id);
  saveIngresosManuales(filtered);
  notifyStockSync();

  if (typeof window !== "undefined" && db) {
    setDoc(doc(db, "stock_ingresos", id), { deleted: true }, { merge: true }).catch((err) => {
      console.error("Error al marcar ingreso como eliminado en Firestore:", err);
    });
  }

  return true;
}

export function reasignarAcopioGrano(
  ingresoId: string,
  nuevaUbicacion: string,
  tipoLugar?: StockUbicacionBreakdown["tipoLugar"]
): IngresoStockManual | null {
  let tipo: StockUbicacionBreakdown["tipoLugar"] = tipoLugar || "silo";
  if (/afa|cardos/i.test(nuevaUbicacion)) tipo = "afa";
  else if (/puerto/i.test(nuevaUbicacion)) tipo = "puerto";
  else if (/coop/i.test(nuevaUbicacion)) tipo = "cooperativa";
  else if (/tambo/i.test(nuevaUbicacion)) tipo = "tambo";
  else if (/silo/i.test(nuevaUbicacion)) tipo = "silo";

  return actualizarIngresoStock(ingresoId, { ubicacion: nuevaUbicacion, tipoLugar: tipo });
}

// =========================================================================
// FUNCIÓN PRINCIPAL: CÁLCULO DE STOCK DISPONIBLE Y CRUCE CON LABORES Y VALORES MÓVILES
// =========================================================================
export function getStockActualInsumos(): {
  items: InsumoStockItem[];
  movimientos: MovimientoStockItem[];
  valorTotalGeneralArs: number;
  valorTotalGeneralUsd: number;
  totalInsumos: number;
  insumosEnAlerta: number;
} {
  const activities: Activity[] = agricultureData.listActivities();
  const ingresosManuales = getIngresosManuales();
  const ajustesManuales = getAjustesStock();
  const dolarBNA = getDolarBnaVenta();

  const movimientos: MovimientoStockItem[] = [];

  // Mapa de consumos agrícolas por insumoId
  const consumosMap = new Map<string, number>();

  // 1. Descontar consumos reales de labores agrícolas
  for (const act of activities) {
    // Descontamos labores que hayan sido "Realizada"
    if (act.estado === "Realizada" && act.insumos && act.insumos.length > 0) {
      const supHa = act.superficieReal || act.superficiePlanificada || 0;
      for (const input of act.insumos) {
        const prodName = input.producto.toLowerCase().trim();
        // Buscar el insumo en el catálogo
        const matched = INSUMOS_BASE_CATALOGO.find((cat) => {
          if (cat.id === prodName) return true;
          if (cat.nombre.toLowerCase().includes(prodName) || prodName.includes(cat.nombre.toLowerCase())) return true;
          return cat.aliasLabores.some((alias) => prodName.includes(alias) || alias.includes(prodName));
        });

        if (matched) {
          // Calcular cantidad aplicada
          let cantidadAplicada = realQuantity(act, input);
          if (!cantidadAplicada && input.cantidadTotal) {
            cantidadAplicada = input.cantidadTotal;
          }
          if (!cantidadAplicada && (input.dosisReal || input.dosisPlanificada) && supHa > 0) {
            cantidadAplicada = (input.dosisReal || input.dosisPlanificada || 0) * supHa;
          }
          if (cantidadAplicada && cantidadAplicada > 0) {
            cantidadAplicada = Math.round(cantidadAplicada * 10) / 10;
            const current = consumosMap.get(matched.id) || 0;
            consumosMap.set(matched.id, current + cantidadAplicada);

            movimientos.push({
              id: `mov-agri-${act.id}-${input.id}`,
              insumoId: matched.id,
              insumoNombre: matched.nombre,
              fecha: act.fechaReal || act.fechaPlanificada,
              tipo: "Consumo Agrícola",
              cantidad: -cantidadAplicada,
              unidad: matched.unidad,
              detalle: `Labor "${act.tipo}" en ${act.campo} ${act.lote ? `(${act.lote})` : ""} · ${supHa} ha`,
            });
          }
        }
      }
    }
  }

  // Estructura para registrar desglose por ubicación
  type UbicacionEntry = {
    lugar: string;
    tipoLugar: StockUbicacionBreakdown["tipoLugar"];
    icono: string;
    cantidad: number;
    detalles: StockUbicacionMovimiento[];
  };

  const ubicacionesMap = new Map<string, Map<string, UbicacionEntry>>();

  function addUbicacionStock(
    insumoId: string,
    lugar: string,
    tipoLugar: StockUbicacionBreakdown["tipoLugar"],
    icono: string,
    cantidad: number,
    mov: StockUbicacionMovimiento
  ) {
    if (!ubicacionesMap.has(insumoId)) {
      ubicacionesMap.set(insumoId, new Map());
    }
    const inner = ubicacionesMap.get(insumoId)!;
    if (!inner.has(lugar)) {
      inner.set(lugar, {
        lugar,
        tipoLugar,
        icono,
        cantidad: 0,
        detalles: [],
      });
    }
    const entry = inner.get(lugar)!;
    entry.cantidad += cantidad;
    entry.detalles.unshift(mov);
  }

  // 2. Sumar ingresos manuales / compras registradas
  const ingresosMap = new Map<string, number>();
  for (const ing of ingresosManuales) {
    const current = ingresosMap.get(ing.insumoId) || 0;
    ingresosMap.set(ing.insumoId, current + ing.cantidad);

    const catItem = INSUMOS_BASE_CATALOGO.find((x) => x.id === ing.insumoId);
    const isCerealOGrano =
      (catItem?.categoria === "Granos" || catItem?.categoria === "Forrajes & Granos") &&
      (catItem?.id.includes("grano") || catItem?.id === "silo-maiz");
    const isRollo = catItem?.id.includes("rollo");

    let lugar = ing.ubicacion;
    let tipoLugar: StockUbicacionBreakdown["tipoLugar"] = ing.tipoLugar || "otro";
    let icono = "📦";

    if (isCerealOGrano) {
      if (!lugar) {
        const txt = `${ing.remitoProveedor} ${ing.observaciones || ""}`.toLowerCase();
        if (/afa|cardos/i.test(txt)) {
          lugar = "AFA Los Cardos";
        } else if (/puerto/i.test(txt)) {
          lugar = "Puerto (San Lorenzo)";
        } else if (/coop/i.test(txt)) {
          lugar = "Cooperativa";
        } else if (/silo/i.test(txt)) {
          lugar = "Silos";
        } else {
          // Si no se especificó ubicación de acopio de grano, por defecto asignar a AFA Los Cardos
          lugar = "AFA Los Cardos";
        }
      }

      if (/afa|cardos/i.test(lugar)) { tipoLugar = "afa"; icono = "🌾"; }
      else if (/puerto/i.test(lugar)) { tipoLugar = "puerto"; icono = "🚢"; }
      else if (/coop/i.test(lugar)) { tipoLugar = "cooperativa"; icono = "🏬"; }
      else if (/tambo/i.test(lugar)) { tipoLugar = "tambo"; icono = "🥛"; }
      else { tipoLugar = "silo"; icono = "🏢"; }
    } else if (isRollo) {
      if (!lugar) {
        lugar = "Campo Keuneke";
        tipoLugar = "campo";
        icono = "🏠";
      } else {
        if (/tambo/i.test(lugar)) { tipoLugar = "tambo"; icono = "🥛"; }
        else { tipoLugar = "campo"; icono = "🏠"; }
      }
    } else if (catItem?.id.includes("pellet")) {
      lugar = lugar || "Tambo";
      tipoLugar = "tambo";
      icono = "🥛";
    } else {
      lugar = lugar || catItem?.ubicacion || "Depósito Central";
      tipoLugar = "galpon";
      icono = "🏢";
    }

    const cantTn = isCerealOGrano ? Number((ing.cantidad / 1000).toFixed(2)) : undefined;

    // Acreditar en desglose por ubicación
    addUbicacionStock(
      ing.insumoId,
      lugar,
      tipoLugar,
      icono,
      ing.cantidad,
      {
        id: `ing-${ing.id}`,
        fecha: ing.fecha,
        tipo: "Ingreso / Compra",
        campo: lugar,
        cantidad: ing.cantidad,
        cantidadTn: cantTn,
        unidad: isCerealOGrano ? "kg" : (catItem?.unidad || "unidades"),
        referencia: `${lugar} · Ingreso`,
        detalle: `Ingreso de ${isCerealOGrano ? `${cantTn} Tn` : `${ing.cantidad} ${catItem?.unidad || ""}`} · Acopio/Ubicación: ${lugar}${ing.remitoProveedor ? ` · Rem: ${ing.remitoProveedor}` : ""}`,
      }
    );

    movimientos.push({
      id: ing.id,
      insumoId: ing.insumoId,
      insumoNombre: catItem?.nombre || ing.insumoId,
      fecha: ing.fecha,
      tipo: "Ingreso / Compra",
      cantidad: ing.cantidad,
      cantidadTn: cantTn,
      unidad: catItem?.unidad || "unidades",
      ubicacion: lugar,
      referencia: lugar,
      detalle: `Ingreso de Stock · Acopio/Ubicación: ${lugar} · ${ing.remitoProveedor} ${ing.observaciones ? `(${ing.observaciones})` : ""}`,
      remitoProveedor: ing.remitoProveedor,
      costoArs: ing.costoUnitarioArs ? ing.costoUnitarioArs * ing.cantidad : undefined,
    });
  }

  // 2.1. Sumar o restar ajustes manuales de stock (corrección de errores, restas de toneladas, mermas)
  const ajustesMap = new Map<string, number>();
  for (const aj of ajustesManuales) {
    if (aj.deleted) continue;
    const current = ajustesMap.get(aj.insumoId) || 0;
    ajustesMap.set(aj.insumoId, current + aj.cantidadDelta);

    const catItem = INSUMOS_BASE_CATALOGO.find((x) => x.id === aj.insumoId);
    const isCerealOGrano =
      (catItem?.categoria === "Granos" || catItem?.categoria === "Forrajes & Granos") &&
      (catItem?.id.includes("grano") || catItem?.id === "silo-maiz");

    let lugar = aj.ubicacion || (isCerealOGrano ? "AFA Los Cardos" : catItem?.ubicacion || "Depósito Central");
    let tipoLugar: StockUbicacionBreakdown["tipoLugar"] = aj.tipoLugar || "otro";
    let icono = "⚖️";

    if (/afa|cardos/i.test(lugar)) { tipoLugar = "afa"; icono = "🌾"; }
    else if (/puerto/i.test(lugar)) { tipoLugar = "puerto"; icono = "🚢"; }
    else if (/coop/i.test(lugar)) { tipoLugar = "cooperativa"; icono = "🏬"; }
    else if (/tambo/i.test(lugar)) { tipoLugar = "tambo"; icono = "🥛"; }
    else if (/silo/i.test(lugar)) { tipoLugar = "silo"; icono = "🏢"; }

    const cantTn = isCerealOGrano ? Number((aj.cantidadDelta / 1000).toFixed(2)) : undefined;

    addUbicacionStock(
      aj.insumoId,
      lugar,
      tipoLugar,
      icono,
      aj.cantidadDelta,
      {
        id: `aj-${aj.id}`,
        fecha: aj.fecha,
        tipo: "Ajuste de Inventario",
        campo: lugar,
        cantidad: aj.cantidadDelta,
        cantidadTn: cantTn,
        unidad: isCerealOGrano ? "kg" : (catItem?.unidad || "unidades"),
        referencia: `${lugar} · Ajuste`,
        detalle: `Ajuste manual: ${aj.cantidadDelta > 0 ? `+${aj.cantidadDelta}` : aj.cantidadDelta} ${catItem?.unidad || "kg"}${cantTn !== undefined ? ` (${cantTn > 0 ? `+${cantTn}` : cantTn} Tn)` : ""} · Motivo: ${aj.motivo}`,
      }
    );

    movimientos.push({
      id: aj.id,
      insumoId: aj.insumoId,
      insumoNombre: catItem?.nombre || aj.insumoId,
      fecha: aj.fecha,
      tipo: "Ajuste de Inventario",
      cantidad: aj.cantidadDelta,
      cantidadTn: cantTn,
      unidad: catItem?.unidad || "unidades",
      ubicacion: lugar,
      referencia: lugar,
      detalle: `Ajuste de inventario · ${aj.motivo}${aj.stockResultante !== undefined ? ` · Stock resultante: ${aj.stockResultante}` : ""}`,
    });
  }

  // 3. Sumar producción propia de labores agrícolas realizadas (Cosechas de Cereales, Armado y Sacado de Rollos)
  const produccionMap = new Map<string, number>();
  for (const act of activities) {
    if (act.estado === "Realizada" && act.produccion) {
      const supHa = act.superficieReal || act.superficiePlanificada || 0;
      const fecha = act.fechaReal || act.fechaPlanificada;
      const tipoLabor = (act.tipo || "").toLowerCase();
      const cultivo = (act.cultivo || "").toLowerCase();
      const campoOrigen = act.campo || "Keuneke";

      const isSacado =
        tipoLabor.includes("sacado") ||
        (tipoLabor.includes("rollo") &&
          (tipoLabor.includes("retiro") || tipoLabor.includes("traslado") || tipoLabor.includes("extracc")));
      const isRollos =
        isSacado ||
        tipoLabor.includes("rollo") ||
        tipoLabor.includes("armado") ||
        tipoLabor.includes("confecci") ||
        tipoLabor.includes("enrollad") ||
        act.produccion.unidad?.toLowerCase().includes("rollo") ||
        act.produccion.destino === "Rollos";

      // -------------------------------------------------------------
      // 3.1. CICLO DE HENIFICACIÓN (ROLLOS)
      // -------------------------------------------------------------
      if (isRollos) {
        // Verificar si ya hubo una labor de "Armado de rollos" previa
        const hasPreviousArmado = isSacado && activities.some(
          (other) =>
            other.id !== act.id &&
            other.estado === "Realizada" &&
            other.campo.toLowerCase() === act.campo.toLowerCase() &&
            (other.lote || "").toLowerCase() === (act.lote || "").toLowerCase() &&
            other.campana === act.campana &&
            !other.tipo.toLowerCase().includes("sacado") &&
            !other.tipo.toLowerCase().includes("volteo") &&
            !other.tipo.toLowerCase().includes("rastrill") &&
            (other.tipo.toLowerCase().includes("armado") ||
              other.tipo.toLowerCase().includes("confecci") ||
              other.tipo.toLowerCase().includes("enrollad") ||
              other.tipo.toLowerCase() === "rollos" ||
              (other.tipo.toLowerCase().includes("rollo") && !other.tipo.toLowerCase().includes("sacado"))) &&
            Boolean(other.produccion && (other.produccion.cantidad || other.produccion.rollosDesglose))
        );

        // Determinar ubicación física del acopio de rollos (ej: Campo Keuneke vs Tambo)
        let ubicacionRollo = "Campo Keuneke";
        let tipoLugarRollo: StockUbicacionBreakdown["tipoLugar"] = "campo";
        let iconoRollo = "🏠";

        const destLower = (act.produccion.destino || "").toLowerCase();
        const destUbic = (act.produccion.ubicacionRollos || "").toLowerCase();

        if (destUbic.includes("tambo") || destLower.includes("tambo")) {
          ubicacionRollo = "Tambo";
          tipoLugarRollo = "tambo";
          iconoRollo = "🥛";
        } else if (destUbic.includes("keuneke") || destLower.includes("keuneke") || campoOrigen.toLowerCase() === "keuneke") {
          ubicacionRollo = "Campo Keuneke";
          tipoLugarRollo = "campo";
          iconoRollo = "🏠";
        } else {
          ubicacionRollo = `Campo ${campoOrigen}`;
          tipoLugarRollo = "campo";
          iconoRollo = "🏠";
        }

        const destinoLabel = act.produccion.destino ? ` → Destino: ${act.produccion.destino}` : "";
        const movTipo = isSacado ? (hasPreviousArmado ? "Traslado / Destino" : "Producción Propia") : "Producción Propia";

        // A. Desglose específico por especie de rollo
        if (act.produccion.rollosDesglose) {
          const { alfalfa, avena, rastrojo } = act.produccion.rollosDesglose;
          if (alfalfa && alfalfa > 0) {
            if (!hasPreviousArmado) {
              const curr = produccionMap.get("rollo-alfalfa") || 0;
              produccionMap.set("rollo-alfalfa", curr + alfalfa);
            }
            addUbicacionStock("rollo-alfalfa", ubicacionRollo, tipoLugarRollo, iconoRollo, alfalfa, {
              id: `roll-alf-${act.id}`,
              fecha,
              tipo: isSacado ? "Sacado de rollos" : "Armado de rollos",
              campo: act.campo,
              lote: act.lote,
              cantidad: alfalfa,
              unidad: "Rollos",
              referencia: `${ubicacionRollo} · ${act.campo} (${act.lote || "Lote"})`,
              detalle: `${isSacado ? "Sacado" : "Confección"} de ${alfalfa} rollos de alfalfa · Ubicación: ${ubicacionRollo}`,
            });
            movimientos.push({
              id: `mov-prod-alfalfa-${act.id}`,
              insumoId: "rollo-alfalfa",
              insumoNombre: "Rollos de Alfalfa Primera Henificada",
              fecha,
              tipo: movTipo,
              cantidad: alfalfa,
              unidad: "Rollos",
              ubicacion: ubicacionRollo,
              detalle: `${isSacado ? "Sacado" : "Confección"} de ${alfalfa} rollos de alfalfa en ${act.campo} ${act.lote ? `(${act.lote})` : ""} · Ubicación: ${ubicacionRollo}${destinoLabel}`,
            });
          }
          if (avena && avena > 0) {
            if (!hasPreviousArmado) {
              const curr = produccionMap.get("rollo-avena") || 0;
              produccionMap.set("rollo-avena", curr + avena);
            }
            addUbicacionStock("rollo-avena", ubicacionRollo, tipoLugarRollo, iconoRollo, avena, {
              id: `roll-av-${act.id}`,
              fecha,
              tipo: isSacado ? "Sacado de rollos" : "Armado de rollos",
              campo: act.campo,
              lote: act.lote,
              cantidad: avena,
              unidad: "Rollos",
              referencia: `${ubicacionRollo} · ${act.campo} (${act.lote || "Lote"})`,
              detalle: `${isSacado ? "Sacado" : "Confección"} de ${avena} rollos de avena · Ubicación: ${ubicacionRollo}`,
            });
            movimientos.push({
              id: `mov-prod-avena-${act.id}`,
              insumoId: "rollo-avena",
              insumoNombre: "Rollos de Avena Henificada",
              fecha,
              tipo: movTipo,
              cantidad: avena,
              unidad: "Rollos",
              ubicacion: ubicacionRollo,
              detalle: `${isSacado ? "Sacado" : "Confección"} de ${avena} rollos de avena en ${act.campo} ${act.lote ? `(${act.lote})` : ""} · Ubicación: ${ubicacionRollo}${destinoLabel}`,
            });
          }
          if (rastrojo && rastrojo > 0) {
            if (!hasPreviousArmado) {
              const curr = produccionMap.get("rollo-rastrojo") || 0;
              produccionMap.set("rollo-rastrojo", curr + rastrojo);
            }
            addUbicacionStock("rollo-rastrojo", ubicacionRollo, tipoLugarRollo, iconoRollo, rastrojo, {
              id: `roll-rast-${act.id}`,
              fecha,
              tipo: isSacado ? "Sacado de rollos" : "Armado de rollos",
              campo: act.campo,
              lote: act.lote,
              cantidad: rastrojo,
              unidad: "Rollos",
              referencia: `${ubicacionRollo} · ${act.campo} (${act.lote || "Lote"})`,
              detalle: `${isSacado ? "Sacado" : "Confección"} de ${rastrojo} rollos de rastrojo · Ubicación: ${ubicacionRollo}`,
            });
            movimientos.push({
              id: `mov-prod-rastrojo-${act.id}`,
              insumoId: "rollo-rastrojo",
              insumoNombre: "Rollos de Rastrojo / Chala",
              fecha,
              tipo: movTipo,
              cantidad: rastrojo,
              unidad: "Rollos",
              ubicacion: ubicacionRollo,
              detalle: `${isSacado ? "Sacado" : "Confección"} de ${rastrojo} rollos de rastrojo en ${act.campo} ${act.lote ? `(${act.lote})` : ""} · Ubicación: ${ubicacionRollo}${destinoLabel}`,
            });
          }
        } else {
          // B. Cantidad total directa
          let cant = act.produccion.cantidad;
          if (!cant && act.produccion.rendimiento && supHa > 0) {
            cant = Math.round(act.produccion.rendimiento * supHa);
          }
          if (cant && cant > 0) {
            let targetInsumoId = "rollo-alfalfa";
            let targetInsumoNombre = "Rollos de Alfalfa Primera Henificada";
            if (cultivo.includes("avena")) {
              targetInsumoId = "rollo-avena";
              targetInsumoNombre = "Rollos de Avena Henificada";
            } else if (cultivo.includes("rastrojo") || cultivo.includes("chala") || cultivo.includes("maiz")) {
              targetInsumoId = "rollo-rastrojo";
              targetInsumoNombre = "Rollos de Rastrojo / Chala";
            }
            if (!hasPreviousArmado) {
              const curr = produccionMap.get(targetInsumoId) || 0;
              produccionMap.set(targetInsumoId, curr + cant);
            }
            addUbicacionStock(targetInsumoId, ubicacionRollo, tipoLugarRollo, iconoRollo, cant, {
              id: `roll-gen-${act.id}`,
              fecha,
              tipo: isSacado ? "Sacado de rollos" : "Armado de rollos",
              campo: act.campo,
              lote: act.lote,
              cantidad: cant,
              unidad: "Rollos",
              referencia: `${ubicacionRollo} · ${act.campo} (${act.lote || "Lote"})`,
              detalle: `${isSacado ? "Sacado" : "Confección"} de ${cant} rollos · Ubicación: ${ubicacionRollo}`,
            });
            movimientos.push({
              id: `mov-prod-gen-${act.id}`,
              insumoId: targetInsumoId,
              insumoNombre: targetInsumoNombre,
              fecha,
              tipo: movTipo,
              cantidad: cant,
              unidad: "Rollos",
              ubicacion: ubicacionRollo,
              detalle: `${isSacado ? "Sacado" : "Confección"} de ${cant} rollos (${act.cultivo || "Forraje"}) en ${act.campo} ${act.lote ? `(${act.lote})` : ""} · Ubicación: ${ubicacionRollo}${destinoLabel}`,
            });
          }
        }
      }

      // -------------------------------------------------------------
      // 3.2. COSECHA DE GRANOS / CEREALES Y ACOPIO
      // -------------------------------------------------------------
      const isCosecha =
        !isRollos &&
        (tipoLabor.includes("cosecha") ||
          tipoLabor.includes("trilla") ||
          (act.produccion &&
            (cultivo.includes("soja") ||
              cultivo.includes("maiz") ||
              cultivo.includes("maíz") ||
              cultivo.includes("trigo") ||
              cultivo.includes("sorgo") ||
              cultivo.includes("girasol"))));

      if (isCosecha && act.produccion) {
        const prod = act.produccion;
        let targetInsumoId = "maiz-grano";
        let targetInsumoNombre = "Maíz Grano Comercial";

        if (cultivo.includes("soja")) {
          targetInsumoId = "soja-grano";
          targetInsumoNombre = "Soja Grano Comercial";
        } else if (cultivo.includes("trigo")) {
          targetInsumoId = "trigo-grano";
          targetInsumoNombre = "Trigo Grano Comercial";
        } else if (tipoLabor.includes("picado") || prod.destino === "Silo" || prod.unidad?.toLowerCase().includes("metro")) {
          targetInsumoId = "silo-maiz";
          targetInsumoNombre = "Silo de Maíz Picado Fino (Bolsa)";
        } else {
          targetInsumoId = "maiz-grano";
          targetInsumoNombre = "Maíz Grano Comercial";
        }

        // Calcular volumen en kg y en Toneladas (Tn)
        let cantKg = 0;
        let cantTn = 0;
        const unidadProd = (prod.unidad || "kg").toLowerCase();
        const unidadRend = (prod.unidadRendimiento || "qq/ha").toLowerCase();

        if (prod.cantidad && prod.cantidad > 0) {
          if (unidadProd.includes("tn") || unidadProd === "t" || unidadProd.includes("tonelad")) {
            cantTn = prod.cantidad;
            cantKg = cantTn * 1000;
          } else if (unidadProd.includes("qq")) {
            cantKg = prod.cantidad * 100;
            cantTn = prod.cantidad / 10;
          } else {
            cantKg = prod.cantidad;
            cantTn = cantKg / 1000;
          }
        } else if (prod.rendimiento && prod.rendimiento > 0 && supHa > 0) {
          if (unidadRend.includes("qq")) {
            cantKg = prod.rendimiento * supHa * 100;
            cantTn = (prod.rendimiento * supHa) / 10;
          } else if (unidadRend.includes("tn") || unidadRend.includes("t/")) {
            cantTn = prod.rendimiento * supHa;
            cantKg = cantTn * 1000;
          } else {
            cantKg = prod.rendimiento * supHa;
            cantTn = cantKg / 1000;
          }
        }

        cantKg = Math.round(cantKg * 10) / 10;
        cantTn = Math.round(cantTn * 100) / 100;

        if (cantKg > 0) {
          const curr = produccionMap.get(targetInsumoId) || 0;
          produccionMap.set(targetInsumoId, curr + cantKg);

          // Determinar ubicación oficial de acopio del cereal (Silos, Cooperativa, Puerto, AFA Los Cardos)
          let lugarAcopio = "Silos";
          let tipoLugar: StockUbicacionBreakdown["tipoLugar"] = "silo";
          let icono = "🏢";

          const destCereal = prod.destinoCereal || "";
          const destGen = prod.destino || "";

          if (destCereal === "AFA Los Cardos" || /afa|cardos/i.test(destGen) || /afa|cardos/i.test(destCereal)) {
            lugarAcopio = "AFA Los Cardos";
            tipoLugar = "afa";
            icono = "🌾";
          } else if (destCereal === "Puerto" || /puerto/i.test(destGen) || /puerto/i.test(destCereal)) {
            const pName = prod.puertoNombre ? prod.puertoNombre.trim() : "San Lorenzo";
            lugarAcopio = `Puerto (${pName})`;
            tipoLugar = "puerto";
            icono = "🚢";
          } else if (destCereal === "Cooperativa" || /coop/i.test(destGen) || /coop/i.test(destCereal)) {
            lugarAcopio = "Cooperativa";
            tipoLugar = "cooperativa";
            icono = "🏬";
          } else if (destCereal === "Silos" || /silo/i.test(destGen) || /silo/i.test(destCereal)) {
            lugarAcopio = "Silos";
            tipoLugar = "silo";
            icono = "🏢";
          } else if (prod.lugarAcopio) {
            lugarAcopio = prod.lugarAcopio;
            if (/afa|cardos/i.test(lugarAcopio)) { tipoLugar = "afa"; icono = "🌾"; }
            else if (/puerto/i.test(lugarAcopio)) { tipoLugar = "puerto"; icono = "🚢"; }
            else if (/coop/i.test(lugarAcopio)) { tipoLugar = "cooperativa"; icono = "🏬"; }
            else { tipoLugar = "silo"; icono = "🏢"; }
          }

          // Soporte para distribución de camiones dividida
          const dist = prod.distribucionAcopio;
          const hasDist = dist && (
            (dist.silos && dist.silos > 0) ||
            (dist.cooperativa && dist.cooperativa > 0) ||
            (dist.puerto && dist.puerto > 0) ||
            (dist.afaLosCardos && dist.afaLosCardos > 0)
          );

          if (hasDist && dist) {
            if (dist.silos && dist.silos > 0) {
              addUbicacionStock(targetInsumoId, "Silos", "silo", "🏢", dist.silos * 1000, {
                id: `sub-${act.id}-silos`,
                fecha,
                tipo: "Cosecha",
                campo: act.campo,
                lote: act.lote,
                cantidad: dist.silos * 1000,
                cantidadTn: dist.silos,
                unidad: "kg",
                referencia: `Acopio Silos · ${act.campo} (${act.lote || "Lote"})`,
                detalle: `Cosecha de ${act.cultivo} · ${dist.silos} Tn acopiadas en Silos`,
              });
            }
            if (dist.cooperativa && dist.cooperativa > 0) {
              addUbicacionStock(targetInsumoId, "Cooperativa", "cooperativa", "🏬", dist.cooperativa * 1000, {
                id: `sub-${act.id}-coop`,
                fecha,
                tipo: "Cosecha",
                campo: act.campo,
                lote: act.lote,
                cantidad: dist.cooperativa * 1000,
                cantidadTn: dist.cooperativa,
                unidad: "kg",
                referencia: `Acopio Cooperativa · ${act.campo} (${act.lote || "Lote"})`,
                detalle: `Cosecha de ${act.cultivo} · ${dist.cooperativa} Tn remitidas a Cooperativa`,
              });
            }
            if (dist.puerto && dist.puerto > 0) {
              const pName = dist.puertoNombre || prod.puertoNombre || "San Lorenzo";
              const pLug = `Puerto (${pName})`;
              addUbicacionStock(targetInsumoId, pLug, "puerto", "🚢", dist.puerto * 1000, {
                id: `sub-${act.id}-puerto`,
                fecha,
                tipo: "Cosecha",
                campo: act.campo,
                lote: act.lote,
                cantidad: dist.puerto * 1000,
                cantidadTn: dist.puerto,
                unidad: "kg",
                referencia: `Acopio ${pLug} · ${act.campo} (${act.lote || "Lote"})`,
                detalle: `Cosecha de ${act.cultivo} · ${dist.puerto} Tn remitidas a ${pLug}`,
              });
            }
            if (dist.afaLosCardos && dist.afaLosCardos > 0) {
              addUbicacionStock(targetInsumoId, "AFA Los Cardos", "afa", "🌾", dist.afaLosCardos * 1000, {
                id: `sub-${act.id}-afa`,
                fecha,
                tipo: "Cosecha",
                campo: act.campo,
                lote: act.lote,
                cantidad: dist.afaLosCardos * 1000,
                cantidadTn: dist.afaLosCardos,
                unidad: "kg",
                referencia: `Acopio AFA Los Cardos · ${act.campo} (${act.lote || "Lote"})`,
                detalle: `Cosecha de ${act.cultivo} · ${dist.afaLosCardos} Tn remitidas a AFA Los Cardos`,
              });
            }
          } else {
            addUbicacionStock(targetInsumoId, lugarAcopio, tipoLugar, icono, cantKg, {
              id: `sub-${act.id}`,
              fecha,
              tipo: "Cosecha",
              campo: act.campo,
              lote: act.lote,
              cantidad: cantKg,
              cantidadTn: cantTn,
              unidad: "kg",
              referencia: `Acopio ${lugarAcopio} · ${act.campo} (${act.lote || "Lote"})`,
              detalle: `Cosecha de ${cantTn} Tn de ${act.cultivo || "Grano"} · Acopio en ${lugarAcopio}`,
            });
          }

          movimientos.push({
            id: `mov-cosecha-${act.id}`,
            insumoId: targetInsumoId,
            insumoNombre: targetInsumoNombre,
            fecha,
            tipo: "Producción Propia",
            cantidad: cantKg,
            cantidadTn: cantTn,
            unidad: "kg",
            ubicacion: lugarAcopio,
            detalle: `Cosecha de ${cantTn} Tn de ${act.cultivo || "Grano"} en ${act.campo} ${act.lote ? `(${act.lote})` : ""} · Acopio: ${lugarAcopio}`,
          });
        }
      }
    }
  }

  // 3.2. PROCESAR CANJES DE GRANO A PELLET EN AFA
  const canjes = getCanjesGranoPellet();
  const canjesSalidasMap = new Map<string, number>();
  const canjesIngresosMap = new Map<string, number>();

  for (const c of canjes) {
    const kgGrano = c.kgGrano || (c.toneladasGrano * 1000);
    const kgPellet = c.kgPellet || (c.toneladasPellet * 1000);

    const currSal = canjesSalidasMap.get(c.cerealInsumoId) || 0;
    canjesSalidasMap.set(c.cerealInsumoId, currSal + kgGrano);

    const currIng = canjesIngresosMap.get(c.pelletInsumoId) || 0;
    canjesIngresosMap.set(c.pelletInsumoId, currIng + kgPellet);

    // Movimiento salida de cereal por canje
    movimientos.push({
      id: `mov-canje-cereal-${c.id}`,
      insumoId: c.cerealInsumoId,
      insumoNombre: c.cerealNombre,
      fecha: c.fecha,
      tipo: "Canje a Pellet (AFA)",
      cantidad: -kgGrano,
      cantidadTn: -c.toneladasGrano,
      unidad: "kg",
      ubicacion: c.acopioOrigen || "AFA Los Cardos",
      detalle: `Canje en ${c.acopioOrigen}: -${c.toneladasGrano} Tn grano entregadas (${c.porcentajeCanje}% canje → +${c.toneladasPellet} Tn pellet)${c.comprobante ? ` · Liq/Comp: ${c.comprobante}` : ""}`,
      referencia: c.acopioOrigen,
    });

    // Descontar en desglose de ubicación de AFA Los Cardos para el cereal
    addUbicacionStock(
      c.cerealInsumoId,
      c.acopioOrigen || "AFA Los Cardos",
      "afa",
      "🌾",
      -kgGrano,
      {
        id: `sub-canje-${c.id}`,
        fecha: c.fecha,
        tipo: "Canje a Pellet",
        campo: "AFA Los Cardos",
        cantidad: -kgGrano,
        cantidadTn: -c.toneladasGrano,
        unidad: "kg",
        referencia: `${c.acopioOrigen} · Canje`,
        detalle: `Canje por ${c.toneladasPellet} Tn de Pellet (${c.porcentajeCanje}% canje) · ${c.comprobante || "Sin comp."}`,
      }
    );

    // Movimiento ingreso de pellet
    movimientos.push({
      id: `mov-canje-pellet-${c.id}`,
      insumoId: c.pelletInsumoId,
      insumoNombre: c.pelletNombre,
      fecha: c.fecha,
      tipo: "Ingreso por Canje",
      cantidad: kgPellet,
      cantidadTn: c.toneladasPellet,
      unidad: "kg",
      ubicacion: c.destinoPellet || "Tambo",
      detalle: `Ingreso por canje en ${c.acopioOrigen}: +${c.toneladasPellet} Tn de pellet (de ${c.toneladasGrano} Tn de ${c.cerealNombre} al ${c.porcentajeCanje}%)${c.comprobante ? ` · Liq: ${c.comprobante}` : ""}`,
      referencia: c.destinoPellet || "Tambo",
    });

    // Agregar desglose por ubicación de Tambo para el pellet
    addUbicacionStock(
      c.pelletInsumoId,
      c.destinoPellet || "Tambo",
      "tambo",
      "🥛",
      kgPellet,
      {
        id: `sub-canje-pellet-${c.id}`,
        fecha: c.fecha,
        tipo: "Ingreso Canje AFA",
        campo: "Tambo",
        cantidad: kgPellet,
        cantidadTn: c.toneladasPellet,
        unidad: "kg",
        referencia: `${c.acopioOrigen} · Canje`,
        detalle: `Ingreso de ${c.toneladasPellet} Tn de Pellet por canje de ${c.toneladasGrano} Tn de ${c.cerealNombre} (${c.porcentajeCanje}%)`,
      }
    );
  }

  // Ordenar movimientos recientes primero
  movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  // 4. Armar lista completa de items con valorización económica y desglose por ubicación
  let valorTotalGeneralArs = 0;
  let valorTotalGeneralUsd = 0;
  let insumosEnAlerta = 0;

  const items: InsumoStockItem[] = INSUMOS_BASE_CATALOGO.map((base) => {
    const consumo = Math.round((consumosMap.get(base.id) || 0) * 10) / 10;
    const ingreso = Math.round((ingresosMap.get(base.id) || 0) * 10) / 10;
    const produccionPropia = Math.round((produccionMap.get(base.id) || 0) * 10) / 10;
    const canjeSalidas = Math.round((canjesSalidasMap.get(base.id) || 0) * 10) / 10;
    const canjeIngresos = Math.round((canjesIngresosMap.get(base.id) || 0) * 10) / 10;
    const ajuste = Math.round((ajustesMap.get(base.id) || 0) * 10) / 10;

    const stockActual = Math.max(
      0,
      Math.round((base.stockInicial + ingreso + produccionPropia + canjeIngresos + ajuste - consumo - canjeSalidas) * 10) / 10
    );
    const totalEntradas = base.stockInicial + ingreso + produccionPropia + canjeIngresos + (ajuste > 0 ? ajuste : 0);
    const enAlerta = totalEntradas > 0 && stockActual <= base.stockMinimoAlerta;
    if (enAlerta) insumosEnAlerta++;

    const isCerealOGrano = (base.categoria === "Granos" || base.categoria === "Forrajes & Granos") && (base.id.includes("grano") || base.id === "silo-maiz");
    const isRollo = base.id.includes("rollo");
    const totalTn = isCerealOGrano ? Number((stockActual / 1000).toFixed(2)) : undefined;

    // Calcular desglose de stock por ubicación (Silos, Cooperativa, Puerto, AFA Los Cardos, Keuneke, Tambo)
    let stockPorUbicacion: StockUbicacionBreakdown[] = [];
    const innerUbicMap = ubicacionesMap.get(base.id);

    if (innerUbicMap && innerUbicMap.size > 0) {
      const list = Array.from(innerUbicMap.values());
      const sumList = list.reduce((acc, x) => acc + x.cantidad, 0);

      stockPorUbicacion = list.map((entry) => {
        const cantidadTn = isCerealOGrano ? Number((entry.cantidad / 1000).toFixed(2)) : undefined;
        const pct = sumList > 0 ? Math.min(100, Math.round((entry.cantidad / sumList) * 100)) : 0;
        return {
          lugar: entry.lugar,
          tipoLugar: entry.tipoLugar,
          icono: entry.icono,
          cantidad: Math.round(entry.cantidad * 10) / 10,
          cantidadTn,
          unidad: isCerealOGrano ? "Tn" : base.unidad,
          porcentaje: pct,
          movimientosCount: entry.detalles.length,
          detalles: entry.detalles,
        };
      });

      stockPorUbicacion.sort((a, b) => b.cantidad - a.cantidad);

      if (isCerealOGrano) {
        const defaultLocations: { lugar: string; tipoLugar: StockUbicacionBreakdown["tipoLugar"]; icono: string }[] = [
          { lugar: "Silos", tipoLugar: "silo", icono: "🏢" },
          { lugar: "Cooperativa", tipoLugar: "cooperativa", icono: "🏬" },
          { lugar: "Puerto (San Lorenzo)", tipoLugar: "puerto", icono: "🚢" },
          { lugar: "AFA Los Cardos", tipoLugar: "afa", icono: "🌾" },
        ];
        for (const def of defaultLocations) {
          const exists = stockPorUbicacion.some((u) => u.lugar === def.lugar || (def.tipoLugar === "puerto" && u.tipoLugar === "puerto") || (def.tipoLugar === "afa" && u.tipoLugar === "afa"));
          if (!exists) {
            stockPorUbicacion.push({
              lugar: def.lugar,
              tipoLugar: def.tipoLugar,
              icono: def.icono,
              cantidad: 0,
              cantidadTn: 0,
              unidad: "Tn",
              porcentaje: 0,
              movimientosCount: 0,
              detalles: [],
            });
          }
        }
      }
    } else {
      // Si aún no hay labores de cosecha registradas, inicializar las ubicaciones solicitadas en 0
      if (isCerealOGrano) {
        stockPorUbicacion = [
          { lugar: "Silos", tipoLugar: "silo", icono: "🏢", cantidad: 0, cantidadTn: 0, unidad: "Tn", porcentaje: 0, movimientosCount: 0, detalles: [] },
          { lugar: "Cooperativa", tipoLugar: "cooperativa", icono: "🏬", cantidad: 0, cantidadTn: 0, unidad: "Tn", porcentaje: 0, movimientosCount: 0, detalles: [] },
          { lugar: "Puerto (San Lorenzo)", tipoLugar: "puerto", icono: "🚢", cantidad: 0, cantidadTn: 0, unidad: "Tn", porcentaje: 0, movimientosCount: 0, detalles: [] },
          { lugar: "AFA Los Cardos", tipoLugar: "afa", icono: "🌾", cantidad: 0, cantidadTn: 0, unidad: "Tn", porcentaje: 0, movimientosCount: 0, detalles: [] },
        ];
      } else if (isRollo) {
        stockPorUbicacion = [
          { lugar: "Campo Keuneke", tipoLugar: "campo", icono: "🏠", cantidad: 0, unidad: "Rollos", porcentaje: 0, movimientosCount: 0, detalles: [] },
          { lugar: "Tambo", tipoLugar: "tambo", icono: "🥛", cantidad: 0, unidad: "Rollos", porcentaje: 0, movimientosCount: 0, detalles: [] },
        ];
      }
    }

    // Obtener precio de referencia desde Valores Móviles
    let precioArs = getPrecioReferencia(base.valorMovilId, "ARS");
    let precioUsd = getPrecioReferencia(base.valorMovilId, "USD");

    // Ajuste de unidades si es necesario (ej: $/Tn ➔ $/kg)
    if (base.valorMovilId === "maiz" || base.valorMovilId === "pellet-soja" || base.valorMovilId === "pellet-trigo" || base.valorMovilId === "soja" || base.valorMovilId === "trigo") {
      precioArs = precioArs > 0 ? precioArs / 1000 : (base.valorMovilId === "soja" ? 555 : base.valorMovilId === "trigo" ? 344.6 : base.valorMovilId === "pellet-trigo" ? 221.8 : 295.2);
      precioUsd = precioUsd > 0 ? precioUsd / 1000 : (base.valorMovilId === "soja" ? 0.37 : base.valorMovilId === "trigo" ? 0.23 : base.valorMovilId === "pellet-trigo" ? 0.148 : 0.193);
    } else if (base.id === "semilla-maiz") {
      precioUsd = 150;
      precioArs = precioUsd * dolarBNA;
    } else if (base.id === "semilla-soja") {
      precioUsd = 45;
      precioArs = precioUsd * dolarBNA;
    } else if (base.id === "semilla-alfalfa") {
      precioUsd = 12;
      precioArs = precioUsd * dolarBNA;
    } else if (base.id === "semilla-avena") {
      precioUsd = 0.85;
      precioArs = precioUsd * dolarBNA;
    } else if (base.id === "balanceado-iniciador") {
      precioArs = 340;
      precioUsd = Number((340 / dolarBNA).toFixed(3));
    } else if (base.id === "rollo-avena") {
      precioArs = 27600;
      precioUsd = Number((27600 / dolarBNA).toFixed(2));
    } else if (base.id === "rollo-rastrojo") {
      precioArs = 22000;
      precioUsd = Number((22000 / dolarBNA).toFixed(2));
    } else if (base.id === "enmienda-solida") {
      precioArs = 15000;
      precioUsd = Number((15000 / dolarBNA).toFixed(2));
    } else if (base.id === "biofertilizante-liq") {
      precioArs = 1200;
      precioUsd = Number((1200 / dolarBNA).toFixed(2));
    } else if (base.id === "sal-mineral") {
      precioArs = 1289.88;
      precioUsd = Number((1289.88 / dolarBNA).toFixed(3));
    } else if (base.id === "sal-anionica") {
      precioArs = 1450.00;
      precioUsd = Number((1450.00 / dolarBNA).toFixed(3));
    } else if (!precioArs || precioArs <= 0) {
      if (precioUsd > 0) precioArs = precioUsd * dolarBNA;
      else {
        precioArs = 100;
        precioUsd = Number((100 / dolarBNA).toFixed(2));
      }
    }

    const valorTotalArs = Math.round(stockActual * precioArs);
    const valorTotalUsd = Number((stockActual * precioUsd).toFixed(2));

    valorTotalGeneralArs += valorTotalArs;
    valorTotalGeneralUsd += valorTotalUsd;

    const porcentajeStock = Math.min(
      100,
      Math.max(0, Math.round((stockActual / (totalEntradas || 1)) * 100))
    );

    return {
      ...base,
      stockActual,
      consumoAgricola: consumo,
      ingresosCompras: ingreso,
      produccionPropia,
      canjeIngresos,
      canjeSalidas,
      ajustesInventario: ajuste,
      precioUnitarioArs: Math.round(precioArs * 100) / 100,
      precioUnitarioUsd: Number(precioUsd.toFixed(3)),
      valorTotalArs,
      valorTotalUsd,
      enAlerta,
      porcentajeStock,
      stockPorUbicacion,
      totalTn,
      esCerealOGrano: isCerealOGrano,
      esRollo: isRollo,
    };
  });

  return {
    items,
    movimientos,
    valorTotalGeneralArs,
    valorTotalGeneralUsd: Number(valorTotalGeneralUsd.toFixed(2)),
    totalInsumos: items.length,
    insumosEnAlerta,
  };
}
