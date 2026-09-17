import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { agricultureData, Activity } from "./agricultureData";

export interface SoilChemicalAnalysis {
  id: string;
  campo: string;
  lote: string; // "Lote 1", "Lote 2", "Lote 3", "Lote 4", "Lote 7", "Racca 2", "Kitty"
  fecha: string;
  laboratorio: string; // "Laboratorio Molisol"
  profundidad: string; // "0-20 cm"
  fosforoBrayPpm: number;
  nNo3Ppm: number;
  nDisponibleKgHa: number;
  ph: number;
  conductividadElectricaUsCm: number;
  materiaOrganicaPct: number;
  azufrePpm: number;
  zincPpm: number;
  calcioPpm: number;
  magnesioPpm: number;
  potasioPpm: number;
  sodioPpm: number;
  cicMeq: number;
  satBasesPct: number;
  boroPpm: number;
  hierroPpm?: number;
  manganesoPpm?: number;
  cobrePpm?: number;
  nTotalPct?: number;
  recomendacionLab?: string;
  observaciones?: string;
}

export interface MoistureEstrato {
  profundidadCm: string; // "0-20", "20-60", "60-100", "100-150", "150-200"
  humedadActualPct: number;
  pmpPct: number;
  ccPct?: number;
  aguaUtilPct: number;
  aguaUtilMm: number;
}

export interface SoilMoistureProfile {
  id: string;
  campo: string;
  lote: string;
  fecha: string;
  laboratorio: string;
  totalAguaUtilMm: number;
  estratos: MoistureEstrato[];
  observaciones?: string;
}

export interface ManureAnalysis {
  id: string;
  protocolo: string; // "E326"
  matriz: string; // "Efluente Tambo - Sólido homogéneo"
  laboratorio: string; // "Clover Laboratorio"
  fecha: string; // "2026-08-23"
  humedadPct: number; // 31.80%
  materiaSecaPct: number; // 68.20%
  nitrogenoTotalPct: number; // 1.20% (12 kg/tn)
  nitrogenoAmoniacalPct: number; // 0.020%
  fosforoTotalPct: number; // 1.00% (10 kg P / tn = 22.9 kg P2O5 / tn)
  potasioTotalPct: number; // 2.47% (24.7 kg K / tn = 29.8 kg K2O / tn)
  azufreTotalPct: number; // 0.22% (2.2 kg S / tn)
  materiaOrganicaPct: number; // 26.40% (264 kg MO / tn)
  carbonoOrganicoPct: number; // 15.30%
  relacionCN: number; // 12.78
  ph: number; // 9.5
  ceUsCm: number; // 3600 uS/cm
  calcioPct: number; // 1.40%
  magnesioPct: number; // 0.68%
  sodioPct: number; // 0.40%
  nitratosPpm: number; // 25 ppm
  sulfatosPct: number; // 0.66%
  zincMgKg: number; // 107.86 mg/kg
  boroMgKg: number; // 57.01 mg/kg
  cobreMgKg: number; // 26.99 mg/kg
  manganesoMgKg: number; // 438.54 mg/kg
  hierroPct: number; // 1.55%
  toneladasPorCarro: number; // 5 tn netas por carro
}

// =========================================================================
// DATOS REALES DE REFERENCIA EXTRAÍDOS DE LOS INFORMES (CLOVER & MOLISOL)
// =========================================================================

export const DEFAULT_MANURE_ANALYSIS: ManureAnalysis = {
  id: "manure-clover-e326",
  protocolo: "E326",
  matriz: "Efluente Tambo - Sólido homogéneo",
  laboratorio: "Clover Laboratorio (El Trébol)",
  fecha: "2026-08-23",
  humedadPct: 31.8,
  materiaSecaPct: 68.2,
  nitrogenoTotalPct: 1.2,
  nitrogenoAmoniacalPct: 0.02,
  fosforoTotalPct: 1.0,
  potasioTotalPct: 2.47,
  azufreTotalPct: 0.22,
  materiaOrganicaPct: 26.4,
  carbonoOrganicoPct: 15.3,
  relacionCN: 12.78,
  ph: 9.5,
  ceUsCm: 3600,
  calcioPct: 1.4,
  magnesioPct: 0.68,
  sodioPct: 0.4,
  nitratosPpm: 25,
  sulfatosPct: 0.66,
  zincMgKg: 107.86,
  boroMgKg: 57.01,
  cobreMgKg: 26.99,
  manganesoMgKg: 438.54,
  hierroPct: 1.55,
  toneladasPorCarro: 5,
};

export const DEFAULT_SOIL_ANALYSES: SoilChemicalAnalysis[] = [
  {
    id: "soil-tambo-lote-1",
    campo: "Tambo",
    lote: "Lote 1",
    fecha: "2026-07-21",
    laboratorio: "Laboratorio Molisol",
    profundidad: "0-20 cm",
    fosforoBrayPpm: 25.5,
    nNo3Ppm: 10.5,
    nDisponibleKgHa: 25.2,
    ph: 6.4,
    conductividadElectricaUsCm: 41,
    materiaOrganicaPct: 2.64,
    azufrePpm: 8.0,
    zincPpm: 0.61,
    calcioPpm: 1811,
    magnesioPpm: 234,
    potasioPpm: 592,
    sodioPpm: 30,
    cicMeq: 17.0,
    satBasesPct: 74.4,
    boroPpm: 0.9,
    observaciones: "Muestreo previo a distribución de enmiendas.",
  },
  {
    id: "soil-tambo-lote-2",
    campo: "Tambo",
    lote: "Lote 2",
    fecha: "2026-07-21",
    laboratorio: "Laboratorio Molisol",
    profundidad: "0-20 cm",
    fosforoBrayPpm: 28.9,
    nNo3Ppm: 24.1,
    nDisponibleKgHa: 57.84,
    ph: 6.51,
    conductividadElectricaUsCm: 45,
    materiaOrganicaPct: 2.75,
    azufrePpm: 10.0,
    zincPpm: 0.75,
    calcioPpm: 2002,
    magnesioPpm: 265,
    potasioPpm: 595,
    sodioPpm: 65,
    cicMeq: 16.1,
    satBasesPct: 87.1,
    boroPpm: 1.2,
    observaciones: "Muestreo previo a distribución de enmiendas.",
  },
  {
    id: "soil-tambo-lote-3",
    campo: "Tambo",
    lote: "Lote 3",
    fecha: "2026-07-21",
    laboratorio: "Laboratorio Molisol",
    profundidad: "0-20 cm",
    fosforoBrayPpm: 30.1,
    nNo3Ppm: 16.5,
    nDisponibleKgHa: 39.6,
    ph: 6.62,
    conductividadElectricaUsCm: 64,
    materiaOrganicaPct: 2.88,
    azufrePpm: 11.1,
    zincPpm: 0.8,
    calcioPpm: 2023,
    magnesioPpm: 245,
    potasioPpm: 605,
    sodioPpm: 65,
    cicMeq: 16.9,
    satBasesPct: 82.8,
    boroPpm: 1.1,
    observaciones: "Muestreo previo a distribución de enmiendas.",
  },
  {
    id: "soil-tambo-lote-4",
    campo: "Tambo",
    lote: "Lote 4",
    fecha: "2026-07-21",
    laboratorio: "Laboratorio Molisol",
    profundidad: "0-20 cm",
    fosforoBrayPpm: 45.0,
    nNo3Ppm: 30.3,
    nDisponibleKgHa: 72.72,
    ph: 6.7,
    conductividadElectricaUsCm: 75,
    materiaOrganicaPct: 3.0,
    azufrePpm: 15.0,
    zincPpm: 1.5,
    calcioPpm: 2242,
    magnesioPpm: 285,
    potasioPpm: 650,
    sodioPpm: 70,
    cicMeq: 17.0,
    satBasesPct: 91.5,
    boroPpm: 1.15,
    observaciones: "Muestreo previo a aplicación masiva de estiércol sólido.",
  },
  {
    id: "soil-tambo-lote-7",
    campo: "Tambo",
    lote: "Lote 7",
    fecha: "2026-07-21",
    laboratorio: "Laboratorio Molisol",
    profundidad: "0-20 cm",
    fosforoBrayPpm: 30.0,
    nNo3Ppm: 26.2,
    nDisponibleKgHa: 62.88,
    ph: 6.75,
    conductividadElectricaUsCm: 81,
    materiaOrganicaPct: 2.7,
    azufrePpm: 13.2,
    zincPpm: 0.9,
    calcioPpm: 2001,
    magnesioPpm: 299,
    potasioPpm: 623,
    sodioPpm: 75,
    cicMeq: 17.0,
    satBasesPct: 84.8,
    boroPpm: 1.22,
    observaciones: "Muestreo previo a aplicación masiva de estiércol y efluente.",
  },
  {
    id: "soil-racca-lote-2",
    campo: "Racca",
    lote: "Lote 2",
    fecha: "2026-08-22",
    laboratorio: "Laboratorio Molisol",
    profundidad: "0-20 cm",
    fosforoBrayPpm: 19.0,
    nNo3Ppm: 9.9,
    nDisponibleKgHa: 45.6,
    ph: 6.1,
    conductividadElectricaUsCm: 61,
    materiaOrganicaPct: 2.52,
    azufrePpm: 6.8,
    zincPpm: 0.51,
    calcioPpm: 1819,
    magnesioPpm: 270,
    potasioPpm: 644,
    sodioPpm: 34,
    cicMeq: 17.3,
    satBasesPct: 76.0,
    boroPpm: 0.74,
    hierroPpm: 63,
    manganesoPpm: 41,
    cobrePpm: 1.02,
    nTotalPct: 0.12,
    recomendacionLab: "Para Maíz 120 qq/ha: MAP c/ S y Zn: 80 kg/ha | Urea: 227 kg/ha",
    observaciones: "Establecimiento Racca - Lote 2.",
  },
  {
    id: "soil-kitty-lote-unico",
    campo: "Kitty",
    lote: "Lote Único",
    fecha: "2026-08-22",
    laboratorio: "Laboratorio Molisol",
    profundidad: "0-20 cm",
    fosforoBrayPpm: 22.0,
    nNo3Ppm: 11.1,
    nDisponibleKgHa: 57.84,
    ph: 6.19,
    conductividadElectricaUsCm: 75,
    materiaOrganicaPct: 2.64,
    azufrePpm: 8.1,
    zincPpm: 0.6,
    calcioPpm: 1833,
    magnesioPpm: 298,
    potasioPpm: 741,
    sodioPpm: 41,
    cicMeq: 17.1,
    satBasesPct: 80.2,
    boroPpm: 0.85,
    hierroPpm: 78,
    manganesoPpm: 51,
    cobrePpm: 1.1,
    nTotalPct: 0.13,
    recomendacionLab: "Para Maíz 120 qq/ha: MAP c/ S y Zn: 80 kg/ha | Urea: 200 kg/ha",
    observaciones: "Establecimiento Kitty - Lote Único.",
  },
];

export const DEFAULT_MOISTURE_PROFILES: SoilMoistureProfile[] = [
  {
    id: "moisture-tambo-lote-1",
    campo: "Tambo",
    lote: "Lote 1",
    fecha: "2026-07-21",
    laboratorio: "Laboratorio Molisol",
    totalAguaUtilMm: 259.3,
    estratos: [
      { profundidadCm: "0-20", humedadActualPct: 25.2, pmpPct: 18.0, aguaUtilPct: 50.8, aguaUtilMm: 18.8 },
      { profundidadCm: "20-60", humedadActualPct: 28.5, pmpPct: 20.0, aguaUtilPct: 61.5, aguaUtilMm: 46.8 },
      { profundidadCm: "60-100", humedadActualPct: 29.5, pmpPct: 19.0, aguaUtilPct: 73.7, aguaUtilMm: 54.6 },
      { profundidadCm: "100-150", humedadActualPct: 28.1, pmpPct: 18.0, aguaUtilPct: 80.8, aguaUtilMm: 68.9 },
      { profundidadCm: "150-200", humedadActualPct: 26.8, pmpPct: 16.0, aguaUtilPct: 90.0, aguaUtilMm: 70.2 },
    ],
  },
  {
    id: "moisture-tambo-lote-3",
    campo: "Tambo",
    lote: "Lote 3",
    fecha: "2026-07-21",
    laboratorio: "Laboratorio Molisol",
    totalAguaUtilMm: 282.4,
    estratos: [
      { profundidadCm: "0-20", humedadActualPct: 25.9, pmpPct: 18.0, aguaUtilPct: 55.5, aguaUtilMm: 20.6 },
      { profundidadCm: "20-60", humedadActualPct: 30.1, pmpPct: 20.0, aguaUtilPct: 72.5, aguaUtilMm: 55.1 },
      { profundidadCm: "60-100", humedadActualPct: 29.5, pmpPct: 19.0, aguaUtilPct: 73.7, aguaUtilMm: 54.6 },
      { profundidadCm: "100-150", humedadActualPct: 29.4, pmpPct: 18.0, aguaUtilPct: 90.7, aguaUtilMm: 77.4 },
      { profundidadCm: "150-200", humedadActualPct: 27.5, pmpPct: 16.0, aguaUtilPct: 95.8, aguaUtilMm: 74.8 },
    ],
  },
  {
    id: "moisture-tambo-lote-4",
    campo: "Tambo",
    lote: "Lote 4",
    fecha: "2026-07-21",
    laboratorio: "Laboratorio Molisol",
    totalAguaUtilMm: 304.4,
    estratos: [
      { profundidadCm: "0-20", humedadActualPct: 27.9, pmpPct: 18.0, aguaUtilPct: 68.9, aguaUtilMm: 25.5 },
      { profundidadCm: "20-60", humedadActualPct: 32.5, pmpPct: 20.0, aguaUtilPct: 88.9, aguaUtilMm: 67.6 },
      { profundidadCm: "60-100", humedadActualPct: 29.0, pmpPct: 19.0, aguaUtilPct: 70.2, aguaUtilMm: 52.0 },
      { profundidadCm: "100-150", humedadActualPct: 30.0, pmpPct: 18.0, aguaUtilPct: 95.2, aguaUtilMm: 81.3 },
      { profundidadCm: "150-200", humedadActualPct: 28.0, pmpPct: 16.0, aguaUtilPct: 100.0, aguaUtilMm: 78.0 },
    ],
  },
  {
    id: "moisture-tambo-lote-7",
    campo: "Tambo",
    lote: "Lote 7",
    fecha: "2026-07-21",
    laboratorio: "Laboratorio Molisol",
    totalAguaUtilMm: 263.1,
    estratos: [
      { profundidadCm: "0-20", humedadActualPct: 27.5, pmpPct: 18.0, aguaUtilPct: 66.2, aguaUtilMm: 24.6 },
      { profundidadCm: "20-60", humedadActualPct: 29.5, pmpPct: 20.0, aguaUtilPct: 68.4, aguaUtilMm: 52.0 },
      { profundidadCm: "60-100", humedadActualPct: 29.0, pmpPct: 19.0, aguaUtilPct: 70.2, aguaUtilMm: 52.0 },
      { profundidadCm: "100-150", humedadActualPct: 27.0, pmpPct: 18.0, aguaUtilPct: 72.4, aguaUtilMm: 61.8 },
      { profundidadCm: "150-200", humedadActualPct: 27.2, pmpPct: 16.0, aguaUtilPct: 93.3, aguaUtilMm: 72.8 },
    ],
  },
  {
    id: "moisture-racca-lote-2",
    campo: "Racca",
    lote: "Lote 2",
    fecha: "2026-08-22",
    laboratorio: "Laboratorio Molisol",
    totalAguaUtilMm: 283.6,
    estratos: [
      { profundidadCm: "0-20", humedadActualPct: 30.0, pmpPct: 17.6, aguaUtilPct: 82.9, aguaUtilMm: 30.8 },
      { profundidadCm: "20-60", humedadActualPct: 31.5, pmpPct: 19.5, aguaUtilPct: 82.1, aguaUtilMm: 62.4 },
      { profundidadCm: "60-100", humedadActualPct: 30.0, pmpPct: 19.0, aguaUtilPct: 77.2, aguaUtilMm: 57.2 },
      { profundidadCm: "100-150", humedadActualPct: 28.0, pmpPct: 17.5, aguaUtilPct: 80.0, aguaUtilMm: 68.3 },
      { profundidadCm: "150-200", humedadActualPct: 26.0, pmpPct: 16.0, aguaUtilPct: 83.3, aguaUtilMm: 65.0 },
    ],
  },
  {
    id: "moisture-kitty-lote-unico",
    campo: "Kitty",
    lote: "Lote Único",
    fecha: "2026-08-22",
    laboratorio: "Laboratorio Molisol",
    totalAguaUtilMm: 321.1,
    estratos: [
      { profundidadCm: "0-20", humedadActualPct: 29.4, pmpPct: 17.6, aguaUtilPct: 78.9, aguaUtilMm: 29.3 },
      { profundidadCm: "20-60", humedadActualPct: 32.0, pmpPct: 19.5, aguaUtilPct: 85.5, aguaUtilMm: 65.0 },
      { profundidadCm: "60-100", humedadActualPct: 31.5, pmpPct: 19.0, aguaUtilPct: 87.7, aguaUtilMm: 65.0 },
      { profundidadCm: "100-150", humedadActualPct: 29.4, pmpPct: 17.5, aguaUtilPct: 90.7, aguaUtilMm: 77.4 },
      { profundidadCm: "150-200", humedadActualPct: 29.0, pmpPct: 16.0, aguaUtilPct: 108.3, aguaUtilMm: 84.5 },
    ],
  },
];

// =========================================================================
// SINCRONIZACIÓN CON LOCALSTORAGE Y CLOUD FIRESTORE
// =========================================================================

const SOIL_STORAGE_KEY = "hjb_soil_analyses_v1";
const MOISTURE_STORAGE_KEY = "hjb_moisture_profiles_v1";
const MANURE_STORAGE_KEY = "hjb_manure_analysis_v1";
export const HJB_SOIL_SYNC_EVENT = "hjb_soil_sync";

export function notifySoilSync() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(HJB_SOIL_SYNC_EVENT));
  }
}

export function listSoilAnalyses(): SoilChemicalAnalysis[] {
  if (typeof window === "undefined") return DEFAULT_SOIL_ANALYSES;
  try {
    const raw = localStorage.getItem(SOIL_STORAGE_KEY);
    if (!raw) return DEFAULT_SOIL_ANALYSES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SOIL_ANALYSES;
  } catch {
    return DEFAULT_SOIL_ANALYSES;
  }
}

export function listMoistureProfiles(): SoilMoistureProfile[] {
  if (typeof window === "undefined") return DEFAULT_MOISTURE_PROFILES;
  try {
    const raw = localStorage.getItem(MOISTURE_STORAGE_KEY);
    if (!raw) return DEFAULT_MOISTURE_PROFILES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MOISTURE_PROFILES;
  } catch {
    return DEFAULT_MOISTURE_PROFILES;
  }
}

export function getManureAnalysis(): ManureAnalysis {
  if (typeof window === "undefined") return DEFAULT_MANURE_ANALYSIS;
  try {
    const raw = localStorage.getItem(MANURE_STORAGE_KEY);
    if (!raw) return DEFAULT_MANURE_ANALYSIS;
    return JSON.parse(raw) || DEFAULT_MANURE_ANALYSIS;
  } catch {
    return DEFAULT_MANURE_ANALYSIS;
  }
}

export function saveSoilAnalysis(record: SoilChemicalAnalysis) {
  if (typeof window === "undefined") return;
  const current = listSoilAnalyses();
  const idx = current.findIndex((x) => x.id === record.id);
  const updated = idx >= 0 ? [...current] : [...current, record];
  if (idx >= 0) updated[idx] = record;
  localStorage.setItem(SOIL_STORAGE_KEY, JSON.stringify(updated));
  notifySoilSync();
  if (db) {
    setDoc(doc(db, "config", "soil_manure_data"), {
      soil_analyses: updated,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(console.error);
  }
}

// Inicializador de sincronización en Firestore
let isSoilSyncInitialized = false;
export function initSoilFirestoreSync() {
  if (typeof window === "undefined" || isSoilSyncInitialized || !db) return;
  isSoilSyncInitialized = true;

  try {
    const docRef = doc(db, "config", "soil_manure_data");
    onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.soil_analyses)) {
            localStorage.setItem(SOIL_STORAGE_KEY, JSON.stringify(data.soil_analyses));
          }
          if (Array.isArray(data.moisture_profiles)) {
            localStorage.setItem(MOISTURE_STORAGE_KEY, JSON.stringify(data.moisture_profiles));
          }
          if (data.manure_analysis && typeof data.manure_analysis === "object") {
            localStorage.setItem(MANURE_STORAGE_KEY, JSON.stringify(data.manure_analysis));
          }
          notifySoilSync();
        } else {
          // Inicializar por primera vez en la nube
          setDoc(docRef, {
            soil_analyses: DEFAULT_SOIL_ANALYSES,
            moisture_profiles: DEFAULT_MOISTURE_PROFILES,
            manure_analysis: DEFAULT_MANURE_ANALYSIS,
            updatedAt: new Date().toISOString(),
          }).catch(console.error);
        }
      },
      (err) => {
        console.warn("Error en sincronización Firestore suelos/estiércol:", err);
      }
    );
  } catch (err) {
    console.warn("Error iniciando soil firestore sync:", err);
  }
}

if (typeof window !== "undefined") {
  setTimeout(() => {
    initSoilFirestoreSync();
  }, 150);
}

// =========================================================================
// CALCULADOR Y RECOMENDADOR NUTRICIONAL AVANZADO (N-P-K Y CARROS RESTANTES)
// =========================================================================

export interface LoteNutrientSummary {
  campo: string;
  lote: string;
  superficieHa: number;
  cultivo: string;
  // Análisis previo de suelo
  sueloPrevio?: SoilChemicalAnalysis;
  perfilHumedad?: SoilMoistureProfile;
  // Enmiendas ya aplicadas
  toneladasSolido: number;
  carrosSolido: number;
  metrosCubicosLiquido: number;
  tanquesLiquido: number;
  // Nutrientes totales aportados
  aportes: {
    nitrogenoKg: number;
    fosforoKg: number;
    potasioKg: number;
    azufreKg: number;
    materiaOrganicaKg: number;
  };
  // Nutrientes por hectárea
  aportesPorHa: {
    nitrogenoKgHa: number;
    fosforoKgHa: number;
    potasioKgHa: number;
    azufreKgHa: number;
    materiaOrganicaTnHa: number;
  };
  // Metas agronómicas recomendadas (según cultivo o lab)
  metaKgHa: {
    nitrogeno: number;
    fosforo: number;
    potasio: number;
  };
  // Estado y recomendación de carros restantes
  carrosRestantesRecomendados: number;
  tanquesRestantesRecomendados: number;
  estadoBalance: "Cubierto con holgura" | "Recomendado aplicar" | "Déficit pendiente";
  mensajeDiagnostico: string;
}

export function computeLoteNutrientSummary(
  campo: string,
  loteNombre: string,
  superficieHa: number,
  cultivo: string = "Maíz Silo"
): LoteNutrientSummary {
  const cClean = campo.toLowerCase();
  const lClean = loteNombre.toLowerCase().replace(/lote\s*/g, "").trim();

  // 1. Buscar análisis de suelo y humedad para este lote
  const soils = listSoilAnalyses();
  const moistures = listMoistureProfiles();
  const manure = getManureAnalysis();

  const sueloPrevio = soils.find((s) => {
    if (s.campo.toLowerCase() !== cClean) return false;
    const sClean = s.lote.toLowerCase().replace(/lote\s*/g, "").trim();
    return sClean === lClean || s.lote.toLowerCase().includes(lClean);
  });

  const perfilHumedad = moistures.find((m) => {
    if (m.campo.toLowerCase() !== cClean) return false;
    const mClean = m.lote.toLowerCase().replace(/lote\s*/g, "").trim();
    return mClean === lClean || m.lote.toLowerCase().includes(lClean);
  });

  // 2. Extraer labores reales de biofertilización ya aplicadas a este lote
  const activities = agricultureData.listActivities();
  const lotesActs = activities.filter((act) => {
    if (act.campo.toLowerCase() !== cClean) return false;
    if (act.tipo !== "Biofertilización") return false;
    if (act.estado === "Cancelada") return false;

    const actLoteClean = (act.lote || "").toLowerCase().replace(/lote\s*/g, "").trim();
    if (actLoteClean === lClean) return true;
    if (act.esGrupal && act.lotesAfectados?.some((la) => la.toLowerCase().includes(lClean))) return true;
    return false;
  });

  let totalTnSolido = 0;
  let totalM3Liquido = 0;

  lotesActs.forEach((act) => {
    act.insumos.forEach((ins) => {
      const pNom = (ins.producto || "").toLowerCase();

      if (pNom.includes("sólido") || pNom.includes("solido") || ins.id === "bio-estiercol-sol") {
        let tn = ins.cantidadTotal || 0;
        if (!tn && ins.dosisReal && act.superficieReal) {
          tn = ins.dosisReal * act.superficieReal;
        }
        totalTnSolido += tn;
      } else if (pNom.includes("líquido") || pNom.includes("liquido") || ins.id === "bio-efluente-liq") {
        let m3 = ins.cantidadTotal || 0;
        if (!m3 && ins.dosisReal && act.superficieReal) {
          m3 = ins.dosisReal * act.superficieReal;
        }
        totalM3Liquido += m3;
      }
    });
  });

  const carrosSolido = Math.round(totalTnSolido / (manure.toneladasPorCarro || 5));
  const tanquesLiquido = Math.round(totalM3Liquido / 12); // Tanque de 12.000 L = 12 m³

  // 3. Cálculo de nutrientes aportados por el estiércol sólido (análisis Clover)
  // N: 1.2% (12 kg/tn), P: 1.0% (10 kg/tn), K: 2.47% (24.7 kg/tn), S: 0.22% (2.2 kg/tn), MO: 26.4% (264 kg/tn)
  const nSolido = totalTnSolido * (manure.nitrogenoTotalPct * 10);
  const pSolido = totalTnSolido * (manure.fosforoTotalPct * 10);
  const kSolido = totalTnSolido * (manure.potasioTotalPct * 10);
  const sSolido = totalTnSolido * (manure.azufreTotalPct * 10);
  const moSolido = totalTnSolido * (manure.materiaOrganicaPct * 10);

  // Aportes de efluente líquido (referencia técnica tambo: 1.8 kg N/m³, 0.6 kg P/m³, 2.2 kg K/m³)
  const nLiquido = totalM3Liquido * 1.8;
  const pLiquido = totalM3Liquido * 0.6;
  const kLiquido = totalM3Liquido * 2.2;
  const sLiquido = totalM3Liquido * 0.2;
  const moLiquido = totalM3Liquido * 15;

  const totalN = Math.round(nSolido + nLiquido);
  const totalP = Math.round(pSolido + pLiquido);
  const totalK = Math.round(kSolido + kLiquido);
  const totalS = Math.round(sSolido + sLiquido);
  const totalMO = Math.round(moSolido + moLiquido);

  const sup = superficieHa > 0 ? superficieHa : 1;
  const nPorHa = Math.round(totalN / sup);
  const pPorHa = Math.round(totalP / sup);
  const kPorHa = Math.round(totalK / sup);
  const sPorHa = Number((totalS / sup).toFixed(1));
  const moTnPorHa = Number((totalMO / 1000 / sup).toFixed(2));

  // 4. Metas nutricionales agronómicas para la campaña (Meta Maíz 120 qq o Silo de alta producción)
  // Demanda estándar N: 200 kg/ha, P: 35 kg/ha (~80 kg P2O5), K: 120 kg/ha
  const metaN = 200;
  const metaP = 35;
  const metaK = 120;

  // Disponibilidad de suelo inicial medida en el laboratorio (a 0-20 cm)
  const nSuelo = sueloPrevio ? sueloPrevio.nDisponibleKgHa : 35; // kg/ha
  const pBraySuelo = sueloPrevio ? sueloPrevio.fosforoBrayPpm : 22; // ppm

  // Balance de Nitrógeno: Meta - (N Suelo + N Aportado enmiendas)
  const deficitN = Math.max(0, metaN - (nSuelo + nPorHa));
  // Balance de Fósforo: Si P Bray > 28 ppm o P aportado > 40 kg/ha, está ampliamente cubierto
  const deficitP = pBraySuelo >= 28 ? 0 : Math.max(0, metaP - pPorHa);

  // Cada carro de 5 tn aporta: 60 kg N y 50 kg P totales
  // Por hectárea en este lote, 1 carro aporta (60 / sup) kg N/ha
  const nPorCarroHa = 60 / sup;
  let carrosRestantes = 0;
  let tanquesRestantes = 0;
  let estadoBalance: "Cubierto con holgura" | "Recomendado aplicar" | "Déficit pendiente" = "Cubierto con holgura";
  let mensajeDiagnostico = "";

  if (nPorHa >= metaN || totalTnSolido >= sup * 35) {
    // Si ya tiene más de 35 tn/ha de estiércol o cubrió la meta de N
    carrosRestantes = 0;
    tanquesRestantes = 0;
    estadoBalance = "Cubierto con holgura";
    mensajeDiagnostico = `¡Nutrición superada con excelente reserva orgánica! Se aplicaron ${carrosSolido} carros (${Math.round(totalTnSolido / sup)} t/ha) y ${tanquesLiquido} tanques. Aporte: ${nPorHa} kg N/ha y ${pPorHa} kg P/ha. No se requieren más carros para esta campaña.`;
  } else if (deficitN > 0 || deficitP > 0) {
    // Faltan nutrientes para la meta
    carrosRestantes = Math.ceil(deficitN / nPorCarroHa);
    // Alternativa con tanques líquidos (cada tanque de 12 m³ aporta aprox 21.6 kg N)
    tanquesRestantes = Math.ceil(deficitN / (21.6 / sup));

    if (totalTnSolido === 0) {
      estadoBalance = "Déficit pendiente";
      mensajeDiagnostico = `Lote sin aplicaciones de estiércol sólido todavía. Suelo inicial: ${nSuelo} kg N/ha y ${pBraySuelo} ppm P Bray. Se recomienda aplicar aprox. ${carrosRestantes} carros de 5 tn (o ${tanquesRestantes} tanques de efluente) para alcanzar el rendimiento potencial de 120 qq/ha.`;
    } else {
      estadoBalance = "Recomendado aplicar";
      mensajeDiagnostico = `Se aplicaron ${carrosSolido} carros, pero aún restan aprox. ${deficitN} kg N/ha para la meta. Se sugiere complementar con ${carrosRestantes} carros más o ${tanquesRestantes} tanques.`;
    }
  } else {
    carrosRestantes = 0;
    tanquesRestantes = 0;
    estadoBalance = "Cubierto con holgura";
    mensajeDiagnostico = `Balance equilibrado. La combinación de fertilidad natural y enmiendas cubre los requerimientos del cultivo planificado.`;
  }

  return {
    campo,
    lote: loteNombre,
    superficieHa,
    cultivo,
    sueloPrevio,
    perfilHumedad,
    toneladasSolido: totalTnSolido,
    carrosSolido,
    metrosCubicosLiquido: totalM3Liquido,
    tanquesLiquido,
    aportes: {
      nitrogenoKg: totalN,
      fosforoKg: totalP,
      potasioKg: totalK,
      azufreKg: totalS,
      materiaOrganicaKg: totalMO,
    },
    aportesPorHa: {
      nitrogenoKgHa: nPorHa,
      fosforoKgHa: pPorHa,
      potasioKgHa: kPorHa,
      azufreKgHa: sPorHa,
      materiaOrganicaTnHa: moTnPorHa,
    },
    metaKgHa: {
      nitrogeno: metaN,
      fosforo: metaP,
      potasio: metaK,
    },
    carrosRestantesRecomendados: carrosRestantes,
    tanquesRestantesRecomendados: tanquesRestantes,
    estadoBalance,
    mensajeDiagnostico,
  };
}
