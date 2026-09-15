export interface CampoGeo {
  id: string;
  nombre: "Aguilera" | "Tambo" | "Racca" | "Kitty" | "Keuneke";
  slug: string;
  superficie: string;
  superficieHa: number;
  lat: number;
  lng: number;
  color: string;
  cultivoPrincipal: string;
  cantLotes: number;
  estado: "Activo" | "Planificado";
  descripcion: string;
}

// Coordenadas iniciales de referencia en la cuenca agrícola-lechera central de Córdoba
export const DEFAULT_CAMPOS_GEO: CampoGeo[] = [
  {
    id: "aguilera",
    nombre: "Aguilera",
    slug: "aguilera",
    superficie: "20 ha",
    superficieHa: 20,
    lat: -31.4285,
    lng: -62.0820,
    color: "#15803d",
    cultivoPrincipal: "Campaña 2026/27 (Lote Único)",
    cantLotes: 1,
    estado: "Activo",
    descripcion: "Campo agrícola con Lote Único de 20 ha.",
  },
  {
    id: "tambo",
    nombre: "Tambo",
    slug: "tambo",
    superficie: "73 ha",
    superficieHa: 73,
    lat: -31.4420,
    lng: -62.0950,
    color: "#2563eb",
    cultivoPrincipal: "9 lotes (Producción forrajera y lechera)",
    cantLotes: 9,
    estado: "Activo",
    descripcion: "Núcleo lechero con rotación forrajera intensiva (73 ha en 9 lotes).",
  },
  {
    id: "racca",
    nombre: "Racca",
    slug: "racca",
    superficie: "100 ha",
    superficieHa: 100,
    lat: -31.4150,
    lng: -62.0650,
    color: "#d97706",
    cultivoPrincipal: "Campaña 2026/27 (2 lotes)",
    cantLotes: 2,
    estado: "Planificado",
    descripcion: "2 lotes de 50 ha cada uno a efectos de siembra (100 ha totales).",
  },
  {
    id: "kitty",
    nombre: "Kitty",
    slug: "kitty",
    superficie: "29 ha",
    superficieHa: 29,
    lat: -31.4350,
    lng: -62.0520,
    color: "#7c3aed",
    cultivoPrincipal: "Campaña 2026/27 (Lote Único)",
    cantLotes: 1,
    estado: "Planificado",
    descripcion: "Campo de 29 ha (Lote Único).",
  },
  {
    id: "keuneke",
    nombre: "Keuneke",
    slug: "keuneke",
    superficie: "57 ha",
    superficieHa: 57,
    lat: -31.4550,
    lng: -62.0720,
    color: "#0891b2",
    cultivoPrincipal: "Campaña 2026/27 (2 lotes)",
    cantLotes: 2,
    estado: "Planificado",
    descripcion: "Suelos Clase I distribuidos en 2 lotes (48 ha y 9 ha, total 57 ha).",
  },
];

export interface LoteGeo {
  id: string;
  campoId: string;
  campoNombre: string;
  nombre: string; // e.g. "3a", "3b", "1", "2"
  superficieHa: number | null; // Carga manual estricta (no cálculo automático de mapa)
  coordenadas: Array<{ lat: number; lng: number }>;
  color?: string;
  cultivo?: string;
  observaciones?: string;
}

// Lotes iniciales pre-configurados (ej. Racca en 4 lotes según foto operativa)
export const DEFAULT_LOTES_GEO: LoteGeo[] = [
  {
    id: "racca-lote-3a",
    campoId: "racca",
    campoNombre: "Racca",
    nombre: "3a",
    superficieHa: 25,
    coordenadas: [
      { lat: -31.4110, lng: -62.0700 },
      { lat: -31.4110, lng: -62.0650 },
      { lat: -31.4150, lng: -62.0650 },
      { lat: -31.4150, lng: -62.0700 },
    ],
    color: "#22c55e",
    cultivo: "Soja 1ra",
    observaciones: "Subdivisión norte-oeste de Racca",
  },
  {
    id: "racca-lote-3b",
    campoId: "racca",
    campoNombre: "Racca",
    nombre: "3b",
    superficieHa: 25,
    coordenadas: [
      { lat: -31.4110, lng: -62.0650 },
      { lat: -31.4110, lng: -62.0600 },
      { lat: -31.4150, lng: -62.0600 },
      { lat: -31.4150, lng: -62.0650 },
    ],
    color: "#22c55e",
    cultivo: "Maíz",
    observaciones: "Subdivisión norte-este de Racca",
  },
  {
    id: "racca-lote-1",
    campoId: "racca",
    campoNombre: "Racca",
    nombre: "1",
    superficieHa: 25,
    coordenadas: [
      { lat: -31.4150, lng: -62.0700 },
      { lat: -31.4150, lng: -62.0650 },
      { lat: -31.4190, lng: -62.0650 },
      { lat: -31.4190, lng: -62.0700 },
    ],
    color: "#22c55e",
    cultivo: "Soja 1ra",
    observaciones: "Subdivisión sur-oeste de Racca",
  },
  {
    id: "racca-lote-2",
    campoId: "racca",
    campoNombre: "Racca",
    nombre: "2",
    superficieHa: 25,
    coordenadas: [
      { lat: -31.4150, lng: -62.0650 },
      { lat: -31.4150, lng: -62.0600 },
      { lat: -31.4190, lng: -62.0600 },
      { lat: -31.4190, lng: -62.0650 },
    ],
    color: "#22c55e",
    cultivo: "Alfalfa",
    observaciones: "Subdivisión sur-este de Racca",
  },
];

const GEO_STORAGE_KEY = "hjb_campos_geo_coords_v1";
const LOTES_GEO_STORAGE_KEY = "hjb_lotes_geo_polygons_v02";

export function getCamposGeo(): CampoGeo[] {
  if (typeof window === "undefined") return DEFAULT_CAMPOS_GEO;
  try {
    const raw = localStorage.getItem(GEO_STORAGE_KEY);
    if (!raw) return DEFAULT_CAMPOS_GEO;
    const overrides = JSON.parse(raw) as Record<string, { lat: number; lng: number }>;
    return DEFAULT_CAMPOS_GEO.map((campo) => {
      const saved = overrides[campo.id];
      if (saved && typeof saved.lat === "number" && typeof saved.lng === "number") {
        return { ...campo, lat: saved.lat, lng: saved.lng };
      }
      return campo;
    });
  } catch {
    return DEFAULT_CAMPOS_GEO;
  }
}

export function saveCampoCoordinates(campoId: string, lat: number, lng: number) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(GEO_STORAGE_KEY);
    const overrides = raw ? JSON.parse(raw) : {};
    overrides[campoId] = { lat, lng };
    localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(overrides));
  } catch (err) {
    console.error("Error guardando coordenadas:", err);
  }
}

export function resetAllCampoCoordinates() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GEO_STORAGE_KEY);
  } catch (err) {
    console.error("Error reseteando coordenadas:", err);
  }
}

// Funciones para gestión de polígonos de Lotes trazados manualmente
export function getLotesGeo(): LoteGeo[] {
  if (typeof window === "undefined") return DEFAULT_LOTES_GEO;
  try {
    const raw = localStorage.getItem(LOTES_GEO_STORAGE_KEY);
    if (!raw) return DEFAULT_LOTES_GEO;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_LOTES_GEO;
  } catch {
    return DEFAULT_LOTES_GEO;
  }
}

export function saveAllLotesGeo(lotes: LoteGeo[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOTES_GEO_STORAGE_KEY, JSON.stringify(lotes));
  } catch (err) {
    console.error("Error guardando lotes delimitados:", err);
  }
}

export function saveLoteGeo(newLote: LoteGeo): LoteGeo[] {
  const current = getLotesGeo();
  const existingIdx = current.findIndex((l) => l.id === newLote.id);
  let updated: LoteGeo[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = newLote;
  } else {
    updated = [...current, newLote];
  }
  saveAllLotesGeo(updated);
  return updated;
}

export function updateLoteCoordinates(loteId: string, coordenadas: Array<{ lat: number; lng: number }>): LoteGeo[] {
  const current = getLotesGeo();
  const updated = current.map((l) => (l.id === loteId ? { ...l, coordenadas } : l));
  saveAllLotesGeo(updated);
  return updated;
}

export function deleteLoteGeo(loteId: string): LoteGeo[] {
  const current = getLotesGeo();
  const updated = current.filter((l) => l.id !== loteId);
  saveAllLotesGeo(updated);
  return updated;
}

export function resetAllLotesGeo(): LoteGeo[] {
  if (typeof window === "undefined") return DEFAULT_LOTES_GEO;
  try {
    localStorage.removeItem(LOTES_GEO_STORAGE_KEY);
  } catch (err) {
    console.error("Error reseteando polígonos de lotes:", err);
  }
  return DEFAULT_LOTES_GEO;
}
