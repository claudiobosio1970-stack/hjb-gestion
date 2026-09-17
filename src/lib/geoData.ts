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
    cultivoPrincipal: "Campaña 2026/27 (4 lotes delimitados)",
    cantLotes: 4,
    estado: "Planificado",
    descripcion: "Establecimiento de 100 ha subdividido en 4 lotes sobre Ruta Provincial 40S.",
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

// Lotes y perímetros iniciales pre-configurados (Racca y Keuneke como referencia)
export const DEFAULT_LOTES_GEO: LoteGeo[] = [
  // --- RACCA: Perímetro exterior y sus 4 lotes internos ---
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
    id: "racca-lote-3a",
    campoId: "racca",
    campoNombre: "Racca",
    nombre: "3a",
    tipo: "lote_interno",
    superficieHa: 25,
    coordenadas: [
      { lat: -32.2382, lng: -61.6126 },
      { lat: -32.2382, lng: -61.6073 },
      { lat: -32.2427, lng: -61.6073 },
      { lat: -32.2427, lng: -61.6126 },
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
    tipo: "lote_interno",
    superficieHa: 25,
    coordenadas: [
      { lat: -32.2382, lng: -61.6073 },
      { lat: -32.2382, lng: -61.6020 },
      { lat: -32.2427, lng: -61.6020 },
      { lat: -32.2427, lng: -61.6073 },
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
    tipo: "lote_interno",
    superficieHa: 25,
    coordenadas: [
      { lat: -32.2427, lng: -61.6126 },
      { lat: -32.2427, lng: -61.6073 },
      { lat: -32.2472, lng: -61.6073 },
      { lat: -32.2472, lng: -61.6126 },
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
    tipo: "lote_interno",
    superficieHa: 25,
    coordenadas: [
      { lat: -32.2427, lng: -61.6073 },
      { lat: -32.2427, lng: -61.6020 },
      { lat: -32.2472, lng: -61.6020 },
      { lat: -32.2472, lng: -61.6073 },
    ],
    color: "#22c55e",
    cultivo: "Alfalfa",
    observaciones: "Subdivisión sur-este de Racca",
  },

  // --- KEUNEKE: Perímetro exterior y sus 2 lotes internos ---
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
          if (Array.isArray(data.lotes_geo) && data.lotes_geo.length > 0) {
            localStorage.setItem(LOTES_GEO_STORAGE_KEY, JSON.stringify(data.lotes_geo));
          }
          notifyGeoSync();
        } else {
          // Si no hay datos en la nube pero este dispositivo ya tiene datos guardados, migrarlos a Firestore
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
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_LOTES_GEO;
  } catch {
    return DEFAULT_LOTES_GEO;
  }
}

export function saveAllLotesGeo(lotes: LoteGeo[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOTES_GEO_STORAGE_KEY, JSON.stringify(lotes));
    notifyGeoSync();
    if (db) {
      setDoc(doc(db, "config", "geo_data"), { lotes_geo: lotes, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
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
