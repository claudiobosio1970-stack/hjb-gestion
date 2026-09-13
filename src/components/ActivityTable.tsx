"use client";

import { useMemo, useState } from "react";
import { Activity, agricultureData } from "@/lib/agricultureData";
import { formatHistoricalDate, sortActivitiesRecentFirst } from "@/lib/dateUtils";

function getTipoBadge(tipo: string) {
  switch (tipo) {
    case "Siembra":
      return "pill badgeGreen";
    case "Cosecha":
    case "Picado":
    case "Rollos":
      return "pill badgePurple";
    case "Fertilización":
    case "Biofertilización":
      return "pill badgeTeal";
    case "Fumigación":
    case "Barbecho":
      return "pill badgeBlue";
    default:
      return "pill badgeSlate";
  }
}

interface TableFilters {
  fecha: string;
  campoLote: string;
  cultivo: string;
  insumo: string;
  produccion: string;
  estado: string;
  observacion: string;
}

const INITIAL_FILTERS: TableFilters = {
  fecha: "",
  campoLote: "",
  cultivo: "Todos",
  insumo: "",
  produccion: "",
  estado: "Todos",
  observacion: "",
};

export default function ActivityTable({
  activities,
  onEdit,
  onSaved,
  showCampo = true,
}: {
  activities: Activity[];
  onEdit?: (activity: Activity) => void;
  onSaved?: () => void;
  showCampo?: boolean;
}) {
  const [filters, setFilters] = useState<TableFilters>(INITIAL_FILTERS);

  function update<K extends keyof TableFilters>(key: K, value: TableFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setFilters(INITIAL_FILTERS);
  }

  const hasActiveFilters =
    filters.fecha !== "" ||
    filters.campoLote !== "" ||
    filters.cultivo !== "Todos" ||
    filters.insumo !== "" ||
    filters.produccion !== "" ||
    filters.estado !== "Todos" ||
    filters.observacion !== "";

  // Acción de 1 solo clic para pasar de Planificada a Realizada
  function handleQuickComplete(activity: Activity) {
    const today = new Date().toISOString().split("T")[0];
    const updated: Activity = {
      ...activity,
      estado: "Realizada",
      fechaReal: activity.fechaReal || activity.fechaPlanificada || today,
      superficieReal: activity.superficieReal ?? activity.superficiePlanificada,
      insumos: activity.insumos.map((i) => ({
        ...i,
        dosisReal: i.dosisReal ?? i.dosisPlanificada,
      })),
      updatedAt: new Date().toISOString(),
    };

    agricultureData.saveActivity(updated);
    if (onSaved) onSaved();
  }

  // Filtrado reactivo en vivo + ordenado desde lo más reciente arriba de todo
  const filteredActivities = useMemo(() => {
    const filtered = activities.filter((act) => {
      // 1. Filtro Fecha
      if (filters.fecha.trim()) {
        const q = filters.fecha.trim().toLowerCase();
        const rawDate = (act.fechaReal || act.fechaPlanificada || "").toLowerCase();
        const formattedDate = formatHistoricalDate(act.fechaReal || act.fechaPlanificada).toLowerCase();
        const camp = act.campana.toLowerCase();
        if (!rawDate.includes(q) && !formattedDate.includes(q) && !camp.includes(q)) {
          return false;
        }
      }

      // 2. Filtro Campo y Lote
      if (filters.campoLote.trim()) {
        const q = filters.campoLote.trim().toLowerCase();
        const campoMatch = act.campo.toLowerCase().includes(q);
        const loteMatch = (act.lote || "").toLowerCase().includes(q);
        const grupalMatch = act.esGrupal && act.lotesAfectados?.some((l) => l.toLowerCase().includes(q));
        if (!campoMatch && !loteMatch && !grupalMatch) return false;
      }

      // 3. Filtro Cultivo / Labor
      if (filters.cultivo !== "Todos") {
        const q = filters.cultivo.toLowerCase();
        const cultMatch = act.cultivo.toLowerCase().includes(q);
        const laborMatch = act.tipo.toLowerCase().includes(q);
        if (!cultMatch && !laborMatch) return false;
      }

      // 4. Filtro Insumos
      if (filters.insumo.trim()) {
        const q = filters.insumo.trim().toLowerCase();
        const inInsumos = act.insumos.some(
          (i) => i.producto.toLowerCase().includes(q) || (i.observacion || "").toLowerCase().includes(q)
        );
        if (!inInsumos) return false;
      }

      // 5. Filtro Producción / Rendimiento
      if (filters.produccion.trim()) {
        const q = filters.produccion.trim().toLowerCase();
        if (!act.produccion) return false;
        const dest = (act.produccion.destino || "").toLowerCase();
        const unidad = (act.produccion.unidad || "").toLowerCase();
        const unidadRend = (act.produccion.unidadRendimiento || "").toLowerCase();
        const rendStr = String(act.produccion.rendimiento || "");
        const cantStr = String(act.produccion.cantidad || "");
        if (!dest.includes(q) && !unidad.includes(q) && !unidadRend.includes(q) && !rendStr.includes(q) && !cantStr.includes(q)) {
          return false;
        }
      }

      // 6. Filtro Estado
      if (filters.estado !== "Todos") {
        if (act.estado !== filters.estado) return false;
      }

      // 7. Filtro Observaciones / Discrepancias
      if (filters.observacion.trim()) {
        const q = filters.observacion.trim().toLowerCase();
        const inObs = (act.observaciones || "").toLowerCase().includes(q);
        const inDisc = (act.discrepancia || "").toLowerCase().includes(q);
        const inNota = (act.superficieNota || "").toLowerCase().includes(q);
        if (!inObs && !inDisc && !inNota) return false;
      }

      return true;
    });

    // Siempre ordenar desde lo más reciente arriba de todo, hacia lo más antiguo
    return sortActivitiesRecentFirst(filtered);
  }, [activities, filters]);

  const CULTIVOS_OPTIONS = ["Maíz", "Trigo", "Soja", "Girasol", "Alfalfa", "Avena", "Forrajes"];

  return (
    <div>
      {/* Barra de estado de filtros en vivo */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
        <span style={{ fontSize: "12.5px", color: "var(--slate-600)", fontWeight: 600 }}>
          Mostrando <strong>{filteredActivities.length}</strong> de {activities.length} labores (orden cronológico reciente primero)
        </span>
        {hasActiveFilters && (
          <button className="thResetBtn" onClick={reset} title="Restablecer todos los filtros">
            Limpiar filtros activos ✕
          </button>
        )}
      </div>

      <div className="tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              {/* Columna Fecha + Filtro */}
              <th style={{ width: "140px" }}>
                <div className="thHeaderWrap">
                  <div className="thTitleRow">
                    <span className="thTitle">Fecha</span>
                  </div>
                  <input
                    type="text"
                    className="thFilterInput"
                    placeholder="ej: 2026, 05/25"
                    value={filters.fecha}
                    onChange={(e) => update("fecha", e.target.value)}
                  />
                </div>
              </th>

              {/* Columna Campo y Lote + Filtro */}
              <th style={{ width: "180px" }}>
                <div className="thHeaderWrap">
                  <div className="thTitleRow">
                    <span className="thTitle">{showCampo ? "Campo y Lote" : "Lote"}</span>
                  </div>
                  <input
                    type="text"
                    className="thFilterInput"
                    placeholder={showCampo ? "Campo o lote..." : "Filtrar lote..."}
                    value={filters.campoLote}
                    onChange={(e) => update("campoLote", e.target.value)}
                  />
                </div>
              </th>

              {/* Columna Cultivo & Labor + Filtro */}
              <th style={{ width: "165px" }}>
                <div className="thHeaderWrap">
                  <div className="thTitleRow">
                    <span className="thTitle">Cultivo</span>
                  </div>
                  <select
                    className="thFilterSelect"
                    value={filters.cultivo}
                    onChange={(e) => update("cultivo", e.target.value)}
                  >
                    <option value="Todos">Todos</option>
                    {CULTIVOS_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </th>

              {/* Columna Insumos & Dosis + Filtro */}
              <th>
                <div className="thHeaderWrap">
                  <div className="thTitleRow">
                    <span className="thTitle">Insumos & Dosis</span>
                  </div>
                  <input
                    type="text"
                    className="thFilterInput"
                    placeholder="Buscar producto, semilla..."
                    value={filters.insumo}
                    onChange={(e) => update("insumo", e.target.value)}
                  />
                </div>
              </th>

              {/* Columna Producción / Rend. + Filtro */}
              <th style={{ width: "165px" }}>
                <div className="thHeaderWrap">
                  <div className="thTitleRow">
                    <span className="thTitle">Producción / Rend.</span>
                  </div>
                  <input
                    type="text"
                    className="thFilterInput"
                    placeholder="Grano, silo..."
                    value={filters.produccion}
                    onChange={(e) => update("produccion", e.target.value)}
                  />
                </div>
              </th>

              {/* Columna Estado + Filtro */}
              <th style={{ width: "135px" }}>
                <div className="thHeaderWrap">
                  <div className="thTitleRow">
                    <span className="thTitle">Estado</span>
                  </div>
                  <select
                    className="thFilterSelect"
                    value={filters.estado}
                    onChange={(e) => update("estado", e.target.value)}
                  >
                    <option value="Todos">Todos</option>
                    <option value="Realizada">Realizada</option>
                    <option value="Planificada">Planificada</option>
                  </select>
                </div>
              </th>

              {/* Columna Observaciones & Discrepancias + Filtro */}
              <th>
                <div className="thHeaderWrap">
                  <div className="thTitleRow">
                    <span className="thTitle">Observaciones</span>
                  </div>
                  <input
                    type="text"
                    className="thFilterInput"
                    placeholder="Buscar en notas..."
                    value={filters.observacion}
                    onChange={(e) => update("observacion", e.target.value)}
                  />
                </div>
              </th>

              {onEdit && <th style={{ width: "60px" }}></th>}
            </tr>
          </thead>
          <tbody>
            {!filteredActivities.length ? (
              <tr>
                <td colSpan={onEdit ? 8 : 7} style={{ textAlign: "center", padding: "36px", color: "var(--muted)" }}>
                  No se encontraron labores que coincidan con los filtros aplicados.
                  {hasActiveFilters && (
                    <div style={{ marginTop: "8px" }}>
                      <button className="thResetBtn" onClick={reset}>
                        Restablecer filtros
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filteredActivities.map((activity) => {
                const fechaStr = activity.fechaReal || activity.fechaPlanificada;
                const hasDiscrepancy = Boolean(activity.discrepancia);

                return (
                  <tr key={activity.id}>
                    {/* Fecha */}
                    <td>
                      <strong style={{ fontSize: "13.5px", color: "var(--slate-900)", display: "block" }}>
                        {formatHistoricalDate(fechaStr)}
                      </strong>
                      <small style={{ color: "var(--slate-500)", fontSize: "11.5px", marginTop: "3px", display: "block" }}>
                        Campaña {activity.campana}
                      </small>
                    </td>

                    {/* Campo y Lote */}
                    <td>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
                        {showCampo && (
                          <strong style={{ fontSize: "14.5px", color: "var(--slate-950)", letterSpacing: "-0.01em" }}>
                            {activity.campo}
                          </strong>
                        )}
                        {showCampo && <span style={{ color: "var(--slate-400)", fontWeight: 700 }}>·</span>}
                        <span style={{ fontSize: "14px", fontWeight: showCampo ? 600 : 700, color: "var(--slate-800)" }}>
                          {activity.lote || "Lote Único"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "3px", flexWrap: "wrap" }}>
                        {activity.superficieReal || activity.superficiePlanificada ? (
                          <small style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 500 }}>
                            {activity.superficieReal ?? activity.superficiePlanificada} ha
                          </small>
                        ) : null}
                        {activity.esGrupal && (
                          <span className="groupBadge" title={activity.lotesAfectados?.join(", ")}>
                            👥 Grupal
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cultivo & Labor */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "14px", color: "var(--slate-900)" }}>
                          {activity.cultivo}
                        </strong>
                        <span className={getTipoBadge(activity.tipo)} style={{ fontSize: "10.5px" }}>
                          {activity.tipo}
                        </span>
                      </div>
                      {activity.cultivoAntecesor && (
                        <small style={{ color: "var(--slate-500)", fontStyle: "italic", display: "block", marginTop: "3px" }}>
                          Antecesor: {activity.cultivoAntecesor}
                        </small>
                      )}
                      {activity.metodoAplicacion && (
                        <small style={{ color: "var(--muted)", display: "block", marginTop: "2px" }}>
                          Aplicación {activity.metodoAplicacion}
                        </small>
                      )}
                    </td>

                    {/* Insumos & Dosis */}
                    <td>
                      {activity.insumos.length ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {activity.insumos.map((input) => {
                            const dosis = input.dosisReal ?? input.dosisPlanificada;
                            return (
                              <div className="inputSummary" key={input.id} style={{ borderLeft: "2px solid var(--line)", paddingLeft: "8px" }}>
                                <strong style={{ fontSize: "12.5px" }}>{input.producto}</strong>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginTop: "2px" }}>
                                  {dosis !== null && (
                                    <span style={{ fontSize: "12px", color: "var(--slate-800)", fontWeight: 600 }}>
                                      {dosis.toLocaleString("es-AR")} {input.unidad}
                                    </span>
                                  )}
                                  {input.esDosisDerivada && (
                                    <span className="pill badgeAmber" style={{ fontSize: "9.5px", padding: "1px 5px" }} title="Dosis calculada a partir de los totales y hectáreas históricas">
                                      Dosis calc.
                                    </span>
                                  )}
                                  {input.cantidadTotal && (
                                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                                      (Total: {input.cantidadTotal.toLocaleString("es-AR")} {input.unidadTotal || ""})
                                    </span>
                                  )}
                                </div>
                                {input.observacion && (
                                  <small style={{ color: "var(--slate-500)", fontSize: "11px" }}>
                                    {input.observacion}
                                  </small>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="muted" style={{ fontSize: "12px" }}>Sin insumos</span>
                      )}
                    </td>

                    {/* Producción / Rendimiento */}
                    <td>
                      {activity.produccion ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {activity.produccion.rendimiento !== null && (
                            <div style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--brand-800)" }}>
                              {activity.produccion.rendimiento.toLocaleString("es-AR")} {activity.produccion.unidadRendimiento}
                            </div>
                          )}
                          {activity.produccion.cantidad !== null && (
                            <small style={{ fontWeight: 600, color: "var(--slate-700)" }}>
                              Total: {activity.produccion.cantidad.toLocaleString("es-AR")} {activity.produccion.unidad}
                            </small>
                          )}
                          {activity.produccion.destino && (
                            <span className="pill badgeSlate" style={{ width: "fit-content", fontSize: "10px" }}>
                              Destino: {activity.produccion.destino}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="muted" style={{ fontSize: "12px" }}>—</span>
                      )}
                    </td>

                    {/* Estado con botón 1-clic para pasar a Realizada */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <span
                          className={
                            activity.estado === "Realizada"
                              ? "status good"
                              : activity.estado === "Cancelada"
                              ? "status neutral"
                              : "status warn"
                          }
                        >
                          {activity.estado}
                        </span>

                        {activity.estado === "Planificada" && (
                          <button
                            type="button"
                            className="quickDoneBtn"
                            onClick={() => handleQuickComplete(activity)}
                            title="Hacé 1 clic para marcar esta labor como Realizada inmediatamente"
                          >
                            ✓ Marcar realizada
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Observaciones & Discrepancias */}
                    <td>
                      {activity.observaciones && (
                        <div style={{ fontSize: "12.5px", color: "var(--slate-700)", lineHeight: 1.4 }}>
                          {activity.observaciones}
                        </div>
                      )}
                      {activity.superficieNota && (
                        <small style={{ color: "var(--slate-500)", display: "block", marginTop: "3px" }}>
                          ℹ️ {activity.superficieNota}
                        </small>
                      )}
                      {hasDiscrepancy && (
                        <div className="discrepancyBox">
                          <strong>⚠️ Discrepancia documental:</strong>
                          <div>{activity.discrepancia}</div>
                        </div>
                      )}
                    </td>

                    {/* Acciones */}
                    {onEdit && (
                      <td className="alignRight">
                        <button className="tableAction" onClick={() => onEdit(activity)}>
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
