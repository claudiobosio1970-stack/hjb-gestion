"use client";

import { Activity } from "@/lib/agricultureData";
import { formatHistoricalDate } from "@/lib/dateUtils";

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

export default function ActivityTable({
  activities,
  onEdit,
  showCampo = true,
}: {
  activities: Activity[];
  onEdit?: (activity: Activity) => void;
  showCampo?: boolean;
}) {
  if (!activities.length) {
    return (
      <div className="emptyState" style={{ padding: "36px 20px", textAlign: "center", color: "var(--muted)" }}>
        No se encontraron labores que coincidan con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="tableWrap">
      <table className="dataTable">
        <thead>
          <tr>
            <th style={{ width: "135px" }}>Fecha</th>
            <th style={{ width: "140px" }}>{showCampo ? "Campo / Lote" : "Lote"}</th>
            <th style={{ width: "170px" }}>Cultivo & Labor</th>
            <th>Insumos & Dosis</th>
            <th style={{ width: "175px" }}>Producción / Rend.</th>
            <th style={{ width: "115px" }}>Estado</th>
            <th>Observaciones & Discrepancias</th>
            {onEdit && <th style={{ width: "70px" }}></th>}
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => {
            const fechaStr = activity.fechaReal || activity.fechaPlanificada;
            const hasDiscrepancy = Boolean(activity.discrepancia);

            return (
              <tr key={activity.id}>
                {/* Fecha formateada según requerimiento: DD/MM/YYYY o -/MM/YYYY o Estación/YYYY */}
                <td>
                  <strong style={{ fontSize: "13.5px", color: "var(--slate-900)" }}>
                    {formatHistoricalDate(fechaStr)}
                  </strong>
                  <span className="pill badgeSlate" style={{ marginTop: "5px", fontSize: "10px", display: "inline-block" }}>
                    {activity.campana}
                  </span>
                </td>

                {/* Campo y Lote */}
                <td>
                  {showCampo && (
                    <span className="pill badgeGreen" style={{ fontSize: "10px", marginBottom: "3px", display: "inline-block" }}>
                      {activity.campo}
                    </span>
                  )}
                  <strong style={{ color: "var(--slate-900)", display: "block", fontSize: "13.5px" }}>
                    {activity.lote || "Lote Único"}
                  </strong>
                  {activity.superficieReal || activity.superficiePlanificada ? (
                    <small style={{ color: "var(--muted)" }}>
                      {activity.superficieReal ?? activity.superficiePlanificada} ha
                    </small>
                  ) : null}
                  {activity.esGrupal && (
                    <div className="groupBadge" title={activity.lotesAfectados?.join(", ")}>
                      👥 Bloque grupal
                    </div>
                  )}
                </td>

                {/* Cultivo & Labor */}
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span className={getTipoBadge(activity.tipo)}>{activity.tipo}</span>
                    <strong style={{ fontSize: "14px", color: "var(--slate-900)", marginTop: "2px" }}>
                      {activity.cultivo}
                    </strong>
                    {activity.cultivoAntecesor && (
                      <small style={{ color: "var(--slate-500)", fontStyle: "italic" }}>
                        Antecesor: {activity.cultivoAntecesor}
                      </small>
                    )}
                    {activity.metodoAplicacion && (
                      <small style={{ color: "var(--muted)" }}>Aplicación {activity.metodoAplicacion}</small>
                    )}
                  </div>
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

                {/* Estado */}
                <td>
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
          })}
        </tbody>
      </table>
    </div>
  );
}
