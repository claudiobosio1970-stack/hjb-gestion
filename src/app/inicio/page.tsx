"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import {
  getStockActualInsumos,
  getDietaTambo,
  calcularAutonomiaAlimentoRodeo,
  DietaTamboConfig,
  InsumoStockItem,
  HJB_DIETA_SYNC_EVENT,
  HJB_STOCK_SYNC_EVENT,
} from "@/lib/stockInsumosData";
import {
  agricultureData,
  Activity,
  Lote,
  HJB_AGRICULTURE_SYNC_EVENT,
} from "@/lib/agricultureData";
import {
  getCorrales,
  getTropas,
  DefinicionCorral,
  TropaGanadera,
} from "@/lib/ganaderiaData";
import { getPrecioReferencia } from "@/lib/valoresMovilesData";
import { campos } from "@/lib/mockData";

type TabTipo = "consolidado" | "tambo" | "agricultura" | "ganaderia";

export default function InicioPage() {
  const [tabActiva, setTabActiva] = useState<TabTipo>("consolidado");
  const [busqueda, setBusqueda] = useState("");
  const [filtroCampo, setFiltroCampo] = useState<string>("Todos");

  // Estados reactivos sincronizados
  const [dieta, setDieta] = useState<DietaTamboConfig>(() => getDietaTambo());
  const [stockData, setStockData] = useState(() => getStockActualInsumos());
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [corrales, setCorrales] = useState<DefinicionCorral[]>([]);
  const [tropas, setTropas] = useState<TropaGanadera[]>([]);

  function cargarTodo() {
    setDieta(getDietaTambo());
    setStockData(getStockActualInsumos());
    setLotes(agricultureData.listLotes());
    setActivities(agricultureData.listActivities());
    setCorrales(getCorrales());
    setTropas(getTropas());
  }

  useEffect(() => {
    cargarTodo();

    function onSync() {
      cargarTodo();
    }

    window.addEventListener(HJB_DIETA_SYNC_EVENT, onSync);
    window.addEventListener(HJB_STOCK_SYNC_EVENT, onSync);
    window.addEventListener(HJB_AGRICULTURE_SYNC_EVENT, onSync);

    return () => {
      window.removeEventListener(HJB_DIETA_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_STOCK_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_AGRICULTURE_SYNC_EVENT, onSync);
    };
  }, []);

  // =========================================================================
  // 1. CÁLCULOS CLAVE - TAMBO
  // =========================================================================
  const vacasVO = dieta.vacasEnOrdeñe || 187;
  const vacasPreparto = dieta.vacasPreparto || 25;
  const totalRodeoTambo = vacasVO + vacasPreparto;
  const litrosPromedioVO = 27.0; // Lts/vaca/día histórico auditado
  const litrosTotalesDia = Math.round(vacasVO * litrosPromedioVO);

  const precioLitroLeche = getPrecioReferencia("leche", "ARS") || 548.0;
  const facturacionLecheDia = Math.round(litrosTotalesDia * precioLitroLeche);

  // Precios de insumos de dieta
  const precioKgSoja = (getPrecioReferencia("pellet-soja", "ARS") || 295200) / 1000;
  const precioKgTrigo = (getPrecioReferencia("pellet-trigo", "ARS") || 221800) / 1000;
  const precioKgSilo = getPrecioReferencia("silo-maiz", "ARS") || 80.0;
  const precioKgMaiz = (getPrecioReferencia("maiz", "ARS") || 210000) / 1000;

  const costoDiaVOSoja = (dieta.racionesKgDia["pellet-soja"] || 2.5) * precioKgSoja;
  const costoDiaVOTrigo = (dieta.racionesKgDia["pellet-trigo"] || 3.0) * precioKgTrigo;
  const costoDiaVOSilo = (dieta.racionesKgDia["silo-maiz"] || 22.0) * precioKgSilo;
  const costoDiaVOMaiz = (dieta.racionesKgDia["maiz"] || 5.5) * precioKgMaiz;

  const costoTotalDiaVO = Number((costoDiaVOSoja + costoDiaVOTrigo + costoDiaVOSilo + costoDiaVOMaiz).toFixed(2));
  const costoTotalRodeoDia = Math.round(costoTotalDiaVO * vacasVO);
  const margenSobreAlimentacionDia = facturacionLecheDia - costoTotalRodeoDia;
  const margenSobreAlimentacionPct = facturacionLecheDia > 0 ? Number(((margenSobreAlimentacionDia / facturacionLecheDia) * 100).toFixed(1)) : 0;

  // Autonomías y stocks de alimentos para la tabla dinámica de Tambo
  const itemsAlimentosTambo = useMemo(() => {
    const idsAlimentos = [
      { id: "pellet-soja", nombre: "Pellet de Soja Proteico (Harina)", icono: "🥣", orden: 1 },
      { id: "pellet-trigo", nombre: "Pellet de Trigo (Afrechillo)", icono: "🌾", orden: 2 },
      { id: "silo-maiz", nombre: "Silo de Maíz Picado Fino (Bolsa)", icono: "🌽", orden: 3 },
      { id: "maiz-grano", nombre: "Maíz Grano Seco Molido", icono: "⚡", orden: 4 },
      { id: "rollo-alfalfa", nombre: "Rollos de Alfalfa Henificada", icono: "🌿", orden: 5 },
      { id: "sal-mineral", nombre: "Sal Mineral V.O. (MZM con Levadura)", icono: "🧂", orden: 6 },
      { id: "sal-anionica", nombre: "Sal Aniónica Preparto", icono: "🤰", orden: 7 },
      { id: "semilla-algodon", nombre: "Semilla de Algodón Entera", icono: "🌱", orden: 8 },
    ];

    return idsAlimentos.map((alimento) => {
      const stockItem = stockData.items.find((x) => x.id === alimento.id);
      const stockActual = stockItem?.stockActual || 0;
      const unidad = stockItem?.unidad || (alimento.id.includes("rollo") ? "Rollos" : "kg");

      const auto = calcularAutonomiaAlimentoRodeo(stockActual, alimento.id, { unidad });

      // Ración en Tambo VO
      let racionVO = 0;
      if (alimento.id === "pellet-soja") racionVO = dieta.racionesKgDia["pellet-soja"] || 2.5;
      else if (alimento.id === "pellet-trigo") racionVO = dieta.racionesKgDia["pellet-trigo"] || 3.0;
      else if (alimento.id === "silo-maiz") racionVO = dieta.racionesKgDia["silo-maiz"] || 22.0;
      else if (alimento.id === "maiz-grano") racionVO = dieta.racionesKgDia["maiz"] || 5.5;
      else if (alimento.id === "rollo-alfalfa") racionVO = dieta.racionesKgDia["rollo-alfalfa"] || 3.0;
      else if (alimento.id === "sal-mineral") racionVO = dieta.racionesKgDia["sal-mineral"] || 0.15;
      else if (alimento.id === "sal-anionica") racionVO = dieta.racionesKgDia["sal-anionica"] || 0.25;
      else if (alimento.id === "semilla-algodon") racionVO = dieta.racionesKgDia["semilla-algodon"] || 1.5;

      const consumoTamboDia = Math.round(vacasVO * racionVO * 10) / 10;

      return {
        ...alimento,
        stockActual,
        unidad,
        ubicacion: stockItem?.ubicacion || "Tambo",
        stockPorUbicacion: stockItem?.stockPorUbicacion || [],
        racionVO,
        consumoTamboDia,
        consumoTotalEstablecimiento: auto.consumoDiarioTotalKg,
        diasAutonomia: auto.diasAutonomia,
        totalCabezas: auto.totalCabezas,
        textoTooltip: auto.textoTooltip,
        desglose: auto.desglose,
      };
    });
  }, [stockData, dieta, vacasVO]);

  // =========================================================================
  // 2. CÁLCULOS CLAVE - AGRICULTURA
  // =========================================================================
  const superficieTotalHa = useMemo(() => {
    return lotes.reduce((acc, l) => acc + (l.superficieHa || 0), 0);
  }, [lotes]);

  // Distribución de cultivos por hectárea y porcentaje
  const distribucionCultivos = useMemo(() => {
    const mapa = new Map<string, number>();
    lotes.forEach((l) => {
      const c = l.cultivoActual?.trim() || "Sin asignar";
      const sup = l.superficieHa || 0;
      mapa.set(c, (mapa.get(c) || 0) + sup);
    });

    const lista = Array.from(mapa.entries()).map(([cultivo, ha]) => ({
      cultivo,
      ha,
      pct: superficieTotalHa > 0 ? Number(((ha / superficieTotalHa) * 100).toFixed(1)) : 0,
    }));

    return lista.sort((a, b) => b.ha - a.ha);
  }, [lotes, superficieTotalHa]);

  // Avance de labores de la campaña 2026/27
  const laboresStats = useMemo(() => {
    const total = activities.length;
    const realizadas = activities.filter((a) => a.estado === "Realizada").length;
    const planificadas = activities.filter((a) => a.estado === "Planificada").length;
    const avancePct = total > 0 ? Math.round((realizadas / total) * 100) : 0;
    return { total, realizadas, planificadas, avancePct };
  }, [activities]);

  // Labores recientes (últimas 6 realizadas o planificadas)
  const laboresRecientes = useMemo(() => {
    return [...activities]
      .sort((a, b) => {
        const fa = a.fechaReal || a.fechaPlanificada || "";
        const fb = b.fechaReal || b.fechaPlanificada || "";
        return fb.localeCompare(fa);
      })
      .slice(0, 6);
  }, [activities]);

  // =========================================================================
  // 3. CÁLCULOS CLAVE - GANADERÍA
  // =========================================================================
  const totalCabezasGanaderia = useMemo(() => {
    return tropas.reduce((sum, t) => sum + (t.cabezas || 0), 0);
  }, [tropas]);

  const tropaTerminacion = useMemo(() => {
    return tropas.find((t) => t.corralId === "terminacion");
  }, [tropas]);

  const gdpvPromedioGeneral = useMemo(() => {
    if (totalCabezasGanaderia === 0) return 1.03;
    const suma = tropas.reduce((sum, t) => sum + (t.cabezas * (t.gdpvKgDia || 1)), 0);
    return Number((suma / totalCabezasGanaderia).toFixed(2));
  }, [tropas, totalCabezasGanaderia]);

  // =========================================================================
  // 4. FILTRADO Y BÚSQUEDA DINÁMICA
  // =========================================================================
  const q = busqueda.toLowerCase().trim();

  const lotesFiltrados = useMemo(() => {
    return lotes.filter((l) => {
      if (filtroCampo !== "Todos" && l.campo.toLowerCase() !== filtroCampo.toLowerCase()) return false;
      if (!q) return true;
      return (
        l.campo.toLowerCase().includes(q) ||
        l.nombre.toLowerCase().includes(q) ||
        (l.cultivoActual && l.cultivoActual.toLowerCase().includes(q)) ||
        (l.estado && l.estado.toLowerCase().includes(q))
      );
    });
  }, [lotes, filtroCampo, q]);

  const alimentosFiltrados = useMemo(() => {
    return itemsAlimentosTambo.filter((it) => {
      if (!q) return true;
      return (
        it.nombre.toLowerCase().includes(q) ||
        it.ubicacion.toLowerCase().includes(q) ||
        it.id.toLowerCase().includes(q)
      );
    });
  }, [itemsAlimentosTambo, q]);

  const corralesFiltrados = useMemo(() => {
    return corrales.map((corral) => {
      const tropa = tropas.find((t) => t.corralId === corral.id);
      return {
        corral,
        tropa,
      };
    }).filter(({ corral, tropa }) => {
      if (!q) return true;
      return (
        corral.nombreCompleto.toLowerCase().includes(q) ||
        corral.nombreCorto.toLowerCase().includes(q) ||
        (tropa?.nombre && tropa.nombre.toLowerCase().includes(q)) ||
        (tropa?.codigo && tropa.codigo.toLowerCase().includes(q))
      );
    });
  }, [corrales, tropas, q]);

  return (
    <AppShell active="Inicio">
      {/* Encabezado del Tablero Ejecutivo */}
      <div className="pageHeader" style={{ marginBottom: "20px" }}>
        <div>
          <div className="badgeRow">
            <span className="pill badgeGreen">Tablero de Control Integral</span>
            <span className="pill badgeSlate">Campaña 2026/27</span>
            <span className="pill badgeBlue">3 Unidades de Negocio</span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "-0.02em", margin: "6px 0 2px" }}>
            Panel de Operaciones HJB
          </h1>
          <p className="muted" style={{ fontSize: "14px", margin: 0 }}>
            Monitoreo en tiempo real de producción lechera, cultivos agrícolas, hacienda a corral y balance de forrajes.
          </p>
        </div>

        {/* Buscador Rápido y Selector de Vista */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="🔍 Filtrar tablas y datos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: "220px",
                padding: "8px 12px 8px 32px",
                borderRadius: "8px",
                fontSize: "13px",
                border: "1px solid var(--line)",
              }}
            />
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", opacity: 0.6 }}>
              🔍
            </span>
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            )}
          </div>

          <Link href="/insumos" className="secondaryBtn" style={{ textDecoration: "none", fontSize: "13px", padding: "8px 14px" }}>
            🌾 Stock Insumos
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABS DE SELECCIÓN DE VISTA / UNIDADES DE NEGOCIO                          */}
      {/* ========================================================================= */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "2px solid var(--line)",
          marginBottom: "24px",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        <button
          type="button"
          onClick={() => setTabActiva("consolidado")}
          style={{
            padding: "10px 18px",
            background: tabActiva === "consolidado" ? "var(--slate-900)" : "transparent",
            color: tabActiva === "consolidado" ? "#ffffff" : "var(--slate-600)",
            border: "none",
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "13.5px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.15s ease",
          }}
        >
          <span>📊</span>
          <span>Visión Consolidada HJB</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("tambo")}
          style={{
            padding: "10px 18px",
            background: tabActiva === "tambo" ? "#1e40af" : "transparent",
            color: tabActiva === "tambo" ? "#ffffff" : "var(--slate-600)",
            border: "none",
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "13.5px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.15s ease",
          }}
        >
          <span>🥛</span>
          <span>Tambo & Rodeo ({vacasVO} VO)</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("agricultura")}
          style={{
            padding: "10px 18px",
            background: tabActiva === "agricultura" ? "#15803d" : "transparent",
            color: tabActiva === "agricultura" ? "#ffffff" : "var(--slate-600)",
            border: "none",
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "13.5px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.15s ease",
          }}
        >
          <span>🌾</span>
          <span>Agricultura ({superficieTotalHa} ha)</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("ganaderia")}
          style={{
            padding: "10px 18px",
            background: tabActiva === "ganaderia" ? "#c2410c" : "transparent",
            color: tabActiva === "ganaderia" ? "#ffffff" : "var(--slate-600)",
            border: "none",
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "13.5px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.15s ease",
          }}
        >
          <span>🐂</span>
          <span>Ganadería & Engorde ({totalCabezasGanaderia} cab.)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. KPIS EJECUTIVOS CONSOLIDADOS                                           */}
      {/* ========================================================================= */}
      <div className="metricsGrid four" style={{ marginBottom: "24px" }}>
        <MetricCard
          label="Tambo: Rodeo en Ordeñe"
          value={`${vacasVO} VO`}
          note={`+${vacasPreparto} preparto · ${totalRodeoTambo} cabezas totales`}
        />
        <MetricCard
          label="Producción Leche Estimada"
          value={`${litrosTotalesDia.toLocaleString("es-AR")} lts/d`}
          note={`~${litrosPromedioVO} lts/VO/d · $${(facturacionLecheDia / 1000000).toFixed(2)}M/d fact.`}
        />
        <MetricCard
          label="Agricultura: Superficie Total"
          value={`${superficieTotalHa} ha`}
          note={`5 campos · 15 lotes en producción activa`}
        />
        <MetricCard
          label="Ganadería: Hacienda a Corral"
          value={`${totalCabezasGanaderia} cabezas`}
          note={`${tropaTerminacion?.cabezas || 26} terminados (${tropaTerminacion?.pesoActualKg || 404} kg prom.)`}
        />
      </div>

      {/* ========================================================================= */}
      {/* 2. TABLAS DINÁMICAS SEGÚN LA SOLAPA SELECCIONADA                           */}
      {/* ========================================================================= */}

      {/* TABLA DINÁMICA 1: TAMBO (Lechería, Raciones, Costos y Autonomía) */}
      {(tabActiva === "consolidado" || tabActiva === "tambo") && (
        <section className="section" style={{ marginBottom: "28px" }}>
          <div className="panel" style={{ padding: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "22px" }}>🥛</span>
                  <h2 style={{ fontSize: "18px", margin: 0 }}>
                    Tablero Lechero: Raciones, Costos & Balance Forrajero
                  </h2>
                </div>
                <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                  Monitoreo diario de alimentación del rodeo, costo por cabeza y autonomía de reservas físicas y en AFA.
                </p>
              </div>

              {/* Badges de Rentabilidad Leche vs Alimentación */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <div
                  style={{
                    background: "rgba(30, 64, 175, 0.08)",
                    border: "1px solid rgba(30, 64, 175, 0.25)",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    textAlign: "right",
                  }}
                >
                  <div style={{ fontSize: "10.5px", color: "#1e40af", fontWeight: 700, textTransform: "uppercase" }}>
                    Costo Alimentación VO
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 900, color: "#1e3a8a" }}>
                    ${costoTotalDiaVO.toLocaleString("es-AR", { minimumFractionDigits: 2 })} / VO / d
                  </div>
                  <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>
                    ${(costoTotalRodeoDia / 1000).toFixed(0)}k/d rodeo total
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(22, 163, 74, 0.08)",
                    border: "1px solid rgba(22, 163, 74, 0.25)",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    textAlign: "right",
                  }}
                >
                  <div style={{ fontSize: "10.5px", color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
                    Margen s/ Alimento (IOFC)
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 900, color: "#15803d" }}>
                    {margenSobreAlimentacionPct}% (${(margenSobreAlimentacionDia / 1000).toFixed(0)}k/d)
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#166534" }}>
                    Facturación: ${(facturacionLecheDia / 1000).toFixed(0)}k/d
                  </div>
                </div>

                <Link href="/tambo" className="inlineLink" style={{ fontSize: "12.5px", fontWeight: 700, marginLeft: "6px" }}>
                  Gestionar Tambo →
                </Link>
              </div>
            </div>

            {/* TABLA DINÁMICA DE DIETAS Y RESERVAS FORRAJERAS */}
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th style={{ minWidth: "220px" }}>Alimento / Reserva</th>
                    <th style={{ width: "130px", textAlign: "right" }}>Ración VO</th>
                    <th style={{ width: "150px", textAlign: "right" }}>Consumo Tambo/d</th>
                    <th style={{ width: "160px", textAlign: "right" }}>Consumo Total Campo</th>
                    <th style={{ width: "140px", textAlign: "right" }}>Stock Actual</th>
                    <th style={{ width: "160px", textAlign: "center" }}>Autonomía Rodeo</th>
                    <th style={{ width: "140px", textAlign: "right" }}>Ubicación</th>
                  </tr>
                </thead>
                <tbody>
                  {alimentosFiltrados.map((item) => {
                    const esCritico = item.diasAutonomia > 0 && item.diasAutonomia < 15;
                    const esModerado = item.diasAutonomia >= 15 && item.diasAutonomia < 30;

                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "18px" }}>{item.icono}</span>
                            <div>
                              <strong>{item.nombre}</strong>
                              <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                                {item.id === "pellet-soja" ? "Proteico · Canje AFA Los Cardos" : item.id === "silo-maiz" ? "Fibra y energía · 43 ha tambo" : "Alimentación oficial"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {item.racionVO > 0 ? `${item.racionVO.toLocaleString("es-AR")} kg/VO` : "--"}
                        </td>

                        <td style={{ textAlign: "right" }}>
                          {item.consumoTamboDia > 0 ? (
                            <>
                              <strong style={{ fontSize: "13px" }}>{item.consumoTamboDia.toLocaleString("es-AR")} kg/d</strong>
                              <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>
                                {(item.consumoTamboDia / 1000).toFixed(2)} Tn/d
                              </div>
                            </>
                          ) : (
                            <span style={{ color: "var(--slate-400)", fontSize: "12px" }}>--</span>
                          )}
                        </td>

                        <td style={{ textAlign: "right" }}>
                          {item.consumoTotalEstablecimiento > 0 ? (
                            <>
                              <strong style={{ fontSize: "13px", color: "var(--slate-800)" }}>
                                {item.consumoTotalEstablecimiento.toLocaleString("es-AR")} kg/d
                              </strong>
                              <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>
                                {item.totalCabezas} cabezas en dieta
                              </div>
                            </>
                          ) : (
                            <span style={{ color: "var(--slate-400)", fontSize: "12px" }}>Sin asignación</span>
                          )}
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <strong style={{ fontSize: "13.5px", color: item.stockActual > 0 ? "#15803d" : "#64748b" }}>
                            {item.stockActual.toLocaleString("es-AR")} {item.unidad}
                          </strong>
                          {item.unidad === "kg" && item.stockActual > 0 && (
                            <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>
                              {(item.stockActual / 1000).toFixed(1)} Tn
                            </div>
                          )}
                        </td>

                        <td style={{ textAlign: "center" }}>
                          {item.diasAutonomia > 0 ? (
                            <span
                              className={`pill ${esCritico ? "badgeRed" : esModerado ? "badgeAmber" : "badgeGreen"}`}
                              style={{ fontSize: "11px", fontWeight: 800, padding: "3px 8px" }}
                              title={item.textoTooltip}
                            >
                              ⏱️ {item.diasAutonomia} días ({item.totalCabezas} cab.)
                            </span>
                          ) : (
                            <span className="pill badgeSlate" style={{ fontSize: "10.5px" }}>
                              Sin existencias
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "11.5px", color: "var(--slate-600)" }}>
                            {item.ubicacion}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TABLA DINÁMICA 2: AGRICULTURA (Campos, Lotes, Cultivos y Labores) */}
      {(tabActiva === "consolidado" || tabActiva === "agricultura") && (
        <section className="section" style={{ marginBottom: "28px" }}>
          <div className="panel" style={{ padding: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "22px" }}>🌾</span>
                  <h2 style={{ fontSize: "18px", margin: 0 }}>
                    Tablero Agrícola: Superficie, Cultivos y Estado de Lotes
                  </h2>
                </div>
                <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                  Superficie consolidada ({superficieTotalHa} ha), plan de siembra 2026/27 y control de avance por campo.
                </p>
              </div>

              {/* Selector interactivo de Campo */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-700)", margin: 0 }}>
                    Filtrar campo:
                  </label>
                  <select
                    value={filtroCampo}
                    onChange={(e) => setFiltroCampo(e.target.value)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      border: "1px solid var(--line)",
                      fontWeight: 600,
                    }}
                  >
                    <option value="Todos">Todos los campos ({campos.length})</option>
                    {campos.map((c) => (
                      <option key={c.nombre} value={c.nombre}>
                        {c.nombre} ({c.superficie})
                      </option>
                    ))}
                  </select>
                </div>

                <Link href="/agricultura" className="inlineLink" style={{ fontSize: "12.5px", fontWeight: 700, marginLeft: "6px" }}>
                  Módulo Agricultura →
                </Link>
              </div>
            </div>

            {/* Barra Pivot / Dinámica de Cultivos de Campaña */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                background: "#f8fafc",
                border: "1px solid var(--line)",
                padding: "10px 14px",
                borderRadius: "8px",
                marginBottom: "16px",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                Distribución de Cultivos 2026/27:
              </span>
              {distribucionCultivos.map((dc) => (
                <span
                  key={dc.cultivo}
                  className="pill"
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 700,
                    background: dc.cultivo.includes("Maíz") ? "#fef3c7" : dc.cultivo.includes("Soja") ? "#dcfce7" : dc.cultivo.includes("Alfalfa") ? "#e0f2fe" : "#f1f5f9",
                    color: dc.cultivo.includes("Maíz") ? "#92400e" : dc.cultivo.includes("Soja") ? "#166534" : dc.cultivo.includes("Alfalfa") ? "#075985" : "var(--slate-700)",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  {dc.cultivo}: <strong>{dc.ha} ha</strong> ({dc.pct}%)
                </span>
              ))}
              <span style={{ marginLeft: "auto", fontSize: "11.5px", fontWeight: 700, color: "var(--slate-600)" }}>
                Avance Labores: <strong>{laboresStats.realizadas}/{laboresStats.total}</strong> ({laboresStats.avancePct}%)
              </span>
            </div>

            {/* TABLA DINÁMICA DE LOTES Y CULTIVOS */}
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th style={{ minWidth: "140px" }}>Campo</th>
                    <th style={{ minWidth: "130px" }}>Lote</th>
                    <th style={{ width: "120px", textAlign: "right" }}>Superficie</th>
                    <th style={{ width: "160px" }}>Cultivo 2026/27</th>
                    <th style={{ width: "180px" }}>Destino / Uso</th>
                    <th style={{ width: "140px", textAlign: "center" }}>Labores Campo</th>
                    <th style={{ width: "130px", textAlign: "center" }}>Estado</th>
                    <th style={{ width: "100px", textAlign: "center" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {lotesFiltrados.map((lote) => {
                    const laboresLote = activities.filter((a) => a.campo.toLowerCase() === lote.campo.toLowerCase() && (!a.lote || a.lote === lote.nombre));
                    const realizadas = laboresLote.filter((a) => a.estado === "Realizada").length;
                    const cInfo = campos.find((c) => c.nombre.toLowerCase() === lote.campo.toLowerCase());

                    let destinoTexto = "Grano Comercial";
                    if (lote.campo.toLowerCase() === "tambo" || lote.cultivoActual?.toLowerCase().includes("alfalfa")) {
                      destinoTexto = "🥛 Forraje Tambo (Silo/Rollos)";
                    } else if (lote.cultivoActual?.toLowerCase().includes("soja")) {
                      destinoTexto = "🌾 Cereal Comercial AFA";
                    }

                    return (
                      <tr key={lote.id}>
                        <td>
                          <div style={{ fontWeight: 800, fontSize: "13px" }}>{lote.campo}</div>
                          <div style={{ fontSize: "10.5px", color: "var(--slate-400)" }}>{cInfo?.superficie || ""}</div>
                        </td>

                        <td>
                          <strong>{lote.nombre}</strong>
                          {lote.aptitudSuelo && (
                            <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>{lote.aptitudSuelo}</div>
                          )}
                        </td>

                        <td style={{ textAlign: "right", fontWeight: 800, fontSize: "13px" }}>
                          {lote.superficieHa || 0} ha
                        </td>

                        <td>
                          <span
                            className="pill"
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              background: lote.cultivoActual?.includes("Maíz") ? "#fef3c7" : lote.cultivoActual?.includes("Soja") ? "#dcfce7" : lote.cultivoActual?.includes("Alfalfa") ? "#e0f2fe" : "#f1f5f9",
                              color: lote.cultivoActual?.includes("Maíz") ? "#92400e" : lote.cultivoActual?.includes("Soja") ? "#166534" : lote.cultivoActual?.includes("Alfalfa") ? "#075985" : "var(--slate-700)",
                            }}
                          >
                            {lote.cultivoActual || "Sin asignar"}
                          </span>
                        </td>

                        <td style={{ fontSize: "12px", color: "var(--slate-700)" }}>
                          {destinoTexto}
                        </td>

                        <td style={{ textAlign: "center" }}>
                          <span className="pill badgeSlate" style={{ fontSize: "11px" }}>
                            {realizadas}/{laboresLote.length} labores
                          </span>
                        </td>

                        <td style={{ textAlign: "center" }}>
                          <span className={`statusDot ${lote.estado === "En producción" ? "dotGreen" : "dotAmber"}`} style={{ display: "inline-block", marginRight: "4px" }} />
                          <span style={{ fontSize: "11px", fontWeight: 600 }}>{lote.estado}</span>
                        </td>

                        <td style={{ textAlign: "center" }}>
                          <Link
                            href={`/agricultura/${cInfo?.slug || lote.campo.toLowerCase()}`}
                            className="inlineLink"
                            style={{ fontSize: "11.5px", fontWeight: 700 }}
                          >
                            Ver →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TABLA DINÁMICA 3: GANADERÍA (Corrales de Engorde & Recría a Corral) */}
      {(tabActiva === "consolidado" || tabActiva === "ganaderia") && (
        <section className="section" style={{ marginBottom: "28px" }}>
          <div className="panel" style={{ padding: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "22px" }}>🐂</span>
                  <h2 style={{ fontSize: "18px", margin: 0 }}>
                    Tablero Ganadero: Hacienda a Corral & Engorde ({totalCabezasGanaderia} cabezas)
                  </h2>
                </div>
                <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                  Seguimiento de tropas de machos del tambo desde Guachera hasta Terminación en Feedlot.
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span className="pill badgeGreen" style={{ fontSize: "12px", fontWeight: 800 }}>
                  📈 GDPV Promedio: {gdpvPromedioGeneral} kg/día
                </span>
                <Link href="/ganaderia" className="inlineLink" style={{ fontSize: "12.5px", fontWeight: 700, marginLeft: "6px" }}>
                  Módulo Ganadería →
                </Link>
              </div>
            </div>

            {/* TABLA DINÁMICA DE CORRALES Y TROPAS */}
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th style={{ minWidth: "180px" }}>Corral / Etapa</th>
                    <th style={{ minWidth: "160px" }}>Tropa Activa</th>
                    <th style={{ width: "90px", textAlign: "right" }}>Cabezas</th>
                    <th style={{ width: "110px", textAlign: "right" }}>Peso Entrada</th>
                    <th style={{ width: "110px", textAlign: "right" }}>Peso Actual</th>
                    <th style={{ width: "110px", textAlign: "right" }}>Peso Objetivo</th>
                    <th style={{ width: "110px", textAlign: "right" }}>Ganancia (GDPV)</th>
                    <th style={{ width: "130px", textAlign: "center" }}>Estado / Destino</th>
                  </tr>
                </thead>
                <tbody>
                  {corralesFiltrados.map(({ corral, tropa }) => {
                    const pesoActual = tropa?.pesoActualKg || corral.pesoObjetivoKg;
                    const pesoObjetivo = corral.pesoObjetivoKg;
                    const avancePeso = Math.min(100, Math.round((pesoActual / pesoObjetivo) * 100));
                    const esTerminacion = corral.id === "terminacion";

                    return (
                      <tr key={corral.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "18px" }}>{corral.icono}</span>
                            <div>
                              <strong>{corral.nombreCorto}</strong>
                              <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>{corral.nombreCompleto}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <strong>{tropa?.nombre || `Lote ${corral.nombreCorto}`}</strong>
                          <div style={{ fontSize: "10.5px", color: "var(--slate-400)" }}>
                            {tropa?.codigo || "TR-26"} · {tropa?.diasEnCorral || 0} días en corral
                          </div>
                        </td>

                        <td style={{ textAlign: "right", fontWeight: 800, fontSize: "13.5px" }}>
                          {tropa?.cabezas || 0} cab.
                        </td>

                        <td style={{ textAlign: "right", color: "var(--slate-600)" }}>
                          {tropa?.pesoInicialKg || corral.pesoEntradaKg} kg
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <strong style={{ fontSize: "13.5px", color: esTerminacion ? "#15803d" : "var(--slate-900)" }}>
                            {pesoActual} kg
                          </strong>
                          <div style={{ fontSize: "10px", color: "var(--slate-400)" }}>
                            {avancePeso}% del objetivo
                          </div>
                        </td>

                        <td style={{ textAlign: "right", color: "var(--slate-700)" }}>
                          {pesoObjetivo} kg
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 700 }}>
                            +{tropa?.gdpvKgDia || 1.0} kg/d
                          </span>
                        </td>

                        <td style={{ textAlign: "center" }}>
                          {esTerminacion ? (
                            <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 800 }} title="Lote terminado listo para frigorífico">
                              🥩 Listo p/ Faena
                            </span>
                          ) : (
                            <span className="pill badgeSlate" style={{ fontSize: "11px" }}>
                              En desarrollo
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. LABORES Y TAREAS RECIENTES / PRÓXIMAS (Plan vs Real)                   */}
      {/* ========================================================================= */}
      {(tabActiva === "consolidado" || tabActiva === "agricultura") && (
        <section className="section">
          <div className="panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <h3 style={{ fontSize: "16px", margin: 0 }}>
                  🚜 Registro de Labores & Tareas de Campaña
                </h3>
                <p className="muted" style={{ fontSize: "12px", margin: "2px 0 0 0" }}>
                  Últimas actividades agronómicas ejecutadas y planificadas en los campos de HJB.
                </p>
              </div>
              <Link href="/agricultura" className="inlineLink" style={{ fontSize: "12px", fontWeight: 700 }}>
                Ver todas las labores ({activities.length}) →
              </Link>
            </div>

            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th style={{ width: "110px" }}>Fecha</th>
                    <th style={{ width: "160px" }}>Campo & Lote</th>
                    <th style={{ width: "140px" }}>Labor</th>
                    <th style={{ width: "130px" }}>Cultivo</th>
                    <th style={{ width: "110px", textAlign: "right" }}>Superficie</th>
                    <th style={{ minWidth: "200px" }}>Insumos / Detalles</th>
                    <th style={{ width: "120px", textAlign: "center" }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {laboresRecientes.map((act) => (
                    <tr key={act.id}>
                      <td style={{ fontSize: "12px", color: "var(--slate-600)" }}>
                        {act.fechaReal || act.fechaPlanificada || "--"}
                      </td>
                      <td>
                        <strong>{act.campo}</strong>
                        {act.lote && <span style={{ fontSize: "11px", color: "var(--slate-500)", marginLeft: "4px" }}>({act.lote})</span>}
                      </td>
                      <td>
                        <span className="pill badgeSlate" style={{ fontSize: "11px", fontWeight: 700 }}>
                          {act.tipo}
                        </span>
                      </td>
                      <td style={{ fontSize: "12.5px" }}>{act.cultivo || "--"}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {(act.superficieReal ?? act.superficiePlanificada ?? 0)} ha
                      </td>
                      <td style={{ fontSize: "11.5px", color: "var(--slate-600)" }}>
                        {act.insumos && act.insumos.length > 0 ? (
                          act.insumos.map((i) => `${i.producto} (${i.dosisReal || i.dosisPlanificada || ""} ${i.unidad})`).join(", ")
                        ) : act.produccion ? (
                          `Producción: ${act.produccion.cantidad || 0} ${act.produccion.unidad}`
                        ) : (
                          "Labor mecánica"
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`pill ${act.estado === "Realizada" ? "badgeGreen" : "badgeAmber"}`} style={{ fontSize: "11px" }}>
                          {act.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}
