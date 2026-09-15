"use client";

export type CategoriaValor =
  | "Macro & Combustibles"
  | "Granos"
  | "Ensilajes & Pasturas"
  | "Rollos Forrajeros"
  | "Pellets & Concentrados"
  | "Líquidos de Fumigación";

export type FuenteValor =
  | "API DolarApi"
  | "API ArgentinaDatos"
  | "API Secretaría de Energía"
  | "API Granos.ar (Pizarra BCR)"
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
  // 2. GRANOS
  // ==========================================
  {
    id: "maiz",
    nombre: "Maíz",
    categoria: "Granos",
    valorArs: 295200,
    valorUsd: 197.13,
    unidadArs: "$/Tn",
    unidadUsd: "USD/Tn",
    fuente: "API Granos.ar (Pizarra BCR)",
    esEditableManual: true,
    nota: "Equiv: $295,20 / kg para mixer",
    fechaActualizacion: "14/9/26",
  },
  {
    id: "soja",
    nombre: "Soja",
    categoria: "Granos",
    valorArs: 555000,
    valorUsd: 370.62,
    unidadArs: "$/Tn",
    unidadUsd: "USD/Tn",
    fuente: "API Granos.ar (Pizarra BCR)",
    esEditableManual: true,
    nota: "Equiv: $555 / kg",
    fechaActualizacion: "14/9/26",
  },
  {
    id: "trigo",
    nombre: "Trigo",
    categoria: "Granos",
    valorArs: 344655,
    valorUsd: 230.15,
    unidadArs: "$/Tn",
    unidadUsd: "USD/Tn",
    fuente: "API Granos.ar (Pizarra BCR)",
    esEditableManual: true,
    nota: "Equiv: $344,65 / kg",
    fechaActualizacion: "14/9/26",
  },
  {
    id: "sorgo",
    nombre: "Sorgo",
    categoria: "Granos",
    valorArs: 275700,
    valorUsd: 184.11,
    unidadArs: "$/Tn",
    unidadUsd: "USD/Tn",
    fuente: "API Granos.ar (Pizarra BCR)",
    esEditableManual: true,
    nota: "Equiv: $275,70 / kg",
    fechaActualizacion: "14/9/26",
  },
  {
    id: "girasol",
    nombre: "Girasol",
    categoria: "Granos",
    valorArs: 756743,
    valorUsd: 505.34,
    unidadArs: "$/Tn",
    unidadUsd: "USD/Tn",
    fuente: "API Granos.ar (Pizarra BCR)",
    esEditableManual: true,
    nota: "Equiv: $756,74 / kg",
    fechaActualizacion: "14/9/26",
  },

  // ==========================================
  // 3. ENSILAJES Y PASTURAS
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
    valorArs: 43.8,
    valorUsd: toUsd(43.8, BASE_TC, 3),
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Alfalfa consumo directo en pastoreo rotativo",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pastura-avena-kg",
    nombre: "Pastura de avena",
    categoria: "Ensilajes & Pasturas",
    valorArs: 31.9,
    valorUsd: toUsd(31.9, BASE_TC, 3),
    unidadArs: "$/kg",
    unidadUsd: "USD/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Verdeo de invierno en pastoreo",
    fechaActualizacion: "18/8/26",
  },

  // ==========================================
  // 4. ROLLOS FORRAJEROS
  // ==========================================
  {
    id: "rollo-alfalfa",
    nombre: "Rollo de alfalfa",
    categoria: "Rollos Forrajeros",
    valorArs: 34500,
    valorUsd: toUsd(34500, BASE_TC, 1),
    unidadArs: "$/Rollo",
    unidadUsd: "USD/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rollo henificado de alfalfa de primera (Equiv. $69 / kg en ~500 kg)",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-avena",
    nombre: "Rollo de avena",
    categoria: "Rollos Forrajeros",
    valorArs: 27600,
    valorUsd: toUsd(27600, BASE_TC, 1),
    unidadArs: "$/Rollo",
    unidadUsd: "USD/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rollo de avena entera henificada (Equiv. $55,20 / kg en ~500 kg)",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-chala-maiz",
    nombre: "Rollo de chala de maíz",
    categoria: "Rollos Forrajeros",
    valorArs: 22000,
    valorUsd: toUsd(22000, BASE_TC, 1),
    unidadArs: "$/Rollo",
    unidadUsd: "USD/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rastrojo de maíz para volumen / mantenimiento (Equiv. $55 / kg en ~400 kg)",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-gramineas",
    nombre: "Rollo de pasto consociado",
    categoria: "Rollos Forrajeros",
    valorArs: 20150,
    valorUsd: toUsd(20150, BASE_TC, 1),
    unidadArs: "$/Rollo",
    unidadUsd: "USD/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rollo de pasto consociado / gramíneas (Equiv. $40 / kg en ~500 kg)",
    fechaActualizacion: "18/8/26",
  },

  // ==========================================
  // 5. PELLETS & CONCENTRADOS
  // ==========================================
  {
    id: "pellet-soja",
    nombre: "Pellet de soja",
    categoria: "Pellets & Concentrados",
    valorArs: 489700,
    valorUsd: 327.56,
    unidadArs: "$/Tn",
    unidadUsd: "USD/Tn",
    fuente: "Manual HJB",
    esEditableManual: true,
    fletePct: 7,
    nota: "Concentrado proteico con 7% flete incluido (Equiv. $489,70 / kg)",
    fechaActualizacion: "14/9/26",
  },
  {
    id: "pellet-trigo",
    nombre: "Pellet de trigo",
    categoria: "Pellets & Concentrados",
    valorArs: 235400,
    valorUsd: 157.46,
    unidadArs: "$/Tn",
    unidadUsd: "USD/Tn",
    fuente: "Manual HJB",
    esEditableManual: true,
    fletePct: 7,
    nota: "Afrechillo / subproducto de molienda con flete (Equiv. $235,40 / kg)",
    fechaActualizacion: "14/9/26",
  },
  {
    id: "semilla-algodon",
    nombre: "Semilla de algodón",
    categoria: "Pellets & Concentrados",
    valorArs: 345000,
    valorUsd: 230.77,
    unidadArs: "$/Tn",
    unidadUsd: "USD/Tn",
    fuente: "Manual HJB",
    esEditableManual: true,
    fletePct: 8,
    nota: "Suplemento graso y proteico tambo con flete (Equiv. $345,00 / kg)",
    fechaActualizacion: "14/9/26",
  },

  // ==========================================
  // 6. LÍQUIDOS DE FUMIGACIÓN
  // ==========================================
  {
    id: "glifosato",
    nombre: "Glifosato",
    categoria: "Líquidos de Fumigación",
    valorArs: 7475,
    valorUsd: 5.0,
    unidadArs: "$/lt",
    unidadUsd: "USD/lt",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Herbicida sistémico no selectivo (control malezas)",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "atrazina",
    nombre: "Atrazina",
    categoria: "Líquidos de Fumigación",
    valorArs: 8225,
    valorUsd: 5.5,
    unidadArs: "$/lt",
    unidadUsd: "USD/lt",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Herbicida pre-emergente maíz y sorgo",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "dos-cuatro-d",
    nombre: "2,4-D",
    categoria: "Líquidos de Fumigación",
    valorArs: 8970,
    valorUsd: 6.0,
    unidadArs: "$/lt",
    unidadUsd: "USD/lt",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Herbicida hormonal para malezas de hoja ancha",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "coadyuvante",
    nombre: "Coadyuvante",
    categoria: "Líquidos de Fumigación",
    valorArs: 5230,
    valorUsd: 3.5,
    unidadArs: "$/lt",
    unidadUsd: "USD/lt",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Tensioactivo / antievaporante para caldo de pulverización",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "cletodim",
    nombre: "Cletodim",
    categoria: "Líquidos de Fumigación",
    valorArs: 14950,
    valorUsd: 10.0,
    unidadArs: "$/lt",
    unidadUsd: "USD/lt",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Graminicida selectivo post-emergente",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "insecticida",
    nombre: "Insecticida",
    categoria: "Líquidos de Fumigación",
    valorArs: 17940,
    valorUsd: 12.0,
    unidadArs: "$/lt",
    unidadUsd: "USD/lt",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Control de orugas y chinches en soja y maíz",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "fungicida",
    nombre: "Fungicida",
    categoria: "Líquidos de Fumigación",
    valorArs: 22425,
    valorUsd: 15.0,
    unidadArs: "$/lt",
    unidadUsd: "USD/lt",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Control de royas y tizón foliar",
    fechaActualizacion: "18/8/26",
  },
];

const STORAGE_KEY = "hjb_valores_moviles_bimonetario_v07";
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
    const nuevoTc = nuevoArs && nuevoArs > 0 ? nuevoArs : BASE_TC;
    copy[idx] = { ...copy[idx], valorArs: nuevoArs, fechaActualizacion: today };
    // Recalcular el resto de los valores ARS basados en su USD
    for (let i = 0; i < copy.length; i++) {
      if (copy[i].id !== "dolar-bna" && copy[i].id !== "inflacion" && copy[i].valorUsd !== null) {
        copy[i] = {
          ...copy[i],
          valorArs: toArs(copy[i].valorUsd, nuevoTc, copy[i].unidadArs.includes("kg") ? 2 : 0),
        };
      }
    }
    return copy;
  }

  const isKg = copy[idx].unidadArs.includes("kg");
  const usdDecimals = isKg ? 3 : 2;
  copy[idx] = {
    ...copy[idx],
    valorArs: nuevoArs,
    valorUsd: toUsd(nuevoArs, tc, usdDecimals),
    fechaActualizacion: today,
  };
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

  const isKg = copy[idx].unidadArs.includes("kg");
  const arsDecimals = isKg ? 2 : 0;
  copy[idx] = {
    ...copy[idx],
    valorUsd: nuevoUsd,
    valorArs: toArs(nuevoUsd, tc, arsDecimals),
    fechaActualizacion: today,
  };
  return copy;
}

export function getLastSyncTime(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_SYNC_KEY);
}

export function setLastSyncTime(timeStr: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_SYNC_KEY, timeStr);
}

export async function syncApisLive(): Promise<{ success: boolean; details: string[] }> {
  const details: string[] = [];
  const items = getValoresMoviles();
  let updated = [...items];
  const today = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

  // 1. Dólar Oficial BNA Divisas Venta
  let tc = BASE_TC;
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/oficial", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.venta === "number" && data.venta > 0) {
        tc = data.venta;
        updated = updated.map((it) =>
          it.id === "dolar-bna"
            ? { ...it, valorArs: tc, valorUsd: 1.0, fechaActualizacion: today }
            : it
        );
        details.push(`Dólar BNA venta: $${tc.toLocaleString("es-AR")}`);
      }
    }
  } catch (err) {
    console.warn("No se pudo obtener Dólar Oficial BNA:", err);
  }

  // 2. Inflación mensual IPC
  try {
    const res = await fetch("https://argentinadatos-proxy.vercel.app/api/finanzas/indices/inflacion", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const last = data[data.length - 1];
        if (typeof last.valor === "number") {
          updated = updated.map((it) =>
            it.id === "inflacion"
              ? { ...it, valorArs: last.valor, valorUsd: last.valor, nota: `IPC mensual (${last.fecha || "último dato"})`, fechaActualizacion: today }
              : it
          );
          details.push(`Inflación IPC: ${last.valor}%`);
        }
      }
    }
  } catch (err) {
    console.warn("No se pudo obtener Inflación:", err);
  }

  // 3. Granos Pizarra Rosario BCR vía granos.ar
  try {
    const res = await fetch("https://api.granos.ar/pizarra/rosario/latest", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const mapPizarra: Record<string, { ars: number; usd?: number }> = {};
      if (Array.isArray(data)) {
        for (const g of data) {
          const name = String(g.grano || g.nombre || "").toLowerCase();
          const precioArs = Number(g.precio || g.valor || g.precioArs);
          if (name && !isNaN(precioArs) && precioArs > 0) {
            mapPizarra[name] = { ars: precioArs, usd: Number(g.precioUsd) || undefined };
          }
        }
      } else if (data && typeof data === "object") {
        for (const [k, v] of Object.entries(data)) {
          const val = v as any;
          const precioArs = Number(val.precio || val.valor || val.precioArs || val);
          if (!isNaN(precioArs) && precioArs > 0) {
            mapPizarra[k.toLowerCase()] = { ars: precioArs, usd: Number(val.precioUsd) || undefined };
          }
        }
      }

      const matchGrano = (id: string, keys: string[]) => {
        for (const k of keys) {
          if (mapPizarra[k]) return mapPizarra[k];
        }
        return null;
      };

      const granosKeys: Record<string, string[]> = {
        maiz: ["maiz", "maíz", "corn"],
        soja: ["soja", "soybean", "soy"],
        trigo: ["trigo", "wheat"],
        sorgo: ["sorgo", "sorghum"],
        girasol: ["girasol", "sunflower"],
      };

      for (const [gId, keys] of Object.entries(granosKeys)) {
        const found = matchGrano(gId, keys);
        if (found) {
          const arsVal = found.ars;
          const usdVal = found.usd && found.usd > 0 ? found.usd : toUsd(arsVal, tc, 2);
          updated = updated.map((it) =>
            it.id === gId
              ? {
                  ...it,
                  valorArs: arsVal,
                  valorUsd: usdVal,
                  fuente: "API Granos.ar (Pizarra BCR)",
                  fechaActualizacion: today,
                }
              : it
          );
          details.push(`${gId.toUpperCase()}: $${arsVal.toLocaleString("es-AR")} / Tn`);
        }
      }
    }
  } catch (err) {
    console.warn("No se pudo sincronizar cotizaciones de granos.ar:", err);
  }

  saveValoresMoviles(updated);
  const timeNow = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) + " hs (" + today + ")";
  setLastSyncTime(timeNow);

  return {
    success: details.length > 0,
    details,
  };
}

export async function checkDailyAutoSync(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const today = new Date().toLocaleDateString("es-AR");
  const lastSync = getLastSyncTime();
  if (!lastSync || !lastSync.includes(today)) {
    try {
      const res = await syncApisLive();
      return res.success;
    } catch {
      return false;
    }
  }
  return false;
}

export function getPrecioReferencia(id: string, moneda: "ARS" | "USD" = "ARS"): number {
  const items = getValoresMoviles();
  let item = items.find((x) => x.id === id);
  if (!item) {
    if (id === "maiz-kg" || id === "maiz-pizarra") item = items.find((x) => x.id === "maiz");
    else if (id === "soja-pizarra") item = items.find((x) => x.id === "soja");
    else if (id === "trigo-pizarra") item = items.find((x) => x.id === "trigo");
    else if (id === "sorgo-pizarra") item = items.find((x) => x.id === "sorgo");
    else if (id === "girasol-pizarra") item = items.find((x) => x.id === "girasol");
    else if (id === "pellet-soja-kg" || id === "pellet-soja-tn") item = items.find((x) => x.id === "pellet-soja");
    else if (id === "pellet-trigo-kg" || id === "pellet-trigo-tn" || id === "pellet-trigo-flete-kg") item = items.find((x) => x.id === "pellet-trigo");
    else if (id === "semilla-algodon-kg" || id === "semilla-algodon-tn" || id === "semilla-algodon-flete-kg") item = items.find((x) => x.id === "semilla-algodon");
    else if (id === "rollo-alfalfa-kg") {
      const parent = items.find((x) => x.id === "rollo-alfalfa");
      if (parent) return moneda === "USD" ? (parent.valorUsd || 0) / 500 : (parent.valorArs || 0) / 500;
    } else if (id === "rollo-avena-kg") {
      const parent = items.find((x) => x.id === "rollo-avena");
      if (parent) return moneda === "USD" ? (parent.valorUsd || 0) / 500 : (parent.valorArs || 0) / 500;
    } else if (id === "rollo-chala-maiz-kg") {
      const parent = items.find((x) => x.id === "rollo-chala-maiz");
      if (parent) return moneda === "USD" ? (parent.valorUsd || 0) / 400 : (parent.valorArs || 0) / 400;
    } else if (id === "rollo-gramineas-kg") {
      const parent = items.find((x) => x.id === "rollo-gramineas");
      if (parent) return moneda === "USD" ? (parent.valorUsd || 0) / 500 : (parent.valorArs || 0) / 500;
    } else if (id === "rollo-alfalfa-rollo") item = items.find((x) => x.id === "rollo-alfalfa");
    else if (id === "rollo-avena-rollo") item = items.find((x) => x.id === "rollo-avena");
    else if (id === "rollo-chala-maiz-rollo") item = items.find((x) => x.id === "rollo-chala-maiz");
    else if (id === "rollo-gramineas-rollo") item = items.find((x) => x.id === "rollo-gramineas");
    else if (id === "silo-maiz-kg") item = items.find((x) => x.id === "silo-maiz-kg");
  }
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
