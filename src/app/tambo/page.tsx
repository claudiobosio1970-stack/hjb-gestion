"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import {
  getStockActualInsumos,
  getDietaTambo,
  saveDietaTambo,
  calcularAutonomiaAlimentoRodeo,
  DietaTamboConfig,
  HJB_DIETA_SYNC_EVENT,
  HJB_STOCK_SYNC_EVENT,
} from "@/lib/stockInsumosData";
import { getPrecioReferencia } from "@/lib/valoresMovilesData";
import {
  getDelProConfig,
  DelProConfig,
  HJB_DELPRO_SYNC_EVENT,
  PartoDelPro,
  getCensoRodeoTambo,
  CensoRodeoTambo,
  VacaTamboIndividual,
  importarPayloadDesdeJson,
} from "@/lib/delproData";

export default function TamboPage() {
  const [dieta, setDieta] = useState<DietaTamboConfig>(getDietaTambo());
  const [delproConfig, setDelproConfig] = useState<DelProConfig>(() => getDelProConfig());
  const [censoRodeo, setCensoRodeo] = useState<CensoRodeoTambo>(() => getCensoRodeoTambo());
  const [stockData, setStockData] = useState(() => getStockActualInsumos());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Filtros individuales de vacas por RP
  const [busquedaVacaRP, setBusquedaVacaRP] = useState("");
  const [filtroEstadoVaca, setFiltroEstadoVaca] = useState<"todas" | "en_ordenie" | "secas" | "preniadas" | "inseminadas" | "vacias">("todas");
  const [ordenCenso, setOrdenCenso] = useState<"rp_asc" | "del_desc" | "del_asc" | "litros_desc" | "litros_asc" | "parto_proximo">("rp_asc");
  const [elementosPorPagina, setElementosPorPagina] = useState(50);
  const [paginaVacas, setPaginaVacas] = useState(1);

  // Form local state
  const [formDieta, setFormDieta] = useState({
    vacasEnOrdeñe: dieta.vacasEnOrdeñe,
    pelletSoja: dieta.racionesKgDia["pellet-soja"] || 2.5,
    pelletTrigo: dieta.racionesKgDia["pellet-trigo"] || 3.0,
    siloMaiz: dieta.racionesKgDia["silo-maiz"] || 22.0,
    maiz: dieta.racionesKgDia["maiz"] || 5.5,
  });

  function cargarTodo() {
    const currentDieta = getDietaTambo();
    setDieta(currentDieta);
    setStockData(getStockActualInsumos());
    setDelproConfig(getDelProConfig());
    setCensoRodeo(getCensoRodeoTambo());
    setFormDieta({
      vacasEnOrdeñe: currentDieta.vacasEnOrdeñe,
      pelletSoja: currentDieta.racionesKgDia["pellet-soja"] || 2.5,
      pelletTrigo: currentDieta.racionesKgDia["pellet-trigo"] || 3.0,
      siloMaiz: currentDieta.racionesKgDia["silo-maiz"] || 22.0,
      maiz: currentDieta.racionesKgDia["maiz"] || 5.5,
    });
    setHasChanges(false);
  }

  useEffect(() => {
    cargarTodo();

    function onSync() {
      cargarTodo();
    }

    window.addEventListener(HJB_DIETA_SYNC_EVENT, onSync);
    window.addEventListener(HJB_STOCK_SYNC_EVENT, onSync);
    window.addEventListener(HJB_DELPRO_SYNC_EVENT, onSync);
    return () => {
      window.removeEventListener(HJB_DIETA_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_STOCK_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_DELPRO_SYNC_EVENT, onSync);
    };
  }, []);

  function triggerFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4500);
  }

  function handleGuardarDieta(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (formDieta.vacasEnOrdeñe <= 0) {
      alert("Por favor ingresá un número de vacas en ordeñe válido mayor a 0.");
      return;
    }

    const updated = saveDietaTambo({
      vacasEnOrdeñe: formDieta.vacasEnOrdeñe,
      racionesKgDia: {
        ...dieta.racionesKgDia,
        "pellet-soja": formDieta.pelletSoja,
        "pellet-trigo": formDieta.pelletTrigo,
        "silo-maiz": formDieta.siloMaiz,
        maiz: formDieta.maiz,
      },
      actualizadoPor: "Módulo Tambo HJB",
    });

    setDieta(updated);
    setHasChanges(false);
    triggerFeedback(`✓ Dieta del Tambo guardada y sincronizada: ${formDieta.vacasEnOrdeñe} VO · Pellet Soja ${formDieta.pelletSoja} kg/d · Silo ${formDieta.siloMaiz} kg/d.`);
  }

  // Stock disponible actual en el Tambo
  const itemPelletSoja = stockData.items.find((x) => x.id === "pellet-soja");
  const itemPelletTrigo = stockData.items.find((x) => x.id === "pellet-trigo");
  const itemSilo = stockData.items.find((x) => x.id === "silo-maiz");

  const stockPelletSojaKg = itemPelletSoja?.stockActual || 0;
  const stockPelletTrigoKg = itemPelletTrigo?.stockActual || 0;
  const stockSiloKg = itemSilo?.stockActual || 0;

  // Autonomías reactivas según los valores actualmente tipeados en el formulario
  const consumoDiaSoja = Math.round(formDieta.vacasEnOrdeñe * formDieta.pelletSoja * 10) / 10;
  const diasSoja = consumoDiaSoja > 0 ? Math.floor(stockPelletSojaKg / consumoDiaSoja) : 0;

  const consumoDiaTrigo = Math.round(formDieta.vacasEnOrdeñe * formDieta.pelletTrigo * 10) / 10;
  const diasTrigo = consumoDiaTrigo > 0 ? Math.floor(stockPelletTrigoKg / consumoDiaTrigo) : 0;

  const consumoDiaSilo = Math.round(formDieta.vacasEnOrdeñe * formDieta.siloMaiz * 10) / 10;
  const diasSilo = consumoDiaSilo > 0 ? Math.floor(stockSiloKg / consumoDiaSilo) : 0;

  // Autonomías consolidadas de todo el rodeo (Tambo + Ganadería)
  const autoSojaTotal = calcularAutonomiaAlimentoRodeo(stockPelletSojaKg, "pellet-soja", {
    vacasOrdeñe: formDieta.vacasEnOrdeñe,
    racionKgVacaDia: formDieta.pelletSoja,
  });
  const autoTrigoTotal = calcularAutonomiaAlimentoRodeo(stockPelletTrigoKg, "pellet-trigo", {
    vacasOrdeñe: formDieta.vacasEnOrdeñe,
    racionKgVacaDia: formDieta.pelletTrigo,
  });
  const autoSiloTotal = calcularAutonomiaAlimentoRodeo(stockSiloKg, "silo-maiz", {
    vacasOrdeñe: formDieta.vacasEnOrdeñe,
    racionKgVacaDia: formDieta.siloMaiz,
  });

  // Costos de alimentación por vaca en ordeño (VO) y totales de rodeo
  const precioKgSoja = (getPrecioReferencia("pellet-soja", "ARS") || 295200) / 1000;
  const precioKgTrigo = (getPrecioReferencia("pellet-trigo", "ARS") || 221800) / 1000;
  const precioKgSilo = getPrecioReferencia("silo-maiz", "ARS") || 80;
  const precioKgMaiz = (getPrecioReferencia("maiz", "ARS") || 210000) / 1000;

  const costoDiaVOSoja = Number((formDieta.pelletSoja * precioKgSoja).toFixed(2));
  const costoDiaVOTrigo = Number((formDieta.pelletTrigo * precioKgTrigo).toFixed(2));
  const costoDiaVOSilo = Number((formDieta.siloMaiz * precioKgSilo).toFixed(2));
  const costoDiaVOMaiz = Number((formDieta.maiz * precioKgMaiz).toFixed(2));

  const costoTotalDiaVO = Number((costoDiaVOSoja + costoDiaVOTrigo + costoDiaVOSilo + costoDiaVOMaiz).toFixed(2));
  const costoTotalRodeoDia = Math.round(costoTotalDiaVO * formDieta.vacasEnOrdeñe);

  // Filtrado, ordenamiento y paginación del Censo Individual de Vacas
  const vacasDetalle = censoRodeo.detalleVacas || [];
  const vacasFiltradas = vacasDetalle
    .filter((v) => {
      if (busquedaVacaRP.trim() && !v.rp.toLowerCase().includes(busquedaVacaRP.toLowerCase().trim())) {
        return false;
      }
      if (filtroEstadoVaca === "en_ordenie") return v.estadoProductivo === "En Ordeñe";
      if (filtroEstadoVaca === "secas") return v.estadoProductivo === "Seca";
      if (filtroEstadoVaca === "preniadas") return v.estadoReproductivo === "Preñada";
      if (filtroEstadoVaca === "inseminadas") return v.estadoReproductivo === "Inseminada";
      if (filtroEstadoVaca === "vacias") return v.estadoReproductivo === "Vacía";
      return true;
    })
    .sort((a, b) => {
      if (ordenCenso === "del_desc") {
        return (b.diasLactancia || 0) - (a.diasLactancia || 0);
      }
      if (ordenCenso === "del_asc") {
        return (a.diasLactancia || 0) - (b.diasLactancia || 0);
      }
      if (ordenCenso === "litros_desc") {
        return (b.litrosAyer || 0) - (a.litrosAyer || 0);
      }
      if (ordenCenso === "litros_asc") {
        return (a.litrosAyer || 0) - (b.litrosAyer || 0);
      }
      if (ordenCenso === "parto_proximo") {
        const diasFaltanA = a.diasGestacion ? Math.max(0, 282 - a.diasGestacion) : 99999;
        const diasFaltanB = b.diasGestacion ? Math.max(0, 282 - b.diasGestacion) : 99999;
        return diasFaltanA - diasFaltanB;
      }
      // "rp_asc": orden por número de caravana/RP
      const numA = parseInt(a.rp.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.rp.replace(/\D/g, "")) || 0;
      return numA - numB;
    });

  const totalPaginasVacas = Math.ceil(vacasFiltradas.length / elementosPorPagina) || 1;
  const paginaValida = Math.min(paginaVacas, totalPaginasVacas);
  const vacasPaginadas = vacasFiltradas.slice(
    (paginaValida - 1) * elementosPorPagina,
    paginaValida * elementosPorPagina
  );

  return (
    <AppShell active="Tambo">
      <div className="pageHeader">
        <div>
          <div className="badgeRow">
            <span className="pill badgeGreen">Producción Lechera</span>
            <span className="pill badgeSlate">Campaña 2026/27</span>
            <span className="pill badgeBlue">Dieta Sincronizada</span>
          </div>
          <h1>Tambo HJB</h1>
          <p className="muted">Control lechero, rodeo en ordeñe, formulación de raciones y balance forrajero.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link
            href="/insumos"
            className="secondaryBtn"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            🌾 Insumos & Stock
          </Link>
          <button
            type="button"
            className="primaryButton"
            onClick={() => handleGuardarDieta()}
            disabled={!hasChanges}
            style={{
              background: hasChanges ? "#15803d" : "var(--slate-400)",
              borderColor: hasChanges ? "#15803d" : "var(--slate-400)",
              opacity: hasChanges ? 1 : 0.7,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            💾 Guardar Dieta {hasChanges && "⚠️"}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: "12px 16px",
            background: "#ecfdf5",
            border: "1px solid #10b981",
            color: "#065f46",
            borderRadius: "8px",
            marginBottom: "16px",
            fontWeight: 700,
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#065f46", fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PANEL OFICIAL: SINCRONIZACIÓN EN VIVO CON DELAVAL DELPRO (SQL SERVER)     */}
      {/* ========================================================================= */}
      <section className="section" style={{ marginBottom: "20px" }}>
        <div
          className="panel"
          style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)",
            border: "1px solid #86efac",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", border: "1px solid #86efac" }}>
                🥛
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h2 style={{ fontSize: "17px", fontWeight: 800, margin: 0, color: "#14532d" }}>
                    DeLaval DelPro FarmManager
                  </h2>
                  <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 700 }}>
                    🟢 En Vivo · Conectado
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label
                className="secondaryBtn"
                style={{
                  fontSize: "12px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#f0fdf4",
                  borderColor: "#86efac",
                  color: "#166534",
                  fontWeight: 600,
                }}
                title="Cargar archivo delpro_sync.json extraído de la PC del tambo"
              >
                📂 Cargar delpro_sync.json
                <input
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string;
                      if (text) {
                        const res = importarPayloadDesdeJson(text);
                        if (res.success && res.config) {
                          setDelproConfig(res.config);
                          setCensoRodeo(getCensoRodeoTambo());
                          setFeedback("✓ Sincronización exitosa con DelPro: " + res.mensaje);
                          setTimeout(() => setFeedback(null), 8000);
                        } else {
                          alert("Error al cargar: " + res.mensaje);
                        }
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>

              <Link
                href="/inicio"
                className="secondaryBtn"
                style={{ fontSize: "12px", padding: "6px 12px", textDecoration: "none" }}
              >
                ⚙️ Configurar Extractor
              </Link>
            </div>
          </div>

          <div className="metricsGrid four" style={{ marginTop: "12px" }}>
            <div style={{ background: "#ffffff", padding: "14px", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: "11.5px", color: "var(--slate-500)", fontWeight: 600 }}>PRODUCCIÓN MEDIDA TANQUE</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#15803d", marginTop: "4px" }}>
                {delproConfig.datosSincronizados.litrosTotalesDia.toLocaleString("es-AR")} lts/día
              </div>
            </div>

            <div style={{ background: "#ffffff", padding: "14px", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: "11.5px", color: "var(--slate-500)", fontWeight: 600 }}>VACAS EN ORDEÑE (VO)</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#0369a1", marginTop: "4px" }}>
                {delproConfig.datosSincronizados.vacasEnOrdeñe} VO
              </div>
            </div>

            <div style={{ background: "#ffffff", padding: "14px", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: "11.5px", color: "var(--slate-500)", fontWeight: 600 }}>PROMEDIO POR VACA</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#0f766e", marginTop: "4px" }}>
                {delproConfig.datosSincronizados.litrosPromedioVO} lts/VO
              </div>
            </div>

            <div style={{ background: "#ffffff", padding: "14px", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: "11.5px", color: "var(--slate-500)", fontWeight: 600 }}>VACAS SECAS PREPARTO</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#475569", marginTop: "4px" }}>
                {delproConfig.datosSincronizados.vacasSecasPreparto || 25} cab.
              </div>
            </div>
          </div>

          {/* Partos Recientes Segregados */}
          {delproConfig.datosSincronizados.partosRecientes && delproConfig.datosSincronizados.partosRecientes.length > 0 && (
            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed #bbf7d0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#166534", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🐣</span> Últimos Partos Registrados en DelPro & Segregación HJB:
                </div>
              </div>
              <div className="tableWrap" style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <table className="dataTable compact">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>RP Madre</th>
                      <th>RP Cría</th>
                      <th style={{ textAlign: "center" }}>Sexo</th>
                      <th style={{ textAlign: "right" }}>Peso Nac.</th>
                      <th>Destino HJB</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {delproConfig.datosSincronizados.partosRecientes.slice(0, 5).map((p) => (
                      <tr key={p.id}>
                        <td>{p.fecha}</td>
                        <td><strong>{p.rpMadre}</strong></td>
                        <td>{p.rpCria}</td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            className={`pill ${p.sexo === "Macho" ? "badgeBlue" : "badgeGreen"}`}
                            style={{ fontSize: "11px", fontWeight: 700 }}
                          >
                            {p.sexo === "Macho" ? "♂️ Macho" : "♀️ Hembra"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}><strong>{p.pesoNacimientoKg} kg</strong></td>
                        <td>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: p.sexo === "Macho" ? "#1e40af" : "#15803d",
                            }}
                          >
                            {p.destino}
                          </span>
                        </td>
                        <td>
                          <span className="pill badgeSlate" style={{ fontSize: "10.5px" }}>
                            {p.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CENSO REPRODUCTIVO & TRAZABILIDAD INDIVIDUAL POR RP (DELAVAL DELPRO)       */}
      {/* ========================================================================= */}
      <section className="section" style={{ marginBottom: "24px" }}>
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }}>🐄</span>
                <h2 style={{ fontSize: "17.5px", margin: 0, fontWeight: 800 }}>
                  Censo Reproductivo & Trazabilidad Individual de Vacas
                </h2>
                <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 700 }}>
                  ✓ {censoRodeo.totalVacasAdultas} Vacas Adultas en Base de Datos
                </span>
              </div>
              <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                Distribución del rodeo según lactancia activa, secado, diagnóstico de preñez confirmada y seguimiento individual por número de RP.
              </p>
            </div>
          </div>

          {/* 6 Tarjetas de Distribución del Rodeo */}
          <div className="metricsGrid six" style={{ marginBottom: "20px" }}>
            <div style={{ background: "#f8fafc", border: "1px solid var(--line)", padding: "12px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "var(--slate-500)", fontWeight: 700 }}>TOTAL ADULTAS</div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--slate-900)", marginTop: "2px" }}>
                {censoRodeo.totalVacasAdultas} cab.
              </div>
              <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>Rodeo total tambo</div>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "#166534", fontWeight: 700 }}>EN ORDEÑE (VO)</div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#15803d", marginTop: "2px" }}>
                {censoRodeo.vacasEnOrdenie} VO
              </div>
              <div style={{ fontSize: "10.5px", color: "#166534" }}>
                {Math.round((censoRodeo.vacasEnOrdenie / censoRodeo.totalVacasAdultas) * 100)}% en lactancia
              </div>
            </div>

            <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", padding: "12px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "#b45309", fontWeight: 700 }}>VACAS SECAS</div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#92400e", marginTop: "2px" }}>
                {censoRodeo.vacasSecas} cab.
              </div>
              <div style={{ fontSize: "10.5px", color: "#b45309" }}>Preparto / descanso</div>
            </div>

            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "#1e40af", fontWeight: 700 }}>PREÑADAS CONFIRMADAS</div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#1d4ed8", marginTop: "2px" }}>
                {censoRodeo.vacasPreniadas} cab.
              </div>
              <div style={{ fontSize: "10.5px", color: "#1e40af" }}>
                {Math.round((censoRodeo.vacasPreniadas / censoRodeo.totalVacasAdultas) * 100)}% preñez rodeo
              </div>
            </div>

            <div style={{ background: "#fdf2f8", border: "1px solid #fbcfe8", padding: "12px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "#9d174d", fontWeight: 700 }}>VACÍAS / EN ESPERA</div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#be185d", marginTop: "2px" }}>
                {censoRodeo.vacasVacias} cab.
              </div>
              <div style={{ fontSize: "10.5px", color: "#9d174d" }}>Aptas p/ servicio</div>
            </div>

            <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", padding: "12px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "#475569", fontWeight: 700 }}>VAQUILLONAS REPOSICIÓN</div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#334155", marginTop: "2px" }}>
                {censoRodeo.vaquillonasReposicion} cab.
              </div>
              <div style={{ fontSize: "10.5px", color: "#475569" }}>
                {censoRodeo.vaquillonasPreniadas} preñadas
              </div>
            </div>
          </div>

          {/* Barra de Filtro y Búsqueda por RP */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid var(--line)",
              borderRadius: "8px",
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px" }}>
              <span style={{ fontSize: "16px" }}>🔍</span>
              <input
                type="text"
                placeholder="Buscar vaca por número de caravana o RP (ej: RP-3101)..."
                value={busquedaVacaRP}
                onChange={(e) => {
                  setBusquedaVacaRP(e.target.value);
                  setPaginaVacas(1);
                }}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                className={`ghostButton ${filtroEstadoVaca === "todas" ? "active" : ""}`}
                onClick={() => { setFiltroEstadoVaca("todas"); setPaginaVacas(1); }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: filtroEstadoVaca === "todas" ? "#0f172a" : "#ffffff",
                  color: filtroEstadoVaca === "todas" ? "#ffffff" : "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Todas ({censoRodeo.detalleVacas?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => { setFiltroEstadoVaca("en_ordenie"); setPaginaVacas(1); }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: filtroEstadoVaca === "en_ordenie" ? "#15803d" : "#ffffff",
                  color: filtroEstadoVaca === "en_ordenie" ? "#ffffff" : "#166534",
                  border: "1px solid #86efac",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                En Ordeñe ({censoRodeo.vacasEnOrdenie})
              </button>
              <button
                type="button"
                onClick={() => { setFiltroEstadoVaca("secas"); setPaginaVacas(1); }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: filtroEstadoVaca === "secas" ? "#92400e" : "#ffffff",
                  color: filtroEstadoVaca === "secas" ? "#ffffff" : "#92400e",
                  border: "1px solid #fcd34d",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Secas ({censoRodeo.vacasSecas})
              </button>
              <button
                type="button"
                onClick={() => { setFiltroEstadoVaca("preniadas"); setPaginaVacas(1); }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: filtroEstadoVaca === "preniadas" ? "#1d4ed8" : "#ffffff",
                  color: filtroEstadoVaca === "preniadas" ? "#ffffff" : "#1d4ed8",
                  border: "1px solid #93c5fd",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Preñadas ({censoRodeo.vacasPreniadas})
              </button>
              <button
                type="button"
                onClick={() => { setFiltroEstadoVaca("inseminadas"); setPaginaVacas(1); }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: filtroEstadoVaca === "inseminadas" ? "#d97706" : "#ffffff",
                  color: filtroEstadoVaca === "inseminadas" ? "#ffffff" : "#d97706",
                  border: "1px solid #fcd34d",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Inseminadas ({censoRodeo.detalleVacas?.filter((v) => v.estadoReproductivo === "Inseminada").length || 0})
              </button>
              <button
                type="button"
                onClick={() => { setFiltroEstadoVaca("vacias"); setPaginaVacas(1); }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: filtroEstadoVaca === "vacias" ? "#be185d" : "#ffffff",
                  color: filtroEstadoVaca === "vacias" ? "#ffffff" : "#be185d",
                  border: "1px solid #f9a8d4",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Vacías ({censoRodeo.vacasVacias})
              </button>

              {/* Selector de Criterio de Orden */}
              <div style={{ marginLeft: "8px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-600)" }}>Ordenar:</span>
                <select
                  value={ordenCenso}
                  onChange={(e) => {
                    setOrdenCenso(e.target.value as any);
                    setPaginaVacas(1);
                  }}
                  style={{
                    padding: "5px 10px",
                    fontSize: "12px",
                    fontWeight: 700,
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    cursor: "pointer",
                  }}
                >
                  <option value="rp_asc">🏷️ Caravana / RP (Ascendente)</option>
                  <option value="del_desc">⏱️ Días Lactancia: Mayor a Menor (DEL ↓)</option>
                  <option value="del_asc">⏱️ Días Lactancia: Menor a Mayor (DEL ↑)</option>
                  <option value="litros_desc">🥛 Producción Ayer: Mayor a Menor (Litros ↓)</option>
                  <option value="litros_asc">🥛 Producción Ayer: Menor a Mayor (Litros ↑)</option>
                  <option value="parto_proximo">🤰 Fecha más próxima a parir</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla de Vacas Individuales */}
          <div className="tableWrap" style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <table className="dataTable">
              <thead>
                <tr>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => { setOrdenCenso("rp_asc"); setPaginaVacas(1); }}
                    title="Click para ordenar por Caravana / RP"
                  >
                    Caravana / RP {ordenCenso === "rp_asc" && "▲"}
                  </th>
                  <th>Estado Productivo</th>
                  <th>Estado Reproductivo</th>
                  <th
                    style={{ textAlign: "right", cursor: "pointer", userSelect: "none" }}
                    onClick={() => {
                      setOrdenCenso(ordenCenso === "del_desc" ? "del_asc" : "del_desc");
                      setPaginaVacas(1);
                    }}
                    title="Click para ordenar por DEL (Mayor/Menor)"
                  >
                    Días Lactancia (DEL) {ordenCenso === "del_desc" ? "▼" : ordenCenso === "del_asc" ? "▲" : ""}
                  </th>
                  <th style={{ textAlign: "right" }}>Días Gestación</th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => { setOrdenCenso("parto_proximo"); setPaginaVacas(1); }}
                    title="Click para ordenar por fecha más próxima a parir"
                  >
                    Fecha Estimada Parto {ordenCenso === "parto_proximo" && "★ Próximas"}
                  </th>
                  <th
                    style={{ textAlign: "right", cursor: "pointer", userSelect: "none" }}
                    onClick={() => {
                      setOrdenCenso(ordenCenso === "litros_desc" ? "litros_asc" : "litros_desc");
                      setPaginaVacas(1);
                    }}
                    title="Click para ordenar por Litros (Mayor/Menor)"
                  >
                    Producción Ayer {ordenCenso === "litros_desc" ? "▼" : ordenCenso === "litros_asc" ? "▲" : ""}
                  </th>
                </tr>
              </thead>
              <tbody>
                {vacasPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "20px", color: "var(--slate-500)" }}>
                      No se encontraron vacas con el filtro especificado.
                    </td>
                  </tr>
                ) : (
                  vacasPaginadas.map((v) => (
                    <tr key={v.rp}>
                      <td>
                        <strong style={{ fontSize: "13.5px", color: "var(--slate-900)" }}>
                          🏷️ {v.rp}
                        </strong>
                        {v.grupoDelPro && (
                          <div style={{ fontSize: "10.5px", color: "#2563eb", fontWeight: 600 }}>
                            📍 {v.grupoDelPro}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`pill ${v.estadoProductivo === "En Ordeñe" ? "badgeGreen" : "badgeSlate"}`}
                          style={{ fontSize: "11px", fontWeight: 700 }}
                        >
                          {v.estadoProductivo === "En Ordeñe" ? "🥛 En Ordeñe" : "🍂 Seca"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`pill ${
                            v.estadoReproductivo === "Preñada"
                              ? "badgeBlue"
                              : v.estadoReproductivo === "Inseminada"
                              ? "badgeAmber"
                              : "badgeSlate"
                          }`}
                          style={{ fontSize: "11px", fontWeight: 700 }}
                        >
                          {v.estadoReproductivo === "Preñada"
                            ? "🤰 Preñada"
                            : v.estadoReproductivo === "Inseminada"
                            ? "💉 Inseminada"
                            : "⭕ Vacía"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {v.diasLactancia > 0 ? (
                          <strong>{v.diasLactancia} d</strong>
                        ) : (
                          <span style={{ color: "var(--slate-400)" }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {v.diasGestacion ? (
                          <strong style={{ color: "#1d4ed8" }}>{v.diasGestacion} d</strong>
                        ) : (
                          <span style={{ color: "var(--slate-400)" }}>—</span>
                        )}
                      </td>
                      <td>
                        {v.fechaProbableParto ? (
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#166534" }}>
                            📅 {v.fechaProbableParto}
                          </span>
                        ) : (
                          <span style={{ color: "var(--slate-400)", fontSize: "11px" }}>Sin preñez</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {v.litrosAyer > 0 ? (
                          <strong style={{ color: "#15803d", fontSize: "13.5px" }}>
                            {v.litrosAyer} lts/d
                          </strong>
                        ) : (
                          <span style={{ color: "var(--slate-400)" }}>0.0 lts</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginador */}
          {totalPaginasVacas > 1 && (
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12.5px",
                color: "var(--slate-600)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>
                  Mostrando <strong>{vacasPaginadas.length}</strong> de <strong>{vacasFiltradas.length}</strong> vacas (Página <strong>{paginaValida}</strong> de <strong>{totalPaginasVacas}</strong>)
                </span>
                <span className="pill badgeSlate" style={{ fontSize: "11px", fontWeight: 700 }}>50 por página</span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className="ghostButton"
                  disabled={paginaValida <= 1}
                  onClick={() => setPaginaVacas(paginaValida - 1)}
                  style={{ padding: "4px 10px", fontSize: "12px", cursor: "pointer" }}
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  className="ghostButton"
                  disabled={paginaValida >= totalPaginasVacas}
                  onClick={() => setPaginaVacas(paginaValida + 1)}
                  style={{ padding: "4px 10px", fontSize: "12px", cursor: "pointer" }}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* KPI Cards principales de alimentación */}
      <div className="metricsGrid four">
        <MetricCard
          label="Vacas en Ordeñe"
          value={`${formDieta.vacasEnOrdeñe} VO`}
          note={hasChanges ? "Modificado sin guardar" : "Rodeo activo en ordeño"}
        />
        <MetricCard
          label="Pellet de Soja Tambo"
          value={`${stockPelletSojaKg.toLocaleString("es-AR")} kg`}
          note={
            diasSoja > 0
              ? `${diasSoja} d en VO · ${autoSojaTotal.diasAutonomia} d todo el rodeo (${autoSojaTotal.totalCabezas} cab.)`
              : "Sin stock disponible en Tambo"
          }
        />
        <MetricCard
          label="Silo de Maíz Picado"
          value={`${stockSiloKg.toLocaleString("es-AR")} kg`}
          note={
            diasSilo > 0
              ? `${diasSilo} d en VO · ${autoSiloTotal.diasAutonomia} d todo el rodeo (${autoSiloTotal.totalCabezas} cab.)`
              : "Sin stock cargado"
          }
        />
        <MetricCard
          label="Lotes Forrajeros"
          value="9 lotes"
          note="43 ha asignadas a Tambo"
        />
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN INTERACTIVA: DIETA Y RACIONES DEL RODEO (100% EDITABLE)           */}
      {/* ========================================================================= */}
      <section className="section" style={{ marginTop: "24px" }}>
        <div className="panel" style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }}>🥣</span>
                <h2 style={{ fontSize: "17.5px", margin: 0 }}>
                  Ración Diaria & Dieta Oficial del Rodeo (100% Editable)
                </h2>
              </div>
              <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                Cualquier cambio aquí recalcula automáticamente la duración del stock de forrajes y el panel de <strong>Canje de Pellet en AFA</strong>.
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(22, 163, 74, 0.1)", border: "1px solid rgba(22, 163, 74, 0.3)", padding: "4px 10px", borderRadius: "6px", color: "#166534", marginTop: "6px" }}>
                <span style={{ fontSize: "13px" }}>💵</span>
                <span style={{ fontSize: "12px", fontWeight: 800 }}>
                  Costo Diario Alimentación: ${costoTotalDiaVO.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / VO / día (${costoTotalRodeoDia.toLocaleString("es-AR")}/d rodeo)
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--line)" }}>
              <label style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--slate-800)" }}>
                Vacas en Ordeñe (VO):
              </label>
              <input
                type="number"
                min="1"
                value={formDieta.vacasEnOrdeñe}
                onChange={(e) => {
                  setFormDieta({ ...formDieta, vacasEnOrdeñe: parseInt(e.target.value) || 1 });
                  setHasChanges(true);
                }}
                style={{
                  width: "80px",
                  padding: "5px 8px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontWeight: 800,
                  fontSize: "14px",
                  textAlign: "center",
                }}
              />
              <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>cabezas</span>
            </div>
          </div>

          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th style={{ minWidth: "220px" }}>Alimento / Subproducto</th>
                  <th style={{ width: "150px", textAlign: "right" }}>Ración kg/VO/día</th>
                  <th style={{ width: "160px", textAlign: "right" }}>Consumo Rodeo / Día</th>
                  <th style={{ width: "150px", textAlign: "right", color: "#166534" }}>Costo / VO / Día</th>
                  <th style={{ width: "150px", textAlign: "right" }}>Stock en Tambo</th>
                  <th style={{ width: "160px", textAlign: "center" }}>Autonomía Restante</th>
                  <th style={{ width: "130px", textAlign: "center" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Pellet de Soja Proteico */}
                <tr>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "20px" }}>🥣</span>
                      <div>
                        <strong>Pellet de Soja Proteico (Harina)</strong>
                        <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                          Suplementación proteica en Tambo · Canje AFA
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formDieta.pelletSoja}
                        onChange={(e) => {
                          setFormDieta({ ...formDieta, pelletSoja: parseFloat(e.target.value) || 0 });
                          setHasChanges(true);
                        }}
                        style={{
                          width: "75px",
                          padding: "4px 6px",
                          borderRadius: "4px",
                          border: "1px solid #cbd5e1",
                          fontWeight: 700,
                          textAlign: "right",
                          fontSize: "13px",
                        }}
                      />
                      <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>kg/vaca</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "13.5px" }}>{consumoDiaSoja.toLocaleString("es-AR")} kg/día</strong>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                      {(consumoDiaSoja / 1000).toFixed(2)} Tn/día
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ color: "#166534", fontSize: "13.5px" }}>
                      ${costoDiaVOSoja.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                    <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>
                      ${precioKgSoja.toLocaleString("es-AR", { minimumFractionDigits: 1 })}/kg · ${(Math.round(costoDiaVOSoja * formDieta.vacasEnOrdeñe)).toLocaleString("es-AR")}/d rodeo
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: stockPelletSojaKg > 0 ? "#15803d" : "#64748b" }}>
                      {stockPelletSojaKg.toLocaleString("es-AR")} kg
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                      {(stockPelletSojaKg / 1000).toFixed(2)} Tn disponibles
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {diasSoja > 0 ? (
                      <div>
                        <span className="pill badgeGreen" style={{ fontSize: "12px", fontWeight: 800 }}>
                          ⏱️ {diasSoja} días (VO)
                        </span>
                        <div style={{ fontSize: "10.5px", color: "var(--slate-500)", marginTop: "2px" }} title={autoSojaTotal.textoTooltip}>
                          {autoSojaTotal.diasAutonomia} d todo el rodeo ({autoSojaTotal.totalCabezas} cab.)
                        </div>
                      </div>
                    ) : (
                      <span className="pill badgeAmber" style={{ fontSize: "11px" }}>
                        Sin stock disponible
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Link
                      href="/insumos"
                      className="inlineLink"
                      style={{ fontSize: "12px", fontWeight: 700 }}
                      title="Convertir grano en pellet en AFA"
                    >
                      🔄 Canje AFA →
                    </Link>
                  </td>
                </tr>

                {/* 2. Pellet de Trigo */}
                <tr>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "20px" }}>🌾</span>
                      <div>
                        <strong>Pellet de Trigo (Afrechillo)</strong>
                        <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                          Subproducto de molienda de trigo · Tambo
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formDieta.pelletTrigo}
                        onChange={(e) => {
                          setFormDieta({ ...formDieta, pelletTrigo: parseFloat(e.target.value) || 0 });
                          setHasChanges(true);
                        }}
                        style={{
                          width: "75px",
                          padding: "4px 6px",
                          borderRadius: "4px",
                          border: "1px solid #cbd5e1",
                          fontWeight: 700,
                          textAlign: "right",
                          fontSize: "13px",
                        }}
                      />
                      <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>kg/vaca</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "13.5px" }}>{consumoDiaTrigo.toLocaleString("es-AR")} kg/día</strong>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                      {(consumoDiaTrigo / 1000).toFixed(2)} Tn/día
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ color: "#166534", fontSize: "13.5px" }}>
                      ${costoDiaVOTrigo.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                    <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>
                      ${precioKgTrigo.toLocaleString("es-AR", { minimumFractionDigits: 1 })}/kg · ${(Math.round(costoDiaVOTrigo * formDieta.vacasEnOrdeñe)).toLocaleString("es-AR")}/d rodeo
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: stockPelletTrigoKg > 0 ? "#15803d" : "#64748b" }}>
                      {stockPelletTrigoKg.toLocaleString("es-AR")} kg
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                      {(stockPelletTrigoKg / 1000).toFixed(2)} Tn disponibles
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {diasTrigo > 0 ? (
                      <span className="pill badgeGreen" style={{ fontSize: "12px", fontWeight: 800 }}>
                        ⏱️ {diasTrigo} días de stock
                      </span>
                    ) : (
                      <span className="pill badgeSlate" style={{ fontSize: "11px" }}>
                        Sin existencias
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Link
                      href="/insumos"
                      className="inlineLink"
                      style={{ fontSize: "12px", fontWeight: 700 }}
                    >
                      Ver stock →
                    </Link>
                  </td>
                </tr>

                {/* 3. Silo de Maíz */}
                <tr>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "20px" }}>🌽</span>
                      <div>
                        <strong>Silo de Maíz Picado Fino (Bolsa)</strong>
                        <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                          Base forrajera principal de fibra y energía en Tambo
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={formDieta.siloMaiz}
                        onChange={(e) => {
                          setFormDieta({ ...formDieta, siloMaiz: parseFloat(e.target.value) || 0 });
                          setHasChanges(true);
                        }}
                        style={{
                          width: "75px",
                          padding: "4px 6px",
                          borderRadius: "4px",
                          border: "1px solid #cbd5e1",
                          fontWeight: 700,
                          textAlign: "right",
                          fontSize: "13px",
                        }}
                      />
                      <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>kg/vaca</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "13.5px" }}>{consumoDiaSilo.toLocaleString("es-AR")} kg/día</strong>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                      {(consumoDiaSilo / 1000).toFixed(2)} Tn/día
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ color: "#166534", fontSize: "13.5px" }}>
                      ${costoDiaVOSilo.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                    <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>
                      ${precioKgSilo.toLocaleString("es-AR", { minimumFractionDigits: 1 })}/kg · ${(Math.round(costoDiaVOSilo * formDieta.vacasEnOrdeñe)).toLocaleString("es-AR")}/d rodeo
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: stockSiloKg > 0 ? "#15803d" : "#64748b" }}>
                      {stockSiloKg.toLocaleString("es-AR")} kg
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                      {(stockSiloKg / 1000).toFixed(2)} Tn disponibles
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {diasSilo > 0 ? (
                      <div>
                        <span className="pill badgeGreen" style={{ fontSize: "12px", fontWeight: 800 }}>
                          ⏱️ {diasSilo} días (VO)
                        </span>
                        <div style={{ fontSize: "10.5px", color: "var(--slate-500)", marginTop: "2px" }} title={autoSiloTotal.textoTooltip}>
                          {autoSiloTotal.diasAutonomia} d todo el rodeo ({autoSiloTotal.totalCabezas} cab.)
                        </div>
                      </div>
                    ) : (
                      <span className="pill badgeAmber" style={{ fontSize: "11px" }}>
                        Confeccionar silo
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="pill badgeGreen" style={{ fontSize: "11px" }}>
                      43 ha Tambo
                    </span>
                  </td>
                </tr>

                {/* 4. Maíz Grano Molido */}
                <tr>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "20px" }}>⚡</span>
                      <div>
                        <strong>Maíz Grano Seco Molido / Quebrado</strong>
                        <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                          Aporte de almidón y energía para producción de leche
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formDieta.maiz}
                        onChange={(e) => {
                          setFormDieta({ ...formDieta, maiz: parseFloat(e.target.value) || 0 });
                          setHasChanges(true);
                        }}
                        style={{
                          width: "75px",
                          padding: "4px 6px",
                          borderRadius: "4px",
                          border: "1px solid #cbd5e1",
                          fontWeight: 700,
                          textAlign: "right",
                          fontSize: "13px",
                        }}
                      />
                      <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>kg/vaca</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "13.5px" }}>
                      {(Math.round(formDieta.vacasEnOrdeñe * formDieta.maiz * 10) / 10).toLocaleString("es-AR")} kg/día
                    </strong>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                      {((formDieta.vacasEnOrdeñe * formDieta.maiz) / 1000).toFixed(2)} Tn/día
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ color: "#166534", fontSize: "13.5px" }}>
                      ${costoDiaVOMaiz.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                    <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>
                      ${precioKgMaiz.toLocaleString("es-AR", { minimumFractionDigits: 1 })}/kg · ${(Math.round(costoDiaVOMaiz * formDieta.vacasEnOrdeñe)).toLocaleString("es-AR")}/d rodeo
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "13px", color: "var(--slate-600)" }}>
                      Acopio propio / AFA
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="pill badgeBlue" style={{ fontSize: "11px" }}>
                      Conectado a silos
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Link href="/insumos" className="inlineLink" style={{ fontSize: "12px", fontWeight: 700 }}>
                      Ver granos →
                    </Link>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                  <td>TOTALES RACIÓN RODEO</td>
                  <td style={{ textAlign: "right" }}>
                    {(formDieta.pelletSoja + formDieta.pelletTrigo + formDieta.siloMaiz + formDieta.maiz).toFixed(1)} kg/VO
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {((formDieta.pelletSoja + formDieta.pelletTrigo + formDieta.siloMaiz + formDieta.maiz) * formDieta.vacasEnOrdeñe / 1000).toFixed(2)} Tn/d
                  </td>
                  <td style={{ textAlign: "right", color: "#166534", fontSize: "14px", fontWeight: 900 }}>
                    ${costoTotalDiaVO.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <div style={{ fontSize: "10.5px", color: "var(--slate-600)", fontWeight: 600 }}>/ VO / día</div>
                  </td>
                  <td style={{ textAlign: "right" }}>—</td>
                  <td style={{ textAlign: "center" }}>—</td>
                  <td style={{ textAlign: "center" }}>—</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "12.5px", color: "#166534" }}>
              💡 <strong>Sincronización activa:</strong> Al guardar, la cantidad de vacas y las raciones se aplican automáticamente a los módulos de <strong>Insumos</strong>, <strong>Canje en AFA Los Cardos</strong> y control de stock.
            </div>

            <button
              type="button"
              className="primaryButton"
              onClick={() => handleGuardarDieta()}
              disabled={!hasChanges}
              style={{
                background: hasChanges ? "#15803d" : "var(--slate-400)",
                borderColor: hasChanges ? "#15803d" : "var(--slate-400)",
                padding: "8px 16px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              💾 Guardar Cambios en Dieta
            </button>
          </div>
        </div>
      </section>

      {/* Módulos restantes del Tambo */}
      <section className="section" style={{ marginTop: "24px" }}>
        <div className="sectionTitle">
          <div>
            <h2>Módulos Operativos del Tambo</h2>
            <p className="muted">Estructura operativa en desarrollo para Tambo HJB.</p>
          </div>
        </div>

        <div className="gridThree">
          <div className="pillarCard" style={{ borderColor: "#86efac", background: "#f0fdf4" }}>
            <div className="pillarIcon">🥛</div>
            <h3>Producción y Calidad</h3>
            <p>Medición continua de leche en caudalímetros y tanque central mediante SQL Server DelPro.</p>
            <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 700 }}>
              ✓ Conectado a DelPro ({delproConfig.datosSincronizados.litrosTotalesDia.toLocaleString("es-AR")} lts/d)
            </span>
          </div>

          <div className="pillarCard" style={{ borderColor: "#86efac", background: "#f0fdf4" }}>
            <div className="pillarIcon">🐄</div>
            <h3>Rodeo y Sanidad</h3>
            <p>Control de vacas en ordeñe ({delproConfig.datosSincronizados.vacasEnOrdeñe} VO), secas, partos e historial sanitario.</p>
            <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 700 }}>
              ✓ Conectado a DelPro ({delproConfig.datosSincronizados.partosRecientes?.length || 0} partos)
            </span>
          </div>

          <div className="pillarCard" style={{ borderColor: "#86efac", background: "#f0fdf4" }}>
            <div className="pillarIcon">🌱</div>
            <h3>Alimentación y Forrajes</h3>
            <p>Dieta diaria sincronizada, ración, silo de maíz, pellets proteicos en AFA y balance de reservas.</p>
            <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 700 }}>
              ✓ Activo y Sincronizado
            </span>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
