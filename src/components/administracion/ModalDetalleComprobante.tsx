"use client";

import { useState } from "react";
import {
  ComprobanteGasto,
  UNIDADES_ECONOMICAS_HJB,
  TIPOS_EGRESO_INFO,
  anularComprobante,
} from "@/lib/administracionData";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  comprobante: ComprobanteGasto | null;
  onEditar: (comp: ComprobanteGasto) => void;
  onActualizado: () => void;
}

export default function ModalDetalleComprobante({
  isOpen,
  onClose,
  comprobante,
  onEditar,
  onActualizado,
}: Props) {
  const [modalAnulacionOpen, setModalAnulacionOpen] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [errorAnulacion, setErrorAnulacion] = useState<string | null>(null);

  if (!isOpen || !comprobante) return null;

  function handleConfirmarAnulacion() {
    if (!motivoAnulacion || motivoAnulacion.trim().length < 5) {
      setErrorAnulacion("Por favor ingrese un motivo de anulación claro de al menos 5 caracteres.");
      return;
    }
    const res = anularComprobante(comprobante!.id, "Operador HJB", motivoAnulacion);
    if (!res.success) {
      setErrorAnulacion(res.error || "Error al anular.");
      return;
    }
    setModalAnulacionOpen(false);
    setMotivoAnulacion("");
    setErrorAnulacion(null);
    onActualizado();
    onClose();
  }

  const egresoInfo = TIPOS_EGRESO_INFO[comprobante.tipoEgreso];

  return (
    <div className="modalBackdrop" style={{ zIndex: 1200 }}>
      <div
        className="modalCard"
        style={{
          maxWidth: "850px",
          width: "95vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Encabezado */}
        <div
          style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg, #0f172a, #1e293b)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px", fontWeight: 800 }}>
                {comprobante.tipoComprobante} {comprobante.letra} {comprobante.puntoVenta}-{comprobante.numeroComprobante}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background:
                    comprobante.estadoImputacion === "CONFIRMADO"
                      ? "#166534"
                      : comprobante.estadoImputacion === "IMPUTACION_PARCIAL"
                      ? "#854d0e"
                      : comprobante.estadoImputacion === "ANULADO"
                      ? "#991b1b"
                      : "#1e40af",
                  color: "white",
                }}
              >
                {comprobante.estadoImputacion}
              </span>
            </div>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              {comprobante.proveedorRazonSocial} (CUIT: {comprobante.proveedorCuit})
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Contenido */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Ficha Resumen */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid var(--line)" }}>
              <span style={{ fontSize: "11px", color: "var(--slate-500)", display: "block" }}>Fecha Comprobante</span>
              <strong style={{ fontSize: "14px" }}>{comprobante.fechaComprobante}</strong>
            </div>

            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid var(--line)" }}>
              <span style={{ fontSize: "11px", color: "var(--slate-500)", display: "block" }}>Campaña</span>
              <strong style={{ fontSize: "14px" }}>{comprobante.campana}</strong>
            </div>

            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid var(--line)" }}>
              <span style={{ fontSize: "11px", color: "var(--slate-500)", display: "block" }}>Tipo de Egreso</span>
              <span
                style={{
                  display: "inline-block",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  color: egresoInfo.badgeColor,
                  marginTop: "2px",
                }}
              >
                {egresoInfo.nombre}
              </span>
            </div>

            <div style={{ background: "#eff6ff", padding: "12px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
              <span style={{ fontSize: "11px", color: "#1d4ed8", display: "block", fontWeight: 700 }}>Total Comprobante</span>
              <strong style={{ fontSize: "18px", color: "#1d4ed8" }}>
                ${comprobante.totalComprobante.toLocaleString("es-AR")}
              </strong>
            </div>
          </div>

          {/* Desglose Impositivo */}
          <div style={{ background: "white", padding: "14px", borderRadius: "6px", border: "1px solid var(--line)" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--slate-700)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
              Desglose Impositivo
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", fontSize: "12px" }}>
              <div>Neto Gravado: <strong>${comprobante.netoGravado.toLocaleString("es-AR")}</strong></div>
              <div>IVA Total: <strong>${comprobante.ivaTotal.toLocaleString("es-AR")}</strong></div>
              <div>Percep. IIBB: <strong>${(comprobante.percepcionesIibb || 0).toLocaleString("es-AR")}</strong></div>
              <div>Percep. IVA: <strong>${(comprobante.percepcionesIva || 0).toLocaleString("es-AR")}</strong></div>
              <div>Otros Imp.: <strong>${(comprobante.otrosImpuestos || 0).toLocaleString("es-AR")}</strong></div>
            </div>
          </div>

          {/* Líneas de Imputación Económica */}
          <div style={{ background: "white", padding: "14px", borderRadius: "6px", border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--slate-700)", textTransform: "uppercase" }}>
                Líneas de Imputación Económica ({comprobante.porcentajeImputadoTotal}%)
              </span>
              {comprobante.porcentajeImputadoTotal < 100 && (
                <span style={{ fontSize: "11px", color: "#b45309", fontWeight: 700 }}>
                  ⚠️ Pendiente: ${(comprobante.diferenciaPendienteImporte || 0).toLocaleString("es-AR")} ({100 - comprobante.porcentajeImputadoTotal}%)
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {comprobante.imputaciones.map((imp, idx) => {
                const u = UNIDADES_ECONOMICAS_HJB[imp.destino];
                return (
                  <div
                    key={imp.id || idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      borderLeft: `4px solid ${u?.color || "#94a3b8"}`,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 800, color: u?.color }}>
                          {u?.nombre || imp.destino}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                          · {imp.actividad} {imp.establecimientoCampo ? `(${imp.establecimientoCampo})` : ""}
                        </span>
                      </div>
                      {imp.observacion && (
                        <div style={{ fontSize: "11px", color: "var(--slate-600)", marginTop: "2px" }}>
                          {imp.observacion}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "12px", fontWeight: 800 }}>
                        {imp.porcentaje}%
                      </span>
                      <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--slate-900)" }}>
                        ${imp.importeCalculado.toLocaleString("es-AR")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Información CAPEX (si aplica) */}
          {comprobante.datosCapex && (
            <div style={{ background: "#fffbeb", padding: "14px", borderRadius: "6px", border: "1px solid #fde68a" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#92400e", display: "block", marginBottom: "6px" }}>
                🚜 Bien de Uso / Activo Fijo (CAPEX)
              </span>
              <div style={{ fontSize: "12px", color: "#78350f", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <div>Descripción: <strong>{comprobante.datosCapex.descripcionActivo}</strong></div>
                <div>Categoría: <strong>{comprobante.datosCapex.categoriaActivo}</strong></div>
                <div>Vida Útil: <strong>{comprobante.datosCapex.vidaUtilAnos} años</strong></div>
                <div>Método: <strong>Lineal Anual</strong></div>
                <div style={{ gridColumn: "1 / -1", marginTop: "4px", fontSize: "11px" }}>
                  Criterio: {comprobante.datosCapex.criterioDistribucionAmortizacion}
                </div>
              </div>
            </div>
          )}

          {/* Historial de Auditoría & Trazabilidad */}
          <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "6px", border: "1px solid var(--line)" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--slate-700)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
              Historial de Auditoría & Trazabilidad
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px" }}>
              {comprobante.historialCambios?.map((h) => (
                <div key={h.id} style={{ display: "flex", gap: "8px", color: "var(--slate-600)" }}>
                  <span style={{ color: "var(--slate-400)", minWidth: "120px" }}>
                    {new Date(h.fechaIso).toLocaleString("es-AR")}
                  </span>
                  <strong style={{ color: "var(--slate-700)" }}>{h.usuario}:</strong>
                  <span>{h.descripcion}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer con Acciones */}
        <div
          style={{
            padding: "14px 20px",
            background: "#f8fafc",
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            {comprobante.estadoImputacion !== "ANULADO" && (
              <button
                type="button"
                onClick={() => setModalAnulacionOpen(true)}
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "6px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                🚫 Anular Comprobante
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                background: "white",
                color: "var(--slate-700)",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Cerrar
            </button>
            {comprobante.estadoImputacion !== "ANULADO" && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditar(comprobante);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                ✏️ Editar / Modificar Imputación
              </button>
            )}
          </div>
        </div>

        {/* Submodal de confirmación de anulación */}
        {modalAnulacionOpen && (
          <div className="modalBackdrop" style={{ zIndex: 1300 }}>
            <div className="modalCard" style={{ maxWidth: "460px", padding: "20px" }}>
              <h4 style={{ margin: "0 0 10px", color: "#dc2626" }}>Confirmar Anulación de Comprobante</h4>
              <p style={{ fontSize: "13px", color: "var(--slate-600)", margin: "0 0 12px" }}>
                Esta acción es irreversible y quedará registrada en el historial de auditoría con su usuario y fecha.
              </p>

              {errorAnulacion && (
                <div style={{ background: "#fef2f2", padding: "8px", borderRadius: "4px", color: "#dc2626", fontSize: "12px", marginBottom: "10px" }}>
                  {errorAnulacion}
                </div>
              )}

              <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                Motivo de anulación (Obligatorio para auditoría):
              </label>
              <textarea
                rows={3}
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                placeholder="Ej: Factura anulada por emisión de nota de crédito / error de carga del proveedor..."
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setModalAnulacionOpen(false)}
                  style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--line)", background: "white" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarAnulacion}
                  style={{ padding: "6px 14px", borderRadius: "6px", border: "none", background: "#dc2626", color: "white", fontWeight: 700 }}
                >
                  Confirmar Anulación
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
