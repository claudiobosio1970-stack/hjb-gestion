import { HISTORIAL_AGRICOLA_HJB, HistoricalActivity } from "./historicalData";
import { sortActivitiesRecentFirst } from "./dateUtils";
import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";

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
  activities: "hjb_agriculture_activities_v07",
  lotes: "hjb_agriculture_lotes_v02",
  soils: "hjb_agriculture_soils_v04",
  documents: "hjb_agriculture_documents_v04",
  migrated: "hjb_agriculture_migrated_v07",
};

export const INITIAL_LOTES: Lote[] = [
  // Keuneke (57 ha - 2 lotes)
  {
    id: "keuneke-lote-1",
    campo: "Keuneke",
    nombre: "Lote 1",
    superficieHa: 48,
    estado: "Planificado",
    aptitudSuelo: "Agrícola Clase I",
    observaciones: "48 ha",
  },
  {
    id: "keuneke-lote-2",
    campo: "Keuneke",
    nombre: "Lote 2",
    superficieHa: 9,
    estado: "Planificado",
    aptitudSuelo: "Agrícola Clase I",
    observaciones: "9 ha",
  },
  // Racca (100 ha - 4 lotes delimitados de 25 ha)
  {
    id: "racca-lote-1",
    campo: "Racca",
    nombre: "Lote 1",
    superficieHa: 25,
    estado: "Planificado",
    aptitudSuelo: "Agrícola de alta productividad",
    observaciones: "25 ha",
  },
  {
    id: "racca-lote-2",
    campo: "Racca",
    nombre: "Lote 2",
    superficieHa: 25,
    estado: "Planificado",
    aptitudSuelo: "Agrícola de alta productividad",
    observaciones: "25 ha",
  },
  {
    id: "racca-lote-3a",
    campo: "Racca",
    nombre: "Lote 3a",
    superficieHa: 25,
    estado: "Planificado",
    aptitudSuelo: "Agrícola de alta productividad",
    observaciones: "25 ha",
  },
  {
    id: "racca-lote-3b",
    campo: "Racca",
    nombre: "Lote 3b",
    superficieHa: 25,
    estado: "Planificado",
    aptitudSuelo: "Agrícola de alta productividad",
    observaciones: "25 ha",
  },
  // Kitty (29 ha - 1 lote)
  {
    id: "kitty-lote-unico",
    campo: "Kitty",
    nombre: "Lote Único",
    superficieHa: 29,
    estado: "Planificado",
    aptitudSuelo: "Agrícola de alta productividad",
    observaciones: "Lote único de 29 ha",
  },
  // Aguilera (20 ha - 1 lote)
  {
    id: "aguilera-lote-unico",
    campo: "Aguilera",
    nombre: "Lote Único",
    superficieHa: 20,
    estado: "Planificado",
    aptitudSuelo: "Agrícola Clase I-II",
    observaciones: "Lote único de 20 ha",
  },
  // Tambo (73 ha - 9 lotes)
  {
    id: "tambo-lote-1",
    campo: "Tambo",
    nombre: "Lote 1",
    superficieHa: 7,
    estado: "Planificado",
    aptitudSuelo: "Agrícola-Forrajero",
    observaciones: "7 ha",
  },
  {
    id: "tambo-lote-2",
    campo: "Tambo",
    nombre: "Lote 2",
    superficieHa: 10,
    estado: "Planificado",
    aptitudSuelo: "Agrícola-Forrajero",
    observaciones: "10 ha",
  },
  {
    id: "tambo-lote-3",
    campo: "Tambo",
    nombre: "Lote 3",
    superficieHa: 11,
    estado: "Planificado",
    aptitudSuelo: "Agrícola-Forrajero",
    observaciones: "11 ha",
  },
  {
    id: "tambo-lote-4",
    campo: "Tambo",
    nombre: "Lote 4",
    superficieHa: 5,
    estado: "Planificado",
    aptitudSuelo: "Agrícola-Forrajero",
    observaciones: "5 ha",
  },
  {
    id: "tambo-lote-5",
    campo: "Tambo",
    nombre: "Lote 5",
    superficieHa: 3,
    estado: "Planificado",
    aptitudSuelo: "Agrícola-Forrajero",
    observaciones: "3 ha",
  },
  {
    id: "tambo-lote-6",
    campo: "Tambo",
    nombre: "Lote 6",
    superficieHa: 10,
    estado: "Planificado",
    aptitudSuelo: "Agrícola-Forrajero",
    observaciones: "10 ha",
  },
  {
    id: "tambo-lote-7",
    campo: "Tambo",
    nombre: "Lote 7",
    superficieHa: 10,
    estado: "Planificado",
    aptitudSuelo: "Agrícola-Forrajero",
    observaciones: "10 ha",
  },
  {
    id: "tambo-lote-8",
    campo: "Tambo",
    nombre: "Lote 8",
    superficieHa: 10,
    estado: "Planificado",
    aptitudSuelo: "Agrícola-Forrajero",
    observaciones: "10 ha",
  },
  {
    id: "tambo-lote-9",
    campo: "Tambo",
    nombre: "Lote 9",
    superficieHa: 7,
    estado: "Planificado",
    aptitudSuelo: "Agrícola-Forrajero",
    observaciones: "7 ha",
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

export const HJB_AGRICULTURE_SYNC_EVENT = "hjb_agriculture_sync";

export function notifyAgricultureSync() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(HJB_AGRICULTURE_SYNC_EVENT));
  }
}

export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === "object") {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        result[key] = sanitizeForFirestore(value);
      }
    }
    return result as any;
  }
  return data;
}

let isFirestoreSyncInitialized = false;

export function initAgricultureFirestoreSync() {
  if (typeof window === "undefined" || isFirestoreSyncInitialized || !db) return;
  isFirestoreSyncInitialized = true;

  try {
    // 1. Sincronización en vivo de actividades
    const activitiesCol = collection(db, "activities");
    onSnapshot(
      activitiesCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteActivities: Activity[] = [];
          snapshot.forEach((d) => {
            remoteActivities.push(d.data() as Activity);
          });
          const sorted = sortActivitiesRecentFirst(remoteActivities);
          writeArray(KEYS.activities, sorted);
          notifyAgricultureSync();
        } else {
          // Si Firestore está vacío pero el dispositivo ya tiene datos guardados, migrarlos a la nube
          const local = readArray<Activity>(KEYS.activities);
          if (local.length > 0) {
            local.forEach((act) => {
              setDoc(doc(db, "activities", act.id), sanitizeForFirestore(act)).catch(console.error);
            });
          }
        }
      },
      (error) => {
        console.warn("Firestore sync activities error:", error);
      }
    );

    // 2. Sincronización en vivo de lotes
    const lotesCol = collection(db, "lotes");
    onSnapshot(
      lotesCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteLotes: Lote[] = [];
          snapshot.forEach((d) => {
            remoteLotes.push(d.data() as Lote);
          });
          writeArray(KEYS.lotes, remoteLotes);
          notifyAgricultureSync();
        } else {
          // Si no hay lotes en la nube, inicializar con los lotes predeterminados
          INITIAL_LOTES.forEach((lote) => {
            setDoc(doc(db, "lotes", lote.id), sanitizeForFirestore(lote)).catch(console.error);
          });
        }
      },
      (error) => {
        console.warn("Firestore sync lotes error:", error);
      }
    );

    // 3. Sincronización de análisis de suelos
    onSnapshot(
      collection(db, "soils"),
      (snapshot) => {
        if (!snapshot.empty) {
          const remote: SoilAnalysis[] = [];
          snapshot.forEach((d) => remote.push(d.data() as SoilAnalysis));
          writeArray(KEYS.soils, remote);
          notifyAgricultureSync();
        }
      },
      (error) => console.warn("Firestore sync soils error:", error)
    );

    // 4. Sincronización de documentos
    onSnapshot(
      collection(db, "documents"),
      (snapshot) => {
        if (!snapshot.empty) {
          const remote: DocumentRecord[] = [];
          snapshot.forEach((d) => remote.push(d.data() as DocumentRecord));
          writeArray(KEYS.documents, remote);
          notifyAgricultureSync();
        }
      },
      (error) => console.warn("Firestore sync documents error:", error)
    );
  } catch (err) {
    console.error("Error al iniciar sincronización Firestore:", err);
  }
}

function initializeActivities() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(KEYS.migrated)) return;

  // Inicialización limpia para inicio de campaña 2026/27 (sin datos de prueba)
  writeArray(KEYS.activities, []);
  window.localStorage.setItem(KEYS.migrated, "1");
}

// Iniciar sincronización automáticamente en cliente
if (typeof window !== "undefined") {
  setTimeout(() => {
    initAgricultureFirestoreSync();
  }, 100);
}

const localRepository: AgricultureRepository = {
  listActivities() {
    initializeActivities();
    const stored = readArray<Activity>(KEYS.activities);
    return sortActivitiesRecentFirst(stored);
  },

  saveActivity(activity) {
    const all = this.listActivities();
    const index = all.findIndex((x) => x.id === activity.id);
    if (index >= 0) all[index] = activity;
    else all.unshift(activity);
    const sorted = sortActivitiesRecentFirst(all);
    writeArray(KEYS.activities, sorted);
    notifyAgricultureSync();

    if (typeof window !== "undefined" && db) {
      setDoc(doc(db, "activities", activity.id), sanitizeForFirestore(activity)).catch((err) => {
        console.error("Error guardando actividad en Firestore:", err);
      });
    }
  },

  deleteActivity(id) {
    writeArray(KEYS.activities, this.listActivities().filter((x) => x.id !== id));
    notifyAgricultureSync();

    if (typeof window !== "undefined" && db) {
      deleteDoc(doc(db, "activities", id)).catch((err) => {
        console.error("Error eliminando actividad en Firestore:", err);
      });
    }
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
    notifyAgricultureSync();

    if (typeof window !== "undefined" && db) {
      setDoc(doc(db, "lotes", lote.id), sanitizeForFirestore(lote)).catch((err) => {
        console.error("Error guardando lote en Firestore:", err);
      });
    }
  },

  deleteLote(id: string) {
    writeArray(KEYS.lotes, this.listLotes().filter((x) => x.id !== id));
    notifyAgricultureSync();

    if (typeof window !== "undefined" && db) {
      deleteDoc(doc(db, "lotes", id)).catch((err) => {
        console.error("Error eliminando lote en Firestore:", err);
      });
    }
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
    notifyAgricultureSync();

    if (typeof window !== "undefined" && db) {
      setDoc(doc(db, "soils", analysis.id), sanitizeForFirestore(analysis)).catch((err) => {
        console.error("Error guardando análisis de suelo en Firestore:", err);
      });
    }
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
    notifyAgricultureSync();

    if (typeof window !== "undefined" && db) {
      setDoc(doc(db, "documents", document.id), sanitizeForFirestore(document)).catch((err) => {
        console.error("Error guardando documento en Firestore:", err);
      });
    }
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
