/**
 * Sistema Semáforo de Indicadores Agronómicos de HJB Gestión
 *
 * Clasifica cada indicador en:
 * - 🟢 Verde: Óptimo / Bueno / Suficiente
 * - 🟡 Amarillo: Medio / Moderado / Alerta
 * - 🔴 Rojo: Bajo / Crítico / Deficiente
 *
 * Basado en las tablas de referencia y calibración agronómica oficiales de la región
 * pampeana núcleo (INTA, CREA, Laboratorio Molisol, Clover).
 */

export type SemaforoLevel = "verde" | "amarillo" | "rojo";

export interface SemaforoResult {
  level: SemaforoLevel;
  label: string;
  badgeClass: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  rangoReferencia: string;
  explicacion: string;
}

// Colores consistentes en toda la aplicación
export const SEMAFORO_COLORS = {
  verde: {
    text: "#15803d",
    bg: "#dcfce7",
    border: "#86efac",
    icon: "",
    class: "semaforoVerde",
  },
  amarillo: {
    text: "#b45309",
    bg: "#fef3c7",
    border: "#fcd34d",
    icon: "",
    class: "semaforoAmarillo",
  },
  rojo: {
    text: "#b91c1c",
    bg: "#fee2e2",
    border: "#fca5a5",
    icon: "",
    class: "semaforoRojo",
  },
};

/**
 * 1. POTASIO (K ppm)
 * Especialmente solicitado por el productor para saber si un valor es poco o mucho.
 * En la región pampeana, alfalfas y maíces sileros tienen una altísima extracción de K.
 * - < 150 ppm: 🔴 Bajo / Crítico (alto riesgo de agotamiento)
 * - 150 a 250 ppm: 🟡 Medio / Moderado (vigilar en silajes)
 * - > 250 ppm: 🟢 Óptimo / Alto (excelente reserva edáfica)
 */
export function evaluarPotasio(kPpm: number | null | undefined): SemaforoResult {
  if (kPpm === null || kPpm === undefined || isNaN(kPpm)) {
    return createUnknown("Potasio (K)");
  }
  if (kPpm < 150) {
    return {
      level: "rojo",
      label: "Bajo / Deficiente",
      badgeClass: SEMAFORO_COLORS.rojo.class,
      textColor: SEMAFORO_COLORS.rojo.text,
      bgColor: SEMAFORO_COLORS.rojo.bg,
      borderColor: SEMAFORO_COLORS.rojo.border,
      icon: SEMAFORO_COLORS.rojo.icon,
      rangoReferencia: "Ref: < 150 bajo · 150-250 medio · > 250 óptimo",
      explicacion: "Nivel bajo de K. Requiere reposición de potasio, especialmente en silajes y alfalfas.",
    };
  }
  if (kPpm <= 250) {
    return {
      level: "amarillo",
      label: "Medio / Moderado",
      badgeClass: SEMAFORO_COLORS.amarillo.class,
      textColor: SEMAFORO_COLORS.amarillo.text,
      bgColor: SEMAFORO_COLORS.amarillo.bg,
      borderColor: SEMAFORO_COLORS.amarillo.border,
      icon: SEMAFORO_COLORS.amarillo.icon,
      rangoReferencia: "Ref: < 150 bajo · 150-250 medio · > 250 óptimo",
      explicacion: "Nivel intermedio de K. Suficiente para granos, vigilar en cortes forrajeros continuos.",
    };
  }
  return {
    level: "verde",
    label: "Óptimo / Alto",
    badgeClass: SEMAFORO_COLORS.verde.class,
    textColor: SEMAFORO_COLORS.verde.text,
    bgColor: SEMAFORO_COLORS.verde.bg,
    borderColor: SEMAFORO_COLORS.verde.border,
    icon: SEMAFORO_COLORS.verde.icon,
    rangoReferencia: "Ref: < 150 bajo · 150-250 medio · > 250 óptimo",
    explicacion: "Excelente provisión de K en el complejo de cambio. Reserva fértil muy favorable.",
  };
}

/**
 * 2. FÓSFORO BRAY (P ppm)
 * - < 12 ppm: 🔴 Bajo (respuesta muy probable a fertilización)
 * - 12 a 20 ppm: 🟡 Medio (respuesta moderada / mantenimiento)
 * - > 20 ppm: 🟢 Óptimo (nivel de suficiencia agronómica)
 */
export function evaluarFosforoBray(pPpm: number | null | undefined): SemaforoResult {
  if (pPpm === null || pPpm === undefined || isNaN(pPpm)) {
    return createUnknown("Fósforo Bray");
  }
  if (pPpm < 12) {
    return {
      level: "rojo",
      label: "Bajo / Deficiente",
      badgeClass: SEMAFORO_COLORS.rojo.class,
      textColor: SEMAFORO_COLORS.rojo.text,
      bgColor: SEMAFORO_COLORS.rojo.bg,
      borderColor: SEMAFORO_COLORS.rojo.border,
      icon: SEMAFORO_COLORS.rojo.icon,
      rangoReferencia: "Ref: < 12 bajo · 12-20 medio · > 20 óptimo",
      explicacion: "Fósforo disponible bajo. Se recomienda fertilización fosforada o estiércol de fondo.",
    };
  }
  if (pPpm <= 20) {
    return {
      level: "amarillo",
      label: "Medio / Moderado",
      badgeClass: SEMAFORO_COLORS.amarillo.class,
      textColor: SEMAFORO_COLORS.amarillo.text,
      bgColor: SEMAFORO_COLORS.amarillo.bg,
      borderColor: SEMAFORO_COLORS.amarillo.border,
      icon: SEMAFORO_COLORS.amarillo.icon,
      rangoReferencia: "Ref: < 12 bajo · 12-20 medio · > 20 óptimo",
      explicacion: "Fósforo en rango medio. Requiere dosis de reposición para no degradar el lote.",
    };
  }
  return {
    level: "verde",
    label: "Óptimo / Alto",
    badgeClass: SEMAFORO_COLORS.verde.class,
    textColor: SEMAFORO_COLORS.verde.text,
    bgColor: SEMAFORO_COLORS.verde.bg,
    borderColor: SEMAFORO_COLORS.verde.border,
    icon: SEMAFORO_COLORS.verde.icon,
    rangoReferencia: "Ref: < 12 bajo · 12-20 medio · > 20 óptimo",
    explicacion: "Excelente nivel de fósforo disponible (>20 ppm). Suelo fértil sin limitante de P.",
  };
}

/**
 * 3. NITRÓGENO DISPONIBLE (kg N/ha a 0-20 cm o 0-40 cm)
 * - < 40 kg/ha: 🔴 Bajo
 * - 40 a 75 kg/ha: 🟡 Medio
 * - > 75 kg/ha: 🟢 Óptimo / Alto
 */
export function evaluarNitrogenoDisponible(nKgHa: number | null | undefined): SemaforoResult {
  if (nKgHa === null || nKgHa === undefined || isNaN(nKgHa)) {
    return createUnknown("Nitrógeno disponible");
  }
  if (nKgHa < 40) {
    return {
      level: "rojo",
      label: "Bajo",
      badgeClass: SEMAFORO_COLORS.rojo.class,
      textColor: SEMAFORO_COLORS.rojo.text,
      bgColor: SEMAFORO_COLORS.rojo.bg,
      borderColor: SEMAFORO_COLORS.rojo.border,
      icon: SEMAFORO_COLORS.rojo.icon,
      rangoReferencia: "Ref: < 40 bajo · 40-75 medio · > 75 óptimo",
      explicacion: "Baja reserva inicial de nitratos. Gramíneas requerirán fertilización nitrogenada.",
    };
  }
  if (nKgHa <= 75) {
    return {
      level: "amarillo",
      label: "Medio",
      badgeClass: SEMAFORO_COLORS.amarillo.class,
      textColor: SEMAFORO_COLORS.amarillo.text,
      bgColor: SEMAFORO_COLORS.amarillo.bg,
      borderColor: SEMAFORO_COLORS.amarillo.border,
      icon: SEMAFORO_COLORS.amarillo.icon,
      rangoReferencia: "Ref: < 40 bajo · 40-75 medio · > 75 óptimo",
      explicacion: "Nivel moderado de nitrógeno disponible en suelo.",
    };
  }
  return {
    level: "verde",
    label: "Óptimo / Alto",
    badgeClass: SEMAFORO_COLORS.verde.class,
    textColor: SEMAFORO_COLORS.verde.text,
    bgColor: SEMAFORO_COLORS.verde.bg,
    borderColor: SEMAFORO_COLORS.verde.border,
    icon: SEMAFORO_COLORS.verde.icon,
    rangoReferencia: "Ref: < 40 bajo · 40-75 medio · > 75 óptimo",
    explicacion: "Buena provisión de N soluble disponible para implantación y macollaje/desarrollo.",
  };
}

/**
 * 4. MATERIA ORGÁNICA (MO %)
 * - < 2.5%: 🔴 Baja
 * - 2.5% a 3.5%: 🟡 Media
 * - >= 3.5%: 🟢 Óptima / Alta
 */
export function evaluarMateriaOrganica(moPct: number | null | undefined): SemaforoResult {
  if (moPct === null || moPct === undefined || isNaN(moPct)) {
    return createUnknown("Materia Orgánica");
  }
  if (moPct < 2.5) {
    return {
      level: "rojo",
      label: "Baja",
      badgeClass: SEMAFORO_COLORS.rojo.class,
      textColor: SEMAFORO_COLORS.rojo.text,
      bgColor: SEMAFORO_COLORS.rojo.bg,
      borderColor: SEMAFORO_COLORS.rojo.border,
      icon: SEMAFORO_COLORS.rojo.icon,
      rangoReferencia: "Ref: < 2.5% baja · 2.5-3.5% media · > 3.5% óptima",
      explicacion: "Nivel de MO bajo. Conviene aportar estiércol y rastrojos para recuperar estructura.",
    };
  }
  if (moPct < 3.5) {
    return {
      level: "amarillo",
      label: "Media / Moderada",
      badgeClass: SEMAFORO_COLORS.amarillo.class,
      textColor: SEMAFORO_COLORS.amarillo.text,
      bgColor: SEMAFORO_COLORS.amarillo.bg,
      borderColor: SEMAFORO_COLORS.amarillo.border,
      icon: SEMAFORO_COLORS.amarillo.icon,
      rangoReferencia: "Ref: < 2.5% baja · 2.5-3.5% media · > 3.5% óptima",
      explicacion: "Nivel de MO medio habitual en rotaciones agrícolas pampeanas.",
    };
  }
  return {
    level: "verde",
    label: "Óptima / Alta",
    badgeClass: SEMAFORO_COLORS.verde.class,
    textColor: SEMAFORO_COLORS.verde.text,
    bgColor: SEMAFORO_COLORS.verde.bg,
    borderColor: SEMAFORO_COLORS.verde.border,
    icon: SEMAFORO_COLORS.verde.icon,
    rangoReferencia: "Ref: < 2.5% baja · 2.5-3.5% media · > 3.5% óptima",
    explicacion: "Excelente fertilidad física, buena retención de humedad y actividad biológica edáfica.",
  };
}

/**
 * 5. pH DEL SUELO
 * - 6.0 a 7.3: 🟢 Óptimo (Neutro a ligeramente ácido, máxima biodisponibilidad)
 * - 5.5 a 5.9 ó 7.4 a 8.0: 🟡 Moderado (leve acidez o leve alcalinidad)
 * - < 5.5 ó > 8.0: 🔴 Crítico (ácido o alcalino/sódico)
 */
export function evaluarPH(ph: number | null | undefined): SemaforoResult {
  if (ph === null || ph === undefined || isNaN(ph)) {
    return createUnknown("pH");
  }
  if (ph >= 6.0 && ph <= 7.3) {
    return {
      level: "verde",
      label: "Óptimo (Neutro)",
      badgeClass: SEMAFORO_COLORS.verde.class,
      textColor: SEMAFORO_COLORS.verde.text,
      bgColor: SEMAFORO_COLORS.verde.bg,
      borderColor: SEMAFORO_COLORS.verde.border,
      icon: SEMAFORO_COLORS.verde.icon,
      rangoReferencia: "Ref: 6.0-7.3 óptimo · 5.5-5.9 / 7.4-8.0 alerta · <5.5 / >8.0 crítico",
      explicacion: "pH ideal para la absorción equilibrada de todos los macro y micronutrientes.",
    };
  }
  if ((ph >= 5.5 && ph < 6.0) || (ph > 7.3 && ph <= 8.0)) {
    const desc = ph < 6.0 ? "Ligeramente Ácido" : "Ligeramente Alcalino";
    return {
      level: "amarillo",
      label: desc,
      badgeClass: SEMAFORO_COLORS.amarillo.class,
      textColor: SEMAFORO_COLORS.amarillo.text,
      bgColor: SEMAFORO_COLORS.amarillo.bg,
      borderColor: SEMAFORO_COLORS.amarillo.border,
      icon: SEMAFORO_COLORS.amarillo.icon,
      rangoReferencia: "Ref: 6.0-7.3 óptimo · 5.5-5.9 / 7.4-8.0 alerta · <5.5 / >8.0 crítico",
      explicacion: `pH ${ph}: desvío leve del rango óptimo, monitorear fertilizantes acidificantes.`,
    };
  }
  const crit = ph < 5.5 ? "Ácido / Crítico" : "Alcalino / Sódico";
  return {
    level: "rojo",
    label: crit,
    badgeClass: SEMAFORO_COLORS.rojo.class,
    textColor: SEMAFORO_COLORS.rojo.text,
    bgColor: SEMAFORO_COLORS.rojo.bg,
    borderColor: SEMAFORO_COLORS.rojo.border,
    icon: SEMAFORO_COLORS.rojo.icon,
    rangoReferencia: "Ref: 6.0-7.3 óptimo · 5.5-5.9 / 7.4-8.0 alerta · <5.5 / >8.0 crítico",
    explicacion: ph < 5.5 ? "pH muy ácido: considerar encalado." : "pH muy alcalino: riesgo de sodicidad.",
  };
}

/**
 * 6. AZUFRE (S-SO4 ppm)
 * - < 8 ppm: 🔴 Deficiente
 * - 8 a 12 ppm: 🟡 Medio
 * - > 12 ppm: 🟢 Óptimo / Suficiente
 */
export function evaluarAzufre(sPpm: number | null | undefined): SemaforoResult {
  if (sPpm === null || sPpm === undefined || isNaN(sPpm)) {
    return createUnknown("Azufre (S)");
  }
  if (sPpm < 8) {
    return {
      level: "rojo",
      label: "Bajo / Deficiente",
      badgeClass: SEMAFORO_COLORS.rojo.class,
      textColor: SEMAFORO_COLORS.rojo.text,
      bgColor: SEMAFORO_COLORS.rojo.bg,
      borderColor: SEMAFORO_COLORS.rojo.border,
      icon: SEMAFORO_COLORS.rojo.icon,
      rangoReferencia: "Ref: < 8 deficiente · 8-12 medio · > 12 óptimo",
      explicacion: "Suelo con deficiencia de azufre. Requiere fertilización azufrada (yeso, SPS, etc.).",
    };
  }
  if (sPpm <= 12) {
    return {
      level: "amarillo",
      label: "Medio / Ajustado",
      badgeClass: SEMAFORO_COLORS.amarillo.class,
      textColor: SEMAFORO_COLORS.amarillo.text,
      bgColor: SEMAFORO_COLORS.amarillo.bg,
      borderColor: SEMAFORO_COLORS.amarillo.border,
      icon: SEMAFORO_COLORS.amarillo.icon,
      rangoReferencia: "Ref: < 8 deficiente · 8-12 medio · > 12 óptimo",
      explicacion: "Nivel medio de sulfatos. Conviene mantener aportes azufrados en gramíneas.",
    };
  }
  return {
    level: "verde",
    label: "Óptimo / Suficiente",
    badgeClass: SEMAFORO_COLORS.verde.class,
    textColor: SEMAFORO_COLORS.verde.text,
    bgColor: SEMAFORO_COLORS.verde.bg,
    borderColor: SEMAFORO_COLORS.verde.border,
    icon: SEMAFORO_COLORS.verde.icon,
    rangoReferencia: "Ref: < 8 deficiente · 8-12 medio · > 12 óptimo",
    explicacion: "Buena provisión de sulfatos solubles en el suelo.",
  };
}

/**
 * 7. ZINC (Zn ppm)
 * Micronutriente crítico para maíz
 * - < 0.8 ppm: 🔴 Deficiente
 * - 0.8 a 1.2 ppm: 🟡 Medio
 * - > 1.2 ppm: 🟢 Óptimo / Suficiente
 */
export function evaluarZinc(znPpm: number | null | undefined): SemaforoResult {
  if (znPpm === null || znPpm === undefined || isNaN(znPpm)) {
    return createUnknown("Zinc (Zn)");
  }
  if (znPpm < 0.8) {
    return {
      level: "rojo",
      label: "Bajo / Crítico",
      badgeClass: SEMAFORO_COLORS.rojo.class,
      textColor: SEMAFORO_COLORS.rojo.text,
      bgColor: SEMAFORO_COLORS.rojo.bg,
      borderColor: SEMAFORO_COLORS.rojo.border,
      icon: SEMAFORO_COLORS.rojo.icon,
      rangoReferencia: "Ref: < 0.8 bajo · 0.8-1.2 medio · > 1.2 óptimo",
      explicacion: "Nivel de Zn bajo. En maíz puede causar pérdidas de rinde sin zinc a la siembra o foliar.",
    };
  }
  if (znPpm <= 1.2) {
    return {
      level: "amarillo",
      label: "Medio / Alerta",
      badgeClass: SEMAFORO_COLORS.amarillo.class,
      textColor: SEMAFORO_COLORS.amarillo.text,
      bgColor: SEMAFORO_COLORS.amarillo.bg,
      borderColor: SEMAFORO_COLORS.amarillo.border,
      icon: SEMAFORO_COLORS.amarillo.icon,
      rangoReferencia: "Ref: < 0.8 bajo · 0.8-1.2 medio · > 1.2 óptimo",
      explicacion: "Nivel moderado de Zinc. Conviene fertilizar en maíces de alta productividad.",
    };
  }
  return {
    level: "verde",
    label: "Óptimo / Suficiente",
    badgeClass: SEMAFORO_COLORS.verde.class,
    textColor: SEMAFORO_COLORS.verde.text,
    bgColor: SEMAFORO_COLORS.verde.bg,
    borderColor: SEMAFORO_COLORS.verde.border,
    icon: SEMAFORO_COLORS.verde.icon,
    rangoReferencia: "Ref: < 0.8 bajo · 0.8-1.2 medio · > 1.2 óptimo",
    explicacion: "Excelente disponibilidad de zinc para el desarrollo inicial del cultivo.",
  };
}

/**
 * 8. CALCIO (Ca ppm)
 * - < 1200 ppm: 🔴 Bajo
 * - 1200 a 2000 ppm: 🟡 Medio
 * - > 2000 ppm: 🟢 Óptimo / Alto
 */
export function evaluarCalcio(caPpm: number | null | undefined): SemaforoResult {
  if (caPpm === null || caPpm === undefined || isNaN(caPpm)) {
    return createUnknown("Calcio (Ca)");
  }
  if (caPpm < 1200) {
    return {
      level: "rojo",
      label: "Bajo",
      badgeClass: SEMAFORO_COLORS.rojo.class,
      textColor: SEMAFORO_COLORS.rojo.text,
      bgColor: SEMAFORO_COLORS.rojo.bg,
      borderColor: SEMAFORO_COLORS.rojo.border,
      icon: SEMAFORO_COLORS.rojo.icon,
      rangoReferencia: "Ref: < 1200 bajo · 1200-2000 medio · > 2000 óptimo",
      explicacion: "Contenido de calcio bajo en el complejo de cambio.",
    };
  }
  if (caPpm <= 2000) {
    return {
      level: "amarillo",
      label: "Medio",
      badgeClass: SEMAFORO_COLORS.amarillo.class,
      textColor: SEMAFORO_COLORS.amarillo.text,
      bgColor: SEMAFORO_COLORS.amarillo.bg,
      borderColor: SEMAFORO_COLORS.amarillo.border,
      icon: SEMAFORO_COLORS.amarillo.icon,
      rangoReferencia: "Ref: < 1200 bajo · 1200-2000 medio · > 2000 óptimo",
      explicacion: "Nivel de calcio moderado.",
    };
  }
  return {
    level: "verde",
    label: "Óptimo / Alto",
    badgeClass: SEMAFORO_COLORS.verde.class,
    textColor: SEMAFORO_COLORS.verde.text,
    bgColor: SEMAFORO_COLORS.verde.bg,
    borderColor: SEMAFORO_COLORS.verde.border,
    icon: SEMAFORO_COLORS.verde.icon,
    rangoReferencia: "Ref: < 1200 bajo · 1200-2000 medio · > 2000 óptimo",
    explicacion: "Suelo muy bien provisto de calcio, excelente saturación catiónica.",
  };
}

/**
 * 9. MAGNESIO (Mg ppm)
 * - < 150 ppm: 🔴 Bajo
 * - 150 a 250 ppm: 🟡 Medio
 * - > 250 ppm: 🟢 Óptimo / Alto
 */
export function evaluarMagnesio(mgPpm: number | null | undefined): SemaforoResult {
  if (mgPpm === null || mgPpm === undefined || isNaN(mgPpm)) {
    return createUnknown("Magnesio (Mg)");
  }
  if (mgPpm < 150) {
    return {
      level: "rojo",
      label: "Bajo",
      badgeClass: SEMAFORO_COLORS.rojo.class,
      textColor: SEMAFORO_COLORS.rojo.text,
      bgColor: SEMAFORO_COLORS.rojo.bg,
      borderColor: SEMAFORO_COLORS.rojo.border,
      icon: SEMAFORO_COLORS.rojo.icon,
      rangoReferencia: "Ref: < 150 bajo · 150-250 medio · > 250 óptimo",
      explicacion: "Nivel bajo de magnesio.",
    };
  }
  if (mgPpm <= 250) {
    return {
      level: "amarillo",
      label: "Medio",
      badgeClass: SEMAFORO_COLORS.amarillo.class,
      textColor: SEMAFORO_COLORS.amarillo.text,
      bgColor: SEMAFORO_COLORS.amarillo.bg,
      borderColor: SEMAFORO_COLORS.amarillo.border,
      icon: SEMAFORO_COLORS.amarillo.icon,
      rangoReferencia: "Ref: < 150 bajo · 150-250 medio · > 250 óptimo",
      explicacion: "Nivel intermedio de magnesio.",
    };
  }
  return {
    level: "verde",
    label: "Óptimo / Alto",
    badgeClass: SEMAFORO_COLORS.verde.class,
    textColor: SEMAFORO_COLORS.verde.text,
    bgColor: SEMAFORO_COLORS.verde.bg,
    borderColor: SEMAFORO_COLORS.verde.border,
    icon: SEMAFORO_COLORS.verde.icon,
    rangoReferencia: "Ref: < 150 bajo · 150-250 medio · > 250 óptimo",
    explicacion: "Nivel de magnesio óptimo para nutrición vegetal y forrajera.",
  };
}

/**
 * 10. CONDUCTIVIDAD ELÉCTRICA (CE uS/cm)
 * A menor CE, menor salinidad perjudicial.
 * - < 1500 uS/cm: 🟢 Normal / No salino
 * - 1500 a 3000 uS/cm: 🟡 Salinidad moderada
 * - > 3000 uS/cm: 🔴 Salinidad alta / Alerta
 */
export function evaluarConductividad(ceUsCm: number | null | undefined): SemaforoResult {
  if (ceUsCm === null || ceUsCm === undefined || isNaN(ceUsCm)) {
    return createUnknown("Conductividad");
  }
  if (ceUsCm < 1500) {
    return {
      level: "verde",
      label: "Normal (No salino)",
      badgeClass: SEMAFORO_COLORS.verde.class,
      textColor: SEMAFORO_COLORS.verde.text,
      bgColor: SEMAFORO_COLORS.verde.bg,
      borderColor: SEMAFORO_COLORS.verde.border,
      icon: SEMAFORO_COLORS.verde.icon,
      rangoReferencia: "Ref: < 1500 no salino · 1500-3000 moderado · > 3000 salino",
      explicacion: "Suelo libre de problemas osmóticos o salinidad perjudicial.",
    };
  }
  if (ceUsCm <= 3000) {
    return {
      level: "amarillo",
      label: "Salinidad Moderada",
      badgeClass: SEMAFORO_COLORS.amarillo.class,
      textColor: SEMAFORO_COLORS.amarillo.text,
      bgColor: SEMAFORO_COLORS.amarillo.bg,
      borderColor: SEMAFORO_COLORS.amarillo.border,
      icon: SEMAFORO_COLORS.amarillo.icon,
      rangoReferencia: "Ref: < 1500 no salino · 1500-3000 moderado · > 3000 salino",
      explicacion: "Salinidad moderada. Monitorear cultivos más sensibles.",
    };
  }
  return {
    level: "rojo",
    label: "Salinidad Alta",
    badgeClass: SEMAFORO_COLORS.rojo.class,
    textColor: SEMAFORO_COLORS.rojo.text,
    bgColor: SEMAFORO_COLORS.rojo.bg,
    borderColor: SEMAFORO_COLORS.rojo.border,
    icon: SEMAFORO_COLORS.rojo.icon,
    rangoReferencia: "Ref: < 1500 no salino · 1500-3000 moderado · > 3000 salino",
    explicacion: "Concentración salina alta. Puede afectar la emergencia y absorción hídrica.",
  };
}

/**
 * 11. AGUA ÚTIL TOTAL EN PERFIL HÍDRICO (mm a 0-200 cm)
 * - < 100 mm: 🔴 Déficit hídrico severo
 * - 100 a 180 mm: 🟡 Reserva media
 * - > 180 mm: 🟢 Óptima / Excelente (> 280 mm es recarga plena)
 */
export function evaluarAguaUtilTotal(mm: number | null | undefined): SemaforoResult {
  if (mm === null || mm === undefined || isNaN(mm)) {
    return createUnknown("Agua Útil");
  }
  if (mm < 100) {
    return {
      level: "rojo",
      label: "Déficit / Crítico",
      badgeClass: SEMAFORO_COLORS.rojo.class,
      textColor: SEMAFORO_COLORS.rojo.text,
      bgColor: SEMAFORO_COLORS.rojo.bg,
      borderColor: SEMAFORO_COLORS.rojo.border,
      icon: SEMAFORO_COLORS.rojo.icon,
      rangoReferencia: "Ref: < 100 mm déficit · 100-180 mm media · > 180 mm óptima",
      explicacion: "Escasa reserva de agua en el perfil profundo. Alto riesgo de estrés hídrico.",
    };
  }
  if (mm < 180) {
    return {
      level: "amarillo",
      label: "Reserva Media",
      badgeClass: SEMAFORO_COLORS.amarillo.class,
      textColor: SEMAFORO_COLORS.amarillo.text,
      bgColor: SEMAFORO_COLORS.amarillo.bg,
      borderColor: SEMAFORO_COLORS.amarillo.border,
      icon: SEMAFORO_COLORS.amarillo.icon,
      rangoReferencia: "Ref: < 100 mm déficit · 100-180 mm media · > 180 mm óptima",
      explicacion: "Reserva hídrica moderada para siembra.",
    };
  }
  const label = mm >= 280 ? "Excelente Recarga Plena" : "Óptima / Muy Buena";
  return {
    level: "verde",
    label,
    badgeClass: SEMAFORO_COLORS.verde.class,
    textColor: SEMAFORO_COLORS.verde.text,
    bgColor: SEMAFORO_COLORS.verde.bg,
    borderColor: SEMAFORO_COLORS.verde.border,
    icon: SEMAFORO_COLORS.verde.icon,
    rangoReferencia: "Ref: < 100 mm déficit · 100-180 mm media · > 180 mm óptima",
    explicacion: `Reserva hídrica abundante (${mm} mm). Soporte excelente para el período crítico del cultivo.`,
  };
}

/**
 * 12. COBERTURA DE NUTRIENTES (% de la meta de fertilización alcanzado)
 * - < 50%: 🔴 Deficiente
 * - 50% a 99%: 🟡 En progreso / Parcial
 * - >= 100%: 🟢 Cubierto con creces
 */
export function evaluarCoberturaNutriente(pct: number | null | undefined): SemaforoResult {
  if (pct === null || pct === undefined || isNaN(pct)) {
    return createUnknown("Cobertura");
  }
  if (pct < 50) {
    return {
      level: "rojo",
      label: "Déficit importante",
      badgeClass: SEMAFORO_COLORS.rojo.class,
      textColor: SEMAFORO_COLORS.rojo.text,
      bgColor: SEMAFORO_COLORS.rojo.bg,
      borderColor: SEMAFORO_COLORS.rojo.border,
      icon: SEMAFORO_COLORS.rojo.icon,
      rangoReferencia: "Ref: < 50% déficit · 50-99% parcial · >= 100% cubierto",
      explicacion: "Menos del 50% de la meta nutricional requerida por el cultivo.",
    };
  }
  if (pct < 100) {
    return {
      level: "amarillo",
      label: "Cobertura Parcial",
      badgeClass: SEMAFORO_COLORS.amarillo.class,
      textColor: SEMAFORO_COLORS.amarillo.text,
      bgColor: SEMAFORO_COLORS.amarillo.bg,
      borderColor: SEMAFORO_COLORS.amarillo.border,
      icon: SEMAFORO_COLORS.amarillo.icon,
      rangoReferencia: "Ref: < 50% déficit · 50-99% parcial · >= 100% cubierto",
      explicacion: "Aporte en progreso; falta fertilizar o biofertilizar para llegar al 100%.",
    };
  }
  return {
    level: "verde",
    label: "Meta 100% Cubierta",
    badgeClass: SEMAFORO_COLORS.verde.class,
    textColor: SEMAFORO_COLORS.verde.text,
    bgColor: SEMAFORO_COLORS.verde.bg,
    borderColor: SEMAFORO_COLORS.verde.border,
    icon: SEMAFORO_COLORS.verde.icon,
    rangoReferencia: "Ref: < 50% déficit · 50-99% parcial · >= 100% cubierto",
    explicacion: "Meta de nutrición superada satisfactoriamente con fertilidad residual.",
  };
}

/**
 * 13. CALIDAD DE SILAJE / FORRAJE / AGUA (Evaluador genérico inteligente)
 */
export function evaluarParametroLaboratorio(
  nombreParametro: string,
  valorNum: number
): SemaforoResult | null {
  const norm = nombreParametro.toLowerCase();

  // Potasio
  if (norm.includes("potasio") || norm === "k" || norm.includes("(k)")) {
    return evaluarPotasio(valorNum);
  }
  // Fósforo
  if (norm.includes("fósforo") || norm.includes("fosforo") || norm.includes("bray") || norm === "p") {
    return evaluarFosforoBray(valorNum);
  }
  // Nitrógeno / Nitratos
  if (norm.includes("n disponible") || norm.includes("nitrogeno disponible")) {
    return evaluarNitrogenoDisponible(valorNum);
  }
  // Materia Orgánica
  if (norm.includes("materia orgánica") || norm.includes("materia organica") || norm === "mo") {
    return evaluarMateriaOrganica(valorNum);
  }
  // pH
  if (norm === "ph" || norm.includes("ph actual") || norm.includes("ph ")) {
    return evaluarPH(valorNum);
  }
  // Azufre
  if (norm.includes("azufre") || norm === "s" || norm.includes("(s)")) {
    return evaluarAzufre(valorNum);
  }
  // Zinc
  if (norm.includes("zinc") || norm === "zn" || norm.includes("(zn)")) {
    return evaluarZinc(valorNum);
  }
  // Calcio
  if (norm.includes("calcio") || norm === "ca" || norm.includes("(ca)")) {
    return evaluarCalcio(valorNum);
  }
  // Magnesio
  if (norm.includes("magnesio") || norm === "mg" || norm.includes("(mg)")) {
    return evaluarMagnesio(valorNum);
  }
  // Conductividad
  if (norm.includes("conductividad") || norm.includes("ce ") || norm === "ce") {
    return evaluarConductividad(valorNum);
  }

  // Bromatología de Forrajes / Silajes
  if (norm.includes("proteína") || norm.includes("proteina") || norm === "pb") {
    // PB: < 7% rojo, 7-11% amarillo, > 11% verde
    if (valorNum < 7) return createSem("rojo", "Baja (<7%)", "Proteína bruta baja para ración.");
    if (valorNum <= 11) return createSem("amarillo", "Media (7-11%)", "Proteína moderada.");
    return createSem("verde", "Óptima (>11%)", "Excelente aporte proteico.");
  }
  if (norm.includes("fdn") || norm.includes("fibra detergente neutro")) {
    // FDN: < 48% verde, 48-60% amarillo, > 60% rojo (a menor FDN, más come el animal)
    if (valorNum < 48) return createSem("verde", "Óptima (<48%)", "Excelente digestibilidad y consumo voluntario.");
    if (valorNum <= 60) return createSem("amarillo", "Media (48-60%)", "Calidad intermedia.");
    return createSem("rojo", "Alta (>60%)", "Fibra alta; limita el consumo animal.");
  }
  if (norm.includes("fda") || norm.includes("fibra detergente ácido")) {
    // FDA: < 32% verde, 32-40% amarillo, > 40% rojo
    if (valorNum < 32) return createSem("verde", "Óptima (<32%)", "Bajo contenido de lignina indigestible.");
    if (valorNum <= 40) return createSem("amarillo", "Aceptable (32-40%)", "Fibra moderada.");
    return createSem("rojo", "Alta (>40%)", "Alta indigestibilidad.");
  }
  if (norm.includes("digestibilidad")) {
    // Digestibilidad: < 55% rojo, 55-65% amarillo, > 65% verde
    if (valorNum < 55) return createSem("rojo", "Baja (<55%)", "Baja asimilación ruminal.");
    if (valorNum <= 65) return createSem("amarillo", "Media (55-65%)", "Digestibilidad aceptable.");
    return createSem("verde", "Alta (>65%)", "Excelente digestibilidad ruminal.");
  }
  if (norm.includes("energía") || norm.includes("energia") || norm.includes("em ")) {
    // EM Mcal/kg: < 2.0 rojo, 2.0-2.3 amarillo, > 2.3 verde
    if (valorNum < 2.0) return createSem("rojo", "Baja (<2.0 Mcal)", "Aporte calórico deficiente.");
    if (valorNum <= 2.3) return createSem("amarillo", "Media (2.0-2.3)", "Energía moderada.");
    return createSem("verde", "Alta (>2.3 Mcal)", "Excelente densidad energética.");
  }

  // Agua de Bebida Animal
  if (norm.includes("salinidad") && (norm.includes("g/l") || norm.includes("total"))) {
    // Salinidad: < 1.5 g/L verde, 1.5-3.0 amarillo, > 3.0 rojo
    if (valorNum < 1.5) return createSem("verde", "Excelente (<1.5 g/L)", "Apta sin restricciones para rodeo.");
    if (valorNum <= 3.0) return createSem("amarillo", "Aceptable (1.5-3 g/L)", "Aceptable para ganado lechero.");
    return createSem("rojo", "Riesgosa (>3 g/L)", "Riesgo de menor consumo de agua y caída de producción.");
  }
  if (norm.includes("sulfato") && norm.includes("agua")) {
    if (valorNum < 500) return createSem("verde", "Óptimo (<500 mg/L)", "Sin efecto laxante.");
    if (valorNum <= 1000) return createSem("amarillo", "Alerta (500-1000 mg/L)", "Controlar acostumbramiento.");
    return createSem("rojo", "Crítico (>1000 mg/L)", "Efecto laxante perjudicial.");
  }

  return null;
}

function createSem(level: SemaforoLevel, label: string, explicacion: string): SemaforoResult {
  const c = SEMAFORO_COLORS[level];
  return {
    level,
    label,
    badgeClass: c.class,
    textColor: c.text,
    bgColor: c.bg,
    borderColor: c.border,
    icon: c.icon,
    rangoReferencia: "",
    explicacion,
  };
}

function createUnknown(paramName: string): SemaforoResult {
  return {
    level: "amarillo",
    label: "Sin dato",
    badgeClass: "semaforoNeutro",
    textColor: "#64748b",
    bgColor: "#f1f5f9",
    borderColor: "#cbd5e1",
    icon: "⚪",
    rangoReferencia: "",
    explicacion: `Sin medición disponible para ${paramName}.`,
  };
}
