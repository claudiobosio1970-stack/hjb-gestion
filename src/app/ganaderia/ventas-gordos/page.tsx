"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  VentaGordoExpediente,
  getVentasGordos,
  initVentasGordosFirestoreSync,
  HJB_VENTAS_GORDOS_SYNC_EVENT,
  getEstadoDocumentacion,
  eliminarVentaGordoLogico,
  EstadoVentaGordo,
} from "@/lib/ventasGordosData";
import ModalProyeccionVenta from "@/components/ventas-gordos/ModalProyeccionVenta";
import ModalExpedienteCompleto from "@/components/ventas-gordos/ModalExpedienteCompleto";
import ModalCierreVentaDefinitivo from "@/components/ventas-gordos/ModalCierreVentaDefinitivo";
import ModalHistoricoComparativo from "@/components/ventas-gordos/ModalHistoricoComparativo";

export default function VentasGordosPage() {
  const [ventas, setVentas] = useState<VentaGordoExpediente[]>([]);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | EstadoVentaGordo>("TODOS");
  const [filtroMetodo, setFiltroMetodo] = useState<"TODOS" | "KILO_VIVO" | "RENDIMIENTO">("TODOS");

  // Modales
  const [modalProyeccionOpen, setModalProyeccionOpen] = useState(false);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState<VentaGordoExpediente | null>(null);
  const [ventaParaCerrar, setVentaParaCerrar] = useState<VentaGordoExpediente | null>(null);
  const [modalHistoricoOpen, setModalHistoricoOpen] = useState(false);

  // Carga inicial y sync en tiempo real
  function refrescarVentas() {
    const data = getVentasGordos();
    setVentas((prev) => {
      if (prev.length === data.length && JSON.stringify(prev) === JSON.stringify(data)) {
        return prev;
      }
      return data;
    });
  }

  useEffect(() => {
    refrescarVentas();
    const unsubFirestore = initVentasGordosFirestoreSync();
    window.addEventListener(HJB_VENTAS_GORDOS_SYNC_EVENT, refrescarVentas);

    return () => {
      unsubFirestore();
      window.removeEventListener(HJB_VENTAS_GORDOS_SYNC_EVENT, refrescarVentas);
    };
  }, []);

  // Filtrado de expedientes activos (no eliminados lógicamente)
  const ventasActivas = useMemo(() => {
    return ventas.filter((v) => !v.eliminadoLogico);
  }, [ventas]);

  const ventasFiltradas = useMemo(() => {
    return ventasActivas.filter((v) => {
      // Filtro texto
      const texto = filtroTexto.trim().toLowerCase();
      const cumpleTexto =
        texto === "" ||
        `venta n° ${v.numeroVenta}`.includes(texto) ||
        `v-${v.numeroVenta}`.includes(texto) ||
        (v.clienteNombre || "").toLowerCase().includes(texto) ||
        (v.frigorificoDestino || "").toLowerCase().includes(texto);

      // Filtro estado
      const cumpleEstado = filtroEstado === "TODOS" || v.estado === filtroEstado;

      // Filtro método
      const cumpleMetodo = filtroMetodo === "TODOS" || v.metodoElegido === filtroMetodo;

      return cumpleTexto && cumpleEstado && cumpleMetodo;
    });
  }, [ventasActivas, filtroTexto, filtroEstado, filtroMetodo]);

  // Contadores para KPIs
  const countTotal = ventasActivas.length;
  const countProyeccion = ventasActivas.filter((v) => v.estado === "PROYECCION").length;
  const countTemporal = ventasActivas.filter((v) => v.estado === "TEMPORAL").length;
  const countDefinitivo = ventasActivas.filter((v) => v.estado === "DEFINITIVO").length;

  const margenPromedioDefinitivo = useMemo(() => {
    const cerradas = ventasActivas.filter((v) => v.estado === "DEFINITIVO" && v.liquidacionReal);
    if (cerradas.length === 0) return 0;
    const totalMargen = cerradas.reduce((acc, v) => acc + (v.liquidacionReal?.margenOperativoRealArs || 0), 0);
    const totalCab = cerradas.reduce((acc, v) => acc + (v.cantidadReal || v.cantidadEstimada || 0), 0);
    return totalCab > 0 ? Math.round(totalMargen / totalCab) : 0;
  }, [ventasActivas]);

  // Manejo de actualización tras cerrar o editar
  function handleVentaActualizada(actualizada: VentaGordoExpediente) {
    refrescarVentas();
    if (expedienteSeleccionado?.id === actualizada.id) {
      setExpedienteSeleccionado(actualizada);
    }
  }

  function handleEliminarRapido(venta: VentaGordoExpediente) {
    const motivo = prompt(`¿Confirma eliminar la Venta N° ${venta.numeroVenta}? Ingrese el motivo de la baja:`);
    if (!motivo) return;
    eliminarVentaGordoLogico({
      ventaId: venta.id,
      motivo,
      usuario: "Operador",
    });
    refrescarVentas();
  }

  const badgeEstado: Record<string, { bg: string; text: string; label: string }> = {
    PROYECCION: { bg: "#eff6ff", text: "#1d4ed8", label: "PROYECCIÓN" },
    TEMPORAL: { bg: "#fef3c7", text: "#b45309", label: "TEMPORAL" },
    DEFINITIVO: { bg: "#f0fdf4", text: "#15803d", label: "DEFINITIVO" },
    CANCELADO: { bg: "#f1f5f9", text: "#64748b", label: "CANCELADO" },
  };

  return (
    <AppShell active="Ventas de Gordos">
      {/* Encabezado */}
      <div className="pageHeader">
        <div>
          <div className="badgeRow" style={{ marginBottom: "6px" }}>
            <Link
              href="/ganaderia"
              style={{
                textDecoration: "none",
                fontSize: "12px",
                color: "#2563eb",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              ← Volver a Ganadería
            </Link>
            <span className="pill badgeAmber">HJB Carne</span>
            <span className="pill badgeGreen">Gestión por Expediente Único</span>
          </div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span>🥩</span> Ventas de Gordos
          </h1>
          <p className="muted">
            Gestione integralmente cada operación de venta de novillos desde su primera proyección económica hasta el cierre definitivo y análisis de desvíos reales de frigorífico.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="ghostButton"
            onClick={() => setModalHistoricoOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            📊 Ver Histórico Consolidado
          </button>
          <button
            type="button"
            className="primaryButton"
            onClick={() => setModalProyeccionOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "#16a34a" }}
          >
            <span>+</span> Nueva Venta / Proyector
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Operaciones */}
      <div className="metricsGrid" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: "20px" }}>
        <div className="metricCard">
          <div className="metricCardHeader">
            <span className="metricLabel">EXPEDIENTES ACTIVOS</span>
            <span>📁</span>
          </div>
          <div className="metricValue">{countTotal}</div>
          <div className="metricSubtext">En todas las etapas</div>
        </div>

        <div className="metricCard">
          <div className="metricCardHeader">
            <span className="metricLabel">EN PROYECCIÓN</span>
            <span style={{ color: "#2563eb" }}>📝</span>
          </div>
          <div className="metricValue" style={{ color: "#2563eb" }}>{countProyeccion}</div>
          <div className="metricSubtext">Presupuestos / Comparativas</div>
        </div>

        <div className="metricCard">
          <div className="metricCardHeader">
            <span className="metricLabel">VENTAS TEMPORALES</span>
            <span style={{ color: "#d97706" }}>⏱️</span>
          </div>
          <div className="metricValue" style={{ color: "#d97706" }}>{countTemporal}</div>
          <div className="metricSubtext">Decididas, en tránsito o faena</div>
        </div>

        <div className="metricCard">
          <div className="metricCardHeader">
            <span className="metricLabel">VENTAS DEFINITIVAS</span>
            <span style={{ color: "#16a34a" }}>🏁</span>
          </div>
          <div className="metricValue" style={{ color: "#16a34a" }}>{countDefinitivo}</div>
          <div className="metricSubtext">Cerradas con liquidación real</div>
        </div>

        <div className="metricCard" style={{ backgroundColor: "#f0fdf4", border: "1px solid #86efac" }}>
          <div className="metricCardHeader">
            <span className="metricLabel" style={{ color: "#166534" }}>MARGEN REAL PROMEDIO</span>
            <span>💰</span>
          </div>
          <div className="metricValue" style={{ color: "#15803d" }}>
            ${margenPromedioDefinitivo.toLocaleString("es-AR")}
          </div>
          <div className="metricSubtext" style={{ color: "#166534" }}>Por animal terminado</div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div
        className="card"
        style={{
          padding: "14px 18px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Input Buscador */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              type="text"
              placeholder="🔍 Buscar N° venta, cliente, frigorífico..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              style={{
                padding: "7px 12px",
                fontSize: "13px",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                minWidth: "260px",
              }}
            />
            {filtroTexto && (
              <button
                type="button"
                className="ghostButton"
                onClick={() => setFiltroTexto("")}
                style={{ padding: "6px 10px", fontSize: "12px" }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros de Estado */}
          <div style={{ display: "flex", gap: "4px" }}>
            {(["TODOS", "PROYECCION", "TEMPORAL", "DEFINITIVO"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFiltroEstado(st)}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: filtroEstado === st ? "#0f172a" : "#f1f5f9",
                  color: filtroEstado === st ? "#ffffff" : "#475569",
                }}
              >
                {st === "TODOS"
                  ? "Todos"
                  : st === "PROYECCION"
                  ? "Proyección"
                  : st === "TEMPORAL"
                  ? "Temporal"
                  : "Definitivo"}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro por Método */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "var(--slate-500)", fontWeight: 600 }}>Método:</span>
          <select
            value={filtroMetodo}
            onChange={(e) => setFiltroMetodo(e.target.value as any)}
            style={{
              padding: "6px 10px",
              fontSize: "12.5px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
            }}
          >
            <option value="TODOS">Todos los métodos</option>
            <option value="RENDIMIENTO">A Rendimiento</option>
            <option value="KILO_VIVO">Por Kilo Vivo</option>
          </select>
        </div>
      </div>

      {/* Tabla Principal de Expedientes */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>N° Venta</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Cliente / Comprador</th>
                <th>Cantidad</th>
                <th>Peso Lote</th>
                <th>Método</th>
                <th style={{ textAlign: "right" }}>Ingreso (Est. / Real)</th>
                <th style={{ textAlign: "right" }}>Margen Operativo</th>
                <th>Documentos</th>
                <th>Última Actividad</th>
                <th style={{ textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: "center", padding: "40px", color: "var(--slate-500)" }}>
                    No se encontraron operaciones de venta de gordos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                ventasFiltradas.map((v) => {
                  const stBadge = badgeEstado[v.estado] || badgeEstado.PROYECCION;
                  const docSt = getEstadoDocumentacion(v.documentos || []);
                  const esDef = v.estado === "DEFINITIVO" && v.liquidacionReal;

                  const ingresoMostrar = esDef
                    ? v.liquidacionReal!.ingresoBrutoRealArs
                    : v.metodoElegido === "RENDIMIENTO"
                    ? v.proyeccion.altRendimiento.ingresoBrutoEstimadoArs
                    : v.proyeccion.altKiloVivo.ingresoBrutoEstimadoArs;

                  const margenMostrar = esDef
                    ? v.liquidacionReal!.margenOperativoRealArs
                    : v.metodoElegido === "RENDIMIENTO"
                    ? v.proyeccion.altRendimiento.margenOperativoEstimadoArs
                    : v.proyeccion.altKiloVivo.margenOperativoEstimadoArs;

                  const margenCabMostrar = esDef
                    ? v.liquidacionReal!.margenRealPorAnimalArs
                    : v.metodoElegido === "RENDIMIENTO"
                    ? v.proyeccion.altRendimiento.margenPorAnimalArs
                    : v.proyeccion.altKiloVivo.margenPorAnimalArs;

                  return (
                    <tr key={v.id} style={{ transition: "background 0.15s" }}>
                      <td>
                        <button
                          type="button"
                          onClick={() => setExpedienteSeleccionado(v)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            color: "#2563eb",
                            fontFamily: "monospace",
                            fontSize: "14px",
                            fontWeight: 800,
                            textAlign: "left",
                          }}
                        >
                          Venta N° {v.numeroVenta}
                        </button>
                      </td>
                      <td>
                        <span
                          style={{
                            backgroundColor: stBadge.bg,
                            color: stBadge.text,
                            padding: "3px 8px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 800,
                            letterSpacing: "0.5px",
                          }}
                        >
                          {stBadge.label}
                        </span>
                      </td>
                      <td style={{ fontSize: "12.5px" }}>{v.fechaReal || v.fechaEstimada}</td>
                      <td>
                        <strong style={{ fontSize: "13px", color: "var(--slate-800)" }}>{v.clienteNombre}</strong>
                        <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>{v.frigorificoDestino}</div>
                      </td>
                      <td>
                        <strong>{v.cantidadReal || v.cantidadEstimada}</strong> cab.
                      </td>
                      <td>
                        {(v.pesoCampoRealKg || v.pesoCampoEstimadoKg).toLocaleString("es-AR")} kg
                        <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                          {(
                            (v.pesoCampoRealKg || v.pesoCampoEstimadoKg) /
                            (v.cantidadReal || v.cantidadEstimada || 1)
                          ).toFixed(1)}{" "}
                          kg/cab
                        </div>
                      </td>
                      <td>
                        {v.metodoElegido ? (
                          <span
                            className={`pill ${v.metodoElegido === "RENDIMIENTO" ? "badgeGreen" : "badgeBlue"}`}
                            style={{ fontSize: "10.5px" }}
                          >
                            {v.metodoElegido === "RENDIMIENTO" ? "Rendimiento" : "Kilo Vivo"}
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", color: "var(--slate-400)" }}>En evaluación</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <strong style={{ fontSize: "13.5px", color: esDef ? "#166534" : "#0f172a" }}>
                          ${ingresoMostrar.toLocaleString("es-AR")}
                        </strong>
                        <div style={{ fontSize: "10.5px", color: esDef ? "#16a34a" : "var(--slate-400)" }}>
                          {esDef ? "Liquidado Real" : "Estimado s/ método"}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <strong
                          style={{
                            fontSize: "13.5px",
                            color: margenMostrar >= 0 ? "#15803d" : "#dc2626",
                          }}
                        >
                          ${margenMostrar.toLocaleString("es-AR")}
                        </strong>
                        <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>
                          ${margenCabMostrar.toLocaleString("es-AR")} / cab
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: docSt.color,
                            backgroundColor: "#f8fafc",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            border: `1px solid ${docSt.color}33`,
                          }}
                        >
                          {docSt.label}
                        </span>
                      </td>
                      <td style={{ fontSize: "11.5px", color: "var(--slate-500)" }}>
                        {v.auditoria?.modificadoPor || "N/A"}
                        <div style={{ fontSize: "10.5px", color: "var(--slate-400)" }}>
                          {new Date(v.auditoria?.modificadoEn || v.auditoria?.creadoEn).toLocaleDateString("es-AR")}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button
                            type="button"
                            className="ghostButton"
                            onClick={() => setExpedienteSeleccionado(v)}
                            style={{ padding: "4px 8px", fontSize: "11.5px", fontWeight: 700 }}
                            title="Abrir expediente completo 360°"
                          >
                            📂 Abrir
                          </button>

                          {v.estado === "TEMPORAL" && (
                            <button
                              type="button"
                              className="primaryButton"
                              onClick={() => setVentaParaCerrar(v)}
                              style={{ padding: "4px 8px", fontSize: "11.5px", background: "#16a34a" }}
                              title="Cargar romaneo y liquidación para pasar a DEFINITIVO"
                            >
                              🏁 Cerrar
                            </button>
                          )}

                          <button
                            type="button"
                            className="ghostButton"
                            onClick={() => handleEliminarRapido(v)}
                            style={{ padding: "4px 6px", fontSize: "11px", color: "#dc2626" }}
                            title="Baja lógica de la venta"
                          >
                            🗑️
                          </button>
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

      {/* Modales del Módulo */}
      {modalProyeccionOpen && (
        <ModalProyeccionVenta
          isOpen={modalProyeccionOpen}
          onClose={() => setModalProyeccionOpen(false)}
          onVentaGuardada={(nueva) => {
            refrescarVentas();
            setExpedienteSeleccionado(nueva);
          }}
          usuarioActual="Operador"
        />
      )}

      {expedienteSeleccionado && (
        <ModalExpedienteCompleto
          isOpen={!!expedienteSeleccionado}
          venta={expedienteSeleccionado}
          onClose={() => setExpedienteSeleccionado(null)}
          onVentaActualizada={(actualizada) => {
            handleVentaActualizada(actualizada);
          }}
          onAbrirCierreDefinitivo={(v) => {
            setVentaParaCerrar(v);
          }}
          usuarioActual="Operador"
        />
      )}

      {ventaParaCerrar && (
        <ModalCierreVentaDefinitivo
          isOpen={!!ventaParaCerrar}
          venta={ventaParaCerrar}
          onClose={() => setVentaParaCerrar(null)}
          onVentaCerrada={(cerrada) => {
            handleVentaActualizada(cerrada);
          }}
          usuarioActual="Operador"
        />
      )}

      {modalHistoricoOpen && (
        <ModalHistoricoComparativo
          isOpen={modalHistoricoOpen}
          onClose={() => setModalHistoricoOpen(false)}
          ventas={ventasActivas}
          onSeleccionarVenta={(v) => {
            setExpedienteSeleccionado(v);
          }}
        />
      )}
    </AppShell>
  );
}
