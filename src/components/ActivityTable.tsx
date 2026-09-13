"use client";

import { Activity, plannedQuantity, realQuantity } from "@/lib/agricultureData";

function fmtDate(value?: string) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

export default function ActivityTable({
  activities,
  onEdit,
}: {
  activities: Activity[];
  onEdit?: (activity: Activity) => void;
}) {
  if (!activities.length) {
    return <div className="emptyState">Todavía no hay actividades cargadas.</div>;
  }

  return (
    <div className="tableWrap">
      <table className="dataTable">
        <thead>
          <tr>
            <th>Actividad</th>
            <th>Plan</th>
            <th>Real</th>
            <th>Insumos</th>
            <th>Estado</th>
            {onEdit && <th></th>}
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr key={activity.id}>
              <td>
                <strong>{activity.tipo}</strong>
                <small>{activity.campo} · {activity.cultivo}</small>
              </td>
              <td>
                <strong>{fmtDate(activity.fechaPlanificada)}</strong>
                <small>{activity.superficiePlanificada ?? "—"} ha</small>
              </td>
              <td>
                <strong>{fmtDate(activity.fechaReal)}</strong>
                <small>{activity.superficieReal ?? "—"} ha</small>
              </td>
              <td>
                {activity.insumos.length ? activity.insumos.map((input) => {
                  const p = plannedQuantity(activity, input);
                  const r = realQuantity(activity, input);
                  return (
                    <div className="inputSummary" key={input.id}>
                      <strong>{input.producto}</strong>
                      <small>
                        Plan {p === null ? "—" : `${p.toLocaleString("es-AR")} kg`}
                        {activity.estado === "Realizada" ? ` · Real ${r === null ? "—" : `${r.toLocaleString("es-AR")} kg`}` : ""}
                      </small>
                    </div>
                  );
                }) : <span className="muted">Sin insumos</span>}
              </td>
              <td>
                <span className={
                  activity.estado === "Realizada" ? "status good" :
                  activity.estado === "Cancelada" ? "status neutral" :
                  "status warn"
                }>
                  {activity.estado}
                </span>
              </td>
              {onEdit && (
                <td className="alignRight">
                  <button className="tableAction" onClick={() => onEdit(activity)}>Editar</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
