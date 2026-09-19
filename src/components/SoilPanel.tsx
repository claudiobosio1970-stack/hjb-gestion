"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  const [campana, setCampana] = useState<string>("2026/27");
  const [showManureModal, setShowManureModal] = useState<boolean>(false);

  const isTambo = campoNombre.toLowerCase() === "tambo";

  // Estados para simulación interactiva en vivo
  const [simCarros, setSimCarros] = useState<number | null>(null);
  const [simTanques, setSimTanques] = useState<number | null>(null);

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
        campana
      )
    );
  }, [lotesDelCampo, campoNombre, targetCrop, campana, soils, moistures, manure]);

  // Resumen base real (sin simulación) del lote seleccionado
  const baselineSummary: LoteNutrientSummary | null = useMemo(() => {
    if (!activeLote) return null;
    return computeLoteNutrientSummary(
      campoNombre,
      activeLote.nombre,
      activeLote.superficieHa || 5,
      targetCrop,
      campana
    );
  }, [activeLote, campoNombre, targetCrop, campana, soils, moistures, manure]);

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
      isSimulating ? currentSimTanques : undefined
    );
  }, [activeLote, campoNombre, targetCrop, campana, soils, moistures, manure, isSimulating, currentSimCarros, currentSimTanques]);

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
                🔒 Balance y carros restantes calculados exclusivamente para la <strong>Campaña {campana}</strong>. Equivalencia promedio: <strong>1 carro sólido (5 tn) ≈ 3.5 tanques líquidos (12.000 L)</strong>.
              </small>
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
                  🚜 SÓLIDO (5 tn)
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
                  {activeSummary.soloCarrosRestantes === 0 ? "✓ Cubierto" : `${activeSummary.soloCarrosRestantes * 5} tn a tirar`}
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
                  💧 LÍQUIDO (12 m³)
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
                  {activeSummary.soloTanquesRestantes === 0 ? "✓ Cubierto" : `${activeSummary.soloTanquesRestantes * 12} m³ a tirar`}
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", marginBottom: "5px", flexWrap: "wrap", gap: "4px" }}>
                  <strong style={{ color: "#15803d", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span>🌱 Nitrógeno (N)</span>
                    <span style={{ background: "#dcfce7", color: "#166534", padding: "1px 7px", borderRadius: "10px", fontSize: "11px", fontWeight: 800 }}>
                      Llevamos {activeSummary.coberturaPct.nitrogeno}%
                    </span>
                  </strong>
                  <span style={{ color: "var(--slate-600)", fontSize: "11.5px" }}>
                    Disponible: {activeSummary.sueloPrevio ? activeSummary.sueloPrevio.nDisponibleKgHa + activeSummary.aportesPorHa.nitrogenoKgHa : activeSummary.aportesPorHa.nitrogenoKgHa} kg/ha (Meta: {activeSummary.metaKgHa.nitrogeno} kg/ha)
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
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <div
                    style={{
                      background: activeSummary.coberturaPct.nitrogeno >= 100 ? "#16a34a" : activeSummary.coberturaPct.nitrogeno >= 70 ? "#f59e0b" : "#2563eb",
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
              </div>

              {/* Barra P */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", marginBottom: "5px", flexWrap: "wrap", gap: "4px" }}>
                  <strong style={{ color: "#0369a1", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span>🌾 Fósforo (P)</span>
                    <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "1px 7px", borderRadius: "10px", fontSize: "11px", fontWeight: 800 }}>
                      Llevamos {activeSummary.coberturaPct.fosforo}%
                    </span>
                  </strong>
                  <span style={{ color: "var(--slate-600)", fontSize: "11.5px" }}>
                    Aporte: +{activeSummary.aportesPorHa.fosforoKgHa} kg P/ha · P Bray: {activeSummary.sueloPrevio ? activeSummary.sueloPrevio.fosforoBrayPpm : 22} ppm (Meta: {activeSummary.metaKgHa.fosforo} kg/ha)
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
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <div
                    style={{
                      background: activeSummary.coberturaPct.fosforo >= 100 ? "#16a34a" : activeSummary.coberturaPct.fosforo >= 70 ? "#f59e0b" : "#0284c7",
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
              </div>

              {/* Barra K */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", marginBottom: "5px", flexWrap: "wrap", gap: "4px" }}>
                  <strong style={{ color: "#4338ca", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span>🌽 Potasio (K)</span>
                    <span style={{ background: "#e0e7ff", color: "#3730a3", padding: "1px 7px", borderRadius: "10px", fontSize: "11px", fontWeight: 800 }}>
                      Llevamos {activeSummary.coberturaPct.potasio}%
                    </span>
                  </strong>
                  <span style={{ color: "var(--slate-600)", fontSize: "11.5px" }}>
                    Aporte: +{activeSummary.aportesPorHa.potasioKgHa} kg K/ha (Meta: {activeSummary.metaKgHa.potasio} kg/ha)
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
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <div
                    style={{
                      background: activeSummary.coberturaPct.potasio >= 100 ? "#16a34a" : activeSummary.coberturaPct.potasio >= 70 ? "#f59e0b" : "#6366f1",
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
                <span className="metricValue" style={{ fontSize: "20px", color: "#0284c7" }}>
                  {activeSummary.perfilHumedad ? `${activeSummary.perfilHumedad.totalAguaUtilMm} mm` : "—"}
                </span>
                <small className="metricNote">
                  {activeSummary.perfilHumedad && activeSummary.perfilHumedad.totalAguaUtilMm >= 280
                    ? "🌊 Excelente recarga hídrica profunda"
                    : "Muestreo de humedad Molisol"}
                </small>
              </div>

              {/* Tarjeta 2: Fósforo Bray */}
              <div className="metricCard">
                <span className="metricLabel">Fósforo Bray (Suelo)</span>
                <span className="metricValue" style={{ fontSize: "20px", color: "#0369a1" }}>
                  {activeSummary.sueloPrevio ? `${activeSummary.sueloPrevio.fosforoBrayPpm} ppm` : "—"}
                </span>
                <small className="metricNote">
                  Meta del cultivo: {activeSummary.metaKgHa.fosforo} kg P/ha
                </small>
              </div>

              {/* Tarjeta 3: Nitrógeno Disponible */}
              <div className="metricCard">
                <span className="metricLabel">Nitrógeno Disponible (Suelo)</span>
                <span className="metricValue" style={{ fontSize: "20px", color: "#15803d" }}>
                  {activeSummary.sueloPrevio ? `${activeSummary.sueloPrevio.nDisponibleKgHa} kg N/ha` : "—"}
                </span>
                <small className="metricNote">
                  Meta del cultivo: {activeSummary.metaKgHa.nitrogeno} kg N/ha
                </small>
              </div>

              {/* Tarjeta 4: Materia Orgánica & pH */}
              <div className="metricCard">
                <span className="metricLabel">Materia Orgánica & pH</span>
                <span className="metricValue" style={{ fontSize: "20px" }}>
                  {activeSummary.sueloPrevio ? `${activeSummary.sueloPrevio.materiaOrganicaPct}%` : "—"}
                </span>
                <small className="metricNote">
                  pH: {activeSummary.sueloPrevio ? activeSummary.sueloPrevio.ph : "—"} · C.I.C: {activeSummary.sueloPrevio ? `${activeSummary.sueloPrevio.cicMeq} meq` : "—"}
                </small>
              </div>
            </div>
          )}

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
                      <th style={{ padding: "8px 10px" }}>Opción 100% Sólido</th>
                      <th style={{ padding: "8px 10px" }}>Opción 100% Líquido</th>
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
                      <td style={{ padding: "10px", fontWeight: 700, color: "#0284c7" }}>
                        {s.perfilHumedad ? `${s.perfilHumedad.totalAguaUtilMm} mm` : "—"}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <div>{s.sueloPrevio ? `${s.sueloPrevio.fosforoBrayPpm} ppm P` : "—"}</div>
                        <small style={{ color: "var(--muted)", fontSize: "11px" }}>{s.sueloPrevio ? `${s.sueloPrevio.nDisponibleKgHa} kg N` : "—"}</small>
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
                            <div><strong style={{ color: s.coberturaPct.nitrogeno >= 100 ? "#16a34a" : "#d97706" }}>N:</strong> {s.coberturaPct.nitrogeno}%</div>
                            <div><strong style={{ color: s.coberturaPct.fosforo >= 100 ? "#16a34a" : "#0284c7" }}>P:</strong> {s.coberturaPct.fosforo}%</div>
                            <div><strong style={{ color: s.coberturaPct.potasio >= 100 ? "#16a34a" : "#6366f1" }}>K:</strong> {s.coberturaPct.potasio}%</div>
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
                            {s.sueloPrevio ? `${s.sueloPrevio.materiaOrganicaPct}%` : "—"}
                          </td>
                          <td style={{ padding: "10px" }}>
                            {s.sueloPrevio ? s.sueloPrevio.ph : "—"}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <div>{s.sueloPrevio ? `${s.sueloPrevio.zincPpm} ppm Zn` : "—"}</div>
                            <small style={{ color: "var(--muted)", fontSize: "11px" }}>{s.sueloPrevio ? `${s.sueloPrevio.azufrePpm} ppm S` : "—"}</small>
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

