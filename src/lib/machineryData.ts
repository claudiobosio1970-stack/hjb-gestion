export type OwnershipStatus = "Propiedad HJB" | "Propiedad a confirmar" | "Tercero / Contratista";

export type EquipmentStatus = "Operativo" | "En servicio" | "En mantenimiento" | "A confirmar" | "Fuera de servicio";

export type EquipmentCategory =
  | "Tractor"
  | "Implemento Efluentes"
  | "Implemento Forrajero"
  | "Implemento Agrícola"
  | "Transporte / Acoplado"
  | "Equipo Tambo"
  | "Maquinaria Pesada"
  | "Cosecha / Picado";

export interface MaintenanceRecord {
  id: string;
  fecha: string;
  tipoEvento: "Mantenimiento Programado" | "Reparación" | "Mejora / Modificación" | "Service";
  componentes: string[];
  descripcion: string;
  horometro: number | null;
  estado: "Realizado" | "Planificado" | "Pendiente";
  costo: string | null;
  proveedorTaller: string | null;
  observaciones?: string;
}

export interface MachineryWorkRecord {
  id: string;
  fecha: string;
  actividad: string;
  campo: string;
  lote: string;
  campana: string;
  tractor: string | null;
  implemento: string | null;
  operadores: string[];
  unidadNegocio: "HJB Leche" | "HJB Cereales" | "HJB Carne" | "Transversal";
  horasTrabajadas: number | null;
  superficieHa: number | null;
  cantidadAplicada: string | null;
  combustible: string | null;
  observaciones?: string;
}

export interface Equipment {
  id: string;
  nombre: string;
  marca: string;
  modelo: string;
  tipo: EquipmentCategory;
  propiedad: OwnershipStatus;
  condicion: string;
  anoIncorporacion: string | number | null;
  proveedor: string;
  estadoOperativo: EquipmentStatus;
  capacidad: string | null;
  horometroActual: number | null;
  rubroContable: string | null;
  notas: string;
  unidadesNegocio: string[];
  mantenimientos: MaintenanceRecord[];
  labores: MachineryWorkRecord[];
}

export const INITIAL_EQUIPMENT: Equipment[] = [
  // 1. TRACTOR JOHN DEERE 6120E
  {
    id: "jd-6120e",
    nombre: "Tractor John Deere 6120E",
    marca: "John Deere",
    modelo: "6120E",
    tipo: "Tractor",
    propiedad: "Propiedad HJB",
    condicion: "Incorporación reciente / Tractor nuevo",
    anoIncorporacion: 2026,
    proveedor: "AGRONORTE SRL",
    estadoOperativo: "Operativo",
    capacidad: "DATO PENDIENTE",
    horometroActual: 100,
    rubroContable: "Inversión · Maquinaria y Equipos (AGRONORTE SRL - Abril 2026)",
    notas:
      "Tractor de incorporación 2026. Documentación contable de Agronorte SRL. Operativo y de uso transversal para HJB Leche, HJB Cereales y HJB Carne.",
    unidadesNegocio: ["HJB Leche", "HJB Cereales", "HJB Carne"],
    mantenimientos: [
      {
        id: "maint-jd-100h",
        fecha: "2026 (DATO PENDIENTE de precisar)",
        tipoEvento: "Mantenimiento Programado",
        componentes: ["Service de primeras 100 horas", "Fluidos y filtros de rodaje"],
        descripcion: "Mantenimiento programado correspondiente a las primeras 100 horas de uso del tractor.",
        horometro: 100,
        estado: "Realizado",
        costo: "DATO PENDIENTE",
        proveedorTaller: "AGRONORTE SRL (DATO PENDIENTE)",
        observaciones: "Primer service de asentamiento de 100 horas confirmado en registros.",
      },
    ],
    labores: [
      {
        id: "work-jd-01",
        fecha: "2026",
        actividad: "Puesta en marcha y laboreo agrícola transversal",
        campo: "Tambo / Racca / Otros",
        lote: "Lotes varios",
        campana: "2026/27",
        tractor: "John Deere 6120E",
        implemento: "Tanque estercolero / Sembradora / Acoplados",
        operadores: ["Personal operativo HJB"],
        unidadNegocio: "Transversal",
        horasTrabajadas: null,
        superficieHa: null,
        cantidadAplicada: null,
        combustible: null,
        observaciones: "Se comenzó a utilizar el tractor nuevo en labores agrícolas y de efluentes.",
      },
    ],
  },

  // 2. TRACTOR CASE 80
  {
    id: "case-80",
    nombre: "Tractor Case 80",
    marca: "Case",
    modelo: "Case 80",
    tipo: "Tractor",
    propiedad: "Propiedad HJB",
    condicion: "Tractor histórico en servicio (anterior al John Deere)",
    anoIncorporacion: "DATO PENDIENTE",
    proveedor: "DATO PENDIENTE",
    estadoOperativo: "Operativo",
    capacidad: "DATO PENDIENTE",
    horometroActual: null,
    rubroContable: "DATO PENDIENTE",
    notas:
      "Tractor histórico de HJB. Activo totalmente independiente del John Deere 6120E. No reemplazar en el historial.",
    unidadesNegocio: ["HJB Leche", "HJB Cereales", "HJB Carne"],
    mantenimientos: [
      {
        id: "maint-case80-embrague-caja",
        fecha: "Histórico (DATO PENDIENTE de precisar)",
        tipoEvento: "Reparación",
        componentes: ["Embrague", "Caja de cambios"],
        descripcion: "Reparación mecánica integral de embrague y caja de cambios.",
        horometro: null,
        estado: "Realizado",
        costo: "DATO PENDIENTE",
        proveedorTaller: "DATO PENDIENTE",
        observaciones: "Reparación confirmada en los antecedentes históricos de maquinaria.",
      },
    ],
    labores: [],
  },

  // 3. TANQUE ESTIERCOLERO 12.000 L
  {
    id: "tanque-estercolero-12000",
    nombre: "Tanque Estercolero 12.000 L",
    marca: "GERGOLET AGRI",
    modelo: "12.000 Litros con agitador",
    tipo: "Implemento Efluentes",
    propiedad: "Propiedad HJB",
    condicion: "Incorporación 2026 nuevo",
    anoIncorporacion: 2026,
    proveedor: "GERGOLET AGRI",
    estadoOperativo: "Operativo",
    capacidad: "12.000 litros (12 kL)",
    horometroActual: null,
    rubroContable: "Inversión · Maquinaria y Equipos (GERGOLET AGRI - Abril 2026)",
    notas:
      "Tanque estercolero para efluente líquido con agitador incorporado. Capacidad 12.000 L (12 kL por tanque lleno). No asumir siempre carga completa en viajes. Vinculado a biofertilización del tambo y lotes agrícolas.",
    unidadesNegocio: ["HJB Leche", "HJB Cereales"],
    mantenimientos: [],
    labores: [
      {
        id: "work-tanque-01",
        fecha: "2026",
        actividad: "Vaciar la fosa con el tanque estercolero nuevo y aplicación en lotes",
        campo: "Tambo",
        lote: "Fosa de efluentes y lotes agrícolas",
        campana: "2025/26 - 2026/27",
        tractor: "John Deere 6120E / Case 80",
        implemento: "Tanque estercolero 12.000 L",
        operadores: ["Edgard", "Gonzalo"],
        unidadNegocio: "HJB Leche",
        horasTrabajadas: null,
        superficieHa: null,
        cantidadAplicada: "Efluente líquido tambo",
        combustible: null,
        observaciones: "Vaciado operativo de fosa y aplicación a campo con Edgard y Gonzalo.",
      },
    ],
  },

  // 4. REMOVEDOR DE ESTIÉRCOL
  {
    id: "removedor-estiercol",
    nombre: "Removedor de Estiércol",
    marca: "GERGOLET AGRI",
    modelo: "DATO PENDIENTE",
    tipo: "Implemento Efluentes",
    propiedad: "Propiedad HJB",
    condicion: "Incorporación 2026",
    anoIncorporacion: 2026,
    proveedor: "GERGOLET AGRI",
    estadoOperativo: "Operativo",
    capacidad: "DATO PENDIENTE",
    horometroActual: null,
    rubroContable: "Inversión · Maquinaria y Equipos (GERGOLET AGRI - Abril 2026)",
    notas:
      "Componente adquirido dentro de la inversión de Gergolet Agri. Implemento independiente para batido y homogenización en fosa/lagunas. No confundir con el tanque.",
    unidadesNegocio: ["HJB Leche"],
    mantenimientos: [],
    labores: [],
  },

  // 5. AGITADOR ESTIERCOLERO
  {
    id: "agitador-estercolero",
    nombre: "Agitador Estercolero",
    marca: "DATO PENDIENTE (Asociado Gergolet Agri)",
    modelo: "DATO PENDIENTE",
    tipo: "Implemento Efluentes",
    propiedad: "Propiedad HJB",
    condicion: "Equipo incorporado con sistema nuevo",
    anoIncorporacion: 2026,
    proveedor: "GERGOLET AGRI / DATO PENDIENTE",
    estadoOperativo: "Operativo",
    capacidad: "DATO PENDIENTE",
    horometroActual: null,
    rubroContable: "Inversión · Manejo de Efluentes",
    notas:
      "Asociado al tanque de 12.000 L. En registros previos figuraba la planificación de compra de bomba y agitador.",
    unidadesNegocio: ["HJB Leche"],
    mantenimientos: [],
    labores: [],
  },

  // 6. MIXER DE ALIMENTACIÓN
  {
    id: "mixer-alimentacion",
    nombre: "Mixer de Alimentación",
    marca: "DATO PENDIENTE",
    modelo: "DATO PENDIENTE",
    tipo: "Equipo Tambo",
    propiedad: "Propiedad HJB",
    condicion: "Equipo en uso diario para dietas de rodeo",
    anoIncorporacion: "DATO PENDIENTE",
    proveedor: "DATO PENDIENTE",
    estadoOperativo: "Operativo",
    capacidad: "DATO PENDIENTE",
    horometroActual: null,
    rubroContable: "Tambo · Alimentación",
    notas:
      "Equipo neurálgico del Tambo para preparación y distribución de raciones (silo de maíz, pellets, rollos, sales). Permite registrar cuchillas, sinfines, neumáticos y tractor acoplado.",
    unidadesNegocio: ["HJB Leche"],
    mantenimientos: [
      {
        id: "maint-mixer-caja-sinfin",
        fecha: "Histórico (DATO PENDIENTE de precisar)",
        tipoEvento: "Reparación",
        componentes: ["Caja transmisora de giro del sinfín del mixer"],
        descripcion: "Reparación de la caja reductora/transmisora de rotación del sinfín de mezclado.",
        horometro: null,
        estado: "Realizado",
        costo: "DATO PENDIENTE",
        proveedorTaller: "DATO PENDIENTE",
        observaciones: "Reparación confirmada en registros mecánicos del tambo.",
      },
    ],
    labores: [],
  },

  // 7. ENROLLADORA
  {
    id: "enrolladora",
    nombre: "Enrolladora de Forraje Propia",
    marca: "DATO PENDIENTE",
    modelo: "DATO PENDIENTE",
    tipo: "Implemento Forrajero",
    propiedad: "Propiedad HJB",
    condicion: "En servicio operativo",
    anoIncorporacion: "DATO PENDIENTE",
    proveedor: "DATO PENDIENTE",
    estadoOperativo: "Operativo",
    capacidad: "Diámetro/ancho aprox. 1,60 m",
    horometroActual: null,
    rubroContable: "Forrajes y Reservas",
    notas:
      "Enrolladora propia para alfalfa, avena, gramíneas y rastrojo de maíz. Diferenciar producción propia de servicios por convenio con terceros.",
    unidadesNegocio: ["HJB Leche", "HJB Carne"],
    mantenimientos: [],
    labores: [
      {
        id: "work-rollos-01",
        fecha: "Campañas 2024/25 - 2025/26",
        actividad: "Confección de rollos de forraje propio",
        campo: "Aguilera / Racca / Tambo",
        lote: "Lotes varios",
        campana: "2024/25 - 2025/26",
        tractor: "Tractor HJB",
        implemento: "Enrolladora propia 1,60 m",
        operadores: ["Personal HJB"],
        unidadNegocio: "Transversal",
        horasTrabajadas: null,
        superficieHa: null,
        cantidadAplicada: "147 rollos gramíneas (Aguilera), 234 rollos avena (Racca 33 ha), 170 rollos rastrojo maíz",
        combustible: null,
        observaciones: "Producción forrajera documentada en antecedentes.",
      },
    ],
  },

  // 8. DESMALEZADORA DE 2 METROS
  {
    id: "desmalezadora-2m",
    nombre: "Desmalezadora de 2 Metros",
    marca: "DATO PENDIENTE",
    modelo: "2 metros de ancho de corte",
    tipo: "Implemento Agrícola",
    propiedad: "Propiedad HJB",
    condicion: "Compra registrada en antecedentes",
    anoIncorporacion: "DATO PENDIENTE",
    proveedor: "DATO PENDIENTE",
    estadoOperativo: "Operativo",
    capacidad: "Ancho de labor: 2,00 m",
    horometroActual: null,
    rubroContable: "Mantenimiento Predial",
    notas: "Adquirida para mantenimiento de potreros, predios, bordes y control de malezas en tambo y campos.",
    unidadesNegocio: ["HJB Leche", "HJB Cereales", "HJB Carne"],
    mantenimientos: [],
    labores: [],
  },

  // 9. ACOPLADO BLANCO
  {
    id: "acoplado-blanco",
    nombre: "Acoplado Blanco",
    marca: "DATO PENDIENTE",
    modelo: "DATO PENDIENTE",
    tipo: "Transporte / Acoplado",
    propiedad: "Propiedad HJB",
    condicion: "En servicio operativo",
    anoIncorporacion: "DATO PENDIENTE",
    proveedor: "DATO PENDIENTE",
    estadoOperativo: "Operativo",
    capacidad: "DATO PENDIENTE",
    horometroActual: null,
    rubroContable: "Transporte y Logística",
    notas:
      "Acoplado general de HJB. Se modificaron y cambiaron acoples y sistema de luces para asegurar intercambiabilidad con los tractores.",
    unidadesNegocio: ["Transversal"],
    mantenimientos: [
      {
        id: "maint-acoplado-blanco-luces",
        fecha: "Histórico (DATO PENDIENTE de precisar)",
        tipoEvento: "Mejora / Modificación",
        componentes: ["Acoples de enganche e hidráulica", "Luces reglamentarias"],
        descripcion: "Modificación de acoples y sistema eléctrico de luces para intercambiabilidad entre tractores.",
        horometro: null,
        estado: "Realizado",
        costo: "DATO PENDIENTE",
        proveedorTaller: "Taller HJB",
        observaciones: "Mejora realizada para operar indistintamente con tractor John Deere o Case.",
      },
    ],
    labores: [],
  },

  // 10. OTROS ACOPLADOS
  {
    id: "otros-acoplados",
    nombre: "Otros Acoplados (Flota Operativa)",
    marca: "DATO PENDIENTE",
    modelo: "DATO PENDIENTE",
    tipo: "Transporte / Acoplado",
    propiedad: "Propiedad HJB",
    condicion: "En servicio operativo",
    anoIncorporacion: "DATO PENDIENTE",
    proveedor: "DATO PENDIENTE",
    estadoOperativo: "Operativo",
    capacidad: "DATO PENDIENTE",
    horometroActual: null,
    rubroContable: "Logística y Saneamiento",
    notas:
      "Flota de acoplados adicionales utilizados para traslado de basura al basural, movimiento de bolsas de silo a reciclado y materiales agrícolas. Cantidad total: DATO PENDIENTE.",
    unidadesNegocio: ["HJB Leche", "HJB Cereales"],
    mantenimientos: [],
    labores: [],
  },

  // 11. CARRO / ESTERCOLERA PARA ESTIÉRCOL SÓLIDO
  {
    id: "carro-estiercol-solido",
    nombre: "Carro / Estercolera para Estiércol Sólido",
    marca: "DATO PENDIENTE",
    modelo: "DATO PENDIENTE",
    tipo: "Implemento Efluentes",
    propiedad: "Propiedad HJB",
    condicion: "En servicio histórico",
    anoIncorporacion: "DATO PENDIENTE",
    proveedor: "DATO PENDIENTE",
    estadoOperativo: "Operativo",
    capacidad: "Referencia operativa ~5 t/carro",
    horometroActual: null,
    rubroContable: "Manejo de Estiércol Sólido",
    notas:
      "Utilizado para sacar y distribuir estiércol sólido en lotes agrícolas. Registros de 105 carros (~475 t) y 112 carros en Lotes 2, 3 y 4 del Tambo. Cantidad de unidades físicas: DATO PENDIENTE.",
    unidadesNegocio: ["HJB Leche", "HJB Cereales"],
    mantenimientos: [],
    labores: [
      {
        id: "work-carro-solido-01",
        fecha: "Campañas 2024/25 - 2025/26",
        actividad: "Extracción de estiércol sólido y distribución en lotes",
        campo: "Tambo",
        lote: "Lotes 2, 3 y 4",
        campana: "2024/25 - 2025/26",
        tractor: "Tractor HJB",
        implemento: "Carro de estiércol sólido",
        operadores: ["Personal Tambo HJB"],
        unidadNegocio: "HJB Leche",
        horasTrabajadas: null,
        superficieHa: null,
        cantidadAplicada: "105 carros (~475 t) y 112 carros distribuidos",
        combustible: null,
        observaciones: "Distribución en potreros de pasturas y maíz del Tambo.",
      },
    ],
  },

  // 12. TANQUE DE FRÍO BAUDUCCO 5.000 L
  {
    id: "tanque-frio-bauducco",
    nombre: "Tanque de Frío Bauducco 5.000 L",
    marca: "BAUDUCCO",
    modelo: "5.000 Litros",
    tipo: "Equipo Tambo",
    propiedad: "Propiedad HJB",
    condicion: "En funcionamiento continuo",
    anoIncorporacion: "DATO PENDIENTE",
    proveedor: "BAUDUCCO",
    estadoOperativo: "Operativo",
    capacidad: "5.000 litros",
    horometroActual: null,
    rubroContable: "Instalaciones y Equipos de Ordeño / Tambo",
    notas:
      "Equipo productivo del Tambo HJB (HJB Leche). Almacenamiento y enfriamiento de leche ordeñada. No confundir con maquinaria agrícola. Interés futuro en incorporar caudalímetro con memoria.",
    unidadesNegocio: ["HJB Leche"],
    mantenimientos: [],
    labores: [],
  },

  // 13. MOTONIVELADORA / CHAMPION (PROPIEDAD A CONFIRMAR)
  {
    id: "motoniveladora-champion",
    nombre: "Motoniveladora / Champion",
    marca: "DATO PENDIENTE (Referenciada Champion)",
    modelo: "DATO PENDIENTE",
    tipo: "Maquinaria Pesada",
    propiedad: "Propiedad a confirmar",
    condicion: "Equipo utilizado en labores (posible contratista)",
    anoIncorporacion: null,
    proveedor: "DATO PENDIENTE",
    estadoOperativo: "A confirmar",
    capacidad: "DATO PENDIENTE",
    horometroActual: null,
    rubroContable: "Servicios de Movimiento de Suelo",
    notas:
      "PROPIEDAD A CONFIRMAR. NO cargar como activo propio sin confirmación. Utilizada en nivelación de pistas de silo, potreros preparto, cunetas y canalizaciones en Aguilera y Tambo.",
    unidadesNegocio: ["HJB Leche", "HJB Cereales"],
    mantenimientos: [],
    labores: [
      {
        id: "work-champion-01",
        fecha: "2024 - 2026",
        actividad: "Nivelación de pista de silos, cunetas y canalizaciones",
        campo: "Tambo / Aguilera",
        lote: "Pista silos, potrero preparto, cunetas",
        campana: "2024/25 - 2025/26",
        tractor: null,
        implemento: "Motoniveladora Champion",
        operadores: ["Operador motoniveladora"],
        unidadNegocio: "Transversal",
        horasTrabajadas: null,
        superficieHa: null,
        cantidadAplicada: null,
        combustible: null,
        observaciones: "Labores de mejoramiento de escurrimiento y caminos.",
      },
    ],
  },

  // 14. SEMBRADORA (PROPIEDAD A CONFIRMAR)
  {
    id: "sembradora",
    nombre: "Sembradora (Equipo Utilizado)",
    marca: "DATO PENDIENTE",
    modelo: "DATO PENDIENTE",
    tipo: "Implemento Agrícola",
    propiedad: "Propiedad a confirmar",
    condicion: "Equipo utilizado en siembras de maíz, soja, trigo, etc.",
    anoIncorporacion: null,
    proveedor: "DATO PENDIENTE",
    estadoOperativo: "A confirmar",
    capacidad: "DATO PENDIENTE (ancho y líneas pendientes)",
    horometroActual: null,
    rubroContable: "DATO PENDIENTE",
    notas:
      "EQUIPO UTILIZADO / PROPIEDAD A CONFIRMAR. HJB realiza múltiples siembras de granos y forrajes pero no está confirmada la titularidad propia o de contratista.",
    unidadesNegocio: ["HJB Cereales", "HJB Leche"],
    mantenimientos: [],
    labores: [],
  },

  // 15. PULVERIZADORA (PROPIEDAD A CONFIRMAR)
  {
    id: "pulverizadora",
    nombre: "Pulverizadora (Terrestre / Aérea)",
    marca: "DATO PENDIENTE",
    modelo: "DATO PENDIENTE",
    tipo: "Implemento Agrícola",
    propiedad: "Propiedad a confirmar",
    condicion: "Terrestre a identificar / Aérea servicio de tercero",
    anoIncorporacion: null,
    proveedor: "DATO PENDIENTE",
    estadoOperativo: "A confirmar",
    capacidad: "DATO PENDIENTE",
    horometroActual: null,
    rubroContable: "DATO PENDIENTE",
    notas:
      "EQUIPO UTILIZADO / PROPIEDAD A CONFIRMAR. Las aplicaciones aéreas corresponden a servicio de terceros. La pulverizadora terrestre queda pendiente de identificar.",
    unidadesNegocio: ["HJB Cereales", "HJB Leche"],
    mantenimientos: [],
    labores: [],
  },

  // 16. COSECHADORA Y PICADORA DE FORRAJE (TERCERO / PROPIEDAD A CONFIRMAR)
  {
    id: "cosechadora-picadora",
    nombre: "Cosechadora y Picadora de Forraje",
    marca: "DATO PENDIENTE",
    modelo: "DATO PENDIENTE",
    tipo: "Cosecha / Picado",
    propiedad: "Tercero / Contratista",
    condicion: "Servicio de cosecha y picado contratado",
    anoIncorporacion: null,
    proveedor: "Contratistas de Cosecha / Picado",
    estadoOperativo: "A confirmar",
    capacidad: "DATO PENDIENTE",
    horometroActual: null,
    rubroContable: "Servicios de Cosecha y Picado",
    notas:
      "EQUIPO UTILIZADO / TERCERO / PROPIEDAD A CONFIRMAR. HJB cosecha granos y pica maíz/avena para silo mediante contratistas.",
    unidadesNegocio: ["HJB Cereales", "HJB Leche"],
    mantenimientos: [],
    labores: [],
  },

  // 17. BOMBA ESTIERCOLERA (PROPIEDAD A CONFIRMAR)
  {
    id: "bomba-estercolera",
    nombre: "Bomba Estercolera",
    marca: "DATO PENDIENTE",
    modelo: "DATO PENDIENTE",
    tipo: "Implemento Efluentes",
    propiedad: "Propiedad a confirmar",
    condicion: "Referenciada en vaciado de laguna / intención de compra",
    anoIncorporacion: null,
    proveedor: "DATO PENDIENTE",
    estadoOperativo: "A confirmar",
    capacidad: "DATO PENDIENTE",
    horometroActual: null,
    rubroContable: "Manejo de Efluentes",
    notas:
      "EQUIPO UTILIZADO / PROPIEDAD A CONFIRMAR. Mencionada en actividades de vaciado de laguna y proyectos de adquisición con agitador.",
    unidadesNegocio: ["HJB Leche"],
    mantenimientos: [],
    labores: [],
  },
];

export function hasHorometro(tipo: EquipmentCategory | string): boolean {
  return tipo === "Tractor" || tipo === "Maquinaria Pesada";
}

const STORAGE_KEY = "hjb_machinery_v02";

export const machineryData = {
  listEquipment(): Equipment[] {
    if (typeof window === "undefined") return INITIAL_EQUIPMENT;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EQUIPMENT));
        return INITIAL_EQUIPMENT;
      }
      return JSON.parse(stored) as Equipment[];
    } catch {
      return INITIAL_EQUIPMENT;
    }
  },

  getEquipmentById(id: string): Equipment | undefined {
    const list = this.listEquipment();
    return list.find((e) => e.id === id);
  },

  saveEquipment(equipment: Equipment): void {
    if (typeof window === "undefined") return;
    const list = this.listEquipment();
    const index = list.findIndex((e) => e.id === equipment.id);
    if (index >= 0) {
      list[index] = equipment;
    } else {
      list.push(equipment);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  },

  deleteEquipment(id: string): void {
    if (typeof window === "undefined") return;
    const list = this.listEquipment().filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  },

  addMaintenanceRecord(equipmentId: string, record: Omit<MaintenanceRecord, "id">): MaintenanceRecord {
    const list = this.listEquipment();
    const eq = list.find((e) => e.id === equipmentId);
    if (!eq) throw new Error("Equipo no encontrado");

    const newRecord: MaintenanceRecord = {
      ...record,
      id: `maint-${Date.now()}`,
    };

    eq.mantenimientos.unshift(newRecord);
    this.saveEquipment(eq);
    return newRecord;
  },

  addWorkRecord(equipmentId: string, record: Omit<MachineryWorkRecord, "id">): MachineryWorkRecord {
    const list = this.listEquipment();
    const eq = list.find((e) => e.id === equipmentId);
    if (!eq) throw new Error("Equipo no encontrado");

    const newWork: MachineryWorkRecord = {
      ...record,
      id: `work-${Date.now()}`,
    };

    eq.labores.unshift(newWork);
    this.saveEquipment(eq);
    return newWork;
  },
};
