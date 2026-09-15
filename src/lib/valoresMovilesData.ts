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
  fletePct?: number | null;
  fechaActualizacion: string;
}

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
    nombre: "Inflación",
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
    nombre: "Dólar BNA (Divisas venta)",
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
    nombre: "Gas oil",
    categoria: "Macro & Combustibles",
    valorArs: 2200,
    valorUsd: toUsd(2200, BASE_TC, 2),
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
    nombre: "Maíz",
    categoria: "Granos & Concentrados",
    valorArs: 273,
    valorUsd: toUsd(273, BASE_TC, 3),
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Grano de maíz puesto en mixer",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pellet-soja-tn",
    nombre: "Pellet de soja",
    categoria: "Granos & Concentrados",
    valorArs: 403650,
    valorUsd: 270.0,
    unidadArs: "$/Tn",
    unidadUsd: "USD/Tn",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Concentrado proteico",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pellet-soja-kg",
    nombre: "Pellet de soja",
    categoria: "Granos & Concentrados",
    valorArs: 404,
    valorUsd: 0.27,
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de Pellet Tn / 1000",
    esEditableManual: true,
    nota: "Concentrado proteico por kilo para dietas",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "semilla-algodon-tn",
    nombre: "Semilla de algodón",
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
    nombre: "Semilla de algodón",
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
    nombre: "Semilla de algodón + flete",
    categoria: "Granos & Concentrados",
    valorArs: 255,
    valorUsd: toUsd(255, BASE_TC, 3),
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Semilla de algodón puesta en tambo con flete incluido",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pellet-trigo-tn",
    nombre: "Pellet de trigo",
    categoria: "Granos & Concentrados",
    valorArs: 209300,
    valorUsd: 140.0,
    unidadArs: "$/Tn",
    unidadUsd: "USD/Tn",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Subproducto de trigo",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pellet-trigo-kg",
    nombre: "Pellet de trigo",
    categoria: "Granos & Concentrados",
    valorArs: 209,
    valorUsd: 0.14,
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de Pellet Trigo Tn / 1000",
    esEditableManual: true,
    nota: "Subproducto por kilo para ración",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pellet-trigo-flete-kg",
    nombre: "Pellet de trigo + flete",
    categoria: "Granos & Concentrados",
    valorArs: 222,
    valorUsd: toUsd(222, BASE_TC, 3),
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
    nombre: "Silo de maíz",
    categoria: "Ensilajes & Pasturas",
    valorArs: 39.1,
    valorUsd: toUsd(39.1, BASE_TC, 3),
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Silaje de planta entera picado para mixer",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "silo-avena-kg",
    nombre: "Silo de avena",
    categoria: "Ensilajes & Pasturas",
    valorArs: 34.6,
    valorUsd: toUsd(34.6, BASE_TC, 3),
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Silaje de avena forrajera tambo",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pastura-alfalfa-kg",
    nombre: "Pastura de alfalfa",
    categoria: "Ensilajes & Pasturas",
    valorArs: 13.3,
    valorUsd: toUsd(13.3, BASE_TC, 4),
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Pastoreo directo de alfalfa en lote",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pastura-avena-kg",
    nombre: "Pastura de avena",
    categoria: "Ensilajes & Pasturas",
    valorArs: 10.6,
    valorUsd: toUsd(10.6, BASE_TC, 4),
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
    nombre: "Rollo de alfalfa",
    categoria: "Rollos Forrajeros",
    valorArs: 80600,
    valorUsd: toUsd(80600, BASE_TC, 1),
    unidadArs: "$/Rollo",
    unidadUsd: "USD/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rollo de primera calidad confeccionado",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-alfalfa-kg",
    nombre: "Rollo de alfalfa",
    categoria: "Rollos Forrajeros",
    valorArs: 161,
    valorUsd: toUsd(161, BASE_TC, 3),
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de $80.600 / ~500 kg",
    esEditableManual: true,
    nota: "Costo por kg de materia henificada",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-avena-rollo",
    nombre: "Rollo de avena",
    categoria: "Rollos Forrajeros",
    valorArs: 56420,
    valorUsd: toUsd(56420, BASE_TC, 1),
    unidadArs: "$/Rollo",
    unidadUsd: "USD/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rollo forrajero avena confeccionado",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-avena-kg",
    nombre: "Rollo de avena",
    categoria: "Rollos Forrajeros",
    valorArs: 113,
    valorUsd: toUsd(113, BASE_TC, 3),
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de $56.420 / ~500 kg",
    esEditableManual: true,
    nota: "Fibra forrajera avena por kilo",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-chala-maiz-rollo",
    nombre: "Rollo de chala de maíz",
    categoria: "Rollos Forrajeros",
    valorArs: 22000,
    valorUsd: toUsd(22000, BASE_TC, 1),
    unidadArs: "$/Rollo",
    unidadUsd: "USD/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rastrojo de maíz para volumen / mantenimiento",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-chala-maiz-kg",
    nombre: "Rollo de chala de maíz",
    categoria: "Rollos Forrajeros",
    valorArs: 55,
    valorUsd: toUsd(55, BASE_TC, 3),
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de $22.000 / ~400 kg",
    esEditableManual: true,
    nota: "Fibra de volumen seco por kilo",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-gramineas-rollo",
    nombre: "Rollo de gramíneas",
    categoria: "Rollos Forrajeros",
    valorArs: 20150,
    valorUsd: toUsd(20150, BASE_TC, 1),
    unidadArs: "$/Rollo",
    unidadUsd: "USD/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rollo de pasto consociado / gramíneas",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-gramineas-kg",
    nombre: "Rollo de gramíneas",
    categoria: "Rollos Forrajeros",
    valorArs: 40,
    valorUsd: toUsd(40, BASE_TC, 3),
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de $20.150 / ~500 kg",
    esEditableManual: true,
    nota: "Henificado de gramíneas por kilo",
    fechaActualizacion: "18/8/26",
  },
];

const STORAGE_KEY = "hjb_valores_moviles_bimonetario_v03";
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

export function getDolarBnaVenta(): number {
  const items = getValoresMoviles();
  const found = items.find((x) => x.id === "dolar-bna");
  return found && typeof found.valorArs === "number" && found.valorArs > 0 ? found.valorArs : BASE_TC;
}

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

  recalculateDerivatives(copy, id, tc);
  return copy;
}

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

export async function syncApisLive(): Promise<{ success: boolean; updatedCount: number; details: string[] }> {
  const current = getValoresMoviles();
  const details: string[] = [];
  let updatedCount = 0;
  const today = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  let activeTc = getDolarBnaVenta();

  // 1. Dólar BNA
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

  // 2. Inflación
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

  // 3. Combustibles
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

export function getPrecioReferencia(id: string, moneda: "ARS" | "USD" = "ARS"): number {
  const items = getValoresMoviles();
  const item = items.find((x) => x.id === id);
  if (!item) return 0;
  if (moneda === "USD") {
    return typeof item.valorUsd === "number" ? item.valorUsd : 0;
  }
  return typeof item.valorArs === "number" ? item.valorArs : 0;
}

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
