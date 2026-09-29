"use client";

import { useState, useEffect, useMemo } from "react";
import AppShell from "@/components/AppShell";
import ModalComprobante from "@/components/administracion/ModalComprobante";
import ModalDetalleComprobante from "@/components/administracion/ModalDetalleComprobante";
import {
  ComprobanteGasto,
  DestinoEconomicoId,
  TipoEconomicoEgreso,
  UNIDADES_ECONOMICAS_HJB,
  TIPOS_EGRESO_INFO,
  getComprobantes,
  getCentrosCosto,
  getProveedores,
  calcularResumenEconomico,
  initAdministracionFirestoreSync,
  HJB_ADMIN_SYNC_EVENT,
} from "@/lib/administracionData";

type TabPrincipal = "comprobantes" | "capex" | "centros_costo" | "consolidado";

export default function AdministracionPage() {
  const [comprobantes, setComprobantes] = useState<ComprobanteGasto[]>([]);
  const [tabActiva, setTabActiva] = useState<TabPrincipal>("comprobantes");
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState<ComprobanteGasto | null>(null);
  const [comprobanteParaEditar, setComprobanteParaEditar] = useState<ComprobanteGasto | null>(null);

  // Filtros de Bandeja
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroUnidad, setFiltroUnidad] = useState<string>("TODAS");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [filtroEgreso, setFiltroEgreso] = useState<string>("TODOS");
  const [filtroCampana, setFiltroCampana] = useState<string>("TODAS");

  // Notificación / Feedback
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  function triggerFeedback(msg: string) {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  }

  // Carga inicial y suscripción reactiva en tiempo real a Firestore
  useEffect(() => {
    function cargar() {
      setComprobantes(getComprobantes());
    }
    cargar();
    const unsubscribe = initAdministracionFirestoreSync((docs) => {
      setComprobantes(docs);
    });
    window.addEventListener(HJB_ADMIN_SYNC_EVENT, cargar);
    return () => {
      unsubscribe();
      window.removeEventListener(HJB_ADMIN_SYNC_EVENT, cargar);
    };
  }, []);

  // Resumen Económico
  const resumen = useMemo(() => {
    return calcularResumenEconomico(comprobantes);
  }, [comprobantes]);

  // Filtrado de comprobantes
  const comprobantesFiltrados = useMemo(() => {
    return comprobantes.filter((c) => {
      // Filtro texto
      if (filtroTexto.trim()) {
        const q = filtroTexto.toLowerCase();
        const coincideProv = c.proveedorRazonSocial.toLowerCase().includes(q);
        const coincideCuit = c.proveedorCuit.includes(q);
        const coincideNum = `${c.puntoVenta}-${c.numeroComprobante}`.includes(q);
        const coincideDesc = c.descripcion.toLowerCase().includes(q);
        if (!coincideProv && !coincideCuit && !coincideNum && !coincideDesc) return false;
      }
      // Filtro unidad
      if (filtroUnidad !== "TODAS") {
        const tieneUnidad = c.imputaciones.some((imp) => imp.destino === filtroUnidad);
        if (!tieneUnidad) return false;
      }
      // Filtro estado
      if (filtroEstado !== "TODOS") {
        if (c.estadoImputacion !== filtroEstado) return false;
      }
      // Filtro egreso
      if (filtroEgreso !== "TODOS") {
        if (c.tipoEgreso !== filtroEgreso) return false;
      }
      // Filtro campaña
      if (filtroCampana !== "TODAS") {
        if (c.campana !== filtroCampana) return false;
      }
      return true;
    });
  }, [comprobantes, filtroTexto, filtroUnidad, filtroEstado, filtroEgreso, filtroCampana]);

  // Centros de costo agrupados
  const centrosCosto = useMemo(() => getCentrosCosto(), []);
  const proveedores = useMemo(() => getProveedores(), []);

  return (
    <AppShell active="Administración">
      <div style={{ maxWidth: "1400px", margin: "0 auto", paddingBottom: "60px" }}>
        
        {/* Banner de Feedback */}
        {feedbackMsg && (
          <div
            style={{
              background: "#16a34a",
              color: "white",
              padding: "10px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontWeight: 700,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            <span>{feedbackMsg}</span>
            <button onClick={() => setFeedbackMsg(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {/* Encabezado del Módulo */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "28px" }}>📊</span>
              <h1 style={{ fontSize: "24px", fontWeight: 900, margin: 0, color: "var(--slate-900)" }}>
                Administración & Gestión Económica
              </h1>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--slate-500)" }}>
              Control documental, imputación obligatoria 100%, centros de costo y resultados por unidad productiva (Metodología CREA)
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => {
                setComprobanteParaEditar(null);
                setModalNuevoOpen(true);
              }}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "9px 16px",
                fontSize: "13px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(37,99,235,0.25)",
              }}
            >
              <span>➕</span> Nuevo Comprobante
            </button>
          </div>
        </div>

        {/* Tarjetas Principales de KPIs Económicos */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px", marginBottom: "22px" }}>
          
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
              Insumos, labores, combustibles y servicios del período
            </div>
          </div>

          {/* Card 3: CAPEX (Inversiones / Bienes de Uso) */}
          <div className="card" style={{ padding: "16px", borderLeft: "4px solid #d97706" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                Inversiones (CAPEX)
              </span>
              <span style={{ fontSize: "18px" }}>🚜</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "#b45309", margin: "6px 0 2px" }}>
              ${resumen.totalInversionCapexArs.toLocaleString("es-AR")}
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--slate-500)" }}>
              Bienes de uso amortizables (no impactan como gasto corriente)
            </div>
          </div>

          {/* Card 4: Alertas de Control / Pendientes Imputación */}
          <div
            className="card"
            style={{
              padding: "16px",
              borderLeft: resumen.pendientesDeImputacionCount > 0 ? "4px solid #dc2626" : "4px solid #16a34a",
              background: resumen.pendientesDeImputacionCount > 0 ? "#fffbeb" : "white",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                Control de Imputación
              </span>
              <span style={{ fontSize: "18px" }}>{resumen.pendientesDeImputacionCount > 0 ? "⚠️" : "✓"}</span>
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 900,
                color: resumen.pendientesDeImputacionCount > 0 ? "#b45309" : "#166534",
                margin: "6px 0 2px",
              }}
            >
              {resumen.pendientesDeImputacionCount} {resumen.pendientesDeImputacionCount === 1 ? "Borrador" : "Borradores"}
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--slate-500)" }}>
              {resumen.pendientesDeImputacionCount > 0
                ? `$${resumen.importePendienteImputarArs.toLocaleString("es-AR")} pendientes de imputar 100%`
                : "100% de comprobantes imputados y cuadrados"}
            </div>
          </div>

          {/* Card 5: Destino Particular Aislado */}
          <div className="card" style={{ padding: "16px", borderLeft: "4px solid #64748b" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                Particular (Aislado)
              </span>
              <span style={{ fontSize: "18px" }}>👤</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "#475569", margin: "6px 0 2px" }}>
              ${resumen.totalGastoParticularAisladoArs.toLocaleString("es-AR")}
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--slate-500)" }}>
              Gastos no HJB (excluidos del resultado económico de la firma)
            </div>
          </div>
        </div>

        {/* Distribución Económica por Unidad Productiva */}
        <div className="card" style={{ padding: "18px 20px", marginBottom: "22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--slate-700)", textTransform: "uppercase" }}>
              Distribución Económica por Unidad de Negocio (Consolidado HJB)
            </span>
            <span style={{ fontSize: "12px", color: "var(--slate-500)" }}>
              Base: ${resumen.totalGastoEmpresarialHjbArs.toLocaleString("es-AR")}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            {(["10-LECHE", "20-CEREALES", "30-CARNE", "ADMINISTRACION"] as DestinoEconomicoId[]).map((uId) => {
              const u = resumen.distribucionPorUnidad[uId];
              const info = UNIDADES_ECONOMICAS_HJB[uId];
              return (
                <div
                  key={uId}
                  style={{
                    background: "#f8fafc",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    borderLeft: `4px solid ${info.color}`,
                    borderTop: "1px solid var(--line)",
                    borderRight: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: info.color }}>
                      {info.nombre}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 900 }}>
                      {u.porcentajeDelConsolidado}%
                    </span>
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "var(--slate-900)", margin: "4px 0" }}>
                    ${u.totalImputadoArs.toLocaleString("es-AR")}
                  </div>
                  <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden", marginTop: "6px" }}>
                    <div style={{ width: `${u.porcentajeDelConsolidado}%`, background: info.color, height: "100%" }} />
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--slate-400)", marginTop: "4px" }}>
                    {u.comprobantesAfectados} comprobantes imputados
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PESTAÑAS PRINCIPALES DEL MÓDULO */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "2px solid var(--line)", marginBottom: "18px" }}>
          <button
            onClick={() => setTabActiva("comprobantes")}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom: tabActiva === "comprobantes" ? "3px solid #2563eb" : "3px solid transparent",
              color: tabActiva === "comprobantes" ? "#2563eb" : "var(--slate-600)",
              fontWeight: 800,
              fontSize: "13.5px",
              cursor: "pointer",
            }}
          >
            📑 Bandeja de Comprobantes ({comprobantes.length})
          </button>

          <button
            onClick={() => setTabActiva("consolidado")}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom: tabActiva === "consolidado" ? "3px solid #2563eb" : "3px solid transparent",
              color: tabActiva === "consolidado" ? "#2563eb" : "var(--slate-600)",
              fontWeight: 800,
              fontSize: "13.5px",
              cursor: "pointer",
            }}
          >
            📈 Consolidado por Unidad CREA
          </button>

          <button
            onClick={() => setTabActiva("capex")}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom: tabActiva === "capex" ? "3px solid #2563eb" : "3px solid transparent",
              color: tabActiva === "capex" ? "#2563eb" : "var(--slate-600)",
              fontWeight: 800,
              fontSize: "13.5px",
              cursor: "pointer",
            }}
          >
            🚜 Bienes de Uso (CAPEX)
          </button>

          <button
            onClick={() => setTabActiva("centros_costo")}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom: tabActiva === "centros_costo" ? "3px solid #2563eb" : "3px solid transparent",
              color: tabActiva === "centros_costo" ? "#2563eb" : "var(--slate-600)",
              fontWeight: 800,
              fontSize: "13.5px",
              cursor: "pointer",
            }}
          >
            🏛️ Centros de Costo & Maestros ({centrosCosto.length})
          </button>
        </div>

        {/* TAB 1: BANDEJA DE COMPROBANTES */}
        {tabActiva === "comprobantes" && (
          <div className="card" style={{ padding: "18px 20px" }}>
            
            {/* Barra de Filtros */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              <input
                type="text"
                placeholder="🔍 Buscar por proveedor, CUIT, número o detalle..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
              />

              <select
                value={filtroUnidad}
                onChange={(e) => setFiltroUnidad(e.target.value)}
                style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", background: "white", fontSize: "12.5px" }}
              >
                <option value="TODAS">Unidad: Todas</option>
                <option value="10-LECHE">10 — HJB Leche</option>
                <option value="20-CEREALES">20 — HJB Cereales</option>
                <option value="30-CARNE">30 — HJB Carne</option>
                <option value="ADMINISTRACION">Administración</option>
                <option value="PARTICULAR">Particular</option>
              </select>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", background: "white", fontSize: "12.5px" }}
              >
                <option value="TODOS">Estado: Todos</option>
                <option value="CONFIRMADO">Confirmados</option>
                <option value="IMPUTADO_100">Imputado 100%</option>
                <option value="IMPUTACION_PARCIAL">Borrador / Parcial</option>
                <option value="ANULADO">Anulados</option>
              </select>

              <select
                value={filtroEgreso}
                onChange={(e) => setFiltroEgreso(e.target.value)}
                style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", background: "white", fontSize: "12.5px" }}
              >
                <option value="TODOS">Tipo Egreso: Todos</option>
                <option value="GASTO_OPERATIVO">Gasto Operativo (OPEX)</option>
                <option value="INVERSION_CAPEX">Inversión (CAPEX)</option>
                <option value="EXTRAORDINARIO">Extraordinario</option>
              </select>

              <select
                value={filtroCampana}
                onChange={(e) => setFiltroCampana(e.target.value)}
                style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", background: "white", fontSize: "12.5px" }}
              >
                <option value="TODAS">Campaña: Todas</option>
                <option value="2026/27">Campaña 2026/27</option>
                <option value="2025/26">Campaña 2025/26</option>
              </select>
            </div>

            {/* Tabla de Comprobantes */}
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Comprobante</th>
                    <th>Proveedor & CUIT</th>
                    <th>Tipo Egreso</th>
                    <th style={{ textAlign: "right" }}>Total ($)</th>
                    <th>Imputación Económica</th>
                    <th>Estado</th>
                    <th style={{ textAlign: "center" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {comprobantesFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--slate-500)" }}>
                        No se encontraron comprobantes con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    comprobantesFiltrados.map((comp) => {
                      const egreso = TIPOS_EGRESO_INFO[comp.tipoEgreso];
                      return (
                        <tr
                          key={comp.id}
                          style={{
                            background: comp.estadoImputacion === "ANULADO" ? "#f8fafc" : "white",
                            opacity: comp.estadoImputacion === "ANULADO" ? 0.65 : 1,
                          }}
                        >
                          <td style={{ whiteSpace: "nowrap", fontSize: "12px", fontWeight: 600 }}>
                            {comp.fechaComprobante}
                          </td>

                          <td>
                            <strong style={{ fontSize: "13px" }}>
                              {comp.tipoComprobante} {comp.letra}
                            </strong>
                            <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                              {comp.puntoVenta}-{comp.numeroComprobante}
                            </div>
                          </td>

                          <td>
                            <strong style={{ fontSize: "13px" }}>{comp.proveedorRazonSocial}</strong>
                            <div style={{ fontSize: "11px", color: "var(--slate-400)" }}>
                              CUIT: {comp.proveedorCuit}
                            </div>
                          </td>

                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: `${egreso.badgeColor}15`,
                                color: egreso.badgeColor,
                                border: `1px solid ${egreso.badgeColor}40`,
                              }}
                            >
                              {egreso.nombre}
                            </span>
                          </td>

                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <strong style={{ fontSize: "14px", color: "var(--slate-900)" }}>
                              ${comp.totalComprobante.toLocaleString("es-AR")}
                            </strong>
                          </td>

                          <td>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {comp.imputaciones.map((imp, idx) => {
                                const u = UNIDADES_ECONOMICAS_HJB[imp.destino];
                                return (
                                  <span
                                    key={idx}
                                    style={{
                                      fontSize: "10.5px",
                                      fontWeight: 700,
                                      padding: "1px 6px",
                                      borderRadius: "3px",
                                      background: `${u?.color || "#94a3b8"}18`,
                                      color: u?.color || "#475569",
                                      border: `1px solid ${u?.color || "#94a3b8"}40`,
                                    }}
                                    title={`${u?.nombre}: ${imp.porcentaje}% ($${imp.importeCalculado.toLocaleString("es-AR")})`}
                                  >
                                    {u?.nombreCorto || imp.destino} ({imp.porcentaje}%)
                                  </span>
                                );
                              })}
                            </div>
                            {comp.porcentajeImputadoTotal < 100 && (
                              <div style={{ fontSize: "10.5px", color: "#b45309", fontWeight: 700, marginTop: "2px" }}>
                                ⚠️ Falta {100 - comp.porcentajeImputadoTotal}% ($
                                {(comp.diferenciaPendienteImporte || 0).toLocaleString("es-AR")})
                              </div>
                            )}
                          </td>

                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: "11px",
                                fontWeight: 800,
                                padding: "3px 8px",
                                borderRadius: "10px",
                                background:
                                  comp.estadoImputacion === "CONFIRMADO"
                                    ? "#dcfce7"
                                    : comp.estadoImputacion === "IMPUTACION_PARCIAL"
                                    ? "#fef3c7"
                                    : comp.estadoImputacion === "ANULADO"
                                    ? "#fee2e2"
                                    : "#dbeafe",
                                color:
                                  comp.estadoImputacion === "CONFIRMADO"
                                    ? "#166534"
                                    : comp.estadoImputacion === "IMPUTACION_PARCIAL"
                                    ? "#92400e"
                                    : comp.estadoImputacion === "ANULADO"
                                    ? "#991b1b"
                                    : "#1e40af",
                              }}
                            >
                              {comp.estadoImputacion}
                            </span>
                          </td>

                          <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                              <button
                                onClick={() => setComprobanteSeleccionado(comp)}
                                style={{
                                  background: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "4px",
                                  padding: "4px 8px",
                                  fontSize: "11.5px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                title="Ver detalle y auditoría"
                              >
                                👁️ Ver
                              </button>
                              {comp.estadoImputacion !== "ANULADO" && (
                                <button
                                  onClick={() => {
                                    setComprobanteParaEditar(comp);
                                    setModalNuevoOpen(true);
                                  }}
                                  style={{
                                    background: "#eff6ff",
                                    border: "1px solid #bfdbfe",
                                    color: "#1d4ed8",
                                    borderRadius: "4px",
                                    padding: "4px 8px",
                                    fontSize: "11.5px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                  title="Editar comprobante"
                                >
                                  ✏️ Editar
                                </button>
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
        )}

        {/* TAB 2: CONSOLIDADO ECONÓMICO POR UNIDAD (METODOLOGÍA CREA) */}
        {tabActiva === "consolidado" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="card" style={{ padding: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, margin: "0 0 12px" }}>
                Cuadro Consolidado de Gastos por Destino Económico HJB
              </h2>
              <p style={{ fontSize: "12.5px", color: "var(--slate-500)", margin: "0 0 16px" }}>
                El siguiente informe clasifica los egresos de acuerdo a su destino final y tipo de gasto (OPEX vs CAPEX), garantizando que las operaciones <strong>Particulares</strong> se mantengan excluidas del resultado de la firma agropecuaria.
              </p>

              <div className="tableWrap">
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th>Destino / Unidad Económica</th>
                      <th>Tipo de Unidad</th>
                      <th style={{ textAlign: "right" }}>Gasto OPEX ($)</th>
                      <th style={{ textAlign: "right" }}>Inversión CAPEX ($)</th>
                      <th style={{ textAlign: "right" }}>Total Imputado ($)</th>
                      <th style={{ textAlign: "right" }}>% Consolidado HJB</th>
                      <th>Criterio de Consolidación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["10-LECHE", "20-CEREALES", "30-CARNE", "ADMINISTRACION", "PARTICULAR"] as DestinoEconomicoId[]).map((uId) => {
                      const info = UNIDADES_ECONOMICAS_HJB[uId];
                      const compsDeEstaUnidad = comprobantes.filter(
                        (c) => c.estadoImputacion !== "ANULADO" && c.imputaciones.some((imp) => imp.destino === uId)
                      );
                      let opex = 0;
                      let capex = 0;
                      for (const c of compsDeEstaUnidad) {
                        for (const imp of c.imputaciones) {
                          if (imp.destino === uId) {
                            if (c.tipoEgreso === "INVERSION_CAPEX") {
                              capex += imp.importeCalculado;
                            } else {
                              opex += imp.importeCalculado;
                            }
                          }
                        }
                      }
                      const total = opex + capex;
                      const pct =
                        uId === "PARTICULAR"
                          ? "N/A"
                          : `${Number(((total / (resumen.totalGastoEmpresarialHjbArs || 1)) * 100).toFixed(1))}%`;

                      return (
                        <tr
                          key={uId}
                          style={{
                            background: uId === "PARTICULAR" ? "#f8fafc" : "white",
                          }}
                        >
                          <td>
                            <strong style={{ fontSize: "13px", color: info.color }}>
                              {info.codigoOficial} — {info.nombre}
                            </strong>
                            <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                              {info.productoFinalPrincipal}
                            </div>
                          </td>

                          <td>
                            <span style={{ fontSize: "12px", fontWeight: 600 }}>
                              {info.esProductiva ? "Unidad Productiva" : uId === "ADMINISTRACION" ? "Capa Transversal" : "No Empresarial"}
                            </span>
                          </td>

                          <td style={{ textAlign: "right", fontWeight: 700 }}>
                            ${opex.toLocaleString("es-AR")}
                          </td>

                          <td style={{ textAlign: "right", fontWeight: 700, color: capex > 0 ? "#b45309" : "inherit" }}>
                            ${capex.toLocaleString("es-AR")}
                          </td>

                          <td style={{ textAlign: "right", fontWeight: 900, fontSize: "14px" }}>
                            ${total.toLocaleString("es-AR")}
                          </td>

                          <td style={{ textAlign: "right", fontWeight: 800 }}>
                            {pct}
                          </td>

                          <td style={{ fontSize: "11.5px" }}>
                            {uId === "PARTICULAR" ? (
                              <span style={{ color: "#dc2626", fontWeight: 700 }}>
                                🚫 Excluido del resultado empresarial HJB
                              </span>
                            ) : (
                              <span style={{ color: "#16a34a", fontWeight: 600 }}>
                                ✓ Integrado al consolidado oficial
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f1f5f9", fontWeight: 900 }}>
                      <td colSpan={2}>TOTAL CONSOLIDADO OFICIAL HJB (Sin Particular)</td>
                      <td style={{ textAlign: "right" }}>${resumen.totalGastoOperativoOpexArs.toLocaleString("es-AR")}</td>
                      <td style={{ textAlign: "right" }}>${resumen.totalInversionCapexArs.toLocaleString("es-AR")}</td>
                      <td style={{ textAlign: "right", fontSize: "15px", color: "#2563eb" }}>
                        ${resumen.totalGastoEmpresarialHjbArs.toLocaleString("es-AR")}
                      </td>
                      <td style={{ textAlign: "right" }}>100.0%</td>
                      <td>✓ Cuadre auditado</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BIENES DE USO & CAPEX */}
        {tabActiva === "capex" && (
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>
                  🚜 Registro de Bienes de Uso & Inversiones (CAPEX)
                </h2>
                <span style={{ fontSize: "12px", color: "var(--slate-500)" }}>
                  Activos fijos amortizables en múltiples ejercicios agrícolas
                </span>
              </div>
            </div>

            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Fecha Compra</th>
                    <th>Bien de Uso / Activo</th>
                    <th>Comprobante</th>
                    <th>Proveedor</th>
                    <th>Categoría</th>
                    <th>Vida Útil</th>
                    <th style={{ textAlign: "right" }}>Valor Adquisición ($)</th>
                    <th>Unidades Usuarias</th>
                  </tr>
                </thead>
                <tbody>
                  {comprobantes
                    .filter((c) => c.tipoEgreso === "INVERSION_CAPEX" && c.estadoImputacion !== "ANULADO")
                    .map((comp) => (
                      <tr key={comp.id}>
                        <td style={{ whiteSpace: "nowrap" }}>{comp.fechaComprobante}</td>
                        <td>
                          <strong>{comp.datosCapex?.descripcionActivo || comp.descripcion}</strong>
                        </td>
                        <td>{comp.tipoComprobante} {comp.letra} {comp.puntoVenta}-{comp.numeroComprobante}</td>
                        <td>{comp.proveedorRazonSocial}</td>
                        <td>{comp.datosCapex?.categoriaActivo || "Implemento"}</td>
                        <td><strong>{comp.datosCapex?.vidaUtilAnos || 10} años</strong> (Lineal)</td>
                        <td style={{ textAlign: "right", fontWeight: 900, color: "#b45309" }}>
                          ${comp.totalComprobante.toLocaleString("es-AR")}
                        </td>
                        <td>
                          {comp.imputaciones.map((imp, idx) => (
                            <span key={idx} style={{ fontSize: "11px", fontWeight: 700, marginRight: "4px" }}>
                              {UNIDADES_ECONOMICAS_HJB[imp.destino]?.nombreCorto} ({imp.porcentaje}%)
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CENTROS DE COSTO & TABLAS MAESTRAS */}
        {tabActiva === "centros_costo" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            
            {/* Centros de Costo Oficiales */}
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 800, margin: "0 0 12px" }}>
                🏛️ Centros de Costo Oficiales por Unidad
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "550px", overflowY: "auto" }}>
                {centrosCosto.map((cc) => {
                  const u = UNIDADES_ECONOMICAS_HJB[cc.unidadId];
                  return (
                    <div
                      key={cc.id}
                      style={{
                        padding: "10px 12px",
                        background: "#f8fafc",
                        borderRadius: "6px",
                        borderLeft: `4px solid ${u?.color || "#94a3b8"}`,
                        borderTop: "1px solid var(--line)",
                        borderRight: "1px solid var(--line)",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "12.5px" }}>{cc.codigo} — {cc.nombre}</strong>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: u?.color }}>
                          {u?.nombreCorto}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                        {cc.descripcion}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Proveedores Maestros */}
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 800, margin: "0 0 12px" }}>
                🏭 Padrón de Proveedores Agropecuarios
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "550px", overflowY: "auto" }}>
                {proveedores.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "10px 12px",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "13px" }}>{p.razonSocial}</strong>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#166534", background: "#dcfce7", padding: "1px 6px", borderRadius: "3px" }}>
                        {p.condicionIva === "RESPONSABLE_INSCRIPTO" ? "Resp. Inscripto" : "Monotributo"}
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--slate-600)", marginTop: "2px" }}>
                      CUIT: {p.cuit} · {p.rubroPrincipal} ({p.localidad})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modales */}
        {modalNuevoOpen && (
          <ModalComprobante
            isOpen={modalNuevoOpen}
            onClose={() => setModalNuevoOpen(false)}
            comprobanteParaEditar={comprobanteParaEditar}
            onGuardadoExitoso={(comp) => {
              setComprobantes(getComprobantes());
              triggerFeedback(`✓ Comprobante ${comp.tipoComprobante} ${comp.puntoVenta}-${comp.numeroComprobante} guardado correctamente (Estado: ${comp.estadoImputacion}).`);
            }}
          />
        )}

        {comprobanteSeleccionado && (
          <ModalDetalleComprobante
            isOpen={!!comprobanteSeleccionado}
            onClose={() => setComprobanteSeleccionado(null)}
            comprobante={comprobanteSeleccionado}
            onEditar={(comp) => {
              setComprobanteParaEditar(comp);
              setModalNuevoOpen(true);
            }}
            onActualizado={() => {
              setComprobantes(getComprobantes());
              triggerFeedback("✓ Comprobante actualizado.");
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
