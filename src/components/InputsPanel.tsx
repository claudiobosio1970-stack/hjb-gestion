"use client";

import { Activity, plannedQuantity, realQuantity } from "@/lib/agricultureData";

export default function InputsPanel({ activities }: { activities: Activity[] }) {
  const rows = new Map<string, { plan: number; real: number; actividades: number }>();

  for (const activity of activities) {
    for (const input of activity.insumos) {
      const current = rows.get(input.producto) ?? { plan: 0, real: 0, actividades: 0 };
      current.plan += plannedQuantity(activity, input) ?? 0;
      current.real += realQuantity(activity, input) ?? 0;
      current.actividades += 1;
      rows.set(input.producto, current);
    }
  }

  const data = [...rows.entries()].map(([producto, values]) => ({ producto, ...values }));

  if (!data.length) {
    return <div className="emptyState">Los insumos aparecerán automáticamente cuando se carguen actividades que los utilicen.</div>;
  }

  return (
    <div className="tableWrap">
      <table className="dataTable">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Actividades</th>
            <th>Cantidad planificada</th>
            <th>Cantidad real</th>
            <th>Diferencia</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.producto}>
              <td><strong>{row.producto}</strong></td>
              <td>{row.actividades}</td>
              <td>{row.plan.toLocaleString("es-AR")} kg</td>
              <td>{row.real ? `${row.real.toLocaleString("es-AR")} kg` : "—"}</td>
              <td>{row.real ? `${(row.real - row.plan).toLocaleString("es-AR")} kg` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
