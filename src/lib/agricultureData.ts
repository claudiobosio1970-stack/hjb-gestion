export type ActivityStatus = "Planificada" | "Realizada" | "Cancelada";

export type ActivityInput = {
  id: string;
  producto: string;
  unidad: string;
  dosisPlanificada: number | null;
  dosisReal: number | null;
};

export type Activity = {
  id: string;
  campo: string;
  campana: string;
  cultivo: string;
  tipo: string;
  estado: ActivityStatus;
  fechaPlanificada: string;
  fechaReal?: string;
  superficiePlanificada: number | null;
  superficieReal: number | null;
  insumos: ActivityInput[];
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
  activities: "hjb_agriculture_activities_v04",
  soils: "hjb_agriculture_soils_v04",
  documents: "hjb_agriculture_documents_v04",
  migrated: "hjb_agriculture_migrated_v04",
};

const LEGACY_ACTIVITY_KEY = "hjb_activities_v02";

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

function migrateLegacyActivities() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(KEYS.migrated)) return;

  const existing = readArray<Activity>(KEYS.activities);
  if (existing.length > 0) {
    window.localStorage.setItem(KEYS.migrated, "1");
    return;
  }

  const legacy = readArray<any>(LEGACY_ACTIVITY_KEY);
  const migrated: Activity[] = legacy.map((item) => ({
    id: item.id,
    campo: item.campo || "Aguilera",
    campana: item.campana || "2026/27",
    cultivo: item.cultivo || "Maíz",
    tipo: item.tipo || "Fertilización",
    estado: item.estado || "Planificada",
    fechaPlanificada: item.fechaPlanificada || "",
    fechaReal: item.fechaReal || "",
    superficiePlanificada: item.superficie ?? null,
    superficieReal: item.estado === "Realizada" ? (item.superficie ?? null) : null,
    insumos: item.producto
      ? [{
          id: crypto.randomUUID(),
          producto: item.producto,
          unidad: "kg/ha",
          dosisPlanificada: item.dosis ?? null,
          dosisReal: item.estado === "Realizada" ? (item.dosis ?? null) : null,
        }]
      : [],
    maquinaria: item.maquinaria || "Sin asignar",
    operador: item.operador || "Sin asignar",
    observaciones: item.observaciones || "",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  }));

  if (migrated.length) writeArray(KEYS.activities, migrated);
  window.localStorage.setItem(KEYS.migrated, "1");
}

const localRepository: AgricultureRepository = {
  listActivities() {
    migrateLegacyActivities();
    return readArray<Activity>(KEYS.activities);
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

/**
 * Único punto de acceso a datos de Agricultura.
 * Hoy: localStorage.
 * Mañana: SQL Connect, sin rehacer las pantallas.
 */
export const agricultureData = localRepository;

export function plannedQuantity(activity: Activity, input: ActivityInput) {
  if (!activity.superficiePlanificada || !input.dosisPlanificada) return null;
  return activity.superficiePlanificada * input.dosisPlanificada;
}

export function realQuantity(activity: Activity, input: ActivityInput) {
  if (!activity.superficieReal || !input.dosisReal) return null;
  return activity.superficieReal * input.dosisReal;
}
