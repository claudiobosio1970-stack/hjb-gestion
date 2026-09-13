import { HISTORIAL_AGRICOLA_HJB, HistoricalActivity } from "./historicalData";

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
  listSoilAnalyses(): SoilAnalysis[];
  saveSoilAnalysis(analysis: SoilAnalysis): void;
  listDocuments(): DocumentRecord[];
  saveDocument(document: DocumentRecord): void;
}

const KEYS = {
  activities: "hjb_agriculture_activities_v05",
  soils: "hjb_agriculture_soils_v04",
  documents: "hjb_agriculture_documents_v04",
  migrated: "hjb_agriculture_migrated_v05",
};

const LEGACY_V04_KEY = "hjb_agriculture_activities_v04";

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
    if (stored.length > 0) return stored;
    return HISTORIAL_AGRICOLA_HJB.map(historicalToActivity);
  },

  saveActivity(activity) {
    const all = this.listActivities();
    const index = all.findIndex((x) => x.id === activity.id);
    if (index >= 0) all[index] = activity;
    else all.unshift(activity);
    writeArray(KEYS.activities, all);
  },

  deleteActivity(id) {
    writeArray(KEYS.activities, this.listActivities().filter((x) => x.id !== id));
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
