import { HISTORIAL_AGRICOLA_HJB, HistoricalActivity } from "./historicalData";
import { sortActivitiesRecentFirst } from "./dateUtils";

export type ActivityStatus = "Planificada" | "Realizada" | "Cancelada";

export type ActivityInput = {
  id: string;
  producto: string;
  unidad: string;
  dosisPlanificada: number | null;
  dosisReal: number | null;
  cantidadTotal?: number | null;
  unidadTotal?: string;
  esDosisDerivada?: boolean;
  observacion?: string;
};

export type Activity = {
  id: string;
  campo: string;
  lote?: string;
  campana: string;
  cultivo: string;
  cultivoAntecesor?: string;
  tipo: string;
  estado: ActivityStatus;
  fechaPlanificada: string;
  fechaReal?: string;
  superficiePlanificada: number | null;
  superficieReal: number | null;
  superficieNota?: string;
  insumos: ActivityInput[];
  metodoAplicacion?: "Terrestre" | "Aérea";
  esGrupal?: boolean;
  lotesAfectados?: string[];
  produccion?: {
    cantidad: number | null;
    unidad: string;
    rendimiento: number | null;
    unidadRendimiento: string;
    destino?: string;
  };
  discrepancia?: string;
  maquinaria?: string;
  operador?: string;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
};

export type LoteStatus = "En producción" | "Barbecho / Descanso" | "Pastoreo" | "Implantación" | "Planificado";

export type Lote = {
  id: string;
  campo: string;
  nombre: string;
  superficieHa: number | null;
  cultivoActual?: string;
  estado: LoteStatus;
  aptitudSuelo?: string;
  observaciones?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SoilParameter = {
  id: string;
  nombre: string;
  valor: string;
  unidad: string;
};

export type SoilAnalysis = {
  id: string;
  campo: string;
  campana: string;
  fecha: string;
  laboratorio: string;
  profundidad: string;
  parametros: SoilParameter[];
  observaciones?: string;
  createdAt: string;
};

export type DocumentRecord = {
  id: string;
  campo: string;
  campana: string;
  nombre: string;
  tipo: string;
  fecha: string;
  archivoNombre?: string;
  observaciones?: string;
  createdAt: string;
};

export interface AgricultureRepository {
  listActivities(): Activity[];
  saveActivity(activity: Activity): void;
  deleteActivity(id: string): void;
  listLotes(campo?: string): Lote[];
  saveLote(lote: Lote): void;
  deleteLote(id: string): void;
  listSoilAnalyses(): SoilAnalysis[];
  saveSoilAnalysis(analysis: SoilAnalysis): void;
  listDocuments(): DocumentRecord[];
  saveDocument(document: DocumentRecord): void;
}

const KEYS = {
  activities: "hjb_agriculture_activities_v06",
  lotes: "hjb_agriculture_lotes_v01",
  soils: "hjb_agriculture_soils_v04",
  documents: "hjb_agriculture_documents_v04",
  migrated: "hjb_agriculture_migrated_v06",
};

const LEGACY_V04_KEY = "hjb_agriculture_activities_v04";

export const INITIAL_LOTES: Lote[] = [
  // Aguilera
  {
    id: "aguilera-lote-unico",
    campo: "Aguilera",
    nombre: "Lote Único",
    superficieHa: 120,
    cultivoActual: "Maíz Grano",
    estado: "En producción",
    aptitudSuelo: "Agrícola Clase I-II",
    observaciones: "Rotación Maíz / Girasol histórica",
  },
  // Racca
  {
    id: "racca-lote-1",
    campo: "Racca",
    nombre: "Lote 1",
    superficieHa: 38,
    cultivoActual: "Maíz Grano",
    estado: "En producción",
    aptitudSuelo: "Agrícola de alta productividad",
    observaciones: "Trigo -> Soja 2da -> Maíz Stine 9939",
  },
  {
    id: "racca-lote-2",
    campo: "Racca",
    nombre: "Lote 2",
    superficieHa: 32,
    cultivoActual: "Soja de 2da",
    estado: "En producción",
    aptitudSuelo: "Agrícola",
    observaciones: "Manejo específico Alepo con doble golpe",
  },
  {
    id: "racca-lote-3",
    campo: "Racca",
    nombre: "Lote 3",
    superficieHa: 25,
    cultivoActual: "Avena para Rollos",
    estado: "Pastoreo",
    aptitudSuelo: "Agrícola-Forrajero",
    observaciones: "Maíz Grano / Avena rollos (234 rollos)",
  },
  // Keuneke
  {
    id: "keuneke-lote-1",
    campo: "Keuneke",
    nombre: "Lote 1",
    superficieHa: 45,
    cultivoActual: "Avena / Soja",
    estado: "En producción",
    aptitudSuelo: "Agrícola Clase I",
    observaciones: "Trigo Catalpa -> Soja de 2da (45,59 qq/ha)",
  },
  {
    id: "keuneke-lote-2",
    campo: "Keuneke",
    nombre: "Lote 2",
    superficieHa: 40,
    cultivoActual: "Maíz Grano",
    estado: "En producción",
    aptitudSuelo: "Agrícola Clase I",
    observaciones: "Récord histórico maíz 122,49 qq/ha",
  },
  {
    id: "keuneke-lote-3",
    campo: "Keuneke",
    nombre: "Lote 3",
    superficieHa: 9,
    cultivoActual: "Alfalfa Forraje Tambo",
    estado: "En producción",
    aptitudSuelo: "Agrícola-Forrajero",
    observaciones: "Alfalfa implantada con CAT",
  },
  // Kitty
  {
    id: "kitty-lote-unico",
    campo: "Kitty",
    nombre: "Lote Único",
    superficieHa: 80,
    cultivoActual: "Maíz Grano",
    estado: "En producción",
    aptitudSuelo: "Agrícola de alta productividad",
    observaciones: "Récord histórico de rinde (108,07 qq/ha)",
  },
  // Tambo
  {
    id: "tambo-lote-1",
    campo: "Tambo",
    nombre: "Lote 1",
    superficieHa: 20,
    cultivoActual: "Maíz Silo",
    estado: "En producción",
    aptitudSuelo: "Agrícola-Forrajero",
    observaciones: "Sector fertilizado con efluente líquido",
  },
  {
    id: "tambo-lote-2",
    campo: "Tambo",
    nombre: "Lote 2",
    superficieHa: 22,
    cultivoActual: "Alfalfa",
    estado: "En producción",
    aptitudSuelo: "Forrajero Tambo",
    observaciones: "Pastura base alfalfa en rotación",
  },
  {
    id: "tambo-lote-3",
    campo: "Tambo",
    nombre: "Lote 3",
    superficieHa: 18,
    cultivoActual: "Avena Forrajera",
    estado: "Pastoreo",
    aptitudSuelo: "Forrajero",
    observaciones: "Pastoreo directo rodeo lechero",
  },
  {
    id: "tambo-lote-4",
    campo: "Tambo",
    nombre: "Lote 4",
    superficieHa: 20,
    cultivoActual: "Maíz Silo",
    estado: "En producción",
    aptitudSuelo: "Agrícola-Forrajero",
    observaciones: "Silaje de planta entera para reserva",
  },
  {
    id: "tambo-lote-5",
    campo: "Tambo",
    nombre: "Lote 5",
    superficieHa: 25,
    cultivoActual: "Pastura Consociada",
    estado: "Pastoreo",
    aptitudSuelo: "Forrajero Tambo",
    observaciones: "Rotación pastoreo intensivo",
  },
  {
    id: "tambo-lote-6",
    campo: "Tambo",
    nombre: "Lote 6",
    superficieHa: 20,
    cultivoActual: "Maíz Silo",
    estado: "En producción",
    aptitudSuelo: "Agrícola-Forrajero",
    observaciones: "Aplicación de estiércol sólido Fliegl",
  },
  {
    id: "tambo-lote-7",
    campo: "Tambo",
    nombre: "Lote 7",
    superficieHa: 24,
    cultivoActual: "Maíz Silo 1ra y 2da",
    estado: "En producción",
    aptitudSuelo: "Agrícola-Forrajero",
    observaciones: "Rinde silo 14,86 m/ha en 1ra y 10,48 en 2da",
  },
  {
    id: "tambo-lote-8",
    campo: "Tambo",
    nombre: "Lote 8",
    superficieHa: 16,
    cultivoActual: "Alfalfa",
    estado: "En producción",
    aptitudSuelo: "Forrajero",
    observaciones: "Corte y confección de rollos / henificado",
  },
  {
    id: "tambo-lote-9",
    campo: "Tambo",
    nombre: "Lote 9",
    superficieHa: 20,
    cultivoActual: "Avena / Forraje",
    estado: "Pastoreo",
    aptitudSuelo: "Forrajero",
    observaciones: "Verdeo de invierno para tambo",
  },
];

export function historicalToActivity(h: HistoricalActivity): Activity {
  return {
    id: h.id,
    campo: h.campo,
    lote: h.lote,
    campana: h.campana,
    cultivo: h.cultivo,
    cultivoAntecesor: h.cultivoAntecesor,
    tipo: h.tipo,
    estado: h.estado,
    fechaPlanificada: h.estado === "Planificada" ? h.fecha : "",
    fechaReal: h.estado === "Realizada" ? h.fecha : "",
    superficiePlanificada: h.superficie,
    superficieReal: h.estado === "Realizada" ? h.superficie : null,
    superficieNota: h.superficieNota,
    insumos: h.insumos.map((ins, idx) => ({
      id: `${h.id}-in-${idx}`,
      producto: ins.producto,
      unidad: ins.unidad,
      dosisPlanificada: ins.dosis,
      dosisReal: h.estado === "Realizada" ? ins.dosis : null,
      cantidadTotal: ins.cantidadTotal,
      unidadTotal: ins.unidadTotal,
      esDosisDerivada: ins.esDosisDerivada,
      observacion: ins.observacion,
    })),
    metodoAplicacion: h.metodoAplicacion,
    esGrupal: h.esGrupal,
    lotesAfectados: h.lotesAfectados,
    produccion: h.produccion ? {
      cantidad: h.produccion.cantidad,
      unidad: h.produccion.unidad,
      rendimiento: h.produccion.rendimiento,
      unidadRendimiento: h.produccion.unidadRendimiento,
      destino: h.produccion.destino,
    } : undefined,
    discrepancia: h.discrepancia,
    maquinaria: "Sin asignar",
    operador: "Sin asignar",
    observaciones: h.observaciones,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function initializeActivities() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(KEYS.migrated)) return;

  const baseHistorical: Activity[] = HISTORIAL_AGRICOLA_HJB.map(historicalToActivity);
  const existingV04 = readArray<Activity>(LEGACY_V04_KEY);

  const historyIds = new Set(baseHistorical.map((x) => x.id));
  const userAdded = existingV04.filter((x) => !historyIds.has(x.id));

  const consolidated = [...userAdded, ...baseHistorical];
  writeArray(KEYS.activities, consolidated);
  window.localStorage.setItem(KEYS.migrated, "1");
}

const localRepository: AgricultureRepository = {
  listActivities() {
    initializeActivities();
    const stored = readArray<Activity>(KEYS.activities);
    const list = stored.length > 0 ? stored : HISTORIAL_AGRICOLA_HJB.map(historicalToActivity);
    return sortActivitiesRecentFirst(list);
  },

  saveActivity(activity) {
    const all = this.listActivities();
    const index = all.findIndex((x) => x.id === activity.id);
    if (index >= 0) all[index] = activity;
    else all.unshift(activity);
    const sorted = sortActivitiesRecentFirst(all);
    writeArray(KEYS.activities, sorted);
  },

  deleteActivity(id) {
    writeArray(KEYS.activities, this.listActivities().filter((x) => x.id !== id));
  },

  listLotes(campo?: string) {
    if (typeof window === "undefined") {
      return campo
        ? INITIAL_LOTES.filter((x) => x.campo.toLowerCase() === campo.toLowerCase())
        : INITIAL_LOTES;
    }
    const stored = readArray<Lote>(KEYS.lotes);
    const lotes = stored.length > 0 ? stored : INITIAL_LOTES;
    if (!campo) return lotes;
    return lotes.filter((x) => x.campo.toLowerCase() === campo.toLowerCase());
  },

  saveLote(lote: Lote) {
    const all = this.listLotes();
    const index = all.findIndex((x) => x.id === lote.id);
    if (index >= 0) all[index] = lote;
    else all.push(lote);
    writeArray(KEYS.lotes, all);
  },

  deleteLote(id: string) {
    writeArray(KEYS.lotes, this.listLotes().filter((x) => x.id !== id));
  },

  listSoilAnalyses() {
    return readArray<SoilAnalysis>(KEYS.soils);
  },

  saveSoilAnalysis(analysis) {
    const all = this.listSoilAnalyses();
    const index = all.findIndex((x) => x.id === analysis.id);
    if (index >= 0) all[index] = analysis;
    else all.unshift(analysis);
    writeArray(KEYS.soils, all);
  },

  listDocuments() {
    return readArray<DocumentRecord>(KEYS.documents);
  },

  saveDocument(document) {
    const all = this.listDocuments();
    const index = all.findIndex((x) => x.id === document.id);
    if (index >= 0) all[index] = document;
    else all.unshift(document);
    writeArray(KEYS.documents, all);
  },
};

export const agricultureData = localRepository;

export function plannedQuantity(activity: Activity, input: ActivityInput) {
  if (input.cantidadTotal) return input.cantidadTotal;
  if (!activity.superficiePlanificada || !input.dosisPlanificada) return null;
  return activity.superficiePlanificada * input.dosisPlanificada;
}

export function realQuantity(activity: Activity, input: ActivityInput) {
  if (input.cantidadTotal && activity.estado === "Realizada") return input.cantidadTotal;
  if (!activity.superficieReal || !input.dosisReal) return null;
  return activity.superficieReal * input.dosisReal;
}
