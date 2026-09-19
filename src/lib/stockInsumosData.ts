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
}

export interface MovimientoStockItem {
  id: string;
  insumoId: string;
  insumoNombre: string;
  fecha: string;
  tipo: "Ingreso / Compra" | "Consumo Agrícola" | "Consumo Ganadería" | "Ajuste de Inventario" | "Producción Propia" | "Traslado / Destino";
  cantidad: number; // Positivo para ingresos y producción, negativo para consumos
  unidad: string;
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
    nombre: "Maíz Grano / Partido",
    categoria: "Forrajes & Granos",
    unidad: "kg",
    stockInicial: 0,
    stockMinimoAlerta: 10000,
    ubicacion: "Silo Chapa - Ganadería",
    valorMovilId: "maiz",
    aliasLabores: ["maíz grano", "maíz partido", "maiz grano", "maiz"],
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

  // 3. Sumar producción propia de labores agrícolas realizadas (Armado de rollos, forrajes)
  const produccionMap = new Map<string, number>();
  for (const act of activities) {
    if (act.estado === "Realizada" && act.produccion) {
      const supHa = act.superficieReal || act.superficiePlanificada || 0;
      const fecha = act.fechaReal || act.fechaPlanificada;
      const tipoLabor = (act.tipo || "").toLowerCase();
      const cultivo = (act.cultivo || "").toLowerCase();
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

      if (isRollos) {
        // Verificar si ya hubo una labor de "Armado de rollos" que acreditó el stock físico en este mismo lote y campaña
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

        const destinoLabel = act.produccion.destino ? ` → Destino: ${act.produccion.destino}` : "";
        const movTipo = isSacado ? (hasPreviousArmado ? "Traslado / Destino" : "Producción Propia") : "Producción Propia";

        // A. Si tiene desglose específico por cultivo (avena, alfalfa, rastrojo)
        if (act.produccion.rollosDesglose) {
          const { alfalfa, avena, rastrojo } = act.produccion.rollosDesglose;
          if (alfalfa && alfalfa > 0) {
            if (!hasPreviousArmado) {
              const curr = produccionMap.get("rollo-alfalfa") || 0;
              produccionMap.set("rollo-alfalfa", curr + alfalfa);
            }
            movimientos.push({
              id: `mov-prod-alfalfa-${act.id}`,
              insumoId: "rollo-alfalfa",
              insumoNombre: "Rollos de Alfalfa Primera Henificada",
              fecha,
              tipo: movTipo,
              cantidad: alfalfa,
              unidad: "Rollos",
              detalle: `${isSacado ? "Sacado" : "Confección"} de ${alfalfa} rollos de alfalfa en ${act.campo} ${act.lote ? `(${act.lote})` : ""} · Campaña ${act.campana}${destinoLabel}`,
            });
          }
          if (avena && avena > 0) {
            if (!hasPreviousArmado) {
              const curr = produccionMap.get("rollo-avena") || 0;
              produccionMap.set("rollo-avena", curr + avena);
            }
            movimientos.push({
              id: `mov-prod-avena-${act.id}`,
              insumoId: "rollo-avena",
              insumoNombre: "Rollos de Avena Henificada",
              fecha,
              tipo: movTipo,
              cantidad: avena,
              unidad: "Rollos",
              detalle: `${isSacado ? "Sacado" : "Confección"} de ${avena} rollos de avena en ${act.campo} ${act.lote ? `(${act.lote})` : ""} · Campaña ${act.campana}${destinoLabel}`,
            });
          }
          if (rastrojo && rastrojo > 0) {
            if (!hasPreviousArmado) {
              const curr = produccionMap.get("rollo-rastrojo") || 0;
              produccionMap.set("rollo-rastrojo", curr + rastrojo);
            }
            movimientos.push({
              id: `mov-prod-rastrojo-${act.id}`,
              insumoId: "rollo-rastrojo",
              insumoNombre: "Rollos de Rastrojo / Chala",
              fecha,
              tipo: movTipo,
              cantidad: rastrojo,
              unidad: "Rollos",
              detalle: `${isSacado ? "Sacado" : "Confección"} de ${rastrojo} rollos de rastrojo en ${act.campo} ${act.lote ? `(${act.lote})` : ""} · Campaña ${act.campana}${destinoLabel}`,
            });
          }
        } else {
          // B. Si tiene cantidad total directa
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
            movimientos.push({
              id: `mov-prod-gen-${act.id}`,
              insumoId: targetInsumoId,
              insumoNombre: targetInsumoNombre,
              fecha,
              tipo: movTipo,
              cantidad: cant,
              unidad: "Rollos",
              detalle: `${isSacado ? "Sacado" : "Confección"} de ${cant} rollos (${act.cultivo || "Forraje"}) en ${act.campo} ${act.lote ? `(${act.lote})` : ""} · Campaña ${act.campana}${destinoLabel}`,
            });
          }
        }
      }
    }
  }

  // Ordenar movimientos recientes primero
  movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  // 4. Armar lista completa de items con valorización económica
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

    // Obtener precio de referencia desde Valores Móviles
    let precioArs = getPrecioReferencia(base.valorMovilId, "ARS");
    let precioUsd = getPrecioReferencia(base.valorMovilId, "USD");

    // Ajuste de unidades si es necesario (ej: $/Tn ➔ $/kg)
    if (base.valorMovilId === "maiz" || base.valorMovilId === "pellet-soja" || base.valorMovilId === "soja") {
      precioArs = precioArs > 0 ? precioArs / 1000 : 295.2;
      precioUsd = precioUsd > 0 ? precioUsd / 1000 : 0.193;
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
