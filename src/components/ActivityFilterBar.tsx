"use client";

import { useMemo } from "react";
import { Activity } from "@/lib/agricultureData";
import { formatHistoricalDate } from "@/lib/dateUtils";
import { LOTES_POR_CAMPO } from "@/lib/historicalData";
import { campos } from "@/lib/mockData";

export interface FilterState {
  fecha: string;
  campo: string;
  lote: string;
  cultivo: string;
  tipoLabor: string;
  estado: string;
  observacion: string;
  campana: string;
}

export const INITIAL_FILTERS: FilterState = {
  fecha: "",
  campo: "Todos",
  lote: "Todos",
  cultivo: "Todos",
  tipoLabor: "Todos",
  estado: "Todos",
  observacion: "",
  campana: "Todas",
};

export function filterActivities(activities: Activity[], filters: FilterState): Activity[] {
  return activities.filter((act) => {
    // 1. Campo
    if (filters.campo && filters.campo !== "Todos") {
      if (act.campo.toLowerCase() !== filters.campo.toLowerCase()) return false;
    }

    // 2. Campaña
    if (filters.campana && filters.campana !== "Todas") {
      if (act.campana !== filters.campana) return false;
    }

    // 3. Lote
    if (filters.lote && filters.lote !== "Todos") {
      const actLote = (act.lote || "").toLowerCase();
      const targetLote = filters.lote.toLowerCase();
      const matchesLote =
        actLote.includes(targetLote) ||
        (act.esGrupal && act.lotesAfectados?.some((l) => l.toLowerCase().includes(targetLote)));
      if (!matchesLote) return false;
    }

    // 4. Tipo de Cultivo
    if (filters.cultivo && filters.cultivo !== "Todos") {
      const actCultivo = (act.cultivo || "").toLowerCase();
      const targetCultivo = filters.cultivo.toLowerCase();
      if (!actCultivo.includes(targetCultivo)) return false;
    }

    // 5. Labor / Tipo
    if (filters.tipoLabor && filters.tipoLabor !== "Todos") {
      if (act.tipo !== filters.tipoLabor) return false;
    }

    // 6. Estado
    if (filters.estado && filters.estado !== "Todos") {
      if (act.estado !== filters.estado) return false;
    }

    // 7. Fecha
    if (filters.fecha && filters.fecha.trim()) {
      const q = filters.fecha.trim().toLowerCase();
      const rawDate = (act.fechaReal || act.fechaPlanificada || "").toLowerCase();
      const formattedDate = formatHistoricalDate(act.fechaReal || act.fechaPlanificada).toLowerCase();
      if (!rawDate.includes(q) && !formattedDate.includes(q) && !act.campana.toLowerCase().includes(q)) {
        return false;
      }
    }

    // 8. Observación
    if (filters.observacion && filters.observacion.trim()) {
      const q = filters.observacion.trim().toLowerCase();
      const inObs = (act.observaciones || "").toLowerCase().includes(q);
      const inDisc = (act.discrepancia || "").toLowerCase().includes(q);
      const inNota = (act.superficieNota || "").toLowerCase().includes(q);
      if (!inObs && !inDisc && !inNota) return false;
    }

    return true;
  });
}

export default function ActivityFilterBar({
  filters,
  onChange,
  onReset,
  showCampo = false,
  fixedCampo,
  totalCount,
  filteredCount,
}: {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  onReset: () => void;
  showCampo?: boolean;
  fixedCampo?: string;
  totalCount: number;
  filteredCount: number;
}) {
  function update<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  // Lotes disponibles dinámicos
  const activeCampo = fixedCampo || (filters.campo !== "Todos" ? filters.campo : undefined);
  const lotesDisponibles = useMemo(() => {
    if (activeCampo && LOTES_POR_CAMPO[activeCampo]) {
      return LOTES_POR_CAMPO[activeCampo];
    }
    // Si no hay campo seleccionado, unir todos los lotes únicos
    const set = new Set<string>();
    Object.values(LOTES_POR_CAMPO).forEach((list) => list.forEach((l) => set.add(l)));
    return Array.from(set);
  }, [activeCampo]);

  const hasActiveFilters =
    filters.fecha !== "" ||
    (showCampo && filters.campo !== "Todos") ||
    filters.lote !== "Todos" ||
    filters.cultivo !== "Todos" ||
    filters.tipoLabor !== "Todos" ||
    filters.estado !== "Todos" ||
    filters.observacion !== "" ||
    filters.campana !== "Todas";

  const CULTIVOS_COMUNES = [
    "Maíz",
    "Trigo",
    "Soja",
    "Soja de 2da",
    "Girasol",
    "Alfalfa",
    "Avena",
    "Forrajes",
  ];

  return (
    <div className="filterContainer" style={{ background: "white", border: "1px solid var(--line)", borderRadius: "12px", padding: "16px 18px", marginBottom: "20px", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--slate-800)", textTransform: "uppercase", letterSpacing: ".04em" }}>
            Filtros de Búsqueda
          </span>
          <span className="pill badgeSlate" style={{ fontSize: "11px" }}>
            Mostrando {filteredCount} de {totalCount} labores
          </span>
        </div>
        {hasActiveFilters && (
          <button
            className="secondaryButton smallButton"
            style={{ fontSize: "12px", padding: "4px 10px", color: "var(--brand-700)" }}
            onClick={onReset}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
        {/* Filtro por Fecha */}
        <div>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "var(--slate-600)", marginBottom: "4px" }}>
            Fecha / Mes / Año
          </label>
          <input
            type="text"
            className="input"
            style={{ padding: "7px 10px", fontSize: "13px" }}
            placeholder="ej: 05/2025, 2024..."
            value={filters.fecha}
            onChange={(e) => update("fecha", e.target.value)}
          />
        </div>

        {/* Filtro por Campo (solo en vista general) */}
        {showCampo && (
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "var(--slate-600)", marginBottom: "4px" }}>
              Campo
            </label>
            <select
              className="select"
              style={{ padding: "7px 10px", fontSize: "13px" }}
              value={filters.campo}
              onChange={(e) => {
                onChange({ ...filters, campo: e.target.value, lote: "Todos" });
              }}
            >
              <option value="Todos">Todos los campos</option>
              {campos.map((c) => (
                <option key={c.nombre} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filtro por Lote */}
        <div>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "var(--slate-600)", marginBottom: "4px" }}>
            Lote
          </label>
          <select
            className="select"
            style={{ padding: "7px 10px", fontSize: "13px" }}
            value={filters.lote}
            onChange={(e) => update("lote", e.target.value)}
          >
            <option value="Todos">Todos los lotes</option>
            {lotesDisponibles.map((lote) => (
              <option key={lote} value={lote}>
                {lote}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Tipo de Cultivo */}
        <div>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "var(--slate-600)", marginBottom: "4px" }}>
            Cultivo
          </label>
          <select
            className="select"
            style={{ padding: "7px 10px", fontSize: "13px" }}
            value={filters.cultivo}
            onChange={(e) => update("cultivo", e.target.value)}
          >
            <option value="Todos">Todos los cultivos</option>
            {CULTIVOS_COMUNES.map((cult) => (
              <option key={cult} value={cult}>
                {cult}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Labor */}
        <div>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "var(--slate-600)", marginBottom: "4px" }}>
            Labor / Tipo
          </label>
          <select
            className="select"
            style={{ padding: "7px 10px", fontSize: "13px" }}
            value={filters.tipoLabor}
            onChange={(e) => update("tipoLabor", e.target.value)}
          >
            <option value="Todos">Todos los tipos</option>
            <option value="Siembra">Siembra</option>
            <option value="Cosecha">Cosecha</option>
            <option value="Picado">Picado</option>
            <option value="Rollos">Rollos</option>
            <option value="Fertilización">Fertilización</option>
            <option value="Biofertilización">Biofertilización</option>
            <option value="Fumigación">Fumigación</option>
            <option value="Barbecho">Barbecho</option>
            <option value="Laboreo">Laboreo</option>
          </select>
        </div>

        {/* Filtro por Estado */}
        <div>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "var(--slate-600)", marginBottom: "4px" }}>
            Estado
          </label>
          <select
            className="select"
            style={{ padding: "7px 10px", fontSize: "13px" }}
            value={filters.estado}
            onChange={(e) => update("estado", e.target.value)}
          >
            <option value="Todos">Todos los estados</option>
            <option value="Realizada">Realizada</option>
            <option value="Planificada">Planificada</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>

        {/* Filtro por Campaña */}
        <div>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "var(--slate-600)", marginBottom: "4px" }}>
            Campaña
          </label>
          <select
            className="select"
            style={{ padding: "7px 10px", fontSize: "13px" }}
            value={filters.campana}
            onChange={(e) => update("campana", e.target.value)}
          >
            <option value="Todas">Todas</option>
            <option value="2026/27">2026/27</option>
            <option value="2025/26">2025/26</option>
            <option value="2024/25">2024/25</option>
          </select>
        </div>

        {/* Filtro por Observación */}
        <div style={{ gridColumn: "span 2" }}>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "var(--slate-600)", marginBottom: "4px" }}>
            Buscar en Observaciones / Notas
          </label>
          <input
            type="text"
            className="input"
            style={{ padding: "7px 10px", fontSize: "13px" }}
            placeholder="Buscar por texto en notas, discrepancias, malezas..."
            value={filters.observacion}
            onChange={(e) => update("observacion", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
