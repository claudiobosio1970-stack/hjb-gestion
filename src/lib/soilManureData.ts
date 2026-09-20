import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { agricultureData, Activity, isActivityInLote } from "./agricultureData";

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

export interface LiquidManureAnalysis {
  id: string;
  protocolo: string; // "LIQ-01"
  matriz: string; // "Efluente Tambo - Líquido de laguna/fosa"
  laboratorio: string;
  fecha: string;
  nitrogenoKgM3: number; // 1.8 kg N / m³
  fosforoKgM3: number;   // 0.6 kg P / m³
  potasioKgM3: number;   // 2.2 kg K / m³
  azufreKgM3: number;    // 0.2 kg S / m³
  materiaOrganicaKgM3: number; // 15 kg MO / m³
  ph: number;            // 7.8
  ceUsCm: number;        // 4500 uS/cm
  m3PorTanque: number;   // 12 m³
  observaciones?: string;
}

export interface OtherLabAnalysis {
  id: string;
  tipo: "Foliar" | "Agua" | "Forraje / Silaje" | "Granos" | "Otro";
  titulo: string;
  campo?: string;
  lote?: string;
  fecha: string;
  laboratorio: string;
  protocolo?: string;
  parametros: { nombre: string; valor: string | number; unidad?: string }[];
  conclusion?: string;
  observaciones?: string;
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

export const DEFAULT_LIQUID_MANURE_ANALYSIS: LiquidManureAnalysis = {
  id: "liquid-manure-tambo-01",
  protocolo: "LIQ-TAMBO-26",
  matriz: "Efluente Tambo Líquido (Fosa / Laguna de decantación)",
  laboratorio: "Clover Laboratorio (El Trébol)",
  fecha: "2026-08-23",
  nitrogenoKgM3: 1.8,
  fosforoKgM3: 0.6,
  potasioKgM3: 2.2,
  azufreKgM3: 0.2,
  materiaOrganicaKgM3: 15.0,
  ph: 7.8,
  ceUsCm: 4500,
  m3PorTanque: 11,
  observaciones: "Muestreo representativo de fosa de efluentes líquidos previa homogenización. Calibración operativa de tanque a 11.000 L (11 m³).",
};

export const DEFAULT_OTHER_ANALYSES: OtherLabAnalysis[] = [
  {
    id: "other-lab-silo-maiz-2026",
    tipo: "Forraje / Silaje",
    titulo: "Calidad Nutricional Silaje de Maíz Planta Entera",
    campo: "Tambo",
    lote: "Lote 4",
    fecha: "2026-04-15",
    laboratorio: "Laboratorio Molisol",
    protocolo: "FORR-2026-041",
    parametros: [
      { nombre: "Materia Seca", valor: 34.5, unidad: "%" },
      { nombre: "Proteína Bruta (PB)", valor: 8.2, unidad: "%" },
      { nombre: "FDN (Fibra Neutro)", valor: 42.1, unidad: "%" },
      { nombre: "FDA (Fibra Ácido)", valor: 23.4, unidad: "%" },
      { nombre: "Almidón", valor: 31.8, unidad: "%" },
      { nombre: "Digestibilidad MS", valor: 68.5, unidad: "%" },
      { nombre: "Energía Metabolizable", valor: 2.45, unidad: "Mcal/kg MS" },
      { nombre: "pH Silaje", valor: 3.85, unidad: "" },
    ],
    conclusion: "Excelente calidad de fermentación, óptimo porcentaje de almidón y adecuada digestibilidad para vacas en ordeñe.",
    observaciones: "Muestra extraída de frente de silo bolsa Tambo.",
  },
  {
    id: "other-lab-agua-tambo-2026",
    tipo: "Agua",
    titulo: "Análisis Físico-Químico de Agua de Bebida Bovina",
    campo: "Tambo",
    fecha: "2026-05-10",
    laboratorio: "Laboratorio Molisol",
    protocolo: "AGUA-2026-118",
    parametros: [
      { nombre: "pH", valor: 7.4, unidad: "" },
      { nombre: "Conductividad Eléctrica", valor: 1450, unidad: "uS/cm" },
      { nombre: "Sólidos Totales Disueltos", valor: 930, unidad: "mg/L" },
      { nombre: "Sulfatos", valor: 180, unidad: "mg/L" },
      { nombre: "Cloruros", valor: 120, unidad: "mg/L" },
      { nombre: "Nitratos", valor: 22, unidad: "mg/L" },
      { nombre: "Dureza Total (CaCO3)", valor: 260, unidad: "mg/L" },
    ],
    conclusion: "Agua apta para consumo de rodeo lechero de alta producción. Salinidad moderada y bajo tenor de sulfatos.",
    observaciones: "Muestra de salida directa de molino y tanque australiano.",
  },
];

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
    id: "soil-racca-lote-1",
    campo: "Racca",
    lote: "Lote 1",
    fecha: "2026-08-22",
    laboratorio: "Laboratorio Molisol",
    profundidad: "0-20 cm",
    fosforoBrayPpm: 20.1,
    nNo3Ppm: 11.1,
    nDisponibleKgHa: 57.84,
    ph: 6.18,
    conductividadElectricaUsCm: 75,
    materiaOrganicaPct: 2.64,
    azufrePpm: 8.0,
    zincPpm: 0.61,
    calcioPpm: 1823,
    magnesioPpm: 277,
    potasioPpm: 653,
    sodioPpm: 41,
    cicMeq: 17.2,
    satBasesPct: 77.2,
    boroPpm: 0.8,
    hierroPpm: 66,
    manganesoPpm: 48,
    cobrePpm: 1.2,
    nTotalPct: 0.13,
    recomendacionLab: "Para Maíz de 120 qq/ha: MAP c/ S y Zn: 80 kg/ha | Urea: 200 kg/ha",
    observaciones: "Informe Molisol 'Racca 3'. Corresponde a los sectores 3a y 3b trabajados operativamente en Lote 1.",
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
    id: "moisture-racca-lote-1",
    campo: "Racca",
    lote: "Lote 1",
    fecha: "2026-08-22",
    laboratorio: "Laboratorio Molisol",
    totalAguaUtilMm: 305.5,
    estratos: [
      { profundidadCm: "0-20", humedadActualPct: 27.6, pmpPct: 17.6, aguaUtilPct: 66.8, aguaUtilMm: 24.8 },
      { profundidadCm: "20-60", humedadActualPct: 32.6, pmpPct: 19.5, aguaUtilPct: 89.6, aguaUtilMm: 68.1 },
      { profundidadCm: "60-100", humedadActualPct: 30.0, pmpPct: 19.0, aguaUtilPct: 77.2, aguaUtilMm: 57.2 },
      { profundidadCm: "100-150", humedadActualPct: 29.0, pmpPct: 17.5, aguaUtilPct: 87.6, aguaUtilMm: 74.8 },
      { profundidadCm: "150-200", humedadActualPct: 28.4, pmpPct: 16.0, aguaUtilPct: 103.3, aguaUtilMm: 80.6 },
    ],
    observaciones: "Informe Molisol 'Racca 3' (Sector 3a/3b operado en Lote 1). Gran reserva hídrica: 305.5 mm.",
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
const LIQUID_MANURE_STORAGE_KEY = "hjb_liquid_manure_analysis_v1";
const OTHER_ANALYSES_STORAGE_KEY = "hjb_other_analyses_v1";
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

export function saveSoilAnalysis(record: SoilChemicalAnalysis) {
  if (typeof window === "undefined") return;
  const current = listSoilAnalyses();
  const idx = current.findIndex((x) => x.id === record.id);
  const updated = idx >= 0 ? [...current] : [record, ...current];
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

export function deleteSoilAnalysis(id: string) {
  if (typeof window === "undefined") return;
  const current = listSoilAnalyses();
  const updated = current.filter((x) => x.id !== id);
  localStorage.setItem(SOIL_STORAGE_KEY, JSON.stringify(updated));
  notifySoilSync();
  if (db) {
    setDoc(doc(db, "config", "soil_manure_data"), {
      soil_analyses: updated,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(console.error);
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

export function saveMoistureProfile(record: SoilMoistureProfile) {
  if (typeof window === "undefined") return;
  const current = listMoistureProfiles();
  const idx = current.findIndex((x) => x.id === record.id);
  const updated = idx >= 0 ? [...current] : [record, ...current];
  if (idx >= 0) updated[idx] = record;
  localStorage.setItem(MOISTURE_STORAGE_KEY, JSON.stringify(updated));
  notifySoilSync();
  if (db) {
    setDoc(doc(db, "config", "soil_manure_data"), {
      moisture_profiles: updated,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(console.error);
  }
}

export function deleteMoistureProfile(id: string) {
  if (typeof window === "undefined") return;
  const current = listMoistureProfiles();
  const updated = current.filter((x) => x.id !== id);
  localStorage.setItem(MOISTURE_STORAGE_KEY, JSON.stringify(updated));
  notifySoilSync();
  if (db) {
    setDoc(doc(db, "config", "soil_manure_data"), {
      moisture_profiles: updated,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(console.error);
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

export function saveManureAnalysis(record: ManureAnalysis) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MANURE_STORAGE_KEY, JSON.stringify(record));
  notifySoilSync();
  if (db) {
    setDoc(doc(db, "config", "soil_manure_data"), {
      manure_analysis: record,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(console.error);
  }
}

export function getLiquidManureAnalysis(): LiquidManureAnalysis {
  if (typeof window === "undefined") return DEFAULT_LIQUID_MANURE_ANALYSIS;
  try {
    const raw = localStorage.getItem(LIQUID_MANURE_STORAGE_KEY);
    if (!raw) return DEFAULT_LIQUID_MANURE_ANALYSIS;
    return JSON.parse(raw) || DEFAULT_LIQUID_MANURE_ANALYSIS;
  } catch {
    return DEFAULT_LIQUID_MANURE_ANALYSIS;
  }
}

export function saveLiquidManureAnalysis(record: LiquidManureAnalysis) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIQUID_MANURE_STORAGE_KEY, JSON.stringify(record));
  notifySoilSync();
  if (db) {
    setDoc(doc(db, "config", "soil_manure_data"), {
      liquid_manure_analysis: record,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(console.error);
  }
}

export function listOtherAnalyses(): OtherLabAnalysis[] {
  if (typeof window === "undefined") return DEFAULT_OTHER_ANALYSES;
  try {
    const raw = localStorage.getItem(OTHER_ANALYSES_STORAGE_KEY);
    if (!raw) return DEFAULT_OTHER_ANALYSES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_OTHER_ANALYSES;
  } catch {
    return DEFAULT_OTHER_ANALYSES;
  }
}

export function saveOtherAnalysis(record: OtherLabAnalysis) {
  if (typeof window === "undefined") return;
  const current = listOtherAnalyses();
  const idx = current.findIndex((x) => x.id === record.id);
  const updated = idx >= 0 ? [...current] : [record, ...current];
  if (idx >= 0) updated[idx] = record;
  localStorage.setItem(OTHER_ANALYSES_STORAGE_KEY, JSON.stringify(updated));
  notifySoilSync();
  if (db) {
    setDoc(doc(db, "config", "soil_manure_data"), {
      other_analyses: updated,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(console.error);
  }
}

export function deleteOtherAnalysis(id: string) {
  if (typeof window === "undefined") return;
  const current = listOtherAnalyses();
  const updated = current.filter((x) => x.id !== id);
  localStorage.setItem(OTHER_ANALYSES_STORAGE_KEY, JSON.stringify(updated));
  notifySoilSync();
  if (db) {
    setDoc(doc(db, "config", "soil_manure_data"), {
      other_analyses: updated,
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
          if (data.liquid_manure_analysis && typeof data.liquid_manure_analysis === "object") {
            localStorage.setItem(LIQUID_MANURE_STORAGE_KEY, JSON.stringify(data.liquid_manure_analysis));
          }
          if (Array.isArray(data.other_analyses)) {
            localStorage.setItem(OTHER_ANALYSES_STORAGE_KEY, JSON.stringify(data.other_analyses));
          }
          notifySoilSync();
        } else {
          // Inicializar por primera vez en la nube
          setDoc(docRef, {
            soil_analyses: DEFAULT_SOIL_ANALYSES,
            moisture_profiles: DEFAULT_MOISTURE_PROFILES,
            manure_analysis: DEFAULT_MANURE_ANALYSIS,
            liquid_manure_analysis: DEFAULT_LIQUID_MANURE_ANALYSIS,
            other_analyses: DEFAULT_OTHER_ANALYSES,
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
// CALCULADOR Y RECOMENDADOR NUTRICIONAL AVANZADO (N-P-K Y CARROS/TANQUES INTERCAMBIABLES)
// =========================================================================

export interface LoteNutrientSummary {
  campo: string;
  lote: string;
  superficieHa: number;
  cultivo: string;
  campana: string;
  // Análisis previo de suelo
  sueloPrevio?: SoilChemicalAnalysis;
  perfilHumedad?: SoilMoistureProfile;
  // Enmiendas aplicadas (reales o simuladas)
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
  // Metas agronómicas recomendadas N-P-K (kg/ha)
  metaKgHa: {
    nitrogeno: number;
    fosforo: number;
    potasio: number;
  };
  // Cobertura porcentual N-P-K (0 a 100+%)
  coberturaPct: {
    nitrogeno: number;
    fosforo: number;
    potasio: number;
  };
  // OPCIONES INTERCAMBIABLES DINÁMICAS
  soloCarrosRestantes: number;   // Si se decide aplicar 100% SÓLIDO
  soloTanquesRestantes: number;  // Si se decide aplicar 100% LÍQUIDO
  opcionMixtaSugerida: {
    carros: number;
    tanques: number;
  };
  nutrienteLimitante: "Nitrógeno" | "Fósforo" | "Potasio" | "Equilibrado";
  toneladasPorCarro?: number;
  m3PorTanque?: number;
  estadoBalance: "Cubierto con holgura" | "Recomendado aplicar" | "Déficit pendiente";
  mensajeDiagnostico: string;
}

export function getCropDemand(cultivo: string): { metaN: number; metaP: number; metaK: number; nombreNormalizado: string } {
  const c = (cultivo || "").toLowerCase();
  if (c.includes("doble") || (c.includes("silo") && (c.includes("/") || c.includes("m silo")))) {
    return { metaN: 300, metaP: 60, metaK: 340, nombreNormalizado: "Doble Maíz Silo" };
  }
  if (c.includes("avena") && c.includes("maiz")) {
    return { metaN: 230, metaP: 40, metaK: 200, nombreNormalizado: "Avena / Maíz" };
  }
  if (c.includes("silo")) {
    return { metaN: 220, metaP: 40, metaK: 220, nombreNormalizado: "Maíz Silo" };
  }
  if (c.includes("alfalfa")) {
    return { metaN: 60, metaP: 45, metaK: 300, nombreNormalizado: "Alfalfa en Producción" };
  }
  if (c.includes("soja")) {
    return { metaN: 45, metaP: 30, metaK: 75, nombreNormalizado: "Soja de 1ra" };
  }
  if (c.includes("sorgo")) {
    return { metaN: 170, metaP: 30, metaK: 160, nombreNormalizado: "Sorgo Silo / Forrajero" };
  }
  // Maíz de 1ra / Grano comercial (120 qq/ha)
  return { metaN: 200, metaP: 35, metaK: 120, nombreNormalizado: "Maíz 1ra (120 qq)" };
}

export function computeLoteNutrientSummary(
  campo: string,
  loteNombre: string,
  superficieHa: number,
  cultivo: string = "Maíz Silo",
  campana: string = "2026/27",
  simulatedCarros?: number,
  simulatedTanques?: number
): LoteNutrientSummary {
  const cClean = campo.toLowerCase();
  const lClean = loteNombre.toLowerCase().replace(/lote\s*/g, "").trim();

  // 1. Buscar análisis de suelo y humedad para este lote
  const soils = listSoilAnalyses();
  const moistures = listMoistureProfiles();
  const manure = getManureAnalysis();
  const liquidManure = getLiquidManureAnalysis();

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

  // 2. Extraer labores de biofertilización (o usar simulación en vivo)
  const tnCarro = Math.max(0.1, manure.toneladasPorCarro || 5);
  const m3Tanque = Math.max(0.1, liquidManure.m3PorTanque || 11);

  let totalTnSolido = 0;
  let totalM3Liquido = 0;

  if (simulatedCarros !== undefined || simulatedTanques !== undefined) {
    const c = Math.max(0, simulatedCarros ?? 0);
    const t = Math.max(0, simulatedTanques ?? 0);
    totalTnSolido = c * tnCarro;
    totalM3Liquido = t * m3Tanque;
  } else {
    const activities = agricultureData.listActivities();
    const lotesActs = activities.filter((act) => {
      if (act.tipo !== "Biofertilización") return false;
      if (act.estado === "Cancelada") return false;
      // FILTRO ESTRICTO POR CAMPAÑA
      if (campana && act.campana && act.campana.trim() !== campana.trim()) return false;

      return isActivityInLote(act, campo, loteNombre);
    });

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
  }

  const carrosSolido = Math.round(totalTnSolido / tnCarro);
  const tanquesLiquido = Math.round(totalM3Liquido / m3Tanque);

  // 3. Aportes de nutrientes del estiércol sólido (Clover E326)
  const nSolido = totalTnSolido * (manure.nitrogenoTotalPct * 10);
  const pSolido = totalTnSolido * (manure.fosforoTotalPct * 10);
  const kSolido = totalTnSolido * (manure.potasioTotalPct * 10);
  const sSolido = totalTnSolido * (manure.azufreTotalPct * 10);
  const moSolido = totalTnSolido * (manure.materiaOrganicaPct * 10);

  // Aportes de efluente líquido
  const nLiquido = totalM3Liquido * (liquidManure.nitrogenoKgM3 || 1.8);
  const pLiquido = totalM3Liquido * (liquidManure.fosforoKgM3 || 0.6);
  const kLiquido = totalM3Liquido * (liquidManure.potasioKgM3 || 2.2);
  const sLiquido = totalM3Liquido * (liquidManure.azufreKgM3 || 0.2);
  const moLiquido = totalM3Liquido * (liquidManure.materiaOrganicaKgM3 || 15);

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

  // 4. Metas agronómicas N-P-K por tipo de cultivo
  const demand = getCropDemand(cultivo);
  const metaN = demand.metaN;
  const metaP = demand.metaP;
  const metaK = demand.metaK;

  // Suelo previo inicial (Molisol)
  const nSueloKgHa = sueloPrevio ? sueloPrevio.nDisponibleKgHa : 35;
  const pBraySuelo = sueloPrevio ? sueloPrevio.fosforoBrayPpm : 22;
  const kSueloPpm = sueloPrevio ? sueloPrevio.potasioPpm : 600;

  // Déficits por hectárea
  const nTotalDispKgHa = nSueloKgHa + nPorHa;
  const defNKgHa = Math.max(0, metaN - nTotalDispKgHa);
  const defPKgHa = pBraySuelo >= 28 && pPorHa > 0 ? 0 : Math.max(0, metaP - pPorHa);
  const defKKgHa = Math.max(0, metaK - kPorHa);

  // Déficits totales en el lote
  const defNTotal = defNKgHa * sup;
  const defPTotal = defPKgHa * sup;
  const defKTotal = defKKgHa * sup;

  // Aportes unitarios dinámicos según capacidad de carro y tanque configuradas
  const N_POR_CARRO = tnCarro * (manure.nitrogenoTotalPct * 10);
  const P_POR_CARRO = tnCarro * (manure.fosforoTotalPct * 10);
  const K_POR_CARRO = tnCarro * (manure.potasioTotalPct * 10);

  const N_POR_TANQUE = m3Tanque * (liquidManure.nitrogenoKgM3 || 1.8);
  const P_POR_TANQUE = m3Tanque * (liquidManure.fosforoKgM3 || 0.6);
  const K_POR_TANQUE = m3Tanque * (liquidManure.potasioKgM3 || 2.2);

  // OPCIÓN 100% SÓLIDO (Carros de tnCarro)
  const cReqN = defNTotal > 0 ? Math.ceil(defNTotal / Math.max(0.1, N_POR_CARRO)) : 0;
  const cReqP = defPTotal > 0 ? Math.ceil(defPTotal / Math.max(0.1, P_POR_CARRO)) : 0;
  const cReqK = (demand.nombreNormalizado.includes("Silo") || demand.nombreNormalizado.includes("Alfalfa")) && defKTotal > 0
    ? Math.ceil(defKTotal / Math.max(0.1, K_POR_CARRO))
    : 0;

  const soloCarros = Math.max(cReqN, cReqP, cReqK);

  // OPCIÓN 100% LÍQUIDO (Tanques de m3Tanque)
  const tReqN = defNTotal > 0 ? Math.ceil(defNTotal / Math.max(0.1, N_POR_TANQUE)) : 0;
  const tReqP = defPTotal > 0 ? Math.ceil(defPTotal / Math.max(0.1, P_POR_TANQUE)) : 0;
  const tReqK = defKTotal > 0 ? Math.ceil(defKTotal / Math.max(0.1, K_POR_TANQUE)) : 0;

  const soloTanques = Math.max(tReqN, tReqK);

  // OPCIÓN MIXTA SUGERIDA
  let mixtaCarros = 0;
  let mixtaTanques = 0;
  if (soloCarros > 0) {
    if (demand.nombreNormalizado.includes("Alfalfa")) {
      mixtaCarros = 0;
      mixtaTanques = soloTanques;
    } else {
      mixtaCarros = Math.ceil(soloCarros * 0.55);
      const remN = Math.max(0, defNTotal - (mixtaCarros * N_POR_CARRO));
      const remK = Math.max(0, defKTotal - (mixtaCarros * K_POR_CARRO));
      mixtaTanques = Math.ceil(Math.max(remN / Math.max(0.1, N_POR_TANQUE), remK / Math.max(0.1, K_POR_TANQUE)));
    }
  }

  // Nutriente limitante
  let nutrienteLimitante: "Nitrógeno" | "Fósforo" | "Potasio" | "Equilibrado" = "Equilibrado";
  if (soloCarros > 0) {
    if (cReqK >= cReqN && cReqK >= cReqP && cReqK > 0) nutrienteLimitante = "Potasio";
    else if (cReqP >= cReqN && cReqP > 0) nutrienteLimitante = "Fósforo";
    else if (cReqN > 0) nutrienteLimitante = "Nitrógeno";
  }

  // Cobertura porcentual N-P-K
  const covN = Math.min(200, Math.round((nTotalDispKgHa / metaN) * 100));
  const covP = pBraySuelo >= 28 ? 100 : Math.min(200, Math.round((pPorHa / Math.max(1, metaP)) * 100));
  const covK = Math.min(200, Math.round((kPorHa / Math.max(1, metaK)) * 100));

  // Diagnóstico
  let estadoBalance: "Cubierto con holgura" | "Recomendado aplicar" | "Déficit pendiente" = "Cubierto con holgura";
  let mensajeDiagnostico = "";

  if (soloCarros === 0 && soloTanques === 0) {
    estadoBalance = "Cubierto con holgura";
    mensajeDiagnostico = `¡Nutrición N-P-K cubierta con creces para toda la campaña! Se aplicaron ${carrosSolido} carros (${Math.round(totalTnSolido / sup)} t/ha) y ${tanquesLiquido} tanques. Cobertura: N ${covN}%, P ${covP}%, K ${covK}%. Aporte total: ${nPorHa} kg N, ${pPorHa} kg P y ${kPorHa} kg K/ha.`;
  } else if (totalTnSolido === 0 && totalM3Liquido === 0) {
    estadoBalance = "Déficit pendiente";
    mensajeDiagnostico = `Lote sin enmiendas en esta campaña. Requerimiento para ${demand.nombreNormalizado}: ${metaN} kg N, ${metaP} kg P, ${metaK} kg K/ha. Podés cubrir el óptimo tirando: ${soloCarros} carros sólidos Ó bien ${soloTanques} tanques líquidos (o una mezcla de ${mixtaCarros} carros + ${mixtaTanques} tanques).`;
  } else {
    estadoBalance = "Recomendado aplicar";
    mensajeDiagnostico = `Se aplicaron ${carrosSolido} carros y ${tanquesLiquido} tanques. Cobertura: N ${covN}%, P ${covP}%, K ${covK}%. Resta para el óptimo: ${soloCarros} carros sólidos más Ó bien ${soloTanques} tanques líquidos más.`;
  }

  return {
    campo,
    lote: loteNombre,
    superficieHa,
    cultivo: demand.nombreNormalizado,
    campana,
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
    coberturaPct: {
      nitrogeno: covN,
      fosforo: covP,
      potasio: covK,
    },
    soloCarrosRestantes: soloCarros,
    soloTanquesRestantes: soloTanques,
    opcionMixtaSugerida: {
      carros: mixtaCarros,
      tanques: mixtaTanques,
    },
    nutrienteLimitante,
    toneladasPorCarro: tnCarro,
    m3PorTanque: m3Tanque,
    estadoBalance,
    mensajeDiagnostico,
  };
}

