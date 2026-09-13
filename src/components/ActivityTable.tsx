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
            <th style={{ width: "180px" }}>{showCampo ? "Campo y Lote" : "Lote"}</th>
            <th style={{ width: "180px" }}>Cultivo y Labor</th>
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
                {/* Fecha */}
                <td>
                  <strong style={{ fontSize: "13.5px", color: "var(--slate-900)", display: "block" }}>
                    {formatHistoricalDate(fechaStr)}
                  </strong>
                  <small style={{ color: "var(--slate-500)", fontSize: "11.5px", marginTop: "3px", display: "block" }}>
                    Campaña {activity.campana}
                  </small>
                </td>

                {/* Campo y Lote integrados directamente con sus nombres */}
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

                {/* Cultivo y Labor integrados directamente */}
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
