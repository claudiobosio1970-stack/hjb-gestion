const MONTHS: Record<string, string> = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  setiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

const MONTH_NUMBERS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

/**
 * Formatea fechas según especificación del usuario:
 * 1. Con día exacto: DD/MM/YYYY (número de día / número de mes / año)
 * 2. Sin día exacto: - / MM / YYYY
 * 3. Con estación del año: Estación / YYYY (ej: Primavera / 2024, Otoño / 2025)
 * 4. Sin mes ni día: - / - / YYYY
 */
export function formatHistoricalDate(value?: string): string {
  if (!value) return "—";
  const trimmed = value.trim();

  // 1. Formato ISO YYYY-MM-DD (del selector date de HTML)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-");
    return `${d}/${m}/${y}`;
  }

  // 2. Formato ya en DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/");
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }

  // 3. Estación del año: Primavera, Verano, Otoño, Invierno + Año
  const seasonMatch = trimmed.match(/^(Primavera|Verano|Otoño|Invierno)\s+(\d{4})/i);
  if (seasonMatch) {
    const season = seasonMatch[1].charAt(0).toUpperCase() + seasonMatch[1].slice(1).toLowerCase();
    const year = seasonMatch[2];
    return `${season} / ${year}`;
  }

  // 4. "Fin 2024" -> fin de año = Diciembre
  if (/^Fin\s+(\d{4})$/i.test(trimmed)) {
    const y = trimmed.match(/\d{4}/)?.[0];
    return `- / 12 / ${y}`;
  }

  // 5. Meses dobles: "Abril/Mayo 2025", "Enero/Febrero 2026", "Febrero/Marzo 2025", "Noviembre/Diciembre 2025"
  const dualMatch = trimmed.match(/^([A-Za-zñáéíóú]+)\/([A-Za-zñáéíóú]+)\s+(\d{4})/i);
  if (dualMatch) {
    const m1 = MONTHS[dualMatch[1].toLowerCase()];
    const m2 = MONTHS[dualMatch[2].toLowerCase()];
    const y = dualMatch[3];
    if (m1 && m2) {
      return `- / ${m1}-${m2} / ${y}`;
    }
  }

  // 6. Rango con años: "Diciembre 2024 / Enero 2025"
  if (/^diciembre\s+(\d{4})\s*\/\s*enero\s+(\d{4})/i.test(trimmed)) {
    const m = trimmed.match(/\d{4}/g);
    if (m && m.length >= 2) {
      return `- / 12 / ${m[0]} - 01 / ${m[1]}`;
    }
  }

  // 7. Mes único: "Mayo 2025", "Noviembre 2024", "Diciembre 2024", "Febrero 2026", etc.
  const singleMonthMatch = trimmed.match(/^([A-Za-zñáéíóú]+)\s+(\d{4})/i);
  if (singleMonthMatch) {
    const m = MONTHS[singleMonthMatch[1].toLowerCase()];
    const y = singleMonthMatch[2];
    if (m) {
      return `- / ${m} / ${y}`;
    }
  }

  // 8. Solo año: "2024", "2025", "2026"
  if (/^\d{4}$/.test(trimmed)) {
    return `- / - / ${trimmed}`;
  }

  // 9. Campaña: "Campaña 2024/25" -> - / - / 2024-25
  if (/^Campaña\s+(\d{4}\/\d{2,4})$/i.test(trimmed)) {
    const camp = trimmed.replace(/^Campaña\s+/i, "");
    return `- / - / ${camp}`;
  }

  return trimmed;
}

/**
 * Calcula un puntaje cronológico numérico YYYYMMDD para ordenar de más reciente a más antiguo.
 */
export function getActivityDateScore(act: {
  campana?: string;
  fechaReal?: string;
  fechaPlanificada?: string;
  cultivo?: string;
  tipo?: string;
}): number {
  const str = (act.fechaReal || act.fechaPlanificada || "").trim();
  let year = 2024;
  let month = 6;
  let day = 15;

  // Campaña base como fallback
  if (act.campana === "2026/27") year = 2026;
  else if (act.campana === "2025/26") year = 2025;
  else if (act.campana === "2024/25") year = 2024;

  // 1. Formato ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return Number(isoMatch[1]) * 10000 + Number(isoMatch[2]) * 100 + Number(isoMatch[3]);
  }

  // 2. Formato DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    return Number(dmyMatch[3]) * 10000 + Number(dmyMatch[2]) * 100 + Number(dmyMatch[1]);
  }

  // 3. Año explícito en texto
  const yMatch = str.match(/\b(202[4-9])\b/);
  if (yMatch) {
    year = Number(yMatch[1]);
  }

  // 4. Estaciones del año en el hemisferio sur:
  if (/primavera/i.test(str)) {
    month = 10;
  } else if (/invierno/i.test(str)) {
    month = 7;
  } else if (/otoño/i.test(str)) {
    month = 4;
  } else if (/verano/i.test(str)) {
    month = 1;
  } else if (/fin\s+\d{4}/i.test(str)) {
    month = 12;
    day = 30;
  }

  // 5. Meses en texto
  for (const [mName, mNum] of Object.entries(MONTH_NUMBERS)) {
    if (new RegExp(mName, "i").test(str)) {
      month = mNum;
      break;
    }
  }

  // Ajuste por ciclo de cultivo si no hay fecha exacta
  if (act.tipo === "Cosecha" && month === 6) {
    if (act.cultivo && /trigo/i.test(act.cultivo)) month = 12;
    else if (act.cultivo && /soja/i.test(act.cultivo)) { month = 5; year += 1; }
    else if (act.cultivo && /maíz|maiz/i.test(act.cultivo)) { month = 6; year += 1; }
  }

  return year * 10000 + month * 100 + day;
}

/**
 * Ordena las actividades desde lo más reciente arriba de todo, hacia lo más antiguo hacia abajo.
 */
export function sortActivitiesRecentFirst<T extends {
  campana?: string;
  fechaReal?: string;
  fechaPlanificada?: string;
  cultivo?: string;
  tipo?: string;
}>(list: T[]): T[] {
  return [...list].sort((a, b) => getActivityDateScore(b) - getActivityDateScore(a));
}
