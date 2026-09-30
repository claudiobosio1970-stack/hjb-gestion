"use client";

import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

// =========================================================================
// 1. ESTRUCTURA ECONÓMICA OFICIAL Y DESTINOS
// =========================================================================

export type UnidadProductivaId = "10-LECHE" | "20-CEREALES" | "30-CARNE";
export type DestinoEconomicoId = UnidadProductivaId | "ADMINISTRACION" | "PARTICULAR";

export interface UnidadNegocioInfo {
  id: DestinoEconomicoId;
  codigoOficial: string;
  nombre: string;
  nombreCorto: string;
  esProductiva: boolean;
  color: string;
  descripcion: string;
  productoFinalPrincipal: string;
}

export const UNIDADES_ECONOMICAS_HJB: Record<DestinoEconomicoId, UnidadNegocioInfo> = {
  "10-LECHE": {
    id: "10-LECHE",
    codigoOficial: "10",
    nombre: "HJB Leche",
    nombreCorto: "Lechería",
    esProductiva: true,
    color: "#2563eb", // Azul lechero
    descripcion: "Producción lechera intensiva a corral, ordeñe, recría de vaquillonas y forrajes para tambo.",
    productoFinalPrincipal: "Leche fluida entregada a industria",
  },
  "20-CEREALES": {
    id: "20-CEREALES",
    codigoOficial: "20",
    nombre: "HJB Cereales",
    nombreCorto: "Agricultura Comercial",
    esProductiva: true,
    color: "#059669", // Verde agrícola
    descripcion: "Producción y venta de granos comerciales (Soja, Maíz comercial, Trigo) en campos propios y arrendados.",
    productoFinalPrincipal: "Granos comercializados a acopio / puerto / exportación",
  },
  "30-CARNE": {
    id: "30-CARNE",
    codigoOficial: "30",
    nombre: "HJB Carne",
    nombreCorto: "Ganadería Carne",
    esProductiva: true,
    color: "#dc2626", // Rojo carne
    descripcion: "Engorde y terminación intensiva a corral de machos Holando y categorías de descarte para frigorífico.",
    productoFinalPrincipal: "Novillos gordos terminados para faena",
  },
  ADMINISTRACION: {
    id: "ADMINISTRACION",
    codigoOficial: "00",
    nombre: "Administración & Estructura Central",
    nombreCorto: "Administración",
    esProductiva: false,
    color: "#7c3aed", // Púrpura transversal
    descripcion: "Capa transversal: compras, proveedores, finanzas, bancos, impuestos, legales y dirección general.",
    productoFinalPrincipal: "Servicios centrales de soporte y gestión empresarial",
  },
  PARTICULAR: {
    id: "PARTICULAR",
    codigoOficial: "99",
    nombre: "Particular (No HJB)",
    nombreCorto: "Particular",
    esProductiva: false,
    color: "#64748b", // Gris pizarra
    descripcion: "Gastos y operaciones particulares de los titulares. Aislado completamente del resultado de HJB.",
    productoFinalPrincipal: "Gastos personales / familiares fuera del giro agropecuario",
  },
};

// =========================================================================
// 2. TIPOS ECONÓMICOS DE EGRESO Y MOVIMIENTO
// =========================================================================

export type TipoEconomicoEgreso = "GASTO_OPERATIVO" | "INVERSION_CAPEX" | "EXTRAORDINARIO";

export const TIPOS_EGRESO_INFO: Record<TipoEconomicoEgreso, { nombre: string; descripcion: string; badgeColor: string }> = {
  GASTO_OPERATIVO: {
    nombre: "Gasto Operativo (OPEX)",
    descripcion: "Costo habitual imputable 100% al ejercicio productivo (insumos, labores, sueldos, energía, fletes).",
    badgeColor: "#0284c7",
  },
  INVERSION_CAPEX: {
    nombre: "Inversión / Bien de Uso (CAPEX)",
    descripcion: "Activo fijo con vida útil pluri-anual (tractores, implementos, tanques, aguadas). Amortizable.",
    badgeColor: "#d97706",
  },
  EXTRAORDINARIO: {
    nombre: "Gasto Extraordinario",
    descripcion: "Movimiento atípico que debe exponerse separado del resultado operativo ordinario.",
    badgeColor: "#e11d48",
  },
};

export type TipoMovimientoId =
  | "COMPRA_INSUMO"
  | "SERVICIO_CONTRATADO"
  | "GASTO_GENERAL"
  | "HONORARIO_PROFESIONAL"
  | "IMPUESTO_TASA"
  | "MANTENIMIENTO_REPARACION"
  | "COMBUSTIBLE_LUBRICANTE"
  | "PERSONAL_CARGAS"
  | "INVERSION_ACTIVO_FIJO"
  | "FINANCIERO_BANCARIO"
  | "TRANSFERENCIA_INTERNA";

// =========================================================================
// 3. TABLAS MAESTRAS: CENTROS DE COSTO, RUBROS, CONCEPTOS, PROVEEDORES
// =========================================================================

export interface CentroCosto {
  id: string;
  codigo: string;
  nombre: string;
  unidadId: DestinoEconomicoId;
  descripcion: string;
  activo: boolean;
}

export const CENTROS_COSTO_DEFAULT: CentroCosto[] = [
  // 10 - HJB Leche
  { id: "cc-leche-tambo", codigo: "10.01", nombre: "Tambo Ordeñe & Galpón", unidadId: "10-LECHE", descripcion: "Operación de ordeñe, energía, productos de lavado y mantenimiento de fosa.", activo: true },
  { id: "cc-leche-vo", codigo: "10.02", nombre: "Vacas en Ordeñe (VO)", unidadId: "10-LECHE", descripcion: "Alimentación concentrada, TMR, mixer y sanidad de vacas productivas.", activo: true },
  { id: "cc-leche-secas", codigo: "10.03", nombre: "Vacas Secas & Preparto", unidadId: "10-LECHE", descripcion: "Alimentación aniónica y manejo de transición preparto.", activo: true },
  { id: "cc-leche-recria", codigo: "10.04", nombre: "Recría de Vaquillonas", unidadId: "10-LECHE", descripcion: "Desarrollo de reposición hembras hasta servicio y preñez.", activo: true },
  { id: "cc-leche-guachera", codigo: "10.05", nombre: "Guachera Hembras", unidadId: "10-LECHE", descripcion: "Crianza láctea individual hasta desleche.", activo: true },
  { id: "cc-leche-forrajes", codigo: "10.06", nombre: "Producción de Forraje & Silajes", unidadId: "10-LECHE", descripcion: "Confección y extracción de silajes de maíz y rollos de alfalfa para tambo.", activo: true },

  // 20 - HJB Cereales
  { id: "cc-agri-aguilera", codigo: "20.01", nombre: "Agricultura - Campo Aguilera", unidadId: "20-CEREALES", descripcion: "Lotes agrícolas en Campo Aguilera (125 ha).", activo: true },
  { id: "cc-agri-tambo", codigo: "20.02", nombre: "Agricultura - Campo Tambo", unidadId: "20-CEREALES", descripcion: "Lotes agrícolas en Campo Tambo (170 ha).", activo: true },
  { id: "cc-agri-racca", codigo: "20.03", nombre: "Agricultura - Campo Racca", unidadId: "20-CEREALES", descripcion: "Lotes agrícolas en Campo Racca (65 ha).", activo: true },
  { id: "cc-agri-keuneke", codigo: "20.04", nombre: "Agricultura - Campo Keuneke", unidadId: "20-CEREALES", descripcion: "Lotes agrícolas en Campo Keuneke (70 ha).", activo: true },
  { id: "cc-agri-kitty", codigo: "20.05", nombre: "Agricultura - Campo Kitty", unidadId: "20-CEREALES", descripcion: "Lotes agrícolas en Campo Kitty (45 ha).", activo: true },
  { id: "cc-agri-terceros", codigo: "20.06", nombre: "Agricultura - Lotes Terceros", unidadId: "20-CEREALES", descripcion: "Servicios agrícolas o siembras en campos de terceros.", activo: true },

  // 30 - HJB Carne
  { id: "cc-carne-guachera", codigo: "30.01", nombre: "Guachera Machos", unidadId: "30-CARNE", descripcion: "Crianza individual de terneros machos nacidos en tambo hasta 80kg.", activo: true },
  { id: "cc-carne-recria", codigo: "30.02", nombre: "Recría Machos (RM1 / RM2 / RM3)", unidadId: "30-CARNE", descripcion: "Desarrollo estructural a corral de novillitos hasta 270kg.", activo: true },
  { id: "cc-carne-terminacion", codigo: "30.03", nombre: "Terminación Gordos (CG)", unidadId: "30-CARNE", descripcion: "Engorde intensivo final de novillos hasta 410kg para faena.", activo: true },

  // Transversales & Administración
  { id: "cc-maquinaria-parque", codigo: "00.01", nombre: "Parque de Maquinarias & Taller", unidadId: "ADMINISTRACION", descripcion: "Tractores, tolvas, mixer, pulverizadora, combustibles y mantenimiento general.", activo: true },
  { id: "cc-personal-gral", codigo: "00.02", nombre: "Personal & Seguridad Laboral", unidadId: "ADMINISTRACION", descripcion: "Sueldos, cargas sociales, ART y ropa de trabajo común.", activo: true },
  { id: "cc-admin-sede", codigo: "00.03", nombre: "Administración Central & Honorarios", unidadId: "ADMINISTRACION", descripcion: "Contabilidad, asesoría técnica, software, telefonía y seguros generales.", activo: true },
  { id: "cc-infraestructura", codigo: "00.04", nombre: "Infraestructura & Caminos", unidadId: "ADMINISTRACION", descripcion: "Alambrados, electrificación, perforaciones de agua y caminos internos.", activo: true },

  // Particular
  { id: "cc-particular-retiros", codigo: "99.01", nombre: "Gastos Particulares de Titulares", unidadId: "PARTICULAR", descripcion: "Consumos personales ajenos al negocio agropecuario.", activo: true },
];

export interface RubroGasto {
  id: string;
  nombre: string;
  tipoEgresoDefault: TipoEconomicoEgreso;
  conceptos: string[];
}

export const RUBROS_DEFAULT: RubroGasto[] = [
  {
    id: "insumos-agricolas",
    nombre: "Insumos Agrícolas",
    tipoEgresoDefault: "GASTO_OPERATIVO",
    conceptos: ["Semillas", "Fertilizantes Solubles / Granulados", "Herbicidas", "Fungicidas", "Insecticidas", "Coadyuvantes"],
  },
  {
    id: "alimentacion-ganadera",
    nombre: "Alimentación Ganadera & Tambo",
    tipoEgresoDefault: "GASTO_OPERATIVO",
    conceptos: ["Pellet de Soja", "Pellet de Trigo", "Maíz Grano", "Rollo de Alfalfa", "Balanceado Iniciador", "Sal Mineral & Aniónica", "Silo de Maíz"],
  },
  {
    id: "sanidad-reproduccion",
    nombre: "Sanidad & Reproducción",
    tipoEgresoDefault: "GASTO_OPERATIVO",
    conceptos: ["Vacunas & Antiparasitarios", "Antibióticos & Tratamientos", "Pajuelas Inseminación", "Vainas & Material IATF", "Control Lechero Oficial"],
  },
  {
    id: "combustibles-energia",
    nombre: "Combustibles & Energía",
    tipoEgresoDefault: "GASTO_OPERATIVO",
    conceptos: ["Gasoil Grado 2 (Agro)", "Gasoil Grado 3", "Lubricantes & Grasas", "Electricidad Cooperativa (Tambo)", "Gas Envasado"],
  },
  {
    id: "mantenimiento-reparaciones",
    nombre: "Mantenimiento & Reparaciones",
    tipoEgresoDefault: "GASTO_OPERATIVO",
    conceptos: ["Repuestos Tractor Case", "Repuestos John Deere", "Service Mixer Akron", "Repuestos Tanque Estercolero", "Reparación Fosa Ordeñe", "Cubiertas & Rodados"],
  },
  {
    id: "servicios-labores",
    nombre: "Servicios de Labores & Contratistas",
    tipoEgresoDefault: "GASTO_OPERATIVO",
    conceptos: ["Siembra de Granos", "Cosecha de Soja / Maíz", "Picado de Silo de Maíz", "Enfardado / Rastrillado Rollos", "Flete de Cereal a Acopio", "Flete de Hacienda"],
  },
  {
    id: "bienes-de-uso-capex",
    nombre: "Bienes de Uso & Inversiones (CAPEX)",
    tipoEgresoDefault: "INVERSION_CAPEX",
    conceptos: ["Compra de Tractor", "Compra de Implemento Agrícola", "Tanque de Enfriamiento Leche", "Instalación Galpón / Comedero", "Balanza de Ganado", "Perforación Agua Profunda"],
  },
  {
    id: "impuestos-tasas",
    nombre: "Impuestos, Tasas & Seguros",
    tipoEgresoDefault: "GASTO_OPERATIVO",
    conceptos: ["Tasa Comunal de Red Vial", "Inmobiliario Rural", "Seguro Agrícola Granizo", "Seguro de Maquinarias", "Seguro Responsabilidad Civil"],
  },
  {
    id: "honorarios-servicios-prof",
    nombre: "Honorarios & Asesorías",
    tipoEgresoDefault: "GASTO_OPERATIVO",
    conceptos: ["Asesoría Agronómica CREA", "Veterinario Tambo / Ganadería", "Estudio Contable & Impositivo", "Software de Gestión & DelPro"],
  },
  {
    id: "gastos-particulares",
    nombre: "Particulares (Titulares)",
    tipoEgresoDefault: "EXTRAORDINARIO",
    conceptos: ["Retiro de Fondos", "Gastos Personales Titular", "Consumos No Deducibles"],
  },
];

export interface ProveedorMaestro {
  id: string;
  razonSocial: string;
  nombreFantasia?: string;
  cuit: string;
  condicionIva: "RESPONSABLE_INSCRIPTO" | "MONOTRIBUTO" | "EXENTO" | "CONSUMIDOR_FINAL";
  rubroPrincipal: string;
  localidad: string;
  email?: string;
  telefono?: string;
  activo: boolean;
}

export const PROVEEDORES_DEFAULT: ProveedorMaestro[] = [
  { id: "prov-aca", razonSocial: "Asociación de Cooperativas Argentinas C.L.", nombreFantasia: "ACA Los Cardos", cuit: "30-50012088-2", condicionIva: "RESPONSABLE_INSCRIPTO", rubroPrincipal: "Insumos Agrícolas & Acopio", localidad: "Los Cardos, SF", activo: true },
  { id: "prov-afa", razonSocial: "Agricultores Federados Argentinos S.C.L.", nombreFantasia: "AFA San Genaro", cuit: "30-50019253-0", condicionIva: "RESPONSABLE_INSCRIPTO", rubroPrincipal: "Insumos & Semillas", localidad: "San Genaro, SF", activo: true },
  { id: "prov-ypf", razonSocial: "Distribuidora Agrocombustibles Centro S.A.", nombreFantasia: "YPF Directo Agro", cuit: "30-71123456-9", condicionIva: "RESPONSABLE_INSCRIPTO", rubroPrincipal: "Combustibles & Lubricantes", localidad: "Rafaela, SF", activo: true },
  { id: "prov-delaval", razonSocial: "DeLaval S.A. Argentina", nombreFantasia: "DeLaval Oficial", cuit: "30-54210987-1", condicionIva: "RESPONSABLE_INSCRIPTO", rubroPrincipal: "Equipamiento Tambo & DelPro", localidad: "El Trébol, SF", activo: true },
  { id: "prov-nutrigan", razonSocial: "Nutrición Animal Santa Fe S.R.L.", nombreFantasia: "NutriGan Raciones", cuit: "30-68954123-4", condicionIva: "RESPONSABLE_INSCRIPTO", rubroPrincipal: "Pellet Soja & Premezclas", localidad: "Gálvez, SF", activo: true },
  { id: "prov-vet-campo", razonSocial: "Servicios Veterinarios Integrales S.A.", nombreFantasia: "Clínica & Reproducción Rural", cuit: "30-70891234-8", condicionIva: "RESPONSABLE_INSCRIPTO", rubroPrincipal: "Sanidad & Genética", localidad: "San Vicente, SF", activo: true },
  { id: "prov-case-dealer", razonSocial: "Maquinarias Agrícolas del Litoral S.A.", nombreFantasia: "Concesionario Case IH", cuit: "30-65432198-7", condicionIva: "RESPONSABLE_INSCRIPTO", rubroPrincipal: "Tractores, Repuestos & Taller", localidad: "San Martín de las Escobas, SF", activo: true },
  { id: "prov-coop-elec", razonSocial: "Cooperativa de Electricidad Rural Los Cardos Ltda.", nombreFantasia: "Coop. Eléctrica", cuit: "30-54678912-3", condicionIva: "RESPONSABLE_INSCRIPTO", rubroPrincipal: "Energía Eléctrica Trifásica", localidad: "Los Cardos, SF", activo: true },
  { id: "prov-comuna", razonSocial: "Comuna de Los Cardos", nombreFantasia: "Comuna Los Cardos", cuit: "30-67890123-5", condicionIva: "EXENTO", rubroPrincipal: "Tasa Comunal & Red Vial", localidad: "Los Cardos, SF", activo: true },
];

export interface TipoComprobanteAfip {
  codigo: string;
  letra: "A" | "B" | "C" | "M" | "X";
  nombre: string;
  discriminaIva: boolean;
}

export const TIPOS_COMPROBANTE_AFIP: TipoComprobanteAfip[] = [
  { codigo: "001", letra: "A", nombre: "Factura A", discriminaIva: true },
  { codigo: "002", letra: "A", nombre: "Nota de Débito A", discriminaIva: true },
  { codigo: "003", letra: "A", nombre: "Nota de Crédito A", discriminaIva: true },
  { codigo: "006", letra: "B", nombre: "Factura B", discriminaIva: false },
  { codigo: "007", letra: "B", nombre: "Nota de Débito B", discriminaIva: false },
  { codigo: "008", letra: "B", nombre: "Nota de Crédito B", discriminaIva: false },
  { codigo: "011", letra: "C", nombre: "Factura C (Monotributo)", discriminaIva: false },
  { codigo: "051", letra: "M", nombre: "Factura M", discriminaIva: true },
  { codigo: "099", letra: "X", nombre: "Recibo / Liquidación Oficial", discriminaIva: false },
];

// =========================================================================
// 4. MODELO DE COMPROBANTE E IMPUTACIÓN ECONÓMICA (100% AUDITABLE)
// =========================================================================

export type EstadoImputacionComprobante =
  | "SIN_IMPUTAR"
  | "IMPUTACION_PARCIAL"
  | "IMPUTADO_100"
  | "A_REVISAR"
  | "CONFIRMADO"
  | "ANULADO";

export interface LineaImputacion {
  id: string;
  destino: DestinoEconomicoId;
  centroCostoId: string;
  actividad: string; // ej: "Tambo VO", "Maíz 1ra", "Recría Novillos", "Taller", "Particular"
  establecimientoCampo?: string; // Aguilera, Tambo, Racca, Keuneke, Kitty
  lote?: string;
  rodeoGrupo?: string;
  campanaPeriodo: string; // "2025/26", "2026/27", "Mensual Sep-26", etc.
  porcentaje: number; // 0..100
  importeCalculado: number;
  observacion?: string;
}

export interface RegistroAuditoriaCambio {
  id: string;
  fechaIso: string;
  usuario: string;
  accion: "CREACION" | "MODIFICACION" | "IMPUTACION_GUARDADA" | "CONFIRMACION" | "ANULACION" | "REVISION";
  descripcion: string;
  valoresAnteriores?: any;
}

export interface DatosBienDeUsoCapex {
  descripcionActivo: string;
  categoriaActivo: "Tractor" | "Implemento" | "Equipo Tambo" | "Instalación" | "Rodado" | "Mejora Suelo";
  vidaUtilAnos: number;
  metodoAmortizacion: "LINEAL_ANUAL" | "HOROMETRO_HORAS" | "HECTAREAS";
  valorResidualEstimadoPct: number;
  fechaPuestaEnMarcha: string;
  unidadesUsuarias: DestinoEconomicoId[];
  criterioDistribucionAmortizacion: string;
  activoFijoId?: string;
}

export interface ComprobanteGasto {
  id: string;
  numeroInterno: number; // Secuencial interno de gestión HJB
  fechaComprobante: string; // YYYY-MM-DD
  fechaContabilizacion: string; // YYYY-MM-DD
  tipoComprobante: string; // "Factura A", "Factura B", "Factura C", etc.
  letra: "A" | "B" | "C" | "M" | "X";
  puntoVenta: string; // 4 o 5 dígitos (ej: "0004")
  numeroComprobante: string; // 8 dígitos (ej: "00012450")
  proveedorId: string;
  proveedorRazonSocial: string;
  proveedorCuit: string;
  descripcion: string;
  observaciones?: string;

  // Valores monetarios
  moneda: "ARS" | "USD";
  tipoCambio: number; // 1 si es ARS, o ej 1380 si es USD
  netoGravado: number;
  netoNoGravado: number;
  iva21: number;
  iva105: number;
  iva27: number;
  ivaTotal: number;
  percepcionesIibb: number;
  percepcionesIva: number;
  percepcionesGanancias: number;
  retenciones: number;
  otrosImpuestos: number;
  totalComprobante: number;
  totalConvertidoArs: number;

  // Clasificación económica
  tipoMovimiento: TipoMovimientoId;
  tipoEgreso: TipoEconomicoEgreso;
  rubroId: string;
  rubroNombre: string;
  concepto: string;
  campana: string; // "2025/26" | "2026/27"

  // Imputación
  imputaciones: LineaImputacion[];
  porcentajeImputadoTotal: number;
  importeImputadoTotal: number;
  diferenciaPendienteImporte: number;
  estadoImputacion: EstadoImputacionComprobante;

  // CAPEX (si aplica)
  datosCapex?: DatosBienDeUsoCapex;

  // Trazabilidad documental y auditoría
  nombreArchivoAdjunto?: string;
  usuarioCreador: string;
  fechaCreacionIso: string;
  usuarioConfirmador?: string;
  fechaConfirmacionIso?: string;
  usuarioAnulador?: string;
  fechaAnulacionIso?: string;
  motivoAnulacion?: string;
  historialCambios: RegistroAuditoriaCambio[];
}

// =========================================================================
// 4.1. TRANSFERENCIAS INTERNAS ENTRE UNIDADES (METODOLOGÍA CREA)
// =========================================================================

export type CriterioValuacionTransferencia =
  | "PRECIO_MERCADO"
  | "COSTO_PRODUCCION"
  | "PRECIO_REFERENCIA"
  | "VALOR_ACORDADO";

export interface TransferenciaInterna {
  id: string;
  numeroInterno: number;
  fecha: string; // YYYY-MM-DD
  campana: string;
  unidadCedenteId: DestinoEconomicoId;
  unidadReceptoraId: DestinoEconomicoId;
  concepto: string;
  cantidad: number;
  unidadMedida: "Tn" | "Cabezas" | "Horas" | "Litros" | "Rollos" | "Hectáreas";
  precioUnitario: number;
  importeTotal: number;
  criterioValuacion: CriterioValuacionTransferencia;
  detalleCriterio: string;
  establecimientoOrigen?: string;
  establecimientoDestino?: string;
  observaciones?: string;
  estado: "CONFIRMADA" | "BORRADOR" | "ANULADA";
  usuarioCreador: string;
  fechaCreacionIso: string;
}

export const TRANSFERENCIAS_DEFAULT: TransferenciaInterna[] = [
  {
    id: "trans-2026-001",
    numeroInterno: 1,
    fecha: "2026-09-18",
    campana: "2026/27",
    unidadCedenteId: "20-CEREALES",
    unidadReceptoraId: "10-LECHE",
    concepto: "Maíz Grano Húmedo para mixer TMR (Vacas en Ordeñe)",
    cantidad: 120,
    unidadMedida: "Tn",
    precioUnitario: 195000,
    importeTotal: 23400000,
    criterioValuacion: "PRECIO_MERCADO",
    detalleCriterio: "Precio Pizarra Rosario FAS disponible menos flete corto ($195.000 / Tn)",
    establecimientoOrigen: "Campo Aguilera (Lote 3)",
    establecimientoDestino: "Tambo Central (Silo Tolva)",
    observaciones: "Transferencia para racionamiento septiembre. Se deduce de la necesidad de compra externa.",
    estado: "CONFIRMADA",
    usuarioCreador: "Administración HJB",
    fechaCreacionIso: "2026-09-18T10:00:00.000Z",
  },
  {
    id: "trans-2026-002",
    numeroInterno: 2,
    fecha: "2026-09-20",
    campana: "2026/27",
    unidadCedenteId: "10-LECHE",
    unidadReceptoraId: "30-CARNE",
    concepto: "Terneros Machos Holando de guachera (desleche 80 kg)",
    cantidad: 25,
    unidadMedida: "Cabezas",
    precioUnitario: 220000,
    importeTotal: 5500000,
    criterioValuacion: "VALOR_ACORDADO",
    detalleCriterio: "Valor de plaza consignatario local para ternero Holando 80kg ($2.750/kg vivo)",
    establecimientoOrigen: "Guachera Tambo",
    establecimientoDestino: "Corral de Recría RM1 (Campo Tambo)",
    observaciones: "Traspaso de machos Holando deslechados para inicio de recría y terminación a corral.",
    estado: "CONFIRMADA",
    usuarioCreador: "Administración HJB",
    fechaCreacionIso: "2026-09-20T14:30:00.000Z",
  },
  {
    id: "trans-2026-003",
    numeroInterno: 3,
    fecha: "2026-09-22",
    campana: "2026/27",
    unidadCedenteId: "ADMINISTRACION",
    unidadReceptoraId: "20-CEREALES",
    concepto: "Servicio de distribución de estiércol líquido / efluentes de fosa con tanque estercolero",
    cantidad: 45,
    unidadMedida: "Horas",
    precioUnitario: 65000,
    importeTotal: 2925000,
    criterioValuacion: "COSTO_PRODUCCION",
    detalleCriterio: "Costo horario tractor Case Puma + desgaste tanque estercolero y operario ($65.000/h)",
    establecimientoOrigen: "Parque de Maquinarias",
    establecimientoDestino: "Campo Aguilera (Lote 2 preparación siembra)",
    observaciones: "Aplicación de purines orgánicos como fertilizante de base para maíz.",
    estado: "CONFIRMADA",
    usuarioCreador: "Administración HJB",
    fechaCreacionIso: "2026-09-22T16:00:00.000Z",
  },
];

// =========================================================================
// 4.2. INVERSIONES & BIENES DE USO (CAPEX)
// =========================================================================

export interface BienDeUsoActivo {
  id: string;
  codigoInterno: string;
  nombre: string;
  categoria: "Tractor" | "Implemento" | "Equipo Tambo" | "Instalación" | "Rodado" | "Mejora Suelo";
  fechaAdquisicion: string;
  valorAdquisicionArs: number;
  vidaUtilAnos: number;
  amortizacionAnualArs: number;
  amortizacionAcumuladaArs: number;
  valorResidualArs: number;
  unidadesUsuarias: { unidadId: DestinoEconomicoId; porcentaje: number }[];
  criterioDistribucion: string;
  estado: "ACTIVO" | "EN_REPARACION" | "BAJA";
}

export const BIENES_DE_USO_DEFAULT: BienDeUsoActivo[] = [
  {
    id: "bdu-01",
    codigoInterno: "TR-01",
    nombre: "Tractor Case IH Puma 185 CV",
    categoria: "Tractor",
    fechaAdquisicion: "2023-04-15",
    valorAdquisicionArs: 72000000,
    vidaUtilAnos: 10,
    amortizacionAnualArs: 7200000,
    amortizacionAcumuladaArs: 21600000,
    valorResidualArs: 50400000,
    unidadesUsuarias: [
      { unidadId: "20-CEREALES", porcentaje: 60 },
      { unidadId: "10-LECHE", porcentaje: 30 },
      { unidadId: "30-CARNE", porcentaje: 10 },
    ],
    criterioDistribucion: "Porcentaje de horas horómetro promedio anual (60% Cereales / 30% Leche / 10% Carne)",
    estado: "ACTIVO",
  },
  {
    id: "bdu-02",
    codigoInterno: "TQ-01",
    nombre: "Tanque Enfriador de Leche DeLaval 12.000 Lts",
    categoria: "Equipo Tambo",
    fechaAdquisicion: "2022-08-10",
    valorAdquisicionArs: 38500000,
    vidaUtilAnos: 15,
    amortizacionAnualArs: 2566667,
    amortizacionAcumuladaArs: 10266668,
    valorResidualArs: 28233332,
    unidadesUsuarias: [{ unidadId: "10-LECHE", porcentaje: 100 }],
    criterioDistribucion: "100% Imputado a HJB Leche (Uso exclusivo ordeñe y conservación)",
    estado: "ACTIVO",
  },
  {
    id: "bdu-03",
    codigoInterno: "MX-01",
    nombre: "Mixer Vertical Akron MX14 (14 m3)",
    categoria: "Implemento",
    fechaAdquisicion: "2024-02-20",
    valorAdquisicionArs: 28000000,
    vidaUtilAnos: 8,
    amortizacionAnualArs: 3500000,
    amortizacionAcumuladaArs: 7000000,
    valorResidualArs: 21000000,
    unidadesUsuarias: [
      { unidadId: "10-LECHE", porcentaje: 80 },
      { unidadId: "30-CARNE", porcentaje: 20 },
    ],
    criterioDistribucion: "Proporción de raciones TMR repartidas (80% Tambo / 20% Feedlot novillos)",
    estado: "ACTIVO",
  },
  {
    id: "bdu-04",
    codigoInterno: "BL-01",
    nombre: "Balanza Electrónica Ganadera Trutest 3.000 kg",
    categoria: "Instalación",
    fechaAdquisicion: "2023-11-05",
    valorAdquisicionArs: 6200000,
    vidaUtilAnos: 10,
    amortizacionAnualArs: 620000,
    amortizacionAcumuladaArs: 1240000,
    valorResidualArs: 4960000,
    unidadesUsuarias: [
      { unidadId: "30-CARNE", porcentaje: 60 },
      { unidadId: "10-LECHE", porcentaje: 40 },
    ],
    criterioDistribucion: "Pesajes de control de recría/gordos (60% Carne) y vaquillonas (40% Leche)",
    estado: "ACTIVO",
  },
  {
    id: "bdu-05",
    codigoInterno: "PO-01",
    nombre: "Perforación y Bomba Sumergible Franklin 10 HP",
    categoria: "Instalación",
    fechaAdquisicion: "2022-03-12",
    valorAdquisicionArs: 9800000,
    vidaUtilAnos: 12,
    amortizacionAnualArs: 816667,
    amortizacionAcumuladaArs: 3266668,
    valorResidualArs: 6533332,
    unidadesUsuarias: [
      { unidadId: "10-LECHE", porcentaje: 70 },
      { unidadId: "ADMINISTRACION", porcentaje: 30 },
    ],
    criterioDistribucion: "Caudal de agua para lavado de fosa y bebederos tambo (70%) y sede central (30%)",
    estado: "ACTIVO",
  },
];

// =========================================================================
// 4.3. REGLAS DE DISTRIBUCIÓN AUTOMÁTICA Y PRESETS DE COSTOS COMPARTIDOS
// =========================================================================

export interface ReglaDistribucionAutomatica {
  id: string;
  nombre: string;
  descripcion: string;
  distribucion: {
    destino: DestinoEconomicoId;
    porcentaje: number;
    centroCostoIdDefault?: string;
    actividadDefault?: string;
  }[];
}

export const REGLAS_DISTRIBUCION_DEFAULT: ReglaDistribucionAutomatica[] = [
  {
    id: "regla-combustible",
    nombre: "Parque Maquinarias & Combustibles (60/30/10)",
    descripcion: "Distribución típica por horas tractor: 60% Cereales, 30% Leche, 10% Carne.",
    distribucion: [
      { destino: "20-CEREALES", porcentaje: 60, centroCostoIdDefault: "cc-agri-aguilera", actividadDefault: "Agricultura Maquinaria" },
      { destino: "10-LECHE", porcentaje: 30, centroCostoIdDefault: "cc-leche-tambo", actividadDefault: "Mixer & Tambo" },
      { destino: "30-CARNE", porcentaje: 10, centroCostoIdDefault: "cc-carne-terminacion", actividadDefault: "Racionamiento Corral" },
    ],
  },
  {
    id: "regla-electricidad",
    nombre: "Energía Eléctrica Trifásica (75/15/10)",
    descripcion: "Consumo de bomba, ordeñadora y refrigeración: 75% Leche, 15% Admin, 10% Carne.",
    distribucion: [
      { destino: "10-LECHE", porcentaje: 75, centroCostoIdDefault: "cc-leche-tambo", actividadDefault: "Ordeñe & Frío" },
      { destino: "ADMINISTRACION", porcentaje: 15, centroCostoIdDefault: "cc-admin-sede", actividadDefault: "Sede & Taller" },
      { destino: "30-CARNE", porcentaje: 10, centroCostoIdDefault: "cc-carne-terminacion", actividadDefault: "Bomba Agua Corrales" },
    ],
  },
  {
    id: "regla-asesoria-crea",
    nombre: "Asesoría Agronómica y Ganadera CREA (45/40/15)",
    descripcion: "Honorarios de técnicos y asesor CREA: 45% Cereales, 40% Leche, 15% Carne.",
    distribucion: [
      { destino: "20-CEREALES", porcentaje: 45, centroCostoIdDefault: "cc-agri-aguilera", actividadDefault: "Planes Agrícolas CREA" },
      { destino: "10-LECHE", porcentaje: 40, centroCostoIdDefault: "cc-leche-tambo", actividadDefault: "Gestión Tambo CREA" },
      { destino: "30-CARNE", porcentaje: 15, centroCostoIdDefault: "cc-carne-terminacion", actividadDefault: "Engorde CREA" },
    ],
  },
  {
    id: "regla-infraestructura",
    nombre: "Mantenimiento Caminos & Alambrados (40/30/20/10)",
    descripcion: "Caminos, electrificación y alcantarillado general compartido.",
    distribucion: [
      { destino: "20-CEREALES", porcentaje: 40, centroCostoIdDefault: "cc-agri-aguilera", actividadDefault: "Caminos Lotes" },
      { destino: "10-LECHE", porcentaje: 30, centroCostoIdDefault: "cc-leche-tambo", actividadDefault: "Entrada Tambo" },
      { destino: "30-CARNE", porcentaje: 20, centroCostoIdDefault: "cc-carne-terminacion", actividadDefault: "Manga & Corrales" },
      { destino: "ADMINISTRACION", porcentaje: 10, centroCostoIdDefault: "cc-infraestructura", actividadDefault: "Acceso Principal" },
    ],
  },
  {
    id: "regla-100-leche",
    nombre: "100% HJB Leche (Tambo Directo)",
    descripcion: "Asignación íntegra a la unidad de producción lechera.",
    distribucion: [{ destino: "10-LECHE", porcentaje: 100, centroCostoIdDefault: "cc-leche-tambo", actividadDefault: "Tambo Ordeñe" }],
  },
  {
    id: "regla-100-cereales",
    nombre: "100% HJB Cereales (Agricultura)",
    descripcion: "Asignación íntegra a la unidad de cereales comerciales.",
    distribucion: [{ destino: "20-CEREALES", porcentaje: 100, centroCostoIdDefault: "cc-agri-aguilera", actividadDefault: "Agricultura Comercial" }],
  },
  {
    id: "regla-100-carne",
    nombre: "100% HJB Carne (Feedlot / Recría)",
    descripcion: "Asignación íntegra a la unidad de terminación de hacienda.",
    distribucion: [{ destino: "30-CARNE", porcentaje: 100, centroCostoIdDefault: "cc-carne-terminacion", actividadDefault: "Engorde Gordos" }],
  },
  {
    id: "regla-100-admin",
    nombre: "100% Administración & Estructura",
    descripcion: "Asignación transversal a soporte administrativo y legal.",
    distribucion: [{ destino: "ADMINISTRACION", porcentaje: 100, centroCostoIdDefault: "cc-admin-sede", actividadDefault: "Administración Sede" }],
  },
  {
    id: "regla-100-particular",
    nombre: "100% Particular (Aislado de HJB)",
    descripcion: "Gastos personales de titulares sin impacto en el negocio.",
    distribucion: [{ destino: "PARTICULAR", porcentaje: 100, centroCostoIdDefault: "cc-particular-retiros", actividadDefault: "Retiros Particulares" }],
  },
];

// =========================================================================
// 5. COMPROBANTES HISTÓRICOS Y REALISTAS DE EJEMPLO DE HJB (EN PRODUCCIÓN)
// =========================================================================

export const COMPROBANTES_INICIALES_DEFAULT: ComprobanteGasto[] = [
  // 1. Factura A - Insumo Maíz / Cereales (100% a HJB Cereales)
  {
    id: "comp-2026-001",
    numeroInterno: 1,
    fechaComprobante: "2026-09-12",
    fechaContabilizacion: "2026-09-12",
    tipoComprobante: "Factura A",
    letra: "A",
    puntoVenta: "0005",
    numeroComprobante: "00041280",
    proveedorId: "prov-aca",
    proveedorRazonSocial: "Asociación de Cooperativas Argentinas C.L.",
    proveedorCuit: "30-50012088-2",
    descripcion: "Compra de fertilizante MAP granulado y semilla maíz Dekalb para siembra temprana.",
    moneda: "ARS",
    tipoCambio: 1,
    netoGravado: 12500000,
    netoNoGravado: 0,
    iva21: 2625000,
    iva105: 0,
    iva27: 0,
    ivaTotal: 2625000,
    percepcionesIibb: 375000,
    percepcionesIva: 187500,
    percepcionesGanancias: 0,
    retenciones: 0,
    otrosImpuestos: 0,
    totalComprobante: 15687500,
    totalConvertidoArs: 15687500,
    tipoMovimiento: "COMPRA_INSUMO",
    tipoEgreso: "GASTO_OPERATIVO",
    rubroId: "insumos-agricolas",
    rubroNombre: "Insumos Agrícolas",
    concepto: "Fertilizantes Solubles / Granulados",
    campana: "2026/27",
    imputaciones: [
      {
        id: "imp-1-1",
        destino: "20-CEREALES",
        centroCostoId: "cc-agri-aguilera",
        actividad: "Maíz 1ra Siembra Temprana",
        establecimientoCampo: "Aguilera",
        lote: "Lote 3 y 4",
        campanaPeriodo: "2026/27",
        porcentaje: 60,
        importeCalculado: 9412500,
        observacion: "Fertilización y siembra de 75 ha en Campo Aguilera.",
      },
      {
        id: "imp-1-2",
        destino: "20-CEREALES",
        centroCostoId: "cc-agri-racca",
        actividad: "Maíz 1ra Siembra Temprana",
        establecimientoCampo: "Racca",
        lote: "Lote Norte",
        campanaPeriodo: "2026/27",
        porcentaje: 40,
        importeCalculado: 6275000,
        observacion: "Fertilización y siembra de 50 ha en Campo Racca.",
      },
    ],
    porcentajeImputadoTotal: 100,
    importeImputadoTotal: 15687500,
    diferenciaPendienteImporte: 0,
    estadoImputacion: "CONFIRMADO",
    usuarioCreador: "Administración HJB",
    fechaCreacionIso: "2026-09-12T10:15:00.000Z",
    usuarioConfirmador: "Nacho",
    fechaConfirmacionIso: "2026-09-12T11:30:00.000Z",
    historialCambios: [
      { id: "h-1", fechaIso: "2026-09-12T10:15:00.000Z", usuario: "Administración HJB", accion: "CREACION", descripcion: "Carga de comprobante Factura A de ACA Los Cardos." },
      { id: "h-2", fechaIso: "2026-09-12T11:30:00.000Z", usuario: "Nacho", accion: "CONFIRMACION", descripcion: "Imputación 100% verificada a HJB Cereales (Aguilera 60% / Racca 40%). Confirmación definitiva." },
    ],
  },

  // 2. Factura A - Combustible YPF (Costo compartido 60% Leche, 30% Cereales, 10% Carne)
  {
    id: "comp-2026-002",
    numeroInterno: 2,
    fechaComprobante: "2026-09-15",
    fechaContabilizacion: "2026-09-15",
    tipoComprobante: "Factura A",
    letra: "A",
    puntoVenta: "0002",
    numeroComprobante: "00018934",
    proveedorId: "prov-ypf",
    proveedorRazonSocial: "Distribuidora Agrocombustibles Centro S.A.",
    proveedorCuit: "30-71123456-9",
    descripcion: "Carga de 5.000 litros de Gasoil Agro para tractores Case y John Deere, mixer tambo y movimientos.",
    moneda: "ARS",
    tipoCambio: 1,
    netoGravado: 4800000,
    netoNoGravado: 0,
    iva21: 1008000,
    iva105: 0,
    iva27: 0,
    ivaTotal: 1008000,
    percepcionesIibb: 144000,
    percepcionesIva: 0,
    percepcionesGanancias: 0,
    retenciones: 0,
    otrosImpuestos: 348000, // ITC / Impuestos a los combustibles
    totalComprobante: 6300000,
    totalConvertidoArs: 6300000,
    tipoMovimiento: "COMBUSTIBLE_LUBRICANTE",
    tipoEgreso: "GASTO_OPERATIVO",
    rubroId: "combustibles-energia",
    rubroNombre: "Combustibles & Energía",
    concepto: "Gasoil Grado 2 (Agro)",
    campana: "2026/27",
    imputaciones: [
      {
        id: "imp-2-1",
        destino: "10-LECHE",
        centroCostoId: "cc-leche-tambo",
        actividad: "Alimentación Mixer & Limpieza Pistas",
        establecimientoCampo: "Tambo",
        campanaPeriodo: "Septiembre 2026",
        porcentaje: 60,
        importeCalculado: 3780000,
        observacion: "Tractor JD 6120E mixer diario y reparto de ración 192 VO.",
      },
      {
        id: "imp-2-2",
        destino: "20-CEREALES",
        centroCostoId: "cc-agri-aguilera",
        actividad: "Siembra & Pulverización Maíz",
        establecimientoCampo: "Aguilera",
        campanaPeriodo: "2026/27",
        porcentaje: 30,
        importeCalculado: 1890000,
        observacion: "Labores de siembra y barbecho en lotes agrícolas.",
      },
      {
        id: "imp-2-3",
        destino: "30-CARNE",
        centroCostoId: "cc-carne-terminacion",
        actividad: "Reparto de Comida Corrales Terminación",
        establecimientoCampo: "Tambo",
        campanaPeriodo: "Septiembre 2026",
        porcentaje: 10,
        importeCalculado: 630000,
        observacion: "Movimiento de silaje y ración a comederos novillos gordos.",
      },
    ],
    porcentajeImputadoTotal: 100,
    importeImputadoTotal: 6300000,
    diferenciaPendienteImporte: 0,
    estadoImputacion: "CONFIRMADO",
    usuarioCreador: "Administración HJB",
    fechaCreacionIso: "2026-09-15T14:20:00.000Z",
    usuarioConfirmador: "Nacho",
    fechaConfirmacionIso: "2026-09-15T15:00:00.000Z",
    historialCambios: [
      { id: "h-2-1", fechaIso: "2026-09-15T14:20:00.000Z", usuario: "Administración HJB", accion: "CREACION", descripcion: "Carga factura de combustible YPF 5.000 lts." },
      { id: "h-2-2", fechaIso: "2026-09-15T15:00:00.000Z", usuario: "Nacho", accion: "CONFIRMACION", descripcion: "Distribución directa 60/30/10 según horómetro de tractores aprobada." },
    ],
  },

  // 3. Factura A - Inversión CAPEX (Bomba Estercolera / Bien de Uso no imputable como gasto único)
  {
    id: "comp-2026-003",
    numeroInterno: 3,
    fechaComprobante: "2026-08-28",
    fechaContabilizacion: "2026-08-28",
    tipoComprobante: "Factura A",
    letra: "A",
    puntoVenta: "0001",
    numeroComprobante: "00008412",
    proveedorId: "prov-case-dealer",
    proveedorRazonSocial: "Maquinarias Agrícolas del Litoral S.A.",
    proveedorCuit: "30-65432198-7",
    descripcion: "Bomba picadora de efluentes de alta presión y kit de acople para tanque estercolero 12.000 lts.",
    moneda: "ARS",
    tipoCambio: 1,
    netoGravado: 8400000,
    netoNoGravado: 0,
    iva21: 882000, // Alícuota 10.5% bienes de capital
    iva105: 882000,
    iva27: 0,
    ivaTotal: 882000,
    percepcionesIibb: 252000,
    percepcionesIva: 0,
    percepcionesGanancias: 0,
    retenciones: 0,
    otrosImpuestos: 0,
    totalComprobante: 9534000,
    totalConvertidoArs: 9534000,
    tipoMovimiento: "INVERSION_ACTIVO_FIJO",
    tipoEgreso: "INVERSION_CAPEX",
    rubroId: "bienes-de-uso-capex",
    rubroNombre: "Bienes de Uso & Inversiones (CAPEX)",
    concepto: "Compra de Implemento Agrícola",
    campana: "2026/27",
    imputaciones: [
      {
        id: "imp-3-1",
        destino: "10-LECHE",
        centroCostoId: "cc-leche-tambo",
        actividad: "Gestión de Efluentes & Laguna Tambo",
        establecimientoCampo: "Tambo",
        campanaPeriodo: "2026/27",
        porcentaje: 100,
        importeCalculado: 9534000,
        observacion: "Inversión CAPEX asignada al Tambo. Vida útil estimada: 10 años.",
      },
    ],
    porcentajeImputadoTotal: 100,
    importeImputadoTotal: 9534000,
    diferenciaPendienteImporte: 0,
    estadoImputacion: "CONFIRMADO",
    datosCapex: {
      descripcionActivo: "Bomba Picadora Estercolera de Alta Presión",
      categoriaActivo: "Implemento",
      vidaUtilAnos: 10,
      metodoAmortizacion: "LINEAL_ANUAL",
      valorResidualEstimadoPct: 10,
      fechaPuestaEnMarcha: "2026-09-01",
      unidadesUsuarias: ["10-LECHE"],
      criterioDistribucionAmortizacion: "100% amortización económica asignada al centro de costo Tambo.",
      activoFijoId: "maq-bomba-estercolera-01",
    },
    usuarioCreador: "Administración HJB",
    fechaCreacionIso: "2026-08-28T09:00:00.000Z",
    usuarioConfirmador: "Nacho",
    fechaConfirmacionIso: "2026-08-28T10:00:00.000Z",
    historialCambios: [
      { id: "h-3-1", fechaIso: "2026-08-28T09:00:00.000Z", usuario: "Administración HJB", accion: "CREACION", descripcion: "Registro de factura de inversión CAPEX." },
      { id: "h-3-2", fechaIso: "2026-08-28T10:00:00.000Z", usuario: "Nacho", accion: "CONFIRMACION", descripcion: "Confirmada como Inversión (CAPEX). No impacta como gasto operativo íntegro del mes." },
    ],
  },

  // 4. Factura C - Honorarios Asesoría CREA (100% Administración Transversal)
  {
    id: "comp-2026-004",
    numeroInterno: 4,
    fechaComprobante: "2026-09-20",
    fechaContabilizacion: "2026-09-20",
    tipoComprobante: "Factura C (Monotributo)",
    letra: "C",
    puntoVenta: "0001",
    numeroComprobante: "00000342",
    proveedorId: "prov-asesor-crea",
    proveedorRazonSocial: "Ing. Agr. Martín Gómez",
    proveedorCuit: "20-28954123-3",
    descripcion: "Honorarios de asesoramiento técnico agronómico y económico integral Grupo CREA mes de Septiembre 2026.",
    moneda: "ARS",
    tipoCambio: 1,
    netoGravado: 1450000,
    netoNoGravado: 0,
    iva21: 0,
    iva105: 0,
    iva27: 0,
    ivaTotal: 0,
    percepcionesIibb: 0,
    percepcionesIva: 0,
    percepcionesGanancias: 0,
    retenciones: 0,
    otrosImpuestos: 0,
    totalComprobante: 1450000,
    totalConvertidoArs: 1450000,
    tipoMovimiento: "HONORARIO_PROFESIONAL",
    tipoEgreso: "GASTO_OPERATIVO",
    rubroId: "honorarios-servicios-prof",
    rubroNombre: "Honorarios & Asesorías",
    concepto: "Asesoría Agronómica CREA",
    campana: "2026/27",
    imputaciones: [
      {
        id: "imp-4-1",
        destino: "ADMINISTRACION",
        centroCostoId: "cc-admin-sede",
        actividad: "Asesoramiento de Gestión Global HJB",
        campanaPeriodo: "Septiembre 2026",
        porcentaje: 100,
        importeCalculado: 1450000,
        observacion: "Honorario transversal de gestión general de la empresa.",
      },
    ],
    porcentajeImputadoTotal: 100,
    importeImputadoTotal: 1450000,
    diferenciaPendienteImporte: 0,
    estadoImputacion: "CONFIRMADO",
    usuarioCreador: "Administración HJB",
    fechaCreacionIso: "2026-09-20T11:00:00.000Z",
    usuarioConfirmador: "Nacho",
    fechaConfirmacionIso: "2026-09-20T12:15:00.000Z",
    historialCambios: [
      { id: "h-4-1", fechaIso: "2026-09-20T11:00:00.000Z", usuario: "Administración HJB", accion: "CREACION", descripcion: "Carga de honorarios CREA Septiembre." },
      { id: "h-4-2", fechaIso: "2026-09-20T12:15:00.000Z", usuario: "Nacho", accion: "CONFIRMACION", descripcion: "Confirmado e imputado a Administración." },
    ],
  },

  // 5. Factura B - Gasto Particular (Aislado de HJB)
  {
    id: "comp-2026-005",
    numeroInterno: 5,
    fechaComprobante: "2026-09-18",
    fechaContabilizacion: "2026-09-18",
    tipoComprobante: "Factura B",
    letra: "B",
    puntoVenta: "0003",
    numeroComprobante: "00005120",
    proveedorId: "prov-muebleria",
    proveedorRazonSocial: "Equipamientos del Hogar S.R.L.",
    proveedorCuit: "30-71458921-5",
    descripcion: "Compra de mobiliario para vivienda particular del titular.",
    moneda: "ARS",
    tipoCambio: 1,
    netoGravado: 850000,
    netoNoGravado: 0,
    iva21: 178500,
    iva105: 0,
    iva27: 0,
    ivaTotal: 178500,
    percepcionesIibb: 0,
    percepcionesIva: 0,
    percepcionesGanancias: 0,
    retenciones: 0,
    otrosImpuestos: 0,
    totalComprobante: 1028500,
    totalConvertidoArs: 1028500,
    tipoMovimiento: "GASTO_GENERAL",
    tipoEgreso: "EXTRAORDINARIO",
    rubroId: "gastos-particulares",
    rubroNombre: "Particulares (Titulares)",
    concepto: "Gastos Personales Titular",
    campana: "2026/27",
    imputaciones: [
      {
        id: "imp-5-1",
        destino: "PARTICULAR",
        centroCostoId: "cc-particular-retiros",
        actividad: "Gasto Familiar Titular",
        campanaPeriodo: "Septiembre 2026",
        porcentaje: 100,
        importeCalculado: 1028500,
        observacion: "Operación personal. Aislada 100% de la contabilidad empresarial HJB.",
      },
    ],
    porcentajeImputadoTotal: 100,
    importeImputadoTotal: 1028500,
    diferenciaPendienteImporte: 0,
    estadoImputacion: "CONFIRMADO",
    usuarioCreador: "Administración HJB",
    fechaCreacionIso: "2026-09-18T16:00:00.000Z",
    usuarioConfirmador: "Nacho",
    fechaConfirmacionIso: "2026-09-18T16:30:00.000Z",
    historialCambios: [
      { id: "h-5-1", fechaIso: "2026-09-18T16:00:00.000Z", usuario: "Administración HJB", accion: "CREACION", descripcion: "Carga comprobante vivienda titular." },
      { id: "h-5-2", fechaIso: "2026-09-18T16:30:00.000Z", usuario: "Nacho", accion: "CONFIRMACION", descripcion: "Clasificado como PARTICULAR. Se excluye del cuadro de resultados consolidados." },
    ],
  },

  // 6. Factura A - Insumo Borrador Parcial (Sin imputar 100%, pendiente para pruebas)
  {
    id: "comp-2026-006",
    numeroInterno: 6,
    fechaComprobante: "2026-09-25",
    fechaContabilizacion: "2026-09-25",
    tipoComprobante: "Factura A",
    letra: "A",
    puntoVenta: "0004",
    numeroComprobante: "00021004",
    proveedorId: "prov-nutrigan",
    proveedorRazonSocial: "Nutrición Animal Santa Fe S.R.L.",
    proveedorCuit: "30-68954123-4",
    descripcion: "Carga de 15.000 kg de Pellet de Soja Hi-Pro para tambo y feedlot novillos.",
    moneda: "ARS",
    tipoCambio: 1,
    netoGravado: 7350000,
    netoNoGravado: 0,
    iva21: 771750, // 10.5% alimentos
    iva105: 771750,
    iva27: 0,
    ivaTotal: 771750,
    percepcionesIibb: 220500,
    percepcionesIva: 0,
    percepcionesGanancias: 0,
    retenciones: 0,
    otrosImpuestos: 0,
    totalComprobante: 8342250,
    totalConvertidoArs: 8342250,
    tipoMovimiento: "COMPRA_INSUMO",
    tipoEgreso: "GASTO_OPERATIVO",
    rubroId: "alimentacion-ganadera",
    rubroNombre: "Alimentación Ganadera & Tambo",
    concepto: "Pellet de Soja",
    campana: "2026/27",
    imputaciones: [
      {
        id: "imp-6-1",
        destino: "10-LECHE",
        centroCostoId: "cc-leche-vo",
        actividad: "Ración Vacas en Ordeño",
        establecimientoCampo: "Tambo",
        campanaPeriodo: "Septiembre 2026",
        porcentaje: 80,
        importeCalculado: 6673800,
        observacion: "80% asignado a Tambo VO. Restante 20% pendiente de asignar a Feedlot Novillos.",
      },
    ],
    porcentajeImputadoTotal: 80,
    importeImputadoTotal: 6673800,
    diferenciaPendienteImporte: 1668450,
    estadoImputacion: "IMPUTACION_PARCIAL",
    usuarioCreador: "Administración HJB",
    fechaCreacionIso: "2026-09-25T17:00:00.000Z",
    historialCambios: [
      { id: "h-6-1", fechaIso: "2026-09-25T17:00:00.000Z", usuario: "Administración HJB", accion: "CREACION", descripcion: "Carga inicial borrador. Queda 20% pendiente ($1.668.450)." },
    ],
  },
];

// =========================================================================
// 6. PERSISTENCIA EN FIRESTORE Y LOCAL STORAGE CON SINCRONIZACIÓN REACTIVA
// =========================================================================

const STORAGE_ADMIN_COMPROBANTES = "hjb_admin_comprobantes_v01";
const STORAGE_ADMIN_PROVEEDORES = "hjb_admin_proveedores_v01";
const STORAGE_ADMIN_CENTROS_COSTO = "hjb_admin_centros_costo_v01";
export const HJB_ADMIN_SYNC_EVENT = "hjb_admin_sync_event";

function sanitizeForFirestore(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(sanitizeForFirestore);
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      clean[k] = sanitizeForFirestore(v);
    }
  }
  return clean;
}

export function getComprobantes(): ComprobanteGasto[] {
  if (typeof window === "undefined") return COMPROBANTES_INICIALES_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_ADMIN_COMPROBANTES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error leyendo comprobantes de localStorage:", e);
  }
  saveComprobantes(COMPROBANTES_INICIALES_DEFAULT, false);
  return COMPROBANTES_INICIALES_DEFAULT;
}

export function saveComprobantes(comprobantes: ComprobanteGasto[], notify: boolean = true) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_ADMIN_COMPROBANTES, JSON.stringify(comprobantes));
    if (notify) {
      window.dispatchEvent(new Event(HJB_ADMIN_SYNC_EVENT));
    }
    // Sincronización asíncrona a Firestore
    for (const c of comprobantes) {
      setDoc(doc(db, "admin_comprobantes", c.id), sanitizeForFirestore(c), { merge: true }).catch((err) => {
        console.warn("Error sincronizando comprobante en Firestore:", err);
      });
    }
  } catch (e) {
    console.error("Error guardando comprobantes:", e);
  }
}

export function getProveedores(): ProveedorMaestro[] {
  if (typeof window === "undefined") return PROVEEDORES_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_ADMIN_PROVEEDORES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return PROVEEDORES_DEFAULT;
}

export function saveProveedores(provs: ProveedorMaestro[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_ADMIN_PROVEEDORES, JSON.stringify(provs));
}

export function getCentrosCosto(): CentroCosto[] {
  if (typeof window === "undefined") return CENTROS_COSTO_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_ADMIN_CENTROS_COSTO);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return CENTROS_COSTO_DEFAULT;
}

export function saveCentrosCosto(ccs: CentroCosto[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_ADMIN_CENTROS_COSTO, JSON.stringify(ccs));
}

const STORAGE_ADMIN_TRANSFERENCIAS = "hjb_admin_transferencias_v01";
const STORAGE_ADMIN_BIENES_USO = "hjb_admin_bienes_uso_v01";

export function getTransferenciasInternas(): TransferenciaInterna[] {
  if (typeof window === "undefined") return TRANSFERENCIAS_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_ADMIN_TRANSFERENCIAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  saveTransferenciasInternas(TRANSFERENCIAS_DEFAULT, false);
  return TRANSFERENCIAS_DEFAULT;
}

export function saveTransferenciasInternas(trans: TransferenciaInterna[], notify: boolean = true) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_ADMIN_TRANSFERENCIAS, JSON.stringify(trans));
    if (notify) window.dispatchEvent(new Event(HJB_ADMIN_SYNC_EVENT));
    for (const t of trans) {
      setDoc(doc(db, "admin_transferencias", t.id), sanitizeForFirestore(t), { merge: true }).catch(() => {});
    }
  } catch (e) {
    console.error("Error guardando transferencias internas:", e);
  }
}

export function guardarTransferenciaInterna(
  trans: Omit<TransferenciaInterna, "id" | "numeroInterno" | "fechaCreacionIso" | "usuarioCreador"> & { id?: string },
  usuario: string
): { transferencia: TransferenciaInterna; error?: string } {
  if (trans.unidadCedenteId === trans.unidadReceptoraId) {
    return { transferencia: null as any, error: "La unidad cedente y la receptora no pueden ser la misma." };
  }
  if (!trans.cantidad || trans.cantidad <= 0) {
    return { transferencia: null as any, error: "La cantidad debe ser mayor a cero." };
  }
  if (!trans.precioUnitario || trans.precioUnitario <= 0) {
    return { transferencia: null as any, error: "El precio unitario de transferencia debe ser mayor a cero." };
  }

  const list = getTransferenciasInternas();
  const esNueva = !trans.id;
  const id = trans.id || `trans-${Date.now()}`;
  const hoyIso = new Date().toISOString();
  const maxNum = list.length > 0 ? Math.max(...list.map((t) => t.numeroInterno || 0)) : 0;
  const numeroInterno = esNueva ? maxNum + 1 : list.find((t) => t.id === id)?.numeroInterno || maxNum + 1;
  const importeTotal = Math.round(trans.cantidad * trans.precioUnitario);

  const fullTransferencia: TransferenciaInterna = {
    ...trans,
    id,
    numeroInterno,
    importeTotal,
    usuarioCreador: usuario,
    fechaCreacionIso: hoyIso,
  };

  const updatedList = esNueva ? [fullTransferencia, ...list] : list.map((t) => (t.id === id ? fullTransferencia : t));
  saveTransferenciasInternas(updatedList);
  return { transferencia: fullTransferencia };
}

export function anularTransferenciaInterna(id: string, usuario: string): { success: boolean } {
  const list = getTransferenciasInternas();
  const updated = list.map((t) => (t.id === id ? { ...t, estado: "ANULADA" as const } : t));
  saveTransferenciasInternas(updated);
  return { success: true };
}

export function getBienesDeUso(): BienDeUsoActivo[] {
  if (typeof window === "undefined") return BIENES_DE_USO_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_ADMIN_BIENES_USO);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  saveBienesDeUso(BIENES_DE_USO_DEFAULT, false);
  return BIENES_DE_USO_DEFAULT;
}

export function saveBienesDeUso(bienes: BienDeUsoActivo[], notify: boolean = true) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_ADMIN_BIENES_USO, JSON.stringify(bienes));
    if (notify) window.dispatchEvent(new Event(HJB_ADMIN_SYNC_EVENT));
    for (const b of bienes) {
      setDoc(doc(db, "admin_bienes_uso", b.id), sanitizeForFirestore(b), { merge: true }).catch(() => {});
    }
  } catch (e) {
    console.error("Error guardando bienes de uso:", e);
  }
}

export function guardarBienDeUso(bien: BienDeUsoActivo): { bien: BienDeUsoActivo } {
  const list = getBienesDeUso();
  const exists = list.some((b) => b.id === bien.id);
  const updated = exists ? list.map((b) => (b.id === bien.id ? bien : b)) : [bien, ...list];
  saveBienesDeUso(updated);
  return { bien };
}

let firestoreAdminInitialized = false;

export function initAdministracionFirestoreSync(
  onUpdateComprobantes?: (list: ComprobanteGasto[]) => void,
  onUpdateTransferencias?: (list: TransferenciaInterna[]) => void
) {
  if (typeof window === "undefined" || firestoreAdminInitialized) return () => {};
  firestoreAdminInitialized = true;

  const colComprobantes = collection(db, "admin_comprobantes");
  const unsubComprobantes = onSnapshot(
    colComprobantes,
    (snapshot) => {
      if (!snapshot.empty) {
        const docs: ComprobanteGasto[] = [];
        snapshot.forEach((d) => {
          docs.push(d.data() as ComprobanteGasto);
        });
        docs.sort((a, b) => b.fechaComprobante.localeCompare(a.fechaComprobante));
        localStorage.setItem(STORAGE_ADMIN_COMPROBANTES, JSON.stringify(docs));
        if (onUpdateComprobantes) onUpdateComprobantes(docs);
        window.dispatchEvent(new Event(HJB_ADMIN_SYNC_EVENT));
      } else {
        COMPROBANTES_INICIALES_DEFAULT.forEach((comp) => {
          setDoc(doc(db, "admin_comprobantes", comp.id), sanitizeForFirestore(comp), { merge: true }).catch(() => {});
        });
      }
    },
    (err) => console.warn("Aviso Firestore Comprobantes:", err)
  );

  const colTransferencias = collection(db, "admin_transferencias");
  const unsubTransferencias = onSnapshot(
    colTransferencias,
    (snapshot) => {
      if (!snapshot.empty) {
        const docs: TransferenciaInterna[] = [];
        snapshot.forEach((d) => {
          docs.push(d.data() as TransferenciaInterna);
        });
        docs.sort((a, b) => b.fecha.localeCompare(a.fecha));
        localStorage.setItem(STORAGE_ADMIN_TRANSFERENCIAS, JSON.stringify(docs));
        if (onUpdateTransferencias) onUpdateTransferencias(docs);
        window.dispatchEvent(new Event(HJB_ADMIN_SYNC_EVENT));
      } else {
        TRANSFERENCIAS_DEFAULT.forEach((t) => {
          setDoc(doc(db, "admin_transferencias", t.id), sanitizeForFirestore(t), { merge: true }).catch(() => {});
        });
      }
    },
    (err) => console.warn("Aviso Firestore Transferencias:", err)
  );

  return () => {
    unsubComprobantes();
    unsubTransferencias();
  };
}

// =========================================================================
// 7. MOTOR DE VALIDACIÓN Y CONTROL MATEMÁTICO DEL 100%
// =========================================================================

export interface ResultadoValidacionImputacion {
  esValidoParaConfirmar: boolean;
  porcentajeTotal: number;
  porcentajeFaltante: number;
  porcentajeExcedente: number;
  importeTotalImputado: number;
  diferenciaRedondeoImporte: number;
  errores: string[];
  advertencias: string[];
}

export function validarImputacionComprobante(
  totalComprobante: number,
  imputaciones: LineaImputacion[]
): ResultadoValidacionImputacion {
  const errores: string[] = [];
  const advertencias: string[] = [];

  if (imputaciones.length === 0) {
    errores.push("El comprobante debe tener al menos una línea de imputación.");
    return {
      esValidoParaConfirmar: false,
      porcentajeTotal: 0,
      porcentajeFaltante: 100,
      porcentajeExcedente: 0,
      importeTotalImputado: 0,
      diferenciaRedondeoImporte: totalComprobante,
      errores,
      advertencias,
    };
  }

  let sumaPorcentajes = 0;
  let sumaImportes = 0;

  for (let i = 0; i < imputaciones.length; i++) {
    const linea = imputaciones[i];
    const pct = Number(linea.porcentaje) || 0;
    if (pct < 0) {
      errores.push(`Línea ${i + 1}: El porcentaje no puede ser negativo (${pct}%).`);
    }
    if (!linea.destino) {
      errores.push(`Línea ${i + 1}: Debe seleccionar la unidad o destino económico.`);
    }
    if (!linea.centroCostoId && linea.destino !== "PARTICULAR") {
      advertencias.push(`Línea ${i + 1}: Se recomienda especificar el centro de costo.`);
    }
    sumaPorcentajes += pct;
    sumaImportes += Number(linea.importeCalculado) || 0;
  }

  // Redondear a 2 decimales para evitar problemas de coma flotante
  const sumaPctRedondeada = Number(sumaPorcentajes.toFixed(2));
  const diffPct = Number((100 - sumaPctRedondeada).toFixed(2));
  const diffImporte = Number((totalComprobante - sumaImportes).toFixed(2));

  let porcentajeFaltante = 0;
  let porcentajeExcedente = 0;

  if (sumaPctRedondeada < 100) {
    porcentajeFaltante = diffPct;
    errores.push(`Imputación incompleta: Falta imputar el ${porcentajeFaltante}% del comprobante ($${(totalComprobante * (porcentajeFaltante / 100)).toLocaleString("es-AR", { maximumFractionDigits: 2 })}).`);
  } else if (sumaPctRedondeada > 100) {
    porcentajeExcedente = Number((sumaPctRedondeada - 100).toFixed(2));
    errores.push(`Imputación excedida: La suma de porcentajes es ${sumaPctRedondeada}%, superando el 100% en ${porcentajeExcedente}%.`);
  }

  // Control de redondeo en importes (tolerancia de centavos)
  if (sumaPctRedondeada === 100 && Math.abs(diffImporte) > 1.0) {
    advertencias.push(`Diferencia de redondeo en importes: $${diffImporte}. Se ajustará automáticamente en la última línea.`);
  }

  return {
    esValidoParaConfirmar: errores.length === 0 && sumaPctRedondeada === 100,
    porcentajeTotal: sumaPctRedondeada,
    porcentajeFaltante,
    porcentajeExcedente,
    importeTotalImputado: Math.round(sumaImportes),
    diferenciaRedondeoImporte: diffImporte,
    errores,
    advertencias,
  };
}

/**
 * Recalcula automáticamente los importes de cada línea según su porcentaje y el total del comprobante,
 * absorbiendo diferencias de centavos por redondeo en la última línea para cuadre perfecto.
 */
export function recalcularLineasImputacion(
  totalComprobante: number,
  lineas: LineaImputacion[]
): LineaImputacion[] {
  if (lineas.length === 0) return [];
  let acumulado = 0;
  return lineas.map((linea, index) => {
    const pct = Number(linea.porcentaje) || 0;
    if (index === lineas.length - 1 && lineas.reduce((acc, l) => acc + (Number(l.porcentaje) || 0), 0) === 100) {
      // Ajuste de cuadre exacto en la última línea
      const exacto = Math.max(0, Math.round(totalComprobante - acumulado));
      return { ...linea, importeCalculado: exacto };
    }
    const imp = Math.round(totalComprobante * (pct / 100));
    acumulado += imp;
    return { ...linea, importeCalculado: imp };
  });
}

/**
 * Detección preventiva de comprobantes duplicados en base a:
 * Proveedor + Tipo Comprobante + Letra + Punto de Venta + Número
 */
export function verificarComprobanteDuplicado(
  c: { proveedorCuit: string; tipoComprobante: string; letra: string; puntoVenta: string; numeroComprobante: string },
  excluirId?: string
): ComprobanteGasto | undefined {
  const todos = getComprobantes();
  const pvClean = String(c.puntoVenta || "").padStart(4, "0");
  const numClean = String(c.numeroComprobante || "").padStart(8, "0");
  const cuitClean = String(c.proveedorCuit || "").replace(/\D/g, "");

  return todos.find((item) => {
    if (item.id === excluirId || item.estadoImputacion === "ANULADO") return false;
    const itemPv = String(item.puntoVenta || "").padStart(4, "0");
    const itemNum = String(item.numeroComprobante || "").padStart(8, "0");
    const itemCuit = String(item.proveedorCuit || "").replace(/\D/g, "");
    return (
      itemCuit === cuitClean &&
      item.letra === c.letra &&
      itemPv === pvClean &&
      itemNum === numClean
    );
  });
}

// =========================================================================
// 8. FUNCIONES DE GESTIÓN (ALTA, CONFIRMACIÓN, ANULACIÓN, BORRADORES)
// =========================================================================

export function guardarComprobante(
  comprobante: Omit<ComprobanteGasto, "id" | "numeroInterno" | "fechaCreacionIso" | "historialCambios"> & { id?: string },
  usuario: string,
  forzarConfirmacion: boolean = false
): { comprobante: ComprobanteGasto; error?: string } {
  const list = getComprobantes();
  const esNuevo = !comprobante.id;
  const id = comprobante.id || `comp-${Date.now()}`;
  const hoyIso = new Date().toISOString();

  // Detección de duplicado
  const duplicado = verificarComprobanteDuplicado(comprobante, comprobante.id);
  if (duplicado) {
    return {
      comprobante: null as any,
      error: `Ya existe un comprobante registrado con este proveedor y número: ${duplicado.tipoComprobante} ${duplicado.letra} ${duplicado.puntoVenta}-${duplicado.numeroComprobante} (${duplicado.proveedorRazonSocial}) por $${duplicado.totalComprobante.toLocaleString("es-AR")}.`,
    };
  }

  // Recalcular líneas para consistencia matemática
  const lineasAjustadas = recalcularLineasImputacion(comprobante.totalComprobante, comprobante.imputaciones);
  const val = validarImputacionComprobante(comprobante.totalComprobante, lineasAjustadas);

  let estado: EstadoImputacionComprobante = "SIN_IMPUTAR";
  if (val.porcentajeTotal === 0) {
    estado = "SIN_IMPUTAR";
  } else if (val.porcentajeTotal < 100) {
    estado = "IMPUTACION_PARCIAL";
  } else if (val.porcentajeTotal === 100) {
    estado = forzarConfirmacion ? "CONFIRMADO" : "IMPUTADO_100";
  }

  if (forzarConfirmacion && !val.esValidoParaConfirmar) {
    return {
      comprobante: null as any,
      error: `No se puede confirmar definitivamente el comprobante: ${val.errores.join(" ")}`,
    };
  }

  const anterior = list.find((c) => c.id === id);
  const maxNum = list.length > 0 ? Math.max(...list.map((c) => c.numeroInterno || 0)) : 0;
  const numeroInterno = anterior?.numeroInterno || maxNum + 1;

  const nuevoHistorial: RegistroAuditoriaCambio[] = [
    ...(anterior?.historialCambios || []),
    {
      id: `h-${Date.now()}`,
      fechaIso: hoyIso,
      usuario,
      accion: esNuevo ? "CREACION" : forzarConfirmacion ? "CONFIRMACION" : "MODIFICACION",
      descripcion: esNuevo
        ? `Alta de comprobante ${comprobante.tipoComprobante} ${comprobante.letra} ${comprobante.puntoVenta}-${comprobante.numeroComprobante}.`
        : forzarConfirmacion
        ? `Confirmación definitiva del comprobante (100% imputado).`
        : `Modificación de comprobante. Estado: ${estado}.`,
      valoresAnteriores: anterior ? { estadoAnterior: anterior.estadoImputacion, total: anterior.totalComprobante } : undefined,
    },
  ];

  const fullComprobante: ComprobanteGasto = {
    ...comprobante,
    id,
    numeroInterno,
    imputaciones: lineasAjustadas,
    porcentajeImputadoTotal: val.porcentajeTotal,
    importeImputadoTotal: val.importeTotalImputado,
    diferenciaPendienteImporte: Math.max(0, comprobante.totalComprobante - val.importeTotalImputado),
    estadoImputacion: estado,
    usuarioCreador: anterior?.usuarioCreador || usuario,
    fechaCreacionIso: anterior?.fechaCreacionIso || hoyIso,
    usuarioConfirmador: forzarConfirmacion ? usuario : anterior?.usuarioConfirmador,
    fechaConfirmacionIso: forzarConfirmacion ? hoyIso : anterior?.fechaConfirmacionIso,
    historialCambios: nuevoHistorial,
  };

  const updatedList = esNuevo ? [fullComprobante, ...list] : list.map((c) => (c.id === id ? fullComprobante : c));
  saveComprobantes(updatedList);

  return { comprobante: fullComprobante };
}

export function anularComprobante(
  id: string,
  usuario: string,
  motivo: string
): { success: boolean; error?: string } {
  if (!motivo || motivo.trim().length < 5) {
    return { success: false, error: "Debe ingresar un motivo de anulación claro de al menos 5 caracteres para auditoría." };
  }
  const list = getComprobantes();
  const c = list.find((item) => item.id === id);
  if (!c) return { success: false, error: "Comprobante no encontrado." };

  const hoyIso = new Date().toISOString();
  const updated: ComprobanteGasto = {
    ...c,
    estadoImputacion: "ANULADO",
    usuarioAnulador: usuario,
    fechaAnulacionIso: hoyIso,
    motivoAnulacion: motivo,
    historialCambios: [
      ...c.historialCambios,
      {
        id: `h-anul-${Date.now()}`,
        fechaIso: hoyIso,
        usuario,
        accion: "ANULACION",
        descripcion: `Comprobante anulado por ${usuario}. Motivo: ${motivo}`,
      },
    ],
  };

  const updatedList = list.map((item) => (item.id === id ? updated : item));
  saveComprobantes(updatedList);
  return { success: true };
}

// =========================================================================
// 9. CÁLCULO DE RESULTADOS Y CONSOLIDACIÓN ECONÓMICA DE HJB (METODOLOGÍA CREA)
// =========================================================================

export interface LineaCuadroCrea {
  concepto: string;
  leche: number;
  cereales: number;
  carne: number;
  admin: number;
  eliminaciones: number;
  hjbConsolidado: number;
  particular: number; // Aislado completamente de HJB
  esSubtotal?: boolean;
  esNegativo?: boolean;
  esDestacado?: boolean;
  tooltip?: string;
}

export interface ResumenEconomicoConsolidado {
  totalComprobantesCount: number;
  totalGastoBrutoArs: number;
  totalGastoOperativoOpexArs: number;
  totalInversionCapexArs: number;
  totalGastoExtraordinarioArs: number;
  totalGastoParticularAisladoArs: number;
  totalGastoEmpresarialHjbArs: number; // Consolidado oficial (Leche + Cereales + Carne + Admin)

  distribucionPorUnidad: Record<
    DestinoEconomicoId,
    {
      unidadId: DestinoEconomicoId;
      nombre: string;
      color: string;
      totalImputadoArs: number;
      porcentajeDelConsolidado: number;
      comprobantesAfectados: number;
    }
  >;

  pendientesDeImputacionCount: number;
  importePendienteImputarArs: number;

  // Dimensión CREA: Transferencias Internas, CAPEX y P&L
  transferenciasInternas: TransferenciaInterna[];
  totalTransferenciasArs: number;
  bienesDeUso: BienDeUsoActivo[];
  totalActivosFijosArs: number;
  amortizacionAnualTotalArs: number;
  cuadroCrea: LineaCuadroCrea[];
}

export function calcularResumenEconomico(
  comprobantes?: ComprobanteGasto[],
  transferencias?: TransferenciaInterna[],
  bienesUso?: BienDeUsoActivo[]
): ResumenEconomicoConsolidado {
  const list = (comprobantes || getComprobantes()).filter((c) => c.estadoImputacion !== "ANULADO");
  const listaTransf = (transferencias || getTransferenciasInternas()).filter((t) => t.estado !== "ANULADA");
  const listaBienes = bienesUso || getBienesDeUso();

  let totalGastoBrutoArs = 0;
  let totalGastoOperativoOpexArs = 0;
  let totalInversionCapexArs = 0;
  let totalGastoExtraordinarioArs = 0;
  let totalGastoParticularAisladoArs = 0;
  let pendientesDeImputacionCount = 0;
  let importePendienteImputarArs = 0;

  const acumuladoUnidades: Record<DestinoEconomicoId, { total: number; opex: number; count: Set<string> }> = {
    "10-LECHE": { total: 0, opex: 0, count: new Set() },
    "20-CEREALES": { total: 0, opex: 0, count: new Set() },
    "30-CARNE": { total: 0, opex: 0, count: new Set() },
    ADMINISTRACION: { total: 0, opex: 0, count: new Set() },
    PARTICULAR: { total: 0, opex: 0, count: new Set() },
  };

  for (const c of list) {
    totalGastoBrutoArs += c.totalConvertidoArs;

    if (c.tipoEgreso === "GASTO_OPERATIVO") {
      totalGastoOperativoOpexArs += c.totalConvertidoArs;
    } else if (c.tipoEgreso === "INVERSION_CAPEX") {
      totalInversionCapexArs += c.totalConvertidoArs;
    } else {
      totalGastoExtraordinarioArs += c.totalConvertidoArs;
    }

    if (c.estadoImputacion === "SIN_IMPUTAR" || c.estadoImputacion === "IMPUTACION_PARCIAL") {
      pendientesDeImputacionCount++;
      importePendienteImputarArs += c.diferenciaPendienteImporte || 0;
    }

    for (const imp of c.imputaciones) {
      if (acumuladoUnidades[imp.destino]) {
        acumuladoUnidades[imp.destino].total += imp.importeCalculado;
        if (c.tipoEgreso === "GASTO_OPERATIVO") {
          acumuladoUnidades[imp.destino].opex += imp.importeCalculado;
        }
        acumuladoUnidades[imp.destino].count.add(c.id);
      }
    }
  }

  totalGastoParticularAisladoArs = acumuladoUnidades.PARTICULAR.total;
  const totalGastoEmpresarialHjbArs =
    acumuladoUnidades["10-LECHE"].total +
    acumuladoUnidades["20-CEREALES"].total +
    acumuladoUnidades["30-CARNE"].total +
    acumuladoUnidades.ADMINISTRACION.total;

  const distribucionPorUnidad: Record<DestinoEconomicoId, any> = {} as any;
  for (const [key, info] of Object.entries(UNIDADES_ECONOMICAS_HJB)) {
    const k = key as DestinoEconomicoId;
    const tot = acumuladoUnidades[k].total;
    const baseCalculo = k === "PARTICULAR" ? totalGastoBrutoArs : totalGastoEmpresarialHjbArs || 1;
    distribucionPorUnidad[k] = {
      unidadId: k,
      nombre: info.nombre,
      color: info.color,
      totalImputadoArs: tot,
      porcentajeDelConsolidado: baseCalculo > 0 ? Number(((tot / baseCalculo) * 100).toFixed(1)) : 0,
      comprobantesAfectados: acumuladoUnidades[k].count.size,
    };
  }

  // Cálculos de Transferencias Internas
  const transfIngresos: Record<DestinoEconomicoId, number> = { "10-LECHE": 0, "20-CEREALES": 0, "30-CARNE": 0, ADMINISTRACION: 0, PARTICULAR: 0 };
  const transfCostos: Record<DestinoEconomicoId, number> = { "10-LECHE": 0, "20-CEREALES": 0, "30-CARNE": 0, ADMINISTRACION: 0, PARTICULAR: 0 };
  let totalTransferenciasArs = 0;

  for (const t of listaTransf) {
    if (t.estado === "CONFIRMADA") {
      totalTransferenciasArs += t.importeTotal;
      if (transfIngresos[t.unidadCedenteId] !== undefined) {
        transfIngresos[t.unidadCedenteId] += t.importeTotal;
      }
      if (transfCostos[t.unidadReceptoraId] !== undefined) {
        transfCostos[t.unidadReceptoraId] += t.importeTotal;
      }
    }
  }

  // Cálculos de Amortizaciones de Bienes de Uso (CAPEX)
  const amortizacionesPorUnidad: Record<DestinoEconomicoId, number> = { "10-LECHE": 0, "20-CEREALES": 0, "30-CARNE": 0, ADMINISTRACION: 0, PARTICULAR: 0 };
  let totalActivosFijosArs = 0;
  let amortizacionAnualTotalArs = 0;

  for (const b of listaBienes) {
    if (b.estado === "ACTIVO") {
      totalActivosFijosArs += b.valorAdquisicionArs;
      amortizacionAnualTotalArs += b.amortizacionAnualArs;
      for (const u of b.unidadesUsuarias) {
        const parte = Math.round(b.amortizacionAnualArs * (u.porcentaje / 100));
        if (amortizacionesPorUnidad[u.unidadId] !== undefined) {
          amortizacionesPorUnidad[u.unidadId] += parte;
        }
      }
    }
  }

  // Valores de Producción y Ventas Comerciales (Ingresos Externos de HJB)
  const ingresosExternos = {
    leche: 54200000, // Facturación de leche entregada a usina
    cereales: 68500000, // Venta comercial granos acopio
    carne: 18400000, // Ventas de novillos y vaquillonas faena
    admin: 0,
    particular: 0,
  };
  const totalIngresosExternos = ingresosExternos.leche + ingresosExternos.cereales + ingresosExternos.carne;

  // Construcción del Cuadro de Resultados de Gestión CREA
  const prodBrutaLeche = ingresosExternos.leche + transfIngresos["10-LECHE"];
  const prodBrutaCereales = ingresosExternos.cereales + transfIngresos["20-CEREALES"];
  const prodBrutaCarne = ingresosExternos.carne + transfIngresos["30-CARNE"];
  const prodBrutaAdmin = transfIngresos.ADMINISTRACION;
  const prodBrutaConsolidada = totalIngresosExternos; // Las transferencias internas se anulan (Neto = 0)

  const opexLeche = acumuladoUnidades["10-LECHE"].opex;
  const opexCereales = acumuladoUnidades["20-CEREALES"].opex;
  const opexCarne = acumuladoUnidades["30-CARNE"].opex;
  const opexAdmin = acumuladoUnidades.ADMINISTRACION.opex;
  const opexConsolidado = opexLeche + opexCereales + opexCarne + opexAdmin;

  const costoTransfLeche = transfCostos["10-LECHE"];
  const costoTransfCereales = transfCostos["20-CEREALES"];
  const costoTransfCarne = transfCostos["30-CARNE"];
  const costoTransfAdmin = transfCostos.ADMINISTRACION;

  const margenBrutoLeche = prodBrutaLeche - opexLeche - costoTransfLeche;
  const margenBrutoCereales = prodBrutaCereales - opexCereales - costoTransfCereales;
  const margenBrutoCarne = prodBrutaCarne - opexCarne - costoTransfCarne;
  const margenBrutoAdmin = prodBrutaAdmin - opexAdmin - costoTransfAdmin;
  const margenBrutoConsolidado = prodBrutaConsolidada - opexConsolidado;

  // Asignación de estructura central (Admin) a unidades productivas (ej. 50% Leche, 35% Cereales, 15% Carne)
  const costoEstructuraNetoAdmin = Math.max(0, opexAdmin - prodBrutaAdmin);
  const adminAsignadoLeche = Math.round(costoEstructuraNetoAdmin * 0.5);
  const adminAsignadoCereales = Math.round(costoEstructuraNetoAdmin * 0.35);
  const adminAsignadoCarne = Math.round(costoEstructuraNetoAdmin * 0.15);

  const amortLeche = amortizacionesPorUnidad["10-LECHE"];
  const amortCereales = amortizacionesPorUnidad["20-CEREALES"];
  const amortCarne = amortizacionesPorUnidad["30-CARNE"];
  const amortAdmin = amortizacionesPorUnidad.ADMINISTRACION;

  const margenNetoLeche = margenBrutoLeche - adminAsignadoLeche - amortLeche;
  const margenNetoCereales = margenBrutoCereales - adminAsignadoCereales - amortCereales;
  const margenNetoCarne = margenBrutoCarne - adminAsignadoCarne - amortCarne;
  const margenNetoConsolidado = margenBrutoConsolidado - amortizacionAnualTotalArs;

  const cuadroCrea: LineaCuadroCrea[] = [
    {
      concepto: "1. Ingresos Externos (Ventas a Terceros)",
      leche: ingresosExternos.leche,
      cereales: ingresosExternos.cereales,
      carne: ingresosExternos.carne,
      admin: 0,
      eliminaciones: 0,
      hjbConsolidado: totalIngresosExternos,
      particular: 0,
      tooltip: "Facturación real por venta de productos a clientes externos (industria láctea, acopio, frigorífico).",
    },
    {
      concepto: "2. (+) Ingresos por Transferencias Internas",
      leche: transfIngresos["10-LECHE"],
      cereales: transfIngresos["20-CEREALES"],
      carne: transfIngresos["30-CARNE"],
      admin: transfIngresos.ADMINISTRACION,
      eliminaciones: -totalTransferenciasArs,
      hjbConsolidado: 0,
      particular: 0,
      tooltip: "Valor económico cedido a otra unidad (Maíz a Tambo, Terneros a Carne, etc.). En HJB Consolidado se elimina a $0.",
    },
    {
      concepto: "3. (=) PRODUCCIÓN BRUTA DE GESTIÓN",
      leche: prodBrutaLeche,
      cereales: prodBrutaCereales,
      carne: prodBrutaCarne,
      admin: prodBrutaAdmin,
      eliminaciones: -totalTransferenciasArs,
      hjbConsolidado: prodBrutaConsolidada,
      particular: 0,
      esSubtotal: true,
      esDestacado: true,
      tooltip: "Producción física y valorizada total generada por cada unidad en el período analizado.",
    },
    {
      concepto: "4. (-) Gastos Operativos Directos (OPEX)",
      leche: -opexLeche,
      cereales: -opexCereales,
      carne: -opexCarne,
      admin: -opexAdmin,
      eliminaciones: 0,
      hjbConsolidado: -opexConsolidado,
      particular: -acumuladoUnidades.PARTICULAR.opex,
      esNegativo: true,
      tooltip: "Gastos operativos corrientes devengados de insumos, energía, labores, fletes y servicios.",
    },
    {
      concepto: "5. (-) Costos por Transferencias Internas Recibidas",
      leche: -costoTransfLeche,
      cereales: -costoTransfCereales,
      carne: -costoTransfCarne,
      admin: -costoTransfAdmin,
      eliminaciones: totalTransferenciasArs,
      hjbConsolidado: 0,
      particular: 0,
      esNegativo: true,
      tooltip: "Insumos o hacienda recibida de otra unidad a precio de transferencia. En Consolidado se compensa a $0.",
    },
    {
      concepto: "6. (=) MARGEN BRUTO OPERATIVO (CREA)",
      leche: margenBrutoLeche,
      cereales: margenBrutoCereales,
      carne: margenBrutoCarne,
      admin: margenBrutoAdmin,
      eliminaciones: 0,
      hjbConsolidado: margenBrutoConsolidado,
      particular: 0,
      esSubtotal: true,
      esDestacado: true,
      tooltip: "Indicador fundamental de eficiencia económica por actividad agropecuaria.",
    },
    {
      concepto: "7. (-) Costos Transversales de Estructura / Admin",
      leche: -adminAsignadoLeche,
      cereales: -adminAsignadoCereales,
      carne: -adminAsignadoCarne,
      admin: costoEstructuraNetoAdmin,
      eliminaciones: 0,
      hjbConsolidado: 0,
      particular: 0,
      esNegativo: true,
      tooltip: "Distribución del costo de la estructura administrativa transversal según uso del soporte central.",
    },
    {
      concepto: "8. (-) Amortizaciones Proyectadas de Bienes de Uso (CAPEX)",
      leche: -amortLeche,
      cereales: -amortCereales,
      carne: -amortCarne,
      admin: -amortAdmin,
      eliminaciones: 0,
      hjbConsolidado: -amortizacionAnualTotalArs,
      particular: 0,
      esNegativo: true,
      tooltip: "Depreciación contable anual de tractores, implementos y tanques según vida útil pluri-anual.",
    },
    {
      concepto: "9. (=) RESULTADO / MARGEN NETO DE GESTIÓN HJB",
      leche: margenNetoLeche,
      cereales: margenNetoCereales,
      carne: margenNetoCarne,
      admin: 0,
      eliminaciones: 0,
      hjbConsolidado: margenNetoConsolidado,
      particular: 0,
      esSubtotal: true,
      esDestacado: true,
      tooltip: "Resultado final de la explotación después de cubrir OPEX, estructura y desgaste de bienes de uso.",
    },
    {
      concepto: "(*) Gastos Particulares de Titulares (Aislados)",
      leche: 0,
      cereales: 0,
      carne: 0,
      admin: 0,
      eliminaciones: 0,
      hjbConsolidado: 0,
      particular: -totalGastoParticularAisladoArs,
      esNegativo: true,
      tooltip: "Gastos personales de los socios. Aislados 100% sin afectar el margen del negocio agropecuario.",
    },
  ];

  return {
    totalComprobantesCount: list.length,
    totalGastoBrutoArs,
    totalGastoOperativoOpexArs,
    totalInversionCapexArs,
    totalGastoExtraordinarioArs,
    totalGastoParticularAisladoArs,
    totalGastoEmpresarialHjbArs,
    distribucionPorUnidad,
    pendientesDeImputacionCount,
    importePendienteImputarArs,
    transferenciasInternas: listaTransf,
    totalTransferenciasArs,
    bienesDeUso: listaBienes,
    totalActivosFijosArs,
    amortizacionAnualTotalArs,
    cuadroCrea,
  };
}
