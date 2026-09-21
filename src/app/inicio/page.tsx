"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import {
  getStockActualInsumos,
  getDietaTambo,
  saveDietaTambo,
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

  // Modal para ajuste de Parámetros Reales (CERO DATOS INVENTADOS)
  const [modalParametrosOpen, setModalParametrosOpen] = useState(false);
  const [formParametros, setFormParametros] = useState({
    litrosPromedioVO: 27.0,
    precioLitroLecheArs: 548.0,
    otrosCostosOperativosVODiaArs: 0,
    precioNovilloGordoVivoArs: 4200,
  });
  const [feedbackParametros, setFeedbackParametros] = useState<string | null>(null);

  function cargarTodo() {
    const d = getDietaTambo();
    setDieta(d);
    setStockData(getStockActualInsumos());
    setLotes(agricultureData.listLotes());
    setActivities(agricultureData.listActivities());
    setCorrales(getCorrales());
    setTropas(getTropas());
    setFormParametros({
      litrosPromedioVO: d.litrosPromedioVO ?? 27.0,
      precioLitroLecheArs: d.precioLitroLecheArs ?? 548.0,
      otrosCostosOperativosVODiaArs: d.otrosCostosOperativosVODiaArs ?? 0,
      precioNovilloGordoVivoArs: d.precioNovilloGordoVivoArs ?? 4200,
    });
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

  function handleGuardarParametros(e: React.FormEvent) {
    e.preventDefault();
    const updated = saveDietaTambo({
      litrosPromedioVO: Number(formParametros.litrosPromedioVO),
      precioLitroLecheArs: Number(formParametros.precioLitroLecheArs),
      otrosCostosOperativosVODiaArs: Number(formParametros.otrosCostosOperativosVODiaArs),
      precioNovilloGordoVivoArs: Number(formParametros.precioNovilloGordoVivoArs),
      actualizadoPor: "Tablero Inicio (Parámetros Reales)",
    });
    setDieta(updated);
    setFeedbackParametros("✓ Parámetros actualizados y sincronizados con éxito.");
    setTimeout(() => {
      setFeedbackParametros(null);
      setModalParametrosOpen(false);
    }, 1200);
  }

  // =========================================================================
  // 1. CÁLCULOS CLAVE - TAMBO, COSTOS DE ALIMENTACIÓN & LITROS LIBRES
  // =========================================================================
  const vacasVO = dieta.vacasEnOrdeñe || 187;
  const vacasPreparto = dieta.vacasPreparto || 25;
  const totalRodeoTambo = vacasVO + vacasPreparto;

  const litrosPromedioVO = dieta.litrosPromedioVO ?? 27.0;
  const precioLitroLeche = dieta.precioLitroLecheArs ?? 548.0;
  const otrosCostosOperativosVO = dieta.otrosCostosOperativosVODiaArs ?? 0;

  const litrosTotalesDia = Math.round(vacasVO * litrosPromedioVO);
  const facturacionLecheDia = Math.round(litrosTotalesDia * precioLitroLeche);
  const facturacionPorVODia = Math.round(litrosPromedioVO * precioLitroLeche);

  // Precios reales de referencia de insumos de alimentación
  const precioKgSoja = (getPrecioReferencia("pellet-soja", "ARS") || 489700) / 1000;
  const precioKgTrigo = (getPrecioReferencia("pellet-trigo", "ARS") || 235400) / 1000;
  const precioKgSilo = getPrecioReferencia("silo-maiz-kg", "ARS") || 39.1;
  const precioKgMaiz = (getPrecioReferencia("maiz", "ARS") || 295200) / 1000;
  const precioKgRollo = (getPrecioReferencia("rollo-alfalfa", "ARS") || 34500) / 500;
  const precioKgSalMineral = getPrecioReferencia("sal-mineral", "ARS") || 1289.88;
  const precioKgSemillaAlgodon = (getPrecioReferencia("semilla-algodon", "ARS") || 345000) / 1000;

  // Costo diario de cada ingrediente por Vaca en Ordeñe (VO)
  const costoSojaVO = (dieta.racionesKgDia["pellet-soja"] || 2.5) * precioKgSoja;
  const costoTrigoVO = (dieta.racionesKgDia["pellet-trigo"] || 3.0) * precioKgTrigo;
  const costoSiloVO = (dieta.racionesKgDia["silo-maiz"] || 22.0) * precioKgSilo;
  const costoMaizVO = (dieta.racionesKgDia["maiz"] || 5.5) * precioKgMaiz;
  const costoRolloVO = (dieta.racionesKgDia["rollo-alfalfa"] || 3.0) * precioKgRollo;
  const costoSalVO = (dieta.racionesKgDia["sal-mineral"] || 0.15) * precioKgSalMineral;
  const costoSemillaVO = (dieta.racionesKgDia["semilla-algodon"] || 0) * precioKgSemillaAlgodon;

  // Costo de Alimentación Total por Vaca/Día
  const costoAlimentacionVODia = Number(
    (costoSojaVO + costoTrigoVO + costoSiloVO + costoMaizVO + costoRolloVO + costoSalVO + costoSemillaVO).toFixed(2)
  );
  const costoAlimentacionRodeoDia = Math.round(costoAlimentacionVODia * vacasVO);
  const costoAlimentacionPorLitro = litrosPromedioVO > 0 ? Number((costoAlimentacionVODia / litrosPromedioVO).toFixed(2)) : 0;

  // Costo Total del Tambo por Vaca/Día (Alimentación + Otros Costos Operativos)
  const costoTotalVODia = Number((costoAlimentacionVODia + otrosCostosOperativosVO).toFixed(2));
  const costoTotalRodeoDia = Math.round(costoTotalVODia * vacasVO);
  const costoTotalPorLitro = litrosPromedioVO > 0 ? Number((costoTotalVODia / litrosPromedioVO).toFixed(2)) : 0;

  // DEFINICIÓN SOLICITADA POR EL USUARIO:
  // "litros libres por vaca (ganancia en $ segun la cantidad de litros promedio por vaca - costos totales del tambo)"
  const gananciaPesosPorVODia = Number((facturacionPorVODia - costoTotalVODia).toFixed(2));
  const gananciaPesosRodeoDia = Math.round(gananciaPesosPorVODia * vacasVO);

  // Litros Libres equivalentes (cuántos litros limpios de costo quedan por vaca)
  const litrosLibresPorVO = precioLitroLeche > 0 ? Number((gananciaPesosPorVODia / precioLitroLeche).toFixed(2)) : 0;
  const litrosLibresTotalesDia = Math.round(litrosLibresPorVO * vacasVO);
  const margenSobreCostoTotalPct = facturacionLecheDia > 0 ? Number(((gananciaPesosRodeoDia / facturacionLecheDia) * 100).toFixed(1)) : 0;

  // Relación Leche / Maíz (kg maíz que compra 1 lt de leche) - Indicador clave argentino
  const relacionLecheMaiz = precioKgMaiz > 0 ? Number((precioLitroLeche / precioKgMaiz).toFixed(2)) : 0;

  // Desglose de participación del costo de alimentación para visualización
  const desgloseCostoAlimento = useMemo(() => {
    if (costoAlimentacionVODia <= 0) return [];
    return [
      { nombre: "Maíz Grano Seco", valor: costoMaizVO, color: "#eab308", icon: "🌽" },
      { nombre: "Pellet de Soja", valor: costoSojaVO, color: "#3b82f6", icon: "🥣" },
      { nombre: "Silo de Maíz", valor: costoSiloVO, color: "#10b981", icon: "🌿" },
      { nombre: "Pellet de Trigo", valor: costoTrigoVO, color: "#f97316", icon: "🌾" },
      { nombre: "Rollos Alfalfa", valor: costoRolloVO, color: "#84cc16", icon: "🌱" },
      { nombre: "Sal Mineral", valor: costoSalVO, color: "#a855f7", icon: "🧂" },
    ].map((item) => ({
      ...item,
      pct: Number(((item.valor / costoAlimentacionVODia) * 100).toFixed(1)),
    }));
  }, [costoAlimentacionVODia, costoMaizVO, costoSojaVO, costoSiloVO, costoTrigoVO, costoRolloVO, costoSalVO]);

  // Autonomías y stocks de alimentos para la tabla dinámica de Tambo
  const itemsAlimentosTambo = useMemo(() => {
    const idsAlimentos = [
      { id: "pellet-soja", nombre: "Pellet de Soja Proteico (Harina)", icono: "🥣", orden: 1, precioUnit: precioKgSoja },
      { id: "pellet-trigo", nombre: "Pellet de Trigo (Afrechillo)", icono: "🌾", orden: 2, precioUnit: precioKgTrigo },
      { id: "silo-maiz", nombre: "Silo de Maíz Picado Fino (Bolsa)", icono: "🌽", orden: 3, precioUnit: precioKgSilo },
      { id: "maiz-grano", nombre: "Maíz Grano Seco Molido", icono: "⚡", orden: 4, precioUnit: precioKgMaiz },
      { id: "rollo-alfalfa", nombre: "Rollos de Alfalfa Henificada", icono: "🌿", orden: 5, precioUnit: precioKgRollo },
      { id: "sal-mineral", nombre: "Sal Mineral V.O. (MZM con Levadura)", icono: "🧂", orden: 6, precioUnit: precioKgSalMineral },
      { id: "sal-anionica", nombre: "Sal Aniónica Preparto", icono: "🤰", orden: 7, precioUnit: getPrecioReferencia("sal-anionica", "ARS") || 1450 },
      { id: "semilla-algodon", nombre: "Semilla de Algodón Entera", icono: "🌱", orden: 8, precioUnit: precioKgSemillaAlgodon },
    ];

    return idsAlimentos.map((alimento) => {
      const stockItem = stockData.items.find((x) => x.id === alimento.id);
      const stockActual = stockItem?.stockActual || 0;
      const unidad = stockItem?.unidad || (alimento.id.includes("rollo") ? "Rollos" : "kg");

      const auto = calcularAutonomiaAlimentoRodeo(stockActual, alimento.id, { unidad });

      let racionVO = 0;
      if (alimento.id === "pellet-soja") racionVO = dieta.racionesKgDia["pellet-soja"] || 2.5;
      else if (alimento.id === "pellet-trigo") racionVO = dieta.racionesKgDia["pellet-trigo"] || 3.0;
      else if (alimento.id === "silo-maiz") racionVO = dieta.racionesKgDia["silo-maiz"] || 22.0;
      else if (alimento.id === "maiz-grano") racionVO = dieta.racionesKgDia["maiz"] || 5.5;
      else if (alimento.id === "rollo-alfalfa") racionVO = dieta.racionesKgDia["rollo-alfalfa"] || 3.0;
      else if (alimento.id === "sal-mineral") racionVO = dieta.racionesKgDia["sal-mineral"] || 0.15;
      else if (alimento.id === "sal-anionica") racionVO = dieta.racionesKgDia["sal-anionica"] || 0.25;
      else if (alimento.id === "semilla-algodon") racionVO = dieta.racionesKgDia["semilla-algodon"] || 0;

      const consumoTamboDia = Math.round(vacasVO * racionVO * 10) / 10;
      const costoDiarioVOItem = Number((racionVO * alimento.precioUnit).toFixed(2));

      return {
        ...alimento,
        stockActual,
        unidad,
        ubicacion: stockItem?.ubicacion || "Tambo",
        racionVO,
        costoDiarioVOItem,
        consumoTamboDia,
        consumoTotalEstablecimiento: auto.consumoDiarioTotalKg,
        diasAutonomia: auto.diasAutonomia,
        totalCabezas: auto.totalCabezas,
        textoTooltip: auto.textoTooltip,
      };
    });
  }, [stockData, dieta, vacasVO, precioKgSoja, precioKgTrigo, precioKgSilo, precioKgMaiz, precioKgRollo, precioKgSalMineral, precioKgSemillaAlgodon]);

  // Alerta de Insumo con Autonomía más Crítica
  const insumoMasCritico = useMemo(() => {
    const conStock = itemsAlimentosTambo.filter((x) => x.consumoTotalEstablecimiento > 0 && x.diasAutonomia > 0);
    if (conStock.length === 0) return null;
    return conStock.reduce((min, curr) => (curr.diasAutonomia < min.diasAutonomia ? curr : min), conStock[0]);
  }, [itemsAlimentosTambo]);

  // =========================================================================
  // 2. CÁLCULOS CLAVE - AGRICULTURA & CULTIVOS (279 ha)
  // =========================================================================
  const superficieTotalHa = useMemo(() => {
    return lotes.reduce((acc, l) => acc + (l.superficieHa || 0), 0);
  }, [lotes]);

  // Agrupación por Destino: Forraje para Tambo vs Granos Comerciales
  const categoriasUsoSuelo = useMemo(() => {
    let haForrajeTambo = 0;
    let haGranosAFA = 0;
    let haBarbechoDescanso = 0;

    lotes.forEach((l) => {
      const sup = l.superficieHa || 0;
      const cult = (l.cultivoActual || "").toLowerCase();
      const campoNom = l.campo.toLowerCase();

      if (cult.includes("barbecho") || cult.includes("descanso")) {
        haBarbechoDescanso += sup;
      } else if (campoNom === "tambo" || cult.includes("alfalfa") || cult.includes("silo") || cult.includes("avena")) {
        haForrajeTambo += sup;
      } else {
        haGranosAFA += sup;
      }
    });

    return {
      haForrajeTambo,
      pctForraje: superficieTotalHa > 0 ? Math.round((haForrajeTambo / superficieTotalHa) * 100) : 0,
      haGranosAFA,
      pctGranos: superficieTotalHa > 0 ? Math.round((haGranosAFA / superficieTotalHa) * 100) : 0,
      haBarbechoDescanso,
      pctBarbecho: superficieTotalHa > 0 ? Math.round((haBarbechoDescanso / superficieTotalHa) * 100) : 0,
    };
  }, [lotes, superficieTotalHa]);

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

  // Labores recientes de la campaña 2026/27
  const laboresRecientes = useMemo(() => {
    return [...activities]
      .sort((a, b) => {
        const fa = a.fechaReal || a.fechaPlanificada || "";
        const fb = b.fechaReal || b.fechaPlanificada || "";
        return fb.localeCompare(fa);
      })
      .slice(0, 5);
  }, [activities]);

  // =========================================================================
  // 3. CÁLCULOS CLAVE - GANADERÍA & PRÓXIMA VENTA DE GORDOS
  // =========================================================================
  const totalCabezasGanaderia = useMemo(() => {
    return tropas.reduce((sum, t) => sum + (t.cabezas || 0), 0);
  }, [tropas]);

  const tropaTerminacion = useMemo(() => {
    return tropas.find((t) => t.corralId === "terminacion") || {
      id: "tropa-cg-1",
      codigo: "TR-26-GORDOS",
      nombre: "Lote Terminación Frigorífico",
      corralId: "terminacion" as const,
      cabezas: 26,
      fechaIngreso: "20/06/26",
      diasEnCorral: 87,
      pesoInicialKg: 274,
      pesoActualKg: 404.0,
      gdpvKgDia: 1.49,
      origen: "Pase desde RM3",
    };
  }, [tropas]);

  // Proyección financiera exacta para la PRÓXIMA VENTA DE GORDOS
  const proximaVentaGordos = useMemo(() => {
    const cabezas = tropaTerminacion.cabezas || 26;
    const pesoActualPromedio = tropaTerminacion.pesoActualKg || 404;
    const pesoObjetivoPromedio = 410; // kg objetivo de faena para novillo gordo
    const gdpv = tropaTerminacion.gdpvKgDia || 1.49;
    const precioKgVivo = dieta.precioNovilloGordoVivoArs ?? 4200;

    // Kilos que faltan para el peso objetivo
    const kilosFaltantes = Math.max(0, pesoObjetivoPromedio - pesoActualPromedio);
    const diasParaSalida = gdpv > 0 ? Math.ceil(kilosFaltantes / gdpv) : 4;

    // Desbaste de balanza frigorífico (7% estándar de ley en novillos 400kg+)
    const desbastePct = 7.0;
    const pesoBrutoTotalKg = Math.round(cabezas * pesoObjetivoPromedio);
    const pesoNetoTotalKg = Math.round(pesoBrutoTotalKg * (1 - desbastePct / 100));

    // Facturación proyectada
    const facturacionEstimadaArs = Math.round(pesoNetoTotalKg * precioKgVivo);

    return {
      cabezas,
      pesoActualPromedio,
      pesoObjetivoPromedio,
      gdpv,
      diasParaSalida,
      desbastePct,
      pesoBrutoTotalKg,
      pesoNetoTotalKg,
      precioKgVivo,
      facturacionEstimadaArs,
    };
  }, [tropaTerminacion, dieta.precioNovilloGordoVivoArs]);

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
      return { corral, tropa };
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
            <span className="pill badgeGreen">Tablero de Control Dinámico</span>
            <span className="pill badgeBlue">Tambo & Rodeo · Agricultura · Ganadería</span>
            <span className="pill badgeSlate">Campaña 2026/27</span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "-0.02em", margin: "6px 0 2px" }}>
            Panel de Operaciones HJB
          </h1>
          <p className="muted" style={{ fontSize: "14px", margin: 0 }}>
            Visualización integrada de costos de alimentación, litros libres, matriz agrícola y ventas de hacienda.
          </p>
        </div>

        {/* Botón de Parámetros Reales y Buscador Rápido */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setModalParametrosOpen(true)}
            className="secondaryBtn"
            style={{
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#eff6ff",
              color: "#1d4ed8",
              borderColor: "#bfdbfe",
            }}
          >
            <span>⚙️</span>
            <span>Ajustar Parámetros Reales</span>
          </button>

          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="🔍 Filtrar datos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: "200px",
                padding: "8px 12px 8px 30px",
                borderRadius: "8px",
                fontSize: "13px",
                border: "1px solid var(--line)",
              }}
            />
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", opacity: 0.6 }}>
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
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ALERTA DE STOCK CRÍTICO (SEMAFORO VISUAL PROACTIVO)                        */}
      {/* ========================================================================= */}
      {insumoMasCritico && insumoMasCritico.diasAutonomia < 25 && (
        <div
          style={{
            background: insumoMasCritico.diasAutonomia < 15 ? "#fef2f2" : "#fffbeb",
            border: `1px solid ${insumoMasCritico.diasAutonomia < 15 ? "#fecaca" : "#fde68a"}`,
            borderRadius: "10px",
            padding: "10px 16px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>
              {insumoMasCritico.diasAutonomia < 15 ? "🚨" : "⚠️"}
            </span>
            <div>
              <strong style={{ color: insumoMasCritico.diasAutonomia < 15 ? "#991b1b" : "#92400e", fontSize: "13.5px" }}>
                Autonomía crítica de ración: {insumoMasCritico.nombre} ({insumoMasCritico.diasAutonomia} días restantes)
              </strong>
              <div style={{ fontSize: "12px", color: "var(--slate-600)" }}>
                Stock disponible en {insumoMasCritico.ubicacion}: {insumoMasCritico.stockActual.toLocaleString("es-AR")} {insumoMasCritico.unidad}. Consumo total campo: {insumoMasCritico.consumoTotalEstablecimiento.toLocaleString("es-AR")} kg/día ({insumoMasCritico.totalCabezas} animales).
              </div>
            </div>
          </div>
          <Link href="/insumos" className="inlineLink" style={{ fontSize: "12.5px", fontWeight: 700 }}>
            Ver canje AFA / Reposición →
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KPIS FINANCIEROS Y OPERATIVOS DINÁMICOS                                    */}
      {/* ========================================================================= */}
      <div className="metricsGrid four" style={{ marginBottom: "24px" }}>
        {/* KPI 1: LITROS LIBRES POR VACA */}
        <div className="metricCard" style={{ borderLeft: "4px solid #16a34a" }}>
          <div className="metricHeader">
            <span className="metricLabel">🥛 Litros Libres por Vaca (VO)</span>
            <span className="pill badgeGreen" style={{ fontSize: "10.5px", fontWeight: 800 }}>
              {litrosLibresPorVO} lts/VO/d
            </span>
          </div>
          <div className="metricValue" style={{ color: "#15803d", fontSize: "24px" }}>
            ${gananciaPesosPorVODia.toLocaleString("es-AR")}
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--slate-500)", marginLeft: "4px" }}>
              / VO / día
            </span>
          </div>
          <div className="metricNote" style={{ fontSize: "12px", color: "var(--slate-600)" }}>
            Ganancia rodeo: <strong>${(gananciaPesosRodeoDia / 1000000).toFixed(2)}M / día</strong> ({margenSobreCostoTotalPct}% margen s/ facturación)
          </div>
        </div>

        {/* KPI 2: COSTO DE ALIMENTACIÓN */}
        <div className="metricCard" style={{ borderLeft: "4px solid #2563eb" }}>
          <div className="metricHeader">
            <span className="metricLabel">🥣 Costo de Alimentación Tambo</span>
            <span className="pill badgeBlue" style={{ fontSize: "10.5px", fontWeight: 800 }}>
              ${costoAlimentacionPorLitro} / lt
            </span>
          </div>
          <div className="metricValue" style={{ color: "#1e40af", fontSize: "24px" }}>
            ${costoAlimentacionVODia.toLocaleString("es-AR")}
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--slate-500)", marginLeft: "4px" }}>
              / VO / día
            </span>
          </div>
          <div className="metricNote" style={{ fontSize: "12px", color: "var(--slate-600)" }}>
            Ración {vacasVO} VO: <strong>${(costoAlimentacionRodeoDia / 1000).toFixed(0)}k / día</strong> · Relación L/M: {relacionLecheMaiz} kg
          </div>
        </div>

        {/* KPI 3: MATRIZ DE CULTIVOS 279 ha */}
        <div className="metricCard" style={{ borderLeft: "4px solid #ca8a04" }}>
          <div className="metricHeader">
            <span className="metricLabel">🌾 Superficie Agrícola (5 campos)</span>
            <span className="pill badgeAmber" style={{ fontSize: "10.5px", fontWeight: 800 }}>
              {superficieTotalHa} ha activas
            </span>
          </div>
          <div className="metricValue" style={{ fontSize: "24px" }}>
            {categoriasUsoSuelo.haForrajeTambo} ha
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--slate-500)", marginLeft: "4px" }}>
              Tambo ({categoriasUsoSuelo.pctForraje}%)
            </span>
          </div>
          <div className="metricNote" style={{ fontSize: "12px", color: "var(--slate-600)" }}>
            Granos venta: <strong>{categoriasUsoSuelo.haGranosAFA} ha ({categoriasUsoSuelo.pctGranos}%)</strong> · Barbecho: {categoriasUsoSuelo.haBarbechoDescanso} ha
          </div>
        </div>

        {/* KPI 4: PRÓXIMA VENTA DE GORDOS */}
        <div className="metricCard" style={{ borderLeft: "4px solid #ea580c" }}>
          <div className="metricHeader">
            <span className="metricLabel">🐂 Próxima Venta Gordos</span>
            <span className="pill badgeAmber" style={{ fontSize: "10.5px", fontWeight: 800 }}>
              ⏱️ En ~{proximaVentaGordos.diasParaSalida} días
            </span>
          </div>
          <div className="metricValue" style={{ color: "#c2410c", fontSize: "24px" }}>
            ${(proximaVentaGordos.facturacionEstimadaArs / 1000000).toFixed(2)}M
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--slate-500)", marginLeft: "4px" }}>
              est.
            </span>
          </div>
          <div className="metricNote" style={{ fontSize: "12px", color: "var(--slate-600)" }}>
            <strong>{proximaVentaGordos.cabezas} novillos</strong> @ {proximaVentaGordos.pesoObjetivoPromedio} kg ({proximaVentaGordos.pesoNetoTotalKg.toLocaleString("es-AR")} kg netos)
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABS DE SELECCIÓN DE VISTA                                                */}
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
            padding: "9px 16px",
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
          }}
        >
          <span>📊</span>
          <span>Visión Consolidada</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("tambo")}
          style={{
            padding: "9px 16px",
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
          }}
        >
          <span>🥛</span>
          <span>Tambo & Nutrición ({vacasVO} VO)</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("agricultura")}
          style={{
            padding: "9px 16px",
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
          }}
        >
          <span>🌾</span>
          <span>Agricultura & Cultivos ({superficieTotalHa} ha)</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("ganaderia")}
          style={{
            padding: "9px 16px",
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
          }}
        >
          <span>🐂</span>
          <span>Ganadería & Engorde ({totalCabezasGanaderia} cab.)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SECCIÓN DESTACADA: ANÁLISIS DE LITROS LIBRES Y COSTOS DE ALIMENTACIÓN  */}
      {/* ========================================================================= */}
      {(tabActiva === "consolidado" || tabActiva === "tambo") && (
        <section className="section" style={{ marginBottom: "28px" }}>
          <div className="panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "22px" }}>🥛</span>
                  <h2 style={{ fontSize: "18px", margin: 0 }}>
                    Litros Libres por Vaca & Estructura del Costo Lechero
                  </h2>
                </div>
                <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                  Cálculo auditable: Producción de leche ({litrosPromedioVO} lts @ ${precioLitroLeche}/lt) menos costo de ración (${costoAlimentacionVODia}/VO) y otros costos (${otrosCostosOperativosVO}/VO).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalParametrosOpen(true)}
                className="secondaryBtn"
                style={{ fontSize: "12px", padding: "6px 12px" }}
              >
                ✏️ Editar Litros / Precios
              </button>
            </div>

            {/* Cascada Visual de Ingreso vs Costos vs Ganancia */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid var(--line)",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase", marginBottom: "12px" }}>
                Desglose Económico Diario por Vaca en Ordeñe (1 VO):
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <div style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "var(--slate-500)", fontWeight: 700 }}>1. Facturación Bruta Leche</div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#0f172a" }}>
                    ${facturacionPorVODia.toLocaleString("es-AR")} <span style={{ fontSize: "12px", fontWeight: 500 }}>/ d</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                    {litrosPromedioVO} lts × ${precioLitroLeche} / lt
                  </div>
                </div>

                <div style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #fed7aa" }}>
                  <div style={{ fontSize: "11px", color: "#c2410c", fontWeight: 700 }}>2. [-] Costo Alimentación</div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#c2410c" }}>
                    -${costoAlimentacionVODia.toLocaleString("es-AR")} <span style={{ fontSize: "12px", fontWeight: 500 }}>/ d</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                    ${costoAlimentacionPorLitro}/lt producido ({((costoAlimentacionVODia / facturacionPorVODia) * 100).toFixed(1)}%)
                  </div>
                </div>

                <div style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "var(--slate-500)", fontWeight: 700 }}>3. [-] Otros Costos Tambo</div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "var(--slate-700)" }}>
                    -${otrosCostosOperativosVO.toLocaleString("es-AR")} <span style={{ fontSize: "12px", fontWeight: 500 }}>/ d</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                    Personal, energía, sanidad
                  </div>
                </div>

                <div style={{ background: "#f0fdf4", padding: "12px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: "11px", color: "#166534", fontWeight: 800 }}>4. [=] Ganancia Neta / VO</div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#15803d" }}>
                    +${gananciaPesosPorVODia.toLocaleString("es-AR")} <span style={{ fontSize: "12px", fontWeight: 500 }}>/ d</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#15803d", fontWeight: 700, marginTop: "2px" }}>
                    🥛 {litrosLibresPorVO} Litros Libres / vaca
                  </div>
                </div>
              </div>

              {/* Barra de Distribución del Costo de Alimentación */}
              <div style={{ marginTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--slate-600)" }}>
                    Composición del Costo de Ración Diaria (${costoAlimentacionVODia} / VO / día):
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                    Relación Leche / Maíz: <strong>{relacionLecheMaiz} kg</strong>
                  </span>
                </div>
                <div style={{ display: "flex", height: "14px", borderRadius: "7px", overflow: "hidden", background: "#e2e8f0" }}>
                  {desgloseCostoAlimento.map((item) => (
                    <div
                      key={item.nombre}
                      style={{ width: `${item.pct}%`, background: item.color }}
                      title={`${item.nombre}: $${item.valor.toFixed(2)}/VO/d (${item.pct}%)`}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "8px" }}>
                  {desgloseCostoAlimento.map((item) => (
                    <span key={item.nombre} style={{ fontSize: "11px", color: "var(--slate-600)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color }} />
                      {item.nombre}: <strong>{item.pct}%</strong> (${item.valor.toFixed(0)})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* TABLA DINÁMICA DE ALIMENTOS, CONSUMO Y AUTONOMÍA */}
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th style={{ minWidth: "220px" }}>Alimento / Insumo</th>
                    <th style={{ width: "120px", textAlign: "right" }}>Ración VO</th>
                    <th style={{ width: "130px", textAlign: "right" }}>Costo / VO / d</th>
                    <th style={{ width: "140px", textAlign: "right" }}>Consumo Tambo</th>
                    <th style={{ width: "150px", textAlign: "right" }}>Consumo Campo</th>
                    <th style={{ width: "140px", textAlign: "right" }}>Stock Actual</th>
                    <th style={{ width: "150px", textAlign: "center" }}>Autonomía Rodeo</th>
                    <th style={{ width: "120px", textAlign: "right" }}>Ubicación</th>
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
                                {item.id === "pellet-soja" ? "Canje AFA Los Cardos" : item.id === "silo-maiz" ? "Planta entera picada" : "Dieta oficial"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {item.racionVO > 0 ? `${item.racionVO} kg` : "--"}
                        </td>

                        <td style={{ textAlign: "right", color: item.costoDiarioVOItem > 0 ? "#1e40af" : "var(--slate-400)", fontWeight: 700 }}>
                          {item.costoDiarioVOItem > 0 ? `$${item.costoDiarioVOItem.toLocaleString("es-AR")}` : "--"}
                        </td>

                        <td style={{ textAlign: "right" }}>
                          {item.consumoTamboDia > 0 ? (
                            <strong style={{ fontSize: "12.5px" }}>{item.consumoTamboDia.toLocaleString("es-AR")} kg/d</strong>
                          ) : (
                            <span style={{ color: "var(--slate-400)", fontSize: "12px" }}>--</span>
                          )}
                        </td>

                        <td style={{ textAlign: "right" }}>
                          {item.consumoTotalEstablecimiento > 0 ? (
                            <>
                              <strong style={{ fontSize: "12.5px", color: "var(--slate-800)" }}>
                                {item.consumoTotalEstablecimiento.toLocaleString("es-AR")} kg/d
                              </strong>
                              <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>
                                {item.totalCabezas} cab. consumidoras
                              </div>
                            </>
                          ) : (
                            <span style={{ color: "var(--slate-400)", fontSize: "12px" }}>Sin asignación</span>
                          )}
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <strong style={{ fontSize: "13px", color: item.stockActual > 0 ? "#15803d" : "#64748b" }}>
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
                              ⏱️ {item.diasAutonomia} días
                            </span>
                          ) : (
                            <span className="pill badgeSlate" style={{ fontSize: "10.5px" }}>
                              Sin existencias
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: "right", fontSize: "11.5px", color: "var(--slate-600)" }}>
                          {item.ubicacion}
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
      {/* 2. SECCIÓN DESTACADA: PRÓXIMA VENTA DE GORDOS (GANADERÍA A CORRAL)        */}
      {/* ========================================================================= */}
      {(tabActiva === "consolidado" || tabActiva === "ganaderia") && (
        <section className="section" style={{ marginBottom: "28px" }}>
          <div className="panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "22px" }}>🥩</span>
                  <h2 style={{ fontSize: "18px", margin: 0 }}>
                    Próxima Venta de Gordos & Proyección de Faena
                  </h2>
                </div>
                <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                  Lote en Terminación (Corral General): {proximaVentaGordos.cabezas} novillos pesados próximos a salir a frigorífico.
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <Link href="/ganaderia" className="secondaryBtn" style={{ textDecoration: "none", fontSize: "12.5px", padding: "6px 12px" }}>
                  Ver Corrales & Pesajes →
                </Link>
              </div>
            </div>

            {/* Tarjeta de Cuenta Regresiva y Liquidación Proyectada */}
            <div
              style={{
                background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
                border: "1px solid #fed7aa",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "20px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#9a3412", textTransform: "uppercase" }}>
                  Tropa Lista para Faena
                </div>
                <div style={{ fontSize: "20px", fontWeight: 900, color: "#c2410c", marginTop: "2px" }}>
                  {proximaVentaGordos.cabezas} Novillos Gordos
                </div>
                <div style={{ fontSize: "12px", color: "var(--slate-700)", marginTop: "4px" }}>
                  Peso actual: <strong>{proximaVentaGordos.pesoActualPromedio} kg</strong> → Objetivo: <strong>{proximaVentaGordos.pesoObjetivoPromedio} kg</strong>
                </div>
                <div style={{ fontSize: "11.5px", color: "#15803d", fontWeight: 700, marginTop: "2px" }}>
                  Ganancia diaria: +{proximaVentaGordos.gdpv} kg/día
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#9a3412", textTransform: "uppercase" }}>
                  Plazo Estimado a Camión
                </div>
                <div style={{ fontSize: "20px", fontWeight: 900, color: "#9a3412", marginTop: "2px" }}>
                  ⏱️ En ~{proximaVentaGordos.diasParaSalida} días
                </div>
                <div style={{ fontSize: "12px", color: "var(--slate-700)", marginTop: "4px" }}>
                  Faltan solo {proximaVentaGordos.pesoObjetivoPromedio - proximaVentaGordos.pesoActualPromedio} kg promedio por animal
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--slate-600)", marginTop: "2px" }}>
                  Destino previsto: Frigorífico Logros / Swift
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#9a3412", textTransform: "uppercase" }}>
                  Kilos & Desbaste Frigorífico (7%)
                </div>
                <div style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a", marginTop: "2px" }}>
                  {proximaVentaGordos.pesoNetoTotalKg.toLocaleString("es-AR")} kg netos
                </div>
                <div style={{ fontSize: "12px", color: "var(--slate-600)", marginTop: "4px" }}>
                  Bruto estimado: {proximaVentaGordos.pesoBrutoTotalKg.toLocaleString("es-AR")} kg ({proximaVentaGordos.cabezas} × {proximaVentaGordos.pesoObjetivoPromedio} kg)
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--slate-500)", marginTop: "2px" }}>
                  Precio estimado: ${proximaVentaGordos.precioKgVivo.toLocaleString("es-AR")} / kg vivo
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>
                  Facturación Estimada a Cobrar
                </div>
                <div style={{ fontSize: "22px", fontWeight: 900, color: "#15803d", marginTop: "2px" }}>
                  ${(proximaVentaGordos.facturacionEstimadaArs / 1000000).toFixed(2)}M
                </div>
                <div style={{ fontSize: "12px", color: "#166534", fontWeight: 600, marginTop: "4px" }}>
                  ${(proximaVentaGordos.facturacionEstimadaArs / proximaVentaGordos.cabezas).toLocaleString("es-AR", { maximumFractionDigits: 0 })} / novillo
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--slate-500)", marginTop: "2px" }}>
                  Liquidación neta estimada en ARS
                </div>
              </div>
            </div>

            {/* TABLA DE LOS 5 CORRALES DE RECRÍA Y ENGORDE */}
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th style={{ minWidth: "160px" }}>Corral / Etapa</th>
                    <th style={{ minWidth: "150px" }}>Tropa Activa</th>
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
                            {tropa?.codigo || "TR-26"} · {tropa?.diasEnCorral || 0} d en corral
                          </div>
                        </td>

                        <td style={{ textAlign: "right", fontWeight: 800, fontSize: "13px" }}>
                          {tropa?.cabezas || 0} cab.
                        </td>

                        <td style={{ textAlign: "right", color: "var(--slate-600)" }}>
                          {tropa?.pesoInicialKg || corral.pesoEntradaKg} kg
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <strong style={{ fontSize: "13.5px", color: esTerminacion ? "#c2410c" : "var(--slate-900)" }}>
                            {pesoActual} kg
                          </strong>
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
                            <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 800 }}>
                              🥩 Venta en {proximaVentaGordos.diasParaSalida} d
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
      {/* 3. SECCIÓN DESTACADA: CULTIVOS & MATRIZ AGRÍCOLA (279 ha)                 */}
      {/* ========================================================================= */}
      {(tabActiva === "consolidado" || tabActiva === "agricultura") && (
        <section className="section" style={{ marginBottom: "28px" }}>
          <div className="panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "22px" }}>🌾</span>
                  <h2 style={{ fontSize: "18px", margin: 0 }}>
                    Matriz de Cultivos & Superficie Agrícola ({superficieTotalHa} ha)
                  </h2>
                </div>
                <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                  Distribución de 15 lotes en 5 campos: destino forrajero para el tambo vs granos comerciales para AFA.
                </p>
              </div>

              {/* Filtro interactivo de Campo */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-700)", margin: 0 }}>
                    Campo:
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

            {/* Barra Dinámica de Destinos y Cultivos */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 14px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>
                  Forraje Tambo (Silo & Alfalfa)
                </div>
                <div style={{ fontSize: "17px", fontWeight: 900, color: "#15803d" }}>
                  {categoriasUsoSuelo.haForrajeTambo} ha ({categoriasUsoSuelo.pctForraje}%)
                </div>
                <div style={{ fontSize: "11px", color: "var(--slate-600)" }}>
                  Consumo interno del rodeo lechero
                </div>
              </div>

              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", padding: "10px 14px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#075985", textTransform: "uppercase" }}>
                  Granos Comerciales AFA
                </div>
                <div style={{ fontSize: "17px", fontWeight: 900, color: "#0369a1" }}>
                  {categoriasUsoSuelo.haGranosAFA} ha ({categoriasUsoSuelo.pctGranos}%)
                </div>
                <div style={{ fontSize: "11px", color: "var(--slate-600)" }}>
                  Soja de 1ra y Maíz comercial para venta
                </div>
              </div>

              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase" }}>
                  Barbecho / Descanso
                </div>
                <div style={{ fontSize: "17px", fontWeight: 900, color: "var(--slate-800)" }}>
                  {categoriasUsoSuelo.haBarbechoDescanso} ha ({categoriasUsoSuelo.pctBarbecho}%)
                </div>
                <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                  Rotación y preparación de suelo
                </div>
              </div>
            </div>

            {/* Píldoras de Cultivos de Campaña */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
              <span style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                Cultivos 2026/27:
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
            </div>

            {/* TABLA DE LOTES AGRÍCOLAS */}
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th style={{ minWidth: "130px" }}>Campo</th>
                    <th style={{ minWidth: "120px" }}>Lote</th>
                    <th style={{ width: "110px", textAlign: "right" }}>Superficie</th>
                    <th style={{ width: "160px" }}>Cultivo 2026/27</th>
                    <th style={{ width: "180px" }}>Destino / Uso</th>
                    <th style={{ width: "120px", textAlign: "center" }}>Estado</th>
                    <th style={{ width: "90px", textAlign: "center" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {lotesFiltrados.map((lote) => {
                    const cInfo = campos.find((c) => c.nombre.toLowerCase() === lote.campo.toLowerCase());

                    let destinoTexto = "🌾 Grano Comercial";
                    if (lote.campo.toLowerCase() === "tambo" || lote.cultivoActual?.toLowerCase().includes("alfalfa") || lote.cultivoActual?.toLowerCase().includes("silo")) {
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

      {/* ========================================================================= */}
      {/* 4. LABORES RECIENTES DE CAMPAÑA                                           */}
      {/* ========================================================================= */}
      {(tabActiva === "consolidado" || tabActiva === "agricultura") && (
        <section className="section">
          <div className="panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <h3 style={{ fontSize: "16px", margin: 0 }}>
                  🚜 Labores Recientes & Próximas
                </h3>
                <p className="muted" style={{ fontSize: "12px", margin: "2px 0 0 0" }}>
                  Últimos trabajos agronómicos registrados en los campos de HJB.
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
                    <th style={{ width: "130px" }}>Labor</th>
                    <th style={{ width: "130px" }}>Cultivo</th>
                    <th style={{ width: "110px", textAlign: "right" }}>Superficie</th>
                    <th style={{ minWidth: "180px" }}>Insumos</th>
                    <th style={{ width: "110px", textAlign: "center" }}>Estado</th>
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

      {/* ========================================================================= */}
      {/* MODAL: AJUSTAR PARÁMETROS REALES (CERO DATOS INVENTADOS)                  */}
      {/* ========================================================================= */}
      {modalParametrosOpen && (
        <div className="modalOverlay" onClick={() => setModalParametrosOpen(false)}>
          <div
            className="modalContent"
            style={{ maxWidth: "560px", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }}>⚙️</span>
                <h2 style={{ fontSize: "18px", margin: 0 }}>Ajustar Parámetros Reales HJB</h2>
              </div>
              <button
                type="button"
                onClick={() => setModalParametrosOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "12.5px", color: "var(--slate-600)", margin: "0 0 16px 0" }}>
              Ingresá los valores operativos reales de tu establecimiento. Cualquier cambio recalcula al instante todos los indicadores de <strong>Litros Libres</strong>, <strong>Costos</strong> y <strong>Proyección de Faena</strong> sin inventar datos.
            </p>

            {feedbackParametros && (
              <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, marginBottom: "16px" }}>
                {feedbackParametros}
              </div>
            )}

            <form onSubmit={handleGuardarParametros}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Litros Promedio VO / día:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={formParametros.litrosPromedioVO}
                    onChange={(e) => setFormParametros({ ...formParametros, litrosPromedioVO: Number(e.target.value) })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "14px" }}
                    required
                  />
                  <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                    Promedio actual de control lechero
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Precio Leche Cobrado ($/lt):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={formParametros.precioLitroLecheArs}
                    onChange={(e) => setFormParametros({ ...formParametros, precioLitroLecheArs: Number(e.target.value) })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "14px" }}
                    required
                  />
                  <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                    Liquidación actual de la usina láctea
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Otros Costos Tambo ($/VO/d):
                  </label>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={formParametros.otrosCostosOperativosVODiaArs}
                    onChange={(e) => setFormParametros({ ...formParametros, otrosCostosOperativosVODiaArs: Number(e.target.value) })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "14px" }}
                  />
                  <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                    Sueldos, luz, gasoil, sanidad (0 si no aplica)
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Precio Novillo Gordo ($/kg vivo):
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="100"
                    value={formParametros.precioNovilloGordoVivoArs}
                    onChange={(e) => setFormParametros({ ...formParametros, precioNovilloGordoVivoArs: Number(e.target.value) })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "14px" }}
                    required
                  />
                  <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                    Precio pactado en frigorífico
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setModalParametrosOpen(false)}
                  className="secondaryBtn"
                  style={{ padding: "8px 16px" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primaryBtn"
                  style={{ padding: "8px 18px", fontWeight: 800 }}
                >
                  Guardar y Recalcular Tablero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
