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
  Racca: ["Lote 1", "Lote 2", "Lote 3", "General"],
  Keuneke: ["Lote 1", "Lote 2", "Lote 3", "General"],
  Kitty: ["Lote Único", "General"],
  Tambo: ["Lote 1", "Lote 2", "Lote 3", "Lote 4", "Lote 5", "Lote 6", "Lote 7", "Lote 8", "Lote 9", "General"]
};

export const ROTACIONES_HISTORICAS = [
  {
    campo: "Keuneke",
    lote: "Lote 1",
    rotaciones: [
      { campana: "2024/25", cultivo: "Trigo → Soja de 2da", rendimiento: "Trigo ~39 qq/ha | Soja 45,59 qq/ha" },
      { campana: "2025/26", cultivo: "Trigo Catalpa → Soja de 2da", rendimiento: "Trigo 59,39 qq/ha | Soja 38,18 qq/ha" },
      { campana: "2026/27", cultivo: "Avena / Soja (En curso)", rendimiento: "Barbecho y siembra avena realizada" }
    ]
  },
  {
    campo: "Keuneke",
    lote: "Lote 2",
    rotaciones: [
      { campana: "2024/25", cultivo: "Soja", rendimiento: "40,06 qq/ha" },
      { campana: "2025/26", cultivo: "Maíz Grano (Stine 9939 VIP3)", rendimiento: "122,49 qq/ha" }
    ]
  },
  {
    campo: "Keuneke",
    lote: "Lote 3",
    rotaciones: [
      { campana: "2025/26", cultivo: "Alfalfa (Forraje Tambo)", rendimiento: "Implantada con CAT (9 ha Keuneke)" }
    ]
  },
  {
    campo: "Racca",
    lote: "Lote 1",
    rotaciones: [
      { campana: "2024/25", cultivo: "Trigo → Soja de 2da", rendimiento: "Trigo 30,62-36 qq/ha | Soja 46,24 qq/ha" },
      { campana: "2025/26", cultivo: "Maíz Grano (Stine 9939 VIP3)", rendimiento: "89,71 qq/ha" }
    ]
  },
  {
    campo: "Racca",
    lote: "Lote 2",
    rotaciones: [
      { campana: "2024/25", cultivo: "Soja (Manejo Alepo)", rendimiento: "35,12 qq/ha" },
      { campana: "2025/26", cultivo: "Trigo Catalpa → Soja de 2da", rendimiento: "Trigo 46,33 qq/ha | Soja 41,00 qq/ha" }
    ]
  },
  {
    campo: "Racca",
    lote: "Lote 3",
    rotaciones: [
      { campana: "2024/25", cultivo: "Maíz Grano", rendimiento: "63,02 qq/ha" },
      { campana: "2025/26", cultivo: "Soja de 1ra → Avena para Rollos", rendimiento: "Soja 44,53 qq/ha | Avena 234 rollos (7,1 r/ha)" }
    ]
  },
  {
    campo: "Kitty",
    lote: "Lote Único",
    rotaciones: [
      { campana: "2024/25", cultivo: "Maíz Grano", rendimiento: "108,07 qq/ha (Récord de campaña)" },
      { campana: "2025/26", cultivo: "Soja de 1ra", rendimiento: "53,00 qq/ha" },
      { campana: "2026/27", cultivo: "Barbecho Campaña", rendimiento: "Realizado 17/05/2026" }
    ]
  },
  {
    campo: "Aguilera",
    lote: "Lote Único",
    rotaciones: [
      { campana: "2024/25", cultivo: "Maíz Grano", rendimiento: "49,16 qq/ha (17 ha)" },
      { campana: "2025/26", cultivo: "Girasol (NS 1109 CL B1 - Disqueado)", rendimiento: "12,80 qq/ha (23,04 t)" },
      { campana: "2026/27", cultivo: "Maíz Grano", rendimiento: "Barbecho realizado 27/06/2026" }
    ]
  },
  {
    campo: "Tambo",
    lote: "Lotes 1 al 9",
    rotaciones: [
      { campana: "2024/25", cultivo: "Maíz Silo + Avena + Alfalfa", rendimiento: "Maíz Silo: 502 metros (13,04 m/ha) | Avena 37 ha" },
      { campana: "2025/26", cultivo: "Maíz Silo + Avena + Alfalfa", rendimiento: "Silo: 548 m totales (L7 1ra: 14,86 m/ha; 1-4: 9,4 m/ha; L7 2da: 10,48 m/ha)" },
      { campana: "2026/27", cultivo: "Rotación Forrajera + Biofertilización", rendimiento: "Biofertilización líquida y sólida en ejecución" }
    ]
  }
];
