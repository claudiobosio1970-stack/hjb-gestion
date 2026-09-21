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
  registrarCanjeGranoPellet,
  calcularAutonomiaPelletTambo,
  DIETA_TAMBO_HJB_DEFAULT,
  HJB_STOCK_SYNC_EVENT,
} from "@/lib/stockInsumosData";
import { HJB_AGRICULTURE_SYNC_EVENT } from "@/lib/agricultureData";

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

  // Modal Canje de Grano a Pellet (AFA)
  const [modalCanjeOpen, setModalCanjeOpen] = useState(false);
  const [formCanje, setFormCanje] = useState({
    cerealInsumoId: "soja-grano",
    toneladasGrano: 30,
    porcentajeCanje: 75,
    pelletInsumoId: "pellet-soja",
    fecha: new Date().toISOString().split("T")[0],
    destinoPellet: "Tambo",
    comprobante: "",
    observaciones: "",
    vacasEnOrdeñe: DIETA_TAMBO_HJB_DEFAULT.vacasEnOrdeñe,
    racionKgVacaDia: DIETA_TAMBO_HJB_DEFAULT.racionesKgDia["pellet-soja"],
    mostrarAjusteDieta: false,
  });

  // Modal Trazabilidad / Movimientos de Insumo
  const [insumoTrazabilidad, setInsumoTrazabilidad] = useState<InsumoStockItem | null>(null);

  // Modal Stock por Ubicación (Cereales y Rollos)
  const [insumoUbicaciones, setInsumoUbicaciones] = useState<InsumoStockItem | null>(null);

  function cargarDatos() {
    setData(getStockActualInsumos());
  }

  useEffect(() => {
    if (insumoUbicaciones) {
      const updated = data.items.find((x) => x.id === insumoUbicaciones.id);
      if (updated) setInsumoUbicaciones(updated);
    }
  }, [data]);

  useEffect(() => {
    cargarDatos();

    function onSync() {
      cargarDatos();
    }

    window.addEventListener(HJB_STOCK_SYNC_EVENT, onSync);
    window.addEventListener(HJB_AGRICULTURE_SYNC_EVENT, onSync);
    return () => {
      window.removeEventListener(HJB_STOCK_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_AGRICULTURE_SYNC_EVENT, onSync);
    };
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

  function handleAbrirCanje(cerealId?: string) {
    const id = cerealId || "soja-grano";
    const cerealItem = data.items.find((x) => x.id === id);
    const afaUbic = cerealItem?.stockPorUbicacion?.find((u) => u.tipoLugar === "afa" || /afa|cardos/i.test(u.lugar));
    const availTn = afaUbic ? (afaUbic.cantidadTn || 0) : 0;

    const defaultPelletId = "pellet-soja";
    const defaultRacion = DIETA_TAMBO_HJB_DEFAULT.racionesKgDia[defaultPelletId] || 2.5;

    setFormCanje({
      cerealInsumoId: id,
      toneladasGrano: availTn > 0 ? availTn : 10,
      porcentajeCanje: 75,
      pelletInsumoId: defaultPelletId, // SIEMPRE subproducto pellet, nunca balanceado de guacheras
      fecha: new Date().toISOString().split("T")[0],
      destinoPellet: "Tambo", // ÚNICAMENTE Tambo
      comprobante: "",
      observaciones: "",
      vacasEnOrdeñe: DIETA_TAMBO_HJB_DEFAULT.vacasEnOrdeñe,
      racionKgVacaDia: defaultRacion,
      mostrarAjusteDieta: false,
    });
    setModalCanjeOpen(true);
  }

  function handleGuardarCanje(e: React.FormEvent) {
    e.preventDefault();
    if (!formCanje.toneladasGrano || formCanje.toneladasGrano <= 0) {
      alert("Por favor ingresá una cantidad de toneladas válida mayor a cero.");
      return;
    }
    if (!formCanje.porcentajeCanje || formCanje.porcentajeCanje <= 0 || formCanje.porcentajeCanje > 100) {
      alert("El porcentaje de canje debe estar comprendido entre 1% y 100%.");
      return;
    }

    const cerealItem = data.items.find((x) => x.id === formCanje.cerealInsumoId);
    const pelletItem = data.items.find((x) => x.id === formCanje.pelletInsumoId);

    const tnPellet = Number((formCanje.toneladasGrano * (formCanje.porcentajeCanje / 100)).toFixed(2));
    const kgGrano = Math.round(formCanje.toneladasGrano * 1000);
    const kgPellet = Math.round(tnPellet * 1000);

    const { diasAutonomia } = calcularAutonomiaPelletTambo(
      kgPellet,
      formCanje.pelletInsumoId,
      formCanje.vacasEnOrdeñe,
      formCanje.racionKgVacaDia
    );

    registrarCanjeGranoPellet({
      fecha: formCanje.fecha,
      cerealInsumoId: formCanje.cerealInsumoId,
      cerealNombre: cerealItem?.nombre || "Grano Comercial",
      acopioOrigen: "AFA Los Cardos",
      toneladasGrano: formCanje.toneladasGrano,
      kgGrano,
      porcentajeCanje: formCanje.porcentajeCanje,
      toneladasPellet: tnPellet,
      kgPellet,
      pelletInsumoId: formCanje.pelletInsumoId,
      pelletNombre: pelletItem?.nombre || "Pellet de Soja Proteico (Harina)",
      destinoPellet: "Tambo", // ÚNICAMENTE Tambo
      comprobante: formCanje.comprobante.trim() || undefined,
      observaciones: formCanje.observaciones.trim() || undefined,
    });

    setModalCanjeOpen(false);
    cargarDatos();
    triggerFeedback(`✓ Canje registrado: ${formCanje.toneladasGrano} Tn de ${cerealItem?.nombre || "grano"} canjeadas por +${tnPellet} Tn de ${pelletItem?.nombre || "Pellet"} (${diasAutonomia} días de alimentación en Tambo).`);
  }

  // Filtrado de la tabla de insumos
  const itemsFiltrados = data.items.filter((item) => {
    if (soloAlertas && !item.enAlerta) return false;
    if (filtroCategoria !== "Todos") {
      if (filtroCategoria === "Granos") {
        if (item.categoria !== "Granos" && !(item.categoria === "Forrajes & Granos" && item.id.includes("grano"))) return false;
      } else if (filtroCategoria === "Forrajes") {
        if (item.categoria !== "Forrajes" && !(item.categoria === "Forrajes & Granos" && !item.id.includes("grano"))) return false;
      } else if (item.categoria !== filtroCategoria) {
        return false;
      }
    }
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
    { id: "Granos", label: "Granos", icon: "🌾" },
    { id: "Forrajes", label: "Forrajes", icon: "🌿" },
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
            className="secondaryButton"
            onClick={() => handleAbrirCanje("soja-grano")}
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
            title="Convertir grano acopiado en AFA Los Cardos en Pellet de Soja para el Tambo"
          >
            🔄 Canje Grano a Pellet (AFA)
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
          note={`${new Set(data.items.map((i) => i.categoria)).size} rubros productivos activos`}
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
                itemsFiltrados.map((item) => {
                  const hasUbicaciones = Boolean(
                    item.esCerealOGrano ||
                    item.esRollo ||
                    (item.stockPorUbicacion && item.stockPorUbicacion.length > 0)
                  );

                  return (
                    <tr
                      key={item.id}
                      style={{
                        cursor: hasUbicaciones ? "pointer" : "default",
                        transition: "background 0.15s ease",
                      }}
                      onClick={() => {
                        if (hasUbicaciones) {
                          setInsumoUbicaciones(item);
                        }
                      }}
                      title={hasUbicaciones ? `Click para ver distribución y toneladas en cada lugar de ${item.nombre}` : undefined}
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                          <span style={{ fontWeight: 800, color: "var(--slate-950)", fontSize: "13.5px" }}>
                            {item.nombre}
                          </span>
                          {hasUbicaciones && (
                            <span
                              className="pill"
                              style={{
                                fontSize: "10px",
                                padding: "1px 6px",
                                background: item.esCerealOGrano ? "rgba(217, 119, 6, 0.12)" : "rgba(37, 99, 235, 0.12)",
                                color: item.esCerealOGrano ? "#92400e" : "#1e40af",
                                fontWeight: 700,
                              }}
                            >
                              📍 Ver por lugar
                            </span>
                          )}
                        </div>

                        {/* Chips de Ubicaciones / Acopio */}
                        {item.stockPorUbicacion && item.stockPorUbicacion.length > 0 ? (
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                            {item.stockPorUbicacion.map((u) => (
                              <span
                                key={u.lugar}
                                className="pill"
                                style={{
                                  fontSize: "10px",
                                  padding: "1px 6px",
                                  background: u.cantidad > 0 ? "rgba(22, 163, 74, 0.1)" : "#f1f5f9",
                                  color: u.cantidad > 0 ? "#166534" : "var(--slate-400)",
                                  fontWeight: u.cantidad > 0 ? 700 : 500,
                                  border: u.cantidad > 0 ? "1px solid rgba(22, 163, 74, 0.25)" : "1px solid #e2e8f0",
                                }}
                              >
                                {u.icono} {u.lugar}: {item.esCerealOGrano ? `${(u.cantidadTn || 0).toLocaleString("es-AR")} Tn` : `${u.cantidad.toLocaleString("es-AR")} rollos`}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: "11.5px", color: "var(--slate-500)", marginTop: "2px" }}>
                            📍 {item.ubicacion}
                          </div>
                        )}
                      </td>

                      <td>
                        <span className="pill badgeSlate" style={{ fontSize: "11px" }}>
                          {item.categoria}
                        </span>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        {item.esCerealOGrano ? (
                          <>
                            <div style={{ fontSize: "16px", fontWeight: 900, color: item.stockActual > 0 ? "#15803d" : "#64748b" }}>
                              {(item.totalTn || 0).toLocaleString("es-AR")} Tn
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                              {item.stockActual.toLocaleString("es-AR")} kg netos
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: "15px", fontWeight: 800, color: item.stockActual > 0 ? (item.enAlerta ? "#991b1b" : "var(--slate-900)") : "#64748b" }}>
                            {item.stockActual.toLocaleString("es-AR")} {item.unidad}
                          </div>
                        )}

                        <div style={{ fontSize: "11px", color: "var(--slate-400)", marginTop: "2px" }}>
                          {item.produccionPropia > 0 ? (
                            <span style={{ color: "#166534", fontWeight: 600 }}>
                              {item.esCerealOGrano
                                ? `🌾 Cosecha: +${((item.produccionPropia || 0) / 1000).toLocaleString("es-AR")} Tn`
                                : `🌾 Confección: +${item.produccionPropia.toLocaleString("es-AR")} ${item.unidad}`}
                            </span>
                          ) : item.ingresosCompras > 0 ? (
                            `Ingresados: +${item.ingresosCompras.toLocaleString("es-AR")} ${item.unidad}`
                          ) : (
                            "Sin ingresos aún"
                          )}
                        </div>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        {item.ingresosCompras === 0 && item.produccionPropia === 0 && item.stockActual === 0 ? (
                          <span className="pill badgeSlate" style={{ fontSize: "11px" }}>
                            Sin existencias (0)
                          </span>
                        ) : item.enAlerta ? (
                          <span className="pill badgeAmber" style={{ fontSize: "11px", fontWeight: 700 }}>
                            ⚠️ Reponer (Mín: {item.stockMinimoAlerta} {item.unidad})
                          </span>
                        ) : (
                          <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 700 }}>
                            ✓ Con Stock
                          </span>
                        )}
                        {(item.ingresosCompras > 0 || item.produccionPropia > 0) && (
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
                        )}
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

                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", gap: "5px", flexWrap: "wrap", justifyContent: "center" }}>
                          {hasUbicaciones && (
                            <button
                              type="button"
                              className="ghostButton"
                              onClick={() => setInsumoUbicaciones(item)}
                              style={{
                                padding: "3px 7px",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#1e40af",
                                background: "rgba(37, 99, 235, 0.08)",
                                borderColor: "rgba(37, 99, 235, 0.25)",
                              }}
                              title="Ver toneladas y desglose en cada acopio o campo"
                            >
                              📍 Ubicaciones
                            </button>
                          )}
                          {(item.categoria === "Granos" || item.esCerealOGrano) && (
                            <button
                              type="button"
                              className="ghostButton"
                              onClick={() => handleAbrirCanje(item.id)}
                              style={{
                                padding: "3px 7px",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#15803d",
                                background: "rgba(22, 163, 74, 0.08)",
                                borderColor: "rgba(22, 163, 74, 0.3)",
                              }}
                              title="Convertir grano acopiado en AFA Los Cardos a Pellet"
                            >
                              🔄 Canje Pellet
                            </button>
                          )}
                          <button
                            type="button"
                            className="ghostButton"
                            onClick={() => handleAbrirIngreso(item.id)}
                            style={{ padding: "3px 7px", fontSize: "11px", fontWeight: 700 }}
                            title="Cargar ingreso o compra de este insumo"
                          >
                            ➕ Ingreso
                          </button>
                          <button
                            type="button"
                            className="ghostButton"
                            onClick={() => setInsumoTrazabilidad(item)}
                            style={{ padding: "3px 7px", fontSize: "11px", fontWeight: 700 }}
                            title="Ver historial de aplicaciones y compras"
                          >
                            📜 Movimientos
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
              <div className={`metricsGrid ${insumoTrazabilidad.produccionPropia > 0 ? "four" : "three"}`}>
                <MetricCard
                  label="Stock Inicial"
                  value={`${insumoTrazabilidad.stockInicial.toLocaleString("es-AR")} ${insumoTrazabilidad.unidad}`}
                  note="Punto de partida de campaña"
                />
                {insumoTrazabilidad.produccionPropia > 0 && (
                  <MetricCard
                    label="Producción Propia"
                    value={`+${insumoTrazabilidad.produccionPropia.toLocaleString("es-AR")} ${insumoTrazabilidad.unidad}`}
                    note="Confección de rollos a campo"
                  />
                )}
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
                                  background: m.tipo === "Traslado / Destino" ? "#dbeafe" : m.cantidad > 0 ? "#dcfce7" : "#fee2e2",
                                  color: m.tipo === "Traslado / Destino" ? "#1e40af" : m.cantidad > 0 ? "#166534" : "#991b1b",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                }}
                              >
                                {m.tipo === "Producción Propia" ? `🚜 ${m.tipo}` : m.tipo === "Traslado / Destino" ? `📦 ${m.tipo}` : m.tipo}
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

      {/* ========================================================================= */}
      {/* MODAL 3: STOCK POR UBICACIÓN (CEREALES: TONELADAS EN SILOS, COOP, PUERTO, AFA / ROLLOS) */}
      {/* ========================================================================= */}
      {insumoUbicaciones && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={() => setInsumoUbicaciones(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              maxWidth: "860px",
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: insumoUbicaciones.esCerealOGrano
                  ? "linear-gradient(to right, #fffbeb, #ffffff)"
                  : "linear-gradient(to right, #f0fdf4, #ffffff)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "24px" }}>{insumoUbicaciones.esCerealOGrano ? "🌾" : "📦"}</span>
                  <h3 style={{ margin: 0, fontSize: "17.5px", color: "var(--slate-900)" }}>
                    Stock por Ubicación: {insumoUbicaciones.nombre}
                  </h3>
                </div>
                <p className="muted" style={{ margin: "3px 0 0 0", fontSize: "12.5px" }}>
                  {insumoUbicaciones.esCerealOGrano
                    ? "Control de toneladas físicas acopiadas en Silos, Cooperativa, Puerto y AFA Los Cardos."
                    : "Existencias y distribución de rollos entre el campo de origen (Keuneke) y el Tambo."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInsumoUbicaciones(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Tarjeta Resumen Total */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <span style={{ fontSize: "11.5px", color: "var(--slate-500)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                    Stock Físico Disponible
                  </span>
                  <div style={{ fontSize: "26px", fontWeight: 900, color: "#166534", marginTop: "2px" }}>
                    {insumoUbicaciones.esCerealOGrano
                      ? `${(insumoUbicaciones.totalTn || 0).toLocaleString("es-AR")} Toneladas`
                      : `${insumoUbicaciones.stockActual.toLocaleString("es-AR")} Rollos`}
                  </div>
                  {insumoUbicaciones.esCerealOGrano && (
                    <small style={{ color: "var(--slate-500)", fontSize: "12px" }}>
                      Equivale a {insumoUbicaciones.stockActual.toLocaleString("es-AR")} kg netos
                    </small>
                  )}
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "11.5px", color: "var(--slate-500)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                    Valorización Estimada
                  </span>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--slate-900)", marginTop: "2px" }}>
                    USD {insumoUbicaciones.valorTotalUsd.toLocaleString("es-AR")}
                  </div>
                  <small style={{ color: "#15803d", fontWeight: 600, fontSize: "12px" }}>
                    ${insumoUbicaciones.valorTotalArs.toLocaleString("es-AR")} ARS (Valores Móviles)
                  </small>
                </div>
              </div>

              {/* Grid de Ubicaciones / Acopios */}
              <div>
                <h4 style={{ fontSize: "13.5px", margin: "0 0 10px 0", color: "var(--slate-800)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {insumoUbicaciones.esCerealOGrano
                    ? "📍 Toneladas Disponibles por Lugar de Acopio"
                    : "📍 Rollos Disponibles por Ubicación (Keuneke / Tambo)"}
                </h4>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px" }}>
                  {(insumoUbicaciones.stockPorUbicacion || []).map((ubic) => (
                    <div
                      key={ubic.lugar}
                      style={{
                        background: ubic.cantidad > 0 ? "#ffffff" : "#f8fafc",
                        border: ubic.cantidad > 0 ? "2px solid #86efac" : "1px solid var(--line)",
                        borderRadius: "10px",
                        padding: "14px",
                        boxShadow: ubic.cantidad > 0 ? "var(--shadow-sm)" : "none",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ fontSize: "22px" }}>{ubic.icono}</span>
                          <span
                            className="pill"
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 700,
                              background: ubic.cantidad > 0 ? "#dcfce7" : "#f1f5f9",
                              color: ubic.cantidad > 0 ? "#166534" : "var(--slate-400)",
                            }}
                          >
                            {ubic.porcentaje}%
                          </span>
                        </div>
                        <strong style={{ fontSize: "14px", color: "var(--slate-900)", display: "block" }}>
                          {ubic.lugar}
                        </strong>
                      </div>

                      <div style={{ marginTop: "12px" }}>
                        <div style={{ fontSize: "20px", fontWeight: 900, color: ubic.cantidad > 0 ? "#166534" : "#94a3b8" }}>
                          {insumoUbicaciones.esCerealOGrano
                            ? `${(ubic.cantidadTn || 0).toLocaleString("es-AR")} Tn`
                            : `${ubic.cantidad.toLocaleString("es-AR")} rollos`}
                        </div>
                        {insumoUbicaciones.esCerealOGrano && (
                          <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                            {ubic.cantidad.toLocaleString("es-AR")} kg
                          </div>
                        )}
                        <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden", marginTop: "8px" }}>
                          <div
                            style={{
                              width: `${ubic.porcentaje}%`,
                              height: "100%",
                              background: ubic.cantidad > 0 ? "#16a34a" : "transparent",
                              borderRadius: "999px",
                            }}
                          />
                        </div>

                        {insumoUbicaciones.esCerealOGrano && (ubic.tipoLugar === "afa" || /afa|cardos/i.test(ubic.lugar)) && (
                          <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #cbd5e1" }}>
                            <button
                              type="button"
                              onClick={() => {
                                const cId = insumoUbicaciones.id;
                                setInsumoUbicaciones(null);
                                handleAbrirCanje(cId);
                              }}
                              style={{
                                width: "100%",
                                padding: "6px 10px",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                background: "#15803d",
                                color: "#ffffff",
                                borderRadius: "6px",
                                border: "none",
                                cursor: "pointer",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                              }}
                            >
                              🔄 Convertir en Pellet (AFA)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trazabilidad: Cosechas y Movimientos que explican el acopio */}
              <div>
                <h4 style={{ fontSize: "13.5px", margin: "10px 0 8px 0", color: "var(--slate-800)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  📜 Cosechas y Entregas Registradas
                </h4>

                {(() => {
                  const allDetalles = (insumoUbicaciones.stockPorUbicacion || []).flatMap((u) => u.detalles);
                  if (allDetalles.length === 0) {
                    return (
                      <div style={{ padding: "24px", textAlign: "center", color: "var(--slate-500)", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
                        💡 Todavía no hay cosechas ni traslados registrados para este cereal o rollo. Al cargar una nueva labor de Cosecha seleccionando Silos, Cooperativa, Puerto o AFA Los Cardos (o rollos en Keuneke/Tambo), aparecerá aquí de forma automática.
                      </div>
                    );
                  }

                  allDetalles.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

                  return (
                    <div className="tableWrap">
                      <table className="dataTable">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Labor / Origen</th>
                            <th>Lugar de Acopio</th>
                            <th style={{ textAlign: "right" }}>Cantidad Acreditada</th>
                            <th>Detalle de Operación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allDetalles.map((det) => (
                            <tr key={det.id}>
                              <td><strong>{det.fecha}</strong></td>
                              <td>
                                <div style={{ fontWeight: 700, color: "var(--slate-900)" }}>
                                  {det.campo} {det.lote ? `(${det.lote})` : ""}
                                </div>
                                <small style={{ color: "var(--slate-500)" }}>{det.tipo}</small>
                              </td>
                              <td>
                                <span className="pill badgeBlue" style={{ fontSize: "11px", fontWeight: 700 }}>
                                  📍 {det.referencia}
                                </span>
                              </td>
                              <td style={{ textAlign: "right", fontWeight: 800, color: "#166534" }}>
                                {insumoUbicaciones.esCerealOGrano && det.cantidadTn !== undefined
                                  ? `+${det.cantidadTn.toLocaleString("es-AR")} Tn (${det.cantidad.toLocaleString("es-AR")} kg)`
                                  : `+${det.cantidad.toLocaleString("es-AR")} ${det.unidad}`}
                              </td>
                              <td style={{ fontSize: "12px", color: "var(--slate-600)" }}>{det.detalle}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Pie */}
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
                onClick={() => setInsumoUbicaciones(null)}
                style={{ fontWeight: 700, padding: "6px 16px" }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONVERTIR GRANO EN PELLET (CANJE EN AFA LOS CARDOS)             */}
      {/* ========================================================================= */}
      {modalCanjeOpen && (
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
          onClick={() => setModalCanjeOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "580px",
              width: "100%",
              maxHeight: "calc(100vh - 28px)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Fijo */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--line)",
                background: "linear-gradient(to right, #f0fdf4, #ffffff)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>🔄</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "var(--slate-950)" }}>
                    Convertir Grano en Pellet (Canje AFA)
                  </h3>
                  <small style={{ color: "var(--slate-500)", fontSize: "12px" }}>
                    Acreditación de pellet para Tambo contra cereal acopiado en AFA Los Cardos.
                  </small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCanjeOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            </div>

            {/* Formulario con Scroll interno y campos compactos */}
            <form
              onSubmit={handleGuardarCanje}
              style={{
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                flex: "1 1 auto",
              }}
            >
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Fila 1: Selector de Grano de Origen y Fecha */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      Grano de Origen en AFA Los Cardos:
                    </label>
                    <select
                      value={formCanje.cerealInsumoId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        const cItem = data.items.find((x) => x.id === newId);
                        const afaU = cItem?.stockPorUbicacion?.find((u) => u.tipoLugar === "afa" || /afa|cardos/i.test(u.lugar));
                        setFormCanje({
                          ...formCanje,
                          cerealInsumoId: newId,
                          toneladasGrano: afaU && (afaU.cantidadTn || 0) > 0 ? afaU.cantidadTn || 0 : formCanje.toneladasGrano,
                        });
                      }}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 600 }}
                      required
                    >
                      {data.items
                        .filter((it) => it.categoria === "Granos" || it.id.includes("grano"))
                        .map((it) => {
                          const afaU = it.stockPorUbicacion?.find((u) => u.tipoLugar === "afa" || /afa|cardos/i.test(u.lugar));
                          const tnAfa = afaU?.cantidadTn || 0;
                          return (
                            <option key={it.id} value={it.id}>
                              🌾 {it.nombre} — En AFA: {tnAfa.toLocaleString("es-AR")} Tn
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      Fecha de Liquidación:
                    </label>
                    <input
                      type="date"
                      value={formCanje.fecha}
                      onChange={(e) => setFormCanje({ ...formCanje, fecha: e.target.value })}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                      required
                    />
                  </div>
                </div>

                {/* Fila 2: Toneladas a Canjear y Porcentaje de Canje */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      Toneladas de Grano a Canjear:
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formCanje.toneladasGrano}
                        onChange={(e) => setFormCanje({ ...formCanje, toneladasGrano: parseFloat(e.target.value) || 0 })}
                        style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13.5px", fontWeight: 700 }}
                        required
                      />
                      <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "11.5px", color: "var(--slate-400)", fontWeight: 700 }}>
                        Tn
                      </span>
                    </div>
                    <small style={{ fontSize: "10.5px", color: "var(--slate-500)", marginTop: "2px", display: "block" }}>
                      Equivale a {(formCanje.toneladasGrano * 1000).toLocaleString("es-AR")} kg de cereal
                    </small>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      Porcentaje de Canje (%):
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="100"
                        value={formCanje.porcentajeCanje}
                        onChange={(e) => setFormCanje({ ...formCanje, porcentajeCanje: parseFloat(e.target.value) || 0 })}
                        style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13.5px", fontWeight: 700 }}
                        required
                      />
                      <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "11.5px", color: "var(--slate-400)", fontWeight: 700 }}>
                        %
                      </span>
                    </div>
                    <small style={{ fontSize: "10.5px", color: "var(--slate-500)", marginTop: "2px", display: "block" }}>
                      Relación acordada con AFA
                    </small>
                  </div>
                </div>

                {/* Fila 3: Subproducto Resultante a Ingresar y Destino Físico (ÚNICAMENTE TAMBO) */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      Subproducto resultante a ingresar:
                    </label>
                    <select
                      value={formCanje.pelletInsumoId}
                      onChange={(e) => {
                        const newPelletId = e.target.value;
                        const newRacion = DIETA_TAMBO_HJB_DEFAULT.racionesKgDia[newPelletId as keyof typeof DIETA_TAMBO_HJB_DEFAULT.racionesKgDia] || 2.5;
                        setFormCanje({
                          ...formCanje,
                          pelletInsumoId: newPelletId,
                          racionKgVacaDia: newRacion,
                        });
                      }}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 600 }}
                      required
                    >
                      <option value="pellet-soja">🥣 Pellet de Soja Proteico (Harina)</option>
                      <option value="pellet-trigo">🌾 Pellet de Trigo (Afrechillo)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      Destino del Subproducto:
                    </label>
                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--slate-800)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        height: "35px",
                      }}
                    >
                      <span>🥛 Tambo</span>
                      <span className="pill badgeGreen" style={{ fontSize: "10px", padding: "1px 7px" }}>
                        Exclusivo
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tarjeta de Cálculo en Tiempo Real y Autonomía de Dieta */}
                {(() => {
                  const tnPellet = Number((formCanje.toneladasGrano * (formCanje.porcentajeCanje / 100)).toFixed(2));
                  const kgPellet = Math.round(tnPellet * 1000);
                  const cerealItem = data.items.find((x) => x.id === formCanje.cerealInsumoId);
                  const pelletItem = data.items.find((x) => x.id === formCanje.pelletInsumoId) || { nombre: "Pellet de Soja Proteico (Harina)" };

                  const { diasAutonomia, mesesAutonomia, consumoDiarioTotalKg, racionKgVacaDia, vacasOrdeñe } = calcularAutonomiaPelletTambo(
                    kgPellet,
                    formCanje.pelletInsumoId,
                    formCanje.vacasEnOrdeñe,
                    formCanje.racionKgVacaDia
                  );

                  const fechaBase = formCanje.fecha ? new Date(formCanje.fecha + "T12:00:00") : new Date();
                  const fechaFin = new Date(fechaBase.getTime() + diasAutonomia * 24 * 60 * 60 * 1000);
                  const fechaFinStr = diasAutonomia > 0
                    ? fechaFin.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })
                    : "--";

                  return (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #86efac",
                        borderRadius: "10px",
                        padding: "12px 14px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>
                          🌾 Subproducto Resultante a Ingresar:
                        </span>
                        <span className="pill badgeGreen" style={{ fontSize: "10px", fontWeight: 800 }}>
                          {formCanje.porcentajeCanje}% Canje AFA
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                        <div>
                          <strong style={{ fontSize: "14.5px", color: "#166534", display: "block" }}>
                            {pelletItem.nombre}
                          </strong>
                          <span style={{ fontSize: "11.5px", color: "var(--slate-600)" }}>
                            Destino asignado: <strong>Tambo</strong> (Alimentación del rodeo)
                          </span>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "20px", fontWeight: 900, color: "#15803d" }}>
                            +{tnPellet.toLocaleString("es-AR")} Tn
                          </div>
                          <small style={{ color: "#166534", fontWeight: 600, fontSize: "11px" }}>
                            +{kgPellet.toLocaleString("es-AR")} kg disponibles en Tambo
                          </small>
                        </div>
                      </div>

                      {/* Autonomía de Dieta para el Rodeo de Vacas */}
                      <div
                        style={{
                          marginTop: "8px",
                          padding: "9px 12px",
                          background: "#ffffff",
                          borderRadius: "8px",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ fontSize: "15px" }}>⏱️</span>
                            <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>
                              Autonomía para el Rodeo del Tambo:
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "14.5px",
                              fontWeight: 900,
                              color: diasAutonomia > 0 ? "#15803d" : "var(--slate-400)",
                            }}
                          >
                            {diasAutonomia} días de stock
                          </span>
                        </div>

                        <div style={{ fontSize: "11.5px", color: "var(--slate-700)", lineHeight: 1.45 }}>
                          Alcanza para alimentar a las <strong>{vacasOrdeñe} vacas en ordeñe</strong> durante{" "}
                          <strong>{diasAutonomia} días</strong> (aprox. {mesesAutonomia} meses{diasAutonomia > 0 ? `, hasta el ${fechaFinStr}` : ""}) según la dieta oficial de <strong>{racionKgVacaDia} kg/vaca/día</strong> ({consumoDiarioTotalKg} kg/día totales del rodeo).
                        </div>

                        <div style={{ marginTop: "6px", paddingTop: "5px", borderTop: "1px dashed #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => setFormCanje({ ...formCanje, mostrarAjusteDieta: !formCanje.mostrarAjusteDieta })}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              fontSize: "11px",
                              color: "#15803d",
                              fontWeight: 700,
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                          >
                            {formCanje.mostrarAjusteDieta ? "▲ Ocultar ajuste de rodeo" : "⚙️ Ajustar vacas en ordeñe o ración"}
                          </button>
                          <span style={{ fontSize: "10px", color: "var(--slate-400)" }}>
                            Dieta Tambo HJB
                          </span>
                        </div>

                        {formCanje.mostrarAjusteDieta && (
                          <div
                            style={{
                              marginTop: "6px",
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "8px",
                              background: "#f8fafc",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <div>
                              <label style={{ fontSize: "10px", fontWeight: 700, display: "block", color: "var(--slate-600)", marginBottom: "2px" }}>
                                Vacas en Ordeñe (VO):
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={formCanje.vacasEnOrdeñe}
                                onChange={(e) => setFormCanje({ ...formCanje, vacasEnOrdeñe: parseInt(e.target.value) || 1 })}
                                style={{ width: "100%", padding: "4px 6px", fontSize: "11.5px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: "10px", fontWeight: 700, display: "block", color: "var(--slate-600)", marginBottom: "2px" }}>
                                Ración Pellet (kg/vaca/día):
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={formCanje.racionKgVacaDia}
                                onChange={(e) => setFormCanje({ ...formCanje, racionKgVacaDia: parseFloat(e.target.value) || 0.1 })}
                                style={{ width: "100%", padding: "4px 6px", fontSize: "11.5px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px dashed #bbf7d0", fontSize: "11px", color: "#166534" }}>
                        💡 Descuenta <strong>{formCanje.toneladasGrano} Tn</strong> de {cerealItem?.nombre || "grano"} en <strong>AFA Los Cardos</strong> e ingresa <strong>{tnPellet} Tn</strong> al stock de Tambo.
                      </div>
                    </div>
                  );
                })()}

                {/* Fila 4: Nro de Comprobante / Liquidación AFA y Observaciones */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      Nro. Liquidación / Remito AFA:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Liq. AFA N° 84920"
                      value={formCanje.comprobante}
                      onChange={(e) => setFormCanje({ ...formCanje, comprobante: e.target.value })}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      Observaciones / Flete:
                    </label>
                    <input
                      type="text"
                      placeholder="Detalles sobre entrega en planta o flete..."
                      value={formCanje.observaciones}
                      onChange={(e) => setFormCanje({ ...formCanje, observaciones: e.target.value })}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer Fijo con Botones Siempre Visibles */}
              <div
                style={{
                  padding: "12px 20px",
                  borderTop: "1px solid var(--line)",
                  background: "#f8fafc",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  className="ghostButton"
                  onClick={() => setModalCanjeOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primaryButton"
                  style={{ background: "#15803d", borderColor: "#15803d", padding: "8px 18px" }}
                >
                  ✓ Confirmar Canje a Pellet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
