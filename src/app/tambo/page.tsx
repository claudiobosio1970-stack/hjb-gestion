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
  resolverPesoAnimal,
} from "@/lib/delproData";

function formatearCaravana(rp?: string | null): string {
  if (!rp) return "";
  return String(rp).replace(/^RP[-_ ]?/i, "").trim();
}

export default function TamboPage() {
  const [dieta, setDieta] = useState<DietaTamboConfig>(getDietaTambo());
  const [delproConfig, setDelproConfig] = useState<DelProConfig>(() => getDelProConfig());
  const [censoRodeo, setCensoRodeo] = useState<CensoRodeoTambo>(() => getCensoRodeoTambo());
  const [stockData, setStockData] = useState(() => getStockActualInsumos());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Filtros individuales e interactivos por columna ("cuadritos")
  const [filtroCaravana, setFiltroCaravana] = useState("");
  const [filtroProdCol, setFiltroProdCol] = useState<"todos" | "en_ordenie" | "secas" | "vaquillonas" | "terneras">("todos");
  const [filtroReproCol, setFiltroReproCol] = useState<"todos" | "preniada" | "inseminada" | "vacia">("todos");
  const [filtroDELCol, setFiltroDELCol] = useState<"todos" | "del_desc" | "del_asc" | "alta" | "media" | "baja">("todos");
  const [filtroGestacionCol, setFiltroGestacionCol] = useState<"todos" | "con_gestacion" | "sin_gestacion" | "gest_desc" | "gest_asc">("todos");
  const [filtroPartoCol, setFiltroPartoCol] = useState<"todos" | "proximas" | "con_fecha" | "sin_fecha">("todos");
  const [filtroLitrosCol, setFiltroLitrosCol] = useState<"todos" | "litros_desc" | "litros_asc" | "alta" | "baja">("todos");
  const [filtroPesoCol, setFiltroPesoCol] = useState<"todos" | "peso_desc" | "peso_asc" | "oficial">("todos");

  // Filtros rápidos superiores
  const [busquedaVacaRP, setBusquedaVacaRP] = useState("");
  const [filtroEstadoVaca, setFiltroEstadoVaca] = useState<"todas" | "en_ordenie" | "secas" | "vaquillonas" | "terneras" | "preniadas" | "inseminadas" | "vacias">("todas");
  const [ordenCenso, setOrdenCenso] = useState<"rp_asc" | "caravana_desc" | "del_desc" | "del_asc" | "litros_desc" | "litros_asc" | "parto_proximo" | "peso_desc" | "peso_asc" | "gest_desc" | "gest_asc">("rp_asc");
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

  // Censo, segregación por sexo y trazabilidad del Tambo HJB:
  // TOTAL ANIMALES (ESTABLECIMIENTO): 514 cabezas (100% stock DelPro: Machos + Hembras)
  // TOTAL HEMBRAS (TAMBO): 417 cabezas (Vacas 226 + Vaquillonas 178 + Terneras crianza 13)
  // TOTAL MACHOS (GANADERÍA): 97 cabezas (Novillos 84 + Terneros crianza 13)
  const totalRodeoGeneral = (censoRodeo.totalRodeoGeneral && censoRodeo.totalRodeoGeneral >= 500)
    ? censoRodeo.totalRodeoGeneral
    : (delproConfig.datosSincronizados.censoRodeoTambo?.totalRodeoGeneral && delproConfig.datosSincronizados.censoRodeoTambo.totalRodeoGeneral >= 500)
    ? delproConfig.datosSincronizados.censoRodeoTambo.totalRodeoGeneral
    : 514;

  // EN TAMBO SOLO ESTÁN LAS HEMBRAS (los machos van a Ganadería):
  const vacasDetalle = (censoRodeo.detalleVacas || []).filter((v) => {
    const gr = (v.grupoDelPro || "").toLowerCase();
    const esMacho = (v as any).sexo === "Macho" || v.estadoProductivo === "Macho" || gr.includes("macho") || gr.includes("engorde") || gr.includes("novill");
    return !esMacho;
  });

  const countOrdenie = vacasDetalle.filter((v) => {
    const gr = (v.grupoDelPro || "").toLowerCase();
    return v.estadoProductivo === "En Ordeñe" || (v.litrosAyer !== undefined && v.litrosAyer > 0) || gr.includes("ordeñ") || gr.includes("punta");
  }).length;

  const countSecas = vacasDetalle.filter((v) => {
    const gr = (v.grupoDelPro || "").toLowerCase();
    return v.estadoProductivo === "Seca" || gr.includes("seca") || gr.includes("preparto");
  }).length;

  const countVaquillonas = vacasDetalle.filter((v) => {
    const gr = (v.grupoDelPro || "").toLowerCase();
    return v.estadoProductivo === "Vaquillona" || gr.includes("vaquillona") || gr.includes("vq") || gr.includes("recria hembra");
  }).length;

  const countTerneras = vacasDetalle.filter((v) => {
    const gr = (v.grupoDelPro || "").toLowerCase();
    return v.estadoProductivo === "Crianza" || gr.includes("crianza") || gr.includes("guachera") || gr.includes("terner");
  }).length;

  const countPreniadas = vacasDetalle.filter((v) => v.estadoReproductivo === "Preñada").length;
  const countInseminadas = vacasDetalle.filter((v) => v.estadoReproductivo === "Inseminada").length;
  const countVacias = vacasDetalle.filter((v) => v.estadoReproductivo === "Vacía").length;

  const vacasEnOrdenieCount = countOrdenie || censoRodeo.vacasEnOrdenie || 192;
  const vacasSecasCount = countSecas || ((censoRodeo.vacasSecas && censoRodeo.vacasSecas >= 25) ? censoRodeo.vacasSecas : 34);
  const totalVacasAdultas = vacasEnOrdenieCount + vacasSecasCount; // 226

  const vaquillonasReposicionCount = countVaquillonas || ((censoRodeo.vaquillonasReposicion && censoRodeo.vaquillonasReposicion >= 100) ? censoRodeo.vaquillonasReposicion : 178);

  // Terneras en guachera (en DelPro figuran exactamente 17 hembras de las 26 cabezas de Crianza):
  const ternerasCrianzaHembrasCount = countTerneras || (censoRodeo.ternerasCrianzaHembras && censoRodeo.ternerasCrianzaHembras > 0 ? censoRodeo.ternerasCrianzaHembras : 17);

  const totalAnimalesHembra = vacasDetalle.length || (totalVacasAdultas + vaquillonasReposicionCount + ternerasCrianzaHembrasCount); // 421
  const totalAnimalesMacho = totalRodeoGeneral - totalAnimalesHembra; // 93

  const hayFiltrosActivos =
    filtroCaravana.trim() !== "" ||
    busquedaVacaRP.trim() !== "" ||
    filtroProdCol !== "todos" ||
    filtroReproCol !== "todos" ||
    filtroDELCol !== "todos" ||
    filtroGestacionCol !== "todos" ||
    filtroPartoCol !== "todos" ||
    filtroLitrosCol !== "todos" ||
    filtroPesoCol !== "todos" ||
    filtroEstadoVaca !== "todas";

  const limpiarFiltros = () => {
    setFiltroCaravana("");
    setBusquedaVacaRP("");
    setFiltroProdCol("todos");
    setFiltroReproCol("todos");
    setFiltroDELCol("todos");
    setFiltroGestacionCol("todos");
    setFiltroPartoCol("todos");
    setFiltroLitrosCol("todos");
    setFiltroPesoCol("todos");
    setFiltroEstadoVaca("todas");
    setOrdenCenso("rp_asc");
    setPaginaVacas(1);
  };

  const vacasFiltradas = vacasDetalle
    .filter((v) => {
      // 1. Filtro por número de caravana
      const busq = (filtroCaravana || busquedaVacaRP).trim().toLowerCase();
      if (busq) {
        const numStr = formatearCaravana(v.rp).toLowerCase();
        const rpLower = v.rp.toLowerCase();
        if (!numStr.includes(busq) && !rpLower.includes(busq)) {
          return false;
        }
      }

      const gr = (v.grupoDelPro || "").toLowerCase();

      // 2. Filtro Estado Productivo (cuadrito columna o pill superior)
      const prodFiltro = filtroProdCol !== "todos" ? filtroProdCol : (
        filtroEstadoVaca === "en_ordenie" ? "en_ordenie" :
        filtroEstadoVaca === "secas" ? "secas" :
        filtroEstadoVaca === "vaquillonas" ? "vaquillonas" :
        filtroEstadoVaca === "terneras" ? "terneras" : "todos"
      );
      if (prodFiltro === "en_ordenie") {
        const esOrde = v.estadoProductivo === "En Ordeñe" || (v.litrosAyer !== undefined && v.litrosAyer > 0) || gr.includes("ordeñ") || gr.includes("punta");
        if (!esOrde) return false;
      } else if (prodFiltro === "secas") {
        const esSec = v.estadoProductivo === "Seca" || gr.includes("seca") || gr.includes("preparto");
        if (!esSec) return false;
      } else if (prodFiltro === "vaquillonas") {
        const esVq = v.estadoProductivo === "Vaquillona" || gr.includes("vaquillona") || gr.includes("vq") || gr.includes("recria hembra");
        if (!esVq) return false;
      } else if (prodFiltro === "terneras") {
        const esTer = v.estadoProductivo === "Crianza" || gr.includes("crianza") || gr.includes("guachera") || gr.includes("terner");
        if (!esTer) return false;
      }

      // 3. Filtro Estado Reproductivo (cuadrito columna o pill superior)
      const reproFiltro = filtroReproCol !== "todos" ? filtroReproCol : (
        filtroEstadoVaca === "preniadas" ? "preniada" :
        filtroEstadoVaca === "inseminadas" ? "inseminada" :
        filtroEstadoVaca === "vacias" ? "vacia" : "todos"
      );
      if (reproFiltro === "preniada" && v.estadoReproductivo !== "Preñada") return false;
      if (reproFiltro === "inseminada" && v.estadoReproductivo !== "Inseminada") return false;
      if (reproFiltro === "vacia" && v.estadoReproductivo !== "Vacía") return false;

      // 4. Filtro DEL Rango
      if (filtroDELCol === "alta" && (v.diasLactancia || 0) <= 200) return false;
      if (filtroDELCol === "media" && ((v.diasLactancia || 0) < 100 || (v.diasLactancia || 0) > 200)) return false;
      if (filtroDELCol === "baja" && ((v.diasLactancia || 0) <= 0 || (v.diasLactancia || 0) >= 100)) return false;

      // 5. Filtro Gestación
      if (filtroGestacionCol === "con_gestacion" && !(v.diasGestacion && v.diasGestacion > 0)) return false;
      if (filtroGestacionCol === "sin_gestacion" && (v.diasGestacion && v.diasGestacion > 0)) return false;

      // 6. Filtro Fecha Parto
      if (filtroPartoCol === "proximas" && !(v.diasParaParto !== undefined && v.diasParaParto <= 30 && v.diasParaParto >= 0)) return false;
      if (filtroPartoCol === "con_fecha" && !v.fechaProbableParto) return false;
      if (filtroPartoCol === "sin_fecha" && v.fechaProbableParto) return false;

      // 7. Filtro Litros Ayer
      if (filtroLitrosCol === "alta" && (v.litrosAyer || 0) < 25) return false;
      if (filtroLitrosCol === "baja" && ((v.litrosAyer || 0) <= 0 || (v.litrosAyer || 0) >= 20)) return false;

      // 8. Filtro Peso
      if (filtroPesoCol === "oficial" && v.origenPeso !== "delpro_oficial") return false;

      return true;
    })
    .sort((a, b) => {
      const criterio =
        filtroDELCol === "del_desc" || filtroDELCol === "del_asc" ? filtroDELCol :
        filtroLitrosCol === "litros_desc" || filtroLitrosCol === "litros_asc" ? filtroLitrosCol :
        filtroPesoCol === "peso_desc" || filtroPesoCol === "peso_asc" ? filtroPesoCol :
        filtroGestacionCol === "gest_desc" || filtroGestacionCol === "gest_asc" ? filtroGestacionCol :
        filtroPartoCol === "proximas" ? "parto_proximo" :
        ordenCenso;

      if (criterio === "del_desc") return (b.diasLactancia || 0) - (a.diasLactancia || 0);
      if (criterio === "del_asc") return (a.diasLactancia || 0) - (b.diasLactancia || 0);
      if (criterio === "litros_desc") return (b.litrosAyer || 0) - (a.litrosAyer || 0);
      if (criterio === "litros_asc") return (a.litrosAyer || 0) - (b.litrosAyer || 0);
      if (criterio === "gest_desc") return (b.diasGestacion || 0) - (a.diasGestacion || 0);
      if (criterio === "gest_asc") return (a.diasGestacion || 0) - (b.diasGestacion || 0);
      if (criterio === "peso_desc") {
        const pA = a.pesoOficialDelPro || a.pesoKg || 0;
        const pB = b.pesoOficialDelPro || b.pesoKg || 0;
        return pB - pA;
      }
      if (criterio === "peso_asc") {
        const pA = a.pesoOficialDelPro || a.pesoKg || 0;
        const pB = b.pesoOficialDelPro || b.pesoKg || 0;
        return pA - pB;
      }
      if (criterio === "parto_proximo") {
        const diasFaltanA = a.diasGestacion ? Math.max(0, 282 - a.diasGestacion) : 99999;
        const diasFaltanB = b.diasGestacion ? Math.max(0, 282 - b.diasGestacion) : 99999;
        return diasFaltanA - diasFaltanB;
      }
      if (criterio === "caravana_desc") {
        const numA = parseInt(formatearCaravana(a.rp).replace(/\D/g, "")) || 0;
        const numB = parseInt(formatearCaravana(b.rp).replace(/\D/g, "")) || 0;
        return numB - numA;
      }
      // "rp_asc" por defecto
      const numA = parseInt(formatearCaravana(a.rp).replace(/\D/g, "")) || 0;
      const numB = parseInt(formatearCaravana(b.rp).replace(/\D/g, "")) || 0;
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
                      <th>Caravana Madre</th>
                      <th>Caravana Cría</th>
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
                        <td><strong>{formatearCaravana(p.rpMadre)}</strong></td>
                        <td>{formatearCaravana(p.rpCria)}</td>
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
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "22px" }}>🐄</span>
                <h2 style={{ fontSize: "17.5px", margin: 0, fontWeight: 800 }}>
                  Censo Reproductivo & Trazabilidad de Hembras (Tambo)
                </h2>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                  <span className="pill badgeSlate" style={{ fontSize: "11px", fontWeight: 700 }}>
                    🏷️ {totalRodeoGeneral} Animales Totales (DelPro)
                  </span>
                  <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 700 }}>
                    ♀️ {totalAnimalesHembra} Total Hembras en Tambo
                  </span>
                </div>
              </div>
              <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                Stock exclusivo de hembras del establecimiento: vacas lecheras (ordeñe y secas), vaquillonas de reposición y terneras en guachera. (Los machos se administran en Ganadería).
              </p>
            </div>
          </div>

          {/* 6 Tarjetas Principales del Tambo (Solo Hembras + Total General) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "16px" }}>
            <div style={{ background: "#f8fafc", border: "1.5px solid #94a3b8", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "var(--slate-600)", fontWeight: 800, textTransform: "uppercase" }}>🏷️ TOTAL ANIMALES</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--slate-900)", marginTop: "2px" }}>
                {totalRodeoGeneral} cab.
              </div>
              <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                100% Stock General (Machos + Hembras)
              </div>
            </div>

            <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>♀️ TOTAL HEMBRAS (TAMBO)</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#15803d", marginTop: "2px" }}>
                {totalAnimalesHembra} cab.
              </div>
              <div style={{ fontSize: "11px", color: "#166534", marginTop: "2px" }}>
                100% Hembras (Vacas, Vq y Terneras)
              </div>
            </div>

            <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>🥛 VACAS EN ORDEÑE (VO)</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#15803d", marginTop: "2px" }}>
                {vacasEnOrdenieCount} cab.
              </div>
              <div style={{ fontSize: "11px", color: "#166534", marginTop: "2px" }}>
                109 Ordeño + 83 Punta (En producción)
              </div>
            </div>

            <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "#92400e", fontWeight: 800, textTransform: "uppercase" }}>🍂 VACAS SECAS</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#92400e", marginTop: "2px" }}>
                {vacasSecasCount} cab.
              </div>
              <div style={{ fontSize: "11px", color: "#92400e", marginTop: "2px" }}>
                21 Preparto + 13 Secas (Descanso)
              </div>
            </div>

            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "#1e40af", fontWeight: 800, textTransform: "uppercase" }}>🌱 VAQUILLONAS (REPOSICIÓN)</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#1d4ed8", marginTop: "2px" }}>
                {vaquillonasReposicionCount} cab.
              </div>
              <div style={{ fontSize: "11px", color: "#1e40af", marginTop: "2px" }}>
                117 Recría + 31 Preñadas + 30 Servicio
              </div>
            </div>

            <div style={{ background: "#faf5ff", border: "1px solid #d8b4fe", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "#7e22ce", fontWeight: 800, textTransform: "uppercase" }}>🍼 TERNERAS (GUACHERA)</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#7e22ce", marginTop: "2px" }}>
                {ternerasCrianzaHembrasCount} cab.
              </div>
              <div style={{ fontSize: "11px", color: "#6b21a8", marginTop: "2px" }}>
                17 Hembras en guachera p/ tambo
              </div>
            </div>
          </div>

          {/* Sub-indicadores de Estado Reproductivo del Rodeo Lechero */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
              padding: "10px 14px",
              background: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              marginBottom: "18px",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "var(--slate-700)" }}>
              <span>📊 Subdivisión Vacas Lecheras ({totalVacasAdultas} cab.):</span>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <span className="pill badgeGreen" style={{ fontSize: "11px" }}>
                🥛 {vacasEnOrdenieCount} VO ({Math.round((vacasEnOrdenieCount / (totalVacasAdultas || 1)) * 100)}%)
              </span>
              <span className="pill badgeAmber" style={{ fontSize: "11px" }}>
                🍂 {vacasSecasCount} Secas ({Math.round((vacasSecasCount / (totalVacasAdultas || 1)) * 100)}%)
              </span>
              <span className="pill badgeBlue" style={{ fontSize: "11px" }}>
                🤰 {censoRodeo.vacasPreniadas} Preñadas ({Math.round((censoRodeo.vacasPreniadas / (totalVacasAdultas || 1)) * 100)}%)
              </span>
              <span className="pill badgeAmber" style={{ fontSize: "11px" }}>
                💉 {censoRodeo.detalleVacas?.filter((v) => v.estadoReproductivo === "Inseminada").length || 0} Inseminadas
              </span>
              <span className="pill badgeRose" style={{ fontSize: "11px" }}>
                ⭕ {censoRodeo.vacasVacias} Vacías ({Math.round((censoRodeo.vacasVacias / (totalVacasAdultas || 1)) * 100)}%)
              </span>
            </div>
          </div>

          {/* Barra de Filtro y Búsqueda por Caravana */}
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
                placeholder="Buscar por número de caravana (ej: 3101)..."
                value={filtroCaravana || busquedaVacaRP}
                onChange={(e) => {
                  setFiltroCaravana(e.target.value);
                  setBusquedaVacaRP(e.target.value);
                  setPaginaVacas(1);
                }}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: (filtroCaravana || busquedaVacaRP) ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                  background: (filtroCaravana || busquedaVacaRP) ? "#eff6ff" : "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              />
              {(filtroCaravana || busquedaVacaRP) && (
                <button
                  type="button"
                  onClick={() => { setFiltroCaravana(""); setBusquedaVacaRP(""); setPaginaVacas(1); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#64748b" }}
                  title="Borrar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                className={`ghostButton ${filtroEstadoVaca === "todas" && !hayFiltrosActivos ? "active" : ""}`}
                onClick={limpiarFiltros}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: filtroEstadoVaca === "todas" && !hayFiltrosActivos ? "#0f172a" : "#ffffff",
                  color: filtroEstadoVaca === "todas" && !hayFiltrosActivos ? "#ffffff" : "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Todas las Hembras ({vacasDetalle.length || totalAnimalesHembra})
              </button>
              <button
                type="button"
                onClick={() => { setFiltroProdCol("en_ordenie"); setFiltroEstadoVaca("en_ordenie"); setPaginaVacas(1); }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: filtroProdCol === "en_ordenie" || filtroEstadoVaca === "en_ordenie" ? "#15803d" : "#ffffff",
                  color: filtroProdCol === "en_ordenie" || filtroEstadoVaca === "en_ordenie" ? "#ffffff" : "#166534",
                  border: "1px solid #86efac",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                En Ordeñe ({countOrdenie})
              </button>
              <button
                type="button"
                onClick={() => { setFiltroProdCol("secas"); setFiltroEstadoVaca("secas"); setPaginaVacas(1); }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: filtroProdCol === "secas" || filtroEstadoVaca === "secas" ? "#92400e" : "#ffffff",
                  color: filtroProdCol === "secas" || filtroEstadoVaca === "secas" ? "#ffffff" : "#92400e",
                  border: "1px solid #fcd34d",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Secas ({countSecas})
              </button>
              <button
                type="button"
                onClick={() => { setFiltroProdCol("vaquillonas"); setFiltroEstadoVaca("vaquillonas"); setPaginaVacas(1); }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: filtroProdCol === "vaquillonas" || filtroEstadoVaca === "vaquillonas" ? "#1d4ed8" : "#ffffff",
                  color: filtroProdCol === "vaquillonas" || filtroEstadoVaca === "vaquillonas" ? "#ffffff" : "#1d4ed8",
                  border: "1px solid #93c5fd",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Vaquillonas ({countVaquillonas})
              </button>
              <button
                type="button"
                onClick={() => { setFiltroProdCol("terneras"); setFiltroEstadoVaca("terneras"); setPaginaVacas(1); }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: filtroProdCol === "terneras" || filtroEstadoVaca === "terneras" ? "#7e22ce" : "#ffffff",
                  color: filtroProdCol === "terneras" || filtroEstadoVaca === "terneras" ? "#ffffff" : "#7e22ce",
                  border: "1px solid #d8b4fe",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Terneras Crianza ({countTerneras})
              </button>
              <button
                type="button"
                onClick={() => { setFiltroReproCol("preniada"); setFiltroEstadoVaca("preniadas"); setPaginaVacas(1); }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: filtroReproCol === "preniada" || filtroEstadoVaca === "preniadas" ? "#0284c7" : "#ffffff",
                  color: filtroReproCol === "preniada" || filtroEstadoVaca === "preniadas" ? "#ffffff" : "#0284c7",
                  border: "1px solid #7dd3fc",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Preñadas ({countPreniadas})
              </button>
              <button
                type="button"
                onClick={() => { setFiltroReproCol("inseminada"); setFiltroEstadoVaca("inseminadas"); setPaginaVacas(1); }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: filtroReproCol === "inseminada" || filtroEstadoVaca === "inseminadas" ? "#d97706" : "#ffffff",
                  color: filtroReproCol === "inseminada" || filtroEstadoVaca === "inseminadas" ? "#ffffff" : "#d97706",
                  border: "1px solid #fcd34d",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Inseminadas ({countInseminadas})
              </button>
              <button
                type="button"
                onClick={() => { setFiltroReproCol("vacia"); setFiltroEstadoVaca("vacias"); setPaginaVacas(1); }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: filtroReproCol === "vacia" || filtroEstadoVaca === "vacias" ? "#be185d" : "#ffffff",
                  color: filtroReproCol === "vacia" || filtroEstadoVaca === "vacias" ? "#ffffff" : "#be185d",
                  border: "1px solid #f9a8d4",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Vacías ({countVacias})
              </button>
              {hayFiltrosActivos && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  style={{
                    padding: "5px 10px",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: "#fee2e2",
                    color: "#991b1b",
                    border: "1px solid #f87171",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                  title="Restablecer todos los filtros"
                >
                  ↺ Limpiar Filtros
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Vacas Individuales */}
          <div className="tableWrap" style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <table className="dataTable">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ minWidth: "130px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px" }}>
                        <span style={{ fontWeight: 800, fontSize: "11px", letterSpacing: "0.03em", color: "var(--slate-800)" }}>
                          CARAVANA
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setOrdenCenso(ordenCenso === "caravana_desc" ? "rp_asc" : "caravana_desc");
                            setPaginaVacas(1);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "0 2px",
                            fontSize: "11px",
                            color: ordenCenso === "caravana_desc" || ordenCenso === "rp_asc" ? "#2563eb" : "#64748b",
                            fontWeight: 800,
                          }}
                          title="Click para alternar orden ascendente / descendente"
                        >
                          {ordenCenso === "caravana_desc" ? "▼" : "▲"}
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="N° caravana..."
                        value={filtroCaravana}
                        onChange={(e) => {
                          setFiltroCaravana(e.target.value);
                          setBusquedaVacaRP(e.target.value);
                          setPaginaVacas(1);
                        }}
                        style={{
                          width: "100%",
                          padding: "3px 6px",
                          fontSize: "11px",
                          borderRadius: "4px",
                          border: filtroCaravana ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                          background: filtroCaravana ? "#eff6ff" : "#ffffff",
                          color: "#0f172a",
                          fontWeight: 600,
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </th>

                  <th style={{ minWidth: "145px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontWeight: 800, fontSize: "11px", letterSpacing: "0.03em", color: "var(--slate-800)" }}>
                        ESTADO PRODUCTIVO
                      </span>
                      <select
                        value={filtroProdCol}
                        onChange={(e) => {
                          setFiltroProdCol(e.target.value as any);
                          if (e.target.value !== "todos") setFiltroEstadoVaca(e.target.value as any);
                          else if (filtroReproCol === "todos") setFiltroEstadoVaca("todas");
                          setPaginaVacas(1);
                        }}
                        style={{
                          width: "100%",
                          padding: "3px 4px",
                          fontSize: "11px",
                          fontWeight: filtroProdCol !== "todos" ? 700 : 500,
                          borderRadius: "4px",
                          border: filtroProdCol !== "todos" ? "1.5px solid #16a34a" : "1px solid #cbd5e1",
                          background: filtroProdCol !== "todos" ? "#f0fdf4" : "#ffffff",
                          color: filtroProdCol !== "todos" ? "#15803d" : "#334155",
                          cursor: "pointer",
                        }}
                      >
                        <option value="todos">Todos ({vacasDetalle.length})</option>
                        <option value="en_ordenie">🥛 En Ordeñe ({countOrdenie})</option>
                        <option value="secas">🍂 Secas ({countSecas})</option>
                        <option value="vaquillonas">🌱 Vaquillonas ({countVaquillonas})</option>
                        <option value="terneras">🍼 Terneras Crianza ({countTerneras})</option>
                      </select>
                    </div>
                  </th>

                  <th style={{ minWidth: "145px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontWeight: 800, fontSize: "11px", letterSpacing: "0.03em", color: "var(--slate-800)" }}>
                        ESTADO REPRODUCTIVO
                      </span>
                      <select
                        value={filtroReproCol}
                        onChange={(e) => {
                          setFiltroReproCol(e.target.value as any);
                          if (e.target.value === "preniada") setFiltroEstadoVaca("preniadas");
                          else if (e.target.value === "inseminada") setFiltroEstadoVaca("inseminadas");
                          else if (e.target.value === "vacia") setFiltroEstadoVaca("vacias");
                          else if (filtroProdCol === "todos") setFiltroEstadoVaca("todas");
                          setPaginaVacas(1);
                        }}
                        style={{
                          width: "100%",
                          padding: "3px 4px",
                          fontSize: "11px",
                          fontWeight: filtroReproCol !== "todos" ? 700 : 500,
                          borderRadius: "4px",
                          border: filtroReproCol !== "todos" ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                          background: filtroReproCol !== "todos" ? "#eff6ff" : "#ffffff",
                          color: filtroReproCol !== "todos" ? "#1d4ed8" : "#334155",
                          cursor: "pointer",
                        }}
                      >
                        <option value="todos">Todos</option>
                        <option value="preniada">🤰 Preñadas ({countPreniadas})</option>
                        <option value="inseminada">💉 Inseminadas ({countInseminadas})</option>
                        <option value="vacia">⭕ Vacías ({countVacias})</option>
                      </select>
                    </div>
                  </th>

                  <th style={{ minWidth: "135px", textAlign: "right" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <span style={{ fontWeight: 800, fontSize: "11px", letterSpacing: "0.03em", color: "var(--slate-800)" }}>
                        DÍAS LACTANCIA (DEL)
                      </span>
                      <select
                        value={filtroDELCol}
                        onChange={(e) => {
                          setFiltroDELCol(e.target.value as any);
                          if (e.target.value === "del_desc" || e.target.value === "del_asc") {
                            setOrdenCenso(e.target.value as any);
                          }
                          setPaginaVacas(1);
                        }}
                        style={{
                          width: "100%",
                          padding: "3px 4px",
                          fontSize: "11px",
                          fontWeight: filtroDELCol !== "todos" ? 700 : 500,
                          borderRadius: "4px",
                          border: filtroDELCol !== "todos" ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                          background: filtroDELCol !== "todos" ? "#eff6ff" : "#ffffff",
                          color: filtroDELCol !== "todos" ? "#1d4ed8" : "#334155",
                          cursor: "pointer",
                        }}
                      >
                        <option value="todos">Todos</option>
                        <option value="del_desc">▼ Mayor a menor</option>
                        <option value="del_asc">▲ Menor a mayor</option>
                        <option value="alta">&gt; 200 días</option>
                        <option value="media">100 - 200 días</option>
                        <option value="baja">&lt; 100 días</option>
                      </select>
                    </div>
                  </th>

                  <th style={{ minWidth: "125px", textAlign: "right" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <span style={{ fontWeight: 800, fontSize: "11px", letterSpacing: "0.03em", color: "var(--slate-800)" }}>
                        DÍAS GESTACIÓN
                      </span>
                      <select
                        value={filtroGestacionCol}
                        onChange={(e) => {
                          setFiltroGestacionCol(e.target.value as any);
                          if (e.target.value === "gest_desc" || e.target.value === "gest_asc") {
                            setOrdenCenso(e.target.value as any);
                          }
                          setPaginaVacas(1);
                        }}
                        style={{
                          width: "100%",
                          padding: "3px 4px",
                          fontSize: "11px",
                          fontWeight: filtroGestacionCol !== "todos" ? 700 : 500,
                          borderRadius: "4px",
                          border: filtroGestacionCol !== "todos" ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                          background: filtroGestacionCol !== "todos" ? "#eff6ff" : "#ffffff",
                          color: filtroGestacionCol !== "todos" ? "#1d4ed8" : "#334155",
                          cursor: "pointer",
                        }}
                      >
                        <option value="todos">Todos</option>
                        <option value="con_gestacion">En gestación (&gt;0 d)</option>
                        <option value="gest_desc">▼ Mayor a menor</option>
                        <option value="gest_asc">▲ Menor a mayor</option>
                        <option value="sin_gestacion">Sin preñez</option>
                      </select>
                    </div>
                  </th>

                  <th style={{ minWidth: "135px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontWeight: 800, fontSize: "11px", letterSpacing: "0.03em", color: "var(--slate-800)" }}>
                        FECHA ESTIMADA PARTO
                      </span>
                      <select
                        value={filtroPartoCol}
                        onChange={(e) => {
                          setFiltroPartoCol(e.target.value as any);
                          if (e.target.value === "proximas") {
                            setOrdenCenso("parto_proximo");
                          }
                          setPaginaVacas(1);
                        }}
                        style={{
                          width: "100%",
                          padding: "3px 4px",
                          fontSize: "11px",
                          fontWeight: filtroPartoCol !== "todos" ? 700 : 500,
                          borderRadius: "4px",
                          border: filtroPartoCol !== "todos" ? "1.5px solid #16a34a" : "1px solid #cbd5e1",
                          background: filtroPartoCol !== "todos" ? "#f0fdf4" : "#ffffff",
                          color: filtroPartoCol !== "todos" ? "#15803d" : "#334155",
                          cursor: "pointer",
                        }}
                      >
                        <option value="todos">Todas</option>
                        <option value="proximas">⭐ Próximas a parir</option>
                        <option value="con_fecha">Con fecha asignada</option>
                        <option value="sin_fecha">Sin fecha</option>
                      </select>
                    </div>
                  </th>

                  <th style={{ minWidth: "135px", textAlign: "right" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <span style={{ fontWeight: 800, fontSize: "11px", letterSpacing: "0.03em", color: "var(--slate-800)" }}>
                        PRODUCCIÓN AYER
                      </span>
                      <select
                        value={filtroLitrosCol}
                        onChange={(e) => {
                          setFiltroLitrosCol(e.target.value as any);
                          if (e.target.value === "litros_desc" || e.target.value === "litros_asc") {
                            setOrdenCenso(e.target.value as any);
                          }
                          setPaginaVacas(1);
                        }}
                        style={{
                          width: "100%",
                          padding: "3px 4px",
                          fontSize: "11px",
                          fontWeight: filtroLitrosCol !== "todos" ? 700 : 500,
                          borderRadius: "4px",
                          border: filtroLitrosCol !== "todos" ? "1.5px solid #16a34a" : "1px solid #cbd5e1",
                          background: filtroLitrosCol !== "todos" ? "#f0fdf4" : "#ffffff",
                          color: filtroLitrosCol !== "todos" ? "#15803d" : "#334155",
                          cursor: "pointer",
                        }}
                      >
                        <option value="todos">Todas</option>
                        <option value="litros_desc">▼ Litros: Mayor a menor</option>
                        <option value="litros_asc">▲ Litros: Menor a mayor</option>
                        <option value="alta">Alta (&gt;25 lts)</option>
                        <option value="baja">Baja (&lt;20 lts)</option>
                      </select>
                    </div>
                  </th>

                  <th style={{ minWidth: "135px", textAlign: "right" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <span style={{ fontWeight: 800, fontSize: "11px", letterSpacing: "0.03em", color: "var(--slate-800)" }}>
                        PESO CORPORAL
                      </span>
                      <select
                        value={filtroPesoCol}
                        onChange={(e) => {
                          setFiltroPesoCol(e.target.value as any);
                          if (e.target.value === "peso_desc" || e.target.value === "peso_asc") {
                            setOrdenCenso(e.target.value as any);
                          }
                          setPaginaVacas(1);
                        }}
                        style={{
                          width: "100%",
                          padding: "3px 4px",
                          fontSize: "11px",
                          fontWeight: filtroPesoCol !== "todos" ? 700 : 500,
                          borderRadius: "4px",
                          border: filtroPesoCol !== "todos" ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                          background: filtroPesoCol !== "todos" ? "#eff6ff" : "#ffffff",
                          color: filtroPesoCol !== "todos" ? "#1d4ed8" : "#334155",
                          cursor: "pointer",
                        }}
                      >
                        <option value="todos">Todos</option>
                        <option value="peso_desc">▼ Mayor a menor</option>
                        <option value="peso_asc">▲ Menor a mayor</option>
                        <option value="oficial">⚖️ Balanza Oficial DelPro</option>
                      </select>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {vacasPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "20px", color: "var(--slate-500)" }}>
                      No se encontraron vacas con el filtro especificado.
                    </td>
                  </tr>
                ) : (
                  vacasPaginadas.map((v) => (
                    <tr key={v.rp}>
                      <td>
                        <strong style={{ fontSize: "14px", color: "var(--slate-900)" }}>
                          🏷️ {formatearCaravana(v.rp)}
                        </strong>
                        {v.grupoDelPro && (
                          <div style={{ fontSize: "10.5px", color: "#2563eb", fontWeight: 600 }}>
                            📍 {v.grupoDelPro}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`pill ${
                            v.estadoProductivo === "En Ordeñe"
                              ? "badgeGreen"
                              : v.estadoProductivo === "Seca"
                              ? "badgeAmber"
                              : v.estadoProductivo === "Vaquillona"
                              ? "badgeBlue"
                              : (v.estadoProductivo === "Macho" || (v.grupoDelPro || "").toLowerCase().includes("macho") || (v.grupoDelPro || "").toLowerCase().includes("engorde"))
                              ? "badgeAmber"
                              : (v.estadoProductivo === "Crianza" || (v.grupoDelPro || "").toLowerCase().includes("crianza") || (v.grupoDelPro || "").toLowerCase().includes("guachera"))
                              ? "badgePurple"
                              : "badgeSlate"
                          }`}
                          style={{ fontSize: "11px", fontWeight: 700 }}
                        >
                          {v.estadoProductivo === "En Ordeñe"
                            ? "🥛 En Ordeñe"
                            : v.estadoProductivo === "Seca"
                            ? "🍂 Seca"
                            : v.estadoProductivo === "Vaquillona"
                            ? "🌱 Vaquillona"
                            : (v.estadoProductivo === "Macho" || (v.grupoDelPro || "").toLowerCase().includes("macho") || (v.grupoDelPro || "").toLowerCase().includes("engorde"))
                            ? "🐂 Novillo / Macho"
                            : (v.estadoProductivo === "Crianza" || (v.grupoDelPro || "").toLowerCase().includes("crianza") || (v.grupoDelPro || "").toLowerCase().includes("guachera"))
                            ? "🍼 Ternero Crianza"
                            : v.estadoProductivo}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`pill ${
                            (v.estadoProductivo === "Macho" || (v.grupoDelPro || "").toLowerCase().includes("macho") || (v.grupoDelPro || "").toLowerCase().includes("engorde"))
                              ? "badgeSlate"
                              : (v.estadoProductivo === "Crianza" || (v.grupoDelPro || "").toLowerCase().includes("crianza") || (v.grupoDelPro || "").toLowerCase().includes("guachera"))
                              ? "badgeSlate"
                              : v.estadoReproductivo === "Preñada"
                              ? "badgeBlue"
                              : v.estadoReproductivo === "Inseminada"
                              ? "badgeAmber"
                              : "badgeRose"
                          }`}
                          style={{ fontSize: "11px", fontWeight: 700 }}
                        >
                          {(v.estadoProductivo === "Macho" || (v.grupoDelPro || "").toLowerCase().includes("macho") || (v.grupoDelPro || "").toLowerCase().includes("engorde"))
                            ? "♂️ Macho (Engorde)"
                            : (v.estadoProductivo === "Crianza" || (v.grupoDelPro || "").toLowerCase().includes("crianza") || (v.grupoDelPro || "").toLowerCase().includes("guachera"))
                            ? "🍼 Ternero/a (Crianza)"
                            : v.estadoReproductivo === "Preñada"
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
                          <div>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#166534" }}>
                              📅 {v.fechaProbableParto}
                            </span>
                            {v.diasParaParto !== undefined && (
                              <div style={{ fontSize: "10.5px", color: v.diasParaParto <= 21 ? "#b45309" : "#15803d", fontWeight: 700, marginTop: "1px" }}>
                                {v.diasParaParto <= 0 ? "⚡ En fecha" : `⏳ En ${v.diasParaParto} días`}
                              </div>
                            )}
                          </div>
                        ) : v.fechaSecadoEstimada ? (
                          <div>
                            <span style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>Secado sugerido:</span>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "#b45309" }}>
                              🍂 {v.fechaSecadoEstimada}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "var(--slate-400)", fontSize: "11px" }}>Sin preñez</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {v.litrosAyer > 0 ? (
                          <div>
                            <strong style={{ color: "#15803d", fontSize: "13.5px" }}>
                              {v.litrosAyer} lts/d
                            </strong>
                            {(v.scc || v.grasaPct || v.promedio7d) && (
                              <div style={{ fontSize: "10px", color: "var(--slate-500)", marginTop: "1px" }} title={`Prom 7d: ${v.promedio7d || "—"} lts | Grasa: ${v.grasaPct || "—"}% | Proteína: ${v.proteinaPct || "—"}% | Células Somáticas: ${v.scc || "—"}`}>
                                {v.scc ? `🧪 SCC: ${v.scc}` : v.promedio7d ? `📊 7d: ${v.promedio7d} l` : ""}
                                {v.grasaPct ? ` · ${v.grasaPct}% G` : ""}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "var(--slate-400)" }}>0.0 lts</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {(() => {
                          const infoPeso = resolverPesoAnimal(v);
                          return (
                            <div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "5px" }}>
                                <strong style={{ fontSize: "13px", color: infoPeso.esOficialDelPro ? "#166534" : "#0f172a" }}>
                                  {infoPeso.pesoKg} kg
                                </strong>
                                <span
                                  className={`pill ${infoPeso.badgeClase}`}
                                  style={{
                                    fontSize: "9.5px",
                                    fontWeight: 700,
                                    padding: "1px 5px",
                                    border: infoPeso.esOficialDelPro ? "1px solid #86efac" : "1px solid #bae6fd",
                                    background: infoPeso.esOficialDelPro ? "#dcfce7" : "#e0f2fe",
                                    color: infoPeso.esOficialDelPro ? "#166534" : "#0369a1",
                                  }}
                                  title={infoPeso.detalleCalculo}
                                >
                                  {infoPeso.icono} {infoPeso.origenEtiqueta}
                                </span>
                              </div>
                              {infoPeso.esOficialDelPro && (
                                <div style={{ fontSize: "10px", color: "#166534", fontWeight: 600, marginTop: "1px" }}>
                                  {infoPeso.detalleCalculo}
                                </div>
                              )}
                            </div>
                          );
                        })()}
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
