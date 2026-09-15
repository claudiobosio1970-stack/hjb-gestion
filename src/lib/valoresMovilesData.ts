"use client";

export type CategoriaValor =
  | "Macro & Combustibles"
  | "Granos & Concentrados"
  | "Ensilajes & Pasturas"
  | "Rollos Forrajeros";

export type FuenteValor =
  | "API DolarApi"
  | "API ArgentinaDatos"
  | "API Secretaría de Energía"
  | "Manual HJB"
  | "Derivado / Fórmula";

export interface ValorMovil {
  id: string;
  nombre: string;
  categoria: CategoriaValor;
  valorArs: number | null; // Precio en Pesos ($ ARS)
  valorUsd: number | null; // Precio en Dólares (USD U$D)
  unidadArs: string;       // ej: "$/kg", "$/lt", "$/Tn", "$/Rollo", "%"
  unidadUsd: string;       // ej: "USD/kg", "USD/lt", "USD/Tn", "USD/Rollo", "%"
  fuente: FuenteValor;
  esEditableManual: boolean;
  origenCalculo?: string;
  nota?: string;
  fletePct?: number | null; // ej: 6% para pellet de trigo
  fechaActualizacion: string;
}

// Tipo de cambio BNA base de la planilla de HJB del 18/8/26: $1.495
const BASE_TC = 1495;

function toUsd(ars: number | null, tc: number, decimals: number = 3): number | null {
  if (ars === null || tc <= 0) return null;
  return Number((ars / tc).toFixed(decimals));
}

function toArs(usd: number | null, tc: number, decimals: number = 2): number | null {
  if (usd === null || tc <= 0) return null;
  return Number((usd * tc).toFixed(decimals));
}

export const VALORES_MOVILES_DEFAULT: ValorMovil[] = [
  // ==========================================
  // 1. MACROECONOMÍA Y COMBUSTIBLE
  // ==========================================
  {
    id: "inflacion",
    nombre: "Inflación Mensual",
    categoria: "Macro & Combustibles",
    valorArs: 2.1,
    valorUsd: 2.1,
    unidadArs: "%",
    unidadUsd: "%",
    fuente: "API ArgentinaDatos",
    esEditableManual: true,
    nota: "Índice de Precios al Consumidor (IPC)",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "dolar-bna",
    nombre: "Cambio BNA (Divisas venta)",
    categoria: "Macro & Combustibles",
    valorArs: 1495,
    valorUsd: 1.0,
    unidadArs: "$",
    unidadUsd: "USD",
    fuente: "API DolarApi",
    esEditableManual: true,
    nota: "Tipo de cambio oficial BNA para liquidaciones y paridad",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "gasoil",
    nombre: "Precio gas oil",
    categoria: "Macro & Combustibles",
    valorArs: 2200,
    valorUsd: toUsd(2200, BASE_TC, 2), // ~1.47 USD/lt
    unidadArs: "$/lt",
    unidadUsd: "USD/lt",
    fuente: "API Secretaría de Energía",
    esEditableManual: true,
    nota: "Gas Oil Grado 2 para maquinaria y laboreos",
    fechaActualizacion: "18/8/26",
  },

  // ==========================================
  // 2. GRANOS Y CONCENTRADOS (DIETAS)
  // ==========================================
  {
    id: "maiz-kg",
    nombre: "Precio Maíz",
    categoria: "Granos & Concentrados",
    valorArs: 273,
    valorUsd: toUsd(273, BASE_TC, 3), // ~0.183 USD/kg (~182.6 USD/Tn)
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Grano de maíz puesto en mixer",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pellet-soja-tn",
    nombre: "Precio Pellet de soja [Tn]",
    categoria: "Granos & Concentrados",
    valorArs: 403650,
    valorUsd: 270.0, // Referencia explícita en planilla: 270 USD
    unidadArs: "$/Tn",
    unidadUsd: "USD/Tn",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Concentrado proteico por tonelada",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pellet-soja-kg",
    nombre: "Precio Pellet de soja [$/kg]",
    categoria: "Granos & Concentrados",
    valorArs: 404,
    valorUsd: 0.27, // 270 USD / 1000
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de Pellet Tn ($403.650 / 1000 = $404)",
    esEditableManual: true,
    nota: "Concentrado proteico por kilo para dietas",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "semilla-algodon-tn",
    nombre: "Precio de Semilla algodón [Tn]",
    categoria: "Granos & Concentrados",
    valorArs: null,
    valorUsd: null,
    unidadArs: "$/Tn",
    unidadUsd: "USD/Tn",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Sin cotización actual (S/C)",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "semilla-algodon-kg",
    nombre: "Precio de S algodón [$/kg]",
    categoria: "Granos & Concentrados",
    valorArs: null,
    valorUsd: null,
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Sin cotización en origen",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "semilla-algodon-flete-kg",
    nombre: "Precio de S algodón + flete",
    categoria: "Granos & Concentrados",
    valorArs: 255,
    valorUsd: toUsd(255, BASE_TC, 3), // ~0.171 USD/kg
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Semilla de algodón puesta en tambo con flete incluido",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pellet-trigo-tn",
    nombre: "Precio Pellet de Trigo [Tn]",
    categoria: "Granos & Concentrados",
    valorArs: 209300,
    valorUsd: 140.0, // Referencia explícita en planilla: 140 USD
    unidadArs: "$/Tn",
    unidadUsd: "USD/Tn",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Subproducto de trigo por tonelada",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pellet-trigo-kg",
    nombre: "Precio Pellet de Trigo [$/kg]",
    categoria: "Granos & Concentrados",
    valorArs: 209,
    valorUsd: 0.14, // 140 USD / 1000
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de Pellet Trigo Tn ($209.300 / 1000 = $209)",
    esEditableManual: true,
    nota: "Subproducto por kilo para ración",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pellet-trigo-flete-kg",
    nombre: "Precio Pellet Trigo + flete",
    categoria: "Granos & Concentrados",
    valorArs: 222,
    valorUsd: toUsd(222, BASE_TC, 3), // ~0.148 USD/kg
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fletePct: 6,
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Pellet de trigo puesto en tambo con 6% de flete",
    fechaActualizacion: "18/8/26",
  },

  // ==========================================
  // 3. ENSILAJES Y PASTURAS (DIETAS)
  // ==========================================
  {
    id: "silo-maiz-kg",
    nombre: "Precio silo de maíz",
    categoria: "Ensilajes & Pasturas",
    valorArs: 39.1,
    valorUsd: toUsd(39.1, BASE_TC, 3), // ~0.026 USD/kg
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Silaje de planta entera picado para mixer",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "silo-avena-kg",
    nombre: "Precio silo de Avena",
    categoria: "Ensilajes & Pasturas",
    valorArs: 34.6,
    valorUsd: toUsd(34.6, BASE_TC, 3), // ~0.023 USD/kg
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Silaje de avena forrajera tambo",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pastura-alfalfa-kg",
    nombre: "Pastura alfalfa",
    categoria: "Ensilajes & Pasturas",
    valorArs: 13.3,
    valorUsd: toUsd(13.3, BASE_TC, 4), // ~0.0089 USD/kg
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Pastoreo directo de alfalfa en lote",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pastura-avena-kg",
    nombre: "Pastura Avena",
    categoria: "Ensilajes & Pasturas",
    valorArs: 10.6,
    valorUsd: toUsd(10.6, BASE_TC, 4), // ~0.0071 USD/kg
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Verdeo de invierno en pastoreo directo",
    fechaActualizacion: "18/8/26",
  },

  // ==========================================
  // 4. ROLLOS FORRAJEROS
  // ==========================================
  {
    id: "rollo-alfalfa-rollo",
    nombre: "Precio Rollo Alfalfa",
    categoria: "Rollos Forrajeros",
    valorArs: 80600,
    valorUsd: toUsd(80600, BASE_TC, 1), // ~53.9 USD/Rollo
    unidadArs: "$/Rollo",
    unidadUsd: "USD/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rollo de primera calidad confeccionado",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-alfalfa-kg",
    nombre: "Precio Rollo Alfalfa [$/kg]",
    categoria: "Rollos Forrajeros",
    valorArs: 161,
    valorUsd: toUsd(161, BASE_TC, 3), // ~0.108 USD/kg
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de $80.600 / ~500 kg = $161",
    esEditableManual: true,
    nota: "Costo por kg de materia henificada",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-avena-rollo",
    nombre: "Precio Rollo Avena",
    categoria: "Rollos Forrajeros",
    valorArs: 56420,
    valorUsd: toUsd(56420, BASE_TC, 1), // ~37.7 USD/Rollo
    unidadArs: "$/Rollo",
    unidadUsd: "USD/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rollo forrajero avena confeccionado",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-avena-kg",
    nombre: "Precio Rollo Avena [$/kg]",
    categoria: "Rollos Forrajeros",
    valorArs: 113,
    valorUsd: toUsd(113, BASE_TC, 3), // ~0.076 USD/kg
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de $56.420 / ~500 kg = $113",
    esEditableManual: true,
    nota: "Fibra forrajera avena por kilo",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-chala-maiz-rollo",
    nombre: "Precio rollo chala maíz",
    categoria: "Rollos Forrajeros",
    valorArs: 22000,
    valorUsd: toUsd(22000, BASE_TC, 1), // ~14.7 USD/Rollo
    unidadArs: "$/Rollo",
    unidadUsd: "USD/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rastrojo de maíz para volumen / mantenimiento",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-chala-maiz-kg",
    nombre: "Precio Rollo chala [$/kg]",
    categoria: "Rollos Forrajeros",
    valorArs: 55,
    valorUsd: toUsd(55, BASE_TC, 3), // ~0.037 USD/kg
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de $22.000 / ~400 kg = $55",
    esEditableManual: true,
    nota: "Fibra de volumen seco por kilo",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-gramineas-rollo",
    nombre: "Precio rollo Gramíneas",
    categoria: "Rollos Forrajeros",
    valorArs: 20150,
    valorUsd: toUsd(20150, BASE_TC, 1), // ~13.5 USD/Rollo
    unidadArs: "$/Rollo",
    unidadUsd: "USD/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rollo de pasto consociado / gramíneas",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-gramineas-kg",
    nombre: "Precio Rollo Gramíneas [$/kg]",
    categoria: "Rollos Forrajeros",
    valorArs: 40,
    valorUsd: toUsd(40, BASE_TC, 3), // ~0.027 USD/kg
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de $20.150 / ~500 kg = $40",
    esEditableManual: true,
    nota: "Henificado de gramíneas por kilo",
    fechaActualizacion: "18/8/26",
  },
];

const STORAGE_KEY = "hjb_valores_moviles_bimonetario_v02";
const LAST_SYNC_KEY = "hjb_valores_moviles_last_sync";

export function getValoresMoviles(): ValorMovil[] {
  if (typeof window === "undefined") return VALORES_MOVILES_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return VALORES_MOVILES_DEFAULT;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : VALORES_MOVILES_DEFAULT;
  } catch {
    return VALORES_MOVILES_DEFAULT;
  }
}

export function saveValoresMoviles(items: ValorMovil[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Obtiene el tipo de cambio oficial BNA venta activo del sistema
 */
export function getDolarBnaVenta(): number {
  const items = getValoresMoviles();
  const found = items.find((x) => x.id === "dolar-bna");
  return found && typeof found.valorArs === "number" && found.valorArs > 0 ? found.valorArs : BASE_TC;
}

/**
 * Actualiza un valor en Pesos ($ ARS) y recalcula su paridad en Dólares (USD)
 */
export function updateFromArs(items: ValorMovil[], id: string, nuevoArs: number | null): ValorMovil[] {
  const tc = getDolarBnaVenta();
  const copy = [...items];
  const idx = copy.findIndex((x) => x.id === id);
  if (idx < 0) return copy;

  const today = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

  if (id === "inflacion") {
    copy[idx] = { ...copy[idx], valorArs: nuevoArs, valorUsd: nuevoArs, fechaActualizacion: today };
    return copy;
  }

  // Si se modifica el Dólar BNA, actualiza la cotización
  if (id === "dolar-bna") {
    const tcActualizado = nuevoArs && nuevoArs > 0 ? nuevoArs : tc;
    copy[idx] = { ...copy[idx], valorArs: nuevoArs, valorUsd: 1.0, fechaActualizacion: today };
    return copy;
  }

  const decimals = (copy[idx].unidadArs.includes("/kg") || copy[idx].unidadArs.includes("/lt")) ? 3 : 2;
  const nuevoUsd = toUsd(nuevoArs, tc, decimals);

  copy[idx] = {
    ...copy[idx],
    valorArs: nuevoArs,
    valorUsd: nuevoUsd,
    fechaActualizacion: today,
  };

  // Recalcular derivados por kilo si se cambió la unidad mayor
  recalculateDerivatives(copy, id, tc);
  return copy;
}

/**
 * Actualiza un valor en Dólares (USD U$D) y recalcula su paridad en Pesos (ARS)
 */
export function updateFromUsd(items: ValorMovil[], id: string, nuevoUsd: number | null): ValorMovil[] {
  const tc = getDolarBnaVenta();
  const copy = [...items];
  const idx = copy.findIndex((x) => x.id === id);
  if (idx < 0) return copy;

  const today = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

  if (id === "inflacion") {
    copy[idx] = { ...copy[idx], valorArs: nuevoUsd, valorUsd: nuevoUsd, fechaActualizacion: today };
    return copy;
  }

  const nuevoArs = toArs(nuevoUsd, tc, 2);

  copy[idx] = {
    ...copy[idx],
    valorArs: nuevoArs,
    valorUsd: nuevoUsd,
    fechaActualizacion: today,
  };

  // Recalcular derivados por kilo si se cambió la unidad mayor
  recalculateDerivatives(copy, id, tc);
  return copy;
}

function recalculateDerivatives(list: ValorMovil[], changedId: string, tc: number) {
  function updatePair(targetId: string, factor: number) {
    const parent = list.find((x) => x.id === changedId);
    const childIdx = list.findIndex((x) => x.id === targetId);
    if (parent && childIdx >= 0 && typeof parent.valorArs === "number") {
      const ars = Math.round(parent.valorArs / factor);
      const usd = toUsd(ars, tc, 3);
      list[childIdx] = {
        ...list[childIdx],
        valorArs: ars,
        valorUsd: usd,
      };
    }
  }

  if (changedId === "pellet-soja-tn") updatePair("pellet-soja-kg", 1000);
  if (changedId === "pellet-trigo-tn") updatePair("pellet-trigo-kg", 1000);
  if (changedId === "rollo-alfalfa-rollo") updatePair("rollo-alfalfa-kg", 500);
  if (changedId === "rollo-avena-rollo") updatePair("rollo-avena-kg", 500);
  if (changedId === "rollo-chala-maiz-rollo") updatePair("rollo-chala-maiz-kg", 400);
  if (changedId === "rollo-gramineas-rollo") updatePair("rollo-gramineas-kg", 500);
}

/**
 * Consulta las APIs públicas en vivo y actualiza Dólar BNA, Inflación y Gasoil
 */
export async function syncApisLive(): Promise<{ success: boolean; updatedCount: number; details: string[] }> {
  const current = getValoresMoviles();
  const details: string[] = [];
  let updatedCount = 0;
  const today = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  let activeTc = getDolarBnaVenta();

  // 1. Dólar BNA vía DolarApi
  try {
    const res = await fetch("https://dolarapi.com/v1/ambito/dolares/bna", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const venta = typeof data.venta === "number" ? data.venta : parseFloat(data.venta);
      if (!isNaN(venta) && venta > 0) {
        activeTc = venta;
        const idx = current.findIndex((x) => x.id === "dolar-bna");
        if (idx >= 0) {
          current[idx].valorArs = venta;
          current[idx].valorUsd = 1.0;
          current[idx].fechaActualizacion = today;
          current[idx].fuente = "API DolarApi";
          details.push(`Dólar BNA Venta: $${venta.toLocaleString("es-AR")}`);
          updatedCount++;
        }
      }
    }
  } catch (err) {
    console.warn("DolarApi warning:", err);
  }

  // 2. Inflación vía ArgentinaDatos
  try {
    const res = await fetch("https://api.argentinadatos.com/v1/finanzas/indices/inflacion", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const last = data[data.length - 1];
        if (last && typeof last.valor === "number") {
          const idx = current.findIndex((x) => x.id === "inflacion");
          if (idx >= 0) {
            current[idx].valorArs = last.valor;
            current[idx].valorUsd = last.valor;
            current[idx].fechaActualizacion = today;
            current[idx].nota = `Último IPC (${last.fecha})`;
            current[idx].fuente = "API ArgentinaDatos";
            details.push(`Inflación IPC: ${last.valor}%`);
            updatedCount++;
          }
        }
      }
    }
  } catch (err) {
    console.warn("ArgentinaDatos warning:", err);
  }

  // 3. Combustibles vía datos.energia.gob.ar
  try {
    const res = await fetch(
      "https://datos.energia.gob.ar/api/3/action/datastore_search?resource_id=80ac25de-a44a-4445-9215-090cf55cfda5&filters=%7B%22producto%22%3A%22Gas%20Oil%20Grado%202%22%7D&limit=5",
      { cache: "no-store" }
    );
    if (res.ok) {
      const json = await res.json();
      const records = json.result?.records;
      if (Array.isArray(records) && records.length > 0) {
        const prices = records.map((r: any) => r.precio).filter((p: any) => typeof p === "number" && p > 500);
        if (prices.length > 0) {
          const medianPrice = prices.sort((a: number, b: number) => a - b)[Math.floor(prices.length / 2)];
          const idx = current.findIndex((x) => x.id === "gasoil");
          if (idx >= 0) {
            current[idx].valorArs = medianPrice;
            current[idx].valorUsd = toUsd(medianPrice, activeTc, 2);
            current[idx].fechaActualizacion = today;
            current[idx].fuente = "API Secretaría de Energía";
            details.push(`Gas Oil Grado 2: $${medianPrice.toLocaleString("es-AR")}/lt (USD ${current[idx].valorUsd})`);
            updatedCount++;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Secretaría de Energía warning:", err);
  }

  saveValoresMoviles(current);

  if (typeof window !== "undefined") {
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  }

  return {
    success: updatedCount > 0,
    updatedCount,
    details,
  };
}

/**
 * Chequea y corre la sincronización diaria automática
 */
export async function checkDailyAutoSync(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const lastSyncStr = localStorage.getItem(LAST_SYNC_KEY);
  const todayStr = new Date().toISOString().slice(0, 10);

  if (lastSyncStr && lastSyncStr.slice(0, 10) === todayStr) {
    return false;
  }

  try {
    await syncApisLive();
    return true;
  } catch {
    return false;
  }
}

export function getLastSyncTime(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LAST_SYNC_KEY);
  if (!raw) return null;
  try {
    const d = new Date(raw);
    return d.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

// ========================================================================
// SERVICIO DE REFERENCIA CENTRAL PARA TODO EL SISTEMA HJB
// ========================================================================

/**
 * Función central para consultar el precio unitario activo de cualquier insumo
 * en Pesos ($ ARS) o Dólares (USD) para dietas de vacas o costos de labores
 */
export function getPrecioReferencia(id: string, moneda: "ARS" | "USD" = "ARS"): number {
  const items = getValoresMoviles();
  const item = items.find((x) => x.id === id);
  if (!item) return 0;
  if (moneda === "USD") {
    return typeof item.valorUsd === "number" ? item.valorUsd : 0;
  }
  return typeof item.valorArs === "number" ? item.valorArs : 0;
}

/**
 * Mapa completo de precios de referencia para cálculo rápido en dietas y labores
 */
export function getPreciosReferenciaMap(): Record<string, { ars: number; usd: number; unidadArs: string; unidadUsd: string }> {
  const items = getValoresMoviles();
  const map: Record<string, { ars: number; usd: number; unidadArs: string; unidadUsd: string }> = {};
  for (const it of items) {
    map[it.id] = {
      ars: it.valorArs || 0,
      usd: it.valorUsd || 0,
      unidadArs: it.unidadArs,
      unidadUsd: it.unidadUsd,
    };
  }
  return map;
}
