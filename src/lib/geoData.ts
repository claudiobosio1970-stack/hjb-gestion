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
    superficie: "120 ha",
    superficieHa: 120,
    lat: -31.4285,
    lng: -62.0820,
    color: "#15803d",
    cultivoPrincipal: "Maíz 2026/27 (Lote Único)",
    cantLotes: 1,
    estado: "Activo",
    descripcion: "Campo agrícola principal con alta productividad histórica.",
  },
  {
    id: "tambo",
    nombre: "Tambo",
    slug: "tambo",
    superficie: "185 ha",
    superficieHa: 185,
    lat: -31.4420,
    lng: -62.0950,
    color: "#2563eb",
    cultivoPrincipal: "9 lotes (Pasturas consociadas y Maíz silo)",
    cantLotes: 9,
    estado: "Activo",
    descripcion: "Núcleo lechero con rotación forrajera intensiva y aplicación de efluentes.",
  },
  {
    id: "racca",
    nombre: "Racca",
    slug: "racca",
    superficie: "95 ha",
    superficieHa: 95,
    lat: -31.4150,
    lng: -62.0650,
    color: "#d97706",
    cultivoPrincipal: "Racca 2 → Maíz 2026/27",
    cantLotes: 3,
    estado: "Planificado",
    descripcion: "3 lotes subdivididos para maíz grano, avena y rotación.",
  },
  {
    id: "kitty",
    nombre: "Kitty",
    slug: "kitty",
    superficie: "80 ha",
    superficieHa: 80,
    lat: -31.4350,
    lng: -62.0520,
    color: "#7c3aed",
    cultivoPrincipal: "Maíz 2026/27",
    cantLotes: 1,
    estado: "Planificado",
    descripcion: "Lote de alta productividad con récord de rinde maicero.",
  },
  {
    id: "keuneke",
    nombre: "Keuneke",
    slug: "keuneke",
    superficie: "110 ha",
    superficieHa: 110,
    lat: -31.4550,
    lng: -62.0720,
    color: "#0891b2",
    cultivoPrincipal: "Rotación 2026/27 (Trigo/Soja 2da y Maíz)",
    cantLotes: 3,
    estado: "Planificado",
    descripcion: "Suelos Clase I con rotación trigo-soja y alfalfa para tambo.",
  },
];

const GEO_STORAGE_KEY = "hjb_campos_geo_coords_v1";

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
