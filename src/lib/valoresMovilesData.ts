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
  valor: number | null; // null si es S/C (Sin Cotización)
  unidad: string;
  valorSecundario?: number | string | null; // ej: U$D 270, o 6% flete
  unidadSecundaria?: string;
  fuente: FuenteValor;
  esEditableManual: boolean;
  origenCalculo?: string;
  nota?: string;
  fechaActualizacion: string;
}

export const VALORES_MOVILES_DEFAULT: ValorMovil[] = [
  // ==========================================
  // 1. MACROECONOMÍA Y COMBUSTIBLE
  // ==========================================
  {
    id: "inflacion",
    nombre: "Inflación Mensual",
    categoria: "Macro & Combustibles",
    valor: 2.1,
    unidad: "%",
    fuente: "API ArgentinaDatos",
    esEditableManual: true,
    nota: "Índice de Precios al Consumidor (IPC)",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "dolar-bna",
    nombre: "Cambio BNA (Divisas venta)",
    categoria: "Macro & Combustibles",
    valor: 1495,
    unidad: "$",
    fuente: "API DolarApi",
    esEditableManual: true,
    nota: "Cotización oficial Banco Nación venta para liquidación",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "gasoil",
    nombre: "Precio gas oil",
    categoria: "Macro & Combustibles",
    valor: 2200,
    unidad: "$/lt",
    fuente: "API Secretaría de Energía",
    esEditableManual: true,
    nota: "Gas Oil Grado 2 a granel / surtidor",
    fechaActualizacion: "18/8/26",
  },

  // ==========================================
  // 2. GRANOS Y CONCENTRADOS (DIETAS)
  // ==========================================
  {
    id: "maiz-kg",
    nombre: "Precio Maíz",
    categoria: "Granos & Concentrados",
    valor: 273,
    unidad: "$/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Grano de maíz puesto en campo / mixer",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pellet-soja-tn",
    nombre: "Precio Pellet de soja [Tn]",
    categoria: "Granos & Concentrados",
    valor: 403650,
    unidad: "$/Tn",
    valorSecundario: 270.0,
    unidadSecundaria: "U$D",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Referencia 270 U$D/Tn",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pellet-soja-kg",
    nombre: "Precio Pellet de soja [$/kg]",
    categoria: "Granos & Concentrados",
    valor: 404,
    unidad: "$/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Calculado de Pellet Tn ($403.650 / 1000)",
    esEditableManual: true,
    nota: "Concentrado proteico tambo",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "semilla-algodon-tn",
    nombre: "Precio de Semilla algodón [$/Tn]",
    categoria: "Granos & Concentrados",
    valor: null,
    unidad: "$/Tn",
    valorSecundario: "S/C",
    unidadSecundaria: "U$D",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Sin cotización actual (S/C)",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "semilla-algodon-kg",
    nombre: "Precio de S algodón [$/kg]",
    categoria: "Granos & Concentrados",
    valor: null,
    unidad: "$/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Sin cotización en origen",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "semilla-algodon-flete-kg",
    nombre: "Precio de S algodón + flete",
    categoria: "Granos & Concentrados",
    valor: 255,
    unidad: "$/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Precio final puesto en tambo con flete incluido",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pellet-trigo-tn",
    nombre: "Precio Pellet de Trigo [Tn]",
    categoria: "Granos & Concentrados",
    valor: 209300,
    unidad: "$/Tn",
    valorSecundario: 140.0,
    unidadSecundaria: "U$D",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Referencia 140 U$D/Tn",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pellet-trigo-kg",
    nombre: "Precio Pellet de Trigo [$/kg]",
    categoria: "Granos & Concentrados",
    valor: 209,
    unidad: "$/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Calculado de Pellet Trigo Tn ($209.300 / 1000)",
    esEditableManual: true,
    nota: "Afrechillo / subproducto de trigo",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pellet-trigo-flete-kg",
    nombre: "Precio Pellet Trigo + flete",
    categoria: "Granos & Concentrados",
    valor: 222,
    unidad: "$/kg",
    valorSecundario: "6%",
    unidadSecundaria: "flete",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Precio con 6% de flete incluido",
    fechaActualizacion: "18/8/26",
  },

  // ==========================================
  // 3. ENSILAJES Y PASTURAS (DIETAS)
  // ==========================================
  {
    id: "silo-maiz-kg",
    nombre: "Precio silo de maíz",
    categoria: "Ensilajes & Pasturas",
    valor: 39.1,
    unidad: "$/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Silaje de planta entera picado fino en silo puente/bolsa",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "silo-avena-kg",
    nombre: "Precio silo de Avena",
    categoria: "Ensilajes & Pasturas",
    valor: 34.6,
    unidad: "$/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Silaje de avena forrajera tambo",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pastura-alfalfa-kg",
    nombre: "Pastura alfalfa",
    categoria: "Ensilajes & Pasturas",
    valor: 13.3,
    unidad: "$/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Pastoreo directo base alfalfa en lote",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "pastura-avena-kg",
    nombre: "Pastura Avena",
    categoria: "Ensilajes & Pasturas",
    valor: 10.6,
    unidad: "$/kg",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Verdeo de invierno en pastoreo",
    fechaActualizacion: "18/8/26",
  },

  // ==========================================
  // 4. ROLLOS FORRAJEROS
  // ==========================================
  {
    id: "rollo-alfalfa-rollo",
    nombre: "Precio Rollo Alfalfa",
    categoria: "Rollos Forrajeros",
    valor: 80600,
    unidad: "$/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rollo de primera calidad confeccionado",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-alfalfa-kg",
    nombre: "Precio Rollo Alfalfa [$/kg]",
    categoria: "Rollos Forrajeros",
    valor: 161,
    unidad: "$/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de $80.600 / ~500 kg",
    esEditableManual: true,
    nota: "Costo por kg de materia henificada",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-avena-rollo",
    nombre: "Precio Rollo Avena",
    categoria: "Rollos Forrajeros",
    valor: 56420,
    unidad: "$/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rollo forrajero confeccionado",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-avena-kg",
    nombre: "Precio Rollo Avena [$/kg]",
    categoria: "Rollos Forrajeros",
    valor: 113,
    unidad: "$/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de $56.420 / ~500 kg",
    esEditableManual: true,
    nota: "Fibra forrajera avena",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-chala-maiz-rollo",
    nombre: "Precio rollo chala maíz",
    categoria: "Rollos Forrajeros",
    valor: 22000,
    unidad: "$/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rastrojo de maíz para mantenimiento/fibra",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-chala-maiz-kg",
    nombre: "Precio Rollo chala [$/kg]",
    categoria: "Rollos Forrajeros",
    valor: 55,
    unidad: "$/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de $22.000 / ~400 kg",
    esEditableManual: true,
    nota: "Fibra de volumen seco",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-gramineas-rollo",
    nombre: "Precio rollo Gramíneas",
    categoria: "Rollos Forrajeros",
    valor: 20150,
    unidad: "$/Rollo",
    fuente: "Manual HJB",
    esEditableManual: true,
    nota: "Rollo de pasto consociado / gramíneas",
    fechaActualizacion: "18/8/26",
  },
  {
    id: "rollo-gramineas-kg",
    nombre: "Precio Rollo Gramíneas [$/kg]",
    categoria: "Rollos Forrajeros",
    valor: 40,
    unidad: "$/kg",
    fuente: "Derivado / Fórmula",
    origenCalculo: "Derivado de $20.150 / ~500 kg",
    esEditableManual: true,
    nota: "Henificado de gramíneas",
    fechaActualizacion: "18/8/26",
  },
];

const STORAGE_KEY = "hjb_valores_moviles_v01";
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

export function updateValorItem(id: string, nuevoValor: number | null, nuevoSecundario?: string | number | null) {
  const current = getValoresMoviles();
  const index = current.findIndex((x) => x.id === id);
  if (index >= 0) {
    const today = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    current[index] = {
      ...current[index],
      valor: nuevoValor,
      valorSecundario: nuevoSecundario !== undefined ? nuevoSecundario : current[index].valorSecundario,
      fechaActualizacion: today,
    };
    // Si se actualizó un valor de Tn, actualizar el $/kg derivado automáticamente
    if (id === "pellet-soja-tn" && typeof nuevoValor === "number") {
      const kgIdx = current.findIndex((x) => x.id === "pellet-soja-kg");
      if (kgIdx >= 0) current[kgIdx].valor = Math.round(nuevoValor / 1000);
    }
    if (id === "pellet-trigo-tn" && typeof nuevoValor === "number") {
      const kgIdx = current.findIndex((x) => x.id === "pellet-trigo-kg");
      if (kgIdx >= 0) current[kgIdx].valor = Math.round(nuevoValor / 1000);
    }
    if (id === "rollo-alfalfa-rollo" && typeof nuevoValor === "number") {
      const kgIdx = current.findIndex((x) => x.id === "rollo-alfalfa-kg");
      if (kgIdx >= 0) current[kgIdx].valor = Math.round(nuevoValor / 500);
    }
    if (id === "rollo-avena-rollo" && typeof nuevoValor === "number") {
      const kgIdx = current.findIndex((x) => x.id === "rollo-avena-kg");
      if (kgIdx >= 0) current[kgIdx].valor = Math.round(nuevoValor / 500);
    }
    if (id === "rollo-chala-maiz-rollo" && typeof nuevoValor === "number") {
      const kgIdx = current.findIndex((x) => x.id === "rollo-chala-maiz-kg");
      if (kgIdx >= 0) current[kgIdx].valor = Math.round(nuevoValor / 400);
    }
    if (id === "rollo-gramineas-rollo" && typeof nuevoValor === "number") {
      const kgIdx = current.findIndex((x) => x.id === "rollo-gramineas-kg");
      if (kgIdx >= 0) current[kgIdx].valor = Math.round(nuevoValor / 500);
    }
    saveValoresMoviles(current);
  }
}

/**
 * Consulta las APIs públicas en vivo y actualiza Dólar BNA, Inflación y Gasoil
 */
export async function syncApisLive(): Promise<{ success: boolean; updatedCount: number; details: string[] }> {
  const current = getValoresMoviles();
  const details: string[] = [];
  let updatedCount = 0;
  const today = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

  // 1. Dólar BNA vía DolarApi
  try {
    const res = await fetch("https://dolarapi.com/v1/ambito/dolares/bna", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const venta = typeof data.venta === "number" ? data.venta : parseFloat(data.venta);
      if (!isNaN(venta)) {
        const idx = current.findIndex((x) => x.id === "dolar-bna");
        if (idx >= 0) {
          current[idx].valor = venta;
          current[idx].fechaActualizacion = today;
          current[idx].fuente = "API DolarApi";
          details.push(`Dólar BNA actualizado a $${venta.toLocaleString("es-AR")}`);
          updatedCount++;
        }
      }
    }
  } catch (err) {
    console.warn("DolarApi fetch warning:", err);
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
            current[idx].valor = last.valor;
            current[idx].fechaActualizacion = today;
            current[idx].nota = `Último IPC publicado (${last.fecha})`;
            current[idx].fuente = "API ArgentinaDatos";
            details.push(`Inflación actualizada a ${last.valor}% (${last.fecha})`);
            updatedCount++;
          }
        }
      }
    }
  } catch (err) {
    console.warn("ArgentinaDatos fetch warning:", err);
  }

  // 3. Combustibles vía datos.energia.gob.ar (con fallback seguro)
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
            current[idx].valor = medianPrice;
            current[idx].fechaActualizacion = today;
            current[idx].fuente = "API Secretaría de Energía";
            details.push(`Gas Oil Grado 2 actualizado a $${medianPrice.toLocaleString("es-AR")}/lt`);
            updatedCount++;
          }
        }
      }
    }
  } catch (err) {
    // Si hay CORS o timeout en datos.energia.gob.ar, mantiene el valor existente sin romper nada
    console.warn("Secretaría de Energía API fetch warning (mantiene valor actual):", err);
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
 * Chequea si corresponde ejecutar la sincronización automática diaria.
 * Si hoy aún no se sincronizó, la ejecuta en segundo plano.
 */
export async function checkDailyAutoSync(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const lastSyncStr = localStorage.getItem(LAST_SYNC_KEY);
  const todayStr = new Date().toISOString().slice(0, 10);

  if (lastSyncStr && lastSyncStr.slice(0, 10) === todayStr) {
    // Ya se sincronizó hoy
    return false;
  }

  // Correr sincronización automática del día
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

/**
 * Devuelve el precio unitario activo en $/kg o $/lt para usar en cualquier cálculo
 */
export function getPrecioUnitario(id: string): number {
  const items = getValoresMoviles();
  const found = items.find((x) => x.id === id);
  return found && typeof found.valor === "number" ? found.valor : 0;
}
