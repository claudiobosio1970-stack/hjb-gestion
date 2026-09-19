"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import {
  SoilChemicalAnalysis,
  SoilMoistureProfile,
  ManureAnalysis,
  LiquidManureAnalysis,
  OtherLabAnalysis,
  listSoilAnalyses,
  saveSoilAnalysis,
  deleteSoilAnalysis,
  listMoistureProfiles,
  saveMoistureProfile,
  deleteMoistureProfile,
  getManureAnalysis,
  saveManureAnalysis,
  getLiquidManureAnalysis,
  saveLiquidManureAnalysis,
  listOtherAnalyses,
  saveOtherAnalysis,
  deleteOtherAnalysis,
  HJB_SOIL_SYNC_EVENT,
} from "@/lib/soilManureData";
import { agricultureData } from "@/lib/agricultureData";

const CAMPOS_DISPONIBLES = ["Todos", "Tambo", "Racca", "Kitty", "Keuneke", "Aguilera"];

function fmtDate(value: string) {
  if (!value) return "—";
  const parts = value.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return value;
}

export default function SuelosPage() {
  const [activeTab, setActiveTab] = useState<"suelo" | "enmiendas" | "humedad" | "otros">("suelo");
  const [selectedCampo, setSelectedCampo] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Datos en memoria reactivos
  const [soils, setSoils] = useState<SoilChemicalAnalysis[]>([]);
  const [moistures, setMoistures] = useState<SoilMoistureProfile[]>([]);
  const [solidManure, setSolidManure] = useState<ManureAnalysis>(getManureAnalysis());
  const [liquidManure, setLiquidManure] = useState<LiquidManureAnalysis>(getLiquidManureAnalysis());
  const [otherAnalyses, setOtherAnalyses] = useState<OtherLabAnalysis[]>([]);

  // Estados de modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"suelo" | "manure_solido" | "manure_liquido" | "humedad" | "otro">("suelo");
  const [editingItem, setEditingItem] = useState<any>(null);

  function reloadAll() {
    setSoils(listSoilAnalyses());
    setMoistures(listMoistureProfiles());
    setSolidManure(getManureAnalysis());
    setLiquidManure(getLiquidManureAnalysis());
    setOtherAnalyses(listOtherAnalyses());
  }

  useEffect(() => {
    reloadAll();
    function onSync() {
      reloadAll();
    }
    window.addEventListener(HJB_SOIL_SYNC_EVENT, onSync);
    return () => window.removeEventListener(HJB_SOIL_SYNC_EVENT, onSync);
  }, []);

  // Filtrado de suelos químicos
  const filteredSoils = useMemo(() => {
    return soils.filter((s) => {
      if (selectedCampo !== "Todos" && s.campo.toLowerCase() !== selectedCampo.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inLote = s.lote.toLowerCase().includes(q);
        const inCampo = s.campo.toLowerCase().includes(q);
        const inLab = s.laboratorio.toLowerCase().includes(q);
        const inObs = (s.observaciones || "").toLowerCase().includes(q);
        if (!inLote && !inCampo && !inLab && !inObs) return false;
      }
      return true;
    });
  }, [soils, selectedCampo, searchQuery]);

  // Filtrado de perfiles hídricos
  const filteredMoistures = useMemo(() => {
    return moistures.filter((m) => {
      if (selectedCampo !== "Todos" && m.campo.toLowerCase() !== selectedCampo.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inLote = m.lote.toLowerCase().includes(q);
        const inCampo = m.campo.toLowerCase().includes(q);
        if (!inLote && !inCampo) return false;
      }
      return true;
    });
  }, [moistures, selectedCampo, searchQuery]);

  // Filtrado de otros análisis
  const filteredOther = useMemo(() => {
    return otherAnalyses.filter((o) => {
      if (selectedCampo !== "Todos" && o.campo && o.campo.toLowerCase() !== selectedCampo.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTit = o.titulo.toLowerCase().includes(q);
        const inTipo = o.tipo.toLowerCase().includes(q);
        const inLab = o.laboratorio.toLowerCase().includes(q);
        if (!inTit && !inTipo && !inLab) return false;
      }
      return true;
    });
  }, [otherAnalyses, selectedCampo, searchQuery]);

  // KPIs
  const totalAguaUtilPromedio = useMemo(() => {
    if (moistures.length === 0) return 0;
    const sum = moistures.reduce((acc, m) => acc + (m.totalAguaUtilMm || 0), 0);
    return Math.round(sum / moistures.length);
  }, [moistures]);

  const camposConAnalisis = useMemo(() => {
    return Array.from(new Set(soils.map((s) => s.campo))).join(", ");
  }, [soils]);

  // Acciones de eliminación
  function handleDeleteSoil(id: string, lote: string, campo: string) {
    if (window.confirm(`¿Estás seguro de eliminar el análisis químico de ${campo} - ${lote}?`)) {
      deleteSoilAnalysis(id);
    }
  }

  function handleDeleteMoisture(id: string, lote: string, campo: string) {
    if (window.confirm(`¿Estás seguro de eliminar el perfil hídrico de ${campo} - ${lote}?`)) {
      deleteMoistureProfile(id);
    }
  }

  function handleDeleteOther(id: string, titulo: string) {
    if (window.confirm(`¿Estás seguro de eliminar el análisis de "${titulo}"?`)) {
      deleteOtherAnalysis(id);
    }
  }

  // Apertura de modal para nuevo registro
  function handleOpenNew(type: "suelo" | "manure_solido" | "manure_liquido" | "humedad" | "otro") {
    setModalType(type);
    setEditingItem(null);
    setIsModalOpen(true);
  }

  // Apertura de modal para edición
  function handleOpenEdit(type: "suelo" | "manure_solido" | "manure_liquido" | "humedad" | "otro", item: any) {
    setModalType(type);
    setEditingItem(item);
    setIsModalOpen(true);
  }

  return (
    <AppShell active="Análisis de Suelos">
      <main className="content">
        {/* Cabecera Principal */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 700 }}>
                🔬 Laboratorio Centralizado
              </span>
              <span className="pill badgeNeutral" style={{ fontSize: "11px" }}>
                Sincronización Automática con Lotes
              </span>
            </div>
            <h1 style={{ margin: "4px 0", fontSize: "28px", fontWeight: 800, color: "var(--slate-950)", letterSpacing: "-0.02em" }}>
              🧪 Panel de Suelos & Análisis de Laboratorio
            </h1>
            <p className="muted" style={{ margin: 0, fontSize: "14px", maxWidth: "800px" }}>
              Cargá y gestioná centralizadamente todos los informes de laboratorio. Los análisis químicos de suelo y perfiles hídricos <strong>van automáticamente a la ficha de cada lote</strong>, actualizando diagnósticos, mapas satelitales y cálculos nutricionales.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              className="primaryButton"
              style={{ fontSize: "13.5px", padding: "10px 18px", boxShadow: "var(--shadow-sm)" }}
              onClick={() => handleOpenNew(activeTab === "enmiendas" ? "manure_solido" : activeTab === "humedad" ? "humedad" : activeTab === "otros" ? "otro" : "suelo")}
            >
              + Cargar Nuevo Análisis
            </button>
          </div>
        </div>

        {/* Tarjetas KPI de Estado */}
        <section className="grid four" style={{ marginBottom: "24px" }}>
          <MetricCard
            label="Análisis Químicos de Suelo"
            value={`${soils.length} informes`}
            note={`Campos: ${camposConAnalisis || "Sin análisis"}`}
          />
          <MetricCard
            label="Estiércol Sólido (Clover E326)"
            value={`${solidManure.toneladasPorCarro || 5} tn / carro`}
            note="60 kg N · 50 kg P · 123.5 kg K por carro"
          />
          <MetricCard
            label="Efluente Líquido (Tambo)"
            value={`${liquidManure.m3PorTanque || 12} m³ / tanque`}
            note="21.6 kg N · 7.2 kg P · 26.4 kg K por tanque"
          />
          <MetricCard
            label="Perfiles Hídricos (0-200 cm)"
            value={`${totalAguaUtilPromedio} mm`}
            note={`${moistures.length} perfiles de agua útil registrados`}
          />
        </section>

        {/* Barra de Navegación por Categorías */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setActiveTab("suelo")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid",
                borderColor: activeTab === "suelo" ? "var(--brand-600)" : "var(--line)",
                background: activeTab === "suelo" ? "var(--brand-50)" : "#ffffff",
                color: activeTab === "suelo" ? "var(--brand-800)" : "var(--slate-700)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>🧪 Análisis Químicos de Suelo</span>
              <span className="pill badgeGreen" style={{ fontSize: "11px", padding: "1px 6px" }}>{soils.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("enmiendas")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid",
                borderColor: activeTab === "enmiendas" ? "var(--brand-600)" : "var(--line)",
                background: activeTab === "enmiendas" ? "var(--brand-50)" : "#ffffff",
                color: activeTab === "enmiendas" ? "var(--brand-800)" : "var(--slate-700)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>🚜 Estiércol Sólido & Efluente Líquido</span>
              <span className="pill badgeBlue" style={{ fontSize: "11px", padding: "1px 6px" }}>2 matrices</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("humedad")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid",
                borderColor: activeTab === "humedad" ? "var(--brand-600)" : "var(--line)",
                background: activeTab === "humedad" ? "var(--brand-50)" : "#ffffff",
                color: activeTab === "humedad" ? "var(--brand-800)" : "var(--slate-700)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>💧 Perfiles Hídricos (0-200 cm)</span>
              <span className="pill badgeSlate" style={{ fontSize: "11px", padding: "1px 6px" }}>{moistures.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("otros")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid",
                borderColor: activeTab === "otros" ? "var(--brand-600)" : "var(--line)",
                background: activeTab === "otros" ? "var(--brand-50)" : "#ffffff",
                color: activeTab === "otros" ? "var(--brand-800)" : "var(--slate-700)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>📋 Otros Análisis (Forrajes, Silo, Foliares, Agua)</span>
              <span className="pill badgeAmber" style={{ fontSize: "11px", padding: "1px 6px" }}>{otherAnalyses.length}</span>
            </button>
          </div>
        </div>

        {/* PESTAÑA 1: ANÁLISIS QUÍMICOS DE SUELO */}
        {activeTab === "suelo" && (
          <div>
            {/* Barra de Filtros */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px", background: "#ffffff", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--slate-700)" }}>Filtrar por Campo:</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {CAMPOS_DISPONIBLES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCampo(c)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        border: "1px solid",
                        borderColor: selectedCampo === c ? "var(--brand-600)" : "var(--slate-200)",
                        background: selectedCampo === c ? "var(--brand-600)" : "#ffffff",
                        color: selectedCampo === c ? "#ffffff" : "var(--slate-700)",
                        fontWeight: selectedCampo === c ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ minWidth: "260px" }}>
                <input
                  type="text"
                  className="input"
                  style={{ fontSize: "13px", padding: "8px 12px" }}
                  placeholder="Buscar por lote, laboratorio o notas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Grilla de Tarjetas de Análisis Químicos */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
              {filteredSoils.map((item) => {
                return (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      padding: "16px 20px",
                      background: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                      boxShadow: "var(--shadow-sm)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      {/* Cabecera de la tarjeta */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--slate-950)" }}>
                              {item.campo} · {item.lote}
                            </span>
                            <span className="pill badgeGreen" style={{ fontSize: "10.5px", fontWeight: 700 }}>
                              ✓ Activo en lote
                            </span>
                          </div>
                          <span style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginTop: "2px" }}>
                            🔬 {item.laboratorio} · Muestreo: {fmtDate(item.fecha)} · Prof: {item.profundidad}
                          </span>
                        </div>
                      </div>

                      {/* Parámetros Analíticos Clave */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: "8px",
                          background: "var(--slate-50)",
                          padding: "10px",
                          borderRadius: "8px",
                          marginBottom: "12px",
                        }}
                      >
                        <div style={{ textAlign: "center" }}>
                          <span style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>Fósforo Bray</span>
                          <strong style={{ fontSize: "15px", color: item.fosforoBrayPpm >= 20 ? "#16a34a" : "#d97706" }}>
                            {item.fosforoBrayPpm} ppm
                          </strong>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <span style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>N Disponible</span>
                          <strong style={{ fontSize: "15px", color: "var(--brand-700)" }}>
                            {item.nDisponibleKgHa} kg/ha
                          </strong>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <span style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>Mat. Orgánica</span>
                          <strong style={{ fontSize: "15px", color: "var(--slate-800)" }}>
                            {item.materiaOrganicaPct}%
                          </strong>
                        </div>

                        <div style={{ textAlign: "center" }}>
                          <span style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>pH actual</span>
                          <strong style={{ fontSize: "13.5px", color: "var(--slate-800)" }}>
                            {item.ph}
                          </strong>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <span style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>Potasio (K)</span>
                          <strong style={{ fontSize: "13.5px", color: "#0284c7" }}>
                            {item.potasioPpm} ppm
                          </strong>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <span style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>Calcio (Ca)</span>
                          <strong style={{ fontSize: "13.5px", color: "var(--slate-800)" }}>
                            {item.calcioPpm} ppm
                          </strong>
                        </div>

                        <div style={{ textAlign: "center" }}>
                          <span style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>Magnesio (Mg)</span>
                          <strong style={{ fontSize: "13.5px", color: "var(--slate-800)" }}>
                            {item.magnesioPpm} ppm
                          </strong>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <span style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>Azufre (S)</span>
                          <strong style={{ fontSize: "13.5px", color: "var(--slate-800)" }}>
                            {item.azufrePpm} ppm
                          </strong>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <span style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>Zinc (Zn)</span>
                          <strong style={{ fontSize: "13.5px", color: "var(--slate-800)" }}>
                            {item.zincPpm} ppm
                          </strong>
                        </div>
                      </div>

                      {/* Observaciones o recomendación */}
                      {item.recomendacionLab && (
                        <div style={{ fontSize: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 10px", borderRadius: "6px", color: "#166534", marginBottom: "8px" }}>
                          <strong>💡 Recomendación Lab: </strong>{item.recomendacionLab}
                        </div>
                      )}

                      {item.observaciones && (
                        <div style={{ fontSize: "11.5px", color: "var(--slate-500)", fontStyle: "italic", marginBottom: "12px" }}>
                          📝 {item.observaciones}
                        </div>
                      )}
                    </div>

                    {/* Barra de Acciones */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: "10px", marginTop: "4px" }}>
                      <Link
                        href={`/agricultura/${item.campo.toLowerCase()}`}
                        className="thResetBtn"
                        style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        👁️ Ver en ficha del lote →
                      </Link>

                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="secondaryButton smallButton"
                          onClick={() => handleOpenEdit("suelo", item)}
                          style={{ fontSize: "12px", padding: "4px 8px" }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          className="secondaryButton smallButton textDanger"
                          onClick={() => handleDeleteSoil(item.id, item.lote, item.campo)}
                          style={{ fontSize: "12px", padding: "4px 8px" }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredSoils.length === 0 && (
              <div style={{ padding: "48px 24px", textAlign: "center", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>🧪</div>
                <h3 style={{ margin: "0 0 6px", color: "var(--slate-800)" }}>No se encontraron análisis de suelo</h3>
                <p className="muted" style={{ margin: "0 0 16px", fontSize: "13.5px" }}>
                  Podés cargar un nuevo análisis químico haciendo clic en el botón superior.
                </p>
                <button type="button" className="primaryButton" onClick={() => handleOpenNew("suelo")}>
                  + Cargar Análisis de Suelo
                </button>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 2: ENMIENDAS ORGÁNICAS (ESTIÉRCOL SÓLIDO Y LÍQUIDO) */}
        {activeTab === "enmiendas" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "20px", marginBottom: "24px" }}>
              {/* Tarjeta de Estiércol Sólido */}
              <div className="card" style={{ padding: "20px", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "20px" }}>🚜</span>
                      <h3 style={{ margin: 0, fontSize: "18px", color: "var(--slate-950)" }}>
                        Estiércol Sólido Homogéneo
                      </h3>
                    </div>
                    <span style={{ fontSize: "12.5px", color: "var(--muted)", display: "block", marginTop: "3px" }}>
                      Protocolo: <strong>{solidManure.protocolo}</strong> · {solidManure.laboratorio} · {fmtDate(solidManure.fecha)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="secondaryButton smallButton"
                    onClick={() => handleOpenEdit("manure_solido", solidManure)}
                  >
                    ✏️ Actualizar Protocolo
                  </button>
                </div>

                <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--line)", marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--slate-800)" }}>Capacidad del Carro Distribuidor:</span>
                    <strong style={{ fontSize: "15px", color: "var(--brand-800)" }}>{solidManure.toneladasPorCarro || 5} tn netas</strong>
                  </div>
                </div>

                <h4 style={{ margin: "0 0 10px", fontSize: "13.5px", color: "var(--slate-700)" }}>Riqueza Nutricional por Tonelada de Sólido:</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "16px" }}>
                  <div style={{ padding: "8px 10px", background: "#f0fdf4", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <span style={{ fontSize: "11px", color: "#166534", display: "block" }}>Nitrógeno Total (N)</span>
                    <strong style={{ fontSize: "14px", color: "#166534" }}>{solidManure.nitrogenoTotalPct}% ({solidManure.nitrogenoTotalPct * 10} kg/tn)</strong>
                  </div>
                  <div style={{ padding: "8px 10px", background: "#eff6ff", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                    <span style={{ fontSize: "11px", color: "#1d4ed8", display: "block" }}>Fósforo Total (P)</span>
                    <strong style={{ fontSize: "14px", color: "#1d4ed8" }}>{solidManure.fosforoTotalPct}% ({solidManure.fosforoTotalPct * 10} kg/tn = {(solidManure.fosforoTotalPct * 22.9).toFixed(1)} P₂O₅)</strong>
                  </div>
                  <div style={{ padding: "8px 10px", background: "#fef3c7", borderRadius: "6px", border: "1px solid #fde68a" }}>
                    <span style={{ fontSize: "11px", color: "#92400e", display: "block" }}>Potasio Total (K)</span>
                    <strong style={{ fontSize: "14px", color: "#92400e" }}>{solidManure.potasioTotalPct}% ({solidManure.potasioTotalPct * 10} kg/tn = {(solidManure.potasioTotalPct * 12.06).toFixed(1)} K₂O)</strong>
                  </div>
                  <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "11px", color: "var(--slate-600)", display: "block" }}>Materia Orgánica (MO)</span>
                    <strong style={{ fontSize: "14px", color: "var(--slate-800)" }}>{solidManure.materiaOrganicaPct}% ({solidManure.materiaOrganicaPct * 10} kg/tn)</strong>
                  </div>
                </div>

                <div style={{ background: "var(--slate-900)", color: "#ffffff", padding: "12px 16px", borderRadius: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--slate-300)", display: "block", marginBottom: "4px" }}>
                    Aporte Neto por Cada Carro Aplicado (5 toneladas):
                  </span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#86efac" }}>60 kg N</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#93c5fd" }}>50 kg P</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#fcd34d" }}>123.5 kg K</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#cbd5e1" }}>1.320 kg MO</span>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Efluente Líquido */}
              <div className="card" style={{ padding: "20px", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "20px" }}>💧</span>
                      <h3 style={{ margin: 0, fontSize: "18px", color: "var(--slate-950)" }}>
                        Efluente Líquido de Tambo
                      </h3>
                    </div>
                    <span style={{ fontSize: "12.5px", color: "var(--muted)", display: "block", marginTop: "3px" }}>
                      Protocolo: <strong>{liquidManure.protocolo}</strong> · {liquidManure.laboratorio} · {fmtDate(liquidManure.fecha)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="secondaryButton smallButton"
                    onClick={() => handleOpenEdit("manure_liquido", liquidManure)}
                  >
                    ✏️ Actualizar Protocolo
                  </button>
                </div>

                <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--line)", marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--slate-800)" }}>Capacidad del Tanque Estercolero:</span>
                    <strong style={{ fontSize: "15px", color: "#0284c7" }}>{liquidManure.m3PorTanque || 12} m³ (12.000 L)</strong>
                  </div>
                </div>

                <h4 style={{ margin: "0 0 10px", fontSize: "13.5px", color: "var(--slate-700)" }}>Concentración Nutricional por m³ (kL):</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "16px" }}>
                  <div style={{ padding: "8px 10px", background: "#f0fdf4", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <span style={{ fontSize: "11px", color: "#166534", display: "block" }}>Nitrógeno (N)</span>
                    <strong style={{ fontSize: "14px", color: "#166534" }}>{liquidManure.nitrogenoKgM3} kg / m³</strong>
                  </div>
                  <div style={{ padding: "8px 10px", background: "#eff6ff", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                    <span style={{ fontSize: "11px", color: "#1d4ed8", display: "block" }}>Fósforo (P)</span>
                    <strong style={{ fontSize: "14px", color: "#1d4ed8" }}>{liquidManure.fosforoKgM3} kg / m³</strong>
                  </div>
                  <div style={{ padding: "8px 10px", background: "#fef3c7", borderRadius: "6px", border: "1px solid #fde68a" }}>
                    <span style={{ fontSize: "11px", color: "#92400e", display: "block" }}>Potasio (K)</span>
                    <strong style={{ fontSize: "14px", color: "#92400e" }}>{liquidManure.potasioKgM3} kg / m³</strong>
                  </div>
                  <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "11px", color: "var(--slate-600)", display: "block" }}>Materia Orgánica (MO)</span>
                    <strong style={{ fontSize: "14px", color: "var(--slate-800)" }}>{liquidManure.materiaOrganicaKgM3} kg / m³</strong>
                  </div>
                </div>

                <div style={{ background: "var(--slate-900)", color: "#ffffff", padding: "12px 16px", borderRadius: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--slate-300)", display: "block", marginBottom: "4px" }}>
                    Aporte Neto por Cada Tanque Aplicado (12.000 L / 12 m³):
                  </span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#86efac" }}>21.6 kg N</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#93c5fd" }}>7.2 kg P</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#fcd34d" }}>26.4 kg K</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#cbd5e1" }}>180 kg MO</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel de Equivalencias Agronómicas */}
            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid var(--line)" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "16px", color: "var(--slate-950)" }}>
                ⚖️ Criterio de Equivalencia e Intercambiabilidad Operativa
              </h3>
              <p style={{ margin: "0 0 12px", fontSize: "13.5px", color: "var(--slate-600)", lineHeight: 1.5 }}>
                En base a los ensayos de laboratorio, <strong>1 carro de estiércol sólido (5 tn) aporta el equivalente a 3,5 tanques de efluente líquido (12 m³)</strong>. El sistema utiliza estos coeficientes dinámicos para calcular automáticamente las dosis restantes necesarias en cada lote según el cultivo planificado.
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <Link href="/agricultura/tambo" className="primaryButton" style={{ fontSize: "13px" }}>
                  Ir a Simulación de Lotes en Tambo →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: PERFILES HÍDRICOS (0-200 CM) */}
        {activeTab === "humedad" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "16px" }}>
              {filteredMoistures.map((m) => (
                <div key={m.id} className="card" style={{ padding: "16px 20px", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <strong style={{ fontSize: "16px", color: "var(--slate-950)" }}>
                        {m.campo} · {m.lote}
                      </strong>
                      <span style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginTop: "2px" }}>
                        🔬 {m.laboratorio} · Muestreo: {fmtDate(m.fecha)}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="pill badgeBlue" style={{ fontSize: "13px", fontWeight: 700 }}>
                        {m.totalAguaUtilMm} mm
                      </span>
                      <small style={{ display: "block", fontSize: "10.5px", color: "var(--muted)", marginTop: "2px" }}>Agua útil total</small>
                    </div>
                  </div>

                  {/* Tabla de Estratos */}
                  <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse", marginBottom: "12px" }}>
                    <thead>
                      <tr style={{ background: "var(--slate-50)", borderBottom: "1px solid var(--line)" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Estrato</th>
                        <th style={{ padding: "6px 8px", textAlign: "right" }}>Humedad</th>
                        <th style={{ padding: "6px 8px", textAlign: "right" }}>PMP</th>
                        <th style={{ padding: "6px 8px", textAlign: "right" }}>Agua Útil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.estratos.map((est, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--slate-100)" }}>
                          <td style={{ padding: "6px 8px", fontWeight: 600 }}>{est.profundidadCm} cm</td>
                          <td style={{ padding: "6px 8px", textAlign: "right" }}>{est.humedadActualPct}%</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--muted)" }}>{est.pmpPct}%</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "#0284c7" }}>
                            {est.aguaUtilMm} mm ({est.aguaUtilPct}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {m.observaciones && (
                    <div style={{ fontSize: "11.5px", color: "var(--slate-600)", fontStyle: "italic", marginBottom: "12px" }}>
                      📝 {m.observaciones}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", borderTop: "1px solid var(--line)", paddingTop: "10px" }}>
                    <button
                      type="button"
                      className="secondaryButton smallButton"
                      onClick={() => handleOpenEdit("humedad", m)}
                      style={{ fontSize: "12px", padding: "4px 8px" }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      className="secondaryButton smallButton textDanger"
                      onClick={() => handleDeleteMoisture(m.id, m.lote, m.campo)}
                      style={{ fontSize: "12px", padding: "4px 8px" }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredMoistures.length === 0 && (
              <div style={{ padding: "48px 24px", textAlign: "center", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>💧</div>
                <h3 style={{ margin: "0 0 6px", color: "var(--slate-800)" }}>No se encontraron perfiles hídricos</h3>
                <p className="muted" style={{ margin: "0 0 16px", fontSize: "13.5px" }}>
                  Podés registrar un perfil hídrico de suelo con estratos de 0 a 200 cm.
                </p>
                <button type="button" className="primaryButton" onClick={() => handleOpenNew("humedad")}>
                  + Cargar Perfil Hídrico
                </button>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 4: OTROS ANÁLISIS (FORRAJES, SILOS, FOLIARES, AGUA) */}
        {activeTab === "otros" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "16px" }}>
              {filteredOther.map((item) => (
                <div key={item.id} className="card" style={{ padding: "16px 20px", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <span className="pill badgeAmber" style={{ fontSize: "11px", fontWeight: 700, marginBottom: "4px", display: "inline-block" }}>
                        {item.tipo}
                      </span>
                      <h4 style={{ margin: "2px 0 4px", fontSize: "15.5px", color: "var(--slate-950)" }}>
                        {item.titulo}
                      </h4>
                      <span style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>
                        {item.campo ? `${item.campo} ${item.lote ? `· ${item.lote}` : ""} · ` : ""}🔬 {item.laboratorio} · {fmtDate(item.fecha)}
                      </span>
                    </div>
                  </div>

                  {/* Tabla de Parámetros */}
                  <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse", marginBottom: "12px" }}>
                    <thead>
                      <tr style={{ background: "var(--slate-50)", borderBottom: "1px solid var(--line)" }}>
                        <th style={{ padding: "5px 8px", textAlign: "left" }}>Parámetro</th>
                        <th style={{ padding: "5px 8px", textAlign: "right" }}>Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.parametros.map((p, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--slate-100)" }}>
                          <td style={{ padding: "5px 8px" }}>{p.nombre}</td>
                          <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: "var(--slate-800)" }}>
                            {p.valor} {p.unidad || ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {item.conclusion && (
                    <div style={{ fontSize: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 10px", borderRadius: "6px", color: "#166534", marginBottom: "8px" }}>
                      <strong>Conclusión: </strong>{item.conclusion}
                    </div>
                  )}

                  {item.observaciones && (
                    <div style={{ fontSize: "11.5px", color: "var(--slate-500)", fontStyle: "italic", marginBottom: "12px" }}>
                      📝 {item.observaciones}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", borderTop: "1px solid var(--line)", paddingTop: "10px" }}>
                    <button
                      type="button"
                      className="secondaryButton smallButton"
                      onClick={() => handleOpenEdit("otro", item)}
                      style={{ fontSize: "12px", padding: "4px 8px" }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      className="secondaryButton smallButton textDanger"
                      onClick={() => handleDeleteOther(item.id, item.titulo)}
                      style={{ fontSize: "12px", padding: "4px 8px" }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredOther.length === 0 && (
              <div style={{ padding: "48px 24px", textAlign: "center", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>📋</div>
                <h3 style={{ margin: "0 0 6px", color: "var(--slate-800)" }}>No hay otros análisis registrados</h3>
                <p className="muted" style={{ margin: "0 0 16px", fontSize: "13.5px" }}>
                  Podés cargar análisis foliares, de agua de bebida o de calidad de silo y forrajes.
                </p>
                <button type="button" className="primaryButton" onClick={() => handleOpenNew("otro")}>
                  + Cargar Análisis de Forraje, Agua o Foliar
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODAL DE CARGA Y EDICIÓN CENTRALIZADO */}
        {isModalOpen && (
          <AnalisisModal
            type={modalType}
            initialData={editingItem}
            onClose={() => setIsModalOpen(false)}
            onSaved={() => {
              setIsModalOpen(false);
              reloadAll();
            }}
          />
        )}
      </main>
    </AppShell>
  );
}

// =========================================================================
// COMPONENTE MODAL DE CARGA / EDICIÓN POLIMÓRFICO
// =========================================================================

function AnalisisModal({
  type,
  initialData,
  onClose,
  onSaved,
}: {
  type: "suelo" | "manure_solido" | "manure_liquido" | "humedad" | "otro";
  initialData?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [currentType, setCurrentType] = useState<"suelo" | "manure_solido" | "manure_liquido" | "humedad" | "otro">(type);

  // Estados comunes
  const [campo, setCampo] = useState<string>(initialData?.campo || "Tambo");
  const [lote, setLote] = useState<string>(initialData?.lote || "Lote 1");
  const [fecha, setFecha] = useState<string>(initialData?.fecha || new Date().toISOString().split("T")[0]);
  const [laboratorio, setLaboratorio] = useState<string>(initialData?.laboratorio || "Laboratorio Molisol");
  const [observaciones, setObservaciones] = useState<string>(initialData?.observaciones || "");

  // Lotes dinámicos para el campo seleccionado
  const lotesDelCampo = useMemo(() => {
    const list = agricultureData.listLotes(campo);
    if (list && list.length > 0) return list.map((l) => l.nombre);
    if (campo.toLowerCase() === "tambo") return ["Lote 1", "Lote 2", "Lote 3", "Lote 4", "Lote 5", "Lote 6", "Lote 7", "Lote 8", "Lote 9"];
    if (campo.toLowerCase() === "racca") return ["Lote 1", "Lote 2"];
    if (campo.toLowerCase() === "keuneke") return ["Lote 1", "Lote 2"];
    return ["Lote Único"];
  }, [campo]);

  useEffect(() => {
    if (!initialData && lotesDelCampo.length > 0 && !lotesDelCampo.includes(lote)) {
      setLote(lotesDelCampo[0]);
    }
  }, [campo, lotesDelCampo, initialData, lote]);

  // Estados específicos de Suelo Químico
  const [fosforoBray, setFosforoBray] = useState<number | "">(initialData?.fosforoBrayPpm ?? 25);
  const [nNo3, setNNo3] = useState<number | "">(initialData?.nNo3Ppm ?? 12);
  const [nDisp, setNDisp] = useState<number | "">(initialData?.nDisponibleKgHa ?? 35);
  const [mo, setMo] = useState<number | "">(initialData?.materiaOrganicaPct ?? 2.7);
  const [ph, setPh] = useState<number | "">(initialData?.ph ?? 6.5);
  const [ce, setCe] = useState<number | "">(initialData?.conductividadElectricaUsCm ?? 50);
  const [potasio, setPotasio] = useState<number | "">(initialData?.potasioPpm ?? 600);
  const [calcio, setCalcio] = useState<number | "">(initialData?.calcioPpm ?? 1900);
  const [magnesio, setMagnesio] = useState<number | "">(initialData?.magnesioPpm ?? 250);
  const [azufre, setAzufre] = useState<number | "">(initialData?.azufrePpm ?? 10);
  const [zinc, setZinc] = useState<number | "">(initialData?.zincPpm ?? 0.8);
  const [boro, setBoro] = useState<number | "">(initialData?.boroPpm ?? 1.0);
  const [recomendacion, setRecomendacion] = useState<string>(initialData?.recomendacionLab || "");

  // Estados específicos de Estiércol Sólido
  const [protocoloSolido, setProtocoloSolido] = useState<string>(initialData?.protocolo || "E326");
  const [nSolidoPct, setNSolidoPct] = useState<number | "">(initialData?.nitrogenoTotalPct ?? 1.2);
  const [pSolidoPct, setPSolidoPct] = useState<number | "">(initialData?.fosforoTotalPct ?? 1.0);
  const [kSolidoPct, setKSolidoPct] = useState<number | "">(initialData?.potasioTotalPct ?? 2.47);
  const [sSolidoPct, setSSolidoPct] = useState<number | "">(initialData?.azufreTotalPct ?? 0.22);
  const [moSolidoPct, setMoSolidoPct] = useState<number | "">(initialData?.materiaOrganicaPct ?? 26.4);
  const [humedadSolido, setHumedadSolido] = useState<number | "">(initialData?.humedadPct ?? 31.8);
  const [tnPorCarro, setTnPorCarro] = useState<number | "">(initialData?.toneladasPorCarro ?? 5);

  // Estados específicos de Efluente Líquido
  const [protocoloLiquido, setProtocoloLiquido] = useState<string>(initialData?.protocolo || "LIQ-TAMBO-26");
  const [nLiquidoKgM3, setNLiquidoKgM3] = useState<number | "">(initialData?.nitrogenoKgM3 ?? 1.8);
  const [pLiquidoKgM3, setPLiquidoKgM3] = useState<number | "">(initialData?.fosforoKgM3 ?? 0.6);
  const [kLiquidoKgM3, setKLiquidoKgM3] = useState<number | "">(initialData?.potasioKgM3 ?? 2.2);
  const [sLiquidoKgM3, setSLiquidoKgM3] = useState<number | "">(initialData?.azufreKgM3 ?? 0.2);
  const [moLiquidoKgM3, setMoLiquidoKgM3] = useState<number | "">(initialData?.materiaOrganicaKgM3 ?? 15.0);
  const [m3PorTanque, setM3PorTanque] = useState<number | "">(initialData?.m3PorTanque ?? 12);

  // Estados específicos de Perfil Hídrico
  const [totalAguaUtilMm, setTotalAguaUtilMm] = useState<number | "">(initialData?.totalAguaUtilMm ?? 280);

  // Estados específicos de Otro Análisis
  const [otroTipo, setOtroTipo] = useState<"Foliar" | "Agua" | "Forraje / Silaje" | "Granos" | "Otro">(initialData?.tipo || "Forraje / Silaje");
  const [otroTitulo, setOtroTitulo] = useState<string>(initialData?.titulo || "");
  const [otroConclusion, setOtroConclusion] = useState<string>(initialData?.conclusion || "");
  const [parametrosList, setParametrosList] = useState<{ nombre: string; valor: string | number; unidad: string }[]>(
    initialData?.parametros || [
      { nombre: "Materia Seca", valor: 35, unidad: "%" },
      { nombre: "Proteína Bruta", valor: 8.5, unidad: "%" },
    ]
  );

  function addParametro() {
    setParametrosList((prev) => [...prev, { nombre: "", valor: "", unidad: "" }]);
  }

  function removeParametro(index: number) {
    setParametrosList((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (currentType === "suelo") {
      const record: SoilChemicalAnalysis = {
        id: initialData?.id || `soil-${campo.toLowerCase()}-${lote.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        campo,
        lote,
        fecha,
        laboratorio,
        profundidad: initialData?.profundidad || "0-20 cm",
        fosforoBrayPpm: Number(fosforoBray) || 0,
        nNo3Ppm: Number(nNo3) || 0,
        nDisponibleKgHa: Number(nDisp) || 0,
        ph: Number(ph) || 6.5,
        conductividadElectricaUsCm: Number(ce) || 0,
        materiaOrganicaPct: Number(mo) || 0,
        azufrePpm: Number(azufre) || 0,
        zincPpm: Number(zinc) || 0,
        calcioPpm: Number(calcio) || 0,
        magnesioPpm: Number(magnesio) || 0,
        potasioPpm: Number(potasio) || 0,
        sodioPpm: initialData?.sodioPpm || 40,
        cicMeq: initialData?.cicMeq || 17.0,
        satBasesPct: initialData?.satBasesPct || 80.0,
        boroPpm: Number(boro) || 0,
        recomendacionLab: recomendacion || undefined,
        observaciones: observaciones || undefined,
      };
      saveSoilAnalysis(record);
      alert(`✓ Análisis químico guardado y vinculado automáticamente a ${campo} (${lote}).`);
    } else if (currentType === "manure_solido") {
      const record: ManureAnalysis = {
        id: initialData?.id || "manure-clover-e326",
        protocolo: protocoloSolido,
        matriz: "Efluente Tambo - Sólido homogéneo",
        laboratorio: laboratorio || "Clover Laboratorio",
        fecha,
        humedadPct: Number(humedadSolido) || 31.8,
        materiaSecaPct: 100 - (Number(humedadSolido) || 31.8),
        nitrogenoTotalPct: Number(nSolidoPct) || 1.2,
        nitrogenoAmoniacalPct: initialData?.nitrogenoAmoniacalPct || 0.02,
        fosforoTotalPct: Number(pSolidoPct) || 1.0,
        potasioTotalPct: Number(kSolidoPct) || 2.47,
        azufreTotalPct: Number(sSolidoPct) || 0.22,
        materiaOrganicaPct: Number(moSolidoPct) || 26.4,
        carbonoOrganicoPct: initialData?.carbonoOrganicoPct || 15.3,
        relacionCN: initialData?.relacionCN || 12.78,
        ph: initialData?.ph || 9.5,
        ceUsCm: initialData?.ceUsCm || 3600,
        calcioPct: initialData?.calcioPct || 1.4,
        magnesioPct: initialData?.magnesioPct || 0.68,
        sodioPct: initialData?.sodioPct || 0.4,
        nitratosPpm: initialData?.nitratosPpm || 25,
        sulfatosPct: initialData?.sulfatosPct || 0.66,
        zincMgKg: initialData?.zincMgKg || 107.86,
        boroMgKg: initialData?.boroMgKg || 57.01,
        cobreMgKg: initialData?.cobreMgKg || 26.99,
        manganesoMgKg: initialData?.manganesoMgKg || 438.54,
        hierroPct: initialData?.hierroPct || 1.55,
        toneladasPorCarro: Number(tnPorCarro) || 5,
      };
      saveManureAnalysis(record);
      alert("✓ Protocolo de estiércol sólido actualizado con éxito.");
    } else if (currentType === "manure_liquido") {
      const record: LiquidManureAnalysis = {
        id: initialData?.id || "liquid-manure-tambo-01",
        protocolo: protocoloLiquido,
        matriz: "Efluente Tambo Líquido (Fosa / Laguna de decantación)",
        laboratorio: laboratorio || "Clover Laboratorio",
        fecha,
        nitrogenoKgM3: Number(nLiquidoKgM3) || 1.8,
        fosforoKgM3: Number(pLiquidoKgM3) || 0.6,
        potasioKgM3: Number(kLiquidoKgM3) || 2.2,
        azufreKgM3: Number(sLiquidoKgM3) || 0.2,
        materiaOrganicaKgM3: Number(moLiquidoKgM3) || 15.0,
        ph: initialData?.ph || 7.8,
        ceUsCm: initialData?.ceUsCm || 4500,
        m3PorTanque: Number(m3PorTanque) || 12,
        observaciones: observaciones || undefined,
      };
      saveLiquidManureAnalysis(record);
      alert("✓ Protocolo de efluente líquido actualizado con éxito.");
    } else if (currentType === "humedad") {
      const record: SoilMoistureProfile = {
        id: initialData?.id || `moisture-${campo.toLowerCase()}-${lote.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        campo,
        lote,
        fecha,
        laboratorio,
        totalAguaUtilMm: Number(totalAguaUtilMm) || 0,
        estratos: initialData?.estratos || [
          { profundidadCm: "0-20", humedadActualPct: 26.0, pmpPct: 18.0, aguaUtilPct: 60.0, aguaUtilMm: 22.0 },
          { profundidadCm: "20-60", humedadActualPct: 30.0, pmpPct: 20.0, aguaUtilPct: 75.0, aguaUtilMm: 55.0 },
          { profundidadCm: "60-100", humedadActualPct: 29.0, pmpPct: 19.0, aguaUtilPct: 70.0, aguaUtilMm: 52.0 },
          { profundidadCm: "100-150", humedadActualPct: 28.5, pmpPct: 18.0, aguaUtilPct: 85.0, aguaUtilMm: 72.0 },
          { profundidadCm: "150-200", humedadActualPct: 27.0, pmpPct: 16.0, aguaUtilPct: 92.0, aguaUtilMm: 79.0 },
        ],
        observaciones: observaciones || undefined,
      };
      saveMoistureProfile(record);
      alert(`✓ Perfil hídrico guardado para ${campo} (${lote}).`);
    } else if (currentType === "otro") {
      if (!otroTitulo.trim()) {
        alert("Por favor ingresá un título descriptivo para el análisis.");
        return;
      }
      const record: OtherLabAnalysis = {
        id: initialData?.id || `other-lab-${Date.now()}`,
        tipo: otroTipo,
        titulo: otroTitulo,
        campo: campo || undefined,
        lote: lote || undefined,
        fecha,
        laboratorio,
        conclusion: otroConclusion || undefined,
        observaciones: observaciones || undefined,
        parametros: parametrosList.filter((p) => p.nombre.trim().length > 0),
      };
      saveOtherAnalysis(record);
      alert(`✓ Análisis de "${otroTitulo}" guardado exitosamente.`);
    }

    onSaved();
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal modalWide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "760px", maxHeight: "90vh", overflowY: "auto" }}>
        {/* Header Modal */}
        <div className="modalHeader">
          <div>
            <p className="eyebrow" style={{ color: "var(--brand-700)", fontWeight: 700 }}>
              LABORATORIO & SUELOS HJB
            </p>
            <h2 style={{ margin: "2px 0 0" }}>
              {initialData ? "Editar Informe de Laboratorio" : "Cargar Nuevo Análisis de Laboratorio"}
            </h2>
          </div>
          <button type="button" className="iconButton" onClick={onClose} title="Cerrar">
            ×
          </button>
        </div>

        {/* Selector de Tipo de Análisis (si es nueva carga) */}
        {!initialData && (
          <div style={{ padding: "16px 20px", background: "var(--slate-50)", borderBottom: "1px solid var(--line)" }}>
            <label style={{ margin: "0 0 8px", fontSize: "12.5px", fontWeight: 700, color: "var(--slate-700)" }}>
              Tipo de Análisis a Cargar:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px" }}>
              {[
                { id: "suelo", label: "🧪 Suelo Químico" },
                { id: "manure_solido", label: "🚜 Estiércol Sólido" },
                { id: "manure_liquido", label: "💧 Efluente Líquido" },
                { id: "humedad", label: "💧 Perfil Hídrico" },
                { id: "otro", label: "📋 Otro Análisis" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCurrentType(t.id as any)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: currentType === t.id ? "var(--brand-600)" : "var(--slate-200)",
                    background: currentType === t.id ? "var(--brand-600)" : "#ffffff",
                    color: currentType === t.id ? "#ffffff" : "var(--slate-700)",
                    textAlign: "center",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: "20px" }}>
          {/* SECCIÓN A: ANÁLISIS QUÍMICO DE SUELO */}
          {currentType === "suelo" && (
            <div>
              <div className="formGrid two" style={{ marginBottom: "14px" }}>
                <div>
                  <label>Campo</label>
                  <select className="input" value={campo} onChange={(e) => setCampo(e.target.value)}>
                    {CAMPOS_DISPONIBLES.filter((c) => c !== "Todos").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Lote correspondiente</label>
                  <select className="input" value={lote} onChange={(e) => setLote(e.target.value)}>
                    {lotesDelCampo.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="formGrid two" style={{ marginBottom: "16px" }}>
                <div>
                  <label>Fecha de Muestreo</label>
                  <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
                <div>
                  <label>Laboratorio</label>
                  <input type="text" className="input" value={laboratorio} onChange={(e) => setLaboratorio(e.target.value)} placeholder="ej: Laboratorio Molisol" />
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid var(--line)", marginBottom: "16px" }}>
                <strong style={{ fontSize: "13.5px", color: "var(--brand-800)", display: "block", marginBottom: "10px" }}>
                  Parámetros Analíticos Principales (0-20 cm):
                </strong>

                <div className="formGrid threeForm" style={{ gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>Fósforo Bray (ppm)</label>
                    <input type="number" step="0.1" className="input" value={fosforoBray} onChange={(e) => setFosforoBray(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>N Disponible (kg/ha)</label>
                    <input type="number" step="0.1" className="input" value={nDisp} onChange={(e) => setNDisp(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>Materia Orgánica (%)</label>
                    <input type="number" step="0.01" className="input" value={mo} onChange={(e) => setMo(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                </div>

                <div className="formGrid threeForm" style={{ gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>pH</label>
                    <input type="number" step="0.01" className="input" value={ph} onChange={(e) => setPh(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>Potasio K (ppm)</label>
                    <input type="number" step="1" className="input" value={potasio} onChange={(e) => setPotasio(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>Calcio Ca (ppm)</label>
                    <input type="number" step="1" className="input" value={calcio} onChange={(e) => setCalcio(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                </div>

                <div className="formGrid threeForm" style={{ gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>Magnesio Mg (ppm)</label>
                    <input type="number" step="1" className="input" value={magnesio} onChange={(e) => setMagnesio(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>Azufre S (ppm)</label>
                    <input type="number" step="0.1" className="input" value={azufre} onChange={(e) => setAzufre(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>Zinc Zn (ppm)</label>
                    <input type="number" step="0.01" className="input" value={zinc} onChange={(e) => setZinc(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label>Recomendación de Fertilización del Laboratorio (opcional)</label>
                <input
                  type="text"
                  className="input"
                  value={recomendacion}
                  onChange={(e) => setRecomendacion(e.target.value)}
                  placeholder="ej: Para Maíz 120 qq/ha: MAP c/ S y Zn 80 kg/ha | Urea 200 kg/ha"
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label>Observaciones de Muestreo / Ficha</label>
                <textarea
                  className="input"
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas adicionales..."
                />
              </div>

              <div style={{ background: "#f0fdf4", padding: "10px 14px", borderRadius: "8px", border: "1px solid #bbf7d0", fontSize: "12px", color: "#166534" }}>
                ✓ <strong>Vinculación Inmediata: </strong>Al guardar, este informe actualizará al instante los análisis químicos del <strong>{lote} de {campo}</strong>, impactando en su balance N-P-K y en el mapa satelital.
              </div>
            </div>
          )}

          {/* SECCIÓN B: ESTIÉRCOL SÓLIDO */}
          {currentType === "manure_solido" && (
            <div>
              <div className="formGrid two" style={{ marginBottom: "14px" }}>
                <div>
                  <label>Protocolo de Laboratorio</label>
                  <input type="text" className="input" value={protocoloSolido} onChange={(e) => setProtocoloSolido(e.target.value)} />
                </div>
                <div>
                  <label>Fecha de Ensayo</label>
                  <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
              </div>

              <div className="formGrid two" style={{ marginBottom: "16px" }}>
                <div>
                  <label>Laboratorio</label>
                  <input type="text" className="input" value={laboratorio} onChange={(e) => setLaboratorio(e.target.value)} />
                </div>
                <div>
                  <label>Toneladas Netas por Carro</label>
                  <input type="number" step="0.5" className="input" value={tnPorCarro} onChange={(e) => setTnPorCarro(e.target.value ? Number(e.target.value) : "")} />
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid var(--line)", marginBottom: "16px" }}>
                <strong style={{ fontSize: "13px", color: "var(--slate-800)", display: "block", marginBottom: "10px" }}>
                  Concentraciones Analíticas (%):
                </strong>
                <div className="formGrid threeForm" style={{ gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>% Nitrógeno Total</label>
                    <input type="number" step="0.01" className="input" value={nSolidoPct} onChange={(e) => setNSolidoPct(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>% Fósforo Total</label>
                    <input type="number" step="0.01" className="input" value={pSolidoPct} onChange={(e) => setPSolidoPct(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>% Potasio Total</label>
                    <input type="number" step="0.01" className="input" value={kSolidoPct} onChange={(e) => setKSolidoPct(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                </div>

                <div className="formGrid threeForm" style={{ gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>% Azufre Total</label>
                    <input type="number" step="0.01" className="input" value={sSolidoPct} onChange={(e) => setSSolidoPct(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>% Materia Orgánica</label>
                    <input type="number" step="0.1" className="input" value={moSolidoPct} onChange={(e) => setMoSolidoPct(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>% Humedad</label>
                    <input type="number" step="0.1" className="input" value={humedadSolido} onChange={(e) => setHumedadSolido(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN C: EFLUENTE LÍQUIDO */}
          {currentType === "manure_liquido" && (
            <div>
              <div className="formGrid two" style={{ marginBottom: "14px" }}>
                <div>
                  <label>Protocolo / Identificación</label>
                  <input type="text" className="input" value={protocoloLiquido} onChange={(e) => setProtocoloLiquido(e.target.value)} />
                </div>
                <div>
                  <label>Fecha de Muestreo</label>
                  <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
              </div>

              <div className="formGrid two" style={{ marginBottom: "16px" }}>
                <div>
                  <label>Laboratorio</label>
                  <input type="text" className="input" value={laboratorio} onChange={(e) => setLaboratorio(e.target.value)} />
                </div>
                <div>
                  <label>Volumen por Tanque (m³ o kL)</label>
                  <input type="number" step="1" className="input" value={m3PorTanque} onChange={(e) => setM3PorTanque(e.target.value ? Number(e.target.value) : "")} />
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid var(--line)", marginBottom: "16px" }}>
                <strong style={{ fontSize: "13px", color: "var(--slate-800)", display: "block", marginBottom: "10px" }}>
                  Aporte Nutricional por m³ (kL):
                </strong>
                <div className="formGrid threeForm" style={{ gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>kg Nitrógeno / m³</label>
                    <input type="number" step="0.1" className="input" value={nLiquidoKgM3} onChange={(e) => setNLiquidoKgM3(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>kg Fósforo / m³</label>
                    <input type="number" step="0.1" className="input" value={pLiquidoKgM3} onChange={(e) => setPLiquidoKgM3(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>kg Potasio / m³</label>
                    <input type="number" step="0.1" className="input" value={kLiquidoKgM3} onChange={(e) => setKLiquidoKgM3(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                </div>

                <div className="formGrid two" style={{ gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>kg Azufre / m³</label>
                    <input type="number" step="0.05" className="input" value={sLiquidoKgM3} onChange={(e) => setSLiquidoKgM3(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11.5px", margin: "0 0 3px" }}>kg Materia Orgánica / m³</label>
                    <input type="number" step="1" className="input" value={moLiquidoKgM3} onChange={(e) => setMoLiquidoKgM3(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN D: PERFIL HÍDRICO */}
          {currentType === "humedad" && (
            <div>
              <div className="formGrid two" style={{ marginBottom: "14px" }}>
                <div>
                  <label>Campo</label>
                  <select className="input" value={campo} onChange={(e) => setCampo(e.target.value)}>
                    {CAMPOS_DISPONIBLES.filter((c) => c !== "Todos").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Lote</label>
                  <select className="input" value={lote} onChange={(e) => setLote(e.target.value)}>
                    {lotesDelCampo.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="formGrid two" style={{ marginBottom: "16px" }}>
                <div>
                  <label>Fecha de Muestreo</label>
                  <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
                <div>
                  <label>Total Agua Útil Perfil 0-200 cm (mm)</label>
                  <input type="number" step="0.5" className="input" value={totalAguaUtilMm} onChange={(e) => setTotalAguaUtilMm(e.target.value ? Number(e.target.value) : "")} />
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label>Observaciones del Perfil</label>
                <textarea className="input" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas de estratificación o recarga..." />
              </div>
            </div>
          )}

          {/* SECCIÓN E: OTRO ANÁLISIS */}
          {currentType === "otro" && (
            <div>
              <div className="formGrid two" style={{ marginBottom: "14px" }}>
                <div>
                  <label>Tipo de Análisis</label>
                  <select className="input" value={otroTipo} onChange={(e) => setOtroTipo(e.target.value as any)}>
                    <option value="Forraje / Silaje">Forraje / Silaje</option>
                    <option value="Agua">Agua de Bebida / Riego</option>
                    <option value="Foliar">Foliar (Tejido vegetal)</option>
                    <option value="Granos">Granos Comerciales</option>
                    <option value="Otro">Otro Tipo</option>
                  </select>
                </div>
                <div>
                  <label>Título descriptivo</label>
                  <input
                    type="text"
                    className="input"
                    value={otroTitulo}
                    onChange={(e) => setOtroTitulo(e.target.value)}
                    placeholder="ej: Calidad Silo Maíz 2026 - Tambo L4"
                  />
                </div>
              </div>

              <div className="formGrid threeForm" style={{ marginBottom: "16px" }}>
                <div>
                  <label>Campo (opcional)</label>
                  <select className="input" value={campo} onChange={(e) => setCampo(e.target.value)}>
                    {CAMPOS_DISPONIBLES.filter((c) => c !== "Todos").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Lote (opcional)</label>
                  <select className="input" value={lote} onChange={(e) => setLote(e.target.value)}>
                    {lotesDelCampo.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Fecha</label>
                  <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
              </div>

              {/* Parámetros Dinámicos */}
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid var(--line)", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <strong style={{ fontSize: "13px", color: "var(--slate-800)" }}>Resultados y Parámetros del Ensayo:</strong>
                  <button type="button" className="thResetBtn" style={{ fontSize: "11px" }} onClick={addParametro}>
                    + Agregar Parámetro
                  </button>
                </div>

                {parametrosList.map((p, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: "12.5px", padding: "6px 10px" }}
                      value={p.nombre}
                      onChange={(e) => {
                        const val = e.target.value;
                        setParametrosList((prev) => prev.map((item, i) => (i === idx ? { ...item, nombre: val } : item)));
                      }}
                      placeholder="Nombre parámetro (ej: Proteína Bruta)"
                    />
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: "12.5px", padding: "6px 10px" }}
                      value={p.valor}
                      onChange={(e) => {
                        const val = e.target.value;
                        setParametrosList((prev) => prev.map((item, i) => (i === idx ? { ...item, valor: val } : item)));
                      }}
                      placeholder="Valor"
                    />
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: "12.5px", padding: "6px 10px" }}
                      value={p.unidad}
                      onChange={(e) => {
                        const val = e.target.value;
                        setParametrosList((prev) => prev.map((item, i) => (i === idx ? { ...item, unidad: val } : item)));
                      }}
                      placeholder="Unidad (ej: %)"
                    />
                    <button
                      type="button"
                      className="iconButton textDanger"
                      onClick={() => removeParametro(idx)}
                      style={{ padding: "4px" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label>Conclusión Agronómica</label>
                <textarea className="input" rows={2} value={otroConclusion} onChange={(e) => setOtroConclusion(e.target.value)} placeholder="Conclusiones o diagnóstico del laboratorio..." />
              </div>
            </div>
          )}

          {/* Botonera Guardar / Cancelar */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
            <button type="button" className="secondaryButton" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="primaryButton" onClick={handleSave}>
              Guardar Informe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
