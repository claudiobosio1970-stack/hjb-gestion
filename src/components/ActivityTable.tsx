"use client";

import { useMemo, useState } from "react";
import { Activity, agricultureData } from "@/lib/agricultureData";
import { formatHistoricalDate, sortActivitiesRecentFirst } from "@/lib/dateUtils";

function getTipoBadge(tipo: string) {
  const t = (tipo || "").toLowerCase();
  if (t.includes("siembra")) return "pill badgeGreen";
  if (t.includes("cosecha") || t.includes("picado") || t.includes("rollo") || t.includes("armado")) return "pill badgePurple";
  if (t.includes("voltead") || t.includes("hilerad") || t.includes("rastrill")) return "pill badgeBlue";
  if (t.includes("fertiliz")) return "pill badgeTeal";
  if (t.includes("fumiga") || t.includes("pulveri") || t.includes("barbecho")) return "pill badgeBlue";
  if (t.includes("subsol") || t.includes("laboreo") || t.includes("rastra")) return "pill badgeAmber";
  return "pill badgeSlate";
}

interface TableFilters {
  fecha: string;
  campoLote: string;
  cultivo: string;
  labor: string;
  insumo: string;
  produccion: string;
  estado: string;
  observacion: string;
}

const INITIAL_FILTERS: TableFilters = {
  fecha: "",
  campoLote: "",
  cultivo: "Todos",
  labor: "Todos",
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
  hideCountNote = false,
}: {
  activities: Activity[];
  onEdit?: (activity: Activity) => void;
  onSaved?: () => void;
  showCampo?: boolean;
  hideCountNote?: boolean;
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
    filters.labor !== "Todos" ||
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

      // 3. Filtro Cultivo
      if (filters.cultivo !== "Todos") {
        const q = filters.cultivo.toLowerCase();
        const cult = (act.cultivo || (act.tipo === "Barbecho" ? "Barbecho" : "")).toLowerCase();
        if (!cult.includes(q)) return false;
      }

      // 4. Filtro Labor (Trabajo)
      if (filters.labor !== "Todos") {
        const q = filters.labor.toLowerCase();
        const laborMatch = act.tipo.toLowerCase().includes(q);
        if (!laborMatch) return false;
      }

      // 5. Filtro Insumos
      if (filters.insumo.trim()) {
        const q = filters.insumo.trim().toLowerCase();
        const inInsumos = act.insumos.some(
          (i) => i.producto.toLowerCase().includes(q) || (i.observacion || "").toLowerCase().includes(q)
        );
        if (!inInsumos) return false;
      }

      // 6. Filtro Producción / Rendimiento
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

      // 7. Filtro Estado
      if (filters.estado !== "Todos") {
        if (act.estado !== filters.estado) return false;
      }

      // 8. Filtro Observaciones / Discrepancias
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

  const CULTIVOS_OPTIONS = ["Maíz", "Trigo", "Soja", "Girasol", "Alfalfa", "Avena", "Forrajes", "Barbecho"];
  const LABORES_OPTIONS = Array.from(
    new Set([
      "Siembra",
      "Fertilización",
      "Biofertilización",
      "Volteo",
      "Rastrillado",
      "Armado de rollos",
      "Sacado de rollos",
      "Volteada de rollos",
      "Fumigación",
      "Barbecho",
      "Subsolado",
      "Laboreo",
      "Rastra de discos",
      "Cosecha",
      "Picado",
      "Rollos",
      "Monitoreo",
      ...activities.map((a) => a.tipo).filter(Boolean),
    ])
  );

  return (
    <div>
      {/* Barra de estado de filtros en vivo */}
      {(!hideCountNote || hasActiveFilters) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
          {!hideCountNote ? (
            <span style={{ fontSize: "12.5px", color: "var(--slate-600)", fontWeight: 600 }}>
              Mostrando <strong>{filteredActivities.length}</strong> de {activities.length} labores (orden cronológico reciente primero)
            </span>
          ) : <div />}
          {hasActiveFilters && (
            <button className="thResetBtn" onClick={reset} title="Restablecer todos los filtros">
              Limpiar filtros activos ✕
            </button>
          )}
        </div>
      )}

      {/* Aviso móvil de deslizamiento horizontal */}
      <div className="mobileTableHint">
        <span>↔️ Deslizá la tabla hacia los lados para ver todas las columnas y datos</span>
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

              {/* Columna Lote + Filtro */}
              <th style={{ width: "175px" }}>
                <div className="thHeaderWrap">
                  <div className="thTitleRow">
                    <span className="thTitle">Lote</span>
                  </div>
                  <input
                    type="text"
                    className="thFilterInput"
                    placeholder={showCampo ? "Lote o campo..." : "Filtrar lote..."}
                    value={filters.campoLote}
                    onChange={(e) => update("campoLote", e.target.value)}
                  />
                </div>
              </th>

              {/* Columna Cultivo + Filtro */}
              <th style={{ width: "140px" }}>
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

              {/* Columna Labor + Filtro */}
              <th style={{ width: "155px" }}>
                <div className="thHeaderWrap">
                  <div className="thTitleRow">
                    <span className="thTitle">Labor</span>
                  </div>
                  <select
                    className="thFilterSelect"
                    value={filters.labor}
                    onChange={(e) => update("labor", e.target.value)}
                  >
                    <option value="Todos">Todas</option>
                    {LABORES_OPTIONS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </th>

              {/* Columna Insumos + Filtro */}
              <th>
                <div className="thHeaderWrap">
                  <div className="thTitleRow">
                    <span className="thTitle">Insumos</span>
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

              {onEdit && (
                <th className="alignRight stickyActionCol" style={{ width: "80px" }}>
                  <span className="thTitle" style={{ fontSize: "11px", color: "var(--slate-500)" }}>Acción</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {!filteredActivities.length ? (
              activities.length === 0 ? (
                <tr>
                  <td colSpan={onEdit ? 9 : 8} style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
                    <div style={{ fontSize: "28px", marginBottom: "8px" }}>🌱</div>
                    <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--slate-800)", marginBottom: "4px" }}>
                      No hay labores registradas para la campaña 2026/27
                    </div>
                    <div style={{ fontSize: "13px" }}>
                      El historial está limpio. Hacé clic en <strong>+ Nueva labor</strong> o <strong>+ Registrar labor</strong> para cargar el primer trabajo.
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={onEdit ? 9 : 8} style={{ textAlign: "center", padding: "36px", color: "var(--muted)" }}>
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
              )
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
                            👥 Grupal ({activity.lotesAfectados?.length || 0} lotes)
                          </span>
                        )}
                      </div>
                      {activity.esGrupal && activity.lotesAfectados && activity.lotesAfectados.length > 0 && (
                        <div style={{ fontSize: "11px", color: "var(--brand-700)", marginTop: "2px", lineHeight: 1.25 }}>
                          {activity.lotesAfectados.join(" · ")}
                        </div>
                      )}
                    </td>

                    {/* Cultivo */}
                    <td>
                      <strong style={{ fontSize: "14px", color: "var(--slate-900)", display: "block" }}>
                        {activity.cultivo || (activity.tipo === "Barbecho" ? "Barbecho" : "—")}
                      </strong>
                      {activity.cultivoAntecesor && (
                        <small style={{ color: "var(--slate-500)", fontStyle: "italic", display: "block", marginTop: "3px" }}>
                          Antecesor: {activity.cultivoAntecesor}
                        </small>
                      )}
                    </td>

                    {/* Labor (Tipo de trabajo) */}
                    <td>
                      <div>
                        <span className={getTipoBadge(activity.tipo)} style={{ fontSize: "11px", fontWeight: 600 }}>
                          {activity.tipo}
                        </span>
                      </div>
                      {activity.metodoAplicacion && (
                        <small style={{ color: "var(--slate-600)", display: "block", marginTop: "3px", fontSize: "11px" }}>
                          Aplicación {activity.metodoAplicacion}
                        </small>
                      )}
                    </td>

                    {/* Insumos & Dosis */}
                    <td>
                      {activity.tipo.toLowerCase().includes("biofertiliz") ? (
                        activity.insumos.length ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {activity.insumos.map((input) => {
                              const prodLower = (input.producto || "").toLowerCase();
                              const obsLower = (input.observacion || "").toLowerCase();
                              const isLiq =
                                prodLower.includes("líquid") ||
                                prodLower.includes("efluente") ||
                                input.unidad.includes("kL") ||
                                obsLower.includes("tanque");
                              const tipoLabel = isLiq ? "Líquido" : "Sólido";
                              const dosis = input.dosisReal ?? input.dosisPlanificada;
                              const unidad = input.unidad || (isLiq ? "kL/ha" : "t/ha");
                              return (
                                <div
                                  key={input.id}
                                  style={{
                                    fontSize: "13px",
                                    color: "var(--slate-900)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {tipoLabel}: {dosis !== null && dosis !== undefined ? `${dosis.toLocaleString("es-AR")} ${unidad}` : "—"}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="muted" style={{ fontSize: "12px" }}>—</span>
                        )
                      ) : activity.insumos.length ? (
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
                          {activity.produccion.rollosDesglose && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "2px" }}>
                              {activity.produccion.rollosDesglose.avena ? (
                                <span className="pill badgeBlue" style={{ fontSize: "10px", padding: "1px 5px", fontWeight: 600 }}>
                                  🌾 {activity.produccion.rollosDesglose.avena} Avena
                                </span>
                              ) : null}
                              {activity.produccion.rollosDesglose.alfalfa ? (
                                <span className="pill badgeGreen" style={{ fontSize: "10px", padding: "1px 5px", fontWeight: 600 }}>
                                  🌿 {activity.produccion.rollosDesglose.alfalfa} Alfalfa
                                </span>
                              ) : null}
                              {activity.produccion.rollosDesglose.rastrojo ? (
                                <span className="pill badgeSlate" style={{ fontSize: "10px", padding: "1px 5px", fontWeight: 600 }}>
                                  🌽 {activity.produccion.rollosDesglose.rastrojo} Rastrojo
                                </span>
                              ) : null}
                            </div>
                          )}
                          {activity.produccion.fechaVolteada && (
                            <div style={{ fontSize: "10.5px", color: "var(--brand-700)", fontWeight: 600 }}>
                              🔄 Volteado: {formatHistoricalDate(activity.produccion.fechaVolteada)}
                            </div>
                          )}
                          {activity.produccion.fechaRastrillado && (
                            <div style={{ fontSize: "10.5px", color: "var(--slate-700)", fontWeight: 600 }}>
                              🚜 Rastrillado: {formatHistoricalDate(activity.produccion.fechaRastrillado)}
                            </div>
                          )}
                          {activity.produccion.fechaArmado && (
                            <div style={{ fontSize: "10.5px", color: "#166534", fontWeight: 600 }}>
                              📦 Armado: {formatHistoricalDate(activity.produccion.fechaArmado)}
                            </div>
                          )}
                          {activity.produccion.destino && (
                            <span
                              className={
                                activity.produccion.destino.toLowerCase().includes("tambo")
                                  ? "pill badgeGreen"
                                  : activity.produccion.destino.toLowerCase().includes("almacen") || activity.produccion.destino.toLowerCase().includes("campo")
                                  ? "pill badgeBlue"
                                  : "pill badgeSlate"
                              }
                              style={{ width: "fit-content", fontSize: "10px", fontWeight: 600 }}
                            >
                              {activity.produccion.destino.toLowerCase().includes("tambo") ? "🥛 " : activity.produccion.destino.toLowerCase().includes("almacen") || activity.produccion.destino.toLowerCase().includes("campo") ? "🏠 " : "📍 "}
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
                      <td className="alignRight stickyActionCol">
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
