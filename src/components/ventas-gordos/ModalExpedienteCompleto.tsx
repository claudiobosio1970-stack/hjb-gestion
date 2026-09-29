"use client";

import { useState } from "react";
import {
  VentaGordoExpediente,
  pasarVentaATemporal,
  adjuntarDocumentoVenta,
  eliminarVentaGordoLogico,
  getEstadoDocumentacion,
  TipoDocumentoVenta,
  MetodoVentaGordo,
} from "@/lib/ventasGordosData";

interface Props {
  isOpen: boolean;
  venta: VentaGordoExpediente;
  onClose: () => void;
  onVentaActualizada: (venta: VentaGordoExpediente) => void;
  onAbrirCierreDefinitivo: (venta: VentaGordoExpediente) => void;
  onEditarVenta?: (venta: VentaGordoExpediente) => void;
  usuarioActual: string;
}

export default function ModalExpedienteCompleto({
  isOpen,
  venta,
  onClose,
  onVentaActualizada,
  onAbrirCierreDefinitivo,
  onEditarVenta,
  usuarioActual,
}: Props) {

  // Formulario de Adjuntar Documento
  const [modalAdjuntarOpen, setModalAdjuntarOpen] = useState(false);
  const [tipoDocNuevo, setTipoDocNuevo] = useState<TipoDocumentoVenta>("DTE_GUIA");
  const [numeroIdNuevo, setNumeroIdNuevo] = useState("");
  const [observacionesDoc, setObservacionesDoc] = useState("");
  const [archivoBase64, setArchivoBase64] = useState<string>("");
  const [nombreArchivo, setNombreArchivo] = useState("");

  // Modal de Eliminación Lógica
  const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
  const [motivoEliminacion, setMotivoEliminacion] = useState("");

  const docStatus = getEstadoDocumentacion(venta.documentos || []);

  const badgeEstadoStyle: Record<string, { bg: string; text: string; label: string }> = {
    PROYECCION: { bg: "#eff6ff", text: "#1d4ed8", label: "PROYECCIÓN" },
    TEMPORAL: { bg: "#fef3c7", text: "#b45309", label: "TEMPORAL" },
    DEFINITIVO: { bg: "#f0fdf4", text: "#15803d", label: "DEFINITIVO" },
    CANCELADO: { bg: "#f1f5f9", text: "#64748b", label: "CANCELADO" },
  };

  const st = badgeEstadoStyle[venta.estado] || badgeEstadoStyle.PROYECCION;

  // Manejador de Pase a Temporal rápido desde el expediente
  function handlePasarATemporal(metodo: MetodoVentaGordo) {
    if (!confirm(`¿Confirma pasar la Venta N° ${venta.numeroVenta} al estado TEMPORAL con método ${metodo === "RENDIMIENTO" ? "A Rendimiento" : "Por Kilo Vivo"}?`)) {
      return;
    }
    const updated = pasarVentaATemporal({
      ventaId: venta.id,
      metodoElegido: metodo,
      usuario: usuarioActual || "Operador",
    });
    onVentaActualizada(updated);
  }

  // Manejador de Adjuntar Documento
  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNombreArchivo(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setArchivoBase64(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  }

  function handleGuardarDocumento() {
    if (!nombreArchivo && !numeroIdNuevo) {
      alert("Por favor ingrese un número identificador o suba un archivo.");
      return;
    }

    const updated = adjuntarDocumentoVenta({
      ventaId: venta.id,
      tipo: tipoDocNuevo,
      numeroIdentificador: numeroIdNuevo.trim(),
      nombreArchivo: nombreArchivo || `Documento_${tipoDocNuevo}.pdf`,
      archivoUrl: archivoBase64,
      observaciones: observacionesDoc.trim(),
      usuario: usuarioActual || "Operador",
    });

    onVentaActualizada(updated);
    setModalAdjuntarOpen(false);
    setNumeroIdNuevo("");
    setObservacionesDoc("");
    setNombreArchivo("");
    setArchivoBase64("");
  }

  // Manejador de Eliminación Lógica
  function handleEliminarConfirmado() {
    if (!motivoEliminacion.trim()) {
      alert("Debe especificar un motivo para la baja lógica de la venta.");
      return;
    }
    eliminarVentaGordoLogico({
      ventaId: venta.id,
      motivo: motivoEliminacion.trim(),
      usuario: usuarioActual || "Operador",
    });
    setModalEliminarOpen(false);
    onClose();
  }

  if (!isOpen) return null;

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
          maxWidth: "1280px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
      >
        {/* Encabezado 360° */}
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
              <span style={{ fontSize: "24px" }}>📁</span>
              <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>
                Expediente: Venta N° {venta.numeroVenta}
              </h2>
              <span
                style={{
                  background: st.bg,
                  color: st.text,
                  padding: "3px 10px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                }}
              >
                {st.label}
              </span>
              <span
                style={{
                  backgroundColor: docStatus.color,
                  color: "#ffffff",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                }}
              >
                Docs: {docStatus.label}
              </span>
            </div>

            <div style={{ display: "flex", gap: "16px", marginTop: "6px", fontSize: "12.5px", color: "#cbd5e1" }}>
              <span>🏢 <strong>Cliente:</strong> {venta.clienteNombre}</span>
              <span>📅 <strong>Fecha:</strong> {venta.fechaReal || venta.fechaEstimada}</span>
              <span>🐂 <strong>Cantidad:</strong> {venta.cantidadReal || venta.cantidadEstimada} novillos</span>
              <span>
                🎯 <strong>Método:</strong>{" "}
                {venta.metodoElegido ? (venta.metodoElegido === "RENDIMIENTO" ? "A Rendimiento" : "Por Kilo Vivo") : "En evaluación"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {onEditarVenta && (
              <button
                type="button"
                onClick={() => {
                  onEditarVenta(venta);
                }}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
                title="Editar y rectificar datos de la venta"
              >
                ✏️ Editar Venta
              </button>
            )}
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cuerpo del Expediente (Resumen Ejecutivo) */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1, backgroundColor: "#ffffff" }}>
          {/* RESUMEN EJECUTIVO */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Tarjetas de Métricas */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>CANTIDAD DE ANIMALES</div>
                  <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                    {venta.cantidadReal || venta.cantidadEstimada} <span style={{ fontSize: "14px", fontWeight: 600 }}>cab.</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                    Peso: {(venta.pesoCampoRealKg || venta.pesoCampoEstimadoKg).toLocaleString("es-AR")} kg
                  </div>
                </div>

                <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>
                    {venta.estado === "DEFINITIVO" ? "FACTURACIÓN REAL" : "INGRESO ESTIMADO"}
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 800, color: "#166534", marginTop: "4px" }}>
                    $
                    {(
                      venta.liquidacionReal?.ingresoBrutoRealArs ||
                      (venta.metodoElegido === "RENDIMIENTO"
                        ? venta.proyeccion.altRendimiento.ingresoBrutoEstimadoArs
                        : venta.proyeccion.altKiloVivo.ingresoBrutoEstimadoArs)
                    ).toLocaleString("es-AR")}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                    Sin IVA / Bruto comercial
                  </div>
                </div>

                <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>COSTO TOTAL CONSIDERADO</div>
                  <div style={{ fontSize: "24px", fontWeight: 800, color: "#475569", marginTop: "4px" }}>
                    $
                    {(
                      venta.liquidacionReal?.costoTotalRealArs ||
                      (venta.metodoElegido === "RENDIMIENTO"
                        ? venta.proyeccion.altRendimiento.costoTotalConsideradoArs
                        : venta.proyeccion.altKiloVivo.costoTotalConsideradoArs)
                    ).toLocaleString("es-AR")}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                    Base: {venta.periodoCosto} (+5% indirecto)
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#f0fdf4",
                    padding: "16px",
                    borderRadius: "10px",
                    border: "1.5px solid #86efac",
                  }}
                >
                  <div style={{ fontSize: "11.5px", color: "#166534", fontWeight: 700 }}>
                    {venta.estado === "DEFINITIVO" ? "MARGEN REAL DEFINITIVO" : "MARGEN ESTIMADO"}
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 800, color: "#15803d", marginTop: "4px" }}>
                    $
                    {(
                      venta.liquidacionReal?.margenOperativoRealArs ||
                      (venta.metodoElegido === "RENDIMIENTO"
                        ? venta.proyeccion.altRendimiento.margenOperativoEstimadoArs
                        : venta.proyeccion.altKiloVivo.margenOperativoEstimadoArs)
                    ).toLocaleString("es-AR")}
                  </div>
                  <div style={{ fontSize: "11px", color: "#166534", marginTop: "4px", fontWeight: 600 }}>
                    $
                    {(
                      venta.liquidacionReal?.margenRealPorAnimalArs ||
                      (venta.metodoElegido === "RENDIMIENTO"
                        ? venta.proyeccion.altRendimiento.margenPorAnimalArs
                        : venta.proyeccion.altKiloVivo.margenPorAnimalArs)
                    ).toLocaleString("es-AR")}{" "}
                    / cab. (
                    {venta.liquidacionReal?.margenRealSobreVentasPct ||
                      (venta.metodoElegido === "RENDIMIENTO"
                        ? venta.proyeccion.altRendimiento.margenSobreVentasPct
                        : venta.proyeccion.altKiloVivo.margenSobreVentasPct)}
                    % s/ venta)
                  </div>
                </div>
              </div>

              {/* Ficha General de la Operación */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ backgroundColor: "#f8fafc", padding: "10px 16px", fontWeight: 700, fontSize: "13px", borderBottom: "1px solid #e2e8f0" }}>
                  Información General del Expediente
                </div>
                <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", fontSize: "13px" }}>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11.5px", display: "block" }}>Cliente / Comprador:</span>
                    <strong>{venta.clienteNombre}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11.5px", display: "block" }}>Frigorífico Destino:</span>
                    <strong>{venta.frigorificoDestino}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11.5px", display: "block" }}>Fecha Estimada / Real:</span>
                    <strong>{venta.fechaReal || venta.fechaEstimada}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11.5px", display: "block" }}>Método Comercial Elegido:</span>
                    <strong style={{ color: "#2563eb" }}>
                      {venta.metodoElegido === "RENDIMIENTO" ? "A Rendimiento (al gancho)" : "Por Kilo Vivo"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11.5px", display: "block" }}>Período de Costo Aplicado:</span>
                    <strong>{venta.periodoCosto} (${venta.costoDirectoUnitarioAplicado.toLocaleString("es-AR")}/cab)</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11.5px", display: "block" }}>Estado de la Documentación:</span>
                    <strong style={{ color: docStatus.color }}>{docStatus.label}</strong>
                  </div>
                </div>
                {venta.observaciones && (
                  <div style={{ padding: "0 16px 16px 16px", fontSize: "12.5px", color: "#475569" }}>
                    <span style={{ color: "#64748b", fontSize: "11.5px", display: "block" }}>Observaciones:</span>
                    {venta.observaciones}
                  </div>
                )}
              </div>
            </div>
        </div>

        {/* Footer del Modal con Acciones de Estado */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f8fafc",
          }}
        >
          <div>
            <button
              type="button"
              onClick={() => setModalEliminarOpen(true)}
              style={{
                background: "none",
                border: "none",
                color: "#dc2626",
                fontSize: "12px",
                cursor: "pointer",
                padding: "6px 8px",
              }}
            >
              🗑️ Dar de baja esta venta (Lógica)
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {venta.estado === "PROYECCION" && (
              <>
                <button
                  type="button"
                  onClick={() => handlePasarATemporal("RENDIMIENTO")}
                  className="primaryButton"
                  style={{ fontSize: "12.5px", padding: "8px 14px", background: "#16a34a" }}
                >
                  ✓ Pasar a Temporal (A Rendimiento)
                </button>
                <button
                  type="button"
                  onClick={() => handlePasarATemporal("KILO_VIVO")}
                  className="primaryButton"
                  style={{ fontSize: "12.5px", padding: "8px 14px", background: "#2563eb" }}
                >
                  ✓ Pasar a Temporal (Kilo Vivo)
                </button>
              </>
            )}

            {venta.estado === "TEMPORAL" && (
              <button
                type="button"
                onClick={() => onAbrirCierreDefinitivo(venta)}
                className="primaryButton"
                style={{ fontSize: "13px", padding: "8px 18px", background: "#16a34a" }}
              >
                🏁 Cerrar Venta / Pasar a DEFINITIVO
              </button>
            )}

            <button
              type="button"
              className="ghostButton"
              onClick={onClose}
              style={{ padding: "8px 16px", fontSize: "12.5px" }}
            >
              Cerrar Expediente
            </button>
          </div>
        </div>
      </div>

      {/* Modal Adjuntar Documento */}
      {modalAdjuntarOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "500px",
              padding: "20px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 12px 0", color: "#0f172a" }}>
              📎 Adjuntar Documento a Venta N° {venta.numeroVenta}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Tipo de Documento</label>
                <select
                  value={tipoDocNuevo}
                  onChange={(e) => setTipoDocNuevo(e.target.value as TipoDocumentoVenta)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  <option value="DTE_GUIA">Guía / DT-e de Tránsito</option>
                  <option value="ROMANEO">Romaneo Frigorífico</option>
                  <option value="FACTURA_LIQUIDACION">Factura / Liquidación</option>
                  <option value="OTRO">Otro Comprobante</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Número Identificador</label>
                <input
                  type="text"
                  placeholder="ej: DT-e 032417213-0 / Factura 0001-00045"
                  value={numeroIdNuevo}
                  onChange={(e) => setNumeroIdNuevo(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Seleccionar Archivo (PDF o Foto)</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileSelected}
                  style={{ width: "100%", padding: "6px 0", fontSize: "12px" }}
                />
                {nombreArchivo && <span style={{ fontSize: "11.5px", color: "#166534" }}>✓ {nombreArchivo}</span>}
              </div>

              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Observaciones</label>
                <input
                  type="text"
                  placeholder="Aclaración opcional..."
                  value={observacionesDoc}
                  onChange={(e) => setObservacionesDoc(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="ghostButton"
                  onClick={() => setModalAdjuntarOpen(false)}
                  style={{ fontSize: "12px" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primaryButton"
                  onClick={handleGuardarDocumento}
                  style={{ fontSize: "12.5px" }}
                >
                  Guardar Documento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminación Lógica */}
      {modalEliminarOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            zIndex: 10001,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "460px",
              padding: "20px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 8px 0", color: "#dc2626" }}>
              ⚠️ Confirmar Baja de la Venta N° {venta.numeroVenta}
            </h3>
            <p style={{ margin: "0 0 12px 0", fontSize: "12.5px", color: "#475569" }}>
              Se aplicará una <strong>eliminación lógica</strong>. La operación dejará de figurar en el listado activo pero permanecerá en los registros de auditoría de HJB Gestión.
            </p>

            <div>
              <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Motivo de la baja *</label>
              <textarea
                rows={2}
                placeholder="ej: Operación cancelada por el comprador / Error de tipeo..."
                value={motivoEliminacion}
                onChange={(e) => setMotivoEliminacion(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", resize: "none" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}>
              <button
                type="button"
                className="ghostButton"
                onClick={() => setModalEliminarOpen(false)}
                style={{ fontSize: "12px" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEliminarConfirmado}
                style={{
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  padding: "7px 14px",
                  borderRadius: "6px",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Confirmar Baja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
