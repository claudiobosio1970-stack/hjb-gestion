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
} from "@/lib/valoresMovilesData";

const CATEGORIAS: { id: CategoriaValor; label: string; icon: string; desc: string }[] = [
  {
    id: "Macro & Combustibles",
    label: "Macroeconomía & Combustible",
    icon: "💵",
    desc: "Variables oficiales para liquidación, costos de laboreo y ajuste por inflación.",
  },
  {
    id: "Granos & Concentrados",
    label: "Granos & Concentrados (Dietas)",
    icon: "🌾",
    desc: "Insumos concentrados proteicos y energéticos para la ración del tambo.",
  },
  {
    id: "Ensilajes & Pasturas",
    label: "Ensilajes & Pasturas (Tambo)",
    icon: "🌿",
    desc: "Valores por kilo de materia verde/ensilada para formulación de dietas.",
  },
  {
    id: "Rollos Forrajeros",
    label: "Rollos Forrajeros",
    icon: "🚜",
    desc: "Valores por rollo y costo derivado por kilogramo de fibra henificada.",
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

    // Chequeo de sincronización automática diaria (1 vez al día)
    checkDailyAutoSync().then((ran) => {
      if (ran) {
        setItems(getValoresMoviles());
        setLastSync(getLastSyncTime());
        setFeedback({ msg: "Se sincronizaron automáticamente las APIs del día.", type: "info" });
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
          msg: "Las APIs ya se encuentran al día.",
          type: "info",
        });
      }
    } catch {
      setFeedback({ msg: "Hubo una demora al conectar con las APIs. Se mantienen los valores guardados.", type: "info" });
    } finally {
      setSyncing(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  }

  function handleValueChange(id: string, newValor: number | null) {
    setItems((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const today = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
        copy[idx] = {
          ...copy[idx],
          valor: newValor,
          fechaActualizacion: today,
        };

        // Derivaciones automáticas al cambiar unidades mayores
        if (id === "pellet-soja-tn" && typeof newValor === "number") {
          const kgIdx = copy.findIndex((x) => x.id === "pellet-soja-kg");
          if (kgIdx >= 0) copy[kgIdx].valor = Math.round(newValor / 1000);
        }
        if (id === "pellet-trigo-tn" && typeof newValor === "number") {
          const kgIdx = copy.findIndex((x) => x.id === "pellet-trigo-kg");
          if (kgIdx >= 0) copy[kgIdx].valor = Math.round(newValor / 1000);
        }
        if (id === "rollo-alfalfa-rollo" && typeof newValor === "number") {
          const kgIdx = copy.findIndex((x) => x.id === "rollo-alfalfa-kg");
          if (kgIdx >= 0) copy[kgIdx].valor = Math.round(newValor / 500);
        }
        if (id === "rollo-avena-rollo" && typeof newValor === "number") {
          const kgIdx = copy.findIndex((x) => x.id === "rollo-avena-kg");
          if (kgIdx >= 0) copy[kgIdx].valor = Math.round(newValor / 500);
        }
        if (id === "rollo-chala-maiz-rollo" && typeof newValor === "number") {
          const kgIdx = copy.findIndex((x) => x.id === "rollo-chala-maiz-kg");
          if (kgIdx >= 0) copy[kgIdx].valor = Math.round(newValor / 400);
        }
        if (id === "rollo-gramineas-rollo" && typeof newValor === "number") {
          const kgIdx = copy.findIndex((x) => x.id === "rollo-gramineas-kg");
          if (kgIdx >= 0) copy[kgIdx].valor = Math.round(newValor / 500);
        }
      }
      return copy;
    });
    setHasUnsavedChanges(true);
  }

  function handleSaveManual() {
    saveValoresMoviles(items);
    setHasUnsavedChanges(false);
    setFeedback({ msg: "Valores guardados correctamente. Quedan activos para dietas y labores.", type: "success" });
    setTimeout(() => setFeedback(null), 4000);
  }

  // Métricas destacadas
  const dolarItem = items.find((x) => x.id === "dolar-bna");
  const inflacionItem = items.find((x) => x.id === "inflacion");
  const gasoilItem = items.find((x) => x.id === "gasoil");
  const maizItem = items.find((x) => x.id === "maiz-kg");
  const pelletItem = items.find((x) => x.id === "pellet-soja-kg");

  return (
    <AppShell active="Valores Móviles">
      <div className="pageHeader">
        <div>
          <div className="badgeRow" style={{ marginBottom: "6px" }}>
            <span className="pill badgeGreen">1-Valores Móviles HJB</span>
            <span className="pill badgeSlate">Actualización Diaria</span>
            {lastSync && (
              <span className="pill badgeBlue" style={{ fontSize: "11.5px" }}>
                Sincronizado: {lastSync}
              </span>
            )}
          </div>
          <h1>Valores Móviles & Mercados</h1>
          <p className="muted">
            Cotizaciones oficiales en vivo y precios de insumos para el cálculo de dietas del tambo y costos de labores.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="ghostButton"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
            onClick={handleSyncApis}
            disabled={syncing}
            title="Consulta las APIs oficiales de Dólar BNA, Inflación y Combustibles"
          >
            {syncing ? "⏳ Sincronizando..." : "🔄 Sincronizar APIs ahora"}
          </button>

          <button
            type="button"
            className="primaryButton"
            onClick={handleSaveManual}
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
          <span>⚠️ Tenés modificaciones manuales sin guardar en los precios.</span>
          <button
            type="button"
            onClick={handleSaveManual}
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
      <div className="metricsGrid five">
        <MetricCard
          label="Dólar BNA (Venta)"
          value={dolarItem?.valor ? `$${dolarItem.valor.toLocaleString("es-AR")}` : "—"}
          note="Vía DolarApi en vivo"
        />
        <MetricCard
          label="Inflación IPC"
          value={inflacionItem?.valor ? `${inflacionItem.valor}%` : "—"}
          note={inflacionItem?.nota || "ArgentinaDatos"}
        />
        <MetricCard
          label="Gas Oil Grado 2"
          value={gasoilItem?.valor ? `$${gasoilItem.valor.toLocaleString("es-AR")}` : "—"}
          note="Por litro para maquinaria"
        />
        <MetricCard
          label="Maíz Dieta"
          value={maizItem?.valor ? `$${maizItem.valor.toLocaleString("es-AR")}` : "—"}
          note="Por kilo puesto en mixer"
        />
        <MetricCard
          label="Pellet Soja"
          value={pelletItem?.valor ? `$${pelletItem.valor.toLocaleString("es-AR")}` : "—"}
          note="Por kilo concentrado proteico"
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
            {cat === "Todas" ? "📋 Todos los 24 Productos" : cat}
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
                      <th style={{ width: "160px" }}>Valor Activo</th>
                      <th style={{ width: "90px" }}>Unidad</th>
                      <th style={{ width: "140px" }}>U$D / Flete</th>
                      <th style={{ width: "170px" }}>Origen</th>
                      <th style={{ width: "110px" }}>Fecha</th>
                      <th>Detalle / Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryItems.map((item) => (
                      <tr key={item.id}>
                        {/* Nombre */}
                        <td>
                          <strong style={{ fontSize: "14px", color: "var(--slate-950)" }}>
                            {item.nombre}
                          </strong>
                          {item.origenCalculo && (
                            <small style={{ display: "block", color: "var(--brand-700)", fontSize: "11px", marginTop: "2px" }}>
                              ↳ {item.origenCalculo}
                            </small>
                          )}
                        </td>

                        {/* Input Valor Editable */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ color: "var(--slate-500)", fontWeight: 600, fontSize: "13px" }}>
                              {item.unidad === "%" ? "" : "$"}
                            </span>
                            <input
                              type="number"
                              step="any"
                              value={item.valor ?? ""}
                              placeholder="S/C"
                              onChange={(e) => {
                                const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                handleValueChange(item.id, isNaN(val as number) ? null : val);
                              }}
                              style={{
                                width: "105px",
                                padding: "6px 8px",
                                borderRadius: "6px",
                                border: "1px solid var(--line)",
                                fontWeight: 700,
                                fontSize: "14px",
                                color: "var(--slate-900)",
                                background: "#ffffff",
                                textAlign: "right",
                              }}
                            />
                            {item.unidad === "%" && (
                              <span style={{ color: "var(--slate-500)", fontWeight: 700 }}>%</span>
                            )}
                          </div>
                        </td>

                        {/* Unidad */}
                        <td>
                          <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--slate-700)" }}>
                            {item.unidad}
                          </span>
                        </td>

                        {/* Valor Secundario (U$D o Flete) */}
                        <td>
                          {item.valorSecundario ? (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: "#fef08a",
                                color: "#854d0e",
                                fontWeight: 700,
                                fontSize: "12px",
                              }}
                            >
                              {item.valorSecundario} {item.unidadSecundaria || ""}
                            </span>
                          ) : (
                            <span style={{ color: "var(--slate-400)" }}>—</span>
                          )}
                        </td>

                        {/* Fuente / Origen */}
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

                        {/* Nota */}
                        <td>
                          <span style={{ fontSize: "12px", color: "var(--slate-600)" }}>
                            {item.nota || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {/* Caja explicativa de cómo se conecta esto con el resto de HJB */}
      <section className="panel" style={{ marginTop: "24px", background: "#f8fafc", border: "1px dashed var(--line)" }}>
        <h3 style={{ fontSize: "15px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>💡</span>
          <span>¿Cómo utiliza HJB estos Valores Móviles en el sistema?</span>
        </h3>
        <p style={{ fontSize: "13px", color: "var(--slate-700)", lineHeight: 1.5, margin: 0 }}>
          Todos los valores listados en esta tabla quedan centralizados en el sistema. Cuando se avance con la formulación de las <strong>dietas de las vacas</strong> (kilos de silo de maíz, avena, maíz molido, pellet de soja, rollos), el sistema multiplicará automáticamente los kilos por estos valores vigentes para obtener el costo de alimentación por vaca/día y por litro de leche. De la misma forma, las labores agrícolas calculan el costo de combustible con el precio de gasoil cargado aquí.
        </p>
      </section>
    </AppShell>
  );
}
