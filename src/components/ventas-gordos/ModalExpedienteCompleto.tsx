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
  usuarioActual: string;
}

export default function ModalExpedienteCompleto({
  isOpen,
  venta,
  onClose,
  onVentaActualizada,
  onAbrirCierreDefinitivo,
  usuarioActual,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "resumen" | "proyeccion" | "reales" | "desvios" | "documentos" | "cronologia"
  >("resumen");

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

        {/* Barra de Pestañas */}
        <div
          style={{
            display: "flex",
            gap: "2px",
            padding: "0 24px",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("resumen")}
            style={{
              padding: "12px 16px",
              fontSize: "13px",
              fontWeight: 700,
              background: "none",
              border: "none",
              borderBottom: activeTab === "resumen" ? "3px solid #2563eb" : "3px solid transparent",
              color: activeTab === "resumen" ? "#2563eb" : "#64748b",
              cursor: "pointer",
            }}
          >
            📊 Resumen Ejecutivo
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("proyeccion")}
            style={{
              padding: "12px 16px",
              fontSize: "13px",
              fontWeight: 700,
              background: "none",
              border: "none",
              borderBottom: activeTab === "proyeccion" ? "3px solid #2563eb" : "3px solid transparent",
              color: activeTab === "proyeccion" ? "#2563eb" : "#64748b",
              cursor: "pointer",
            }}
          >
            ⚖️ Proyección & Alternativas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reales")}
            style={{
              padding: "12px 16px",
              fontSize: "13px",
              fontWeight: 700,
              background: "none",
              border: "none",
              borderBottom: activeTab === "reales" ? "3px solid #2563eb" : "3px solid transparent",
              color: activeTab === "reales" ? "#2563eb" : "#64748b",
              cursor: "pointer",
            }}
          >
            🥩 Datos Reales Frigorífico {venta.liquidacionReal ? "✓" : ""}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("desvios")}
            style={{
              padding: "12px 16px",
              fontSize: "13px",
              fontWeight: 700,
              background: "none",
              border: "none",
              borderBottom: activeTab === "desvios" ? "3px solid #2563eb" : "3px solid transparent",
              color: activeTab === "desvios" ? "#2563eb" : "#64748b",
              cursor: "pointer",
            }}
          >
            📈 Proyectado vs. Real
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("documentos")}
            style={{
              padding: "12px 16px",
              fontSize: "13px",
              fontWeight: 700,
              background: "none",
              border: "none",
              borderBottom: activeTab === "documentos" ? "3px solid #2563eb" : "3px solid transparent",
              color: activeTab === "documentos" ? "#2563eb" : "#64748b",
              cursor: "pointer",
            }}
          >
            📄 Documentos ({venta.documentos?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cronologia")}
            style={{
              padding: "12px 16px",
              fontSize: "13px",
              fontWeight: 700,
              background: "none",
              border: "none",
              borderBottom: activeTab === "cronologia" ? "3px solid #2563eb" : "3px solid transparent",
              color: activeTab === "cronologia" ? "#2563eb" : "#64748b",
              cursor: "pointer",
            }}
          >
            📜 Cronología & Auditoría ({venta.cronologia?.length || 0})
          </button>
        </div>

        {/* Cuerpo del Tab Seleccionado */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1, backgroundColor: "#ffffff" }}>
          {/* TAB 1: RESUMEN EJECUTIVO */}
          {activeTab === "resumen" && (
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
          )}

          {/* TAB 2: PROYECCIÓN Y ALTERNATIVAS */}
          {activeTab === "proyeccion" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Alt A */}
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", backgroundColor: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <h4 style={{ margin: 0, fontSize: "14px", color: "#2563eb" }}>Alternativa A: Kilo Vivo</h4>
                    {venta.metodoElegido === "KILO_VIVO" && (
                      <span className="pill badgeBlue" style={{ fontSize: "10px" }}>SELECCIONADA</span>
                    )}
                  </div>
                  <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 0", color: "#64748b" }}>Precio Ofrecido:</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>${venta.proyeccion.altKiloVivo.precioKgVivoArs}/kg vivo</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 0", color: "#64748b" }}>% Desbaste Estimado:</td>
                        <td style={{ textAlign: "right" }}>{venta.proyeccion.altKiloVivo.desbasteEstimadoPct}% ({venta.proyeccion.altKiloVivo.kgDesbasteDescontados} kg)</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 0", color: "#64748b" }}>Peso Neto Liquidable:</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{venta.proyeccion.altKiloVivo.pesoNetoLiquidableKg.toLocaleString("es-AR")} kg</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 0", color: "#64748b" }}>Ingreso Bruto Estimado:</td>
                        <td style={{ textAlign: "right", color: "#166534", fontWeight: 700 }}>${venta.proyeccion.altKiloVivo.ingresoBrutoEstimadoArs.toLocaleString("es-AR")}</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 0", color: "#64748b" }}>Costo Total del Lote:</td>
                        <td style={{ textAlign: "right" }}>${venta.proyeccion.altKiloVivo.costoTotalConsideradoArs.toLocaleString("es-AR")}</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 0", fontWeight: 700 }}>Margen Operativo:</td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "#166534" }}>${venta.proyeccion.altKiloVivo.margenOperativoEstimadoArs.toLocaleString("es-AR")}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "6px 0", color: "#64748b" }}>Margen / Animal:</td>
                        <td style={{ textAlign: "right" }}>${venta.proyeccion.altKiloVivo.margenPorAnimalArs.toLocaleString("es-AR")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Alt B */}
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", backgroundColor: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <h4 style={{ margin: 0, fontSize: "14px", color: "#16a34a" }}>Alternativa B: A Rendimiento</h4>
                    {venta.metodoElegido === "RENDIMIENTO" && (
                      <span className="pill badgeGreen" style={{ fontSize: "10px" }}>SELECCIONADA</span>
                    )}
                  </div>
                  <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 0", color: "#64748b" }}>Precio $/kg de Res:</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>${venta.proyeccion.altRendimiento.precioKgResArs}/kg res</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 0", color: "#64748b" }}>% Desbaste Traslado:</td>
                        <td style={{ textAlign: "right" }}>{venta.proyeccion.altRendimiento.desbasteTrasladoPct}% ({venta.proyeccion.altRendimiento.pesoFrigorificoEstimadoKg.toLocaleString("es-AR")} kg frigo)</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 0", color: "#64748b" }}>% Rendimiento Estimado:</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{venta.proyeccion.altRendimiento.rendimientoEstimadoPct}% ({venta.proyeccion.altRendimiento.kgResEstimados.toLocaleString("es-AR")} kg res)</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 0", color: "#64748b" }}>Ingreso Bruto Estimado:</td>
                        <td style={{ textAlign: "right", color: "#166534", fontWeight: 700 }}>${venta.proyeccion.altRendimiento.ingresoBrutoEstimadoArs.toLocaleString("es-AR")}</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 0", color: "#64748b" }}>Costo Total del Lote:</td>
                        <td style={{ textAlign: "right" }}>${venta.proyeccion.altRendimiento.costoTotalConsideradoArs.toLocaleString("es-AR")}</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 0", fontWeight: 700 }}>Margen Operativo:</td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "#166534" }}>${venta.proyeccion.altRendimiento.margenOperativoEstimadoArs.toLocaleString("es-AR")}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "6px 0", color: "#64748b" }}>Margen / Animal:</td>
                        <td style={{ textAlign: "right" }}>${venta.proyeccion.altRendimiento.margenPorAnimalArs.toLocaleString("es-AR")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DATOS REALES DE FRIGORÍFICO */}
          {activeTab === "reales" && (
            <div>
              {venta.liquidacionReal ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                    <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#0f172a" }}>Faena & Balanza Frigorífico</h4>
                    <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                      <tbody>
                        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 0", color: "#64748b" }}>Fecha de Faena:</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{venta.liquidacionReal.fechaFaena}</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 0", color: "#64748b" }}>Cabezas Reales:</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{venta.cantidadReal} cabezas</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 0", color: "#64748b" }}>Peso Campo Real:</td>
                          <td style={{ textAlign: "right" }}>{venta.liquidacionReal.pesoCampoRealKg.toLocaleString("es-AR")} kg</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 0", color: "#64748b" }}>Peso Vivo Frigorífico:</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{venta.liquidacionReal.pesoFrigorificoRealKg.toLocaleString("es-AR")} kg</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 0", color: "#64748b" }}>Desbaste Real (%):</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{venta.liquidacionReal.desbasteRealPct}%</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 0", color: "#64748b" }}>Kg Res Obtenidos:</td>
                          <td style={{ textAlign: "right", fontWeight: 800, color: "#15803d" }}>{venta.liquidacionReal.kgResReales.toLocaleString("es-AR")} kg</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "8px 0", color: "#64748b" }}>Rendimiento al Gancho Real:</td>
                          <td style={{ textAlign: "right", fontWeight: 800, color: "#166534" }}>{venta.liquidacionReal.rendimientoRealPct}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", backgroundColor: "#f0fdf4" }}>
                    <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#14532d" }}>Liquidación Económica Definitiva</h4>
                    <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                      <tbody>
                        <tr style={{ borderBottom: "1px solid #bbf7d0" }}>
                          <td style={{ padding: "8px 0", color: "#166534" }}>Ingreso Bruto Real:</td>
                          <td style={{ textAlign: "right", fontWeight: 800, color: "#15803d", fontSize: "15px" }}>
                            ${venta.liquidacionReal.ingresoBrutoRealArs.toLocaleString("es-AR")}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #bbf7d0" }}>
                          <td style={{ padding: "8px 0", color: "#166534" }}>Precio Real $/kg Res:</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>
                            {venta.liquidacionReal.precioRealKgResArs ? `$${venta.liquidacionReal.precioRealKgResArs}/kg` : "-"}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #bbf7d0" }}>
                          <td style={{ padding: "8px 0", color: "#166534" }}>Gastos Directos (DT-e, fletes):</td>
                          <td style={{ textAlign: "right" }}>${venta.liquidacionReal.gastosDirectosRealesArs.toLocaleString("es-AR")}</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #bbf7d0" }}>
                          <td style={{ padding: "8px 0", color: "#166534" }}>Costo Total Considerado:</td>
                          <td style={{ textAlign: "right" }}>${venta.liquidacionReal.costoTotalRealArs.toLocaleString("es-AR")}</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #bbf7d0" }}>
                          <td style={{ padding: "8px 0", color: "#14532d", fontWeight: 800 }}>Margen Operativo Definitivo:</td>
                          <td style={{ textAlign: "right", fontWeight: 900, color: "#15803d", fontSize: "16px" }}>
                            ${venta.liquidacionReal.margenOperativoRealArs.toLocaleString("es-AR")}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: "8px 0", color: "#166534" }}>Margen por Animal / Rentabilidad:</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>
                            ${venta.liquidacionReal.margenRealPorAnimalArs.toLocaleString("es-AR")} / cab ({venta.liquidacionReal.margenRealSobreVentasPct}%)
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                  <span style={{ fontSize: "36px", display: "block", marginBottom: "10px" }}>⏳</span>
                  <h4 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>Operación Aún No Cerrada</h4>
                  <p style={{ margin: "6px 0 16px 0", fontSize: "13px" }}>
                    Esta venta se encuentra en estado <strong>{venta.estado}</strong>. Una vez que reciba el romaneo y la factura del frigorífico, presione el botón para cargar los datos reales.
                  </p>
                  <button
                    type="button"
                    onClick={() => onAbrirCierreDefinitivo(venta)}
                    className="primaryButton"
                    style={{ fontSize: "13px", padding: "8px 16px" }}
                  >
                    🔒 Cerrar Venta / Cargar Datos Reales
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PROYECTADO VS REAL */}
          {activeTab === "desvios" && (
            <div>
              {venta.liquidacionReal ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="tableWrap">
                    <table className="dataTable">
                      <thead>
                        <tr>
                          <th>Variable</th>
                          <th style={{ textAlign: "right" }}>Proyectado / Estimado</th>
                          <th style={{ textAlign: "right" }}>Real Obtenido</th>
                          <th style={{ textAlign: "right" }}>Diferencia / Desvío</th>
                          <th style={{ textAlign: "center" }}>Evaluación</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Rendimiento al Gancho</strong></td>
                          <td style={{ textAlign: "right" }}>{venta.proyeccion.altRendimiento.rendimientoEstimadoPct}%</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{venta.liquidacionReal.rendimientoRealPct}%</td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: venta.liquidacionReal.desvioRendimientoPuntosPct >= 0 ? "#166534" : "#dc2626" }}>
                            {venta.liquidacionReal.desvioRendimientoPuntosPct >= 0 ? "+" : ""}{venta.liquidacionReal.desvioRendimientoPuntosPct} pts %
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {venta.liquidacionReal.desvioRendimientoPuntosPct >= 0 ? "🟢 Excelente" : "🔴 Menor al previsto"}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Desbaste de Traslado</strong></td>
                          <td style={{ textAlign: "right" }}>{venta.proyeccion.altRendimiento.desbasteTrasladoPct}%</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{venta.liquidacionReal.desbasteRealPct}%</td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: venta.liquidacionReal.desvioDesbastePuntosPct <= 0 ? "#166534" : "#dc2626" }}>
                            {venta.liquidacionReal.desvioDesbastePuntosPct >= 0 ? "+" : ""}{venta.liquidacionReal.desvioDesbastePuntosPct} pts %
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {venta.liquidacionReal.desvioDesbastePuntosPct <= 0 ? "🟢 Menor merma" : "🟠 Mayor desbaste"}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Ingreso Bruto Total</strong></td>
                          <td style={{ textAlign: "right" }}>
                            $
                            {(venta.metodoElegido === "RENDIMIENTO"
                              ? venta.proyeccion.altRendimiento.ingresoBrutoEstimadoArs
                              : venta.proyeccion.altKiloVivo.ingresoBrutoEstimadoArs
                            ).toLocaleString("es-AR")}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "#166534" }}>
                            ${venta.liquidacionReal.ingresoBrutoRealArs.toLocaleString("es-AR")}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 800, color: venta.liquidacionReal.desvioIngresoBrutoArs >= 0 ? "#166534" : "#dc2626" }}>
                            {venta.liquidacionReal.desvioIngresoBrutoArs >= 0 ? "+$" : "-$"}
                            {Math.abs(venta.liquidacionReal.desvioIngresoBrutoArs).toLocaleString("es-AR")} ({venta.liquidacionReal.desvioIngresoBrutoPct}%)
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {venta.liquidacionReal.desvioIngresoBrutoArs >= 0 ? "🟢 A favor" : "🔴 En contra"}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Margen Operativo</strong></td>
                          <td style={{ textAlign: "right" }}>
                            $
                            {(venta.metodoElegido === "RENDIMIENTO"
                              ? venta.proyeccion.altRendimiento.margenOperativoEstimadoArs
                              : venta.proyeccion.altKiloVivo.margenOperativoEstimadoArs
                            ).toLocaleString("es-AR")}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 800, color: "#15803d" }}>
                            ${venta.liquidacionReal.margenOperativoRealArs.toLocaleString("es-AR")}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 800, color: venta.liquidacionReal.desvioMargenOperativoArs >= 0 ? "#166534" : "#dc2626" }}>
                            {venta.liquidacionReal.desvioMargenOperativoArs >= 0 ? "+$" : "-$"}
                            {Math.abs(venta.liquidacionReal.desvioMargenOperativoArs).toLocaleString("es-AR")}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {venta.liquidacionReal.desvioMargenOperativoArs >= 0 ? "🟢 Superó meta" : "🔴 Por debajo"}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Margen por Animal</strong></td>
                          <td style={{ textAlign: "right" }}>
                            $
                            {(venta.metodoElegido === "RENDIMIENTO"
                              ? venta.proyeccion.altRendimiento.margenPorAnimalArs
                              : venta.proyeccion.altKiloVivo.margenPorAnimalArs
                            ).toLocaleString("es-AR")}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>
                            ${venta.liquidacionReal.margenRealPorAnimalArs.toLocaleString("es-AR")}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>
                            ${(venta.liquidacionReal.margenRealPorAnimalArs - (venta.metodoElegido === "RENDIMIENTO" ? venta.proyeccion.altRendimiento.margenPorAnimalArs : venta.proyeccion.altKiloVivo.margenPorAnimalArs)).toLocaleString("es-AR")}
                          </td>
                          <td style={{ textAlign: "center" }}>-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                  <span style={{ fontSize: "36px", display: "block", marginBottom: "10px" }}>📊</span>
                  <h4 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>Análisis de Desvíos Disponible al Cierre</h4>
                  <p style={{ margin: "6px 0 0 0", fontSize: "13px" }}>
                    Los desvíos entre lo proyectado y lo real se calcularán automáticamente en cuanto se cargue la liquidación oficial del frigorífico.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DOCUMENTOS */}
          {activeTab === "documentos" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", color: "#0f172a" }}>Legajo Digital de la Operación</h4>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                    Guarde Guía/DT-e, Romaneo y Factura para mantener el expediente completo y auditable.
                  </p>
                </div>
                <button
                  type="button"
                  className="primaryButton"
                  onClick={() => setModalAdjuntarOpen(true)}
                  style={{ fontSize: "12.5px", padding: "6px 14px" }}
                >
                  📎 + Adjuntar Documento
                </button>
              </div>

              {venta.documentos?.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", border: "2px dashed #cbd5e1", borderRadius: "10px" }}>
                  <span style={{ fontSize: "28px" }}>📄</span>
                  <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                    No hay documentos adjuntos en este expediente todavía.
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
                  {venta.documentos.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        padding: "14px",
                        backgroundColor: "#f8fafc",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <span
                            className="pill"
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              backgroundColor:
                                doc.tipo === "DTE_GUIA"
                                  ? "#dbeafe"
                                  : doc.tipo === "ROMANEO"
                                  ? "#fef3c7"
                                  : "#dcfce7",
                              color:
                                doc.tipo === "DTE_GUIA"
                                  ? "#1e40af"
                                  : doc.tipo === "ROMANEO"
                                  ? "#92400e"
                                  : "#166534",
                            }}
                          >
                            {doc.tipo === "DTE_GUIA"
                              ? "DT-e / GUÍA"
                              : doc.tipo === "ROMANEO"
                              ? "ROMANEO"
                              : "FACTURA / LIQUIDACIÓN"}
                          </span>
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>{doc.fechaCarga}</span>
                        </div>

                        <strong style={{ fontSize: "13px", color: "#0f172a", display: "block", marginBottom: "4px" }}>
                          {doc.nombreArchivo}
                        </strong>

                        {doc.numeroIdentificador && (
                          <div style={{ fontSize: "11.5px", color: "#2563eb", marginBottom: "6px" }}>
                            N° {doc.numeroIdentificador}
                          </div>
                        )}

                        {doc.observaciones && (
                          <p style={{ margin: 0, fontSize: "11.5px", color: "#475569" }}>{doc.observaciones}</p>
                        )}
                      </div>

                      <div style={{ marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>Cargado por: {doc.usuarioCarga}</span>
                        {doc.archivoUrl && (
                          <a
                            href={doc.archivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "11.5px", color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
                          >
                            Ver Archivo ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CRONOLOGÍA & AUDITORÍA */}
          {activeTab === "cronologia" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", backgroundColor: "#f8fafc" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#0f172a" }}>Datos de Auditoría del Registro</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", fontSize: "12px" }}>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Creado por:</span>
                    <strong>{venta.auditoria.creadoPor}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Fecha de Creación:</span>
                    <strong>{new Date(venta.auditoria.creadoEn).toLocaleString("es-AR")}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Última Modificación:</span>
                    <strong>{new Date(venta.auditoria.modificadoEn).toLocaleString("es-AR")} ({venta.auditoria.modificadoPor})</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Cerrado por:</span>
                    <strong>{venta.auditoria.cerradoPor || "Pendiente de cierre"}</strong>
                  </div>
                </div>
              </div>

              <h4 style={{ margin: "10px 0 0 0", fontSize: "14px", color: "#0f172a" }}>Línea de Tiempo de la Operación</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {venta.cronologia?.map((c, idx) => (
                  <div
                    key={c.id || idx}
                    style={{
                      display: "flex",
                      gap: "12px",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#f8fafc",
                      borderLeft: "4px solid #2563eb",
                    }}
                  >
                    <div style={{ minWidth: "125px", fontSize: "11.5px", color: "#64748b" }}>{c.fecha}</div>
                    <div>
                      <strong style={{ fontSize: "12.5px", color: "#0f172a" }}>{c.accion}</strong>
                      <span style={{ fontSize: "11.5px", color: "#64748b", marginLeft: "6px" }}>({c.usuario})</span>
                      <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#334155" }}>{c.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
