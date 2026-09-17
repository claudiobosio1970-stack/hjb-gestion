"use client";

import { useState, useEffect, useMemo } from "react";
import { SoilAnalysis, agricultureData, HJB_AGRICULTURE_SYNC_EVENT, Lote } from "@/lib/agricultureData";
import {
  SoilChemicalAnalysis,
  SoilMoistureProfile,
  ManureAnalysis,
  LoteNutrientSummary,
  listSoilAnalyses,
  listMoistureProfiles,
  getManureAnalysis,
  computeLoteNutrientSummary,
  HJB_SOIL_SYNC_EVENT,
  DEFAULT_MANURE_ANALYSIS,
} from "@/lib/soilManureData";

const defaultParams = [
  ["Materia orgánica", "%"],
  ["Fósforo", "ppm"],
  ["Nitrógeno", "ppm"],
  ["Azufre", "ppm"],
  ["Zinc", "ppm"],
  ["pH", ""],
];

function fmtDate(value: string) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

export default function SoilPanel({
  campoNombre = "Tambo",
  analyses = [],
  onChanged,
}: {
  campoNombre?: string;
  analyses?: SoilAnalysis[];
  onChanged?: () => void;
}) {
  const [soils, setSoils] = useState<SoilChemicalAnalysis[]>([]);
  const [moistures, setMoistures] = useState<SoilMoistureProfile[]>([]);
  const [manure, setManure] = useState<ManureAnalysis>(DEFAULT_MANURE_ANALYSIS);
  const [selectedLoteNombre, setSelectedLoteNombre] = useState<string>("TODOS");
  const [targetCrop, setTargetCrop] = useState<string>("Maíz Silo");
  const [showManureModal, setShowManureModal] = useState<boolean>(false);

  // Modal para agregar análisis manual
  const [openAddModal, setOpenAddModal] = useState<boolean>(false);
  const [fecha, setFecha] = useState("");
  const [laboratorio, setLaboratorio] = useState("");
  const [profundidad, setProfundidad] = useState("0–20 cm");
  const [values, setValues] = useState<Record<string, string>>({});

  function refreshData() {
    setSoils(listSoilAnalyses());
    setMoistures(listMoistureProfiles());
    setManure(getManureAnalysis());
  }

  useEffect(() => {
    refreshData();

    function onSync() {
      refreshData();
    }

    window.addEventListener(HJB_SOIL_SYNC_EVENT, onSync);
    window.addEventListener(HJB_AGRICULTURE_SYNC_EVENT, onSync);

    return () => {
      window.removeEventListener(HJB_SOIL_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_AGRICULTURE_SYNC_EVENT, onSync);
    };
  }, []);

  // Obtener lotes del campo actual
  const lotesDelCampo: Lote[] = useMemo(() => {
    const list = agricultureData.listLotes(campoNombre);
    if (list && list.length > 0) return list;

    // Fallback con nombres canónicos si aún no hay lotes guardados en store para este campo
    if (campoNombre.toLowerCase() === "tambo") {
      return [
        { id: "tambo-l1", campo: "Tambo", nombre: "Lote 1", superficieHa: 5, cultivoActual: "Maíz Silo", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l2", campo: "Tambo", nombre: "Lote 2", superficieHa: 5, cultivoActual: "Maíz Silo", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l3", campo: "Tambo", nombre: "Lote 3", superficieHa: 6, cultivoActual: "Maíz Silo", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l4", campo: "Tambo", nombre: "Lote 4", superficieHa: 5, cultivoActual: "Maíz", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l5", campo: "Tambo", nombre: "Lote 5", superficieHa: 9, cultivoActual: "Alfalfa", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l6", campo: "Tambo", nombre: "Lote 6", superficieHa: 8, cultivoActual: "Pastura Consociada", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l7", campo: "Tambo", nombre: "Lote 7", superficieHa: 10, cultivoActual: "Maíz", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l8", campo: "Tambo", nombre: "Lote 8", superficieHa: 12, cultivoActual: "Alfalfa", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l9", campo: "Tambo", nombre: "Lote 9", superficieHa: 13, cultivoActual: "Alfalfa", campana: "2026/27", estado: "En producción" },
      ];
    }
    if (campoNombre.toLowerCase() === "racca") {
      return [
        { id: "racca-l1", campo: "Racca", nombre: "Lote 1", superficieHa: 55, cultivoActual: "Soja 1ra", campana: "2026/27", estado: "Planificado" },
        { id: "racca-l2", campo: "Racca", nombre: "Lote 2", superficieHa: 45, cultivoActual: "Maíz Silo", campana: "2026/27", estado: "Planificado" },
      ];
    }
    if (campoNombre.toLowerCase() === "kitty") {
      return [
        { id: "kitty-l1", campo: "Kitty", nombre: "Lote Único", superficieHa: 24, cultivoActual: "Maíz Silo", campana: "2026/27", estado: "En producción" },
      ];
    }
    return [
      { id: `${campoNombre.toLowerCase()}-l1`, campo: campoNombre, nombre: "Lote Único", superficieHa: 20, cultivoActual: "Agrícola", campana: "2026/27", estado: "En producción" },
    ];
  }, [campoNombre]);

  // Si no está seleccionado "TODOS" ni ningún lote válido, default a primer lote con análisis
  const activeLote = useMemo(() => {
    if (selectedLoteNombre === "TODOS") return null;
    return lotesDelCampo.find((l) => l.nombre.toLowerCase() === selectedLoteNombre.toLowerCase()) || lotesDelCampo[0];
  }, [selectedLoteNombre, lotesDelCampo]);

  // Resúmenes calculados para todos los lotes del campo
  const summariesDelCampo: LoteNutrientSummary[] = useMemo(() => {
    return lotesDelCampo.map((lote) =>
      computeLoteNutrientSummary(campoNombre, lote.nombre, lote.superficieHa || 5, targetCrop)
    );
  }, [lotesDelCampo, campoNombre, targetCrop, soils, moistures, manure]);

  // Resumen específico del lote seleccionado
  const activeSummary: LoteNutrientSummary | null = useMemo(() => {
    if (!activeLote) return null;
    return computeLoteNutrientSummary(
      campoNombre,
      activeLote.nombre,
      activeLote.superficieHa || 5,
      targetCrop
    );
  }, [activeLote, campoNombre, targetCrop, soils, moistures, manure]);

  // Totales acumulados en todo el campo
  const totalesCampo = useMemo(() => {
    let carros = 0;
    let tn = 0;
    let tanques = 0;
    let m3 = 0;
    let nKg = 0;
    let pKg = 0;
    let kKg = 0;
    let moKg = 0;

    summariesDelCampo.forEach((s) => {
      carros += s.carrosSolido;
      tn += s.toneladasSolido;
      tanques += s.tanquesLiquido;
      m3 += s.metrosCubicosLiquido;
      nKg += s.aportes.nitrogenoKg;
      pKg += s.aportes.fosforoKg;
      kKg += s.aportes.potasioKg;
      moKg += s.aportes.materiaOrganicaKg;
    });

    return { carros, tn, tanques, m3, nKg, pKg, kKg, moKg };
  }, [summariesDelCampo]);

  function saveCustomAnalysis() {
    if (!fecha) {
      alert("Ingresá la fecha del análisis.");
      return;
    }

    agricultureData.saveSoilAnalysis({
      id: crypto.randomUUID(),
      campo: campoNombre,
      campana: "2026/27",
      fecha,
      laboratorio: laboratorio || "Laboratorio Externo",
      profundidad,
      parametros: defaultParams
        .filter(([name]) => values[name])
        .map(([name, unit]) => ({
          id: crypto.randomUUID(),
          nombre: name,
          valor: values[name],
          unidad: unit,
        })),
      createdAt: new Date().toISOString(),
    });
    setOpenAddModal(false);
    setFecha("");
    setLaboratorio("");
    setValues({});
    refreshData();
    if (onChanged) onChanged();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ENCABEZADO PRINCIPAL DE LA PESTAÑA */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "14px",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span className="pill badgeGreen">Establecimiento {campoNombre}</span>
            <span className="pill badgeSlate">Muestreos Jul / Ago 2026 (Molisol)</span>
            <span className="pill badgeBlue">Protocolo Clover E326</span>
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--slate-900)", margin: 0 }}>
            🧪 Análisis de Suelos, Perfiles Hídricos y Balance de Enmiendas
          </h2>
          <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "13px" }}>
            Los análisis de suelo y humedad se realizaron <strong>previos a la distribución de estiércol y efluentes</strong>. El sistema calcula en tiempo real los nutrientes aportados por los carros esparcidos y recomienda los carros o tanques restantes necesarios para alcanzar el rendimiento potencial.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondaryButton"
            onClick={() => setShowManureModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span>📋</span>
            <span>Ficha Oficial Clover E326 (Estiércol)</span>
          </button>
          <button
            type="button"
            className="primaryButton"
            onClick={() => setOpenAddModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span>+</span>
            <span>Agregar análisis</span>
          </button>
        </div>
      </div>

      {/* SELECTOR DE LOTE Y META DE CULTIVO */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          background: "var(--slate-50)",
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-700)" }}>Lote a consultar:</span>
          <button
            type="button"
            onClick={() => setSelectedLoteNombre("TODOS")}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              border: selectedLoteNombre === "TODOS" ? "1.5px solid var(--brand-600)" : "1px solid var(--border)",
              background: selectedLoteNombre === "TODOS" ? "var(--brand-50)" : "#fff",
              color: selectedLoteNombre === "TODOS" ? "var(--brand-700)" : "var(--slate-700)",
            }}
          >
            🌟 Resumen General y Comparativa
          </button>

          {lotesDelCampo.map((lote) => {
            const isSelected = selectedLoteNombre.toLowerCase() === lote.nombre.toLowerCase();
            const sum = summariesDelCampo.find((s) => s.lote.toLowerCase() === lote.nombre.toLowerCase());
            const hasCarts = sum && sum.carrosSolido > 0;

            return (
              <button
                key={lote.id}
                type="button"
                onClick={() => setSelectedLoteNombre(lote.nombre)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: isSelected ? "1.5px solid var(--brand-600)" : "1px solid var(--border)",
                  background: isSelected ? "var(--brand-50)" : "#fff",
                  color: isSelected ? "var(--brand-700)" : "var(--slate-700)",
                }}
              >
                <span>{lote.nombre}</span>
                {hasCarts && (
                  <span
                    style={{
                      background: "#dcfce7",
                      color: "#166534",
                      fontSize: "10px",
                      padding: "1px 5px",
                      borderRadius: "10px",
                      fontWeight: 800,
                    }}
                  >
                    🚜 {sum.carrosSolido}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-700)" }}>Meta Nutricional:</label>
          <select
            className="select"
            style={{ fontSize: "12px", padding: "4px 8px" }}
            value={targetCrop}
            onChange={(e) => setTargetCrop(e.target.value)}
          >
            <option value="Maíz Silo">Maíz Silo (120 qq / 45 t MV) · Meta 200 kg N / 35 kg P</option>
            <option value="Maíz Grano">Maíz Grano (110 qq) · Meta 190 kg N / 30 kg P</option>
            <option value="Sorgo Silo">Sorgo Silo / Forrajero · Meta 160 kg N / 25 kg P</option>
            <option value="Pastura Consociada">Pastura Consociada · Meta 60 kg N / 40 kg P</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: DETALLE DEL LOTE SELECCIONADO */}
      {/* ========================================================================= */}
      {activeLote && activeSummary && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* BANNER DESTACADO DE RECOMENDACIÓN Y DIAGNÓSTICO */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "12px",
              border: activeSummary.estadoBalance === "Cubierto con holgura" ? "1.5px solid #22c55e" : "1.5px solid #f59e0b",
              background: activeSummary.estadoBalance === "Cubierto con holgura" ? "#f0fdf4" : "#fffbeb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ maxWidth: "780px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span
                  style={{
                    padding: "3px 9px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    background: activeSummary.estadoBalance === "Cubierto con holgura" ? "#16a34a" : "#d97706",
                    color: "#fff",
                  }}
                >
                  {activeSummary.estadoBalance === "Cubierto con holgura" ? "✓ Cubierto con Holgura" : "⚡ Se Recomienda Aplicar"}
                </span>
                <strong style={{ fontSize: "15px", color: "var(--slate-900)" }}>
                  Diagnóstico Nutricional · {activeLote.nombre} ({activeSummary.superficieHa} ha) · Cultivo: {targetCrop}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--slate-800)", lineHeight: "1.45" }}>
                {activeSummary.mensajeDiagnostico}
              </p>
            </div>

            <div
              style={{
                textAlign: "right",
                background: "#ffffff",
                padding: "12px 18px",
                borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.08)",
                minWidth: "190px",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", display: "block" }}>
                CARROS RESTANTES A TIRAR
              </span>
              <span
                style={{
                  fontSize: "26px",
                  fontWeight: 900,
                  color: activeSummary.carrosRestantesRecomendados === 0 ? "#16a34a" : "#d97706",
                  lineHeight: "1.2",
                  display: "block",
                }}
              >
                {activeSummary.carrosRestantesRecomendados === 0 ? "0 carros" : `${activeSummary.carrosRestantesRecomendados} carros`}
              </span>
              <small style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
                {activeSummary.carrosRestantesRecomendados === 0
                  ? "Meta nutricional superada"
                  : `o bien ${activeSummary.tanquesRestantesRecomendados} tanques efluente`}
              </small>
            </div>
          </div>

          {/* 4 TARJETAS DE BALANCE DE NUTRIENTES Y ENMIENDAS */}
          <div className="metricsGrid four">
            {/* Tarjeta 1: Enmiendas tiradas */}
            <div className="metricCard">
              <span className="metricLabel">Enmiendas Aplicadas</span>
              <span className="metricValue" style={{ fontSize: "20px" }}>
                {activeSummary.carrosSolido} carros / {activeSummary.tanquesLiquido} tanques
              </span>
              <small className="metricNote">
                {activeSummary.toneladasSolido > 0
                  ? `${activeSummary.toneladasSolido} tn sólidas (${(activeSummary.toneladasSolido / activeSummary.superficieHa).toFixed(1)} tn/ha)`
                  : "Sin estiércol sólido aún"}
                {activeSummary.metrosCubicosLiquido > 0 ? ` · ${activeSummary.metrosCubicosLiquido} m³ efluente` : ""}
              </small>
            </div>

            {/* Tarjeta 2: Nitrógeno */}
            <div className="metricCard">
              <span className="metricLabel">Nitrógeno (N Total)</span>
              <span className="metricValue" style={{ fontSize: "20px" }}>
                +{activeSummary.aportesPorHa.nitrogenoKgHa} kg N/ha
              </span>
              <small className="metricNote">
                Total incorporado: {activeSummary.aportes.nitrogenoKg.toLocaleString()} kg N
                <br />
                Suelo previo: {activeSummary.sueloPrevio ? `${activeSummary.sueloPrevio.nDisponibleKgHa} kg/ha` : "S/D"} | Meta: {activeSummary.metaKgHa.nitrogeno} kg/ha
              </small>
            </div>

            {/* Tarjeta 3: Fósforo */}
            <div className="metricCard">
              <span className="metricLabel">Fósforo (P Bray / Total)</span>
              <span className="metricValue" style={{ fontSize: "20px" }}>
                +{activeSummary.aportesPorHa.fosforoKgHa} kg P/ha
              </span>
              <small className="metricNote">
                Total incorporado: {activeSummary.aportes.fosforoKg.toLocaleString()} kg P (~{Math.round(activeSummary.aportes.fosforoKg * 2.29).toLocaleString()} kg P₂O₅)
                <br />
                Suelo previo Bray: {activeSummary.sueloPrevio ? `${activeSummary.sueloPrevio.fosforoBrayPpm} ppm` : "S/D"}
              </small>
            </div>

            {/* Tarjeta 4: Materia Orgánica & Potasio */}
            <div className="metricCard">
              <span className="metricLabel">Materia Orgánica & K</span>
              <span className="metricValue" style={{ fontSize: "20px" }}>
                +{activeSummary.aportesPorHa.materiaOrganicaTnHa} t MO / ha
              </span>
              <small className="metricNote">
                MO total: {(activeSummary.aportes.materiaOrganicaKg / 1000).toFixed(1)} tn | K: +{activeSummary.aportesPorHa.potasioKgHa} kg/ha
                <br />
                Suelo previo MO: {activeSummary.sueloPrevio ? `${activeSummary.sueloPrevio.materiaOrganicaPct}%` : "S/D"} | K: {activeSummary.sueloPrevio ? `${activeSummary.sueloPrevio.potasioPpm} ppm` : "S/D"}
              </small>
            </div>
          </div>

          {/* GRID DE ANÁLISIS DE SUELO Y PERFIL DE HUMEDAD */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "16px" }}>
            {/* COLUMNA 1: ANÁLISIS QUÍMICO DE SUELO (MOLISOL) */}
            <div className="card" style={{ padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "15px" }}>🧪</span>
                    <strong style={{ fontSize: "15px", color: "var(--slate-900)" }}>
                      Análisis Químico de Suelo (0–20 cm)
                    </strong>
                  </div>
                  <small style={{ color: "var(--muted)", display: "block", marginTop: "2px" }}>
                    Laboratorio Molisol · Fecha: {activeSummary.sueloPrevio ? fmtDate(activeSummary.sueloPrevio.fecha) : "21/07/2026"} · <strong>Previo a enmiendas</strong>
                  </small>
                </div>
                <span className="pill badgeAmber" style={{ fontSize: "10.5px" }}>Línea de Base</span>
              </div>

              {activeSummary.sueloPrevio ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                  <div className="soilParam">
                    <span>Fósforo Bray</span>
                    <strong style={{ fontSize: "15px" }}>{activeSummary.sueloPrevio.fosforoBrayPpm} ppm</strong>
                    <small style={{ color: "var(--muted)", fontSize: "10.5px" }}>
                      {activeSummary.sueloPrevio.fosforoBrayPpm >= 28 ? "Nivel muy alto" : "Nivel adecuado"}
                    </small>
                  </div>

                  <div className="soilParam">
                    <span>Nitrógeno Disponible</span>
                    <strong style={{ fontSize: "15px" }}>{activeSummary.sueloPrevio.nDisponibleKgHa} kg/ha</strong>
                    <small style={{ color: "var(--muted)", fontSize: "10.5px" }}>
                      {activeSummary.sueloPrevio.nNo3Ppm} ppm N-NO₃
                    </small>
                  </div>

                  <div className="soilParam">
                    <span>Materia Orgánica</span>
                    <strong style={{ fontSize: "15px" }}>{activeSummary.sueloPrevio.materiaOrganicaPct}%</strong>
                    <small style={{ color: "var(--muted)", fontSize: "10.5px" }}>Excelente fertilidad física</small>
                  </div>

                  <div className="soilParam">
                    <span>pH Actual</span>
                    <strong style={{ fontSize: "15px" }}>{activeSummary.sueloPrevio.ph}</strong>
                    <small style={{ color: "var(--muted)", fontSize: "10.5px" }}>Ligeramente ácido / Neutro</small>
                  </div>

                  <div className="soilParam">
                    <span>Azufre (S)</span>
                    <strong style={{ fontSize: "15px" }}>{activeSummary.sueloPrevio.azufrePpm} ppm</strong>
                    <small style={{ color: "var(--muted)", fontSize: "10.5px" }}>Sulfatos solubles</small>
                  </div>

                  <div className="soilParam">
                    <span>Potasio (K)</span>
                    <strong style={{ fontSize: "15px" }}>{activeSummary.sueloPrevio.potasioPpm} ppm</strong>
                    <small style={{ color: "var(--muted)", fontSize: "10.5px" }}>Muy bien provisto</small>
                  </div>

                  <div className="soilParam">
                    <span>Zinc (Zn)</span>
                    <strong style={{ fontSize: "15px" }}>{activeSummary.sueloPrevio.zincPpm} ppm</strong>
                    <small style={{ color: "var(--muted)", fontSize: "10.5px" }}>Micronutriente crítico maíz</small>
                  </div>

                  <div className="soilParam">
                    <span>C.I.C. y Sat. Bases</span>
                    <strong style={{ fontSize: "15px" }}>{activeSummary.sueloPrevio.cicMeq} meq · {activeSummary.sueloPrevio.satBasesPct}%</strong>
                    <small style={{ color: "var(--muted)", fontSize: "10.5px" }}>Ca: {activeSummary.sueloPrevio.calcioPpm} | Mg: {activeSummary.sueloPrevio.magnesioPpm}</small>
                  </div>
                </div>
              ) : (
                <div className="emptyState" style={{ padding: "20px" }}>
                  Sin análisis químico directo cargado para este lote en particular. Se toma referencia promedio del campo.
                </div>
              )}
            </div>

            {/* COLUMNA 2: PERFIL DE HUMEDAD EDÁFICA (MOLISOL) */}
            <div className="card" style={{ padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "15px" }}>💧</span>
                    <strong style={{ fontSize: "15px", color: "var(--slate-900)" }}>
                      Perfil Hídrico y Agua Útil (0–200 cm)
                    </strong>
                  </div>
                  <small style={{ color: "var(--muted)", display: "block", marginTop: "2px" }}>
                    Laboratorio Molisol · Fecha: {activeSummary.perfilHumedad ? fmtDate(activeSummary.perfilHumedad.fecha) : "21/07/2026"}
                  </small>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--muted)", display: "block" }}>TOTAL AGUA ÚTIL</span>
                  <strong style={{ fontSize: "18px", color: "#0284c7" }}>
                    {activeSummary.perfilHumedad ? `${activeSummary.perfilHumedad.totalAguaUtilMm} mm` : "—"}
                  </strong>
                </div>
              </div>

              {activeSummary.perfilHumedad ? (
                <div>
                  <div style={{ marginBottom: "12px", background: "#f0f9ff", border: "1px solid #bae6fd", padding: "8px 12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#0369a1", fontWeight: 700 }}>
                      Capacidad de almacenamiento del perfil:
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#0284c7" }}>
                      {activeSummary.perfilHumedad.totalAguaUtilMm >= 280 ? "🌊 Excelente reserva hídrica (>280 mm)" : "💧 Buena recarga hídrica"}
                    </span>
                  </div>

                  <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1.5px solid var(--border)", textAlign: "left", color: "var(--slate-600)" }}>
                        <th style={{ padding: "6px 4px" }}>Estrato</th>
                        <th style={{ padding: "6px 4px" }}>Humedad</th>
                        <th style={{ padding: "6px 4px" }}>PMP</th>
                        <th style={{ padding: "6px 4px" }}>A.Útil %</th>
                        <th style={{ padding: "6px 4px", textAlign: "right" }}>A.Útil (mm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSummary.perfilHumedad.estratos.map((est, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "6px 4px", fontWeight: 700 }}>{est.profundidadCm} cm</td>
                          <td style={{ padding: "6px 4px" }}>{est.humedadActualPct}%</td>
                          <td style={{ padding: "6px 4px", color: "var(--muted)" }}>{est.pmpPct}%</td>
                          <td style={{ padding: "6px 4px" }}>{est.aguaUtilPct}%</td>
                          <td style={{ padding: "6px 4px", textAlign: "right", fontWeight: 800, color: "#0284c7" }}>
                            {est.aguaUtilMm} mm
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="emptyState" style={{ padding: "20px" }}>
                  Sin perfil de humedad edáfica cargado directamente para este lote.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: RESUMEN COMPARATIVO DE TODOS LOS LOTES DEL CAMPO */}
      {/* ========================================================================= */}
      {selectedLoteNombre === "TODOS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* TARJETAS RESUMEN ACUMULADAS DEL CAMPO */}
          <div className="metricsGrid four">
            <div className="metricCard">
              <span className="metricLabel">Carros Sólidos Esparcidos</span>
              <span className="metricValue">{totalesCampo.carros} carros</span>
              <small className="metricNote">{totalesCampo.tn} toneladas de estiércol sólido</small>
            </div>

            <div className="metricCard">
              <span className="metricLabel">Efluente Líquido Esparcido</span>
              <span className="metricValue">{totalesCampo.tanques} tanques</span>
              <small className="metricNote">{totalesCampo.m3.toLocaleString()} m³ efluente de tambo</small>
            </div>

            <div className="metricCard">
              <span className="metricLabel">Nutrientes Incorporados</span>
              <span className="metricValue" style={{ fontSize: "19px" }}>
                {totalesCampo.nKg.toLocaleString()} kg N · {totalesCampo.pKg.toLocaleString()} kg P
              </span>
              <small className="metricNote">Potasio aportado: {totalesCampo.kKg.toLocaleString()} kg K</small>
            </div>

            <div className="metricCard">
              <span className="metricLabel">Materia Orgánica Total</span>
              <span className="metricValue">{(totalesCampo.moKg / 1000).toFixed(1)} tn MO</span>
              <small className="metricNote">Aporte biológico estructural al suelo</small>
            </div>
          </div>

          {/* TABLA COMPARATIVA MULTI-LOTE */}
          <div className="card" style={{ padding: "16px", overflowX: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "var(--slate-900)" }}>
                Comparativa de Suelos, Labores y Recomendación Nutricional ({summariesDelCampo.length} lotes)
              </h3>
              <span className="pill badgeGreen">Meta calculada para: {targetCrop}</span>
            </div>

            <table style={{ width: "100%", fontSize: "12.5px", borderCollapse: "collapse", minWidth: "900px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left", color: "var(--slate-700)", background: "var(--slate-50)" }}>
                  <th style={{ padding: "8px 10px" }}>Lote</th>
                  <th style={{ padding: "8px 10px" }}>Sup (ha)</th>
                  <th style={{ padding: "8px 10px" }}>Agua Útil (mm)</th>
                  <th style={{ padding: "8px 10px" }}>P Bray (ppm)</th>
                  <th style={{ padding: "8px 10px" }}>N Suelo (kg/ha)</th>
                  <th style={{ padding: "8px 10px" }}>MO Suelo (%)</th>
                  <th style={{ padding: "8px 10px" }}>Carros Tirados</th>
                  <th style={{ padding: "8px 10px" }}>Aporte N (kg/ha)</th>
                  <th style={{ padding: "8px 10px" }}>Aporte P (kg/ha)</th>
                  <th style={{ padding: "8px 10px" }}>Carros Restantes Sugeridos</th>
                  <th style={{ padding: "8px 10px" }}>Estado Balance</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {summariesDelCampo.map((s) => {
                  const isDone = s.estadoBalance === "Cubierto con holgura";

                  return (
                    <tr key={s.lote} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px", fontWeight: 700, color: "var(--slate-900)" }}>
                        {s.lote}
                      </td>
                      <td style={{ padding: "10px" }}>{s.superficieHa} ha</td>
                      <td style={{ padding: "10px", fontWeight: 700, color: "#0284c7" }}>
                        {s.perfilHumedad ? `${s.perfilHumedad.totalAguaUtilMm} mm` : "—"}
                      </td>
                      <td style={{ padding: "10px" }}>
                        {s.sueloPrevio ? `${s.sueloPrevio.fosforoBrayPpm} ppm` : "—"}
                      </td>
                      <td style={{ padding: "10px" }}>
                        {s.sueloPrevio ? `${s.sueloPrevio.nDisponibleKgHa} kg` : "—"}
                      </td>
                      <td style={{ padding: "10px" }}>
                        {s.sueloPrevio ? `${s.sueloPrevio.materiaOrganicaPct}%` : "—"}
                      </td>
                      <td style={{ padding: "10px", fontWeight: 700 }}>
                        {s.carrosSolido > 0 ? (
                          <span style={{ color: "#166534", background: "#dcfce7", padding: "2px 6px", borderRadius: "4px" }}>
                            🚜 {s.carrosSolido} ({s.toneladasSolido} t)
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>0</span>
                        )}
                      </td>
                      <td style={{ padding: "10px", fontWeight: 700, color: s.aportesPorHa.nitrogenoKgHa > 0 ? "#16a34a" : "var(--slate-600)" }}>
                        {s.aportesPorHa.nitrogenoKgHa > 0 ? `+${s.aportesPorHa.nitrogenoKgHa}` : "0"}
                      </td>
                      <td style={{ padding: "10px", fontWeight: 700, color: s.aportesPorHa.fosforoKgHa > 0 ? "#0284c7" : "var(--slate-600)" }}>
                        {s.aportesPorHa.fosforoKgHa > 0 ? `+${s.aportesPorHa.fosforoKgHa}` : "0"}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <strong style={{ color: isDone ? "#16a34a" : "#d97706", fontSize: "13px" }}>
                          {isDone ? "0 carros" : `${s.carrosRestantesRecomendados} carros`}
                        </strong>
                        {!isDone && (
                          <small style={{ display: "block", color: "var(--muted)", fontSize: "10.5px" }}>
                            o {s.tanquesRestantesRecomendados} tanques
                          </small>
                        )}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: isDone ? "#dcfce7" : "#fef3c7",
                            color: isDone ? "#15803d" : "#b45309",
                          }}
                        >
                          {isDone ? "✓ Cubierto" : "⚡ Aplicar"}
                        </span>
                      </td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <button
                          type="button"
                          className="tableAction"
                          onClick={() => setSelectedLoteNombre(s.lote)}
                          style={{ fontSize: "11.5px", padding: "3px 8px" }}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FICHA OFICIAL DE ESTIÉRCOL SÓLIDO (CLOVER PROTOCOLO E326) */}
      {/* ========================================================================= */}
      {showManureModal && (
        <div className="modalBackdrop" onClick={() => setShowManureModal(false)}>
          <div className="modal" style={{ maxWidth: "720px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow" style={{ color: "var(--brand-700)" }}>Laboratorio Clover (El Trébol) · Protocolo E326</p>
                <h2 style={{ fontSize: "18px", margin: 0 }}>📋 Análisis de Estiércol Sólido Homogéneo</h2>
              </div>
              <button className="iconButton" onClick={() => setShowManureModal(false)}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "12px" }}>
              <div style={{ background: "#f8fafc", border: "1px solid var(--border)", padding: "12px 16px", borderRadius: "8px", fontSize: "12.5px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                  <div><strong>Fecha de Informe:</strong> 23/08/2026</div>
                  <div><strong>Matriz:</strong> {manure.matriz}</div>
                  <div><strong>Procedencia:</strong> Tambo HJB</div>
                  <div><strong>Capacidad de Carro:</strong> 5 toneladas netas</div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "var(--slate-800)" }}>
                  Parámetros Físico-Químicos Certificados
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  <div className="soilParam">
                    <span>Humedad / Mat. Seca</span>
                    <strong>{manure.humedadPct}% / {manure.materiaSecaPct}% MS</strong>
                  </div>
                  <div className="soilParam">
                    <span>Nitrógeno Total</span>
                    <strong>{manure.nitrogenoTotalPct}% ({manure.nitrogenoTotalPct * 10} kg N/tn)</strong>
                  </div>
                  <div className="soilParam">
                    <span>Fósforo Total (P)</span>
                    <strong>{manure.fosforoTotalPct}% ({manure.fosforoTotalPct * 10} kg P/tn)</strong>
                  </div>
                  <div className="soilParam">
                    <span>Potasio Total (K)</span>
                    <strong>{manure.potasioTotalPct}% ({manure.potasioTotalPct * 10} kg K/tn)</strong>
                  </div>
                  <div className="soilParam">
                    <span>Azufre Total (S)</span>
                    <strong>{manure.azufreTotalPct}% ({manure.azufreTotalPct * 10} kg S/tn)</strong>
                  </div>
                  <div className="soilParam">
                    <span>Materia Orgánica</span>
                    <strong>{manure.materiaOrganicaPct}% ({manure.materiaOrganicaPct * 10} kg MO/tn)</strong>
                  </div>
                  <div className="soilParam">
                    <span>pH / Conductividad</span>
                    <strong>pH {manure.ph} · {manure.ceUsCm} uS/cm</strong>
                  </div>
                  <div className="soilParam">
                    <span>Relación C / N</span>
                    <strong>{manure.relacionCN}</strong>
                  </div>
                  <div className="soilParam">
                    <span>Zinc / Boro / Cobre</span>
                    <strong>Zn {manure.zincMgKg} | B {manure.boroMgKg} ppm</strong>
                  </div>
                </div>
              </div>

              {/* REGLA DE CONVERSIÓN POR CARRO */}
              <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", padding: "14px", borderRadius: "10px" }}>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "13.5px", color: "#166534" }}>
                  🚜 Aporte Nutricional Neto por Cada Carro Esparcido (5 Toneladas Netas)
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginTop: "8px", textAlign: "center" }}>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <small style={{ color: "var(--muted)", display: "block", fontSize: "10px" }}>NITRÓGENO</small>
                    <strong style={{ color: "#15803d", fontSize: "14px" }}>60 kg N</strong>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <small style={{ color: "var(--muted)", display: "block", fontSize: "10px" }}>FÓSFORO</small>
                    <strong style={{ color: "#15803d", fontSize: "14px" }}>50 kg P</strong>
                    <small style={{ display: "block", fontSize: "9px", color: "var(--muted)" }}>114.5 kg P₂O₅</small>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <small style={{ color: "var(--muted)", display: "block", fontSize: "10px" }}>POTASIO</small>
                    <strong style={{ color: "#15803d", fontSize: "14px" }}>123.5 kg K</strong>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <small style={{ color: "var(--muted)", display: "block", fontSize: "10px" }}>AZUFRE</small>
                    <strong style={{ color: "#15803d", fontSize: "14px" }}>11 kg S</strong>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <small style={{ color: "var(--muted)", display: "block", fontSize: "10px" }}>MATERIA ORGÁNICA</small>
                    <strong style={{ color: "#15803d", fontSize: "14px" }}>1.320 kg MO</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="modalFooter" style={{ marginTop: "16px" }}>
              <button className="primaryButton" onClick={() => setShowManureModal(false)}>
                Cerrar ficha técnica
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AGREGAR ANÁLISIS DE SUELO MANUAL */}
      {/* ========================================================================= */}
      {openAddModal && (
        <div className="modalBackdrop" onClick={() => setOpenAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow">{campoNombre} · Suelos</p>
                <h2>Agregar análisis</h2>
              </div>
              <button className="iconButton" onClick={() => setOpenAddModal(false)}>×</button>
            </div>

            <div className="formGrid">
              <div>
                <label>Fecha</label>
                <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div>
                <label>Laboratorio</label>
                <input className="input" value={laboratorio} onChange={(e) => setLaboratorio(e.target.value)} placeholder="Nombre del laboratorio" />
              </div>
              <div>
                <label>Profundidad</label>
                <input className="input" value={profundidad} onChange={(e) => setProfundidad(e.target.value)} />
              </div>
            </div>

            <div className="formSection">
              <h3>Parámetros</h3>
              <div className="parameterGrid">
                {defaultParams.map(([name, unit]) => (
                  <div key={name}>
                    <label>{name} {unit ? `(${unit})` : ""}</label>
                    <input
                      className="input"
                      inputMode="decimal"
                      value={values[name] || ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="modalFooter">
              <button className="secondaryButton" onClick={() => setOpenAddModal(false)}>Cancelar</button>
              <button className="primaryButton" onClick={saveCustomAnalysis}>Guardar análisis</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

