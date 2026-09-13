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

export const HISTORIAL_AGRICOLA_HJB: HistoricalActivity[] = [
  // ========================================================================
  // CAMPAÑA 2024/25 — KEUNEKE LOTE 1 (TRIGO -> SOJA)
  // ========================================================================
  {
    id: "knk1-2425-trigo-siembra",
    campo: "Keuneke",
    lote: "Lote 1",
    campana: "2024/25",
    cultivo: "Trigo",
    tipo: "Siembra",
    estado: "Realizada",
    fecha: "Invierno 2024",
    superficie: 28.5,
    superficieNota: "Aproximadamente 28-29 ha según distintas hojas",
    insumos: [
      {
        producto: "Semilla Trigo Baguette 620",
        dosis: 125,
        unidad: "kg/ha",
        observacion: "Material utilizado/referenciado. En cotizaciones aparecían alternativas Catalpa y Pehuén (no sembradas)."
      }
    ],
    discrepancia: "Superficie registrada: 28 ha en una planilla, 29 ha en otra.",
    observaciones: "Siembra de trigo ciclo 1."
  },
  {
    id: "knk1-2425-trigo-fert",
    campo: "Keuneke",
    lote: "Lote 1",
    campana: "2024/25",
    cultivo: "Trigo",
    tipo: "Fertilización",
    estado: "Realizada",
    fecha: "Invierno 2024",
    superficie: 28.5,
    insumos: [
      { producto: "Urea", dosis: 120, unidad: "kg/ha" },
      { producto: "Arrancador / MicroEssentials", dosis: 40, unidad: "kg/ha" },
      { producto: "Super Simple", dosis: 60, unidad: "kg/ha", observacion: "Aparece en algunos registros históricos" }
    ],
    observaciones: "Existen referencias a Nutrimax y Nitrocomplex como alternativas no aplicadas."
  },
  {
    id: "knk1-2425-trigo-cosecha",
    campo: "Keuneke",
    lote: "Lote 1",
    campana: "2024/25",
    cultivo: "Trigo",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Fin 2024",
    superficie: 28.5,
    insumos: [],
    produccion: {
      cantidad: 110229,
      unidad: "kg",
      rendimiento: 39.37,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    discrepancia: "Si se calcula con 28 ha da 39,37 qq/ha. Si se calcula con 29 ha da 38,01 qq/ha.",
    observaciones: "Cosecha de trigo finalizada."
  },

  // SOJA KEUNEKE 1 (2024/25)
  {
    id: "knk1-2425-soja-siembra",
    campo: "Keuneke",
    lote: "Lote 1",
    campana: "2024/25",
    cultivo: "Soja",
    cultivoAntecesor: "Trigo",
    tipo: "Siembra",
    estado: "Realizada",
    fecha: "Diciembre 2024",
    superficie: 29,
    insumos: [
      {
        producto: "Semilla Soja Don Mario 47E23",
        dosis: null,
        unidad: "kg/ha",
        observacion: "Compra general campaña: 11 bolsones de ~800 kg (8.800 kg totales sin reparto por lote especificado)."
      }
    ],
    observaciones: "Soja de segunda sobre rastrojo de trigo."
  },
  {
    id: "knk1-2-2425-soja-fum1",
    campo: "Keuneke",
    lote: "Lote 1 + Lote 2",
    campana: "2024/25",
    cultivo: "Soja",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "Diciembre 2024",
    superficie: 60,
    esGrupal: true,
    lotesAfectados: ["Keuneke Lote 1", "Keuneke Lote 2"],
    metodoAplicacion: "Terrestre",
    insumos: [
      { producto: "Saltun", dosis: 0.27, unidad: "L/ha", cantidadTotal: 16, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Dédalo Elite", dosis: 1.73, unidad: "L/ha", cantidadTotal: 104, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Glifosato Premium", dosis: 1.60, unidad: "L/ha", cantidadTotal: 96, unidadTotal: "L", esDosisDerivada: true },
      { producto: "X-Trim Low Flow Neo", dosis: 0.20, unidad: "L/ha", cantidadTotal: 12, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Promiens", dosis: 1.17, unidad: "L/ha", cantidadTotal: 70, unidadTotal: "L", esDosisDerivada: true }
    ],
    observaciones: "Aplicación operativa conjunta Keuneke 1 + Keuneke 2 (60 ha)."
  },
  {
    id: "knk1-2-2425-soja-fum2-26dic",
    campo: "Keuneke",
    lote: "Lote 1 + Lote 2",
    campana: "2024/25",
    cultivo: "Soja",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "26/12/2024",
    superficie: 60,
    esGrupal: true,
    lotesAfectados: ["Keuneke Lote 1", "Keuneke Lote 2"],
    metodoAplicacion: "Terrestre",
    insumos: [
      { producto: "2,4-D Enlist / Enlist C-D", dosis: 2.0, unidad: "L/ha", cantidadTotal: 120, unidadTotal: "L" },
      { producto: "Select / Cletodim", dosis: 1.17, unidad: "L/ha", cantidadTotal: 70, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Glifosato Premium", dosis: 2.0, unidad: "L/ha", cantidadTotal: 120, unidadTotal: "L" },
      { producto: "Coragen / Amicor", dosis: 0.04, unidad: "L/ha", cantidadTotal: 2.4, unidadTotal: "L", esDosisDerivada: true },
      { producto: "X-Trim Low Flow Neo", dosis: 0.20, unidad: "L/ha", cantidadTotal: 12, unidadTotal: "L", esDosisDerivada: true }
    ],
    observaciones: "Aplicación post-emergencia 26/12/2024 conjunta Keuneke 1 + 2."
  },
  {
    id: "knk1-2425-soja-sanitaria",
    campo: "Keuneke",
    lote: "Lote 1",
    campana: "2024/25",
    cultivo: "Soja",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "Enero/Febrero 2025",
    superficie: 29,
    insumos: [
      { producto: "Jamfry", dosis: null, unidad: "L/ha" },
      { producto: "Amicor", dosis: null, unidad: "L/ha" },
      { producto: "Starkle", dosis: null, unidad: "L/ha" },
      { producto: "Select / Cletodim", dosis: null, unidad: "L/ha" },
      { producto: "Aurum", dosis: null, unidad: "L/ha" },
      { producto: "X-Trim Low Flow Neo", dosis: null, unidad: "L/ha" },
      { producto: "Dédalo Elite", dosis: null, unidad: "L/ha" }
    ],
    discrepancia: "Una de las hojas presenta una superficie agrupada que no coincide claramente con la suma de los lotes.",
    observaciones: "Tratamiento sanitario de bloque. Superficie exacta a revisar según planillas originales."
  },
  {
    id: "knk-rcc-2425-soja-final-18mar",
    campo: "Keuneke",
    lote: "Lote 1 + Lote 2 (conjunto con Racca 1 + 2)",
    campana: "2024/25",
    cultivo: "Soja",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "18/03/2025",
    superficie: 126,
    esGrupal: true,
    lotesAfectados: ["Keuneke Lote 1", "Keuneke Lote 2", "Racca Lote 1", "Racca Lote 2"],
    metodoAplicacion: "Terrestre",
    insumos: [
      { producto: "Tendal", dosis: 0.151, unidad: "L/ha", cantidadTotal: 19, unidadTotal: "L", esDosisDerivada: true },
      { producto: "X-Trim Power", dosis: 0.052, unidad: "L/ha", cantidadTotal: 6.5, unidadTotal: "L", esDosisDerivada: true }
    ],
    observaciones: "Bloque conjunto de 126 ha. En Keuneke la aplicación fue terrestre; en Racca fue aérea."
  },
  {
    id: "knk1-2425-soja-cosecha",
    campo: "Keuneke",
    lote: "Lote 1",
    campana: "2024/25",
    cultivo: "Soja",
    cultivoAntecesor: "Trigo",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Abril/Mayo 2025",
    superficie: 29,
    insumos: [],
    produccion: {
      cantidad: 132200,
      unidad: "kg",
      rendimiento: 45.59,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    observaciones: "Cosecha soja de segunda Keuneke 1."
  },

  // ========================================================================
  // CAMPAÑA 2024/25 — KEUNEKE LOTE 2 (SOJA)
  // ========================================================================
  {
    id: "knk2-rcc2-2425-soja-golpe1",
    campo: "Keuneke",
    lote: "Lote 2 (conjunto con Racca 2)",
    campana: "2024/25",
    cultivo: "Soja",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "Primavera 2024",
    superficie: 61,
    esGrupal: true,
    lotesAfectados: ["Keuneke Lote 2", "Racca Lote 2"],
    insumos: [
      { producto: "Dédalo Elite", dosis: 1.51, unidad: "L/ha", cantidadTotal: 92, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Ligate", dosis: 0.121, unidad: "kg/ha", cantidadTotal: 7.4, unidadTotal: "kg", esDosisDerivada: true },
      { producto: "Glifosato Premium", dosis: 2.03, unidad: "L/ha", cantidadTotal: 124, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Coadyuvante", dosis: 0.049, unidad: "L/ha", cantidadTotal: 3, unidadTotal: "L", esDosisDerivada: true }
    ],
    observaciones: "Primer golpe conjunto Keuneke 2 + Racca 2 (61 ha)."
  },
  {
    id: "knk2-rcc2-2425-soja-golpe2",
    campo: "Keuneke",
    lote: "Lote 2 (conjunto con Racca 2)",
    campana: "2024/25",
    cultivo: "Soja",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "Primavera 2024",
    superficie: 61,
    esGrupal: true,
    lotesAfectados: ["Keuneke Lote 2", "Racca Lote 2"],
    insumos: [
      { producto: "Capaz", dosis: 0.50, unidad: "L/ha", cantidadTotal: 30.5, unidadTotal: "L" },
      { producto: "Dogo / Paraquat", dosis: 1.93, unidad: "L/ha", cantidadTotal: 118, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Aceite metilado", dosis: 0.50, unidad: "L/ha", cantidadTotal: 30.5, unidadTotal: "L" }
    ],
    observaciones: "Segundo golpe barbecho doble golpe Keuneke 2 + Racca 2."
  },
  {
    id: "knk2-rcc2-2425-soja-fert",
    campo: "Keuneke",
    lote: "Lote 2",
    campana: "2024/25",
    cultivo: "Soja",
    tipo: "Fertilización",
    estado: "Realizada",
    fecha: "Noviembre 2024",
    superficie: 28,
    insumos: [
      { producto: "Super Simple", dosis: 60, unidad: "kg/ha", cantidadTotal: 3660, unidadTotal: "kg", observacion: "3.660 kg totales para bloque de 61 ha (Keuneke 2 + Racca 2)." }
    ],
    observaciones: "Fertilización fosforada de base."
  },
  {
    id: "knk2-2425-soja-fum-3feb",
    campo: "Keuneke",
    lote: "Lote 2",
    campana: "2024/25",
    cultivo: "Soja",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "03/02/2025",
    superficie: 28,
    insumos: [
      { producto: "Tempus", dosis: 0.25, unidad: "L/ha", cantidadTotal: 7, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Amicor", dosis: 0.043, unidad: "L/ha", cantidadTotal: 1.2, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Starkle", dosis: null, unidad: "L/ha", observacion: "Dato de cantidad y unidad a revisar según formulación original." },
      { producto: "X-Trim Low Flow Neo", dosis: 0.21, unidad: "L/ha", cantidadTotal: 6, unidadTotal: "L", esDosisDerivada: true }
    ],
    observaciones: "Aplicación sanitaria específica de Keuneke 2."
  },
  {
    id: "knk2-2425-soja-cosecha",
    campo: "Keuneke",
    lote: "Lote 2",
    campana: "2024/25",
    cultivo: "Soja",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Mayo 2025",
    superficie: 28,
    insumos: [],
    produccion: {
      cantidad: 112180,
      unidad: "kg",
      rendimiento: 40.06,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    observaciones: "Cosecha soja Keuneke 2."
  },

  // ========================================================================
  // CAMPAÑA 2024/25 — RACCA LOTE 1 (TRIGO -> SOJA)
  // ========================================================================
  {
    id: "rcc1-2425-trigo-siembra",
    campo: "Racca",
    lote: "Lote 1",
    campana: "2024/25",
    cultivo: "Trigo",
    tipo: "Siembra",
    estado: "Realizada",
    fecha: "Invierno 2024",
    superficie: 33,
    superficieNota: "Aproximadamente 28-33 ha según distintas hojas",
    insumos: [
      { producto: "Semilla Trigo", dosis: 125, unidad: "kg/ha" }
    ],
    discrepancia: "Inconsistencia histórica de superficie entre 28 y 33 ha.",
    observaciones: "Siembra trigo Racca 1."
  },
  {
    id: "rcc1-2425-trigo-fert",
    campo: "Racca",
    lote: "Lote 1",
    campana: "2024/25",
    cultivo: "Trigo",
    tipo: "Fertilización",
    estado: "Realizada",
    fecha: "Invierno 2024",
    superficie: 33,
    insumos: [
      { producto: "Urea", dosis: 120, unidad: "kg/ha" },
      { producto: "Arrancador / MicroEssentials", dosis: 40, unidad: "kg/ha" },
      { producto: "Super Simple", dosis: 60, unidad: "kg/ha" }
    ],
    observaciones: "Fertilización trigo Racca 1."
  },
  {
    id: "rcc1-2425-trigo-cosecha",
    campo: "Racca",
    lote: "Lote 1",
    campana: "2024/25",
    cultivo: "Trigo",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Fin 2024",
    superficie: 33,
    insumos: [],
    produccion: {
      cantidad: 101036,
      unidad: "kg",
      rendimiento: 30.62,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    discrepancia: "Si se utilizan 33 ha el rendimiento es 30,62 qq/ha. En otra tabla aparece un rendimiento cercano a 36 qq/ha utilizando otra superficie (28 ha).",
    observaciones: "Cosecha de trigo Racca 1."
  },
  {
    id: "rcc1-2425-soja-siembra",
    campo: "Racca",
    lote: "Lote 1",
    campana: "2024/25",
    cultivo: "Soja",
    cultivoAntecesor: "Trigo",
    tipo: "Siembra",
    estado: "Realizada",
    fecha: "Diciembre 2024",
    superficie: 33,
    insumos: [
      { producto: "Semilla Soja Don Mario 47E23", dosis: null, unidad: "kg/ha" }
    ],
    observaciones: "Soja de segunda en Racca 1."
  },
  {
    id: "rcc1-2425-soja-fum1",
    campo: "Racca",
    lote: "Lote 1",
    campana: "2024/25",
    cultivo: "Soja",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "Diciembre 2024",
    superficie: 33,
    insumos: [
      { producto: "Saltun", dosis: 0.79, unidad: "L/ha", cantidadTotal: 26, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Dédalo Elite", dosis: 1.70, unidad: "L/ha", cantidadTotal: 56, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Glifosato Premium", dosis: 1.09, unidad: "L/ha", cantidadTotal: 36, unidadTotal: "L", esDosisDerivada: true }
    ],
    observaciones: "Primera fumigación soja Racca 1."
  },
  {
    id: "rcc1-2425-soja-fum2",
    campo: "Racca",
    lote: "Lote 1",
    campana: "2024/25",
    cultivo: "Soja",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "Diciembre 2024 / Enero 2025",
    superficie: 33,
    insumos: [
      { producto: "Sulfato de amonio", dosis: 1.82, unidad: "L/ha", cantidadTotal: 60, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Promiens / Glufosinato", dosis: 2.42, unidad: "L/ha", cantidadTotal: 80, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Spector", dosis: 0.030, unidad: "L/ha", cantidadTotal: 1, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Aceite metilado", dosis: null, unidad: "L/ha", cantidadTotal: 16, unidadTotal: "L", observacion: "16 L previstos. Verificar si finalmente fue aplicado." }
    ],
    observaciones: "Segunda aplicación soja Racca 1."
  },
  {
    id: "rcc1-2425-soja-fum-8ene",
    campo: "Racca",
    lote: "Lote 1",
    campana: "2024/25",
    cultivo: "Soja",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "08/01/2025",
    superficie: 33,
    insumos: [
      { producto: "Select / Cletodim", dosis: 1.21, unidad: "L/ha", cantidadTotal: 40, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Legado Pro", dosis: 0.24, unidad: "L/ha", cantidadTotal: 8, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Aurum", dosis: 1.82, unidad: "L/ha", cantidadTotal: 60, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Spector", dosis: 0.042, unidad: "L/ha", cantidadTotal: 1.4, unidadTotal: "L", esDosisDerivada: true },
      { producto: "X-Trim Low Flow Neo", dosis: 0.21, unidad: "L/ha", cantidadTotal: 7, unidadTotal: "L", esDosisDerivada: true }
    ],
    observaciones: "Fumigación selectiva 08/01/2025 en Racca 1."
  },
  {
    id: "rcc1-2425-soja-final-18mar",
    campo: "Racca",
    lote: "Lote 1 (conjunto con Racca 2 y Keuneke 1+2)",
    campana: "2024/25",
    cultivo: "Soja",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "18/03/2025",
    superficie: 126,
    esGrupal: true,
    lotesAfectados: ["Racca Lote 1", "Racca Lote 2", "Keuneke Lote 1", "Keuneke Lote 2"],
    metodoAplicacion: "Aérea",
    insumos: [
      { producto: "Tendal", dosis: 0.151, unidad: "L/ha", cantidadTotal: 19, unidadTotal: "L", esDosisDerivada: true },
      { producto: "X-Trim Power", dosis: 0.052, unidad: "L/ha", cantidadTotal: 6.5, unidadTotal: "L", esDosisDerivada: true }
    ],
    observaciones: "Aplicación aérea en Racca (terrestre en Keuneke)."
  },
  {
    id: "rcc1-2425-soja-cosecha",
    campo: "Racca",
    lote: "Lote 1",
    campana: "2024/25",
    cultivo: "Soja",
    cultivoAntecesor: "Trigo",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Mayo 2025",
    superficie: 33,
    insumos: [],
    produccion: {
      cantidad: 152600,
      unidad: "kg",
      rendimiento: 46.24,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    observaciones: "Cosecha soja Racca 1."
  },

  // ========================================================================
  // CAMPAÑA 2024/25 — RACCA LOTE 2 (SOJA)
  // ========================================================================
  {
    id: "rcc2-2425-soja-alepo",
    campo: "Racca",
    lote: "Lote 2",
    campana: "2024/25",
    cultivo: "Soja",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "Diciembre 2024",
    superficie: 33,
    insumos: [
      { producto: "Sulfato de amonio", dosis: 1.82, unidad: "L/ha", cantidadTotal: 60, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Select / Cletodim", dosis: 1.21, unidad: "L/ha", cantidadTotal: 40, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Galant HL / Haloxifop", dosis: 0.24, unidad: "L/ha", cantidadTotal: 8, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Glifosato Premium", dosis: 1.82, unidad: "L/ha", cantidadTotal: 60, unidadTotal: "L", esDosisDerivada: true },
      { producto: "X-Trim Low Flow Neo", dosis: 0.21, unidad: "L/ha", cantidadTotal: 7, unidadTotal: "L", esDosisDerivada: true }
    ],
    observaciones: "Tratamiento específico por fuerte presencia de sorgo de Alepo: 'Primero graminicida y a la semana tratamiento Enlist'."
  },
  {
    id: "rcc2-2425-soja-cosecha",
    campo: "Racca",
    lote: "Lote 2",
    campana: "2024/25",
    cultivo: "Soja",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Mayo 2025",
    superficie: 33,
    insumos: [],
    produccion: {
      cantidad: 115880,
      unidad: "kg",
      rendimiento: 35.12,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    observaciones: "Cosecha soja Racca 2."
  },

  // ========================================================================
  // CAMPAÑA 2024/25 — RACCA LOTE 3 (MAÍZ GRANO)
  // ========================================================================
  {
    id: "rcc3-2425-maiz-cosecha",
    campo: "Racca",
    lote: "Lote 3",
    campana: "2024/25",
    cultivo: "Maíz",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Otoño 2025",
    superficie: 33,
    insumos: [],
    produccion: {
      cantidad: 207960,
      unidad: "kg",
      rendimiento: 63.02,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    observaciones: "Cosecha maíz grano Racca 3. Compartió barbecho general de maíz y fertilización de campaña."
  },

  // ========================================================================
  // CAMPAÑA 2024/25 — KITTY (MAÍZ GRANO - RÉCORD 108 qq/ha)
  // ========================================================================
  {
    id: "kitty-2425-maiz-barbecho",
    campo: "Kitty",
    lote: "Lote Único (conjunto con Aguilera y Racca 3)",
    campana: "2024/25",
    cultivo: "Maíz",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "Primavera 2024",
    superficie: null,
    superficieNota: "Superficie total exacta del bloque no identificada",
    esGrupal: true,
    lotesAfectados: ["Kitty Lote Único", "Aguilera Lote Único", "Racca Lote 3"],
    insumos: [
      { producto: "Flumioxazin 48%", dosis: null, unidad: "L/ha", cantidadTotal: 7, unidadTotal: "L" },
      { producto: "2,4-D", dosis: null, unidad: "L/ha", cantidadTotal: 100, unidadTotal: "L" },
      { producto: "Glifosato Premium", dosis: null, unidad: "L/ha", cantidadTotal: 180, unidadTotal: "L" },
      { producto: "Atrazina 90", dosis: null, unidad: "kg/ha", cantidadTotal: 20, unidadTotal: "kg" },
      { producto: "Picloram", dosis: null, unidad: "L/ha", cantidadTotal: 2, unidadTotal: "L", observacion: "Aproximadamente 2 L" },
      { producto: "Eco Rizo / Coadyuvante", dosis: null, unidad: "L/ha", cantidadTotal: 5, unidadTotal: "L", observacion: "Aproximadamente 5 L" }
    ],
    observaciones: "Barbecho / preparación de maíz 2024/25 bloque Kitty + Aguilera + Racca. No calcular dosis/ha automática al no estar la superficie exacta."
  },
  {
    id: "kitty-2425-maiz-fert",
    campo: "Kitty",
    lote: "Lote Único",
    campana: "2024/25",
    cultivo: "Maíz",
    tipo: "Fertilización",
    estado: "Realizada",
    fecha: "Primavera 2024",
    superficie: 28,
    insumos: [
      { producto: "Mezcla química YPF", dosis: 40, unidad: "kg/ha", observacion: "Parte de Kitty" },
      { producto: "Super Simple", dosis: 65, unidad: "kg/ha", observacion: "Otro bloque de Kitty" },
      { producto: "Urea", dosis: 200, unidad: "kg/ha" }
    ],
    observaciones: "Fertilización nitrogenada y arrancadores en maíz Kitty."
  },
  {
    id: "kitty-2425-maiz-postsiembra",
    campo: "Kitty",
    lote: "Lote Único (bloque operativo 84 ha)",
    campana: "2024/25",
    cultivo: "Maíz",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "30/10/2024",
    superficie: 84,
    esGrupal: true,
    lotesAfectados: ["Kitty Lote Único", "Aguilera Lote Único", "Racca Lote 3"],
    insumos: [
      { producto: "Sulfato de amonio líquido", dosis: 1.93, unidad: "L/ha", cantidadTotal: 162, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Glifosato Premium", dosis: 0.55, unidad: "L/ha", cantidadTotal: 46, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Promiens", dosis: 1.82, unidad: "L/ha", cantidadTotal: 153, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Gesaprim 90", dosis: 0.73, unidad: "kg/ha", cantidadTotal: 61, unidadTotal: "kg", esDosisDerivada: true },
      { producto: "Aceite metilado", dosis: 0.31, unidad: "L/ha", cantidadTotal: 26, unidadTotal: "L", esDosisDerivada: true },
      { producto: "X-Trim Low Flow Neo", dosis: 0.083, unidad: "L/ha", cantidadTotal: 7, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Galant", dosis: 0.071, unidad: "L/ha", cantidadTotal: 6, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Dédalo Elite", dosis: 0.60, unidad: "L/ha", cantidadTotal: 50, unidadTotal: "L", esDosisDerivada: true }
    ],
    observaciones: "Aplicación post-siembra aproximadamente 30/10/2024."
  },
  {
    id: "kitty-2425-maiz-cosecha",
    campo: "Kitty",
    lote: "Lote Único",
    campana: "2024/25",
    cultivo: "Maíz",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Otoño 2025",
    superficie: 28,
    insumos: [],
    produccion: {
      cantidad: 302600,
      unidad: "kg",
      rendimiento: 108.07,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    observaciones: "Mayor rendimiento de maíz registrado entre los tres campos agrícolas de esa campaña (108,07 qq/ha)."
  },

  // ========================================================================
  // CAMPAÑA 2024/25 — AGUILERA (MAÍZ GRANO)
  // ========================================================================
  {
    id: "agu-rcc3-2425-maiz-fum",
    campo: "Aguilera",
    lote: "Lote Único (conjunto con Racca 3)",
    campana: "2024/25",
    cultivo: "Maíz",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "Primavera 2024",
    superficie: 56,
    esGrupal: true,
    lotesAfectados: ["Aguilera Lote Único", "Racca Lote 3"],
    insumos: [
      { producto: "Galant MAX", dosis: 0.12, unidad: "L/ha", cantidadTotal: 6.7, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Aurum", dosis: 2.20, unidad: "L/ha", cantidadTotal: 123, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Aceite metilado", dosis: 0.54, unidad: "L/ha", cantidadTotal: 30, unidadTotal: "L", esDosisDerivada: true }
    ],
    observaciones: "Anotación de planilla: aplicación de Glifosato + Haloxifop / graminicida sobre 56 ha conjuntas."
  },
  {
    id: "agu-2425-maiz-cosecha",
    campo: "Aguilera",
    lote: "Lote Único",
    campana: "2024/25",
    cultivo: "Maíz",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Otoño 2025",
    superficie: 17,
    superficieNota: "Superficie final cosechada: 17 ha",
    insumos: [],
    produccion: {
      cantidad: 83580,
      unidad: "kg",
      rendimiento: 49.16,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    observaciones: "Cosecha maíz grano Aguilera."
  },

  // ========================================================================
  // CAMPAÑA 2024/25 — TAMBO (MAÍZ SILO, AVENA, ALFALFA)
  // ========================================================================
  {
    id: "tambo-2425-maiz-silo-barbecho",
    campo: "Tambo",
    lote: "Lotes 2, 3, 4, 9 (y parte Lote 1)",
    campana: "2024/25",
    cultivo: "Maíz para Silo",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "Primavera 2024",
    superficie: 26,
    insumos: [
      { producto: "Dicamba", dosis: 0.24, unidad: "L/ha", cantidadTotal: 6.25, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Picloram 24%", dosis: 0.15, unidad: "L/ha", cantidadTotal: 3.8, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Glifosato Premium", dosis: 2.31, unidad: "L/ha", cantidadTotal: 60, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Aceite metilado", dosis: 1.0, unidad: "L/ha", cantidadTotal: 26, unidadTotal: "L" },
      { producto: "Fierce", dosis: 0.48, unidad: "L/ha", cantidadTotal: 12.5, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Paraquat", dosis: 2.31, unidad: "L/ha", cantidadTotal: 60, unidadTotal: "L", esDosisDerivada: true }
    ],
    observaciones: "Barbecho de maíz para silo en Tambo (bloque 26 ha)."
  },
  {
    id: "tambo-2425-maiz-silo-fert",
    campo: "Tambo",
    lote: "Lotes 2 + 3 + 4 + 9",
    campana: "2024/25",
    cultivo: "Maíz para Silo",
    tipo: "Fertilización",
    estado: "Realizada",
    fecha: "Primavera 2024",
    superficie: 36,
    insumos: [
      { producto: "Mezcla química YPF", dosis: 61.1, unidad: "kg/ha", cantidadTotal: 2200, unidadTotal: "kg", esDosisDerivada: true },
      { producto: "Super Simple", dosis: 65.0, unidad: "kg/ha", cantidadTotal: 2340, unidadTotal: "kg", esDosisDerivada: true }
    ],
    observaciones: "Fertilización maíz para silo en Tambo."
  },
  {
    id: "tambo-2425-maiz-silo-fum-234",
    campo: "Tambo",
    lote: "Lotes 2 + 3 + 4",
    campana: "2024/25",
    cultivo: "Maíz para Silo",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "Noviembre 2024",
    superficie: 26,
    insumos: [
      { producto: "Sempra", dosis: 0.104, unidad: "kg/ha", cantidadTotal: 2.7, unidadTotal: "kg", esDosisDerivada: true },
      { producto: "Glifosato Premium", dosis: 3.0, unidad: "L/ha", cantidadTotal: 78, unidadTotal: "L" },
      { producto: "X-Trim Power", dosis: null, unidad: "L/ha", cantidadTotal: 1, unidadTotal: "L" },
      { producto: "X-Trim Low Flow Neo", dosis: null, unidad: "L/ha", cantidadTotal: 2, unidadTotal: "L" },
      { producto: "Sulfato de amonio líquido", dosis: null, unidad: "L/ha", cantidadTotal: 16, unidadTotal: "L" }
    ],
    observaciones: "Aplicación sobre lotes 2, 3 y 4 de Tambo."
  },
  {
    id: "tambo-2425-maiz-silo-fum-19",
    campo: "Tambo",
    lote: "Lote 1 + Lote 9",
    campana: "2024/25",
    cultivo: "Maíz para Silo",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "Noviembre 2024",
    superficie: 12,
    insumos: [
      { producto: "Sulfato de amonio", dosis: 2.0, unidad: "L/ha", cantidadTotal: 24, unidadTotal: "L" },
      { producto: "Glifosato", dosis: 3.0, unidad: "L/ha", cantidadTotal: 36, unidadTotal: "L" },
      { producto: "Aceite metilado", dosis: 0.5, unidad: "L/ha", cantidadTotal: 6, unidadTotal: "L" }
    ],
    observaciones: "Aplicación sobre 12 ha en Tambo."
  },
  {
    id: "tambo-2425-maiz-silo-fum-158",
    campo: "Tambo",
    lote: "Lote 1 + 5 + 8",
    campana: "2024/25",
    cultivo: "Maíz para Silo",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "Diciembre 2024",
    superficie: 20,
    insumos: [
      { producto: "Select / Cletodim", dosis: 1.0, unidad: "L/ha", cantidadTotal: 20, unidadTotal: "L" },
      { producto: "X-Trim Low Flow Neo", dosis: 0.20, unidad: "L/ha", cantidadTotal: 4, unidadTotal: "L" }
    ],
    observaciones: "Aplicación sobre 20 ha en Tambo."
  },
  {
    id: "tambo-2425-maiz-silo-picado",
    campo: "Tambo",
    lote: "Lotes 1, 2, 3, 4, 9",
    campana: "2024/25",
    cultivo: "Maíz para Silo",
    tipo: "Picado",
    estado: "Realizada",
    fecha: "Febrero/Marzo 2025",
    superficie: 38.5,
    insumos: [],
    produccion: {
      cantidad: 502,
      unidad: "metros silo",
      rendimiento: 13.04,
      unidadRendimiento: "m/ha",
      destino: "Silo"
    },
    observaciones: "Resultado total de picado de maíz para silo 2024/25: 502 metros en 38,5 ha."
  },

  // TAMBO — AVENA 2024/25
  {
    id: "tambo-2425-avena-siembra",
    campo: "Tambo",
    lote: "Lotes 2, 3, 4 (y parte de 1)",
    campana: "2024/25",
    cultivo: "Avena",
    tipo: "Siembra",
    estado: "Realizada",
    fecha: "Otoño 2024",
    superficie: 37,
    insumos: [
      { producto: "Avena Juana", dosis: 40, unidad: "kg/ha", cantidadTotal: 1480, unidadTotal: "kg" },
      { producto: "Avena Paloma", dosis: 40, unidad: "kg/ha", cantidadTotal: 1480, unidadTotal: "kg" }
    ],
    observaciones: "Siembra de avena en bloque de 37 ha. Total 2.960 kg semilla (dosis media 80 kg/ha combinada)."
  },
  {
    id: "tambo-2425-avena-prep-g1",
    campo: "Tambo",
    lote: "Mitad Lote 1 + Lote 2",
    campana: "2024/25",
    cultivo: "Avena",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "Otoño 2024",
    superficie: 13.5,
    insumos: [
      { producto: "2,4-D Enlist", dosis: 2.0, unidad: "L/ha", cantidadTotal: 27, unidadTotal: "L" },
      { producto: "Dicamba", dosis: 0.15, unidad: "L/ha", cantidadTotal: 2, unidadTotal: "L", esDosisDerivada: true },
      { producto: "Aurum", dosis: 4.0, unidad: "L/ha", cantidadTotal: 54, unidadTotal: "L" },
      { producto: "X-Trim Power", dosis: null, unidad: "L/ha", cantidadTotal: 0.7, unidadTotal: "L" }
    ],
    observaciones: "Primer golpe preparación en 13,5 ha."
  },
  {
    id: "tambo-2425-avena-prep-g2",
    campo: "Tambo",
    lote: "Mitad Lote 1 + Lote 2",
    campana: "2024/25",
    cultivo: "Avena",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "Otoño 2024",
    superficie: 13.5,
    insumos: [
      { producto: "Diflufenican / Pelican", dosis: 0.10, unidad: "kg/ha", cantidadTotal: 1.35, unidadTotal: "kg", esDosisDerivada: true },
      { producto: "Metsulfurón", dosis: 0.0044, unidad: "kg/ha", cantidadTotal: 0.06, unidadTotal: "kg", observacion: "60 g totales (4,4 g/ha)" },
      { producto: "Paraquat", dosis: 2.96, unidad: "L/ha", cantidadTotal: 40, unidadTotal: "L", esDosisDerivada: true },
      { producto: "X-Trim Low Flow Neo", dosis: 0.22, unidad: "L/ha", cantidadTotal: 3, unidadTotal: "L", esDosisDerivada: true }
    ],
    observaciones: "Segundo golpe preparación en 13,5 ha."
  },

  // TAMBO — ALFALFA 2024/25
  {
    id: "tambo-2425-alfalfa-fum-ene",
    campo: "Tambo",
    lote: "Lotes 1 + 5 + 7 + 8",
    campana: "2024/25",
    cultivo: "Alfalfa",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "08/01/2025",
    superficie: 26.5,
    insumos: [
      { producto: "Spector", dosis: null, unidad: "L/ha", cantidadTotal: 1, unidadTotal: "L" },
      { producto: "X-Trim Low Flow Neo", dosis: null, unidad: "L/ha", cantidadTotal: 1.3, unidadTotal: "L" }
    ],
    observaciones: "Tratamiento sobre 26,5 ha de alfalfa implantada."
  },
  {
    id: "tambo-2425-alfalfa-fum-feb",
    campo: "Tambo",
    lote: "Lotes 1 + 5 + 6 + 7 + 8",
    campana: "2024/25",
    cultivo: "Alfalfa",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "20/02/2025",
    superficie: 36,
    insumos: [
      { producto: "Lambdacialotrina 25%", dosis: null, unidad: "L/ha", cantidadTotal: 1.5, unidadTotal: "L" },
      { producto: "X-Trim Low Flow Neo", dosis: null, unidad: "L/ha", cantidadTotal: 1.8, unidadTotal: "L" }
    ],
    observaciones: "Tratamiento sanitario sobre 36 ha de alfalfa."
  },

  // ========================================================================
  // CAMPAÑA 2025/26 — KEUNEKE 1 + RACCA 2 (TRIGO 2025/26)
  // ========================================================================
  {
    id: "knk1-rcc2-2526-trigo-barbecho-rcc",
    campo: "Racca",
    lote: "Lote 2",
    campana: "2025/26",
    cultivo: "Trigo",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "Otoño 2025",
    superficie: 66,
    superficieNota: "Bloque aproximado de 66 ha en Racca",
    insumos: [
      { producto: "Glifosato 66%", dosis: 1.8, unidad: "L/ha" },
      { producto: "2,4-D 30%", dosis: 1.0, unidad: "L/ha" },
      { producto: "Dicamba", dosis: 0.24, unidad: "L/ha" },
      { producto: "Sumizyn T Max", dosis: 1.5, unidad: "L/ha" },
      { producto: "Aceite MSO", dosis: 0.24, unidad: "L/ha" }
    ],
    observaciones: "Barbecho previo en Racca (compartido en parte con maíz)."
  },
  {
    id: "knk1-rcc2-2526-trigo-barbecho-knk",
    campo: "Keuneke",
    lote: "Lote 1",
    campana: "2025/26",
    cultivo: "Trigo",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "Otoño 2025",
    superficie: 48,
    superficieNota: "Bloque aproximado de 48 ha en Keuneke",
    insumos: [
      { producto: "Glifosato 66%", dosis: 2.0, unidad: "L/ha" },
      { producto: "2,4-D", dosis: 1.0, unidad: "L/ha" },
      { producto: "Dicamba", dosis: 0.20, unidad: "L/ha" },
      { producto: "Sumizyn T Max", dosis: 1.5, unidad: "L/ha" },
      { producto: "Aceite MSO", dosis: 0.20, unidad: "L/ha" }
    ],
    observaciones: "Barbecho previo en Keuneke."
  },
  {
    id: "knk1-rcc2-2526-trigo-siembra",
    campo: "Keuneke",
    lote: "Lote 1 (conjunto con Racca 2)",
    campana: "2025/26",
    cultivo: "Trigo",
    tipo: "Siembra",
    estado: "Realizada",
    fecha: "Invierno 2025",
    superficie: 62,
    esGrupal: true,
    lotesAfectados: ["Keuneke Lote 1 (29 ha)", "Racca Lote 2 (33 ha)"],
    insumos: [
      { producto: "Semilla Trigo CATALPA", dosis: 129, unidad: "kg/ha", cantidadTotal: 8000, unidadTotal: "kg", esDosisDerivada: true }
    ],
    observaciones: "Siembra conjunta variedad Catalpa en 62 ha totales."
  },
  {
    id: "knk1-rcc2-2526-trigo-fert",
    campo: "Keuneke",
    lote: "Lote 1 + Racca Lote 2",
    campana: "2025/26",
    cultivo: "Trigo",
    tipo: "Fertilización",
    estado: "Realizada",
    fecha: "Invierno 2025",
    superficie: 62,
    insumos: [
      { producto: "Urea", dosis: 228, unidad: "kg/ha", cantidadTotal: 14012, unidadTotal: "kg", observacion: "226-230 kg/ha según registros" },
      { producto: "Mezcla química YPF", dosis: 59, unidad: "kg/ha", cantidadTotal: 3658, unidadTotal: "kg" }
    ],
    observaciones: "Fertilización trigo Catalpa en 62 ha."
  },
  {
    id: "knk1-rcc2-2526-trigo-trat-sep",
    campo: "Keuneke",
    lote: "Lote 1 + Racca Lote 2",
    campana: "2025/26",
    cultivo: "Trigo",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "25/09/2025",
    superficie: 62,
    insumos: [
      { producto: "Excalia Max", dosis: 0.725, unidad: "L/ha", cantidadTotal: 44.95, unidadTotal: "L" },
      { producto: "Bifentrina", dosis: 0.25, unidad: "u/ha", cantidadTotal: 15, unidadTotal: "u", observacion: "15 unidades según formulación" }
    ],
    observaciones: "Tratamiento fungicida/insecticida 25/09/2025."
  },
  {
    id: "rcc2-2526-trigo-cosecha",
    campo: "Racca",
    lote: "Lote 2",
    campana: "2025/26",
    cultivo: "Trigo",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Noviembre/Diciembre 2025",
    superficie: 33,
    insumos: [],
    produccion: {
      cantidad: 152891,
      unidad: "kg",
      rendimiento: 46.33,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    observaciones: "Cosecha trigo Catalpa en Racca 2."
  },
  {
    id: "knk1-2526-trigo-cosecha",
    campo: "Keuneke",
    lote: "Lote 1",
    campana: "2025/26",
    cultivo: "Trigo",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Noviembre/Diciembre 2025",
    superficie: 29,
    insumos: [],
    produccion: {
      cantidad: 172229,
      unidad: "kg",
      rendimiento: 59.39,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    observaciones: "Cosecha trigo Catalpa en Keuneke 1 (Total conjunto: 325.120 kg, promedio 52,44 qq/ha)."
  },

  // ========================================================================
  // CAMPAÑA 2025/26 — KEUNEKE 1 + RACCA 2 (SOJA DE SEGUNDA)
  // ========================================================================
  {
    id: "knk1-rcc2-2526-soja2-fert-3dic",
    campo: "Keuneke",
    lote: "Lote 1 + Racca Lote 2",
    campana: "2025/26",
    cultivo: "Soja de Segunda",
    cultivoAntecesor: "Trigo",
    tipo: "Fertilización",
    estado: "Realizada",
    fecha: "03/12/2025",
    superficie: 62,
    superficieNota: "Nominal 62 ha (Keuneke 29 ha + Racca 33 ha; algunas hojas 61 ha)",
    insumos: [
      { producto: "Super Simple", dosis: 80, unidad: "kg/ha", cantidadTotal: 4850, unidadTotal: "kg", observacion: "4.800-4.900 kg totales" }
    ],
    discrepancia: "Superficie nominal 62 ha, algunas planillas trabajan con 61 ha.",
    observaciones: "Fertilización soja de segunda posterior a trigo."
  },
  {
    id: "knk1-rcc2-2526-soja2-fum-3dic",
    campo: "Keuneke",
    lote: "Lote 1 + Racca Lote 2",
    campana: "2025/26",
    cultivo: "Soja de Segunda",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "03/12/2025",
    superficie: 62,
    insumos: [
      { producto: "Glifosato", dosis: 2.0, unidad: "L/ha" },
      { producto: "2,4-D", dosis: 1.6, unidad: "L/ha" },
      { producto: "Capaz", dosis: 0.5, unidad: "L/ha" },
      { producto: "Imazetapir", dosis: 1.0, unidad: "L/ha" }
    ],
    observaciones: "Fumigación de siembra 03/12/2025."
  },
  {
    id: "knk1-rcc2-2526-soja2-fum-30dic",
    campo: "Keuneke",
    lote: "Lote 1 + Racca Lote 2",
    campana: "2025/26",
    cultivo: "Soja de Segunda",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "30/12/2025",
    superficie: 62,
    insumos: [
      { producto: "Glifosato", dosis: 1.8, unidad: "L/ha" },
      { producto: "Select / Cletodim", dosis: 1.0, unidad: "L/ha" },
      { producto: "Coragen", dosis: 0.035, unidad: "L/ha" },
      { producto: "Sil Oil", dosis: 0.16, unidad: "L/ha" }
    ],
    observaciones: "Fumigación post-emergencia 30/12/2025."
  },
  {
    id: "rcc2-2526-soja2-fum-9ene",
    campo: "Racca",
    lote: "Lote 2",
    campana: "2025/26",
    cultivo: "Soja de Segunda",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "09/01/2026",
    superficie: 33,
    insumos: [
      { producto: "Glufosinato de amonio", dosis: 2.3, unidad: "L/ha" },
      { producto: "2,4-D Enlist", dosis: 2.3, unidad: "L/ha" },
      { producto: "Sulfato de amonio", dosis: 1.0, unidad: "L/ha" }
    ],
    observaciones: "Aplicación Enlist en Racca 2."
  },
  {
    id: "knk1-rcc2-2526-soja2-sanit-30ene",
    campo: "Keuneke",
    lote: "Lote 1 + Racca Lote 2",
    campana: "2025/26",
    cultivo: "Soja de Segunda",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "30/01/2026",
    superficie: 62,
    insumos: [
      { producto: "Melyra", dosis: 0.5, unidad: "L/ha" },
      { producto: "Tiam + Lambda", dosis: 0.2, unidad: "L/ha" },
      { producto: "Coragen", dosis: 0.035, unidad: "L/ha" },
      { producto: "Fosfito", dosis: 0.30, unidad: "L/ha" },
      { producto: "Sil Oil", dosis: 0.16, unidad: "L/ha" }
    ],
    observaciones: "Tratamiento sanitario conjunto 30/01/2026."
  },
  {
    id: "knk1-2526-soja2-fum-25mar",
    campo: "Keuneke",
    lote: "Lote 1",
    campana: "2025/26",
    cultivo: "Soja de Segunda",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "25/03/2026",
    superficie: 29,
    insumos: [
      { producto: "Select / Cletodim", dosis: 1.0, unidad: "L/ha" },
      { producto: "Aceite metilado / X-Trim Neo", dosis: 0.20, unidad: "L/ha" }
    ],
    observaciones: "Tratamiento tardío en Keuneke."
  },
  {
    id: "knk1-2526-soja2-cosecha",
    campo: "Keuneke",
    lote: "Lote 1",
    campana: "2025/26",
    cultivo: "Soja de Segunda",
    cultivoAntecesor: "Trigo",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Otoño 2026",
    superficie: 29,
    insumos: [],
    produccion: {
      cantidad: 110730,
      unidad: "kg",
      rendimiento: 38.18,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    observaciones: "Cosecha soja de segunda Keuneke 1."
  },
  {
    id: "rcc2-2526-soja2-cosecha",
    campo: "Racca",
    lote: "Lote 2",
    campana: "2025/26",
    cultivo: "Soja de Segunda",
    cultivoAntecesor: "Trigo",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Otoño 2026",
    superficie: 33,
    insumos: [],
    produccion: {
      cantidad: 135296,
      unidad: "kg",
      rendimiento: 41.0,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    discrepancia: "Una tabla denomina erróneamente este resultado como Racca 1. Por secuencia de cultivo corresponde a Racca 2.",
    observaciones: "Cosecha soja de segunda Racca 2."
  },

  // ========================================================================
  // CAMPAÑA 2025/26 — KEUNEKE 2 + RACCA 1 (MAÍZ GRANO 2025/26)
  // ========================================================================
  {
    id: "knk2-rcc1-2526-maiz-siembra",
    campo: "Keuneke",
    lote: "Lote 2 (conjunto con Racca 1)",
    campana: "2025/26",
    cultivo: "Maíz",
    tipo: "Siembra",
    estado: "Realizada",
    fecha: "Primavera 2025",
    superficie: 51.5,
    superficieNota: "Keuneke 2 (18-19 ha) + Racca 1 (33 ha) = 51-52 ha",
    insumos: [
      { producto: "Semilla Maíz STINE 9939 VIP3", dosis: null, unidad: "bolsas/ha", cantidadTotal: 50, unidadTotal: "bolsas", observacion: "Compra registrada ~50 bolsas." }
    ],
    observaciones: "Siembra maíz grano híbrido Stine 9939 VIP3."
  },
  {
    id: "knk2-rcc1-2526-maiz-fert",
    campo: "Keuneke",
    lote: "Lote 2 + Racca Lote 1",
    campana: "2025/26",
    cultivo: "Maíz",
    tipo: "Fertilización",
    estado: "Realizada",
    fecha: "Primavera 2025",
    superficie: 51.5,
    insumos: [
      { producto: "Urea", dosis: 197, unidad: "kg/ha", cantidadTotal: 10244, unidadTotal: "kg" },
      { producto: "Super Simple", dosis: 77, unidad: "kg/ha", cantidadTotal: 4004, unidadTotal: "kg" }
    ],
    observaciones: "Fertilización maíz grano."
  },
  {
    id: "knk2-rcc1-2526-maiz-fum-17sep",
    campo: "Keuneke",
    lote: "Lote 2 + Racca Lote 1",
    campana: "2025/26",
    cultivo: "Maíz",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "17/09/2025",
    superficie: 51.5,
    insumos: [
      { producto: "Glifosato 66%", dosis: 2.0, unidad: "L/ha" },
      { producto: "Dicamba / Banvel", dosis: 0.25, unidad: "L/ha" },
      { producto: "Atrazina / Gesaprim 90", dosis: 1.5, unidad: "kg/ha" },
      { producto: "Yamato 48%", dosis: 0.38, unidad: "L/ha" }
    ],
    observaciones: "Aplicación pre-emergencia 17/09/2025."
  },
  {
    id: "knk2-2526-maiz-cosecha",
    campo: "Keuneke",
    lote: "Lote 2",
    campana: "2025/26",
    cultivo: "Maíz",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Otoño 2026",
    superficie: 18,
    insumos: [],
    produccion: {
      cantidad: 220487,
      unidad: "kg",
      rendimiento: 122.49,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    observaciones: "Excelente rendimiento en Keuneke 2 (122,49 qq/ha con 18 ha)."
  },
  {
    id: "rcc1-2526-maiz-cosecha",
    campo: "Racca",
    lote: "Lote 1",
    campana: "2025/26",
    cultivo: "Maíz",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Otoño 2026",
    superficie: 33,
    insumos: [],
    produccion: {
      cantidad: 296028,
      unidad: "kg",
      rendimiento: 89.71,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    observaciones: "Cosecha maíz Racca 1 (Total conjunto: 516.515 kg, promedio 99,3 qq/ha)."
  },

  // ========================================================================
  // CAMPAÑA 2025/26 — KITTY + RACCA 3 (SOJA DE PRIMERA)
  // ========================================================================
  {
    id: "kitty-2526-soja1-barbecho-19jun",
    campo: "Kitty",
    lote: "Lote Único",
    campana: "2025/26",
    cultivo: "Soja",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "19/06/2025",
    superficie: 29,
    insumos: [
      { producto: "Glifosato 66%", dosis: 2.0, unidad: "L/ha" },
      { producto: "Dicamba", dosis: 0.18, unidad: "L/ha" },
      { producto: "2,4-D", dosis: 1.4, unidad: "L/ha" },
      { producto: "Gesaprim 90", dosis: 1.0, unidad: "kg/ha" },
      { producto: "Finesse", dosis: 0.015, unidad: "kg/ha", observacion: "15 g/ha" }
    ],
    observaciones: "Barbecho temprano Kitty."
  },
  {
    id: "kitty-rcc3-2526-soja1-fum-6oct",
    campo: "Kitty",
    lote: "Lote Único + Racca Lote 3",
    campana: "2025/26",
    cultivo: "Soja",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "06/10/2025",
    superficie: 60,
    superficieNota: "Kitty 29 ha + Racca 3 31 ha = 60 ha",
    insumos: [
      { producto: "Glifosato 66%", dosis: 2.0, unidad: "L/ha" },
      { producto: "2,4-D", dosis: 1.6, unidad: "L/ha" },
      { producto: "Ligate", dosis: 0.10, unidad: "kg/ha" },
      { producto: "Flumioxazin", dosis: 0.15, unidad: "L/ha" }
    ],
    observaciones: "Aplicación previa a siembra bloque 60 ha."
  },
  {
    id: "kitty-rcc3-2526-soja1-fert-11nov",
    campo: "Kitty",
    lote: "Lote Único + Racca Lote 3",
    campana: "2025/26",
    cultivo: "Soja",
    tipo: "Fertilización",
    estado: "Realizada",
    fecha: "11/11/2025",
    superficie: 60,
    insumos: [
      { producto: "Super Simple", dosis: 80, unidad: "kg/ha", cantidadTotal: 4800, unidadTotal: "kg" }
    ],
    observaciones: "Fertilización fosforada 80 kg/ha."
  },
  {
    id: "kitty-rcc3-2526-soja1-cura-12nov",
    campo: "Kitty",
    lote: "Lote Único + Racca Lote 3",
    campana: "2025/26",
    cultivo: "Soja",
    tipo: "Siembra",
    estado: "Realizada",
    fecha: "12/11/2025",
    superficie: 60,
    insumos: [
      { producto: "Curasemillas Amprino (limpieza y cura)", dosis: null, unidad: "dosis" }
    ],
    observaciones: "Registro explícito de cura y limpieza de semillas con Amprino."
  },
  {
    id: "kitty-rcc3-2526-soja1-fum-13nov",
    campo: "Kitty",
    lote: "Lote Único + Racca Lote 3",
    campana: "2025/26",
    cultivo: "Soja",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "13/11/2025",
    superficie: 60,
    insumos: [
      { producto: "Select / Cletodim", dosis: 1.0, unidad: "L/ha" },
      { producto: "Heat", dosis: 0.035, unidad: "kg/ha" },
      { producto: "2,4-D", dosis: 1.6, unidad: "L/ha" },
      { producto: "Capaz", dosis: 0.5, unidad: "L/ha" },
      { producto: "Dual Gold", dosis: 1.0, unidad: "L/ha" }
    ],
    observaciones: "Fumigación de pre-emergencia 13/11/2025."
  },
  {
    id: "kitty-rcc3-2526-soja1-fum-30dic",
    campo: "Kitty",
    lote: "Lote Único + Racca Lote 3",
    campana: "2025/26",
    cultivo: "Soja",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "30/12/2025",
    superficie: 60,
    insumos: [
      { producto: "Glifosato", dosis: 1.8, unidad: "L/ha" },
      { producto: "Select / Cletodim", dosis: 1.0, unidad: "L/ha" },
      { producto: "Coragen", dosis: 0.035, unidad: "L/ha" },
      { producto: "Sil Oil", dosis: 0.16, unidad: "L/ha" }
    ],
    observaciones: "Fumigación post-emergencia 30/12/2025."
  },
  {
    id: "kitty-rcc3-2526-soja1-sanit-30ene",
    campo: "Kitty",
    lote: "Lote Único + Racca Lote 3",
    campana: "2025/26",
    cultivo: "Soja",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "30/01/2026",
    superficie: 60,
    insumos: [
      { producto: "Melyra", dosis: 0.5, unidad: "L/ha" },
      { producto: "Tiam + Lambda", dosis: 0.2, unidad: "L/ha" },
      { producto: "Coragen", dosis: 0.035, unidad: "L/ha" },
      { producto: "Fosfito", dosis: 0.30, unidad: "L/ha" },
      { producto: "Sil Oil", dosis: 0.16, unidad: "L/ha" }
    ],
    observaciones: "Aplicación sanitaria 30/01/2026."
  },
  {
    id: "kitty-2526-soja1-cosecha",
    campo: "Kitty",
    lote: "Lote Único",
    campana: "2025/26",
    cultivo: "Soja",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Otoño 2026",
    superficie: 29,
    insumos: [],
    produccion: {
      cantidad: 153708,
      unidad: "kg",
      rendimiento: 53.0,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    observaciones: "Producción neta aproximada 153.708 kg en 29 ha (53 qq/ha)."
  },
  {
    id: "rcc3-2526-soja1-cosecha",
    campo: "Racca",
    lote: "Lote 3",
    campana: "2025/26",
    cultivo: "Soja",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Otoño 2026",
    superficie: 31,
    insumos: [],
    produccion: {
      cantidad: 138040,
      unidad: "kg",
      rendimiento: 44.53,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    observaciones: "Cosecha soja de primera Racca 3."
  },

  // ========================================================================
  // CAMPAÑA 2025/26 — AGUILERA (GIRASOL)
  // ========================================================================
  {
    id: "agu-2526-girasol-laboreo",
    campo: "Aguilera",
    lote: "Lote Único",
    campana: "2025/26",
    cultivo: "Girasol",
    tipo: "Laboreo",
    estado: "Realizada",
    fecha: "Octubre 2025",
    superficie: 20,
    insumos: [],
    observaciones: "Se realizó DISQUEADO. Observación explícita: 'NO VA ARRANCADOR YA QUE SE DISQUEÓ LA TIERRA'."
  },
  {
    id: "agu-2526-girasol-siembra",
    campo: "Aguilera",
    lote: "Lote Único",
    campana: "2025/26",
    cultivo: "Girasol",
    tipo: "Siembra",
    estado: "Realizada",
    fecha: "Noviembre 2025",
    superficie: 18,
    insumos: [
      { producto: "Semilla Girasol NS 1109 CL B1", dosis: null, unidad: "bolsas", cantidadTotal: 6, unidadTotal: "bolsas", observacion: "~6 bolsas" }
    ],
    observaciones: "Siembra girasol híbrido NS 1109 CL B1."
  },
  {
    id: "agu-2526-girasol-barbecho-3nov",
    campo: "Aguilera",
    lote: "Lote Único",
    campana: "2025/26",
    cultivo: "Girasol",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "03/11/2025",
    superficie: 20,
    insumos: [
      { producto: "Glifosato 66%", dosis: 2.0, unidad: "L/ha" },
      { producto: "Piroxasulfone 48%", dosis: 0.25, unidad: "L/ha" },
      { producto: "Imatron 80%", dosis: 0.10, unidad: "kg/ha" },
      { producto: "Espector", dosis: 0.05, unidad: "L/ha" },
      { producto: "Carfentrazone", dosis: 0.10, unidad: "u/ha", cantidadTotal: 2, unidadTotal: "u", esDosisDerivada: true, observacion: "2 unidades registradas (0,10/ha para 20 ha)" }
    ],
    observaciones: "Barbecho / preemergencia girasol."
  },
  {
    id: "agu-2526-girasol-fert-26nov",
    campo: "Aguilera",
    lote: "Lote Único",
    campana: "2025/26",
    cultivo: "Girasol",
    tipo: "Fertilización",
    estado: "Realizada",
    fecha: "26/11/2025",
    superficie: 20,
    insumos: [
      { producto: "Urea", dosis: 100, unidad: "kg/ha", cantidadTotal: 2000, unidadTotal: "kg" },
      { producto: "Yeso", dosis: 150, unidad: "kg/ha", cantidadTotal: 3000, unidadTotal: "kg", observacion: "Recomendación 200 kg/ha; aplicación adoptada ~150 kg/ha" }
    ],
    observaciones: "NO se aplicó arrancador por el laboreo con disco."
  },
  {
    id: "agu-2526-girasol-fum-30dic",
    campo: "Aguilera",
    lote: "Lote Único",
    campana: "2025/26",
    cultivo: "Girasol",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "30/12/2025",
    superficie: 20,
    insumos: [
      { producto: "Select / Cletodim", dosis: 1.0, unidad: "L/ha" },
      { producto: "Coragen", dosis: 0.04, unidad: "L/ha" },
      { producto: "Fosfito", dosis: 0.25, unidad: "L/ha" },
      { producto: "Sil Oil", dosis: 0.25, unidad: "L/ha" }
    ],
    observaciones: "Aplicación sanitaria girasol."
  },
  {
    id: "agu-2526-girasol-cosecha",
    campo: "Aguilera",
    lote: "Lote Único",
    campana: "2025/26",
    cultivo: "Girasol",
    tipo: "Cosecha",
    estado: "Realizada",
    fecha: "Febrero/Marzo 2026",
    superficie: 18,
    insumos: [],
    produccion: {
      cantidad: 23.04,
      unidad: "t",
      rendimiento: 12.8,
      unidadRendimiento: "qq/ha",
      destino: "Grano"
    },
    discrepancia: "Existe otro valor en una tabla que parece contener un error de factor 10. Se conserva el valor correcto de 23,04 t / 12,8 qq/ha.",
    observaciones: "Cosecha de girasol Aguilera."
  },

  // ========================================================================
  // CAMPAÑA 2025/26 — RACCA LOTE 3 (AVENA PARA ROLLOS)
  // ========================================================================
  {
    id: "rcc3-2526-avena-prep-13may",
    campo: "Racca",
    lote: "Lote 3",
    campana: "2025/26",
    cultivo: "Avena",
    cultivoAntecesor: "Soja de Primera",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "13/05/2025",
    superficie: 33,
    insumos: [
      { producto: "2,4-D Herbifen Advance", dosis: 1.0, unidad: "L/ha" },
      { producto: "Metsulfurón", dosis: 0.005, unidad: "kg/ha", observacion: "5 g/ha" },
      { producto: "Aurum", dosis: 2.0, unidad: "L/ha" },
      { producto: "X-Trim Power", dosis: 0.05, unidad: "L/ha", observacion: "50 cc/ha" }
    ],
    observaciones: "Preparación para avena sobre rastrojo de soja."
  },
  {
    id: "rcc3-2526-avena-siembra",
    campo: "Racca",
    lote: "Lote 3",
    campana: "2025/26",
    cultivo: "Avena",
    tipo: "Siembra",
    estado: "Realizada",
    fecha: "Mayo 2025",
    superficie: 33,
    insumos: [
      { producto: "Semilla de Avena", dosis: 80, unidad: "kg/ha", cantidadTotal: 2640, unidadTotal: "kg" }
    ],
    observaciones: "Siembra avena destinada a rollos."
  },
  {
    id: "rcc3-2526-avena-rollos",
    campo: "Racca",
    lote: "Lote 3",
    campana: "2025/26",
    cultivo: "Avena",
    tipo: "Rollos",
    estado: "Realizada",
    fecha: "Primavera 2025",
    superficie: 33,
    insumos: [],
    produccion: {
      cantidad: 234,
      unidad: "rollos",
      rendimiento: 7.1,
      unidadRendimiento: "rollos/ha",
      destino: "Rollos"
    },
    observaciones: "234 rollos producidos en 33 ha (7,1 rollos/ha)."
  },

  // ========================================================================
  // CAMPAÑA 2025/26 — KEUNEKE LOTE 3 (ALFALFA)
  // ========================================================================
  {
    id: "knk3-2526-alfalfa-siembra",
    campo: "Keuneke",
    lote: "Lote 3",
    campana: "2025/26",
    cultivo: "Alfalfa",
    tipo: "Siembra",
    estado: "Realizada",
    fecha: "Primavera 2025",
    superficie: 9,
    superficieNota: "Keuneke 9 ha (implantación conjunta con CAT 5,5 ha = 14,5 ha totales)",
    insumos: [
      { producto: "Semilla de Alfalfa", dosis: 25, unidad: "kg/ha", cantidadTotal: 362.5, unidadTotal: "kg", observacion: "Compra registrada ~375 kg." }
    ],
    observaciones: "Alfalfa implantada para forraje del tambo. Nota: CAT corresponde a convenio/acuerdo externo, no es campo de HJB."
  },

  // ========================================================================
  // CAMPAÑA 2025/26 — TAMBO (MAÍZ SILO + AVENA + ALFALFA)
  // ========================================================================
  {
    id: "tambo-2526-maiz-silo-fum-6oct",
    campo: "Tambo",
    lote: "Lotes 1 + 2 + 3 + 4",
    campana: "2025/26",
    cultivo: "Maíz para Silo",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "06/10/2025",
    superficie: 30,
    insumos: [
      { producto: "Glifosato", dosis: 2.0, unidad: "L/ha" },
      { producto: "Dicamba", dosis: 0.25, unidad: "L/ha" },
      { producto: "Atrazina", dosis: 2.0, unidad: "kg/ha" },
      { producto: "Dual Gold", dosis: 1.3, unidad: "L/ha" },
      { producto: "Manto / Espector", dosis: 0.06, unidad: "L/ha" }
    ],
    observaciones: "Aplicación sobre 30 ha de maíz para silo."
  },
  {
    id: "tambo-2526-maiz-silo-l7-1ra",
    campo: "Tambo",
    lote: "Lote 7",
    campana: "2025/26",
    cultivo: "Maíz para Silo",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "06/10/2025",
    superficie: 10.5,
    insumos: [
      { producto: "Glifosato", dosis: 3.0, unidad: "L/ha" },
      { producto: "Dicamba", dosis: 0.25, unidad: "L/ha" },
      { producto: "Lontrel", dosis: 0.25, unidad: "L/ha" },
      { producto: "Sempra", dosis: 0.15, unidad: "kg/ha" }
    ],
    observaciones: "Maíz silo de primera en Lote 7."
  },
  {
    id: "tambo-2526-maiz-silo-fum-18nov-134",
    campo: "Tambo",
    lote: "Lotes 1 + 3 + 4",
    campana: "2025/26",
    cultivo: "Maíz para Silo",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "18/11/2025",
    superficie: 22,
    insumos: [
      { producto: "Glifosato", dosis: 3.0, unidad: "L/ha" },
      { producto: "Dicamba", dosis: 0.25, unidad: "L/ha" }
    ],
    observaciones: "Fumigación de repaso Lotes 1, 3 y 4."
  },
  {
    id: "tambo-2526-maiz-silo-fum-18nov-l2",
    campo: "Tambo",
    lote: "Lote 2",
    campana: "2025/26",
    cultivo: "Maíz para Silo",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "18/11/2025",
    superficie: 8,
    insumos: [
      { producto: "Glifosato", dosis: 3.0, unidad: "L/ha" },
      { producto: "Dicamba", dosis: 0.25, unidad: "L/ha" },
      { producto: "Sempra", dosis: 0.15, unidad: "kg/ha" }
    ],
    observaciones: "Fumigación específica Lote 2."
  },
  {
    id: "tambo-2526-maiz-silo-l7-2da",
    campo: "Tambo",
    lote: "Lote 7",
    campana: "2025/26",
    cultivo: "Maíz para Silo",
    tipo: "Fumigación",
    estado: "Realizada",
    fecha: "18/02/2026",
    superficie: 10.5,
    insumos: [
      { producto: "Glifosato", dosis: 3.0, unidad: "L/ha" },
      { producto: "Atrazina", dosis: 1.0, unidad: "kg/ha" },
      { producto: "Dicamba", dosis: 0.25, unidad: "L/ha" },
      { producto: "Sempra", dosis: 0.15, unidad: "kg/ha" }
    ],
    observaciones: "Maíz silo de segunda en Lote 7."
  },
  {
    id: "tambo-2526-maiz-silo-picado-l7-1ra",
    campo: "Tambo",
    lote: "Lote 7",
    campana: "2025/26",
    cultivo: "Maíz para Silo (1ra)",
    tipo: "Picado",
    estado: "Realizada",
    fecha: "Enero/Febrero 2026",
    superficie: 10.5,
    insumos: [],
    produccion: {
      cantidad: 156,
      unidad: "metros silo",
      rendimiento: 14.86,
      unidadRendimiento: "m/ha",
      destino: "Silo"
    },
    observaciones: "Picado Lote 7 maíz de 1ra: 156 metros en 10,5 ha."
  },
  {
    id: "tambo-2526-maiz-silo-picado-1234",
    campo: "Tambo",
    lote: "Mitad Lote 1 + Lotes 2, 3, 4",
    campana: "2025/26",
    cultivo: "Maíz para Silo",
    tipo: "Picado",
    estado: "Realizada",
    fecha: "Febrero 2026",
    superficie: 30,
    insumos: [],
    produccion: {
      cantidad: 282,
      unidad: "metros silo",
      rendimiento: 9.4,
      unidadRendimiento: "m/ha",
      destino: "Silo"
    },
    observaciones: "Picado mitad Lote 1 + Lotes 2, 3, 4: 282 metros en 30 ha."
  },
  {
    id: "tambo-2526-maiz-silo-picado-l7-2da",
    campo: "Tambo",
    lote: "Lote 7",
    campana: "2025/26",
    cultivo: "Maíz para Silo (2da)",
    tipo: "Picado",
    estado: "Realizada",
    fecha: "Abril/Mayo 2026",
    superficie: 10.5,
    insumos: [],
    produccion: {
      cantidad: 110,
      unidad: "metros silo",
      rendimiento: 10.48,
      unidadRendimiento: "m/ha",
      destino: "Silo"
    },
    observaciones: "Picado Lote 7 maíz de 2da: 110 metros en 10,5 ha. Compras híbridos registradas: KWS 60-950 VIP (~30 bolsas) y ACA VG52 (~20 bolsas)."
  },
  {
    id: "tambo-2526-avena-siembra",
    campo: "Tambo",
    lote: "Lotes 2, 3, 4",
    campana: "2025/26",
    cultivo: "Avena",
    tipo: "Siembra",
    estado: "Realizada",
    fecha: "Otoño 2026",
    superficie: 25,
    insumos: [
      { producto: "Avena Juana", dosis: 40, unidad: "kg/ha" },
      { producto: "Avena Paloma", dosis: 40, unidad: "kg/ha" }
    ],
    discrepancia: "Diferencia menor en identificación de lotes entre planilla de barbecho y hoja de siembra.",
    observaciones: "Siembra de avena ~25 ha. Dosis 80 kg/ha."
  },
  {
    id: "tambo-2526-avena-barbecho",
    campo: "Tambo",
    lote: "Lotes 2, 3, 4",
    campana: "2025/26",
    cultivo: "Avena",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "Otoño 2026",
    superficie: 25,
    insumos: [
      { producto: "Glifosato 66%", dosis: 3.0, unidad: "L/ha" },
      { producto: "2,4-D", dosis: 1.5, unidad: "L/ha" },
      { producto: "Dicamba", dosis: 0.20, unidad: "L/ha" },
      { producto: "Metsulfurón", dosis: 0.010, unidad: "kg/ha", observacion: "10 g/ha" }
    ],
    observaciones: "Barbecho avena Tambo."
  },

  // ========================================================================
  // BIOFERTILIZACIÓN HISTÓRICA DEL TAMBO (2024, 2025, 2026)
  // ========================================================================
  // Lote 1
  {
    id: "tambo-bio-l1-2024",
    campo: "Tambo",
    lote: "Lote 1",
    campana: "2024/25",
    cultivo: "Forrajes / Alfalfa",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2024",
    superficie: 15,
    insumos: [
      { producto: "Efluente líquido de tambo", dosis: 60, unidad: "kL/ha" }
    ],
    observaciones: "Aplicación de efluente líquido de tambo."
  },
  {
    id: "tambo-bio-l1-2025",
    campo: "Tambo",
    lote: "Lote 1",
    campana: "2025/26",
    cultivo: "Forrajes / Alfalfa",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2025",
    superficie: 15,
    insumos: [
      { producto: "Estiércol sólido de tambo", dosis: 42, unidad: "t/ha" }
    ],
    observaciones: "Aplicación con tanque/estercolero."
  },
  {
    id: "tambo-bio-l1-2026",
    campo: "Tambo",
    lote: "Lote 1",
    campana: "2026/27",
    cultivo: "Forrajes / Alfalfa",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2026",
    superficie: 15,
    insumos: [
      { producto: "Estiércol sólido de tambo", dosis: 20, unidad: "t/ha" }
    ],
    observaciones: "Aplicación estiércol sólido."
  },

  // Lote 2
  {
    id: "tambo-bio-l2-2024",
    campo: "Tambo",
    lote: "Lote 2",
    campana: "2024/25",
    cultivo: "Maíz Silo / Avena",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2024",
    superficie: 18,
    insumos: [
      { producto: "Estiércol sólido de tambo", dosis: 22.5, unidad: "t/ha" }
    ],
    observaciones: "Estiércol sólido."
  },
  {
    id: "tambo-bio-l2-2025",
    campo: "Tambo",
    lote: "Lote 2",
    campana: "2025/26",
    cultivo: "Maíz Silo / Avena",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2025",
    superficie: 18,
    insumos: [
      { producto: "Efluente líquido de tambo", dosis: 40.7, unidad: "kL/ha" }
    ],
    observaciones: "Efluente líquido."
  },

  // Lote 3
  {
    id: "tambo-bio-l3-2024",
    campo: "Tambo",
    lote: "Lote 3",
    campana: "2024/25",
    cultivo: "Maíz Silo / Avena",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2024",
    superficie: 12,
    insumos: [
      { producto: "Estiércol sólido de tambo", dosis: 30.9, unidad: "t/ha" }
    ],
    observaciones: "Estiércol sólido."
  },
  {
    id: "tambo-bio-l3-2025",
    campo: "Tambo",
    lote: "Lote 3",
    campana: "2025/26",
    cultivo: "Maíz Silo / Avena",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2025",
    superficie: 12,
    insumos: [
      { producto: "Efluente líquido de tambo", dosis: 54.0, unidad: "kL/ha" }
    ],
    observaciones: "Efluente líquido."
  },

  // Lote 4
  {
    id: "tambo-bio-l4-2024",
    campo: "Tambo",
    lote: "Lote 4",
    campana: "2024/25",
    cultivo: "Maíz Silo / Avena",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2024",
    superficie: 14,
    insumos: [
      { producto: "Efluente líquido de tambo", dosis: 76.5, unidad: "kL/ha" }
    ],
    observaciones: "Efluente líquido."
  },
  {
    id: "tambo-bio-l4-2025",
    campo: "Tambo",
    lote: "Lote 4",
    campana: "2025/26",
    cultivo: "Maíz Silo / Avena",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2025",
    superficie: 14,
    insumos: [
      { producto: "Efluente líquido de tambo", dosis: 46.2, unidad: "kL/ha" }
    ],
    observaciones: "Efluente líquido."
  },
  {
    id: "tambo-bio-l4-2026",
    campo: "Tambo",
    lote: "Lote 4",
    campana: "2026/27",
    cultivo: "Maíz Silo / Avena",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2026",
    superficie: 14,
    insumos: [
      { producto: "Efluente líquido de tambo", dosis: 52.61, unidad: "kL/ha" }
    ],
    observaciones: "Efluente líquido."
  },

  // Lote 5
  {
    id: "tambo-bio-l5-2026",
    campo: "Tambo",
    lote: "Lote 5",
    campana: "2026/27",
    cultivo: "Alfalfa",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2026",
    superficie: 10,
    insumos: [
      { producto: "Estiércol sólido de tambo", dosis: 45.0, unidad: "t/ha" }
    ],
    observaciones: "Estiércol sólido."
  },

  // Lote 7
  {
    id: "tambo-bio-l7-2024",
    campo: "Tambo",
    lote: "Lote 7",
    campana: "2024/25",
    cultivo: "Maíz Silo / Alfalfa",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2024",
    superficie: 10.5,
    insumos: [
      { producto: "Estiércol sólido de tambo", dosis: 85.5, unidad: "t/ha" }
    ],
    observaciones: "Estiércol sólido."
  },
  {
    id: "tambo-bio-l7-2025",
    campo: "Tambo",
    lote: "Lote 7",
    campana: "2025/26",
    cultivo: "Maíz Silo / Alfalfa",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2025",
    superficie: 10.5,
    insumos: [
      { producto: "Estiércol sólido de tambo", dosis: 12.15, unidad: "t/ha" }
    ],
    observaciones: "Estiércol sólido."
  },
  {
    id: "tambo-bio-l7-2026",
    campo: "Tambo",
    lote: "Lote 7",
    campana: "2026/27",
    cultivo: "Maíz Silo / Alfalfa",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2026",
    superficie: 10.5,
    insumos: [
      { producto: "Estiércol sólido de tambo", dosis: 36.0, unidad: "t/ha" },
      { producto: "Efluente líquido de tambo", dosis: 42.9, unidad: "kL/ha" }
    ],
    observaciones: "Aplicación combinada sólido y líquido."
  },

  // Lote 8
  {
    id: "tambo-bio-l8-2025",
    campo: "Tambo",
    lote: "Lote 8",
    campana: "2025/26",
    cultivo: "Alfalfa",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2025",
    superficie: 12,
    insumos: [
      { producto: "Estiércol sólido de tambo", dosis: 21.6, unidad: "t/ha" }
    ],
    observaciones: "Estiércol sólido."
  },
  {
    id: "tambo-bio-l8-2026",
    campo: "Tambo",
    lote: "Lote 8",
    campana: "2026/27",
    cultivo: "Alfalfa",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2026",
    superficie: 12,
    insumos: [
      { producto: "Estiércol sólido de tambo", dosis: 8.0, unidad: "t/ha" }
    ],
    observaciones: "Estiércol sólido."
  },

  // Lote 9
  {
    id: "tambo-bio-l9-2024",
    campo: "Tambo",
    lote: "Lote 9",
    campana: "2024/25",
    cultivo: "Maíz Silo / Alfalfa",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2024",
    superficie: 16,
    insumos: [
      { producto: "Efluente líquido de tambo", dosis: 64.3, unidad: "kL/ha" }
    ],
    observaciones: "Efluente líquido."
  },
  {
    id: "tambo-bio-l9-2025",
    campo: "Tambo",
    lote: "Lote 9",
    campana: "2025/26",
    cultivo: "Maíz Silo / Alfalfa",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2025",
    superficie: 16,
    insumos: [
      { producto: "Estiércol sólido de tambo", dosis: 45.0, unidad: "t/ha" }
    ],
    observaciones: "Estiércol sólido."
  },
  {
    id: "tambo-bio-l9-2026",
    campo: "Tambo",
    lote: "Lote 9",
    campana: "2026/27",
    cultivo: "Maíz Silo / Alfalfa",
    tipo: "Biofertilización",
    estado: "Realizada",
    fecha: "2026",
    superficie: 16,
    insumos: [
      { producto: "Estiércol sólido de tambo", dosis: 17.0, unidad: "t/ha" }
    ],
    observaciones: "Estiércol sólido."
  },

  // ========================================================================
  // CAMPAÑA 2026/27 — LABORES REALIZADAS Y PLANIFICADAS
  // ========================================================================
  // KEUNEKE 2026/27
  {
    id: "knk-2627-barbecho-17may",
    campo: "Keuneke",
    lote: "General (aprox. 50 ha)",
    campana: "2026/27",
    cultivo: "Avena / Soja",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "17/05/2026",
    superficie: 50,
    insumos: [
      { producto: "Glifosato 66%", dosis: 2.0, unidad: "L/ha" },
      { producto: "2,4-D", dosis: 1.2, unidad: "L/ha" },
      { producto: "Dicamba", dosis: 0.20, unidad: "L/ha" },
      { producto: "Metsulfurón", dosis: 0.010, unidad: "kg/ha" },
      { producto: "Sil Oil", dosis: 0.20, unidad: "L/ha" },
      { producto: "Allok", dosis: 0.15, unidad: "L/ha" }
    ],
    observaciones: "Barbecho general de inicio de campaña. Destino posterior: Avena / Soja."
  },
  {
    id: "knk-2627-avena-siembra",
    campo: "Keuneke",
    lote: "General (aprox. 50 ha)",
    campana: "2026/27",
    cultivo: "Avena",
    tipo: "Siembra",
    estado: "Realizada",
    fecha: "Mayo 2026",
    superficie: 50,
    insumos: [
      { producto: "Semilla Avena Omar Tuninetti", dosis: 80, unidad: "kg/ha", observacion: "Bloque aproximado de 44 ha" },
      { producto: "Semilla Avena Paloma", dosis: 80, unidad: "kg/ha", observacion: "Bloque aproximado de 6 ha" }
    ],
    observaciones: "Siembra de avena en Keuneke (50 ha totales)."
  },

  // RACCA 2026/27
  {
    id: "rcc-2627-barbecho-17may",
    campo: "Racca",
    lote: "General (aprox. 100 ha)",
    campana: "2026/27",
    cultivo: "Barbecho Campaña",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "17/05/2026",
    superficie: 100,
    insumos: [
      { producto: "Glifosato 66%", dosis: 2.0, unidad: "L/ha" },
      { producto: "2,4-D", dosis: 1.2, unidad: "L/ha" },
      { producto: "Dicamba", dosis: 0.20, unidad: "L/ha" },
      { producto: "Sumyzin Max", dosis: 1.4, unidad: "L/ha" },
      { producto: "Sil Oil", dosis: 0.20, unidad: "L/ha" },
      { producto: "Allok", dosis: 0.15, unidad: "L/ha" }
    ],
    observaciones: "Barbecho general en Racca (100 ha)."
  },
  {
    id: "rcc-2627-barbecho-repaso",
    campo: "Racca",
    lote: "Repaso (aprox. 65 ha)",
    campana: "2026/27",
    cultivo: "Barbecho Campaña",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "Junio 2026",
    superficie: 65,
    insumos: [
      { producto: "Glifosato granulado 88%", dosis: 1.4, unidad: "kg/ha", observacion: "Sujeto a verificar unidad comercial" },
      { producto: "Todo Terreno", dosis: 0.10, unidad: "L/ha" }
    ],
    observaciones: "Repaso de barbecho sobre 65 ha."
  },

  // KITTY 2026/27
  {
    id: "kitty-2627-barbecho-17may",
    campo: "Kitty",
    lote: "General (aprox. 30 ha)",
    campana: "2026/27",
    cultivo: "Barbecho Campaña",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "17/05/2026",
    superficie: 30,
    insumos: [
      { producto: "Glifosato", dosis: 2.0, unidad: "L/ha" },
      { producto: "2,4-D", dosis: 1.3, unidad: "L/ha" },
      { producto: "Dicamba", dosis: 0.20, unidad: "L/ha" },
      { producto: "Sumyzin Max", dosis: 1.3, unidad: "L/ha" },
      { producto: "Sil Oil", dosis: 0.20, unidad: "L/ha" },
      { producto: "Allok", dosis: 0.15, unidad: "L/ha" }
    ],
    observaciones: "Barbecho general en Kitty."
  },

  // AGUILERA 2026/27
  {
    id: "agu-2627-maiz-prep-27jun",
    campo: "Aguilera",
    lote: "Lote Único",
    campana: "2026/27",
    cultivo: "Maíz",
    tipo: "Barbecho",
    estado: "Realizada",
    fecha: "27/06/2026",
    superficie: 20,
    insumos: [
      { producto: "Glifosato granulado 88%", dosis: 1.4, unidad: "kg/ha", observacion: "Verificar unidad comercial" },
      { producto: "2,4-D etilhexil 89%", dosis: 1.0, unidad: "L/ha" },
      { producto: "Dicamba / Banvel", dosis: 0.22, unidad: "L/ha" },
      { producto: "Atrazina 90%", dosis: 1.0, unidad: "kg/ha" },
      { producto: "Todo Terreno", dosis: 0.10, unidad: "L/ha" }
    ],
    observaciones: "Preparación para maíz 2026/27."
  },
  {
    id: "agu-2627-maiz-siembra-plan",
    campo: "Aguilera",
    lote: "Lote Único",
    campana: "2026/27",
    cultivo: "Maíz",
    tipo: "Siembra",
    estado: "Planificada",
    fecha: "Octubre 2026",
    superficie: 20,
    insumos: [
      { producto: "Semilla de maíz", dosis: null, unidad: "bolsas/ha" }
    ],
    observaciones: "Siembra planificada de maíz grano 2026/27."
  },
  {
    id: "agu-2627-maiz-fert-plan",
    campo: "Aguilera",
    lote: "Lote Único",
    campana: "2026/27",
    cultivo: "Maíz",
    tipo: "Fertilización",
    estado: "Planificada",
    fecha: "Noviembre 2026",
    superficie: 20,
    insumos: [
      { producto: "Urea granulada", dosis: 150, unidad: "kg/ha" }
    ],
    observaciones: "Fertilización nitrogenada proyectada."
  }
];

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
