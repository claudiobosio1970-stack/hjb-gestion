"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { SoilAnalysis, agricultureData, HJB_AGRICULTURE_SYNC_EVENT, Lote } from "@/lib/agricultureData";
import {
  SoilChemicalAnalysis,
  SoilMoistureProfile,
  ManureAnalysis,
  LiquidManureAnalysis,
  LoteNutrientSummary,
  listSoilAnalyses,
  listMoistureProfiles,
  getManureAnalysis,
  getLiquidManureAnalysis,
  computeLoteNutrientSummary,
  HJB_SOIL_SYNC_EVENT,
  DEFAULT_MANURE_ANALYSIS,
  DEFAULT_LIQUID_MANURE_ANALYSIS,
} from "@/lib/soilManureData";
import {
  evaluarPotasio,
  evaluarFosforoBray,
  evaluarNitrogenoDisponible,
  evaluarMateriaOrganica,
  evaluarPH,
  evaluarAzufre,
  evaluarZinc,
  evaluarCalcio,
  evaluarAguaUtilTotal,
  evaluarCoberturaNutriente,
} from "@/lib/semaforoUtils";
import { SemaforoCell, SemaforoBadge } from "@/components/SemaforoBadge";

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
  const [liquidManure, setLiquidManure] = useState<LiquidManureAnalysis>(DEFAULT_LIQUID_MANURE_ANALYSIS);
  const [selectedLoteNombre, setSelectedLoteNombre] = useState<string>("TODOS");
  const [targetCrop, setTargetCrop] = useState<string>("Maíz Silo");
  const [campana, setCampana] = useState<string>("2026/27");
  const [showManureModal, setShowManureModal] = useState<boolean>(false);

  const isTambo = campoNombre.toLowerCase() === "tambo";

  // Estados para simulación interactiva en vivo
  const [simCarros, setSimCarros] = useState<number | null>(null);
  const [simTanques, setSimTanques] = useState<number | null>(null);
  const [modoBiodisp, setModoBiodisp] = useState<"ano1" | "bruto">("ano1");
  const [equipoCurvaSeleccionado, setEquipoCurvaSeleccionado] = useState<"solido" | "liquido">("solido");

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
    setLiquidManure(getLiquidManureAnalysis());
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
        { id: "tambo-l1", campo: "Tambo", nombre: "Lote 1", superficieHa: 7, cultivoActual: "Doble Maíz Silo", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l2", campo: "Tambo", nombre: "Lote 2", superficieHa: 10, cultivoActual: "Avena / Maíz", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l3", campo: "Tambo", nombre: "Lote 3", superficieHa: 11, cultivoActual: "Avena / Maíz", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l4", campo: "Tambo", nombre: "Lote 4", superficieHa: 5, cultivoActual: "Doble Maíz Silo", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l5", campo: "Tambo", nombre: "Lote 5", superficieHa: 3, cultivoActual: "Alfalfa 4°", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l6", campo: "Tambo", nombre: "Lote 6", superficieHa: 10, cultivoActual: "Alfalfa 4°", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l7", campo: "Tambo", nombre: "Lote 7", superficieHa: 10, cultivoActual: "Maíz 1ra", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l8", campo: "Tambo", nombre: "Lote 8", superficieHa: 10, cultivoActual: "Alfalfa 4°", campana: "2026/27", estado: "En producción" },
        { id: "tambo-l9", campo: "Tambo", nombre: "Lote 9", superficieHa: 7, cultivoActual: "Alfalfa 3°", campana: "2026/27", estado: "En producción" },
      ];
    }
    if (campoNombre.toLowerCase() === "racca") {
      return [
        { id: "racca-l1", campo: "Racca", nombre: "Lote 1", superficieHa: 50, cultivoActual: "Soja 1ra", campana: "2026/27", estado: "Planificado" },
        { id: "racca-l2", campo: "Racca", nombre: "Lote 2", superficieHa: 50, cultivoActual: "Maíz ST 9939", campana: "2026/27", estado: "Planificado" },
      ];
    }
    if (campoNombre.toLowerCase() === "kitty") {
      return [
        { id: "kitty-l1", campo: "Kitty", nombre: "Lote Único", superficieHa: 29, cultivoActual: "Maíz ST 9741", campana: "2026/27", estado: "En producción" },
      ];
    }
    if (campoNombre.toLowerCase() === "aguilera") {
      return [
        { id: "aguilera-l1", campo: "Aguilera", nombre: "Lote Único", superficieHa: 20, cultivoActual: "Maíz ST 9736", campana: "2026/27", estado: "En producción" },
      ];
    }
    if (campoNombre.toLowerCase() === "keuneke") {
      return [
        { id: "keuneke-l1", campo: "Keuneke", nombre: "Lote 1", superficieHa: 48, cultivoActual: "Avena / Soja", campana: "2026/27", estado: "En producción" },
        { id: "keuneke-l2", campo: "Keuneke", nombre: "Lote 2", superficieHa: 9, cultivoActual: "Alfalfa 2°", campana: "2026/27", estado: "En producción" },
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

  // Al cambiar de lote, resetear simulación y actualizar la meta según cultivo del lote
  useEffect(() => {
    setSimCarros(null);
    setSimTanques(null);
    if (activeLote?.cultivoActual) {
      setTargetCrop(activeLote.cultivoActual);
    }
  }, [selectedLoteNombre, activeLote?.cultivoActual]);

  // Resúmenes calculados para todos los lotes del campo (cada lote con su cultivo de rotación)
  const summariesDelCampo: LoteNutrientSummary[] = useMemo(() => {
    return lotesDelCampo.map((lote) =>
      computeLoteNutrientSummary(
        campoNombre,
        lote.nombre,
        lote.superficieHa || 5,
        lote.cultivoActual || targetCrop,
        campana,
        undefined,
        undefined,
        modoBiodisp
      )
    );
  }, [lotesDelCampo, campoNombre, targetCrop, campana, soils, moistures, manure, liquidManure, modoBiodisp]);

  // Resumen base real (sin simulación) del lote seleccionado
  const baselineSummary: LoteNutrientSummary | null = useMemo(() => {
    if (!activeLote) return null;
    return computeLoteNutrientSummary(
      campoNombre,
      activeLote.nombre,
      activeLote.superficieHa || 5,
      targetCrop,
      campana,
      undefined,
      undefined,
      modoBiodisp
    );
  }, [activeLote, campoNombre, targetCrop, campana, soils, moistures, manure, liquidManure, modoBiodisp]);

  const isSimulating = simCarros !== null || simTanques !== null;
  const currentSimCarros = simCarros !== null ? simCarros : (baselineSummary?.carrosSolido ?? 0);
  const currentSimTanques = simTanques !== null ? simTanques : (baselineSummary?.tanquesLiquido ?? 0);

  // Resumen reactivo del lote seleccionado (aplica simulación en vivo)
  const activeSummary: LoteNutrientSummary | null = useMemo(() => {
    if (!activeLote) return null;
    return computeLoteNutrientSummary(
      campoNombre,
      activeLote.nombre,
      activeLote.superficieHa || 5,
      targetCrop,
      campana,
      isSimulating ? currentSimCarros : undefined,
      isSimulating ? currentSimTanques : undefined,
      modoBiodisp
    );
  }, [activeLote, campoNombre, targetCrop, campana, soils, moistures, manure, liquidManure, isSimulating, currentSimCarros, currentSimTanques, modoBiodisp]);

  // Parámetros de capacidad y equivalencia agronómica dinámica
  const tnCarro = manure.toneladasPorCarro || 5;
  const m3Tanque = liquidManure.m3PorTanque || 11;
  const ratioN = (tnCarro * manure.nitrogenoTotalPct * 10) / Math.max(0.1, m3Tanque * (liquidManure.nitrogenoKgM3 || 1.8));
  const ratioP = (tnCarro * manure.fosforoTotalPct * 10) / Math.max(0.1, m3Tanque * (liquidManure.fosforoKgM3 || 0.6));
  const equivTanques = ((ratioN + ratioP) / 2).toFixed(1);

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
            {isTambo && <span className="pill badgeBlue">Protocolo Clover E326</span>}
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--slate-900)", margin: 0 }}>
            {isTambo
              ? "🧪 Análisis de Suelos, Perfiles Hídricos y Balance de Enmiendas"
              : "🧪 Análisis Químico de Suelos y Perfiles Hídricos"}
          </h2>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Link
            href="/suelos"
            className="secondaryButton"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
          >
            <span>🔬</span>
            <span>Panel Central de Suelos</span>
          </Link>
          {isTambo && (
            <button
              type="button"
              className="secondaryButton"
              onClick={() => setShowManureModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <span>📋</span>
              <span>Ficha Oficial Clover E326 (Estiércol)</span>
            </button>
          )}
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
            const isCovered = sum && sum.estadoBalance === "Cubierto con holgura";

            return (
              <button
                key={lote.id}
                type="button"
                onClick={() => setSelectedLoteNombre(lote.nombre)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
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
                <span>
                  {campoNombre.toLowerCase() === "racca" && lote.nombre.toLowerCase().includes("1")
                    ? "Lote 1 (Sector 3a)"
                    : campoNombre.toLowerCase() === "racca" && lote.nombre.toLowerCase().includes("2")
                    ? "Lote 2 (Sector 3b)"
                    : lote.nombre}
                </span>
                {isTambo && (
                  isCovered ? (
                    <span
                      style={{
                        background: "#dcfce7",
                        color: "#166534",
                        fontSize: "10px",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        fontWeight: 800,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                      title="Nutrición N-P-K cubierta con creces"
                    >
                      🚜 {sum?.carrosSolido || 0} ✓
                    </span>
                  ) : (
                    <span
                      style={{
                        background: "#fef3c7",
                        color: "#b45309",
                        border: "1px solid #fde68a",
                        fontSize: "10px",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        fontWeight: 800,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                      title="Falta biofertilizar para alcanzar la meta nutricional"
                    >
                      ⚡ Falta
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-700)" }}>Campaña:</label>
            <select
              className="select"
              style={{ fontSize: "12px", padding: "4px 8px", fontWeight: 600 }}
              value={campana}
              onChange={(e) => setCampana(e.target.value)}
            >
              <option value="2026/27">2026/27 (En curso)</option>
              <option value="2025/26">2025/26</option>
              <option value="2024/25">2024/25</option>
            </select>
          </div>

          {activeLote ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-700)" }}>Cultivo planificado:</span>
              <span className="pill badgeGreen" style={{ fontSize: "12px", fontWeight: 700 }}>
                🌱 {activeLote.cultivoActual || targetCrop}
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="pill badgeSlate" style={{ fontSize: "12px", fontWeight: 700 }}>
                🌱 Metas fijadas según rotación oficial
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: DETALLE DEL LOTE SELECCIONADO */}
      {/* ========================================================================= */}
      {activeLote && activeSummary && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {isTambo && (
            <>
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
            <div style={{ maxWidth: "760px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
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

                {activeSummary.nutrienteLimitante && (
                  <span
                    style={{
                      padding: "3px 9px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: 800,
                      background: activeSummary.nutrienteLimitante === "Potasio" ? "#e0e7ff" : activeSummary.nutrienteLimitante === "Fósforo" ? "#e0f2fe" : "#fef3c7",
                      color: activeSummary.nutrienteLimitante === "Potasio" ? "#3730a3" : activeSummary.nutrienteLimitante === "Fósforo" ? "#0369a1" : "#92400e",
                    }}
                  >
                    Limitante Agronómico: {activeSummary.nutrienteLimitante}
                  </span>
                )}

                {isSimulating && (
                  <span
                    style={{
                      padding: "3px 9px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: 800,
                      background: "#f3e8ff",
                      color: "#6b21a8",
                    }}
                  >
                    🔬 Modo Simulación Activo
                  </span>
                )}

                <strong style={{ fontSize: "15px", color: "var(--slate-900)" }}>
                  {activeLote.nombre} ({activeSummary.superficieHa} ha) · Campaña {campana} · Cultivo: {targetCrop}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--slate-800)", lineHeight: "1.45" }}>
                {activeSummary.mensajeDiagnostico}
              </p>
              <small style={{ display: "block", color: "var(--muted)", fontSize: "11px", marginTop: "5px" }}>
                🔒 Balance y carros restantes calculados exclusivamente para la <strong>Campaña {campana}</strong>. Equivalencia agronómica: <strong>1 carro sólido ({tnCarro} tn) ≈ {equivTanques} tanques líquidos ({m3Tanque} m³ / {(m3Tanque * 1000).toLocaleString("es-AR")} L)</strong>.
              </small>

              {/* Selector de modo de biodisponibilidad */}
              <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-700)" }}>
                  Criterio de Cálculo:
                </span>
                <div style={{ display: "inline-flex", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "2px" }}>
                  <button
                    type="button"
                    onClick={() => setModoBiodisp("ano1")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontWeight: 800,
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      background: modoBiodisp === "ano1" ? "#15803d" : "transparent",
                      color: modoBiodisp === "ano1" ? "#ffffff" : "var(--slate-600)",
                      boxShadow: modoBiodisp === "ano1" ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
                    }}
                  >
                    ✓ Biodisponible Año 1 (Recomendado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoBiodisp("bruto")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontWeight: 800,
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      background: modoBiodisp === "bruto" ? "#334155" : "transparent",
                      color: modoBiodisp === "bruto" ? "#ffffff" : "var(--slate-600)",
                      boxShadow: modoBiodisp === "bruto" ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
                    }}
                  >
                    Stock Bruto Total
                  </button>
                </div>
                <span style={{ fontSize: "11px", color: modoBiodisp === "ano1" ? "#166534" : "#475569", fontStyle: "italic" }}>
                  {modoBiodisp === "ano1"
                    ? "Toma la fracción aprovechable inmediata para el cultivo (N 25% sólido / 55% líquido). Nitrógeno como N elemental."
                    : "Toma el 100% analítico incorporado al perfil edáfico sin descontar el tiempo de mineralización."}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "#ffffff",
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                flexWrap: "wrap",
              }}
            >
              {/* Bloque Sólido */}
              <div
                style={{
                  textAlign: "center",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: activeSummary.soloCarrosRestantes === 0 ? "#f0fdf4" : "#fef9c3",
                  border: activeSummary.soloCarrosRestantes === 0 ? "1px solid #bbf7d0" : "1px solid #fef08a",
                  minWidth: "130px",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 800, color: activeSummary.soloCarrosRestantes === 0 ? "#16a34a" : "#854d0e", display: "block" }}>
                  🚜 SÓLIDO ({tnCarro} tn)
                </span>
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: 900,
                    color: activeSummary.soloCarrosRestantes === 0 ? "#16a34a" : "#a16207",
                    display: "block",
                    lineHeight: "1.2",
                    margin: "2px 0",
                  }}
                >
                  {activeSummary.soloCarrosRestantes === 0 ? "0 carros" : `${activeSummary.soloCarrosRestantes} carros`}
                </span>
                <small style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>
                  {activeSummary.soloCarrosRestantes === 0 ? "✓ Cubierto" : `${(activeSummary.soloCarrosRestantes * tnCarro).toLocaleString("es-AR")} tn a tirar`}
                </small>
              </div>

              <span style={{ fontSize: "11px", fontWeight: 900, color: "var(--slate-500)", textTransform: "uppercase" }}>
                Ó BIEN
              </span>

              {/* Bloque Líquido */}
              <div
                style={{
                  textAlign: "center",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: activeSummary.soloTanquesRestantes === 0 ? "#f0fdf4" : "#e0f2fe",
                  border: activeSummary.soloTanquesRestantes === 0 ? "1px solid #bbf7d0" : "1px solid #bae6fd",
                  minWidth: "130px",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 800, color: activeSummary.soloTanquesRestantes === 0 ? "#16a34a" : "#0369a1", display: "block" }}>
                  💧 LÍQUIDO ({m3Tanque} m³)
                </span>
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: 900,
                    color: activeSummary.soloTanquesRestantes === 0 ? "#16a34a" : "#0284c7",
                    display: "block",
                    lineHeight: "1.2",
                    margin: "2px 0",
                  }}
                >
                  {activeSummary.soloTanquesRestantes === 0 ? "0 tanques" : `${activeSummary.soloTanquesRestantes} tanques`}
                </span>
                <small style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>
                  {activeSummary.soloTanquesRestantes === 0 ? "✓ Cubierto" : `${(activeSummary.soloTanquesRestantes * m3Tanque).toLocaleString("es-AR")} m³ a tirar`}
                </small>
              </div>
            </div>
          </div>

          {/* SIMULADOR EN VIVO DE INTERCAMBIO DINÁMICO */}
          <div
            style={{
              background: "#f8fafc",
              border: "1.5px solid #cbd5e1",
              borderRadius: "12px",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <strong style={{ fontSize: "14px", color: "var(--slate-900)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🎛️</span>
                  <span>Simulador de Recálculo Dinámico e Intercambiabilidad</span>
                </strong>
                <small style={{ color: "var(--slate-600)", display: "block", marginTop: "2px", fontSize: "12px" }}>
                  Ajustá los carros o tanques aplicados para ver en tiempo real cómo cambia la necesidad del otro recurso y el % de cobertura N-P-K:
                </small>
              </div>

              {isSimulating && (
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={() => {
                    setSimCarros(null);
                    setSimTanques(null);
                  }}
                  style={{ fontSize: "12px", padding: "4px 10px", color: "#b91c1c", borderColor: "#fca5a5", background: "#fef2f2" }}
                >
                  ↺ Restablecer a reales ({baselineSummary?.carrosSolido || 0} c / {baselineSummary?.tanquesLiquido || 0} t)
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              {/* Stepper Carros Sólidos */}
              <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-800)" }}>
                    🚜 Carros Sólidos Aplicados / Simulados:
                  </label>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Real: {baselineSummary?.carrosSolido || 0} carros
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setSimCarros(Math.max(0, currentSimCarros - 1))}
                    style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f1f5f9", fontWeight: 800, fontSize: "16px", cursor: "pointer" }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    style={{ textAlign: "center", fontWeight: 800, fontSize: "16px", padding: "4px 8px" }}
                    value={currentSimCarros}
                    onChange={(e) => setSimCarros(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                  <button
                    type="button"
                    onClick={() => setSimCarros(currentSimCarros + 1)}
                    style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f1f5f9", fontWeight: 800, fontSize: "16px", cursor: "pointer" }}
                  >
                    +
                  </button>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--slate-600)" }}>carros</span>
                </div>
              </div>

              {/* Stepper Tanques Líquidos */}
              <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-800)" }}>
                    💧 Tanques Líquidos Aplicados / Simulados:
                  </label>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Real: {baselineSummary?.tanquesLiquido || 0} tanques
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setSimTanques(Math.max(0, currentSimTanques - 1))}
                    style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f1f5f9", fontWeight: 800, fontSize: "16px", cursor: "pointer" }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    style={{ textAlign: "center", fontWeight: 800, fontSize: "16px", padding: "4px 8px" }}
                    value={currentSimTanques}
                    onChange={(e) => setSimTanques(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                  <button
                    type="button"
                    onClick={() => setSimTanques(currentSimTanques + 1)}
                    style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f1f5f9", fontWeight: 800, fontSize: "16px", cursor: "pointer" }}
                  >
                    +
                  </button>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--slate-600)" }}>tanques</span>
                </div>
              </div>
            </div>

            {/* BARRAS DE COBERTURA NUTRICIONAL N - P - K */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "4px" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 800, color: "var(--slate-800)" }}>
                Porcentaje que llevamos cubierto por mineral ({targetCrop}):
              </span>

              {/* Barra N */}
              <div>
                {(() => {
                  const semCovN = evaluarCoberturaNutriente(activeSummary.coberturaPct.nitrogeno);
                  return (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", marginBottom: "5px", flexWrap: "wrap", gap: "4px" }}>
                        <strong style={{ color: "var(--slate-800)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <span>🌱 Nitrógeno (N)</span>
                          <SemaforoBadge result={semCovN} customLabel={`${activeSummary.coberturaPct.nitrogeno}% cubierto`} size="sm" />
                        </strong>
                        <span style={{ color: "var(--slate-600)", fontSize: "11.5px" }}>
                          Disponible: {activeSummary.sueloPrevio ? activeSummary.sueloPrevio.nDisponibleKgHa + activeSummary.aportesPorHa.nitrogenoKgHa : activeSummary.aportesPorHa.nitrogenoKgHa} kg N/ha (Meta: {activeSummary.metaKgHa.nitrogeno} kg N/ha) · Aporte: +{activeSummary.aportesPorHa.nitrogenoKgHa} kg N/ha {modoBiodisp === "ano1" ? `(Año 1 | Bruto: +${activeSummary.aportesBrutosPorHa.nitrogenoKgHa} kg N)` : "(Bruto)"}
                        </span>
                      </div>
                      <div
                        style={{
                          position: "relative",
                          background: "#e2e8f0",
                          borderRadius: "8px",
                          height: "26px",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          border: `1px solid ${semCovN.borderColor}`,
                        }}
                      >
                        <div
                          style={{
                            background: activeSummary.coberturaPct.nitrogeno >= 100 ? "#16a34a" : activeSummary.coberturaPct.nitrogeno >= 50 ? "#f59e0b" : "#dc2626",
                            width: `${Math.min(100, activeSummary.coberturaPct.nitrogeno)}%`,
                            height: "100%",
                            transition: "width 0.4s ease",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            left: "12px",
                            fontSize: "11.5px",
                            fontWeight: 900,
                            color: activeSummary.coberturaPct.nitrogeno > 25 ? "#ffffff" : "#0f172a",
                            textShadow: activeSummary.coberturaPct.nitrogeno > 25 ? "0 1px 2px rgba(0,0,0,0.4)" : "none",
                          }}
                        >
                          {activeSummary.coberturaPct.nitrogeno}% cubierto {activeSummary.coberturaPct.nitrogeno >= 100 ? "✓ (Meta superada)" : ""}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Barra P */}
              <div>
                {(() => {
                  const semCovP = evaluarCoberturaNutriente(activeSummary.coberturaPct.fosforo);
                  return (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", marginBottom: "5px", flexWrap: "wrap", gap: "4px" }}>
                        <strong style={{ color: "var(--slate-800)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <span>🌾 Fósforo (P)</span>
                          <SemaforoBadge result={semCovP} customLabel={`${activeSummary.coberturaPct.fosforo}% cubierto`} size="sm" />
                        </strong>
                        <span style={{ color: "var(--slate-600)", fontSize: "11.5px" }}>
                          Aporte: +{activeSummary.aportesPorHa.fosforoKgHa} kg P/ha (~{Math.round(activeSummary.aportesPorHa.fosforoKgHa * 2.291)} kg P₂O₅) · P Bray: {activeSummary.sueloPrevio ? activeSummary.sueloPrevio.fosforoBrayPpm : 22} ppm (Meta: {activeSummary.metaKgHa.fosforo} kg P/ha)
                        </span>
                      </div>
                      <div
                        style={{
                          position: "relative",
                          background: "#e2e8f0",
                          borderRadius: "8px",
                          height: "26px",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          border: `1px solid ${semCovP.borderColor}`,
                        }}
                      >
                        <div
                          style={{
                            background: activeSummary.coberturaPct.fosforo >= 100 ? "#16a34a" : activeSummary.coberturaPct.fosforo >= 50 ? "#f59e0b" : "#dc2626",
                            width: `${Math.min(100, activeSummary.coberturaPct.fosforo)}%`,
                            height: "100%",
                            transition: "width 0.4s ease",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            left: "12px",
                            fontSize: "11.5px",
                            fontWeight: 900,
                            color: activeSummary.coberturaPct.fosforo > 25 ? "#ffffff" : "#0f172a",
                            textShadow: activeSummary.coberturaPct.fosforo > 25 ? "0 1px 2px rgba(0,0,0,0.4)" : "none",
                          }}
                        >
                          {activeSummary.coberturaPct.fosforo}% cubierto {activeSummary.coberturaPct.fosforo >= 100 ? "✓ (Meta superada)" : ""}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Barra K */}
              <div>
                {(() => {
                  const semCovK = evaluarCoberturaNutriente(activeSummary.coberturaPct.potasio);
                  return (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", marginBottom: "5px", flexWrap: "wrap", gap: "4px" }}>
                        <strong style={{ color: "var(--slate-800)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <span>🌽 Potasio (K)</span>
                          <SemaforoBadge result={semCovK} customLabel={`${activeSummary.coberturaPct.potasio}% cubierto`} size="sm" />
                        </strong>
                        <span style={{ color: "var(--slate-600)", fontSize: "11.5px" }}>
                          Aporte: +{activeSummary.aportesPorHa.potasioKgHa} kg K/ha (~{Math.round(activeSummary.aportesPorHa.potasioKgHa * 1.2046)} kg K₂O) (Meta: {activeSummary.metaKgHa.potasio} kg K/ha)
                          {targetCrop.toLowerCase().includes("silo") || targetCrop.toLowerCase().includes("alfalfa") ? " · ⚠️ Alta extracción por biomasa" : ""}
                        </span>
                      </div>
                      <div
                        style={{
                          position: "relative",
                          background: "#e2e8f0",
                          borderRadius: "8px",
                          height: "26px",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          border: `1px solid ${semCovK.borderColor}`,
                        }}
                      >
                        <div
                          style={{
                            background: activeSummary.coberturaPct.potasio >= 100 ? "#16a34a" : activeSummary.coberturaPct.potasio >= 50 ? "#f59e0b" : "#dc2626",
                            width: `${Math.min(100, activeSummary.coberturaPct.potasio)}%`,
                            height: "100%",
                            transition: "width 0.4s ease",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            left: "12px",
                            fontSize: "11.5px",
                            fontWeight: 900,
                            color: activeSummary.coberturaPct.potasio > 25 ? "#ffffff" : "#0f172a",
                            textShadow: activeSummary.coberturaPct.potasio > 25 ? "0 1px 2px rgba(0,0,0,0.4)" : "none",
                          }}
                        >
                          {activeSummary.coberturaPct.potasio}% cubierto {activeSummary.coberturaPct.potasio >= 100 ? "✓ (Meta superada)" : ""}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
          </>
          )}

          {/* TARJETAS DE BALANCE Y MÉTRICAS */}
          {isTambo ? (
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
          ) : (
            <div className="metricsGrid four">
              {/* Tarjeta 1: Agua útil total */}
              <div className="metricCard">
                <span className="metricLabel">Agua Útil Total (0–200 cm)</span>
                {activeSummary.perfilHumedad ? (
                  <div style={{ marginTop: "4px" }}>
                    <SemaforoBadge
                      result={evaluarAguaUtilTotal(activeSummary.perfilHumedad.totalAguaUtilMm)}
                      valor={`${activeSummary.perfilHumedad.totalAguaUtilMm} mm`}
                    />
                  </div>
                ) : (
                  <span className="metricValue" style={{ fontSize: "20px", color: "var(--muted)" }}>—</span>
                )}
                <small className="metricNote">
                  {activeSummary.perfilHumedad
                    ? evaluarAguaUtilTotal(activeSummary.perfilHumedad.totalAguaUtilMm).rangoReferencia
                    : "Sin perfil cargado"}
                </small>
              </div>

              {/* Tarjeta 2: Fósforo Bray */}
              <div className="metricCard">
                <span className="metricLabel">Fósforo Bray (Suelo)</span>
                {activeSummary.sueloPrevio ? (
                  <div style={{ marginTop: "4px" }}>
                    <SemaforoBadge
                      result={evaluarFosforoBray(activeSummary.sueloPrevio.fosforoBrayPpm)}
                      valor={`${activeSummary.sueloPrevio.fosforoBrayPpm} ppm`}
                    />
                  </div>
                ) : (
                  <span className="metricValue" style={{ fontSize: "20px", color: "var(--muted)" }}>—</span>
                )}
                <small className="metricNote">
                  Meta del cultivo: {activeSummary.metaKgHa.fosforo} kg P/ha
                </small>
              </div>

              {/* Tarjeta 3: Nitrógeno Disponible */}
              <div className="metricCard">
                <span className="metricLabel">Nitrógeno Disponible (Suelo)</span>
                {activeSummary.sueloPrevio ? (
                  <div style={{ marginTop: "4px" }}>
                    <SemaforoBadge
                      result={evaluarNitrogenoDisponible(activeSummary.sueloPrevio.nDisponibleKgHa)}
                      valor={`${activeSummary.sueloPrevio.nDisponibleKgHa} kg N/ha`}
                    />
                  </div>
                ) : (
                  <span className="metricValue" style={{ fontSize: "20px", color: "var(--muted)" }}>—</span>
                )}
                <small className="metricNote">
                  Meta del cultivo: {activeSummary.metaKgHa.nitrogeno} kg N/ha
                </small>
              </div>

              {/* Tarjeta 4: Materia Orgánica & pH */}
              <div className="metricCard">
                <span className="metricLabel">Materia Orgánica & pH</span>
                {activeSummary.sueloPrevio ? (
                  <div style={{ marginTop: "4px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <SemaforoBadge
                      result={evaluarMateriaOrganica(activeSummary.sueloPrevio.materiaOrganicaPct)}
                      valor={`${activeSummary.sueloPrevio.materiaOrganicaPct}%`}
                      size="sm"
                    />
                    <SemaforoBadge
                      result={evaluarPH(activeSummary.sueloPrevio.ph)}
                      valor={`pH ${activeSummary.sueloPrevio.ph}`}
                      size="sm"
                    />
                  </div>
                ) : (
                  <span className="metricValue" style={{ fontSize: "20px" }}>—</span>
                )}
                <small className="metricNote">
                  K: {activeSummary.sueloPrevio ? `${activeSummary.sueloPrevio.potasioPpm} ppm` : "—"} · C.I.C: {activeSummary.sueloPrevio ? `${activeSummary.sueloPrevio.cicMeq} meq` : "—"}
                </small>
              </div>
            </div>
          )}

          {/* SECCIÓN DE BIODISPONIBILIDAD Y MINERALIZACIÓN MULTIANUAL (HJB) */}
          <div
            className="card"
            style={{
              padding: "20px 22px",
              background: "#ffffff",
              borderRadius: "14px",
              border: "1.5px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {/* Cabecera con título y toggle de equipo */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "16px",
                paddingBottom: "12px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "18px" }}>📊</span>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: "var(--slate-950)" }}>
                    Biodisponibilidad de Nutrientes Principales y Mineralización Plurianual
                  </h3>
                </div>
                <p style={{ margin: "3px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
                  Curva de liberación gradual y residualidad en el tiempo (Año 1, Año 2, Año 3 y &gt;3 años) para dimensionar fertilización inmediata vs. fondo de reserva fértil.
                </p>
              </div>

              {/* Selector de matriz / equipo */}
              <div style={{ display: "inline-flex", background: "var(--slate-100)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setEquipoCurvaSeleccionado("solido")}
                  style={{
                    padding: "5px 12px",
                    fontSize: "11px",
                    fontWeight: 800,
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    background: equipoCurvaSeleccionado === "solido" ? "#ffffff" : "transparent",
                    color: equipoCurvaSeleccionado === "solido" ? "var(--slate-900)" : "var(--slate-600)",
                    boxShadow: equipoCurvaSeleccionado === "solido" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span>🚜</span>
                  <span>Carro Bosta Sólida ({tnCarro} tn - Clover E326)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEquipoCurvaSeleccionado("liquido")}
                  style={{
                    padding: "5px 12px",
                    fontSize: "11px",
                    fontWeight: 800,
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    background: equipoCurvaSeleccionado === "liquido" ? "#ffffff" : "transparent",
                    color: equipoCurvaSeleccionado === "liquido" ? "var(--slate-900)" : "var(--slate-600)",
                    boxShadow: equipoCurvaSeleccionado === "liquido" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span>💧</span>
                  <span>Tanque Purín Líquido ({m3Tanque} m³ / {(m3Tanque * 1000).toLocaleString("es-AR")} L)</span>
                </button>
              </div>
            </div>

            {/* Grilla con los 4 paneles de nutrientes (N, P, K, S) idéntica a la infografía */}
            {(() => {
              const cur = equipoCurvaSeleccionado === "solido" ? activeSummary.aportePorCarroSolido : activeSummary.aportePorTanqueLiquido;
              const u = equipoCurvaSeleccionado === "solido" ? "kg/carro" : "kg/tanque";
              const periods = [
                { label: "Año 1", key: "ano1" as const },
                { label: "Año 2", key: "ano2" as const },
                { label: "Año 3", key: "ano3" as const },
                { label: ">3 años", key: "mas3Anos" as const },
              ];

              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                  {/* PANEL N */}
                  <div
                    style={{
                      border: "1.5px solid #bae6fd",
                      borderRadius: "10px",
                      background: "#f0f9ff",
                      padding: "12px 14px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "999px",
                              background: "#0284c7",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 900,
                              fontSize: "14px",
                            }}
                          >
                            N
                          </span>
                          <div>
                            <strong style={{ fontSize: "13.5px", color: "#0369a1", display: "block" }}>
                              Nitrógeno Disponible ({u})
                            </strong>
                            <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                              Reportado como N elemental
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            background: "#e0f2fe",
                            border: "1px solid #7dd3fc",
                            borderRadius: "6px",
                            padding: "3px 7px",
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#0369a1",
                            maxWidth: "120px",
                            textAlign: "right",
                          }}
                        >
                          {cur.descripcionN}
                        </div>
                      </div>

                      {/* Gráfico de barras para N */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", alignItems: "flex-end", height: "95px", marginTop: "10px", padding: "0 4px" }}>
                        {periods.map((p) => {
                          const val = cur[p.key].n;
                          const maxN = Math.max(cur.ano1.n, 1);
                          const barH = Math.max(12, Math.round((val / maxN) * 65));
                          return (
                            <div key={p.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                              <strong style={{ fontSize: "12px", fontWeight: 800, color: "#0369a1", marginBottom: "3px" }}>
                                {val.toLocaleString("es-AR")}
                              </strong>
                              <div
                                style={{
                                  width: "100%",
                                  maxWidth: "38px",
                                  height: `${barH}px`,
                                  background: "#0284c7",
                                  borderRadius: "4px 4px 0 0",
                                  transition: "height 0.3s ease",
                                }}
                              />
                              <span style={{ fontSize: "10px", color: "var(--slate-600)", fontWeight: 700, marginTop: "4px", whiteSpace: "nowrap" }}>
                                {p.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ marginTop: "10px", paddingTop: "6px", borderTop: "1px dashed #bae6fd", fontSize: "10.5px", color: "#0369a1", display: "flex", justifyContent: "space-between" }}>
                      <span>Total bruto: <strong>{cur.bruto.n} kg N</strong></span>
                      <span>Año 1: <strong>{cur.ano1.n} kg N</strong></span>
                    </div>
                  </div>

                  {/* PANEL P */}
                  <div
                    style={{
                      border: "1.5px solid #bbf7d0",
                      borderRadius: "10px",
                      background: "#f0fdf4",
                      padding: "12px 14px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "999px",
                              background: "#16a34a",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 900,
                              fontSize: "14px",
                            }}
                          >
                            P
                          </span>
                          <div>
                            <strong style={{ fontSize: "13.5px", color: "#15803d", display: "block" }}>
                              Fósforo Disponible ({u})
                            </strong>
                            <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                              Equivalente P₂O₅
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            background: "#dcfce7",
                            border: "1px solid #86efac",
                            borderRadius: "6px",
                            padding: "3px 7px",
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#15803d",
                            maxWidth: "120px",
                            textAlign: "right",
                          }}
                        >
                          {cur.descripcionP}
                        </div>
                      </div>

                      {/* Gráfico de barras para P */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", alignItems: "flex-end", height: "95px", marginTop: "10px", padding: "0 4px" }}>
                        {periods.map((p) => {
                          const valP2O5 = cur[p.key].p2o5;
                          const maxP = Math.max(cur.ano1.p2o5, 1);
                          const barH = Math.max(12, Math.round((valP2O5 / maxP) * 65));
                          return (
                            <div key={p.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                              <strong style={{ fontSize: "12px", fontWeight: 800, color: "#15803d", marginBottom: "1px" }}>
                                {valP2O5.toLocaleString("es-AR")}
                              </strong>
                              <span style={{ fontSize: "9.5px", color: "var(--slate-500)", marginBottom: "3px" }}>
                                {cur[p.key].p} kg P
                              </span>
                              <div
                                style={{
                                  width: "100%",
                                  maxWidth: "38px",
                                  height: `${barH}px`,
                                  background: "#16a34a",
                                  borderRadius: "4px 4px 0 0",
                                  transition: "height 0.3s ease",
                                }}
                              />
                              <span style={{ fontSize: "10px", color: "var(--slate-600)", fontWeight: 700, marginTop: "4px", whiteSpace: "nowrap" }}>
                                {p.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ marginTop: "10px", paddingTop: "6px", borderTop: "1px dashed #bbf7d0", fontSize: "10.5px", color: "#15803d", display: "flex", justifyContent: "space-between" }}>
                      <span>Total bruto: <strong>{cur.bruto.p} kg P ({cur.bruto.p2o5} kg P₂O₅)</strong></span>
                      <span>Año 1: <strong>{cur.ano1.p} kg P</strong></span>
                    </div>
                  </div>

                  {/* PANEL K */}
                  <div
                    style={{
                      border: "1.5px solid #fed7aa",
                      borderRadius: "10px",
                      background: "#fff7ed",
                      padding: "12px 14px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "999px",
                              background: "#ea580c",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 900,
                              fontSize: "14px",
                            }}
                          >
                            K
                          </span>
                          <div>
                            <strong style={{ fontSize: "13.5px", color: "#c2410c", display: "block" }}>
                              Potasio Disponible ({u})
                            </strong>
                            <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                              Equivalente K₂O
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            background: "#ffedd5",
                            border: "1px solid #fdba74",
                            borderRadius: "6px",
                            padding: "3px 7px",
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#c2410c",
                            maxWidth: "120px",
                            textAlign: "right",
                          }}
                        >
                          {cur.descripcionK}
                        </div>
                      </div>

                      {/* Gráfico de barras para K */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", alignItems: "flex-end", height: "95px", marginTop: "10px", padding: "0 4px" }}>
                        {periods.map((p) => {
                          const valK2O = cur[p.key].k2o;
                          const maxK = Math.max(cur.ano1.k2o, 1);
                          const barH = Math.max(12, Math.round((valK2O / maxK) * 65));
                          return (
                            <div key={p.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                              <strong style={{ fontSize: "12px", fontWeight: 800, color: "#c2410c", marginBottom: "1px" }}>
                                {valK2O.toLocaleString("es-AR")}
                              </strong>
                              <span style={{ fontSize: "9.5px", color: "var(--slate-500)", marginBottom: "3px" }}>
                                {cur[p.key].k} kg K
                              </span>
                              <div
                                style={{
                                  width: "100%",
                                  maxWidth: "38px",
                                  height: `${barH}px`,
                                  background: "#ea580c",
                                  borderRadius: "4px 4px 0 0",
                                  transition: "height 0.3s ease",
                                }}
                              />
                              <span style={{ fontSize: "10px", color: "var(--slate-600)", fontWeight: 700, marginTop: "4px", whiteSpace: "nowrap" }}>
                                {p.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ marginTop: "10px", paddingTop: "6px", borderTop: "1px dashed #fed7aa", fontSize: "10.5px", color: "#c2410c", display: "flex", justifyContent: "space-between" }}>
                      <span>Total bruto: <strong>{cur.bruto.k} kg K ({cur.bruto.k2o} kg K₂O)</strong></span>
                      <span>Año 1: <strong>{cur.ano1.k} kg K</strong></span>
                    </div>
                  </div>

                  {/* PANEL S */}
                  <div
                    style={{
                      border: "1.5px solid #fde047",
                      borderRadius: "10px",
                      background: "#fefce8",
                      padding: "12px 14px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "999px",
                              background: "#ca8a04",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 900,
                              fontSize: "14px",
                            }}
                          >
                            S
                          </span>
                          <div>
                            <strong style={{ fontSize: "13.5px", color: "#a16207", display: "block" }}>
                              Azufre Total ({u})
                            </strong>
                            <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                              Nutriente elemental S
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            background: "#fef9c3",
                            border: "1px solid #facc15",
                            borderRadius: "6px",
                            padding: "3px 7px",
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#a16207",
                            maxWidth: "120px",
                            textAlign: "right",
                          }}
                        >
                          {cur.descripcionS}
                        </div>
                      </div>

                      {/* Gráfico de barras para S */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", alignItems: "flex-end", height: "95px", marginTop: "10px", padding: "0 4px" }}>
                        {periods.map((p) => {
                          const valS = cur[p.key].s;
                          const maxS = Math.max(cur.ano1.s, 1);
                          const barH = Math.max(12, Math.round((valS / maxS) * 65));
                          return (
                            <div key={p.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                              <strong style={{ fontSize: "12px", fontWeight: 800, color: "#a16207", marginBottom: "3px" }}>
                                {valS.toLocaleString("es-AR")}
                              </strong>
                              <div
                                style={{
                                  width: "100%",
                                  maxWidth: "38px",
                                  height: `${barH}px`,
                                  background: "#eab308",
                                  borderRadius: "4px 4px 0 0",
                                  transition: "height 0.3s ease",
                                }}
                              />
                              <span style={{ fontSize: "10px", color: "var(--slate-600)", fontWeight: 700, marginTop: "4px", whiteSpace: "nowrap" }}>
                                {p.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ marginTop: "10px", paddingTop: "6px", borderTop: "1px dashed #fde047", fontSize: "10.5px", color: "#a16207", display: "flex", justifyContent: "space-between" }}>
                      <span>Total bruto: <strong>{cur.bruto.s} kg S</strong></span>
                      <span>Año 1: <strong>{cur.ano1.s} kg S</strong></span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Pie de página con supuestos analíticos */}
            <div
              style={{
                marginTop: "14px",
                padding: "8px 12px",
                background: "var(--slate-50)",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                fontSize: "11px",
                color: "var(--slate-600)",
                lineHeight: "1.4",
              }}
            >
              <strong>Valores orientativos de trabajo para HJB:</strong> Base analítica sólida: N=1,2%; P=1,0%; K=2,47%; S=0,22% en efluente sólido homogéneo (Clover E326, carro 5.000 kg). Base analítica líquida: purín homogeneizado ({m3Tanque} m³/tanque). Supuestos de biodisponibilidad: N 25%-12%-5%-2%; P 60%-20%-10%-5%; K 70%-20%-8%-2%; S 35%-20%-10%-5%. <em>Nitrógeno reportado estrictamente en base a Nitrógeno elemental (N).</em>
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
                  <SemaforoCell
                    label="Potasio (K)"
                    value={activeSummary.sueloPrevio.potasioPpm}
                    unit="ppm"
                    result={evaluarPotasio(activeSummary.sueloPrevio.potasioPpm)}
                    compact
                  />
                  <SemaforoCell
                    label="Fósforo Bray"
                    value={activeSummary.sueloPrevio.fosforoBrayPpm}
                    unit="ppm"
                    result={evaluarFosforoBray(activeSummary.sueloPrevio.fosforoBrayPpm)}
                    compact
                  />
                  <SemaforoCell
                    label="Nitrógeno Disp."
                    value={activeSummary.sueloPrevio.nDisponibleKgHa}
                    unit="kg/ha"
                    result={evaluarNitrogenoDisponible(activeSummary.sueloPrevio.nDisponibleKgHa)}
                    compact
                  />
                  <SemaforoCell
                    label="Materia Orgánica"
                    value={activeSummary.sueloPrevio.materiaOrganicaPct}
                    unit="%"
                    result={evaluarMateriaOrganica(activeSummary.sueloPrevio.materiaOrganicaPct)}
                    compact
                  />
                  <SemaforoCell
                    label="pH Actual"
                    value={activeSummary.sueloPrevio.ph}
                    unit=""
                    result={evaluarPH(activeSummary.sueloPrevio.ph)}
                    compact
                  />
                  <SemaforoCell
                    label="Azufre (S)"
                    value={activeSummary.sueloPrevio.azufrePpm}
                    unit="ppm"
                    result={evaluarAzufre(activeSummary.sueloPrevio.azufrePpm)}
                    compact
                  />
                  <SemaforoCell
                    label="Zinc (Zn)"
                    value={activeSummary.sueloPrevio.zincPpm}
                    unit="ppm"
                    result={evaluarZinc(activeSummary.sueloPrevio.zincPpm)}
                    compact
                  />
                  <SemaforoCell
                    label="Calcio (Ca)"
                    value={activeSummary.sueloPrevio.calcioPpm}
                    unit="ppm"
                    result={evaluarCalcio(activeSummary.sueloPrevio.calcioPpm)}
                    compact
                  />
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
                  {activeSummary.perfilHumedad ? (
                    <SemaforoBadge
                      result={evaluarAguaUtilTotal(activeSummary.perfilHumedad.totalAguaUtilMm)}
                      valor={`${activeSummary.perfilHumedad.totalAguaUtilMm} mm`}
                    />
                  ) : (
                    <strong style={{ fontSize: "16px", color: "var(--muted)" }}>—</strong>
                  )}
                </div>
              </div>

              {activeSummary.perfilHumedad ? (
                <div>
                  {(() => {
                    const semA = evaluarAguaUtilTotal(activeSummary.perfilHumedad.totalAguaUtilMm);
                    return (
                      <div style={{ marginBottom: "12px", background: semA.bgColor, border: `1px solid ${semA.borderColor}`, padding: "8px 12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: semA.textColor }}>
                        <span style={{ fontWeight: 700 }}>
                          {semA.icon} Capacidad de reserva: {semA.label}
                        </span>
                        <span style={{ fontSize: "11px", fontWeight: 600 }}>
                          {semA.rangoReferencia}
                        </span>
                      </div>
                    );
                  })()}

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
                      {activeSummary.perfilHumedad.estratos.map((est, i) => {
                        const pct = est.aguaUtilPct ?? 0;
                        const colorEst = pct >= 60 ? "#15803d" : pct >= 35 ? "#b45309" : "#b91c1c";
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "6px 4px", fontWeight: 700 }}>{est.profundidadCm} cm</td>
                            <td style={{ padding: "6px 4px" }}>{est.humedadActualPct}%</td>
                            <td style={{ padding: "6px 4px", color: "var(--muted)" }}>{est.pmpPct}%</td>
                            <td style={{ padding: "6px 4px" }}>{est.aguaUtilPct}%</td>
                            <td style={{ padding: "6px 4px", textAlign: "right", fontWeight: 800, color: colorEst }}>
                              {est.aguaUtilMm} mm
                            </td>
                          </tr>
                        );
                      })}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", color: "var(--slate-900)" }}>
                  {isTambo
                    ? `Comparativa de Suelos, Labores y Recomendación Nutricional (${summariesDelCampo.length} lotes)`
                    : `Comparativa Química de Suelos y Perfiles Hídricos (${summariesDelCampo.length} lotes)`}
                </h3>
                <small style={{ color: "var(--muted)", fontSize: "11.5px" }}>
                  {isTambo
                    ? `Mostrando aportes de enmiendas y carros calculados exclusivamente para la Campaña ${campana}`
                    : `Parámetros químicos nativos y reservas hídricas para la Campaña ${campana}`}
                </small>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <span className="pill badgeSlate">Campaña {campana}</span>
                <span className="pill badgeGreen">Meta: {targetCrop}</span>
              </div>
            </div>

            <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse", minWidth: isTambo ? "1050px" : "800px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left", color: "var(--slate-700)", background: "var(--slate-50)" }}>
                  <th style={{ padding: "8px 10px" }}>Lote & Rotación</th>
                  <th style={{ padding: "8px 10px" }}>Sup (ha)</th>
                  <th style={{ padding: "8px 10px" }}>Agua Útil</th>
                  <th style={{ padding: "8px 10px" }}>P Bray / N Suelo</th>
                  {isTambo ? (
                    <>
                      <th style={{ padding: "8px 10px" }}>Aplicado Campaña</th>
                      <th style={{ padding: "8px 10px" }}>Opción 100% Sólido ({tnCarro} tn)</th>
                      <th style={{ padding: "8px 10px" }}>Opción 100% Líquido ({m3Tanque} m³)</th>
                      <th style={{ padding: "8px 10px" }}>Mezcla Sugerida</th>
                      <th style={{ padding: "8px 10px" }}>Cobertura N-P-K</th>
                      <th style={{ padding: "8px 10px" }}>Limitante</th>
                      <th style={{ padding: "8px 10px" }}>Estado</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: "8px 10px" }}>Materia Orgánica</th>
                      <th style={{ padding: "8px 10px" }}>pH Actual</th>
                      <th style={{ padding: "8px 10px" }}>Zinc / Azufre</th>
                      <th style={{ padding: "8px 10px" }}>C.I.C. (meq)</th>
                    </>
                  )}
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {summariesDelCampo.map((s) => {
                  const isDone = s.estadoBalance === "Cubierto con holgura";

                  return (
                    <tr key={s.lote} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px", fontWeight: 700, color: "var(--slate-900)" }}>
                        <div>{s.lote}</div>
                        <small style={{ color: "var(--muted)", fontWeight: 500, fontSize: "11px" }}>{s.cultivo}</small>
                      </td>
                      <td style={{ padding: "10px" }}>{s.superficieHa} ha</td>
                      <td style={{ padding: "10px" }}>
                        {s.perfilHumedad ? (
                          <span
                            className={`pill ${evaluarAguaUtilTotal(s.perfilHumedad.totalAguaUtilMm).badgeClass}`}
                            style={{ fontSize: "11px", fontWeight: 700 }}
                          >
                            {evaluarAguaUtilTotal(s.perfilHumedad.totalAguaUtilMm).icon} {s.perfilHumedad.totalAguaUtilMm} mm
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "10px" }}>
                        {s.sueloPrevio ? (
                          <div>
                            <div>
                              <strong style={{ color: evaluarFosforoBray(s.sueloPrevio.fosforoBrayPpm).textColor }}>
                                {evaluarFosforoBray(s.sueloPrevio.fosforoBrayPpm).icon} {s.sueloPrevio.fosforoBrayPpm} ppm P
                              </strong>
                            </div>
                            <small style={{ color: evaluarNitrogenoDisponible(s.sueloPrevio.nDisponibleKgHa).textColor, fontSize: "11px", fontWeight: 600 }}>
                              {evaluarNitrogenoDisponible(s.sueloPrevio.nDisponibleKgHa).icon} {s.sueloPrevio.nDisponibleKgHa} kg N
                            </small>
                          </div>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>—</span>
                        )}
                      </td>
                      {isTambo ? (
                        <>
                          <td style={{ padding: "10px" }}>
                            {s.carrosSolido > 0 || s.tanquesLiquido > 0 ? (
                              <div>
                                {s.carrosSolido > 0 && (
                                  <span style={{ color: "#166534", background: "#dcfce7", padding: "2px 5px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, marginRight: "4px" }}>
                                    🚜 {s.carrosSolido} c
                                  </span>
                                )}
                                {s.tanquesLiquido > 0 && (
                                  <span style={{ color: "#0369a1", background: "#e0f2fe", padding: "2px 5px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                                    💧 {s.tanquesLiquido} t
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "var(--muted)", fontSize: "11px" }}>0 aplicados</span>
                            )}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <strong style={{ color: s.soloCarrosRestantes === 0 ? "#16a34a" : "#854d0e", fontSize: "12.5px" }}>
                              {s.soloCarrosRestantes === 0 ? "✓ 0 carros" : `${s.soloCarrosRestantes} carros`}
                            </strong>
                          </td>
                          <td style={{ padding: "10px" }}>
                            <strong style={{ color: s.soloTanquesRestantes === 0 ? "#16a34a" : "#0369a1", fontSize: "12.5px" }}>
                              {s.soloTanquesRestantes === 0 ? "✓ 0 tanques" : `${s.soloTanquesRestantes} tanques`}
                            </strong>
                          </td>
                          <td style={{ padding: "10px", fontSize: "11.5px" }}>
                            {s.soloCarrosRestantes === 0 && s.soloTanquesRestantes === 0 ? (
                              <span style={{ color: "#16a34a", fontWeight: 700 }}>Cubierto</span>
                            ) : (
                              <span style={{ color: "var(--slate-800)", fontWeight: 600 }}>
                                {s.opcionMixtaSugerida.carros} c + {s.opcionMixtaSugerida.tanques} t
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px", fontSize: "11px" }}>
                            <div>
                              <strong style={{ color: evaluarCoberturaNutriente(s.coberturaPct.nitrogeno).textColor }}>
                                {evaluarCoberturaNutriente(s.coberturaPct.nitrogeno).icon} N: {s.coberturaPct.nitrogeno}%
                              </strong>
                            </div>
                            <div>
                              <strong style={{ color: evaluarCoberturaNutriente(s.coberturaPct.fosforo).textColor }}>
                                {evaluarCoberturaNutriente(s.coberturaPct.fosforo).icon} P: {s.coberturaPct.fosforo}%
                              </strong>
                            </div>
                            <div>
                              <strong style={{ color: evaluarCoberturaNutriente(s.coberturaPct.potasio).textColor }}>
                                {evaluarCoberturaNutriente(s.coberturaPct.potasio).icon} K: {s.coberturaPct.potasio}%
                              </strong>
                            </div>
                          </td>
                          <td style={{ padding: "10px" }}>
                            {s.nutrienteLimitante !== "Equilibrado" ? (
                              <span
                                style={{
                                  padding: "2px 6px",
                                  borderRadius: "10px",
                                  fontSize: "10.5px",
                                  fontWeight: 800,
                                  background: s.nutrienteLimitante === "Potasio" ? "#e0e7ff" : s.nutrienteLimitante === "Fósforo" ? "#e0f2fe" : "#fef3c7",
                                  color: s.nutrienteLimitante === "Potasio" ? "#3730a3" : s.nutrienteLimitante === "Fósforo" ? "#0369a1" : "#92400e",
                                }}
                              >
                                {s.nutrienteLimitante}
                              </span>
                            ) : (
                              <span style={{ color: "var(--muted)", fontSize: "11px" }}>Equilibrado</span>
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
                        </>
                      ) : (
                        <>
                          <td style={{ padding: "10px" }}>
                            {s.sueloPrevio ? (
                              <span style={{ fontWeight: 700, color: evaluarMateriaOrganica(s.sueloPrevio.materiaOrganicaPct).textColor }}>
                                {evaluarMateriaOrganica(s.sueloPrevio.materiaOrganicaPct).icon} {s.sueloPrevio.materiaOrganicaPct}%
                              </span>
                            ) : "—"}
                          </td>
                          <td style={{ padding: "10px" }}>
                            {s.sueloPrevio ? (
                              <span style={{ fontWeight: 700, color: evaluarPH(s.sueloPrevio.ph).textColor }}>
                                {evaluarPH(s.sueloPrevio.ph).icon} {s.sueloPrevio.ph}
                              </span>
                            ) : "—"}
                          </td>
                          <td style={{ padding: "10px" }}>
                            {s.sueloPrevio ? (
                              <div>
                                <span style={{ color: evaluarZinc(s.sueloPrevio.zincPpm).textColor, fontWeight: 700 }}>
                                  {evaluarZinc(s.sueloPrevio.zincPpm).icon} {s.sueloPrevio.zincPpm} ppm Zn
                                </span>
                                <br />
                                <small style={{ color: evaluarAzufre(s.sueloPrevio.azufrePpm).textColor, fontWeight: 600 }}>
                                  {evaluarAzufre(s.sueloPrevio.azufrePpm).icon} {s.sueloPrevio.azufrePpm} ppm S
                                </small>
                              </div>
                            ) : "—"}
                          </td>
                          <td style={{ padding: "10px" }}>
                            {s.sueloPrevio ? `${s.sueloPrevio.cicMeq} meq` : "—"}
                          </td>
                        </>
                      )}
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <button
                          type="button"
                          className="tableAction"
                          onClick={() => setSelectedLoteNombre(s.lote)}
                          style={{ fontSize: "11.5px", padding: "3px 8px" }}
                        >
                          {isTambo ? "Simular" : "Ver lote"}
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
                  <div><strong>Capacidad de Carro:</strong> {tnCarro} toneladas netas</div>
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
                    <strong>{manure.nitrogenoTotalPct}% ({(manure.nitrogenoTotalPct * 10).toFixed(1)} kg N/tn)</strong>
                  </div>
                  <div className="soilParam">
                    <span>Fósforo Total (P)</span>
                    <strong>{manure.fosforoTotalPct}% ({(manure.fosforoTotalPct * 10).toFixed(1)} kg P/tn)</strong>
                  </div>
                  <div className="soilParam">
                    <span>Potasio Total (K)</span>
                    <strong>{manure.potasioTotalPct}% ({(manure.potasioTotalPct * 10).toFixed(1)} kg K/tn)</strong>
                  </div>
                  <div className="soilParam">
                    <span>Azufre Total (S)</span>
                    <strong>{manure.azufreTotalPct}% ({(manure.azufreTotalPct * 10).toFixed(1)} kg S/tn)</strong>
                  </div>
                  <div className="soilParam">
                    <span>Materia Orgánica</span>
                    <strong>{manure.materiaOrganicaPct}% ({(manure.materiaOrganicaPct * 10).toFixed(1)} kg MO/tn)</strong>
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
                  🚜 Aporte Nutricional Neto por Cada Carro Esparcido ({tnCarro} Toneladas Netas)
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginTop: "8px", textAlign: "center" }}>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <small style={{ color: "var(--muted)", display: "block", fontSize: "10px" }}>NITRÓGENO</small>
                    <strong style={{ color: "#15803d", fontSize: "14px" }}>{(tnCarro * manure.nitrogenoTotalPct * 10).toFixed(1)} kg N</strong>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <small style={{ color: "var(--muted)", display: "block", fontSize: "10px" }}>FÓSFORO</small>
                    <strong style={{ color: "#15803d", fontSize: "14px" }}>{(tnCarro * manure.fosforoTotalPct * 10).toFixed(1)} kg P</strong>
                    <small style={{ display: "block", fontSize: "9px", color: "var(--muted)" }}>{(tnCarro * manure.fosforoTotalPct * 10 * 2.29).toFixed(1)} kg P₂O₅</small>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <small style={{ color: "var(--muted)", display: "block", fontSize: "10px" }}>POTASIO</small>
                    <strong style={{ color: "#15803d", fontSize: "14px" }}>{(tnCarro * manure.potasioTotalPct * 10).toFixed(1)} kg K</strong>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <small style={{ color: "var(--muted)", display: "block", fontSize: "10px" }}>AZUFRE</small>
                    <strong style={{ color: "#15803d", fontSize: "14px" }}>{(tnCarro * manure.azufreTotalPct * 10).toFixed(1)} kg S</strong>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <small style={{ color: "var(--muted)", display: "block", fontSize: "10px" }}>MATERIA ORGÁNICA</small>
                    <strong style={{ color: "#15803d", fontSize: "14px" }}>{Math.round(tnCarro * manure.materiaOrganicaPct * 10).toLocaleString("es-AR")} kg MO</strong>
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

