"use client";

import { VentaGordoExpediente, getEstadoDocumentacion } from "@/lib/ventasGordosData";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ventas: VentaGordoExpediente[];
  onSeleccionarVenta: (venta: VentaGordoExpediente) => void;
}

export default function ModalHistoricoComparativo({
  isOpen,
  onClose,
  ventas,
  onSeleccionarVenta,
}: Props) {
  if (!isOpen) return null;

  // Filtrar solo las que están en estado DEFINITIVO y no eliminadas
  const definitivas = ventas.filter((v) => v.estado === "DEFINITIVO" && !v.eliminadoLogico);

  // Estadísticas consolidadas de rendimiento
  const totalCabezas = definitivas.reduce((acc, v) => acc + (v.cantidadReal || v.cantidadEstimada || 0), 0);
  const totalIngresoReal = definitivas.reduce((acc, v) => acc + (v.liquidacionReal?.ingresoBrutoRealArs || 0), 0);
  const totalMargenReal = definitivas.reduce((acc, v) => acc + (v.liquidacionReal?.margenOperativoRealArs || 0), 0);
  const promedioRendimientoPct =
    definitivas.length > 0
      ? Number(
          (
            definitivas.reduce((acc, v) => acc + (v.liquidacionReal?.rendimientoRealPct || 0), 0) /
            definitivas.length
          ).toFixed(2)
        )
      : 0;

  const promedioMargenPorAnimal =
    totalCabezas > 0 ? Number((totalMargenReal / totalCabezas).toFixed(2)) : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "1400px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "24px" }}>📊</span>
              <h2 style={{ fontSize: "19px", fontWeight: 800, margin: 0 }}>
                Histórico Consolidado de Ventas Definitivas
              </h2>
              <span
                style={{
                  background: "rgba(34, 197, 94, 0.25)",
                  color: "#86efac",
                  border: "1px solid rgba(34, 197, 94, 0.5)",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                {definitivas.length} OPERACIONES CERRADAS
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#94a3b8" }}>
              Vista analítica transversal de liquidaciones reales para evaluar precisión y rentabilidad histórica.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#ffffff",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Resumen Superior */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "14px",
            padding: "16px 24px",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>TOTAL CABEZAS LIQUIDADAS</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>{totalCabezas} novillos</div>
          </div>
          <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>FACTURACIÓN TOTAL REAL</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#166534" }}>${totalIngresoReal.toLocaleString("es-AR")}</div>
          </div>
          <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>MARGEN OPERATIVO TOTAL</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#15803d" }}>${totalMargenReal.toLocaleString("es-AR")}</div>
          </div>
          <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>RENDIMIENTO GANCHO PROMEDIO</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#2563eb" }}>{promedioRendimientoPct}%</div>
            <div style={{ fontSize: "10.5px", color: "#64748b" }}>Margen: ${promedioMargenPorAnimal.toLocaleString("es-AR")}/cab</div>
          </div>
        </div>

        {/* Tabla Detallada con Scroll Horizontal */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
          {definitivas.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              No hay ventas en estado Definitivo para mostrar.
            </div>
          ) : (
            <div className="tableWrap" style={{ border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <table className="dataTable" style={{ minWidth: "1600px", fontSize: "12px" }}>
                <thead>
                  <tr>
                    <th>N° Venta</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Cabezas</th>
                    <th>Peso Campo</th>
                    <th>Prom.</th>
                    <th>Método</th>
                    <th>% Desbaste</th>
                    <th>Peso Frigo</th>
                    <th>% Rend.</th>
                    <th>Kg Res</th>
                    <th style={{ textAlign: "right" }}>Ingreso Proy.</th>
                    <th style={{ textAlign: "right" }}>Ingreso Real</th>
                    <th style={{ textAlign: "right" }}>Diferencia $</th>
                    <th style={{ textAlign: "right" }}>Costo Total</th>
                    <th style={{ textAlign: "right" }}>Margen Real</th>
                    <th style={{ textAlign: "right" }}>Margen/Cab</th>
                    <th>Rentab. %</th>
                    <th>Docs</th>
                    <th>Cierre Por</th>
                    <th style={{ textAlign: "center" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {definitivas.map((v) => {
                    const liq = v.liquidacionReal;
                    const docSt = getEstadoDocumentacion(v.documentos || []);
                    const proyIngreso =
                      v.metodoElegido === "RENDIMIENTO"
                        ? v.proyeccion.altRendimiento.ingresoBrutoEstimadoArs
                        : v.proyeccion.altKiloVivo.ingresoBrutoEstimadoArs;

                    return (
                      <tr
                        key={v.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          onSeleccionarVenta(v);
                          onClose();
                        }}
                      >
                        <td>
                          <strong style={{ color: "#2563eb" }}>Venta N° {v.numeroVenta}</strong>
                        </td>
                        <td>{v.fechaReal || v.fechaEstimada}</td>
                        <td><strong>{v.clienteNombre}</strong></td>
                        <td>{v.cantidadReal || v.cantidadEstimada}</td>
                        <td>{(v.pesoCampoRealKg || v.pesoCampoEstimadoKg).toLocaleString("es-AR")} kg</td>
                        <td>
                          {(
                            (v.pesoCampoRealKg || v.pesoCampoEstimadoKg) /
                            (v.cantidadReal || v.cantidadEstimada || 1)
                          ).toFixed(1)}{" "}
                          kg
                        </td>
                        <td>
                          <span className={`pill ${v.metodoElegido === "RENDIMIENTO" ? "badgeGreen" : "badgeBlue"}`} style={{ fontSize: "10.5px" }}>
                            {v.metodoElegido === "RENDIMIENTO" ? "Rendimiento" : "Kilo Vivo"}
                          </span>
                        </td>
                        <td>{liq?.desbasteRealPct ?? "-"}%</td>
                        <td>{liq?.pesoFrigorificoRealKg?.toLocaleString("es-AR") ?? "-"} kg</td>
                        <td><strong>{liq?.rendimientoRealPct ?? "-"}%</strong></td>
                        <td><strong>{liq?.kgResReales?.toLocaleString("es-AR") ?? "-"} kg</strong></td>
                        <td style={{ textAlign: "right" }}>${proyIngreso.toLocaleString("es-AR")}</td>
                        <td style={{ textAlign: "right", color: "#166534", fontWeight: 700 }}>
                          ${liq?.ingresoBrutoRealArs?.toLocaleString("es-AR")}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color: (liq?.desvioIngresoBrutoArs || 0) >= 0 ? "#166534" : "#dc2626",
                          }}
                        >
                          {(liq?.desvioIngresoBrutoArs || 0) >= 0 ? "+" : ""}
                          ${liq?.desvioIngresoBrutoArs?.toLocaleString("es-AR")}
                        </td>
                        <td style={{ textAlign: "right" }}>${liq?.costoTotalRealArs?.toLocaleString("es-AR")}</td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "#15803d" }}>
                          ${liq?.margenOperativoRealArs?.toLocaleString("es-AR")}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          ${liq?.margenRealPorAnimalArs?.toLocaleString("es-AR")}
                        </td>
                        <td><strong>{liq?.margenRealSobreVentasPct}%</strong></td>
                        <td>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: docSt.color }}>
                            {docSt.estado === "completa" ? "✓ Sí" : "Parcial"}
                          </span>
                        </td>
                        <td>{v.auditoria.cerradoPor || "N/A"}</td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="ghostButton"
                            style={{ fontSize: "11px", padding: "3px 8px" }}
                          >
                            Abrir ↗
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            backgroundColor: "#f8fafc",
          }}
        >
          <button
            type="button"
            className="ghostButton"
            onClick={onClose}
            style={{ padding: "8px 16px", fontSize: "12.5px" }}
          >
            Cerrar Histórico
          </button>
        </div>
      </div>
    </div>
  );
}
