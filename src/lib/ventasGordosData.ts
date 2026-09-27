import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

// ==========================================
// ESTADOS Y ENUMS
// ==========================================
export type EstadoVentaGordo = "PROYECCION" | "TEMPORAL" | "DEFINITIVO" | "CANCELADO";
export type MetodoVentaGordo = "KILO_VIVO" | "RENDIMIENTO";
export type TipoDocumentoVenta = "DTE_GUIA" | "ROMANEO" | "FACTURA_LIQUIDACION" | "OTRO";

// ==========================================
// COSTOS HISTÓRICOS PRODUCTIVOS DE REFERENCIA
// ==========================================
export interface CostoHistoricoPeriodo {
  periodo: string;
  costoDirectoUnitario: number;
  referencia: string;
}

export const COSTOS_HISTORICOS_DEFAULT: CostoHistoricoPeriodo[] = [
  {
    periodo: "Sep-2026",
    costoDirectoUnitario: 794021.98,
    referencia: "Costo oficial lote terminado HJB (Referencia Venta N° 1)",
  },
  {
    periodo: "Ago-2026",
    costoDirectoUnitario: 721058.0,
    referencia: "Actualización de raciones y forrajes de invierno",
  },
  {
    periodo: "Jul-2026",
    costoDirectoUnitario: 707013.0,
    referencia: "Costo base recría y engorde intensivo a corral",
  },
];

// ==========================================
// SUB-ENTIDADES
// ==========================================
export interface AlternativaKiloVivo {
  precioKgVivoArs: number;
  desbasteEstimadoPct: number; // Ref inicial: 8.0%
  pesoCampoKg: number;
  kgDesbasteDescontados: number;
  pesoNetoLiquidableKg: number;
  ingresoBrutoEstimadoArs: number;
  costoDirectoLoteArs: number;
  costoIndirectoArs: number; // 5% transitorio
  gastosVentaEstimadosArs: number; // DT-e, fletes, comisiones
  costoTotalConsideradoArs: number;
  margenOperativoEstimadoArs: number;
  margenPorAnimalArs: number;
  margenSobreVentasPct: number;
  precioEquilibrioKgVivoArs: number;
}

export interface AlternativaRendimiento {
  precioKgResArs: number;
  desbasteTrasladoPct: number; // Ref inicial: 4.0%
  pesoFrigorificoEstimadoKg: number;
  rendimientoEstimadoPct: number; // Ref inicial: 55.82%
  kgResEstimados: number;
  ingresoBrutoEstimadoArs: number;
  costoDirectoLoteArs: number;
  costoIndirectoArs: number; // 5% transitorio
  gastosVentaEstimadosArs: number;
  costoTotalConsideradoArs: number;
  margenOperativoEstimadoArs: number;
  margenPorAnimalArs: number;
  margenSobreVentasPct: number;
  precioEquilibrioKgResArs: number;
}

export interface ProyeccionComercial {
  altKiloVivo: AlternativaKiloVivo;
  altRendimiento: AlternativaRendimiento;
  alternativaRecomendada: MetodoVentaGordo;
  diferenciaMargenFavorRecomendadaArs: number;
}

export interface LiquidacionRealFrigorifico {
  fechaFaena: string;
  pesoCampoRealKg: number;
  pesoFrigorificoRealKg: number;
  desbasteRealPct: number;
  rendimientoRealPct: number;
  kgResReales: number;
  precioRealKgVivoArs?: number;
  precioRealKgResArs?: number;
  ingresoBrutoRealArs: number; // Sin IVA
  gastosDirectosRealesArs: number; // DT-e, fletes, etc.
  costoDirectoRealArs: number;
  costoIndirectoRealArs: number;
  costoTotalRealArs: number;
  margenOperativoRealArs: number;
  margenRealPorAnimalArs: number;
  margenRealSobreVentasPct: number;

  // Comparativa / Desvíos
  desvioIngresoBrutoArs: number; // Real - Proyectado
  desvioIngresoBrutoPct: number;
  desvioMargenOperativoArs: number; // Margen Real - Margen Proyectado
  desvioRendimientoPuntosPct: number; // Rendimiento Real - Rendimiento Estimado
  desvioDesbastePuntosPct: number; // Desbaste Real - Desbaste Estimado
  desvioPesoKg: number; // Peso Real - Peso Estimado
}

export interface DocumentoAdjuntoVenta {
  id: string;
  tipo: TipoDocumentoVenta;
  numeroIdentificador?: string; // ej: DT-e "032417213-0"
  nombreArchivo: string;
  tamanoBytes?: number;
  mimeType?: string;
  archivoUrl?: string; // Data URL o preview
  driveFileId?: string; // Metadata de Google Drive
  observaciones?: string;
  fechaCarga: string;
  usuarioCarga: string;
}

export interface EventoCronologiaVenta {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  descripcion: string;
}

export interface AuditoriaRegistro {
  creadoPor: string;
  creadoEn: string;
  modificadoPor: string;
  modificadoEn: string;
  cerradoPor?: string;
  cerradoEn?: string;
}

// ==========================================
// ENTIDAD PRINCIPAL: EXPEDIENTE DE VENTA
// ==========================================
export interface VentaGordoExpediente {
  id: string;
  numeroVenta: number; // N° inalterable (1, 2, 3...)
  estado: EstadoVentaGordo;

  // Datos Generales
  fechaEstimada: string;
  fechaReal?: string;
  clienteNombre: string;
  frigorificoDestino: string;
  observaciones?: string;

  // Lote
  cantidadEstimada: number;
  cantidadReal?: number;
  pesoPromedioEstimadoKg: number;
  pesoCampoEstimadoKg: number;
  pesoCampoRealKg?: number;

  // Costo
  periodoCosto: string;
  costoDirectoUnitarioAplicado: number;
  porcentajeCostoIndirecto: number; // 5% por defecto

  // Proyección
  proyeccion: ProyeccionComercial;

  // Decisión
  metodoElegido?: MetodoVentaGordo;

  // Cierre Real
  liquidacionReal?: LiquidacionRealFrigorifico;

  // Documentos
  documentos: DocumentoAdjuntoVenta[];

  // Cronología y Auditoría
  cronologia: EventoCronologiaVenta[];
  auditoria: AuditoriaRegistro;

  // Eliminación Lógica
  eliminadoLogico: boolean;
  motivoEliminacion?: string;
}

// ==========================================
// CONSTANTES Y STORAGE
// ==========================================
export const STORAGE_VENTAS_GORDOS = "hjb_ventas_gordos_expedientes_v1";
export const HJB_VENTAS_GORDOS_SYNC_EVENT = "hjb_ventas_gordos_sync_event";

// ==========================================
// VENTA N° 1 HISTÓRICA DE REFERENCIA (OFICIAL)
// ==========================================
export const VENTA_HISTORICA_1_DEFAULT: VentaGordoExpediente = {
  id: "vg-0001",
  numeroVenta: 1,
  estado: "DEFINITIVO",
  fechaEstimada: "2026-08-20",
  fechaReal: "2026-08-20",
  clienteNombre: "La Tercera S.R.L.",
  frigorificoDestino: "Frigorífico La Tercera S.R.L.",
  observaciones: "Primera venta histórica de novillos terminados Holando Argentino con faena y liquidación formal.",
  cantidadEstimada: 12,
  cantidadReal: 12,
  pesoPromedioEstimadoKg: 408.0,
  pesoCampoEstimadoKg: 4896.0,
  pesoCampoRealKg: 4896.0,
  periodoCosto: "Sep-2026",
  costoDirectoUnitarioAplicado: 794021.98,
  porcentajeCostoIndirecto: 5.0,
  metodoElegido: "RENDIMIENTO",
  proyeccion: {
    altKiloVivo: {
      precioKgVivoArs: 4100,
      desbasteEstimadoPct: 8.0,
      pesoCampoKg: 4896.0,
      kgDesbasteDescontados: 391.68,
      pesoNetoLiquidableKg: 4504.32,
      ingresoBrutoEstimadoArs: 18467712,
      costoDirectoLoteArs: 9528263.76,
      costoIndirectoArs: 476413.19,
      gastosVentaEstimadosArs: 22661.41,
      costoTotalConsideradoArs: 10027338.36,
      margenOperativoEstimadoArs: 8440373.64,
      margenPorAnimalArs: 703364.47,
      margenSobreVentasPct: 45.7,
      precioEquilibrioKgVivoArs: 2226.16,
    },
    altRendimiento: {
      precioKgResArs: 7500,
      desbasteTrasladoPct: 4.0,
      pesoFrigorificoEstimadoKg: 4700.16,
      rendimientoEstimadoPct: 55.82,
      kgResEstimados: 2623.63,
      ingresoBrutoEstimadoArs: 19677225,
      costoDirectoLoteArs: 9528263.76,
      costoIndirectoArs: 476413.19,
      gastosVentaEstimadosArs: 22661.41,
      costoTotalConsideradoArs: 10027338.36,
      margenOperativoEstimadoArs: 9649886.64,
      margenPorAnimalArs: 804157.22,
      margenSobreVentasPct: 49.04,
      precioEquilibrioKgResArs: 3821.93,
    },
    alternativaRecomendada: "RENDIMIENTO",
    diferenciaMargenFavorRecomendadaArs: 1209513.0,
  },
  liquidacionReal: {
    fechaFaena: "2026-08-21",
    pesoCampoRealKg: 4896.0,
    pesoFrigorificoRealKg: 4710.0,
    desbasteRealPct: 3.8,
    rendimientoRealPct: 55.82,
    kgResReales: 2629.0,
    precioRealKgVivoArs: 4275.0,
    precioRealKgResArs: 7500.0,
    ingresoBrutoRealArs: 19707750.0,
    gastosDirectosRealesArs: 22661.41,
    costoDirectoRealArs: 9528263.76,
    costoIndirectoRealArs: 476413.19,
    costoTotalRealArs: 10027338.36,
    margenOperativoRealArs: 9680411.64,
    margenRealPorAnimalArs: 806700.97,
    margenRealSobreVentasPct: 49.12,
    desvioIngresoBrutoArs: 30525.0,
    desvioIngresoBrutoPct: 0.16,
    desvioMargenOperativoArs: 30525.0,
    desvioRendimientoPuntosPct: 0.0,
    desvioDesbastePuntosPct: -0.2,
    desvioPesoKg: 0.0,
  },
  documentos: [
    {
      id: "doc-v1-dte",
      tipo: "DTE_GUIA",
      numeroIdentificador: "032417213-0",
      nombreArchivo: "DTe_032417213_0_HJB_LaTercera.pdf",
      fechaCarga: "2026-08-20",
      usuarioCarga: "Nacho",
      observaciones: "Documento de Tránsito Electrónico SENASA oficial.",
    },
    {
      id: "doc-v1-romaneo",
      tipo: "ROMANEO",
      numeroIdentificador: "ROM-2026-0821",
      nombreArchivo: "Romaneo_Faena_21082026_LaTercera.pdf",
      fechaCarga: "2026-08-21",
      usuarioCarga: "Nacho",
      observaciones: "Romaneo oficial de faena. 2.629 kg de res. Rendimiento 55,82%.",
    },
    {
      id: "doc-v1-factura",
      tipo: "FACTURA_LIQUIDACION",
      numeroIdentificador: "LIQ-00124-LaTercera",
      nombreArchivo: "Liquidacion_LaTercera_4610kg_vivos.pdf",
      fechaCarga: "2026-08-24",
      usuarioCarga: "Nacho",
      observaciones: "Liquidación formal: 4.610 kg vivos × $4.275 = $19.707.750.",
    },
  ],
  cronologia: [
    {
      id: "cro-1",
      fecha: "2026-08-18 10:15",
      usuario: "Nacho",
      accion: "Proyección creada",
      descripcion: "Se carga proyección inicial para 12 novillos Holando destino La Tercera S.R.L.",
    },
    {
      id: "cro-2",
      fecha: "2026-08-19 14:30",
      usuario: "Nacho",
      accion: "Método seleccionado",
      descripcion: "Se compara Kilo Vivo vs Rendimiento ($7.500/kg res). Se selecciona venta A Rendimiento por mejor margen.",
    },
    {
      id: "cro-3",
      fecha: "2026-08-19 14:35",
      usuario: "Nacho",
      accion: "Pase a Venta Temporal",
      descripcion: "Operación confirmada comercialmente. Pasa a estado TEMPORAL.",
    },
    {
      id: "cro-4",
      fecha: "2026-08-20 08:00",
      usuario: "Nacho",
      accion: "DT-e adjuntado",
      descripcion: "Se adjunta DT-e N° 032417213-0 para despacho de los 12 animales.",
    },
    {
      id: "cro-5",
      fecha: "2026-08-21 18:40",
      usuario: "Nacho",
      accion: "Romaneo adjuntado",
      descripcion: "Llegó romaneo de faena: 2.629 kg res (55,82% rendimiento).",
    },
    {
      id: "cro-6",
      fecha: "2026-08-24 16:20",
      usuario: "Nacho",
      accion: "Liquidación adjunta y Cierre Definitivo",
      descripcion: "Se carga liquidación formal La Tercera por $19.707.750. Venta cerrada en estado DEFINITIVO.",
    },
  ],
  auditoria: {
    creadoPor: "Nacho",
    creadoEn: "2026-08-18T10:15:00.000Z",
    modificadoPor: "Nacho",
    modificadoEn: "2026-08-24T16:20:00.000Z",
    cerradoPor: "Nacho",
    cerradoEn: "2026-08-24T16:20:00.000Z",
  },
  eliminadoLogico: false,
};

// ==========================================
// FUNCIONES DE CÁLCULO ECONÓMICO
// ==========================================
export function calcularAlternativaKiloVivo(params: {
  pesoCampoTotalKg: number;
  precioKgVivoArs: number;
  desbastePct: number;
  costoDirectoLoteArs: number;
  porcentajeCostoIndirecto?: number;
  gastosVentaArs?: number;
  cantidadCabezas: number;
}): AlternativaKiloVivo {
  const {
    pesoCampoTotalKg,
    precioKgVivoArs,
    desbastePct,
    costoDirectoLoteArs,
    porcentajeCostoIndirecto = 5.0,
    gastosVentaArs = 0,
    cantidadCabezas,
  } = params;

  const kgDesbaste = Number((pesoCampoTotalKg * (desbastePct / 100)).toFixed(2));
  const pesoNetoLiquidable = Number((pesoCampoTotalKg - kgDesbaste).toFixed(2));
  const ingresoBruto = Number((pesoNetoLiquidable * precioKgVivoArs).toFixed(2));

  const costoIndirecto = Number((costoDirectoLoteArs * (porcentajeCostoIndirecto / 100)).toFixed(2));
  const costoTotal = Number((costoDirectoLoteArs + costoIndirecto + gastosVentaArs).toFixed(2));

  const margenOperativo = Number((ingresoBruto - costoTotal).toFixed(2));
  const margenPorAnimal = cantidadCabezas > 0 ? Number((margenOperativo / cantidadCabezas).toFixed(2)) : 0;
  const margenSobreVentasPct = ingresoBruto > 0 ? Number(((margenOperativo / ingresoBruto) * 100).toFixed(2)) : 0;
  const precioEquilibrio = pesoNetoLiquidable > 0 ? Number((costoTotal / pesoNetoLiquidable).toFixed(2)) : 0;

  return {
    precioKgVivoArs,
    desbasteEstimadoPct: desbastePct,
    pesoCampoKg: pesoCampoTotalKg,
    kgDesbasteDescontados: kgDesbaste,
    pesoNetoLiquidableKg: pesoNetoLiquidable,
    ingresoBrutoEstimadoArs: ingresoBruto,
    costoDirectoLoteArs,
    costoIndirectoArs: costoIndirecto,
    gastosVentaEstimadosArs: gastosVentaArs,
    costoTotalConsideradoArs: costoTotal,
    margenOperativoEstimadoArs: margenOperativo,
    margenPorAnimalArs: margenPorAnimal,
    margenSobreVentasPct,
    precioEquilibrioKgVivoArs: precioEquilibrio,
  };
}

export function calcularAlternativaRendimiento(params: {
  pesoCampoTotalKg: number;
  precioKgResArs: number;
  desbasteTrasladoPct: number;
  rendimientoPct: number;
  costoDirectoLoteArs: number;
  porcentajeCostoIndirecto?: number;
  gastosVentaArs?: number;
  cantidadCabezas: number;
}): AlternativaRendimiento {
  const {
    pesoCampoTotalKg,
    precioKgResArs,
    desbasteTrasladoPct,
    rendimientoPct,
    costoDirectoLoteArs,
    porcentajeCostoIndirecto = 5.0,
    gastosVentaArs = 0,
    cantidadCabezas,
  } = params;

  const pesoFrigorifico = Number((pesoCampoTotalKg * (1 - desbasteTrasladoPct / 100)).toFixed(2));
  const kgResEstimados = Number((pesoFrigorifico * (rendimientoPct / 100)).toFixed(2));
  const ingresoBruto = Number((kgResEstimados * precioKgResArs).toFixed(2));

  const costoIndirecto = Number((costoDirectoLoteArs * (porcentajeCostoIndirecto / 100)).toFixed(2));
  const costoTotal = Number((costoDirectoLoteArs + costoIndirecto + gastosVentaArs).toFixed(2));

  const margenOperativo = Number((ingresoBruto - costoTotal).toFixed(2));
  const margenPorAnimal = cantidadCabezas > 0 ? Number((margenOperativo / cantidadCabezas).toFixed(2)) : 0;
  const margenSobreVentasPct = ingresoBruto > 0 ? Number(((margenOperativo / ingresoBruto) * 100).toFixed(2)) : 0;
  const precioEquilibrio = kgResEstimados > 0 ? Number((costoTotal / kgResEstimados).toFixed(2)) : 0;

  return {
    precioKgResArs,
    desbasteTrasladoPct,
    pesoFrigorificoEstimadoKg: pesoFrigorifico,
    rendimientoEstimadoPct: rendimientoPct,
    kgResEstimados,
    ingresoBrutoEstimadoArs: ingresoBruto,
    costoDirectoLoteArs,
    costoIndirectoArs: costoIndirecto,
    gastosVentaEstimadosArs: gastosVentaArs,
    costoTotalConsideradoArs: costoTotal,
    margenOperativoEstimadoArs: margenOperativo,
    margenPorAnimalArs: margenPorAnimal,
    margenSobreVentasPct,
    precioEquilibrioKgResArs: precioEquilibrio,
  };
}

export function generarProyeccionComercial(params: {
  pesoCampoTotalKg: number;
  cantidadCabezas: number;
  costoDirectoUnitario: number;
  porcentajeCostoIndirecto?: number;
  gastosVentaArs?: number;
  precioKgVivoArs: number;
  desbasteKiloVivoPct?: number;
  precioKgResArs: number;
  desbasteTrasladoPct?: number;
  rendimientoEstimadoPct?: number;
}): ProyeccionComercial {
  const costoDirectoLoteArs = Number((params.costoDirectoUnitario * params.cantidadCabezas).toFixed(2));

  const altKiloVivo = calcularAlternativaKiloVivo({
    pesoCampoTotalKg: params.pesoCampoTotalKg,
    precioKgVivoArs: params.precioKgVivoArs,
    desbastePct: params.desbasteKiloVivoPct ?? 8.0,
    costoDirectoLoteArs,
    porcentajeCostoIndirecto: params.porcentajeCostoIndirecto ?? 5.0,
    gastosVentaArs: params.gastosVentaArs ?? 0,
    cantidadCabezas: params.cantidadCabezas,
  });

  const altRendimiento = calcularAlternativaRendimiento({
    pesoCampoTotalKg: params.pesoCampoTotalKg,
    precioKgResArs: params.precioKgResArs,
    desbasteTrasladoPct: params.desbasteTrasladoPct ?? 4.0,
    rendimientoPct: params.rendimientoEstimadoPct ?? 55.82,
    costoDirectoLoteArs,
    porcentajeCostoIndirecto: params.porcentajeCostoIndirecto ?? 5.0,
    gastosVentaArs: params.gastosVentaArs ?? 0,
    cantidadCabezas: params.cantidadCabezas,
  });

  const diff = altRendimiento.margenOperativoEstimadoArs - altKiloVivo.margenOperativoEstimadoArs;
  const alternativaRecomendada: MetodoVentaGordo = diff >= 0 ? "RENDIMIENTO" : "KILO_VIVO";

  return {
    altKiloVivo,
    altRendimiento,
    alternativaRecomendada,
    diferenciaMargenFavorRecomendadaArs: Number(Math.abs(diff).toFixed(2)),
  };
}

// ==========================================
// CÁLCULO DE DESVÍOS DEFINITIVOS
// ==========================================
export function calcularLiquidacionRealConDesvios(params: {
  proyeccion: ProyeccionComercial;
  metodoElegido: MetodoVentaGordo;
  pesoCampoRealKg: number;
  pesoFrigorificoRealKg: number;
  kgResReales: number;
  ingresoBrutoRealArs: number;
  gastosDirectosRealesArs: number;
  costoDirectoRealArs: number;
  porcentajeCostoIndirecto?: number;
  cantidadReal: number;
  precioRealKgVivoArs?: number;
  precioRealKgResArs?: number;
  fechaFaena: string;
}): LiquidacionRealFrigorifico {
  const {
    proyeccion,
    metodoElegido,
    pesoCampoRealKg,
    pesoFrigorificoRealKg,
    kgResReales,
    ingresoBrutoRealArs,
    gastosDirectosRealesArs,
    costoDirectoRealArs,
    porcentajeCostoIndirecto = 5.0,
    cantidadReal,
    precioRealKgVivoArs,
    precioRealKgResArs,
    fechaFaena,
  } = params;

  // Rendimiento y desbaste reales
  const desbasteRealPct =
    pesoCampoRealKg > 0
      ? Number((((pesoCampoRealKg - pesoFrigorificoRealKg) / pesoCampoRealKg) * 100).toFixed(2))
      : 0;

  const rendimientoRealPct =
    pesoFrigorificoRealKg > 0 ? Number(((kgResReales / pesoFrigorificoRealKg) * 100).toFixed(2)) : 0;

  const costoIndirectoReal = Number((costoDirectoRealArs * (porcentajeCostoIndirecto / 100)).toFixed(2));
  const costoTotalReal = Number((costoDirectoRealArs + costoIndirectoReal + gastosDirectosRealesArs).toFixed(2));

  const margenOperativoReal = Number((ingresoBrutoRealArs - costoTotalReal).toFixed(2));
  const margenRealPorAnimal = cantidadReal > 0 ? Number((margenOperativoReal / cantidadReal).toFixed(2)) : 0;
  const margenRealSobreVentasPct =
    ingresoBrutoRealArs > 0 ? Number(((margenOperativoReal / ingresoBrutoRealArs) * 100).toFixed(2)) : 0;

  // Referencia proyectada según el método que se había elegido
  const altRef = metodoElegido === "RENDIMIENTO" ? proyeccion.altRendimiento : proyeccion.altKiloVivo;
  const ingresoProyectado = altRef.ingresoBrutoEstimadoArs;
  const margenProyectado = altRef.margenOperativoEstimadoArs;
  const desbasteProyectado =
    metodoElegido === "RENDIMIENTO"
      ? proyeccion.altRendimiento.desbasteTrasladoPct
      : proyeccion.altKiloVivo.desbasteEstimadoPct;
  const rendimientoProyectado = proyeccion.altRendimiento.rendimientoEstimadoPct;
  const pesoEstimado =
    metodoElegido === "RENDIMIENTO"
      ? proyeccion.altRendimiento.pesoFrigorificoEstimadoKg
      : proyeccion.altKiloVivo.pesoCampoKg;

  const desvioIngresoBrutoArs = Number((ingresoBrutoRealArs - ingresoProyectado).toFixed(2));
  const desvioIngresoBrutoPct =
    ingresoProyectado > 0 ? Number(((desvioIngresoBrutoArs / ingresoProyectado) * 100).toFixed(2)) : 0;
  const desvioMargenOperativoArs = Number((margenOperativoReal - margenProyectado).toFixed(2));
  const desvioRendimientoPuntosPct = Number((rendimientoRealPct - rendimientoProyectado).toFixed(2));
  const desvioDesbastePuntosPct = Number((desbasteRealPct - desbasteProyectado).toFixed(2));
  const desvioPesoKg = Number((pesoFrigorificoRealKg - pesoEstimado).toFixed(2));

  return {
    fechaFaena,
    pesoCampoRealKg,
    pesoFrigorificoRealKg,
    desbasteRealPct,
    rendimientoRealPct,
    kgResReales,
    precioRealKgVivoArs,
    precioRealKgResArs,
    ingresoBrutoRealArs,
    gastosDirectosRealesArs,
    costoDirectoRealArs,
    costoIndirectoRealArs: costoIndirectoReal,
    costoTotalRealArs: costoTotalReal,
    margenOperativoRealArs: margenOperativoReal,
    margenRealPorAnimalArs: margenRealPorAnimal,
    margenRealSobreVentasPct,
    desvioIngresoBrutoArs,
    desvioIngresoBrutoPct,
    desvioMargenOperativoArs,
    desvioRendimientoPuntosPct,
    desvioDesbastePuntosPct,
    desvioPesoKg,
  };
}

// ==========================================
// FUNCIONES DE ALMACENAMIENTO Y SINCRONIZACIÓN
// ==========================================
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    result[key] = val === undefined ? null : sanitizeForFirestore(val);
  }
  return result;
}

export function getVentasGordos(): VentaGordoExpediente[] {
  if (typeof window === "undefined") return [VENTA_HISTORICA_1_DEFAULT];
  try {
    const raw = localStorage.getItem(STORAGE_VENTAS_GORDOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error al leer ventas gordos de localStorage:", err);
  }
  // Si no hay datos, inicializamos con la Venta N° 1 histórica de referencia
  saveVentasGordos([VENTA_HISTORICA_1_DEFAULT]);
  return [VENTA_HISTORICA_1_DEFAULT];
}

export function saveVentasGordos(ventas: VentaGordoExpediente[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_VENTAS_GORDOS, JSON.stringify(ventas));
    window.dispatchEvent(new Event(HJB_VENTAS_GORDOS_SYNC_EVENT));
  } catch (err) {
    console.error("Error al guardar ventas gordos en localStorage:", err);
  }
}

export function getVentaGordoById(id: string): VentaGordoExpediente | undefined {
  const all = getVentasGordos();
  return all.find((v) => v.id === id);
}

export function getProximoNumeroVenta(): number {
  const all = getVentasGordos();
  if (all.length === 0) return 1;
  const max = Math.max(...all.map((v) => v.numeroVenta || 0));
  return max + 1;
}

/**
 * Detecta si existe una operación similar para advertir duplicados.
 */
export function buscarOperacionSimilar(params: {
  fecha: string;
  cliente: string;
  cantidad: number;
  pesoCampo: number;
  excluirId?: string;
}): VentaGordoExpediente | undefined {
  const all = getVentasGordos().filter((v) => !v.eliminadoLogico && v.id !== params.excluirId);
  const clienteNorm = params.cliente.trim().toLowerCase();

  return all.find((v) => {
    const mismaFecha = (v.fechaEstimada || "").slice(0, 10) === params.fecha.slice(0, 10);
    const mismoCliente = (v.clienteNombre || "").trim().toLowerCase() === clienteNorm;
    const cantCercana = Math.abs(v.cantidadEstimada - params.cantidad) <= 2;
    const pesoCercano = Math.abs(v.pesoCampoEstimadoKg - params.pesoCampo) / (params.pesoCampo || 1) <= 0.08;
    return mismaFecha && mismoCliente && (cantCercana || pesoCercano);
  });
}

// ==========================================
// TRANSICIONES DE ESTADO Y MUTACIONES
// ==========================================

/**
 * Crea una nueva venta en estado PROYECCIÓN.
 */
export function crearProyeccionVenta(datos: {
  fechaEstimada: string;
  clienteNombre: string;
  frigorificoDestino: string;
  cantidadEstimada: number;
  pesoPromedioEstimadoKg: number;
  periodoCosto: string;
  costoDirectoUnitario: number;
  porcentajeCostoIndirecto?: number;
  gastosVentaArs?: number;
  precioKgVivoArs: number;
  desbasteKiloVivoPct?: number;
  precioKgResArs: number;
  desbasteTrasladoPct?: number;
  rendimientoEstimadoPct?: number;
  observaciones?: string;
  usuario: string;
}): VentaGordoExpediente {
  const all = getVentasGordos();
  const numeroVenta = getProximoNumeroVenta();
  const id = `vg-${String(numeroVenta).padStart(4, "0")}`;
  const nowIso = new Date().toISOString();
  const pesoCampoTotalKg = Number((datos.cantidadEstimada * datos.pesoPromedioEstimadoKg).toFixed(1));

  const proyeccion = generarProyeccionComercial({
    pesoCampoTotalKg,
    cantidadCabezas: datos.cantidadEstimada,
    costoDirectoUnitario: datos.costoDirectoUnitario,
    porcentajeCostoIndirecto: datos.porcentajeCostoIndirecto,
    gastosVentaArs: datos.gastosVentaArs,
    precioKgVivoArs: datos.precioKgVivoArs,
    desbasteKiloVivoPct: datos.desbasteKiloVivoPct,
    precioKgResArs: datos.precioKgResArs,
    desbasteTrasladoPct: datos.desbasteTrasladoPct,
    rendimientoEstimadoPct: datos.rendimientoEstimadoPct,
  });

  const nuevaVenta: VentaGordoExpediente = {
    id,
    numeroVenta,
    estado: "PROYECCION",
    fechaEstimada: datos.fechaEstimada,
    clienteNombre: datos.clienteNombre,
    frigorificoDestino: datos.frigorificoDestino,
    observaciones: datos.observaciones,
    cantidadEstimada: datos.cantidadEstimada,
    pesoPromedioEstimadoKg: datos.pesoPromedioEstimadoKg,
    pesoCampoEstimadoKg: pesoCampoTotalKg,
    periodoCosto: datos.periodoCosto,
    costoDirectoUnitarioAplicado: datos.costoDirectoUnitario,
    porcentajeCostoIndirecto: datos.porcentajeCostoIndirecto ?? 5.0,
    proyeccion,
    documentos: [],
    cronologia: [
      {
        id: `cro-${Date.now()}-1`,
        fecha: new Date().toLocaleString("es-AR"),
        usuario: datos.usuario,
        accion: "Venta creada",
        descripcion: `Expediente N° ${numeroVenta} iniciado en estado PROYECCIÓN para ${datos.cantidadEstimada} novillos (${datos.clienteNombre}).`,
      },
    ],
    auditoria: {
      creadoPor: datos.usuario,
      creadoEn: nowIso,
      modificadoPor: datos.usuario,
      modificadoEn: nowIso,
    },
    eliminadoLogico: false,
  };

  const actualizadas = [nuevaVenta, ...all];
  saveVentasGordos(actualizadas);

  // Sync Firestore en segundo plano
  try {
    setDoc(doc(db, "ventas_gordos", nuevaVenta.id), sanitizeForFirestore(nuevaVenta)).catch(console.error);
  } catch (err) {
    console.warn("Firestore sync error:", err);
  }

  return nuevaVenta;
}

/**
 * Pasa una venta de PROYECCIÓN a TEMPORAL (con el método elegido).
 */
export function pasarVentaATemporal(params: {
  ventaId: string;
  metodoElegido: MetodoVentaGordo;
  usuario: string;
  observaciones?: string;
}): VentaGordoExpediente {
  const all = getVentasGordos();
  const index = all.findIndex((v) => v.id === params.ventaId);
  if (index < 0) throw new Error("Venta no encontrada");

  const v = all[index];
  const nowIso = new Date().toISOString();
  const fechaStr = new Date().toLocaleString("es-AR");

  const metodoTexto = params.metodoElegido === "RENDIMIENTO" ? "A Rendimiento" : "Por Kilo Vivo";

  const evento: EventoCronologiaVenta = {
    id: `cro-${Date.now()}`,
    fecha: fechaStr,
    usuario: params.usuario,
    accion: "Pase a Venta Temporal",
    descripcion: `Decisión comercial confirmada. Método seleccionado: ${metodoTexto}. Operación guardada como TEMPORAL.`,
  };

  const updated: VentaGordoExpediente = {
    ...v,
    estado: "TEMPORAL",
    metodoElegido: params.metodoElegido,
    observaciones: params.observaciones ?? v.observaciones,
    cronologia: [evento, ...v.cronologia],
    auditoria: {
      ...v.auditoria,
      modificadoPor: params.usuario,
      modificadoEn: nowIso,
    },
  };

  all[index] = updated;
  saveVentasGordos(all);

  try {
    setDoc(doc(db, "ventas_gordos", updated.id), sanitizeForFirestore(updated), { merge: true }).catch(console.error);
  } catch (err) {
    console.warn("Firestore sync error:", err);
  }

  return updated;
}

/**
 * Cierra definitivamente una venta pasando a DEFINITIVO con datos reales.
 */
export function cerrarVentaADefinitivo(params: {
  ventaId: string;
  fechaReal: string;
  fechaFaena: string;
  cantidadReal: number;
  pesoCampoRealKg: number;
  pesoFrigorificoRealKg: number;
  kgResReales: number;
  precioRealKgVivoArs?: number;
  precioRealKgResArs?: number;
  ingresoBrutoRealArs: number;
  gastosDirectosRealesArs: number;
  frigorificoReal?: string;
  observaciones?: string;
  usuario: string;
}): VentaGordoExpediente {
  const all = getVentasGordos();
  const index = all.findIndex((v) => v.id === params.ventaId);
  if (index < 0) throw new Error("Venta no encontrada");

  const v = all[index];
  const nowIso = new Date().toISOString();
  const fechaStr = new Date().toLocaleString("es-AR");

  // Costo directo total del lote real
  const costoDirectoRealArs = Number((v.costoDirectoUnitarioAplicado * params.cantidadReal).toFixed(2));

  const liquidacionReal = calcularLiquidacionRealConDesvios({
    proyeccion: v.proyeccion,
    metodoElegido: v.metodoElegido || "RENDIMIENTO",
    pesoCampoRealKg: params.pesoCampoRealKg,
    pesoFrigorificoRealKg: params.pesoFrigorificoRealKg,
    kgResReales: params.kgResReales,
    ingresoBrutoRealArs: params.ingresoBrutoRealArs,
    gastosDirectosRealesArs: params.gastosDirectosRealesArs,
    costoDirectoRealArs,
    porcentajeCostoIndirecto: v.porcentajeCostoIndirecto,
    cantidadReal: params.cantidadReal,
    precioRealKgVivoArs: params.precioRealKgVivoArs,
    precioRealKgResArs: params.precioRealKgResArs,
    fechaFaena: params.fechaFaena,
  });

  const evento: EventoCronologiaVenta = {
    id: `cro-${Date.now()}`,
    fecha: fechaStr,
    usuario: params.usuario,
    accion: "Venta cerrada como DEFINITIVO",
    descripcion: `Liquidación real cargada: ${params.cantidadReal} cabezas, ${params.kgResReales} kg res, ingreso bruto real $${params.ingresoBrutoRealArs.toLocaleString("es-AR")}. Margen operativo definitivo: $${liquidacionReal.margenOperativoRealArs.toLocaleString("es-AR")}.`,
  };

  const updated: VentaGordoExpediente = {
    ...v,
    estado: "DEFINITIVO",
    fechaReal: params.fechaReal,
    cantidadReal: params.cantidadReal,
    pesoCampoRealKg: params.pesoCampoRealKg,
    frigorificoDestino: params.frigorificoReal || v.frigorificoDestino,
    observaciones: params.observaciones ?? v.observaciones,
    liquidacionReal,
    cronologia: [evento, ...v.cronologia],
    auditoria: {
      ...v.auditoria,
      modificadoPor: params.usuario,
      modificadoEn: nowIso,
      cerradoPor: params.usuario,
      cerradoEn: nowIso,
    },
  };

  all[index] = updated;
  saveVentasGordos(all);

  try {
    setDoc(doc(db, "ventas_gordos", updated.id), sanitizeForFirestore(updated), { merge: true }).catch(console.error);
  } catch (err) {
    console.warn("Firestore sync error:", err);
  }

  return updated;
}

/**
 * Adjunta un documento al expediente.
 */
export function adjuntarDocumentoVenta(params: {
  ventaId: string;
  tipo: TipoDocumentoVenta;
  numeroIdentificador?: string;
  nombreArchivo: string;
  tamanoBytes?: number;
  mimeType?: string;
  archivoUrl?: string;
  driveFileId?: string;
  observaciones?: string;
  usuario: string;
}): VentaGordoExpediente {
  const all = getVentasGordos();
  const index = all.findIndex((v) => v.id === params.ventaId);
  if (index < 0) throw new Error("Venta no encontrada");

  const v = all[index];
  const nowIso = new Date().toISOString();
  const fechaStr = new Date().toLocaleString("es-AR");

  const nuevoDoc: DocumentoAdjuntoVenta = {
    id: `doc-${Date.now()}`,
    tipo: params.tipo,
    numeroIdentificador: params.numeroIdentificador,
    nombreArchivo: params.nombreArchivo,
    tamanoBytes: params.tamanoBytes,
    mimeType: params.mimeType,
    archivoUrl: params.archivoUrl,
    driveFileId: params.driveFileId,
    observaciones: params.observaciones,
    fechaCarga: fechaStr,
    usuarioCarga: params.usuario,
  };

  const tipoLabel =
    params.tipo === "DTE_GUIA"
      ? "DT-e / Guía"
      : params.tipo === "ROMANEO"
      ? "Romaneo de Faena"
      : params.tipo === "FACTURA_LIQUIDACION"
      ? "Factura / Liquidación"
      : "Documento";

  const evento: EventoCronologiaVenta = {
    id: `cro-${Date.now()}`,
    fecha: fechaStr,
    usuario: params.usuario,
    accion: `Documento adjuntado: ${tipoLabel}`,
    descripcion: `Se adjuntó "${params.nombreArchivo}"${params.numeroIdentificador ? ` (N° ${params.numeroIdentificador})` : ""}.`,
  };

  const updated: VentaGordoExpediente = {
    ...v,
    documentos: [nuevoDoc, ...v.documentos],
    cronologia: [evento, ...v.cronologia],
    auditoria: {
      ...v.auditoria,
      modificadoPor: params.usuario,
      modificadoEn: nowIso,
    },
  };

  all[index] = updated;
  saveVentasGordos(all);

  try {
    setDoc(doc(db, "ventas_gordos", updated.id), sanitizeForFirestore(updated), { merge: true }).catch(console.error);
  } catch (err) {
    console.warn("Firestore sync error:", err);
  }

  return updated;
}

/**
 * Eliminación Lógica con confirmación y auditoría.
 */
export function eliminarVentaGordoLogico(params: {
  ventaId: string;
  motivo: string;
  usuario: string;
}): boolean {
  const all = getVentasGordos();
  const index = all.findIndex((v) => v.id === params.ventaId);
  if (index < 0) return false;

  const v = all[index];
  const nowIso = new Date().toISOString();
  const fechaStr = new Date().toLocaleString("es-AR");

  const evento: EventoCronologiaVenta = {
    id: `cro-${Date.now()}`,
    fecha: fechaStr,
    usuario: params.usuario,
    accion: "Venta dada de baja (eliminación lógica)",
    descripcion: `Operación N° ${v.numeroVenta} eliminada lógicamente. Motivo: ${params.motivo}`,
  };

  const updated: VentaGordoExpediente = {
    ...v,
    eliminadoLogico: true,
    motivoEliminacion: params.motivo,
    cronologia: [evento, ...v.cronologia],
    auditoria: {
      ...v.auditoria,
      modificadoPor: params.usuario,
      modificadoEn: nowIso,
    },
  };

  all[index] = updated;
  saveVentasGordos(all);

  try {
    setDoc(doc(db, "ventas_gordos", updated.id), sanitizeForFirestore(updated), { merge: true }).catch(console.error);
  } catch (err) {
    console.warn("Firestore sync error:", err);
  }

  return true;
}

/**
 * Inicializa la escucha en tiempo real de Firestore para multiusuario.
 */
export function initVentasGordosFirestoreSync(): () => void {
  if (typeof window === "undefined") return () => {};
  try {
    const colRef = collection(db, "ventas_gordos");
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const remotos: VentaGordoExpediente[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as VentaGordoExpediente;
            if (data && data.numeroVenta) {
              remotos.push(data);
            }
          });
          if (remotos.length > 0) {
            // Ordenar por número descendente
            remotos.sort((a, b) => (b.numeroVenta || 0) - (a.numeroVenta || 0));
            // Actualizar localStorage sin disparar bucle infinito
            localStorage.setItem(STORAGE_VENTAS_GORDOS, JSON.stringify(remotos));
            window.dispatchEvent(new Event(HJB_VENTAS_GORDOS_SYNC_EVENT));
          }
        } else {
          // Si Firestore está vacío, subimos la Venta N° 1 inicial
          setDoc(doc(db, "ventas_gordos", VENTA_HISTORICA_1_DEFAULT.id), sanitizeForFirestore(VENTA_HISTORICA_1_DEFAULT)).catch(console.error);
        }
      },
      (error) => {
        console.warn("Error en listener de Firestore ventas_gordos:", error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn("No se pudo iniciar listener Firestore ventas_gordos:", err);
    return () => {};
  }
}

/**
 * Determina el estado de completitud de la documentación.
 */
export function getEstadoDocumentacion(documentos: DocumentoAdjuntoVenta[]): {
  estado: "incompleta" | "parcial" | "completa";
  label: string;
  color: string;
  tieneDte: boolean;
  tieneRomaneo: boolean;
  tieneFactura: boolean;
} {
  const tieneDte = documentos.some((d) => d.tipo === "DTE_GUIA");
  const tieneRomaneo = documentos.some((d) => d.tipo === "ROMANEO");
  const tieneFactura = documentos.some((d) => d.tipo === "FACTURA_LIQUIDACION");

  if (tieneDte && tieneRomaneo && tieneFactura) {
    return { estado: "completa", label: "Completa (3/3)", color: "#166534", tieneDte, tieneRomaneo, tieneFactura };
  }
  if (tieneDte || tieneRomaneo || tieneFactura) {
    const count = (tieneDte ? 1 : 0) + (tieneRomaneo ? 1 : 0) + (tieneFactura ? 1 : 0);
    return { estado: "parcial", label: `Parcial (${count}/3)`, color: "#ca8a04", tieneDte, tieneRomaneo, tieneFactura };
  }
  return { estado: "incompleta", label: "Incompleta (0/3)", color: "#dc2626", tieneDte, tieneRomaneo, tieneFactura };
}

// ==========================================
// CLIENTES COMPRADORES Y FRIGORÍFICOS DESTINO
// ==========================================
export const STORAGE_CLIENTES_GORDOS = "hjb_clientes_gordos_list";
export const STORAGE_FRIGORIFICOS_GORDOS = "hjb_frigorificos_gordos_list";

export const CLIENTES_COMPRADORES_DEFAULT: string[] = [
  "La Tercera S.R.L.",
  "Cabaña La Rosalía",
  "Haciendas del Sur",
  "Consignaciones Córdoba",
  "Cooperativa Agropecuaria",
];

export const FRIGORIFICOS_DESTINO_DEFAULT: string[] = [
  "Frigorífico Logros S.A.",
  "Frigorífico Swift Argentina",
  "Frigorífico La Tercera S.R.L.",
  "Frigorífico Mattievich",
  "Frigorífico Rioplatense",
];

export function getClientesCompradores(): string[] {
  if (typeof window === "undefined") return CLIENTES_COMPRADORES_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_CLIENTES_GORDOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return CLIENTES_COMPRADORES_DEFAULT;
}

export function agregarClienteComprador(nombre: string): string[] {
  const clean = nombre.trim();
  if (!clean) return getClientesCompradores();
  const current = getClientesCompradores();
  if (!current.some((c) => c.toLowerCase() === clean.toLowerCase())) {
    const updated = [clean, ...current];
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_CLIENTES_GORDOS, JSON.stringify(updated));
    }
    return updated;
  }
  return current;
}

export function getFrigorificosDestino(): string[] {
  if (typeof window === "undefined") return FRIGORIFICOS_DESTINO_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_FRIGORIFICOS_GORDOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return FRIGORIFICOS_DESTINO_DEFAULT;
}

export function agregarFrigorificoDestino(nombre: string): string[] {
  const clean = nombre.trim();
  if (!clean) return getFrigorificosDestino();
  const current = getFrigorificosDestino();
  if (!current.some((f) => f.toLowerCase() === clean.toLowerCase())) {
    const updated = [clean, ...current];
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_FRIGORIFICOS_GORDOS, JSON.stringify(updated));
    }
    return updated;
  }
  return current;
}
