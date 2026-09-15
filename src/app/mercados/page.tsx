"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import {
  CategoriaValor,
  ValorMovil,
  checkDailyAutoSync,
  getDolarBnaVenta,
  getLastSyncTime,
  getValoresMoviles,
  saveValoresMoviles,
  syncApisLive,
  updateFromArs,
  updateFromUsd,
} from "@/lib/valoresMovilesData";

const CATEGORIAS: { id: CategoriaValor; label: string; icon: string; desc: string }[] = [
  {
    id: "Macro & Combustibles",
    label: "Macroeconomía & Combustible",
    icon: "💵",
    desc: "Variables oficiales de paridad cambiaria, inflación y combustible para maquinaria.",
  },
  {
    id: "Granos & Concentrados",
    label: "Granos & Concentrados (Dietas)",
    icon: "🌾",
    desc: "Insumos energéticos y proteicos para la formulación de raciones del tambo.",
  },
  {
    id: "Ensilajes & Pasturas",
    label: "Ensilajes & Pasturas (Tambo)",
    icon: "🌿",
    desc: "Valores por kilogramo de materia verde/ensilada consumida en pastoreo o mixer.",
  },
  {
    id: "Rollos Forrajeros",
    label: "Rollos Forrajeros",
    icon: "🚜",
    desc: "Costo por rollo y valor equivalente por kilogramo de fibra seca henificada.",
  },
];

export default function MercadosPage() {
  const [items, setItems] = useState<ValorMovil[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: "success" | "info" } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("Todas");

  useEffect(() => {
    setItems(getValoresMoviles());
    setLastSync(getLastSyncTime());

    // Sincronización automática diaria en segundo plano (1 vez por día)
    checkDailyAutoSync().then((ran) => {
      if (ran) {
        setItems(getValoresMoviles());
        setLastSync(getLastSyncTime());
        setFeedback({ msg: "Se ejecutó la actualización automática diaria de las APIs.", type: "info" });
        setTimeout(() => setFeedback(null), 5000);
      }
    });
  }, []);

  const tcActivo = getDolarBnaVenta();

  async function handleSyncApis() {
    setSyncing(true);
    setFeedback(null);
    try {
      const res = await syncApisLive();
      setItems(getValoresMoviles());
      setLastSync(getLastSyncTime());
      if (res.success) {
        setFeedback({
          msg: `Sincronización exitosa: ${res.details.join(" · ")}`,
          type: "success",
        });
      } else {
        setFeedback({
          msg: "Las cotizaciones ya se encuentran actualizadas.",
          type: "info",
        });
      }
    } catch {
      setFeedback({ msg: "Hubo una demora al conectar con los servidores externos. Se preservan los valores activos.", type: "info" });
    } finally {
      setSyncing(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  }

  function handleEditArs(id: string, newArs: number | null) {
    const updated = updateFromArs(items, id, newArs);
    setItems(updated);
    setHasUnsavedChanges(true);
  }

  function handleEditUsd(id: string, newUsd: number | null) {
    const updated = updateFromUsd(items, id, newUsd);
    setItems(updated);
    setHasUnsavedChanges(true);
  }

  function handleSave() {
    saveValoresMoviles(items);
    setHasUnsavedChanges(false);
    setFeedback({ msg: "Precios de referencia guardados. Quedan activos para todo el sistema HJB.", type: "success" });
    setTimeout(() => setFeedback(null), 4000);
  }

  // Métricas destacadas
  const dolarItem = items.find((x) => x.id === "dolar-bna");
  const inflacionItem = items.find((x) => x.id === "inflacion");
  const gasoilItem = items.find((x) => x.id === "gasoil");
  const maizItem = items.find((x) => x.id === "maiz-kg");
  const pelletItem = items.find((x) => x.id === "pellet-soja" || x.id === "pellet-soja-kg");

  return (
    <AppShell active="Valores Móviles">
      <div className="pageHeader">
        <div>
          <div className="badgeRow" style={{ marginBottom: "6px" }}>
            <span className="pill badgeGreen">1-Valores Móviles HJB</span>
            <span className="pill badgeSlate">Bimonetario (ARS / USD)</span>
            {lastSync && (
              <span className="pill badgeBlue" style={{ fontSize: "11.5px" }}>
                Sincronizado: {lastSync}
              </span>
            )}
          </div>
          <h1>Valores Móviles & Precios de Referencia</h1>
          <p className="muted">
            Tabla central bimonetaria de precios e insumos. Sirve de referencia para el cálculo de dietas del tambo y labores agrícolas.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="ghostButton"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
            onClick={handleSyncApis}
            disabled={syncing}
            title="Sincroniza en vivo Dólar BNA, Inflación y Gasoil"
          >
            {syncing ? "⏳ Sincronizando..." : "🔄 Sincronizar APIs ahora"}
          </button>

          <button
            type="button"
            className="primaryButton"
            onClick={handleSave}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            💾 Guardar cambios
          </button>
        </div>
      </div>

      {/* Banner explicativo de Paridad y Tipo de Cambio Activo */}
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          padding: "12px 18px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>💵</span>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#166534" }}>
              Tipo de Cambio Activo: 1 USD = ${tcActivo.toLocaleString("es-AR")} ARS (BNA Venta)
            </div>
            <div style={{ fontSize: "12px", color: "#15803d" }}>
              Podés editar en el casillero de <strong>Pesos ($)</strong> o en el de <strong>Dólares (USD)</strong>; el sistema convierte automáticamente el valor opuesto.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#166534", background: "#dcfce7", padding: "4px 8px", borderRadius: "6px" }}>
            Referencia Central del Sistema
          </span>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "13.5px",
            fontWeight: 500,
            background: feedback.type === "success" ? "#dcfce7" : "#e0f2fe",
            color: feedback.type === "success" ? "#166534" : "#075985",
            border: `1px solid ${feedback.type === "success" ? "#86efac" : "#7dd3fc"}`,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>{feedback.type === "success" ? "✓" : "ℹ️"}</span>
          <span>{feedback.msg}</span>
        </div>
      )}

      {hasUnsavedChanges && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "13px",
            fontWeight: 600,
            background: "#fef3c7",
            color: "#92400e",
            border: "1px solid #fcd34d",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>⚠️ Tenés modificaciones manuales de precios sin guardar.</span>
          <button
            type="button"
            onClick={handleSave}
            style={{
              background: "#b45309",
              color: "#ffffff",
              border: "none",
              padding: "4px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Guardar ahora
          </button>
        </div>
      )}

      {/* Tarjetas de Métricas Principales (Pesos + USD) */}
      <div className="metricsGrid five">
        <MetricCard
          label="Dólar BNA Venta"
          value={dolarItem?.valorArs ? `$${dolarItem.valorArs.toLocaleString("es-AR")}` : "—"}
          note="Oficial Divisas Venta"
        />
        <MetricCard
          label="Inflación IPC"
          value={inflacionItem?.valorArs ? `${inflacionItem.valorArs}%` : "—"}
          note={inflacionItem?.nota || "ArgentinaDatos"}
        />
        <MetricCard
          label="Gas Oil Grado 2"
          value={gasoilItem?.valorArs ? `$${gasoilItem.valorArs.toLocaleString("es-AR")}` : "—"}
          note={gasoilItem?.valorUsd ? `USD ${gasoilItem.valorUsd} / lt` : "Por litro"}
        />
        <MetricCard
          label="Maíz Dieta"
          value={maizItem?.valorArs ? `$${maizItem.valorArs.toLocaleString("es-AR")}` : "—"}
          note={maizItem?.valorUsd ? `USD ${maizItem.valorUsd} / kg` : "Puesto en mixer"}
        />
        <MetricCard
          label="Pellet Soja"
          value={pelletItem?.valorArs ? `$${pelletItem.valorArs.toLocaleString("es-AR")}` : "—"}
          note={pelletItem?.valorUsd ? `USD ${pelletItem.valorUsd} / kg` : "Concentrado"}
        />
      </div>

      {/* Filtro rápido de categorías */}
      <div className="tabs" style={{ marginTop: "12px", marginBottom: "20px" }}>
        {["Todas", "Macro & Combustibles", "Granos & Concentrados", "Ensilajes & Pasturas", "Rollos Forrajeros"].map((cat) => (
          <button
            key={cat}
            type="button"
            className={activeFilter === cat ? "tab active" : "tab"}
            onClick={() => setActiveFilter(cat)}
          >
            {cat === "Todas" ? `📋 Todos (${items.length} Insumos)` : cat}
          </button>
        ))}
      </div>

      {/* Tablas por Categoría */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {CATEGORIAS.filter((c) => activeFilter === "Todas" || activeFilter === c.id).map((cat) => {
          const categoryItems = items.filter((x) => x.categoria === cat.id);

          return (
            <section key={cat.id} className="panel" style={{ padding: "20px" }}>
              <div style={{ marginBottom: "14px" }}>
                <h2 style={{ fontSize: "17px", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </h2>
                <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                  {cat.desc}
                </p>
              </div>

              <div className="tableWrap">
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th style={{ minWidth: "220px" }}>Producto / Insumo</th>
                      <th style={{ width: "190px", textAlign: "right" }}>Precio en Pesos ($ ARS)</th>
                      <th style={{ width: "190px", textAlign: "right" }}>Precio en Dólares (USD)</th>
                      <th style={{ width: "90px" }}>Unidad</th>
                      <th style={{ width: "140px" }}>Detalle / Flete</th>
                      <th style={{ width: "160px" }}>Origen</th>
                      <th style={{ width: "100px" }}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryItems.map((item) => {
                      const isPercentage = item.unidadArs === "%";

                      return (
                        <tr key={item.id}>
                          {/* Nombre del Producto */}
                          <td>
                            <strong style={{ fontSize: "14px", color: "var(--slate-950)" }}>
                              {item.nombre}
                            </strong>
                          </td>

                          {/* Casillero en PESOS ($ ARS) */}
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#f8fafc", padding: "3px 6px", borderRadius: "6px", border: "1px solid var(--line)" }}>
                              <span style={{ color: "var(--slate-500)", fontWeight: 700, fontSize: "12px" }}>
                                {isPercentage ? "" : "$"}
                              </span>
                              <input
                                type="number"
                                step="any"
                                value={item.valorArs ?? ""}
                                placeholder="S/C"
                                onChange={(e) => {
                                  const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                  handleEditArs(item.id, isNaN(val as number) ? null : val);
                                }}
                                style={{
                                  width: "100px",
                                  padding: "4px 6px",
                                  borderRadius: "4px",
                                  border: "1px solid #cbd5e1",
                                  fontWeight: 700,
                                  fontSize: "13.5px",
                                  color: "var(--slate-900)",
                                  background: "#ffffff",
                                  textAlign: "right",
                                }}
                              />
                              {isPercentage && <span style={{ fontWeight: 700, fontSize: "12px" }}>%</span>}
                              <span style={{ fontSize: "11px", color: "var(--slate-500)", fontWeight: 600 }}>ARS</span>
                            </div>
                          </td>

                          {/* Casillero en DÓLARES (USD U$D) */}
                          <td style={{ textAlign: "right" }}>
                            {isPercentage ? (
                              <span style={{ color: "var(--slate-400)", fontSize: "12px" }}>N/A</span>
                            ) : (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#fefce8", padding: "3px 6px", borderRadius: "6px", border: "1px solid #fef08a" }}>
                                <span style={{ color: "#854d0e", fontWeight: 700, fontSize: "12px" }}>U$D</span>
                                <input
                                  type="number"
                                  step="any"
                                  value={item.valorUsd ?? ""}
                                  placeholder="S/C"
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                    handleEditUsd(item.id, isNaN(val as number) ? null : val);
                                  }}
                                  style={{
                                    width: "90px",
                                    padding: "4px 6px",
                                    borderRadius: "4px",
                                    border: "1px solid #fde047",
                                    fontWeight: 700,
                                    fontSize: "13.5px",
                                    color: "#713f12",
                                    background: "#ffffff",
                                    textAlign: "right",
                                  }}
                                />
                                <span style={{ fontSize: "11px", color: "#a16207", fontWeight: 600 }}>USD</span>
                              </div>
                            )}
                          </td>

                          {/* Unidad */}
                          <td>
                            <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--slate-700)" }}>
                              {item.unidadArs}
                            </span>
                          </td>

                          {/* Detalle / Flete */}
                          <td>
                            {item.fletePct ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  background: "#ffedd5",
                                  color: "#9a3412",
                                  fontWeight: 700,
                                  fontSize: "12px",
                                }}
                              >
                                Flete {item.fletePct}%
                              </span>
                            ) : item.nota ? (
                              <span style={{ color: "var(--slate-600)", fontSize: "12px" }}>
                                {item.nota}
                              </span>
                            ) : (
                              <span style={{ color: "var(--slate-400)", fontSize: "12px" }}>—</span>
                            )}
                          </td>

                          {/* Origen / Fuente */}
                          <td>
                            <span
                              className={
                                item.fuente.startsWith("API")
                                ? "pill badgeGreen"
                                : item.fuente.startsWith("Derivado")
                                ? "pill badgeSlate"
                                : "pill badgeBlue"
                              }
                              style={{ fontSize: "11px", fontWeight: 600 }}
                            >
                              {item.fuente}
                            </span>
                          </td>

                          {/* Fecha Actualización */}
                          <td>
                            <span style={{ fontSize: "12px", color: "var(--slate-600)" }}>
                              {item.fechaActualizacion}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {/* Nota de Arquitectura: Referencia Central para todo el sistema */}
      <section className="panel" style={{ marginTop: "24px", background: "#f8fafc", border: "1px dashed var(--line)" }}>
        <h3 style={{ fontSize: "15px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>🏛️</span>
          <span>Referencia Central de Costos para HJB</span>
        </h3>
        <p style={{ fontSize: "13px", color: "var(--slate-700)", lineHeight: 1.5, margin: 0 }}>
          Esta sección actúa como la <strong>fuente única de verdad</strong> de precios de la empresa. Cada vez que se modifica un valor aquí (sea por la actualización automática de las APIs o porque lo editaste en pesos o dólares), el cambio se propaga de manera inmediata. Los futuros módulos de <strong>Dietas del Tambo</strong> (para valorizar kilos de ración) y <strong>Costos de Labores</strong> (consumo de gasoil e insumos en cada lote) consultan directamente estos precios.
        </p>
      </section>
    </AppShell>
  );
}
