"use client";

import { Activity, agricultureData, realQuantity, plannedQuantity, sanitizeForFirestore } from "./agricultureData";
import { getDolarBnaVenta, getPrecioReferencia, getValoresMoviles } from "./valoresMovilesData";
import { db } from "./firebase";
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";

export type CategoriaInsumo =
  | "Fitosanitarios"
  | "Semillas"
  | "Fertilizantes"
  | "Forrajes & Granos"
  | "Combustibles";

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
  tipo: "Ingreso / Compra" | "Consumo Agrícola" | "Consumo Ganadería" | "Ajuste de Inventario" | "Producción Propia" | "Traslado / Destino";
  cantidad: number; // Positivo para ingresos y producción, negativo para consumos
  cantidadTn?: number;
  unidad: string;
  ubicacion?: string;
  detalle: string;
  remitoProveedor?: string;
  costoArs?: number;
}

export interface IngresoStockManual {
  id: string;
  insumoId: string;
  fecha: string;
  cantidad: number;
  remitoProveedor: string;
  costoUnitarioArs?: number;
  observaciones?: string;
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

  // 4. FORRAJES, GRANOS Y ALIMENTACIÓN
  {
    id: "maiz-grano",
    nombre: "Maíz Grano Comercial",
    categoria: "Forrajes & Granos",
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
    categoria: "Forrajes & Granos",
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
    categoria: "Forrajes & Granos",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 5000,
    ubicacion: "Silos / Acopios",
    valorMovilId: "trigo",
    aliasLabores: ["trigo", "trigo grano", "cosecha trigo", "trigo pan"],
  },
  {
    id: "silo-maiz",
    nombre: "Silo de Maíz Picado Fino (Bolsa)",
    categoria: "Forrajes & Granos",
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
    categoria: "Forrajes & Granos",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 3000,
    ubicacion: "Galpón de Raciones - Tambo",
    valorMovilId: "pellet-soja",
    aliasLabores: ["pellet", "pellet de soja", "pellet soja"],
  },
  {
    id: "rollo-alfalfa",
    nombre: "Rollos de Alfalfa Primera Henificada",
    categoria: "Forrajes & Granos",
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
    categoria: "Forrajes & Granos",
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
    categoria: "Forrajes & Granos",
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
    categoria: "Forrajes & Granos",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 600,
    ubicacion: "Depósito Guachera",
    valorMovilId: "balanceado-iniciador",
    aliasLabores: ["balanceado", "iniciador", "balanceado terneros"],
  },

  // 5. COMBUSTIBLES
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

let isStockFirestoreSyncInitialized = false;

export function initStockFirestoreSync() {
  if (typeof window === "undefined" || isStockFirestoreSyncInitialized || !db) return;
  isStockFirestoreSyncInitialized = true;

  try {
    const col = collection(db, "stock_ingresos");
    onSnapshot(
      col,
      (snapshot) => {
        if (!snapshot.empty) {
          const remote: IngresoStockManual[] = [];
          snapshot.forEach((d) => remote.push(d.data() as IngresoStockManual));
          remote.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
          saveIngresosManuales(remote);
          notifyStockSync();
        }
      },
      (error) => {
        console.warn("Firestore sync stock error:", error);
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

  // 2. Sumar ingresos manuales / compras registradas
  const ingresosMap = new Map<string, number>();
  for (const ing of ingresosManuales) {
    const current = ingresosMap.get(ing.insumoId) || 0;
    ingresosMap.set(ing.insumoId, current + ing.cantidad);

    const catItem = INSUMOS_BASE_CATALOGO.find((x) => x.id === ing.insumoId);
    movimientos.push({
      id: ing.id,
      insumoId: ing.insumoId,
      insumoNombre: catItem?.nombre || ing.insumoId,
      fecha: ing.fecha,
      tipo: "Ingreso / Compra",
      cantidad: ing.cantidad,
      unidad: catItem?.unidad || "unidades",
      detalle: `Ingreso de Stock · ${ing.remitoProveedor} ${ing.observaciones ? `(${ing.observaciones})` : ""}`,
      remitoProveedor: ing.remitoProveedor,
      costoArs: ing.costoUnitarioArs ? ing.costoUnitarioArs * ing.cantidad : undefined,
    });
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
    const stockActual = Math.max(0, Math.round((base.stockInicial + ingreso + produccionPropia - consumo) * 10) / 10);
    const enAlerta = (base.stockInicial + ingreso + produccionPropia > 0) && stockActual <= base.stockMinimoAlerta;
    if (enAlerta) insumosEnAlerta++;

    const isCerealOGrano = base.categoria === "Forrajes & Granos" && (base.id.includes("grano") || base.id === "silo-maiz");
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
    if (base.valorMovilId === "maiz" || base.valorMovilId === "pellet-soja" || base.valorMovilId === "soja" || base.valorMovilId === "trigo") {
      precioArs = precioArs > 0 ? precioArs / 1000 : (base.valorMovilId === "soja" ? 555 : base.valorMovilId === "trigo" ? 344.6 : 295.2);
      precioUsd = precioUsd > 0 ? precioUsd / 1000 : (base.valorMovilId === "soja" ? 0.37 : base.valorMovilId === "trigo" ? 0.23 : 0.193);
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
      Math.max(0, Math.round((stockActual / (base.stockInicial + ingreso + produccionPropia || 1)) * 100))
    );

    return {
      ...base,
      stockActual,
      consumoAgricola: consumo,
      ingresosCompras: ingreso,
      produccionPropia,
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
