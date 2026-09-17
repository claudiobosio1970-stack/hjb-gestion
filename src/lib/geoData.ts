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

// Coordenadas reales calibradas de los 5 establecimientos HJB (zona Ruta Provincial 40S)
export const DEFAULT_CAMPOS_GEO: CampoGeo[] = [
  {
    id: "aguilera",
    nombre: "Aguilera",
    slug: "aguilera",
    superficie: "20 ha",
    superficieHa: 20,
    lat: -32.2166,
    lng: -61.6031,
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
    lat: -32.1773,
    lng: -61.7697,
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
    lat: -32.2427,
    lng: -61.6073,
    color: "#d97706",
    cultivoPrincipal: "Campaña 2026/27 (2 lotes delimitados)",
    cantLotes: 2,
    estado: "Planificado",
    descripcion: "Establecimiento de 100 ha subdividido en 2 lotes sobre Ruta Provincial 40S.",
  },
  {
    id: "kitty",
    nombre: "Kitty",
    slug: "kitty",
    superficie: "29 ha",
    superficieHa: 29,
    lat: -32.2541,
    lng: -61.6296,
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
    lat: -32.2268,
    lng: -61.7091,
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
  nombre: string; // e.g. "3a", "1", "2", o el nombre del campo si es perímetro
  tipo?: "perimetro_campo" | "lote_interno"; // Perímetro general del campo vs lote interior
  superficieHa: number | null; // Carga manual estricta
  coordenadas: Array<{ lat: number; lng: number }>;
  color?: string;
  cultivo?: string;
  observaciones?: string;
}

// Lotes y perímetros iniciales pre-configurados para los 5 campos (17 lotes reales + 5 perímetros)
export const DEFAULT_LOTES_GEO: LoteGeo[] = [
  // --- RACCA: Perímetro exterior y sus 2 lotes internos (100 ha) ---
  {
    id: "racca-perimetro",
    campoId: "racca",
    campoNombre: "Racca",
    nombre: "Racca",
    tipo: "perimetro_campo",
    superficieHa: 100,
    coordenadas: [
      { lat: -32.2382, lng: -61.6126 },
      { lat: -32.2382, lng: -61.6020 },
      { lat: -32.2472, lng: -61.6020 },
      { lat: -32.2472, lng: -61.6126 },
    ],
    color: "#d97706",
    observaciones: "Perímetro general del establecimiento Racca (100 ha)",
  },
  {
    id: "racca-lote-1",
    campoId: "racca",
    campoNombre: "Racca",
    nombre: "1",
    tipo: "lote_interno",
    superficieHa: 50,
    coordenadas: [
      { lat: -32.2382, lng: -61.6126 },
      { lat: -32.2382, lng: -61.6073 },
      { lat: -32.2472, lng: -61.6073 },
      { lat: -32.2472, lng: -61.6126 },
    ],
    color: "#22c55e",
    cultivo: "Soja 1ra",
    observaciones: "Lote 1 de Racca (50 ha)",
  },
  {
    id: "racca-lote-2",
    campoId: "racca",
    campoNombre: "Racca",
    nombre: "2",
    tipo: "lote_interno",
    superficieHa: 50,
    coordenadas: [
      { lat: -32.2382, lng: -61.6073 },
      { lat: -32.2382, lng: -61.6020 },
      { lat: -32.2472, lng: -61.6020 },
      { lat: -32.2472, lng: -61.6073 },
    ],
    color: "#22c55e",
    cultivo: "Maíz",
    observaciones: "Lote 2 de Racca (50 ha)",
  },

  // --- KEUNEKE: Perímetro exterior y sus 2 lotes internos (57 ha) ---
  {
    id: "keuneke-perimetro",
    campoId: "keuneke",
    campoNombre: "Keuneke",
    nombre: "Keuneke",
    tipo: "perimetro_campo",
    superficieHa: 57,
    coordenadas: [
      { lat: -32.2230, lng: -61.7135 },
      { lat: -32.2230, lng: -61.7045 },
      { lat: -32.2305, lng: -61.7045 },
      { lat: -32.2305, lng: -61.7135 },
    ],
    color: "#0891b2",
    observaciones: "Perímetro general del establecimiento Keuneke (57 ha)",
  },
  {
    id: "keuneke-lote-1",
    campoId: "keuneke",
    campoNombre: "Keuneke",
    nombre: "1",
    tipo: "lote_interno",
    superficieHa: 48,
    coordenadas: [
      { lat: -32.2230, lng: -61.7135 },
      { lat: -32.2230, lng: -61.7065 },
      { lat: -32.2305, lng: -61.7065 },
      { lat: -32.2305, lng: -61.7135 },
    ],
    color: "#22c55e",
    cultivo: "Maíz",
    observaciones: "Lote 1 de Keuneke (48 ha)",
  },
  {
    id: "keuneke-lote-2",
    campoId: "keuneke",
    campoNombre: "Keuneke",
    nombre: "2",
    tipo: "lote_interno",
    superficieHa: 9,
    coordenadas: [
      { lat: -32.2230, lng: -61.7065 },
      { lat: -32.2230, lng: -61.7045 },
      { lat: -32.2305, lng: -61.7045 },
      { lat: -32.2305, lng: -61.7065 },
    ],
    color: "#22c55e",
    cultivo: "Soja 1ra",
    observaciones: "Lote 2 de Keuneke (9 ha)",
  },

  // --- TAMBO: Perímetro exterior y sus 9 lotes internos (73 ha) ---
  {
    id: "tambo-perimetro",
    campoId: "tambo",
    campoNombre: "Tambo",
    nombre: "Tambo",
    tipo: "perimetro_campo",
    superficieHa: 73,
    coordenadas: [
      { lat: -32.1730, lng: -61.7745 },
      { lat: -32.1730, lng: -61.7650 },
      { lat: -32.1816, lng: -61.7650 },
      { lat: -32.1816, lng: -61.7745 },
    ],
    color: "#2563eb",
    observaciones: "Perímetro general del establecimiento Tambo (73 ha)",
  },
  {
    id: "tambo-lote-1",
    campoId: "tambo",
    campoNombre: "Tambo",
    nombre: "1",
    tipo: "lote_interno",
    superficieHa: 7,
    coordenadas: [
      { lat: -32.1730, lng: -61.7745 },
      { lat: -32.1730, lng: -61.7713 },
      { lat: -32.1758, lng: -61.7713 },
      { lat: -32.1758, lng: -61.7745 },
    ],
    color: "#22c55e",
    cultivo: "Alfalfa",
    observaciones: "Lote 1 de Tambo (7 ha - Alfalfa)",
  },
  {
    id: "tambo-lote-2",
    campoId: "tambo",
    campoNombre: "Tambo",
    nombre: "2",
    tipo: "lote_interno",
    superficieHa: 10,
    coordenadas: [
      { lat: -32.1730, lng: -61.7713 },
      { lat: -32.1730, lng: -61.7681 },
      { lat: -32.1758, lng: -61.7681 },
      { lat: -32.1758, lng: -61.7713 },
    ],
    color: "#22c55e",
    cultivo: "Maíz Silo",
    observaciones: "Lote 2 de Tambo (10 ha - Silo Maíz)",
  },
  {
    id: "tambo-lote-3",
    campoId: "tambo",
    campoNombre: "Tambo",
    nombre: "3",
    tipo: "lote_interno",
    superficieHa: 11,
    coordenadas: [
      { lat: -32.1730, lng: -61.7681 },
      { lat: -32.1730, lng: -61.7650 },
      { lat: -32.1758, lng: -61.7650 },
      { lat: -32.1758, lng: -61.7681 },
    ],
    color: "#22c55e",
    cultivo: "Pastura Consociada",
    observaciones: "Lote 3 de Tambo (11 ha - Pastura Consociada)",
  },
  {
    id: "tambo-lote-4",
    campoId: "tambo",
    campoNombre: "Tambo",
    nombre: "4",
    tipo: "lote_interno",
    superficieHa: 5,
    coordenadas: [
      { lat: -32.1758, lng: -61.7745 },
      { lat: -32.1758, lng: -61.7713 },
      { lat: -32.1787, lng: -61.7713 },
      { lat: -32.1787, lng: -61.7745 },
    ],
    color: "#22c55e",
    cultivo: "Verdeo Invierno",
    observaciones: "Lote 4 de Tambo (5 ha - Verdeo Avena)",
  },
  {
    id: "tambo-lote-5",
    campoId: "tambo",
    campoNombre: "Tambo",
    nombre: "5",
    tipo: "lote_interno",
    superficieHa: 3,
    coordenadas: [
      { lat: -32.1758, lng: -61.7713 },
      { lat: -32.1758, lng: -61.7681 },
      { lat: -32.1787, lng: -61.7681 },
      { lat: -32.1787, lng: -61.7713 },
    ],
    color: "#22c55e",
    cultivo: "Alfalfa 2do Año",
    observaciones: "Lote 5 de Tambo (3 ha - Alfalfa)",
  },
  {
    id: "tambo-lote-6",
    campoId: "tambo",
    campoNombre: "Tambo",
    nombre: "6",
    tipo: "lote_interno",
    superficieHa: 10,
    coordenadas: [
      { lat: -32.1758, lng: -61.7681 },
      { lat: -32.1758, lng: -61.7650 },
      { lat: -32.1787, lng: -61.7650 },
      { lat: -32.1787, lng: -61.7681 },
    ],
    color: "#22c55e",
    cultivo: "Bajo Mejorado",
    observaciones: "Lote 6 de Tambo (10 ha - Agropiro/Melilotus)",
  },
  {
    id: "tambo-lote-7",
    campoId: "tambo",
    campoNombre: "Tambo",
    nombre: "7",
    tipo: "lote_interno",
    superficieHa: 10,
    coordenadas: [
      { lat: -32.1787, lng: -61.7745 },
      { lat: -32.1787, lng: -61.7713 },
      { lat: -32.1816, lng: -61.7713 },
      { lat: -32.1816, lng: -61.7745 },
    ],
    color: "#22c55e",
    cultivo: "Sorgo Forrajero BMR",
    observaciones: "Lote 7 de Tambo (10 ha - Sorgo BMR)",
  },
  {
    id: "tambo-lote-8",
    campoId: "tambo",
    campoNombre: "Tambo",
    nombre: "8",
    tipo: "lote_interno",
    superficieHa: 10,
    coordenadas: [
      { lat: -32.1787, lng: -61.7713 },
      { lat: -32.1787, lng: -61.7681 },
      { lat: -32.1816, lng: -61.7681 },
      { lat: -32.1816, lng: -61.7713 },
    ],
    color: "#22c55e",
    cultivo: "Alfalfa Implante",
    observaciones: "Lote 8 de Tambo (10 ha - Alfalfa Implante)",
  },
  {
    id: "tambo-lote-9",
    campoId: "tambo",
    campoNombre: "Tambo",
    nombre: "9",
    tipo: "lote_interno",
    superficieHa: 7,
    coordenadas: [
      { lat: -32.1787, lng: -61.7681 },
      { lat: -32.1787, lng: -61.7650 },
      { lat: -32.1816, lng: -61.7650 },
      { lat: -32.1816, lng: -61.7681 },
    ],
    color: "#22c55e",
    cultivo: "Ryegrass Anual",
    observaciones: "Lote 9 de Tambo (7 ha - Lote Escuela)",
  },

  // --- AGUILERA: Perímetro exterior y Lote Único (20 ha) ---
  {
    id: "aguilera-perimetro",
    campoId: "aguilera",
    campoNombre: "Aguilera",
    nombre: "Aguilera",
    tipo: "perimetro_campo",
    superficieHa: 20,
    coordenadas: [
      { lat: -32.2145, lng: -61.6055 },
      { lat: -32.2145, lng: -61.6007 },
      { lat: -32.2187, lng: -61.6007 },
      { lat: -32.2187, lng: -61.6055 },
    ],
    color: "#15803d",
    observaciones: "Perímetro general del establecimiento Aguilera (20 ha)",
  },
  {
    id: "aguilera-lote-unico",
    campoId: "aguilera",
    campoNombre: "Aguilera",
    nombre: "Lote Único",
    tipo: "lote_interno",
    superficieHa: 20,
    coordenadas: [
      { lat: -32.2145, lng: -61.6055 },
      { lat: -32.2145, lng: -61.6007 },
      { lat: -32.2187, lng: -61.6007 },
      { lat: -32.2187, lng: -61.6055 },
    ],
    color: "#22c55e",
    cultivo: "Soja 1ra / Trigo",
    observaciones: "Lote Único de Aguilera (20 ha)",
  },

  // --- KITTY: Perímetro exterior y Lote Único (29 ha) ---
  {
    id: "kitty-perimetro",
    campoId: "kitty",
    campoNombre: "Kitty",
    nombre: "Kitty",
    tipo: "perimetro_campo",
    superficieHa: 29,
    coordenadas: [
      { lat: -32.2516, lng: -61.6324 },
      { lat: -32.2516, lng: -61.6268 },
      { lat: -32.2566, lng: -61.6268 },
      { lat: -32.2566, lng: -61.6324 },
    ],
    color: "#7c3aed",
    observaciones: "Perímetro general del establecimiento Kitty (29 ha)",
  },
  {
    id: "kitty-lote-unico",
    campoId: "kitty",
    campoNombre: "Kitty",
    nombre: "Lote Único",
    tipo: "lote_interno",
    superficieHa: 29,
    coordenadas: [
      { lat: -32.2516, lng: -61.6324 },
      { lat: -32.2516, lng: -61.6268 },
      { lat: -32.2566, lng: -61.6268 },
      { lat: -32.2566, lng: -61.6324 },
    ],
    color: "#22c55e",
    cultivo: "Maíz Silo Reserva",
    observaciones: "Lote Único de Kitty (29 ha)",
  },
];

import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const GEO_STORAGE_KEY = "hjb_campos_geo_coords_v2";
const LOTES_GEO_STORAGE_KEY = "hjb_lotes_geo_polygons_v04";

export const HJB_GEO_SYNC_EVENT = "hjb_geo_sync";

export function notifyGeoSync() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(HJB_GEO_SYNC_EVENT));
  }
}

let isGeoFirestoreSyncInitialized = false;

export function initGeoFirestoreSync() {
  if (typeof window === "undefined" || isGeoFirestoreSyncInitialized || !db) return;
  isGeoFirestoreSyncInitialized = true;

  try {
    const geoDocRef = doc(db, "config", "geo_data");
    onSnapshot(
      geoDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.campos_coords && typeof data.campos_coords === "object") {
            localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(data.campos_coords));
          }
          if (Array.isArray(data.lotes_geo)) {
            const sanitized = data.lotes_geo.filter((l: any) => l.id !== "racca-lote-3a" && l.id !== "racca-lote-3b");
            localStorage.setItem(LOTES_GEO_STORAGE_KEY, JSON.stringify(sanitized));
          }
          notifyGeoSync();
        } else {
          // Si no hay documento en la nube, inicializarlo una sola vez con los valores predeterminados
          const localCoordsRaw = localStorage.getItem(GEO_STORAGE_KEY);
          const localLotesRaw = localStorage.getItem(LOTES_GEO_STORAGE_KEY);
          const campos_coords = localCoordsRaw ? JSON.parse(localCoordsRaw) : {};
          const lotes_geo = localLotesRaw ? JSON.parse(localLotesRaw) : DEFAULT_LOTES_GEO;

          setDoc(geoDocRef, {
            campos_coords,
            lotes_geo,
            updatedAt: new Date().toISOString(),
          }).catch(console.error);
        }
      },
      (error) => {
        console.warn("Firestore sync geo error:", error);
      }
    );
  } catch (err) {
    console.warn("Error iniciando sincronización geo en Firestore:", err);
  }
}

// Iniciar automáticamente sincronización geo en cliente
if (typeof window !== "undefined") {
  setTimeout(() => {
    initGeoFirestoreSync();
  }, 100);
}

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
    notifyGeoSync();

    if (db) {
      setDoc(doc(db, "config", "geo_data"), { campos_coords: overrides, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
    }
  } catch (err) {
    console.error("Error guardando coordenadas:", err);
  }
}

export function resetAllCampoCoordinates() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GEO_STORAGE_KEY);
    notifyGeoSync();
    if (db) {
      setDoc(doc(db, "config", "geo_data"), { campos_coords: {}, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
    }
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
    if (Array.isArray(parsed) && parsed.length > 0) {
      const sanitized = parsed.filter((l: any) => l.id !== "racca-lote-3a" && l.id !== "racca-lote-3b");
      if (sanitized.length !== parsed.length) {
        localStorage.setItem(LOTES_GEO_STORAGE_KEY, JSON.stringify(sanitized));
      }
      return sanitized;
    }
    return DEFAULT_LOTES_GEO;
  } catch {
    return DEFAULT_LOTES_GEO;
  }
}

export function saveAllLotesGeo(lotes: LoteGeo[]) {
  if (typeof window === "undefined") return;
  try {
    const sanitized = lotes.filter((l) => l.id !== "racca-lote-3a" && l.id !== "racca-lote-3b");
    localStorage.setItem(LOTES_GEO_STORAGE_KEY, JSON.stringify(sanitized));
    notifyGeoSync();
    if (db) {
      setDoc(doc(db, "config", "geo_data"), { lotes_geo: sanitized, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
    }
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
    notifyGeoSync();
    if (db) {
      setDoc(doc(db, "config", "geo_data"), { lotes_geo: DEFAULT_LOTES_GEO, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
    }
  } catch (err) {
    console.error("Error reseteando polígonos de lotes:", err);
  }
  return DEFAULT_LOTES_GEO;
}
