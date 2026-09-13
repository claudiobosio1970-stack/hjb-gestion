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
