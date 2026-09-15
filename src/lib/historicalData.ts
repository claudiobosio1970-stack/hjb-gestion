export interface HistoricalActivity {
  id: string;
  campo: "Aguilera" | "Racca" | "Keuneke" | "Kitty" | "Tambo";
  lote: string; // ej: "Lote 1", "Lote 2", "General", "Lotes 1+2"
  campana: "2024/25" | "2025/26" | "2026/27";
  cultivo: string;
  cultivoAntecesor?: string;
  tipo: "Barbecho" | "Laboreo" | "Siembra" | "Fertilización" | "Biofertilización" | "Fumigación" | "Cosecha" | "Picado" | "Rollos";
  estado: "Realizada" | "Planificada";
  fecha: string; // Fecha exacta o aproximada
  superficie: number | null; // ha
  superficieNota?: string;
  insumos: {
    producto: string;
    dosis: number | null;
    unidad: string;
    cantidadTotal?: number | null;
    unidadTotal?: string;
    esDosisDerivada?: boolean;
    observacion?: string;
  }[];
  metodoAplicacion?: "Terrestre" | "Aérea";
  esGrupal?: boolean;
  lotesAfectados?: string[];
  produccion?: {
    cantidad: number | null;
    unidad: "kg" | "t" | "metros silo" | "rollos";
    rendimiento: number | null;
    unidadRendimiento: "qq/ha" | "m/ha" | "rollos/ha";
    destino?: "Grano" | "Silo" | "Rollos" | "Pastoreo" | "Forraje Tambo";
  };
  discrepancia?: string; // Para diferencias entre planillas históricas
  observaciones?: string;
}

export const HISTORIAL_AGRICOLA_HJB: HistoricalActivity[] = [];

export const LOTES_POR_CAMPO: Record<string, string[]> = {
  Aguilera: ["Lote Único"],
  Racca: ["Lote 1", "Lote 2"],
  Keuneke: ["Lote 1", "Lote 2"],
  Kitty: ["Lote Único"],
  Tambo: ["Lote 1", "Lote 2", "Lote 3", "Lote 4", "Lote 5", "Lote 6", "Lote 7", "Lote 8", "Lote 9"]
};

export interface RotacionHistoricaItem {
  campo: string;
  lote: string;
  rotaciones: {
    campana: string;
    cultivo: string;
    rendimiento?: string;
  }[];
}

export const ROTACIONES_HISTORICAS: RotacionHistoricaItem[] = [];
