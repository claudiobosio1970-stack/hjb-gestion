"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import {
  CategoriaValor,
  ValorMovil,
  checkDailyAutoSync,
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
    desc: "Tipo de cambio oficial BNA Divisas, inflación IPC y gas oil agropecuario en surtidor.",
  },
  {
    id: "Granos",
    label: "Granos",
    icon: "🌾",
    desc: "Cotizaciones de cereales y oleaginosas (granos.ar / Pizarra Rosario BCR en vivo).",
  },
  {
    id: "Ensilajes & Pasturas",
    label: "Ensilajes & Pasturas",
    icon: "🌿",
    desc: "Picado fino de forrajes y pasturas para consumo en mixer y pastoreo directo.",
  },
  {
    id: "Rollos Forrajeros",
    label: "Rollos Forrajeros",
    icon: "🚜",
    desc: "Rollos henificados de reserva forrajera con peso promedio de referencia.",
  },
  {
    id: "Pellets & Concentrados",
    label: "Pellets & Concentrados",
    icon: "🥣",
    desc: "Suplementos proteicos y subproductos agroindustriales para dietas de tambo.",
  },
  {
    id: "Líquidos de Fumigación",
    label: "Líquidos de Fumigación",
    icon: "🧪",
    desc: "Herbicidas, coadyuvantes, insecticidas y fungicidas con conversión automática al Dólar BNA.",
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
        setFeedback({ msg: "Se sincronizaron automáticamente las cotizaciones de mercado del día.", type: "info" });
        setTimeout(() => setFeedback(null), 5000);
      }
    });
  }, []);

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
      setFeedback({ msg: "Hubo una demora al conectar con las APIs externas. Se preservan los valores locales.", type: "info" });
    } finally {
      setSyncing(false);
      setTimeout(() => setFeedback(null), 7000);
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
    setFeedback({ msg: "Precios de referencia guardados correctamente para todo el sistema HJB.", type: "success" });
    setTimeout(() => setFeedback(null), 4000);
  }

  // Métricas destacadas
  const dolarItem = items.find((x) => x.id === "dolar-bna");
  const gasoilItem = items.find((x) => x.id === "gasoil");
  const maizItem = items.find((x) => x.id === "maiz");
  const sojaItem = items.find((x) => x.id === "soja");
  const pelletItem = items.find((x) => x.id === "pellet-soja");
  const glifoItem = items.find((x) => x.id === "glifosato");

  const filterTabs = [
    { id: "Todas", label: `📋 Todos (${items.length} Insumos)` },
    { id: "Macro & Combustibles", label: "💵 Macro & Combustibles" },
    { id: "Granos", label: "🌾 Granos" },
    { id: "Ensilajes & Pasturas", label: "🌿 Ensilajes & Pasturas" },
    { id: "Rollos Forrajeros", label: "🚜 Rollos Forrajeros" },
    { id: "Pellets & Concentrados", label: "🥣 Pellets & Concentrados" },
    { id: "Líquidos de Fumigación", label: "🧪 Líquidos de Fumigación" },
  ];

  return (
    <AppShell active="Valores Móviles">
      <div className="pageHeader">
        <div>
          {lastSync && (
            <div className="badgeRow" style={{ marginBottom: "6px" }}>
              <span className="pill badgeBlue" style={{ fontSize: "11.5px" }}>
                Sincronizado: {lastSync}
              </span>
            </div>
          )}
          <h1>Valores Móviles & Precios de Referencia</h1>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="ghostButton"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
            onClick={handleSyncApis}
            disabled={syncing}
            title="Sincroniza en vivo Dólar BNA, Inflación, Gas oil YPF, Granos BCR Rosario y Líquidos"
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
          <span>⚠️ Tenés modificaciones de precios sin guardar.</span>
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

      {/* Tarjetas de Métricas Principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <MetricCard
          label="Dólar BNA Venta"
          value={dolarItem?.valorArs ? `$${dolarItem.valorArs.toLocaleString("es-AR")}` : "—"}
          note="Oficial Divisas Venta"
        />
        <MetricCard
          label="Gas Oil YPF"
          value={gasoilItem?.valorArs ? `$${gasoilItem.valorArs.toLocaleString("es-AR")}` : "—"}
          note="Diesel 500 surtidor oficial"
        />
        <MetricCard
          label="Maíz"
          value={maizItem?.valorArs ? `$${maizItem.valorArs.toLocaleString("es-AR")}` : "—"}
          note={maizItem?.valorUsd ? `USD ${maizItem.valorUsd} / Tn` : "Pizarra BCR Rosario"}
        />
        <MetricCard
          label="Soja"
          value={sojaItem?.valorArs ? `$${sojaItem.valorArs.toLocaleString("es-AR")}` : "—"}
          note={sojaItem?.valorUsd ? `USD ${sojaItem.valorUsd} / Tn` : "Pizarra BCR Rosario"}
        />
        <MetricCard
          label="Pellet Soja"
          value={pelletItem?.valorArs ? `$${pelletItem.valorArs.toLocaleString("es-AR")}` : "—"}
          note={pelletItem?.valorUsd ? `USD ${pelletItem.valorUsd} / Tn` : "Manual HJB"}
        />
        <MetricCard
          label="Glifosato"
          value={glifoItem?.valorArs ? `$${glifoItem.valorArs.toLocaleString("es-AR")}` : "—"}
          note={glifoItem?.valorUsd ? `USD ${glifoItem.valorUsd} / lt` : "Auto Dólar BNA"}
        />
      </div>

      {/* Filtro por Categorías */}
      <div className="tabs" style={{ marginTop: "4px", marginBottom: "20px" }}>
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeFilter === tab.id ? "tab active" : "tab"}
            onClick={() => setActiveFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bloques de Categorías */}
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
                      <th style={{ minWidth: "200px" }}>Insumo / Producto</th>
                      <th style={{ width: "190px", textAlign: "right" }}>Precio en Pesos ($ ARS)</th>
                      <th style={{ width: "190px", textAlign: "right" }}>Precio en Dólares (USD)</th>
                      <th style={{ width: "100px" }}>Unidad</th>
                      <th style={{ width: "170px" }}>Detalle / Nota</th>
                      <th style={{ width: "180px" }}>Origen</th>
                      <th style={{ width: "100px" }}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryItems.map((item) => {
                      const isPercentage = item.unidadArs === "%";

                      return (
                        <tr key={item.id}>
                          {/* Nombre del Insumo */}
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
                                  width: "105px",
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

                          {/* Casillero en DÓLARES (USD) */}
                          <td style={{ textAlign: "right" }}>
                            {isPercentage ? (
                              <span style={{ color: "var(--slate-400)", fontSize: "12px" }}>N/A</span>
                            ) : (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#fefce8", padding: "3px 6px", borderRadius: "6px", border: "1px solid #fef08a" }}>
                                <span style={{ color: "#854d0e", fontWeight: 700, fontSize: "12px" }}>USD</span>
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
                                    width: "95px",
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
                              </div>
                            )}
                          </td>

                          {/* Unidad */}
                          <td>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--slate-700)" }}>
                              {item.unidadArs}
                            </span>
                          </td>

                          {/* Detalle / Nota / Flete */}
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
                                item.fuente === "Manual HJB"
                                ? "pill badgeSlate"
                                : item.fuente.startsWith("API Granos") || item.fuente.startsWith("Automático")
                                ? "pill badgeGreen"
                                : "pill badgeBlue"
                              }
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                border: item.fuente === "Manual HJB" ? "1px solid #cbd5e1" : undefined,
                              }}
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

      {/* Nota Central */}
      <section className="panel" style={{ marginTop: "24px", background: "#f8fafc", border: "1px dashed var(--line)" }}>
        <h3 style={{ fontSize: "15px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>🏛️</span>
          <span>Transparencia de Datos HJB</span>
        </h3>
        <p style={{ fontSize: "13px", color: "var(--slate-700)", lineHeight: 1.5, margin: 0 }}>
          Todos los insumos con cotización pública se actualizan automáticamente mediante sus APIs oficiales en vivo (Dólar BNA Oficial, Inflación IPC, Gas oil YPF surtidor, Pizarra Rosario BCR y Líquidos fitosanitarios al tipo de cambio del día). Los insumos de producción propia o contratos directos (ensilajes, pasturas, rollos y pellets) se gestionan de manera exclusiva con <strong>Manual HJB</strong>.
        </p>
      </section>
    </AppShell>
  );
}
