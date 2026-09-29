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

let firestoreAdminInitialized = false;

export function initAdministracionFirestoreSync(onUpdate?: (list: ComprobanteGasto[]) => void) {
  if (typeof window === "undefined" || firestoreAdminInitialized) return () => {};
  firestoreAdminInitialized = true;

  const colRef = collection(db, "admin_comprobantes");
  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const docs: ComprobanteGasto[] = [];
        snapshot.forEach((d) => {
          docs.push(d.data() as ComprobanteGasto);
        });
        // Ordenar por fecha reciente
        docs.sort((a, b) => b.fechaComprobante.localeCompare(a.fechaComprobante));
        localStorage.setItem(STORAGE_ADMIN_COMPROBANTES, JSON.stringify(docs));
        if (onUpdate) onUpdate(docs);
        window.dispatchEvent(new Event(HJB_ADMIN_SYNC_EVENT));
      } else {
        // Inicializar Firestore con datos de partida de HJB
        COMPROBANTES_INICIALES_DEFAULT.forEach((comp) => {
          setDoc(doc(db, "admin_comprobantes", comp.id), sanitizeForFirestore(comp), { merge: true }).catch(() => {});
        });
      }
    },
    (err) => {
      console.warn("Aviso Firestore Admin:", err);
    }
  );

  return unsubscribe;
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
// 9. CÁLCULO DE RESULTADOS Y CONSOLIDACIÓN ECONÓMICA DE HJB
// =========================================================================

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
}

export function calcularResumenEconomico(comprobantes?: ComprobanteGasto[]): ResumenEconomicoConsolidado {
  const list = (comprobantes || getComprobantes()).filter((c) => c.estadoImputacion !== "ANULADO");

  let totalGastoBrutoArs = 0;
  let totalGastoOperativoOpexArs = 0;
  let totalInversionCapexArs = 0;
  let totalGastoExtraordinarioArs = 0;
  let totalGastoParticularAisladoArs = 0;
  let pendientesDeImputacionCount = 0;
  let importePendienteImputarArs = 0;

  const acumuladoUnidades: Record<DestinoEconomicoId, { total: number; count: Set<string> }> = {
    "10-LECHE": { total: 0, count: new Set() },
    "20-CEREALES": { total: 0, count: new Set() },
    "30-CARNE": { total: 0, count: new Set() },
    ADMINISTRACION: { total: 0, count: new Set() },
    PARTICULAR: { total: 0, count: new Set() },
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
        acumuladoUnidades[imp.destino].count.add(c.id);
      }
    }
  }

  totalGastoParticularAisladoArs = acumuladoUnidades.PARTICULAR.total;
  // El consolidado empresarial HJB excluye rigurosamente el destino Particular
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
  };
}
