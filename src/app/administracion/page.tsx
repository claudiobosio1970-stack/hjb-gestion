"use client";

import { useState, useEffect, useMemo } from "react";
import AppShell from "@/components/AppShell";
import ModalComprobante from "@/components/administracion/ModalComprobante";
import ModalDetalleComprobante from "@/components/administracion/ModalDetalleComprobante";
import ModalTransferenciaInterna from "@/components/administracion/ModalTransferenciaInterna";
import {
  ComprobanteGasto,
  TransferenciaInterna,
  BienDeUsoActivo,
  DestinoEconomicoId,
  TipoEconomicoEgreso,
  UNIDADES_ECONOMICAS_HJB,
  TIPOS_EGRESO_INFO,
  REGLAS_DISTRIBUCION_DEFAULT,
  getComprobantes,
  getTransferenciasInternas,
  getBienesDeUso,
  getCentrosCosto,
  getProveedores,
  calcularResumenEconomico,
  guardarComprobante,
  anularTransferenciaInterna,
  initAdministracionFirestoreSync,
  HJB_ADMIN_SYNC_EVENT,
} from "@/lib/administracionData";

type TabPrincipal = "tablero_crea" | "comprobantes" | "transferencias" | "capex" | "centros_costo";

export default function AdministracionPage() {
  const [comprobantes, setComprobantes] = useState<ComprobanteGasto[]>([]);
  const [transferencias, setTransferencias] = useState<TransferenciaInterna[]>([]);
  const [bienesUso, setBienesUso] = useState<BienDeUsoActivo[]>([]);
  const [tabActiva, setTabActiva] = useState<TabPrincipal>("tablero_crea");

  // Modales
  const [modalNuevoComprobanteOpen, setModalNuevoComprobanteOpen] = useState(false);
  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState<ComprobanteGasto | null>(null);
  const [comprobanteParaEditar, setComprobanteParaEditar] = useState<ComprobanteGasto | null>(null);

  const [modalTransferenciaOpen, setModalTransferenciaOpen] = useState(false);
  const [transferenciaParaEditar, setTransferenciaParaEditar] = useState<TransferenciaInterna | null>(null);

  // Filtros de Bandeja de Comprobantes
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroUnidad, setFiltroUnidad] = useState<string>("TODAS");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [filtroEgreso, setFiltroEgreso] = useState<string>("TODOS");
  const [filtroCampana, setFiltroCampana] = useState<string>("TODAS");

  // Filtro de Centros de Costo
  const [filtroUnidadCc, setFiltroUnidadCc] = useState<string>("TODAS");

  // Notificación / Feedback
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  function triggerFeedback(msg: string) {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4500);
  }

  // Carga inicial y suscripción reactiva en tiempo real a Firestore
  useEffect(() => {
    function cargarTodo() {
      setComprobantes(getComprobantes());
      setTransferencias(getTransferenciasInternas());
      setBienesUso(getBienesDeUso());
    }
    cargarTodo();

    const unsubscribe = initAdministracionFirestoreSync(
      (docsComp) => setComprobantes(docsComp),
      (docsTransf) => setTransferencias(docsTransf)
    );

    window.addEventListener(HJB_ADMIN_SYNC_EVENT, cargarTodo);
    return () => {
      unsubscribe();
      window.removeEventListener(HJB_ADMIN_SYNC_EVENT, cargarTodo);
    };
  }, []);

  // Resumen Económico Consolidado & CREA
  const resumen = useMemo(() => {
    return calcularResumenEconomico(comprobantes, transferencias, bienesUso);
  }, [comprobantes, transferencias, bienesUso]);

  // Filtrado de comprobantes
  const comprobantesFiltrados = useMemo(() => {
    return comprobantes.filter((c) => {
      if (filtroTexto.trim()) {
        const q = filtroTexto.toLowerCase();
        const coincideProv = c.proveedorRazonSocial.toLowerCase().includes(q);
        const coincideCuit = c.proveedorCuit.includes(q);
        const coincideNum = `${c.puntoVenta}-${c.numeroComprobante}`.includes(q);
        const coincideDesc = c.descripcion.toLowerCase().includes(q);
        if (!coincideProv && !coincideCuit && !coincideNum && !coincideDesc) return false;
      }
      if (filtroUnidad !== "TODAS") {
        const tieneUnidad = c.imputaciones.some((imp) => imp.destino === filtroUnidad);
        if (!tieneUnidad) return false;
      }
      if (filtroEstado !== "TODOS") {
        if (c.estadoImputacion !== filtroEstado) return false;
      }
      if (filtroEgreso !== "TODOS") {
        if (c.tipoEgreso !== filtroEgreso) return false;
      }
      if (filtroCampana !== "TODAS") {
        if (c.campana !== filtroCampana) return false;
      }
      return true;
    });
  }, [comprobantes, filtroTexto, filtroUnidad, filtroEstado, filtroEgreso, filtroCampana]);

  // Centros de costo filtrados
  const centrosCosto = useMemo(() => getCentrosCosto(), []);
  const centrosCostoFiltrados = useMemo(() => {
    if (filtroUnidadCc === "TODAS") return centrosCosto;
    return centrosCosto.filter((c) => c.unidadId === filtroUnidadCc);
  }, [centrosCosto, filtroUnidadCc]);

  // Confirmar comprobante directamente si ya está 100%
  function handleConfirmarDirecto(c: ComprobanteGasto) {
    const res = guardarComprobante(c, "Operador HJB", true);
    if (res.error) {
      triggerFeedback(`❌ Error al confirmar: ${res.error}`);
    } else {
      triggerFeedback(`✓ Comprobante ${c.tipoComprobante} ${c.letra} ${c.puntoVenta}-${c.numeroComprobante} confirmado definitivamente.`);
      setComprobantes(getComprobantes());
    }
  }

  // Anular transferencia interna
  function handleAnularTransferencia(id: string) {
    if (confirm("¿Está seguro de que desea anular esta transferencia interna?")) {
      anularTransferenciaInterna(id, "Operador HJB");
      setTransferencias(getTransferenciasInternas());
      triggerFeedback("✓ Transferencia interna anulada correctamente.");
    }
  }

  return (
    <AppShell active="Administración">
      <div style={{ maxWidth: "1480px", margin: "0 auto", paddingBottom: "60px" }}>
        
        {/* Banner de Feedback */}
        {feedbackMsg && (
          <div
            style={{
              background: "#16a34a",
              color: "white",
              padding: "11px 18px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontWeight: 700,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
            }}
          >
            <span>{feedbackMsg}</span>
            <button onClick={() => setFeedbackMsg(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "16px" }}>✕</button>
          </div>
        )}

        {/* Encabezado del Módulo de Gestión CREA */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "30px" }}>📊</span>
              <div>
                <h1 style={{ fontSize: "24px", fontWeight: 900, margin: 0, color: "var(--slate-900)", letterSpacing: "-0.5px" }}>
                  Administración & Gestión Económica
                </h1>
                <p style={{ margin: "3px 0 0", fontSize: "13px", color: "var(--slate-600)" }}>
                  Control documental, trazabilidad 100%, transferencias internas y resultados por unidad productiva (Metodología CREA)
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setTransferenciaParaEditar(null);
                setModalTransferenciaOpen(true);
              }}
              style={{
                background: "#0f766e",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "9px 15px",
                fontSize: "12.5px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(15,118,110,0.25)",
              }}
            >
              <span>🔄</span> Nueva Transferencia Interna
            </button>

            <button
              onClick={() => {
                setComprobanteParaEditar(null);
                setModalNuevoComprobanteOpen(true);
              }}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "9px 16px",
                fontSize: "12.5px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                boxShadow: "0 2px 5px rgba(37,99,235,0.3)",
              }}
            >
              <span>➕</span> Nuevo Comprobante
            </button>
          </div>
        </div>

        {/* Barra de Navegación de Pestañas Temáticas */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            borderBottom: "2px solid #e2e8f0",
            marginBottom: "20px",
            overflowX: "auto",
            paddingBottom: "2px",
          }}
        >
          <button
            onClick={() => setTabActiva("tablero_crea")}
            style={{
              padding: "10px 16px",
              border: "none",
              background: tabActiva === "tablero_crea" ? "#2563eb" : "transparent",
              color: tabActiva === "tablero_crea" ? "white" : "var(--slate-700)",
              borderRadius: "8px 8px 0 0",
              fontWeight: 800,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
            }}
          >
            <span>📊</span> Tablero Ejecutivo & Cuadro CREA
          </button>

          <button
            onClick={() => setTabActiva("comprobantes")}
            style={{
              padding: "10px 16px",
              border: "none",
              background: tabActiva === "comprobantes" ? "#2563eb" : "transparent",
              color: tabActiva === "comprobantes" ? "white" : "var(--slate-700)",
              borderRadius: "8px 8px 0 0",
              fontWeight: 800,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
            }}
          >
            <span>📑</span> Bandeja de Comprobantes
            <span
              style={{
                fontSize: "11px",
                padding: "2px 7px",
                borderRadius: "10px",
                background: tabActiva === "comprobantes" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                color: tabActiva === "comprobantes" ? "white" : "var(--slate-700)",
              }}
            >
              {comprobantes.length}
            </span>
          </button>

          <button
            onClick={() => setTabActiva("transferencias")}
            style={{
              padding: "10px 16px",
              border: "none",
              background: tabActiva === "transferencias" ? "#2563eb" : "transparent",
              color: tabActiva === "transferencias" ? "white" : "var(--slate-700)",
              borderRadius: "8px 8px 0 0",
              fontWeight: 800,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
            }}
          >
            <span>🔄</span> Transferencias Internas
            <span
              style={{
                fontSize: "11px",
                padding: "2px 7px",
                borderRadius: "10px",
                background: tabActiva === "transferencias" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                color: tabActiva === "transferencias" ? "white" : "var(--slate-700)",
              }}
            >
              {transferencias.length}
            </span>
          </button>

          <button
            onClick={() => setTabActiva("capex")}
            style={{
              padding: "10px 16px",
              border: "none",
              background: tabActiva === "capex" ? "#2563eb" : "transparent",
              color: tabActiva === "capex" ? "white" : "var(--slate-700)",
              borderRadius: "8px 8px 0 0",
              fontWeight: 800,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
            }}
          >
            <span>🚜</span> Inversiones & Activos Fijos (CAPEX)
            <span
              style={{
                fontSize: "11px",
                padding: "2px 7px",
                borderRadius: "10px",
                background: tabActiva === "capex" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                color: tabActiva === "capex" ? "white" : "var(--slate-700)",
              }}
            >
              {bienesUso.length}
            </span>
          </button>

          <button
            onClick={() => setTabActiva("centros_costo")}
            style={{
              padding: "10px 16px",
              border: "none",
              background: tabActiva === "centros_costo" ? "#2563eb" : "transparent",
              color: tabActiva === "centros_costo" ? "white" : "var(--slate-700)",
              borderRadius: "8px 8px 0 0",
              fontWeight: 800,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
            }}
          >
            <span>🏷️</span> Estructura & Centros de Costo
          </button>
        </div>

        {/* ========================================================================= */}
        {/* PESTAÑA 1: TABLERO EJECUTIVO & CUADRO DE RESULTADOS CREA */}
        {/* ========================================================================= */}
        {tabActiva === "tablero_crea" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            
            {/* Tarjetas Principales de KPIs Financieros */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "14px" }}>
              
              {/* Card 1: Gasto Empresarial HJB Consolidado */}
              <div className="card" style={{ padding: "16px", borderLeft: "4px solid #2563eb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                    Gasto Empresarial HJB
                  </span>
                  <span style={{ fontSize: "18px" }}>🏢</span>
                </div>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#1e293b", margin: "6px 0 2px" }}>
                  ${resumen.totalGastoEmpresarialHjbArs.toLocaleString("es-AR")}
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--slate-500)" }}>
                  Leche + Cereales + Carne + Admin (Excluye Particular)
                </div>
              </div>

              {/* Card 2: OPEX (Gasto Operativo) */}
              <div className="card" style={{ padding: "16px", borderLeft: "4px solid #0284c7" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                    Gasto Operativo (OPEX)
                  </span>
                  <span style={{ fontSize: "18px" }}>⚙️</span>
                </div>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#0369a1", margin: "6px 0 2px" }}>
                  ${resumen.totalGastoOperativoOpexArs.toLocaleString("es-AR")}
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--slate-500)" }}>
                  Insumos, labores, combustibles y servicios del ciclo
                </div>
              </div>

              {/* Card 3: Inversiones CAPEX */}
              <div className="card" style={{ padding: "16px", borderLeft: "4px solid #d97706" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                    Inversiones / Activo Fijo (CAPEX)
                  </span>
                  <span style={{ fontSize: "18px" }}>🚜</span>
                </div>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#b45309", margin: "6px 0 2px" }}>
                  ${resumen.totalInversionCapexArs.toLocaleString("es-AR")}
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--slate-500)" }}>
                  Amortización anual: ${resumen.amortizacionAnualTotalArs.toLocaleString("es-AR")}
                </div>
              </div>

              {/* Card 4: Transferencias Internas Compensadas */}
              <div className="card" style={{ padding: "16px", borderLeft: "4px solid #0d9488" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                    Transferencias Internas CREA
                  </span>
                  <span style={{ fontSize: "18px" }}>🔄</span>
                </div>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#0f766e", margin: "6px 0 2px" }}>
                  ${resumen.totalTransferenciasArs.toLocaleString("es-AR")}
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--slate-500)" }}>
                  Maíz, terneros y tracción (Neto consolidado = $0)
                </div>
              </div>

              {/* Card 5: Gastos Particulares Aislados */}
              <div className="card" style={{ padding: "16px", borderLeft: "4px solid #64748b", background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase" }}>
                    Destino Particular (Aislado)
                  </span>
                  <span style={{ fontSize: "18px" }}>👤</span>
                </div>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#475569", margin: "6px 0 2px" }}>
                  ${resumen.totalGastoParticularAisladoArs.toLocaleString("es-AR")}
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>
                  Excluido 100% del margen de la empresa
                </div>
              </div>
            </div>

            {/* SECCIÓN PRINCIPAL: CUADRO OFICIAL DE RESULTADOS ECONÓMICOS CREA */}
            <div className="card" style={{ padding: "20px", overflowX: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ fontSize: "17px", fontWeight: 900, margin: 0, color: "var(--slate-900)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📈</span> Cuadro Oficial de Resultados CREA por Unidad de Negocio
                  </h2>
                  <span style={{ fontSize: "12px", color: "var(--slate-500)" }}>
                    Ingresos externos, transferencias internas valorizadas, costos directos y eliminación en consolidado
                  </span>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span style={{ fontSize: "11.5px", background: "#f1f5f9", padding: "4px 10px", borderRadius: "12px", fontWeight: 700, color: "var(--slate-600)" }}>
                    Campaña 2026/27 • Moneda: ARS
                  </span>
                </div>
              </div>

              {/* Tabla CREA */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <thead>
                  <tr style={{ background: "#0f172a", color: "white", textAlign: "right" }}>
                    <th style={{ textAlign: "left", padding: "12px 14px", fontWeight: 800, width: "32%" }}>
                      CONCEPTO ECONÓMICO (CREA)
                    </th>
                    <th style={{ padding: "12px 10px", fontWeight: 800, color: "#93c5fd" }}>
                      10 HJB Leche
                    </th>
                    <th style={{ padding: "12px 10px", fontWeight: 800, color: "#86efac" }}>
                      20 HJB Cereales
                    </th>
                    <th style={{ padding: "12px 10px", fontWeight: 800, color: "#fca5a5" }}>
                      30 HJB Carne
                    </th>
                    <th style={{ padding: "12px 10px", fontWeight: 800, color: "#d8b4fe" }}>
                      Administración
                    </th>
                    <th style={{ padding: "12px 10px", fontWeight: 800, color: "#cbd5e1" }}>
                      (-) Eliminaciones
                    </th>
                    <th style={{ padding: "12px 12px", fontWeight: 900, color: "#fde047", background: "#1e293b" }}>
                      = HJB CONSOLIDADO
                    </th>
                    <th style={{ padding: "12px 10px", fontWeight: 800, color: "#cbd5e1", background: "#334155" }}>
                      Particular (Aislado)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.cuadroCrea.map((fila, idx) => {
                    const isTotal = fila.esSubtotal;
                    const isDestacado = fila.esDestacado;
                    const bgRow = isTotal
                      ? isDestacado
                        ? "#f8fafc"
                        : "#f1f5f9"
                      : idx % 2 === 0
                      ? "#ffffff"
                      : "#fdfdfd";

                    const fontW = isTotal ? 900 : 600;

                    return (
                      <tr
                        key={idx}
                        style={{
                          background: bgRow,
                          borderBottom: isTotal ? "2px solid #cbd5e1" : "1px solid #e2e8f0",
                          fontWeight: fontW,
                        }}
                      >
                        <td
                          style={{
                            padding: "10px 14px",
                            color: isDestacado ? "#0f172a" : "var(--slate-800)",
                            fontSize: isTotal ? "13px" : "12px",
                          }}
                          title={fila.tooltip}
                        >
                          {fila.concepto}
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", color: fila.leche < 0 ? "#dc2626" : fila.leche > 0 ? "#1e40af" : "#94a3b8" }}>
                          {fila.leche !== 0 ? `${fila.leche < 0 ? "-$" : "$"}${Math.abs(fila.leche).toLocaleString("es-AR")}` : "—"}
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", color: fila.cereales < 0 ? "#dc2626" : fila.cereales > 0 ? "#15803d" : "#94a3b8" }}>
                          {fila.cereales !== 0 ? `${fila.cereales < 0 ? "-$" : "$"}${Math.abs(fila.cereales).toLocaleString("es-AR")}` : "—"}
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", color: fila.carne < 0 ? "#dc2626" : fila.carne > 0 ? "#b91c1c" : "#94a3b8" }}>
                          {fila.carne !== 0 ? `${fila.carne < 0 ? "-$" : "$"}${Math.abs(fila.carne).toLocaleString("es-AR")}` : "—"}
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", color: fila.admin < 0 ? "#dc2626" : fila.admin > 0 ? "#6d28d9" : "#94a3b8" }}>
                          {fila.admin !== 0 ? `${fila.admin < 0 ? "-$" : "$"}${Math.abs(fila.admin).toLocaleString("es-AR")}` : "—"}
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", color: "#64748b", fontStyle: "italic" }}>
                          {fila.eliminaciones !== 0 ? `${fila.eliminaciones < 0 ? "-$" : "$"}${Math.abs(fila.eliminaciones).toLocaleString("es-AR")}` : "—"}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            textAlign: "right",
                            background: isTotal ? "#fef08a" : "#fef9c3",
                            color: fila.hjbConsolidado < 0 ? "#b91c1c" : "#1e293b",
                            fontWeight: 900,
                            fontSize: isTotal ? "13.5px" : "12.5px",
                          }}
                        >
                          {fila.hjbConsolidado !== 0 ? `${fila.hjbConsolidado < 0 ? "-$" : "$"}${Math.abs(fila.hjbConsolidado).toLocaleString("es-AR")}` : "—"}
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", background: "#f1f5f9", color: "#64748b" }}>
                          {fila.particular !== 0 ? `${fila.particular < 0 ? "-$" : "$"}${Math.abs(fila.particular).toLocaleString("es-AR")}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Nota explicativa de gestión CREA */}
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 16px",
                  background: "#eff6ff",
                  borderRadius: "8px",
                  border: "1px solid #bfdbfe",
                  fontSize: "12px",
                  color: "#1e40af",
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: "18px" }}>ℹ️</span>
                <div>
                  <strong>Reglas Metodológicas del Cuadro CREA:</strong>
                  <ul style={{ margin: "4px 0 0", paddingLeft: "18px" }}>
                    <li><strong>Precios de Transferencia:</strong> El maíz cedido por Cereales ($23.4M) se computa como ingreso de Agricultura y costo de Tambo. En la columna de Eliminaciones se cancela a $0 para no duplicar ventas externas en HJB Consolidado.</li>
                    <li><strong>CAPEX (Inversiones):</strong> Las compras de maquinaria (ej: Tractor Case $72M) se amortizan anualmente ($7.2M/año) según vida útil, sin descontar el 100% de la compra como gasto del mes.</li>
                    <li><strong>Particular:</strong> Las operaciones particulares de los titulares se auditan en su columna independiente y quedan 100% fuera del resultado empresarial consolidado.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: DISTRIBUCIÓN VISUAL DEL GASTO */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "16px" }}>
              
              {/* Desglose por Unidad Productiva */}
              <div className="card" style={{ padding: "18px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 800, margin: "0 0 14px", color: "var(--slate-800)" }}>
                  🏢 Distribución del Gasto por Unidad Productiva
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {(["10-LECHE", "20-CEREALES", "30-CARNE", "ADMINISTRACION"] as DestinoEconomicoId[]).map((key) => {
                    const info = resumen.distribucionPorUnidad[key];
                    const u = UNIDADES_ECONOMICAS_HJB[key];
                    const pct = info ? info.porcentajeDelConsolidado : 0;
                    const tot = info ? info.totalImputadoArs : 0;

                    return (
                      <div key={key}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                          <span style={{ fontWeight: 700, color: u.color }}>
                            {u.codigoOficial} — {u.nombre}
                          </span>
                          <span style={{ fontWeight: 800, color: "var(--slate-800)" }}>
                            ${tot.toLocaleString("es-AR")} ({pct}%)
                          </span>
                        </div>
                        <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: u.color, borderRadius: "4px" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumen de Trazabilidad y Calidad de Imputación */}
              <div className="card" style={{ padding: "18px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 800, margin: "0 0 14px", color: "var(--slate-800)" }}>
                  🛡️ Control Interno & Trazabilidad de Imputación (100%)
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "11px", color: "var(--slate-500)", display: "block" }}>Comprobantes Registrados</span>
                    <strong style={{ fontSize: "20px", color: "var(--slate-800)" }}>{resumen.totalComprobantesCount}</strong>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "11px", color: "var(--slate-500)", display: "block" }}>Pendientes de Imputar</span>
                    <strong style={{ fontSize: "20px", color: resumen.pendientesDeImputacionCount > 0 ? "#d97706" : "#16a34a" }}>
                      {resumen.pendientesDeImputacionCount} comprobantes
                    </strong>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "11px", color: "var(--slate-500)", display: "block" }}>Importe Pendiente de Asignar</span>
                    <strong style={{ fontSize: "17px", color: resumen.importePendienteImputarArs > 0 ? "#dc2626" : "#16a34a" }}>
                      ${resumen.importePendienteImputarArs.toLocaleString("es-AR")}
                    </strong>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "11px", color: "var(--slate-500)", display: "block" }}>Transferencias Internas</span>
                    <strong style={{ fontSize: "17px", color: "#0f766e" }}>
                      {transferencias.length} registradas
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 2: BANDEJA DE COMPROBANTES & GASTOS */}
        {/* ========================================================================= */}
        {tabActiva === "comprobantes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Barra de Filtros */}
            <div className="card" style={{ padding: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
                
                {/* Buscador */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--slate-600)", marginBottom: "4px" }}>
                    Buscar Comprobante / Proveedor / CUIT:
                  </label>
                  <input
                    type="text"
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                    placeholder="Ej: ACA, DeLaval, 00041280, MAP..."
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
                  />
                </div>

                {/* Filtro Unidad */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--slate-600)", marginBottom: "4px" }}>
                    Unidad Productiva:
                  </label>
                  <select
                    value={filtroUnidad}
                    onChange={(e) => setFiltroUnidad(e.target.value)}
                    style={{ width: "100%", padding: "7px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12.5px" }}
                  >
                    <option value="TODAS">Todas las Unidades</option>
                    <option value="10-LECHE">10 — HJB Leche</option>
                    <option value="20-CEREALES">20 — HJB Cereales</option>
                    <option value="30-CARNE">30 — HJB Carne</option>
                    <option value="ADMINISTRACION">Administración</option>
                    <option value="PARTICULAR">Particular</option>
                  </select>
                </div>

                {/* Filtro Estado */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--slate-600)", marginBottom: "4px" }}>
                    Estado Imputación:
                  </label>
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    style={{ width: "100%", padding: "7px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12.5px" }}
                  >
                    <option value="TODOS">Todos los Estados</option>
                    <option value="CONFIRMADO">Confirmados</option>
                    <option value="IMPUTADO_100">Imputados 100%</option>
                    <option value="IMPUTACION_PARCIAL">Imputación Parcial</option>
                    <option value="SIN_IMPUTAR">Sin Imputar</option>
                    <option value="ANULADO">Anulados</option>
                  </select>
                </div>

                {/* Filtro Tipo Egreso */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--slate-600)", marginBottom: "4px" }}>
                    Tipo de Egreso:
                  </label>
                  <select
                    value={filtroEgreso}
                    onChange={(e) => setFiltroEgreso(e.target.value)}
                    style={{ width: "100%", padding: "7px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12.5px" }}
                  >
                    <option value="TODOS">Todos (OPEX & CAPEX)</option>
                    <option value="GASTO_OPERATIVO">Gasto Operativo (OPEX)</option>
                    <option value="INVERSION_CAPEX">Inversión (CAPEX)</option>
                    <option value="EXTRAORDINARIO">Extraordinario</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tabla de Comprobantes */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid var(--line)", textAlign: "left" }}>
                      <th style={{ padding: "10px 14px", fontWeight: 800, color: "var(--slate-600)" }}>Fecha / Campaña</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--slate-600)" }}>Comprobante AFIP</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--slate-600)" }}>Proveedor & CUIT</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--slate-600)" }}>Concepto & Egreso</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--slate-600)", textAlign: "right" }}>Total ($ ARS)</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--slate-600)" }}>Imputación (% y Destino)</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--slate-600)" }}>Estado</th>
                      <th style={{ padding: "10px 14px", fontWeight: 800, color: "var(--slate-600)", textAlign: "right" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comprobantesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: "30px", textAlign: "center", color: "var(--slate-400)" }}>
                          No se encontraron comprobantes con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      comprobantesFiltrados.map((c) => {
                        const egresoInfo = TIPOS_EGRESO_INFO[c.tipoEgreso];
                        const esConfirmado = c.estadoImputacion === "CONFIRMADO";
                        const esAnulado = c.estadoImputacion === "ANULADO";
                        const es100 = c.porcentajeImputadoTotal === 100;

                        return (
                          <tr
                            key={c.id}
                            style={{
                              borderBottom: "1px solid var(--line)",
                              background: esAnulado ? "#fef2f2" : "white",
                              opacity: esAnulado ? 0.75 : 1,
                            }}
                          >
                            {/* Fecha */}
                            <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                              <strong style={{ display: "block", color: "var(--slate-800)" }}>{c.fechaComprobante}</strong>
                              <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>{c.campana}</span>
                            </td>

                            {/* Comprobante */}
                            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 900,
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: c.letra === "A" ? "#2563eb" : "#475569",
                                    color: "white",
                                  }}
                                >
                                  {c.letra}
                                </span>
                                <strong style={{ color: "var(--slate-900)" }}>
                                  {c.puntoVenta}-{c.numeroComprobante}
                                </strong>
                              </div>
                              <span style={{ fontSize: "11px", color: "var(--slate-500)", display: "block" }}>
                                {c.tipoComprobante}
                              </span>
                            </td>

                            {/* Proveedor */}
                            <td style={{ padding: "10px 12px" }}>
                              <strong style={{ display: "block", color: "var(--slate-800)" }}>{c.proveedorRazonSocial}</strong>
                              <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>CUIT: {c.proveedorCuit}</span>
                            </td>

                            {/* Concepto & Tipo Egreso */}
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ display: "block", fontWeight: 600, color: "var(--slate-800)" }}>{c.concepto}</span>
                              <span
                                style={{
                                  fontSize: "10.5px",
                                  fontWeight: 800,
                                  color: egresoInfo.badgeColor,
                                  display: "inline-block",
                                  marginTop: "2px",
                                }}
                              >
                                {egresoInfo.nombre}
                              </span>
                            </td>

                            {/* Total */}
                            <td style={{ padding: "10px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                              <strong style={{ fontSize: "13.5px", color: "var(--slate-900)" }}>
                                ${c.totalComprobante.toLocaleString("es-AR")}
                              </strong>
                              {c.moneda === "USD" && (
                                <span style={{ fontSize: "10.5px", color: "var(--slate-500)", display: "block" }}>
                                  (USD {c.totalComprobante / (c.tipoCambio || 1)})
                                </span>
                              )}
                            </td>

                            {/* Imputación */}
                            <td style={{ padding: "10px 12px", minWidth: "160px" }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "4px" }}>
                                {c.imputaciones.map((imp) => {
                                  const u = UNIDADES_ECONOMICAS_HJB[imp.destino];
                                  return (
                                    <span
                                      key={imp.id}
                                      style={{
                                        fontSize: "10.5px",
                                        fontWeight: 800,
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        background: `${u?.color || "#64748b"}15`,
                                        color: u?.color || "#64748b",
                                        border: `1px solid ${u?.color || "#64748b"}40`,
                                      }}
                                    >
                                      {u?.nombreCorto}: {imp.porcentaje}%
                                    </span>
                                  );
                                })}
                              </div>
                              <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "2px", overflow: "hidden" }}>
                                <div
                                  style={{
                                    width: `${Math.min(100, c.porcentajeImputadoTotal)}%`,
                                    background: es100 ? "#16a34a" : "#f59e0b",
                                    height: "100%",
                                  }}
                                />
                              </div>
                            </td>

                            {/* Estado */}
                            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  padding: "3px 8px",
                                  borderRadius: "12px",
                                  background: esConfirmado
                                    ? "#dcfce7"
                                    : esAnulado
                                    ? "#fee2e2"
                                    : es100
                                    ? "#eff6ff"
                                    : "#fef3c7",
                                  color: esConfirmado
                                    ? "#166534"
                                    : esAnulado
                                    ? "#991b1b"
                                    : es100
                                    ? "#1d4ed8"
                                    : "#854d0e",
                                }}
                              >
                                {esConfirmado
                                  ? "✓ Confirmado"
                                  : esAnulado
                                  ? "✕ Anulado"
                                  : es100
                                  ? "100% Imputado"
                                  : `Parcial (${c.porcentajeImputadoTotal}%)`}
                              </span>
                            </td>

                            {/* Acciones */}
                            <td style={{ padding: "10px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                <button
                                  onClick={() => setComprobanteSeleccionado(c)}
                                  style={{
                                    background: "white",
                                    border: "1px solid var(--line)",
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                  }}
                                  title="Ver detalle y auditoría"
                                >
                                  👁️
                                </button>

                                {!esConfirmado && !esAnulado && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setComprobanteParaEditar(c);
                                        setModalNuevoComprobanteOpen(true);
                                      }}
                                      style={{
                                        background: "white",
                                        border: "1px solid var(--line)",
                                        padding: "4px 8px",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                      }}
                                      title="Editar comprobante"
                                    >
                                      ✏️
                                    </button>

                                    {es100 && (
                                      <button
                                        onClick={() => handleConfirmarDirecto(c)}
                                        style={{
                                          background: "#dcfce7",
                                          border: "1px solid #86efac",
                                          color: "#166534",
                                          padding: "4px 8px",
                                          borderRadius: "4px",
                                          fontSize: "12px",
                                          fontWeight: 700,
                                          cursor: "pointer",
                                        }}
                                        title="Confirmar definitivamente"
                                      >
                                        ✓
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 3: TRANSFERENCIAS INTERNAS ENTRE UNIDADES */}
        {/* ========================================================================= */}
        {tabActiva === "transferencias" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Banner Metodológico */}
            <div
              style={{
                background: "linear-gradient(135deg, #0f766e, #115e59)",
                color: "white",
                padding: "16px 20px",
                borderRadius: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>
                  🔄 Transferencias Internas con Precios de Gestión (Metodología CREA)
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#ccfbf1", maxWidth: "800px" }}>
                  Permite medir el resultado económico genuino de cada unidad (Cereales, Leche, Carne y Maquinaria) valorizando insumos y hacienda sin inflar la facturación de HJB. Al consolidar, las transferencias se cancelan a $0.
                </p>
              </div>

              <button
                onClick={() => {
                  setTransferenciaParaEditar(null);
                  setModalTransferenciaOpen(true);
                }}
                style={{
                  background: "white",
                  color: "#0f766e",
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 16px",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                }}
              >
                ➕ Nueva Transferencia
              </button>
            </div>

            {/* Tabla de Transferencias */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid var(--line)", textAlign: "left" }}>
                      <th style={{ padding: "11px 14px", fontWeight: 800, color: "var(--slate-600)" }}>Fecha / ID</th>
                      <th style={{ padding: "11px 12px", fontWeight: 800, color: "var(--slate-600)" }}>Unidad Cedente (Ingreso +)</th>
                      <th style={{ padding: "11px 12px", fontWeight: 800, color: "var(--slate-600)" }}>Unidad Receptora (Costo -)</th>
                      <th style={{ padding: "11px 12px", fontWeight: 800, color: "var(--slate-600)" }}>Concepto & Destino</th>
                      <th style={{ padding: "11px 12px", fontWeight: 800, color: "var(--slate-600)", textAlign: "right" }}>Cantidad</th>
                      <th style={{ padding: "11px 12px", fontWeight: 800, color: "var(--slate-600)", textAlign: "right" }}>Precio Unitario</th>
                      <th style={{ padding: "11px 12px", fontWeight: 800, color: "var(--slate-600)", textAlign: "right" }}>Total Interno ($)</th>
                      <th style={{ padding: "11px 12px", fontWeight: 800, color: "var(--slate-600)" }}>Criterio Valuación</th>
                      <th style={{ padding: "11px 14px", fontWeight: 800, color: "var(--slate-600)", textAlign: "right" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferencias.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: "30px", textAlign: "center", color: "var(--slate-400)" }}>
                          No hay transferencias internas registradas.
                        </td>
                      </tr>
                    ) : (
                      transferencias.map((t) => {
                        const cedente = UNIDADES_ECONOMICAS_HJB[t.unidadCedenteId];
                        const receptora = UNIDADES_ECONOMICAS_HJB[t.unidadReceptoraId];
                        const esAnulada = t.estado === "ANULADA";

                        return (
                          <tr
                            key={t.id}
                            style={{
                              borderBottom: "1px solid var(--line)",
                              background: esAnulada ? "#fef2f2" : "white",
                              opacity: esAnulada ? 0.7 : 1,
                            }}
                          >
                            <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                              <strong style={{ color: "var(--slate-800)", display: "block" }}>{t.fecha}</strong>
                              <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>ID #{t.numeroInterno} • {t.campana}</span>
                            </td>

                            <td style={{ padding: "10px 12px" }}>
                              <span
                                style={{
                                  fontWeight: 800,
                                  color: cedente?.color || "#1e293b",
                                  background: `${cedente?.color || "#1e293b"}12`,
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  border: `1px solid ${cedente?.color || "#1e293b"}30`,
                                  fontSize: "12px",
                                }}
                              >
                                {cedente?.nombre}
                              </span>
                            </td>

                            <td style={{ padding: "10px 12px" }}>
                              <span
                                style={{
                                  fontWeight: 800,
                                  color: receptora?.color || "#1e293b",
                                  background: `${receptora?.color || "#1e293b"}12`,
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  border: `1px solid ${receptora?.color || "#1e293b"}30`,
                                  fontSize: "12px",
                                }}
                              >
                                {receptora?.nombre}
                              </span>
                            </td>

                            <td style={{ padding: "10px 12px" }}>
                              <strong style={{ color: "var(--slate-800)", display: "block" }}>{t.concepto}</strong>
                              <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                                {t.establecimientoOrigen} ➔ {t.establecimientoDestino}
                              </span>
                            </td>

                            <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>
                              {t.cantidad.toLocaleString("es-AR")} {t.unidadMedida}
                            </td>

                            <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                              ${t.precioUnitario.toLocaleString("es-AR")}
                            </td>

                            <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 900, color: "#0f766e" }}>
                              ${t.importeTotal.toLocaleString("es-AR")}
                            </td>

                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--slate-700)", display: "block" }}>
                                {t.criterioValuacion.replace("_", " ")}
                              </span>
                              <span style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>{t.detalleCriterio}</span>
                            </td>

                            <td style={{ padding: "10px 14px", textAlign: "right" }}>
                              {!esAnulada && (
                                <button
                                  onClick={() => handleAnularTransferencia(t.id)}
                                  style={{
                                    background: "#fee2e2",
                                    border: "1px solid #fca5a5",
                                    color: "#991b1b",
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                  title="Anular transferencia"
                                >
                                  ✕ Anular
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 4: INVERSIONES & BIENES DE USO (CAPEX) */}
        {/* ========================================================================= */}
        {tabActiva === "capex" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* KPIs de Activos Fijos */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
              <div className="card" style={{ padding: "14px", borderLeft: "4px solid #d97706" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                  Valor de Adquisición Total
                </span>
                <div style={{ fontSize: "22px", fontWeight: 900, color: "#1e293b", margin: "4px 0" }}>
                  ${resumen.totalActivosFijosArs.toLocaleString("es-AR")}
                </div>
                <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>5 Activos Fijos Productivos Registrados</span>
              </div>

              <div className="card" style={{ padding: "14px", borderLeft: "4px solid #2563eb" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                  Amortización Anual Proyectada
                </span>
                <div style={{ fontSize: "22px", fontWeight: 900, color: "#2563eb", margin: "4px 0" }}>
                  ${resumen.amortizacionAnualTotalArs.toLocaleString("es-AR")} / año
                </div>
                <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>Impacta en resultado neto, no en OPEX</span>
              </div>

              <div className="card" style={{ padding: "14px", borderLeft: "4px solid #16a34a" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                  Valor Residual Contable
                </span>
                <div style={{ fontSize: "22px", fontWeight: 900, color: "#16a34a", margin: "4px 0" }}>
                  ${bienesUso.reduce((acc, b) => acc + b.valorResidualArs, 0).toLocaleString("es-AR")}
                </div>
                <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>Patrimonio remanente en libros</span>
              </div>
            </div>

            {/* Tabla de Activos Fijos */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", background: "#f8fafc", borderBottom: "1px solid var(--line)" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 800, margin: 0, color: "var(--slate-800)" }}>
                  🚜 Padrón de Bienes de Uso & Criterios de Amortización Pluri-anual
                </h3>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                  <thead>
                    <tr style={{ background: "#ffffff", borderBottom: "2px solid var(--line)", textAlign: "left" }}>
                      <th style={{ padding: "10px 14px", fontWeight: 800, color: "var(--slate-600)" }}>Código & Activo</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--slate-600)" }}>Categoría</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--slate-600)" }}>Fecha Alta</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--slate-600)", textAlign: "right" }}>Valor Origen ($)</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--slate-600)", textAlign: "right" }}>Vida Útil</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--slate-600)", textAlign: "right" }}>Amort. Anual ($)</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--slate-600)", textAlign: "right" }}>Valor Residual ($)</th>
                      <th style={{ padding: "10px 14px", fontWeight: 800, color: "var(--slate-600)" }}>Distribución de Uso & Criterio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bienesUso.map((b) => (
                      <tr key={b.id} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", display: "block" }}>{b.codigoInterno}</span>
                          <strong style={{ color: "var(--slate-900)" }}>{b.nombre}</strong>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "#f1f5f9" }}>
                            {b.categoria}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "var(--slate-600)" }}>{b.fechaAdquisicion}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>${b.valorAdquisicionArs.toLocaleString("es-AR")}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{b.vidaUtilAnos} años</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#d97706" }}>${b.amortizacionAnualArs.toLocaleString("es-AR")}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#16a34a" }}>${b.valorResidualArs.toLocaleString("es-AR")}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "4px" }}>
                            {b.unidadesUsuarias.map((u, i) => {
                              const info = UNIDADES_ECONOMICAS_HJB[u.unidadId];
                              return (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 800,
                                    padding: "1px 5px",
                                    borderRadius: "3px",
                                    background: `${info?.color || "#64748b"}15`,
                                    color: info?.color || "#64748b",
                                  }}
                                >
                                  {info?.nombreCorto}: {u.porcentaje}%
                                </span>
                              );
                            })}
                          </div>
                          <span style={{ fontSize: "10.5px", color: "var(--slate-500)", display: "block" }}>
                            {b.criterioDistribucion}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 5: ESTRUCTURA & CENTROS DE COSTO */}
        {/* ========================================================================= */}
        {tabActiva === "centros_costo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Filtro por unidad de centro de costo */}
            <div className="card" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0, color: "var(--slate-800)" }}>
                  🏷️ Centros de Costo Oficiales de HJB
                </h3>
                <span style={{ fontSize: "12px", color: "var(--slate-500)" }}>
                  Estructura jerárquica para imputación por proceso productivo
                </span>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-600)" }}>Filtrar por Unidad:</span>
                <select
                  value={filtroUnidadCc}
                  onChange={(e) => setFiltroUnidadCc(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12.5px" }}
                >
                  <option value="TODAS">Todas las Unidades</option>
                  <option value="10-LECHE">10 — HJB Leche</option>
                  <option value="20-CEREALES">20 — HJB Cereales</option>
                  <option value="30-CARNE">30 — HJB Carne</option>
                  <option value="ADMINISTRACION">Administración</option>
                  <option value="PARTICULAR">Particular</option>
                </select>
              </div>
            </div>

            {/* Listado de Centros de Costo en Tarjetas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
              {centrosCostoFiltrados.map((cc) => {
                const unidadInfo = UNIDADES_ECONOMICAS_HJB[cc.unidadId];
                return (
                  <div
                    key={cc.id}
                    className="card"
                    style={{
                      padding: "16px",
                      borderLeft: `4px solid ${unidadInfo?.color || "#cbd5e1"}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 900,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: `${unidadInfo?.color || "#64748b"}15`,
                          color: unidadInfo?.color || "#64748b",
                        }}
                      >
                        {cc.codigo}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--slate-500)", fontWeight: 700 }}>
                        {unidadInfo?.nombreCorto}
                      </span>
                    </div>

                    <h4 style={{ fontSize: "14px", fontWeight: 800, margin: "0 0 6px", color: "var(--slate-900)" }}>
                      {cc.nombre}
                    </h4>

                    <p style={{ fontSize: "12px", color: "var(--slate-600)", margin: 0, lineHeight: 1.4 }}>
                      {cc.descripcion}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Presets de Costos Compartidos Configurados */}
            <div className="card" style={{ padding: "18px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 800, margin: "0 0 12px", color: "var(--slate-800)" }}>
                ⚡ Reglas Preestablecidas de Costos Compartidos (Auditables)
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "10px" }}>
                {REGLAS_DISTRIBUCION_DEFAULT.map((regla) => (
                  <div key={regla.id} style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid var(--line)" }}>
                    <strong style={{ fontSize: "12.5px", color: "var(--slate-800)", display: "block" }}>{regla.nombre}</strong>
                    <span style={{ fontSize: "11.5px", color: "var(--slate-500)", display: "block", margin: "2px 0 6px" }}>{regla.descripcion}</span>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {regla.distribucion.map((d, i) => {
                        const u = UNIDADES_ECONOMICAS_HJB[d.destino];
                        return (
                          <span
                            key={i}
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 800,
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: `${u?.color || "#64748b"}15`,
                              color: u?.color || "#64748b",
                            }}
                          >
                            {u?.nombreCorto}: {d.porcentaje}%
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Alta / Edición de Comprobante */}
        <ModalComprobante
          isOpen={modalNuevoComprobanteOpen}
          onClose={() => {
            setModalNuevoComprobanteOpen(false);
            setComprobanteParaEditar(null);
          }}
          comprobanteParaEditar={comprobanteParaEditar}
          onGuardadoExitoso={(comp) => {
            triggerFeedback(`✓ Comprobante ${comp.tipoComprobante} ${comp.letra} ${comp.puntoVenta}-${comp.numeroComprobante} guardado correctamente.`);
            setComprobantes(getComprobantes());
          }}
        />

        {/* Modal de Detalle y Auditoría */}
        <ModalDetalleComprobante
          isOpen={!!comprobanteSeleccionado}
          onClose={() => setComprobanteSeleccionado(null)}
          comprobante={comprobanteSeleccionado}
          onEditar={(comp) => {
            setComprobanteSeleccionado(null);
            setComprobanteParaEditar(comp);
            setModalNuevoComprobanteOpen(true);
          }}
          onActualizado={() => {
            setComprobantes(getComprobantes());
            triggerFeedback("✓ Comprobante actualizado.");
          }}
        />

        {/* Modal de Transferencias Internas */}
        <ModalTransferenciaInterna
          isOpen={modalTransferenciaOpen}
          onClose={() => {
            setModalTransferenciaOpen(false);
            setTransferenciaParaEditar(null);
          }}
          transferenciaParaEditar={transferenciaParaEditar}
          onGuardadoExitoso={(trans) => {
            triggerFeedback(`✓ Transferencia interna de ${trans.cantidad} ${trans.unidadMedida} por $${trans.importeTotal.toLocaleString("es-AR")} registrada.`);
            setTransferencias(getTransferenciasInternas());
          }}
        />
      </div>
    </AppShell>
  );
}
