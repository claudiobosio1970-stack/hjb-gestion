"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import {
  CategoriaInsumo,
  InsumoStockItem,
  MovimientoStockItem,
  getStockActualInsumos,
  registrarIngresoStock,
} from "@/lib/stockInsumosData";

export default function InsumosPage() {
  const [data, setData] = useState<{
    items: InsumoStockItem[];
    movimientos: MovimientoStockItem[];
    valorTotalGeneralArs: number;
    valorTotalGeneralUsd: number;
    totalInsumos: number;
    insumosEnAlerta: number;
  }>({
    items: [],
    movimientos: [],
    valorTotalGeneralArs: 0,
    valorTotalGeneralUsd: 0,
    totalInsumos: 0,
    insumosEnAlerta: 0,
  });

  const [filtroCategoria, setFiltroCategoria] = useState<string>("Todos");
  const [filtroTexto, setFiltroTexto] = useState<string>("");
  const [soloAlertas, setSoloAlertas] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal Ingreso de Stock
  const [modalIngresoOpen, setModalIngresoOpen] = useState(false);
  const [formIngreso, setFormIngreso] = useState({
    insumoId: "glifosato",
    cantidad: 100,
    fecha: new Date().toISOString().split("T")[0],
    remitoProveedor: "Remito ACA #",
    costoUnitarioArs: 0,
    observaciones: "",
  });

  // Modal Trazabilidad / Movimientos de Insumo
  const [insumoTrazabilidad, setInsumoTrazabilidad] = useState<InsumoStockItem | null>(null);

  function cargarDatos() {
    setData(getStockActualInsumos());
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  function triggerFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4500);
  }

  function handleAbrirIngreso(insumoId?: string) {
    setFormIngreso({
      insumoId: insumoId || (data.items[0]?.id ?? "glifosato"),
      cantidad: 100,
      fecha: new Date().toISOString().split("T")[0],
      remitoProveedor: "",
      costoUnitarioArs: 0,
      observaciones: "",
    });
    setModalIngresoOpen(true);
  }

  function handleGuardarIngreso(e: React.FormEvent) {
    e.preventDefault();
    if (!formIngreso.insumoId || formIngreso.cantidad <= 0) {
      alert("Por favor ingresá un insumo y una cantidad válida mayor a cero.");
      return;
    }

    registrarIngresoStock({
      insumoId: formIngreso.insumoId,
      cantidad: Number(formIngreso.cantidad),
      fecha: formIngreso.fecha || new Date().toISOString().split("T")[0],
      remitoProveedor: formIngreso.remitoProveedor.trim() || "Ingreso manual a galpón",
      costoUnitarioArs: formIngreso.costoUnitarioArs ? Number(formIngreso.costoUnitarioArs) : undefined,
      observaciones: formIngreso.observaciones.trim() || undefined,
    });

    setModalIngresoOpen(false);
    cargarDatos();
    const item = data.items.find((x) => x.id === formIngreso.insumoId);
    triggerFeedback(`✓ Se ingresaron +${formIngreso.cantidad} ${item?.unidad || ""} de ${item?.nombre || "insumo"} al stock.`);
  }

  // Filtrado de la tabla de insumos
  const itemsFiltrados = data.items.filter((item) => {
    if (soloAlertas && !item.enAlerta) return false;
    if (filtroCategoria !== "Todos" && item.categoria !== filtroCategoria) return false;
    if (filtroTexto.trim()) {
      const q = filtroTexto.toLowerCase();
      const match =
        item.nombre.toLowerCase().includes(q) ||
        item.ubicacion.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const categorias: { id: string; label: string; icon: string }[] = [
    { id: "Todos", label: `Todos (${data.items.length})`, icon: "📋" },
    { id: "Fitosanitarios", label: "Fitosanitarios", icon: "🧪" },
    { id: "Semillas", label: "Semillas", icon: "🌾" },
    { id: "Fertilizantes", label: "Fertilizantes", icon: "🌱" },
    { id: "Forrajes & Granos", label: "Forrajes & Granos", icon: "🌽" },
    { id: "Combustibles", label: "Combustibles", icon: "⛽" },
  ];

  return (
    <AppShell active="Insumos & Stock">
      {/* Encabezado */}
      <div className="pageHeader">
        <div>
          <div className="badgeRow" style={{ marginBottom: "6px" }}>
            <span className="pill badgeGreen">Inventario Central HJB</span>
            <span className="pill badgeSlate">Valorizado en Vivo con Valores Móviles</span>
            <span className="pill badgeBlue">Descuento Automático Multimódulo</span>
          </div>
          <h1>Insumos & Stock General</h1>
          <p className="muted">
            Control de existencias en galpón y depósitos. Cada labor realizada en los campos o ración ganadera se descuenta en tiempo real.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="ghostButton"
            onClick={cargarDatos}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
            title="Recalcular consumos de labores y cotizaciones"
          >
            🔄 Actualizar Stock
          </button>
          <button
            type="button"
            className="primaryButton"
            onClick={() => handleAbrirIngreso()}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            ➕ Ingreso de Stock / Compra
          </button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "13.5px",
            fontWeight: 600,
            background: "#dcfce7",
            color: "#166534",
            border: "1px solid #86efac",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>✓</span>
          <span>{feedback}</span>
        </div>
      )}

      {/* Métricas Principales */}
      <div className="metricsGrid four" style={{ marginBottom: "22px" }}>
        <MetricCard
          label="Valorización Total Stock"
          value={`$${data.valorTotalGeneralArs.toLocaleString("es-AR")}`}
          note="Valuación total en Pesos ARS"
        />
        <MetricCard
          label="Valorización en Dólares"
          value={`USD ${data.valorTotalGeneralUsd.toLocaleString("es-AR")}`}
          note="Calculado a Dólar BNA Oficial"
        />
        <MetricCard
          label="Total Insumos en Galpón"
          value={`${data.totalInsumos} insumos`}
          note="5 rubros productivos activos"
        />
        <MetricCard
          label="Alertas Stock Bajo"
          value={`${data.insumosEnAlerta} insumos`}
          note={data.insumosEnAlerta === 0 ? "Todos los insumos sobre el mínimo" : "Requieren reposición urgente"}
        />
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <section className="panel" style={{ padding: "18px 20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", marginBottom: "14px" }}>
          {/* Pestañas de Rubro / Categoría */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {categorias.map((c) => {
              const active = filtroCategoria === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFiltroCategoria(c.id)}
                  className={active ? "pill badgeGreen" : "pill badgeSlate"}
                  style={{ cursor: "pointer", fontSize: "12px", fontWeight: active ? 700 : 500, padding: "6px 12px" }}
                >
                  {c.icon} {c.label}
                </button>
              );
            })}
          </div>

          {/* Toggle Solo Alertas */}
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "#991b1b" }}>
            <input
              type="checkbox"
              checked={soloAlertas}
              onChange={(e) => setSoloAlertas(e.target.checked)}
              style={{ cursor: "pointer", width: "16px", height: "16px" }}
            />
            <span>⚠️ Ver solo alertas de reposición</span>
          </label>
        </div>

        {/* Buscador de Texto */}
        <div style={{ position: "relative", maxWidth: "420px" }}>
          <input
            type="text"
            placeholder="🔍 Buscar insumo por nombre o depósito..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
            }}
          />
          {filtroTexto && (
            <button
              type="button"
              onClick={() => setFiltroTexto("")}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--slate-400)",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </section>

      {/* Tabla de Inventario de Stock */}
      <section className="panel" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ fontSize: "17px", margin: 0 }}>Existencias en Depósito & Valorización</h2>
            <p className="muted" style={{ fontSize: "12.5px", margin: "2px 0 0 0" }}>
              Precios sincronizados en tiempo real con <strong>Valores Móviles</strong>. Descuento automático de labores realizadas.
            </p>
          </div>
          <span className="pill badgeSlate" style={{ fontSize: "12px" }}>
            Mostrando {itemsFiltrados.length} de {data.items.length} insumos
          </span>
        </div>

        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th style={{ minWidth: "220px" }}>Insumo & Ubicación</th>
                <th>Rubro</th>
                <th style={{ width: "180px", textAlign: "right" }}>Stock Actual Disponible</th>
                <th style={{ width: "140px", textAlign: "center" }}>Estado / Nivel</th>
                <th style={{ width: "150px", textAlign: "right" }}>Consumo Campaña</th>
                <th style={{ width: "150px", textAlign: "right" }}>Precio Ref. (Móvil)</th>
                <th style={{ width: "170px", textAlign: "right" }}>Valorización Total</th>
                <th style={{ width: "160px", textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {itemsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--slate-500)" }}>
                    No se encontraron insumos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                itemsFiltrados.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: "var(--slate-950)", fontSize: "13.5px" }}>
                        {item.nombre}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--slate-500)", marginTop: "2px" }}>
                        📍 {item.ubicacion}
                      </div>
                    </td>

                    <td>
                      <span className="pill badgeSlate" style={{ fontSize: "11px" }}>
                        {item.categoria}
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "15px", fontWeight: 800, color: item.enAlerta ? "#991b1b" : "var(--slate-900)" }}>
                        {item.stockActual.toLocaleString("es-AR")} {item.unidad}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                        Inicial: {item.stockInicial.toLocaleString("es-AR")} {item.unidad}
                      </div>
                    </td>

                    <td style={{ textAlign: "center" }}>
                      {item.enAlerta ? (
                        <span className="pill badgeAmber" style={{ fontSize: "11px", fontWeight: 700 }}>
                          ⚠️ Reponer (Mín: {item.stockMinimoAlerta} {item.unidad})
                        </span>
                      ) : (
                        <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 700 }}>
                          ✓ Normal ({item.stockMinimoAlerta} mín)
                        </span>
                      )}
                      <div style={{ width: "100%", height: "5px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden", marginTop: "5px" }}>
                        <div
                          style={{
                            width: `${item.porcentajeStock}%`,
                            height: "100%",
                            background: item.enAlerta ? "#dc2626" : "#16a34a",
                            borderRadius: "999px",
                          }}
                        />
                      </div>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      {item.consumoAgricola > 0 ? (
                        <div>
                          <strong style={{ color: "#b91c1c", fontSize: "13px" }}>
                            -{item.consumoAgricola.toLocaleString("es-AR")} {item.unidad}
                          </strong>
                          <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>aplicados en campo</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--slate-400)" }}>Sin consumos</span>
                      )}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: "13px" }}>
                        ${item.precioUnitarioArs.toLocaleString("es-AR")}
                      </strong>
                      <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                        USD {item.precioUnitarioUsd.toLocaleString("es-AR")} / {item.unidad}
                      </div>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <strong style={{ color: "#166534", fontSize: "14px" }}>
                        ${item.valorTotalArs.toLocaleString("es-AR")}
                      </strong>
                      <div style={{ fontSize: "11px", color: "#15803d" }}>
                        USD {item.valorTotalUsd.toLocaleString("es-AR")}
                      </div>
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="ghostButton"
                          onClick={() => handleAbrirIngreso(item.id)}
                          style={{ padding: "4px 8px", fontSize: "11.5px", fontWeight: 700 }}
                          title="Cargar ingreso o compra de este insumo"
                        >
                          ➕ Ingreso
                        </button>
                        <button
                          type="button"
                          className="ghostButton"
                          onClick={() => setInsumoTrazabilidad(item)}
                          style={{ padding: "4px 8px", fontSize: "11.5px", fontWeight: 700 }}
                          title="Ver historial de aplicaciones y compras"
                        >
                          📜 Movimientos
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRAR INGRESO DE STOCK / COMPRA                              */}
      {/* ========================================================================= */}
      {modalIngresoOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setModalIngresoOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "540px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--line)",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }}>📦</span>
                <h3 style={{ margin: 0, fontSize: "18px", color: "var(--slate-950)" }}>
                  Registrar Ingreso de Stock / Compra
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalIngresoOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarIngreso} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "4px" }}>
                  Insumo a Ingresar:
                </label>
                <select
                  value={formIngreso.insumoId}
                  onChange={(e) => setFormIngreso({ ...formIngreso, insumoId: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13.5px", fontWeight: 600 }}
                  required
                >
                  {data.items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.nombre} ({it.unidad}) · {it.categoria}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "4px" }}>
                    Cantidad Ingresada:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formIngreso.cantidad}
                    onChange={(e) => setFormIngreso({ ...formIngreso, cantidad: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: 700 }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "4px" }}>
                    Fecha de Recepción:
                  </label>
                  <input
                    type="date"
                    value={formIngreso.fecha}
                    onChange={(e) => setFormIngreso({ ...formIngreso, fecha: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "4px" }}>
                  Remito / Factura / Proveedor:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Remito #5910 - Cooperativa Lehmann"
                  value={formIngreso.remitoProveedor}
                  onChange={(e) => setFormIngreso({ ...formIngreso, remitoProveedor: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "4px" }}>
                  Observaciones / Lote de Fabricación (opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: Descargado en Galpón Principal"
                  value={formIngreso.observaciones}
                  onChange={(e) => setFormIngreso({ ...formIngreso, observaciones: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="ghostButton"
                  onClick={() => setModalIngresoOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primaryButton"
                  style={{ background: "#166534" }}
                >
                  ✓ Confirmar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TRAZABILIDAD Y HISTORIAL DE MOVIMIENTOS DEL INSUMO               */}
      {/* ========================================================================= */}
      {insumoTrazabilidad && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setInsumoTrazabilidad(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--line)",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className="pill badgeGreen">Trazabilidad de Stock</span>
                  <span className="pill badgeSlate">{insumoTrazabilidad.categoria}</span>
                </div>
                <h3 style={{ margin: 0, fontSize: "18px", color: "var(--slate-950)" }}>
                  {insumoTrazabilidad.nombre}
                </h3>
                <p className="muted" style={{ margin: "2px 0 0 0", fontSize: "12px" }}>
                  📍 {insumoTrazabilidad.ubicacion} · Stock actual: <strong>{insumoTrazabilidad.stockActual.toLocaleString("es-AR")} {insumoTrazabilidad.unidad}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInsumoTrazabilidad(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="metricsGrid three">
                <MetricCard
                  label="Stock Inicial"
                  value={`${insumoTrazabilidad.stockInicial.toLocaleString("es-AR")} ${insumoTrazabilidad.unidad}`}
                  note="Punto de partida de campaña"
                />
                <MetricCard
                  label="Ingresos / Compras"
                  value={`+${insumoTrazabilidad.ingresosCompras.toLocaleString("es-AR")} ${insumoTrazabilidad.unidad}`}
                  note="Compras y reposiciones"
                />
                <MetricCard
                  label="Consumo Aplicado"
                  value={`-${insumoTrazabilidad.consumoAgricola.toLocaleString("es-AR")} ${insumoTrazabilidad.unidad}`}
                  note="Descuentos automáticos de labores"
                />
              </div>

              <h4 style={{ fontSize: "14px", margin: "10px 0 4px 0", color: "var(--slate-700)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Historial de Aplicaciones y Movimientos
              </h4>

              {(() => {
                const movs = data.movimientos.filter((m) => m.insumoId === insumoTrazabilidad.id);
                if (movs.length === 0) {
                  return (
                    <div style={{ padding: "30px", textAlign: "center", color: "var(--slate-500)", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
                      No se registran movimientos ni consumos para este insumo en la campaña actual.
                    </div>
                  );
                }
                return (
                  <div className="tableWrap">
                    <table className="dataTable">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Tipo de Movimiento</th>
                          <th style={{ textAlign: "right" }}>Cantidad</th>
                          <th>Detalle de Origen / Labor / Remito</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movs.map((m) => (
                          <tr key={m.id}>
                            <td><strong>{m.fecha}</strong></td>
                            <td>
                              <span
                                className="pill"
                                style={{
                                  background: m.cantidad > 0 ? "#dcfce7" : "#fee2e2",
                                  color: m.cantidad > 0 ? "#166534" : "#991b1b",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                }}
                              >
                                {m.tipo}
                              </span>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 800, color: m.cantidad > 0 ? "#166534" : "#991b1b" }}>
                              {m.cantidad > 0 ? `+${m.cantidad.toLocaleString("es-AR")}` : `${m.cantidad.toLocaleString("es-AR")}`} {m.unidad}
                            </td>
                            <td style={{ fontSize: "12.5px" }}>{m.detalle}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            <div
              style={{
                padding: "12px 24px",
                background: "#f8fafc",
                borderTop: "1px solid var(--line)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="ghostButton"
                onClick={() => setInsumoTrazabilidad(null)}
                style={{ fontWeight: 700, padding: "6px 14px" }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
