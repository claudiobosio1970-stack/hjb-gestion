"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  getStockActualInsumos,
  getDietaTambo,
  saveDietaTambo,
  DietaTamboConfig,
  HJB_DIETA_SYNC_EVENT,
  HJB_STOCK_SYNC_EVENT,
} from "@/lib/stockInsumosData";
import {
  agricultureData,
  Lote,
  HJB_AGRICULTURE_SYNC_EVENT,
} from "@/lib/agricultureData";
import {
  getCorrales,
  getTropas,
  DefinicionCorral,
  TropaGanadera,
  NovilloTerminacion,
  getNovillosTerminacion,
  toggleConfirmacionNovillo,
  confirmarListaNovillos,
  HJB_NOVILLOS_CONFIRMADOS_EVENT,
} from "@/lib/ganaderiaData";
import { getPrecioReferencia } from "@/lib/valoresMovilesData";
import {
  getDelProConfig,
  DelProConfig,
  HJB_DELPRO_SYNC_EVENT,
  importarPayloadDesdeJson,
  DELPRO_SQL_QUERIES_SAMPLE,
  DELPRO_CONFIG_DEFAULT,
} from "@/lib/delproData";

type TabDelProModal = "sql_extractor" | "resumen" | "queries";

const OPCIONES_DESTINO_MAIZ = [
  {
    id: "a_definir",
    label: "⏳ A definir a cosecha",
    detalle: "Se decide a cosecha: Venta AFA o Consumo Tambo/Feedlot",
    badgeBg: "#fef3c7",
    badgeColor: "#92400e",
    border: "#f59e0b",
  },
  {
    id: "venta_afa",
    label: "🌾 Venta Comercial (AFA Los Cardos)",
    detalle: "100% entrega comercial a acopio AFA",
    badgeBg: "#e0e7ff",
    badgeColor: "#3730a3",
    border: "#818cf8",
  },
  {
    id: "consumo_tambo",
    label: "🥛 Consumo Tambo (Grano Seco Mixer)",
    detalle: "Molienda para mixer lechero (ahorro compra grano)",
    badgeBg: "#dcfce7",
    badgeColor: "#166534",
    border: "#86efac",
  },
  {
    id: "consumo_feedlot",
    label: "🥩 Consumo Feedlot (Engorde Machos)",
    detalle: "Molienda para corral de novillos en terminación",
    badgeBg: "#fee2e2",
    badgeColor: "#991b1b",
    border: "#fca5a5",
  },
  {
    id: "mixto",
    label: "⚖️ Mixto (50% AFA / 50% Consumo)",
    detalle: "Mitad venta comercial acopio y mitad reserva interna",
    badgeBg: "#f3e8ff",
    badgeColor: "#6b21a8",
    border: "#d8b4fe",
  },
];

export default function InicioPage() {
  // Estados reactivos sincronizados
  const [dieta, setDieta] = useState<DietaTamboConfig>(() => getDietaTambo());
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [corrales, setCorrales] = useState<DefinicionCorral[]>([]);
  const [tropas, setTropas] = useState<TropaGanadera[]>([]);
  const [delproConfig, setDelproConfig] = useState<DelProConfig>(() => getDelProConfig());
  const [novillosTerminacion, setNovillosTerminacion] = useState<NovilloTerminacion[]>(() => getNovillosTerminacion());

  // Destino de Maíz Grano configurable a cosecha por el productor
  const [destinoMaizGrano, setDestinoMaizGrano] = useState<string>("a_definir");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("hjb_destino_maiz_grano");
      if (guardado) setDestinoMaizGrano(guardado);
    }
  }, []);

  function handleCambiarDestinoMaiz(val: string) {
    setDestinoMaizGrano(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("hjb_destino_maiz_grano", val);
    }
  }

  // Modales
  const [modalParametrosOpen, setModalParametrosOpen] = useState(false);
  const [modalDelProOpen, setModalDelProOpen] = useState(false);
  const [modalConfirmarFaenaOpen, setModalConfirmarFaenaOpen] = useState(false);
  const [tabDelProModal, setTabDelProModal] = useState<TabDelProModal>("sql_extractor");
  const [feedbackDelPro, setFeedbackDelPro] = useState<string | null>(null);
  const [copiadoSql, setCopiadoSql] = useState(false);

  const [formParametros, setFormParametros] = useState({
    litrosPromedioVO: 27.0,
    precioLitroLecheArs: 549.0, // Precio real informado por usuario
    costoOperativoLitrosVO: 10.0, // Regla real HJB: 10 litros/VO
    precioNovilloGordoVivoArs: 4200,
  });
  const [feedbackParametros, setFeedbackParametros] = useState<string | null>(null);

  function handleCargarArchivoJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importarPayloadDesdeJson(content);
      if (res.success && res.config) {
        setDelproConfig(res.config);
        cargarTodo();
        setFeedbackDelPro(res.mensaje);
      } else {
        setFeedbackDelPro(`❌ ${res.mensaje}`);
      }
    };
    reader.readAsText(file);
  }

  function handleCopiarSql() {
    navigator.clipboard.writeText(DELPRO_SQL_QUERIES_SAMPLE);
    setCopiadoSql(true);
    setTimeout(() => setCopiadoSql(false), 2000);
  }

  function cargarTodo() {
    const d = getDietaTambo();
    setDieta(d);
    setLotes(agricultureData.listLotes());
    setCorrales(getCorrales());
    setTropas(getTropas());
    setDelproConfig(getDelProConfig());
    setNovillosTerminacion(getNovillosTerminacion());
    setFormParametros({
      litrosPromedioVO: d.litrosPromedioVO ?? 27.0,
      precioLitroLecheArs: d.precioLitroLecheArs ?? 549.0,
      costoOperativoLitrosVO: d.costoOperativoLitrosVO ?? 10.0,
      precioNovilloGordoVivoArs: d.precioNovilloGordoVivoArs ?? 4200,
    });
  }

  useEffect(() => {
    cargarTodo();

    function onSync() {
      cargarTodo();
    }

    function onNovillosSync() {
      setNovillosTerminacion(getNovillosTerminacion());
    }

    window.addEventListener(HJB_DIETA_SYNC_EVENT, onSync);
    window.addEventListener(HJB_STOCK_SYNC_EVENT, onSync);
    window.addEventListener(HJB_AGRICULTURE_SYNC_EVENT, onSync);
    window.addEventListener(HJB_DELPRO_SYNC_EVENT, onSync);
    window.addEventListener(HJB_NOVILLOS_CONFIRMADOS_EVENT, onNovillosSync);

    return () => {
      window.removeEventListener(HJB_DIETA_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_STOCK_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_AGRICULTURE_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_DELPRO_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_NOVILLOS_CONFIRMADOS_EVENT, onNovillosSync);
    };
  }, []);

  function handleGuardarParametros(e: React.FormEvent) {
    e.preventDefault();
    const precioLecheNum = Number(formParametros.precioLitroLecheArs);
    const ltsOpNum = Number(formParametros.costoOperativoLitrosVO);
    const otrosCostosArs = Math.round(ltsOpNum * precioLecheNum);

    const updated = saveDietaTambo({
      litrosPromedioVO: Number(formParametros.litrosPromedioVO),
      precioLitroLecheArs: precioLecheNum,
      costoOperativoLitrosVO: ltsOpNum,
      otrosCostosOperativosVODiaArs: otrosCostosArs,
      precioNovilloGordoVivoArs: Number(formParametros.precioNovilloGordoVivoArs),
      actualizadoPor: "Tablero Inicio (Parámetros Reales HJB)",
    });
    setDieta(updated);
    setFeedbackParametros("✓ Parámetros actualizados y sincronizados con éxito.");
    setTimeout(() => {
      setFeedbackParametros(null);
      setModalParametrosOpen(false);
    }, 1200);
  }

  // =========================================================================
  // 1. CÁLCULOS TAMBO & ECONOMÍA LECHERA (DELAVAL DELPRO)
  // =========================================================================
  const delproDatos = delproConfig.datosSincronizados;
  const vacasVO = delproDatos?.vacasEnOrdeñe || dieta.vacasEnOrdeñe || 187;
  const litrosTotalesDia = delproDatos?.litrosTotalesDia || Math.round(vacasVO * (dieta.litrosPromedioVO ?? 27.0));
  const litrosPromedioVO = vacasVO > 0 ? Number((litrosTotalesDia / vacasVO).toFixed(2)) : (dieta.litrosPromedioVO ?? 27.0);
  const precioLitroLeche = dieta.precioLitroLecheArs ?? 549.0;
  const facturacionLecheDia = Math.round(litrosTotalesDia * precioLitroLeche);
  const facturacionPorVODia = Math.round(litrosPromedioVO * precioLitroLeche);

  // Costo operativo fijado por productor: 10 litros/VO
  const costoOperativoLitrosVO = dieta.costoOperativoLitrosVO ?? 10.0;
  const costoOperativoVODia = Math.round(costoOperativoLitrosVO * precioLitroLeche);
  const costoOperativoRodeoDia = Math.round(costoOperativoVODia * vacasVO);

  // Costo de alimentación formulado en DelPro
  const precioKgSoja = (getPrecioReferencia("pellet-soja", "ARS") || 489700) / 1000;
  const precioKgTrigo = (getPrecioReferencia("pellet-trigo", "ARS") || 235400) / 1000;
  const precioKgSilo = getPrecioReferencia("silo-maiz-kg", "ARS") || 39.1;
  const precioKgMaiz = (getPrecioReferencia("maiz", "ARS") || 295200) / 1000;
  const precioKgRollo = (getPrecioReferencia("rollo-alfalfa", "ARS") || 34500) / 500;
  const precioKgSalMineral = getPrecioReferencia("sal-mineral", "ARS") || 1289.88;

  const raciones = delproDatos?.dietaAsignada;
  const racionSoja = raciones?.pelletSojaKg ?? dieta.racionesKgDia["pellet-soja"] ?? 2.5;
  const racionTrigo = raciones?.pelletTrigoKg ?? dieta.racionesKgDia["pellet-trigo"] ?? 3.0;
  const racionSilo = raciones?.siloMaizKg ?? dieta.racionesKgDia["silo-maiz"] ?? 22.0;
  const racionMaiz = raciones?.maizKg ?? dieta.racionesKgDia["maiz"] ?? 5.5;
  const racionRollo = raciones?.rolloAlfalfaKg ?? dieta.racionesKgDia["rollo-alfalfa"] ?? 3.0;
  const racionSal = raciones?.salMineralGramos != null ? (raciones.salMineralGramos / 1000) : (dieta.racionesKgDia["sal-mineral"] ?? 0.15);

  const costoAlimentacionVODia = Number(
    (
      racionSoja * precioKgSoja +
      racionTrigo * precioKgTrigo +
      racionSilo * precioKgSilo +
      racionMaiz * precioKgMaiz +
      racionRollo * precioKgRollo +
      racionSal * precioKgSalMineral
    ).toFixed(2)
  );
  const costoAlimentacionRodeoDia = Math.round(costoAlimentacionVODia * vacasVO);
  const costoAlimentacionEnLitros = precioLitroLeche > 0 ? Number((costoAlimentacionVODia / precioLitroLeche).toFixed(2)) : 8.77;

  // Costo Total
  const costoTotalVODia = Number((costoAlimentacionVODia + costoOperativoVODia).toFixed(2));
  const costoTotalRodeoDia = Math.round(costoTotalVODia * vacasVO);

  // Litros Libres y Ganancia Neta
  const gananciaPesosPorVODia = Number((facturacionPorVODia - costoTotalVODia).toFixed(2));
  const gananciaPesosRodeoDia = Math.round(gananciaPesosPorVODia * vacasVO);
  const litrosLibresPorVO = precioLitroLeche > 0 ? Number((gananciaPesosPorVODia / precioLitroLeche).toFixed(2)) : 8.23;
  const margenNetoPct = facturacionLecheDia > 0 ? Number(((gananciaPesosRodeoDia / facturacionLecheDia) * 100).toFixed(1)) : 30.5;

  // =========================================================================
  // 2. CÁLCULOS AGRICULTURA — MATRIZ REAL AUDITADA (279 ha · 142 ha de MAÍZ)
  // =========================================================================
  const superficieTotalHa = 279;
  const opcionMaizActual = OPCIONES_DESTINO_MAIZ.find((o) => o.id === destinoMaizGrano) || OPCIONES_DESTINO_MAIZ[0];

  const matrizAgricola = [
    {
      cultivo: "Maíz Grano",
      lotes: "Racca L2 (50 ha), Kitty (29 ha), Aguilera (20 ha)",
      destino: opcionMaizActual.label,
      ha: 99,
      pct: 35.5,
      estado: "Campaña gruesa · Selección a cosecha",
      tipo: "maiz_grano",
      esMaiz: true,
    },
    {
      cultivo: "Maíz Forrajero (Silo / Picado)",
      lotes: "Tambo L1 (7 ha), L2 (10 ha), L3 (11 ha), L4 (5 ha), L7 (10 ha)",
      destino: "Forraje Tambo HJB (Picado fino & Silo)",
      ha: 43,
      pct: 15.4,
      estado: "Embolsado / Silobolsa",
      tipo: "maiz_forrajero",
      esMaiz: true,
    },
    {
      cultivo: "Soja 1ra / 2da",
      lotes: "Racca L1 (50 ha), Keuneke L1 (48 ha Avena/Soja)",
      destino: "Comercial (Granos AFA Los Cardos)",
      ha: 98,
      pct: 35.1,
      estado: "En desarrollo vegetativo",
      tipo: "granos",
      esMaiz: false,
    },
    {
      cultivo: "Alfalfa Henificada (Rollos Tambo)",
      lotes: "Keuneke L2 (9 ha), Tambo L5 (3 ha), L6 (10 ha), L8 (10 ha), L9 (7 ha)",
      destino: "Forraje Tambo HJB (Rollos)",
      ha: 39,
      pct: 14.0,
      estado: "En producción / cortes",
      tipo: "forraje",
      esMaiz: false,
    },
  ];

  const totalMaizHa = 99 + 43; // 142 ha de maíz en total (50.9%)
  const haMaizGrano = 99;
  const haMaizForrajero = 43;
  const haSoja = 98;
  const haAlfalfa = 39;

  // =========================================================================
  // 3. CÁLCULOS GANADERÍA — NOVILLOS ESCALONADOS Y CONFIRMACIÓN DE FAENA
  // =========================================================================
  const totalMachosEngorde = 130;
  const novillosConfirmados = useMemo(() => {
    return novillosTerminacion.filter((n) => n.confirmadoVenta);
  }, [novillosTerminacion]);

  const novillosEnEngordeContinuo = useMemo(() => {
    return novillosTerminacion.filter((n) => !n.confirmadoVenta);
  }, [novillosTerminacion]);

  const proyeccionVentaConfirmada = useMemo(() => {
    const cabezas = novillosConfirmados.length;
    const precioKg = dieta.precioNovilloGordoVivoArs ?? 4200;
    const pesoBrutoTotal = novillosConfirmados.reduce((sum, n) => sum + n.pesoActualEstimadoKg, 0);
    const pesoPromedioActual = cabezas > 0 ? Math.round(pesoBrutoTotal / cabezas) : 410;
    const pesoNeto = Math.round(pesoBrutoTotal * 0.93); // 7% desbaste
    const facturacion = Math.round(pesoNeto * precioKg);
    const diasSalida = 4; // Salida próxima de la tanda confirmada

    return {
      cabezas,
      pesoBrutoTotal,
      pesoPromedioActual,
      pesoNeto,
      facturacion,
      diasSalida,
    };
  }, [novillosConfirmados, dieta.precioNovilloGordoVivoArs]);

  const tablaCorralesMachos = [
    {
      etapa: "5. Terminación (Gordos)",
      cabezasTotal: 26,
      cabezasConfirmadas: proyeccionVentaConfirmada.cabezas,
      cabezasContinuo: novillosEnEngordeContinuo.length,
      peso: `${proyeccionVentaConfirmada.pesoPromedioActual} kg`,
      objetivo: "410 kg",
      gdpv: "+1.49 kg/d",
      estado: `🥩 ${proyeccionVentaConfirmada.cabezas} novillos confirmados para faena (~$${(proyeccionVentaConfirmada.facturacion / 1000000).toFixed(2)}M) · ${novillosEnEngordeContinuo.length} novillos en engorde continuo`,
      destacado: true,
    },
    {
      etapa: "4. Recría Mixta 3 (RM3)",
      cabezasTotal: 30,
      cabezasConfirmadas: 0,
      cabezasContinuo: 30,
      peso: "262 kg",
      objetivo: "270 kg",
      gdpv: "+0.83 kg/d",
      estado: "Pase próximo a Terminación (preparación engorde)",
      destacado: false,
    },
    {
      etapa: "3. Recría Mixta 2 (RM2)",
      cabezasTotal: 28,
      cabezasConfirmadas: 0,
      cabezasContinuo: 28,
      peso: "165 kg",
      objetivo: "170 kg",
      gdpv: "+0.93 kg/d",
      estado: "En desarrollo a corral (crecimiento estructural)",
      destacado: false,
    },
    {
      etapa: "2. Recría Mixta 1 (RM1)",
      cabezasTotal: 22,
      cabezasConfirmadas: 0,
      cabezasContinuo: 22,
      peso: "106 kg",
      objetivo: "115 kg",
      gdpv: "+1.29 kg/d",
      estado: "Transición post-guachera (rumen temprano)",
      destacado: false,
    },
    {
      etapa: "1. Guachera / Estaca",
      cabezasTotal: 24,
      cabezasConfirmadas: 0,
      cabezasContinuo: 24,
      peso: "74 kg",
      objetivo: "80 kg",
      gdpv: "+0.62 kg/d",
      estado: "Crianza individual de machos (Hembras van 100% al Tambo)",
      destacado: false,
    },
  ];

  return (
    <AppShell active="Inicio">
      {/* ========================================================================= */}
      {/* 1. ENCABEZADO LIMPIO & ACCESOS RÁPIDOS                                    */}
      {/* ========================================================================= */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
          paddingBottom: "14px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 900, letterSpacing: "-0.02em", margin: 0, color: "var(--slate-900)" }}>
            Tablero General HJB
          </h1>
          <p style={{ fontSize: "13px", color: "var(--slate-500)", margin: "4px 0 0 0" }}>
            Pantallazo ejecutivo de las 3 unidades de negocio: Tambo, Agricultura y Ganadería.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Botón DelPro */}
          <button
            type="button"
            onClick={() => {
              setTabDelProModal("sql_extractor");
              setModalDelProOpen(true);
            }}
            className="secondaryBtn"
            style={{
              padding: "7px 13px",
              fontSize: "12.5px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🔗</span>
            <span>DeLaval DelPro</span>
            <span
              style={{
                fontSize: "10.5px",
                padding: "2px 6px",
                borderRadius: "4px",
                background: delproConfig.estadoConexion === "conectado" ? "#dcfce7" : "#fef08a",
                color: delproConfig.estadoConexion === "conectado" ? "#166534" : "#854d0e",
              }}
            >
              {delproConfig.estadoConexion === "conectado" ? "Conectado" : "En vinculación"}
            </span>
          </button>

          {/* Botón Parámetros */}
          <button
            type="button"
            onClick={() => setModalParametrosOpen(true)}
            className="secondaryBtn"
            style={{ padding: "7px 13px", fontSize: "12.5px", fontWeight: 700 }}
          >
            ⚙️ Parámetros
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LAS 3 TARJETAS KPI PRINCIPALES                                         */}
      {/* ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* KPI 1: TAMBO */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #bbf7d0",
            borderTop: "4px solid #16a34a",
            borderRadius: "10px",
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>
              🥛 Lechería (Tambo)
            </span>
            <Link href="/tambo" style={{ fontSize: "11.5px", color: "#16a34a", fontWeight: 700, textDecoration: "none" }}>
              Ver tambo →
            </Link>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#15803d", marginTop: "4px" }}>
            {litrosLibresPorVO} Litros Libres
          </div>
          <div style={{ fontSize: "12px", color: "var(--slate-600)", marginTop: "4px" }}>
            Ganancia neta: <strong>+${(gananciaPesosRodeoDia / 1000).toLocaleString("es-AR", { maximumFractionDigits: 0 })}k / día</strong> (Margen {margenNetoPct}%)
          </div>
          <div style={{ fontSize: "11px", color: "var(--slate-400)", marginTop: "2px" }}>
            Producción DelPro: {litrosTotalesDia.toLocaleString("es-AR")} lts/d · {vacasVO} VO @ ${precioLitroLeche}/lt
          </div>
        </div>

        {/* KPI 2: AGRICULTURA */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #fed7aa",
            borderTop: "4px solid #ea580c",
            borderRadius: "10px",
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#9a3412", textTransform: "uppercase" }}>
              🌾 Agricultura (279 ha)
            </span>
            <Link href="/agricultura" style={{ fontSize: "11.5px", color: "#ea580c", fontWeight: 700, textDecoration: "none" }}>
              Ver lotes →
            </Link>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#c2410c", marginTop: "4px" }}>
            {totalMaizHa} ha Maíz <span style={{ fontSize: "16px", color: "var(--slate-500)", fontWeight: 700 }}>(50,9%)</span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--slate-600)", marginTop: "4px" }}>
            <strong>99 ha</strong> Maíz Grano · <strong>43 ha</strong> Maíz Forrajero · 98 ha Soja · 39 ha Alfalfa
          </div>
          <div style={{ fontSize: "11px", color: "var(--slate-400)", marginTop: "2px" }}>
            279 ha totales auditadas en los 5 campos
          </div>
        </div>

        {/* KPI 3: GANADERÍA */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #bfdbfe",
            borderTop: "4px solid #2563eb",
            borderRadius: "10px",
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#1e40af", textTransform: "uppercase" }}>
              🥩 Ganadería (Engorde Escalonado)
            </span>
            <button
              type="button"
              onClick={() => setModalConfirmarFaenaOpen(true)}
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                fontSize: "11px",
                fontWeight: 700,
                borderRadius: "4px",
                padding: "2px 7px",
                cursor: "pointer",
              }}
            >
              📋 Confirmar faena
            </button>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#1d4ed8", marginTop: "4px" }}>
            {proyeccionVentaConfirmada.cabezas} Novillos Confirmados
          </div>
          <div style={{ fontSize: "12px", color: "var(--slate-600)", marginTop: "4px" }}>
            Salida en <strong>~{proyeccionVentaConfirmada.diasSalida} días</strong> · Facturación est.: <strong>${(proyeccionVentaConfirmada.facturacion / 1000000).toFixed(2)}M</strong>
          </div>
          <div style={{ fontSize: "11px", color: "var(--slate-400)", marginTop: "2px" }}>
            {novillosEnEngordeContinuo.length} novillos en engorde continuo · Total corral: 26 novillos
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LAS 3 TABLAS PRINCIPALES DEL DASHBOARD                                 */}
      {/* ========================================================================= */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* TABLA 1: TAMBO & RESULTADO LECHERO */}
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>🥛</span>
              <h2 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>
                1. Lechería — Balance Económico y Producción
              </h2>
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--slate-500)" }}>
              Fuente: DeLaval DelPro (Caudalímetros & Raciones)
            </div>
          </div>

          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th style={{ minWidth: "220px" }}>Concepto Económico</th>
                  <th style={{ minWidth: "220px" }}>Detalle / Parámetro Real</th>
                  <th style={{ width: "160px", textAlign: "right" }}>Equivalente Leche</th>
                  <th style={{ width: "180px", textAlign: "right" }}>Monto Diario Rodeo (187 VO)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>1. Facturación Bruta Leche</strong>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>Liquidación usina HJB (${precioLitroLeche}/lt)</div>
                  </td>
                  <td>
                    {litrosTotalesDia.toLocaleString("es-AR")} lts/día totales
                    <div style={{ fontSize: "11px", color: "var(--slate-400)" }}>Control DelPro: {litrosPromedioVO} lts/VO/día</div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "var(--slate-700)" }}>
                    {litrosPromedioVO} lts / VO
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "#166534" }}>
                    +${facturacionLecheDia.toLocaleString("es-AR")} / día
                  </td>
                </tr>

                <tr>
                  <td>
                    <span style={{ color: "#b91c1c", fontWeight: 700 }}>2. [-] Costo Alimentación (Ración DelPro)</span>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>Soja, Trigo, Silo, Maíz, Rollos y Sal</div>
                  </td>
                  <td>
                    ${costoAlimentacionVODia.toLocaleString("es-AR")} / VO / día
                    <div style={{ fontSize: "11px", color: "var(--slate-400)" }}>Formulación asignada en comederos</div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#b91c1c" }}>
                    {costoAlimentacionEnLitros} lts / VO
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "#b91c1c" }}>
                    -${costoAlimentacionRodeoDia.toLocaleString("es-AR")} / día
                  </td>
                </tr>

                <tr>
                  <td>
                    <span style={{ color: "#c2410c", fontWeight: 700 }}>3. [-] Costo Operativo Tambo (Regla HJB)</span>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>Personal, energía, gasoil, sanidad y mantenimiento</div>
                  </td>
                  <td>
                    <strong>10,0 litros de leche por vaca</strong>
                    <div style={{ fontSize: "11px", color: "var(--slate-400)" }}>${costoOperativoVODia.toLocaleString("es-AR")} / VO / día</div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#c2410c" }}>
                    10,00 lts / VO
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "#c2410c" }}>
                    -${costoOperativoRodeoDia.toLocaleString("es-AR")} / día
                  </td>
                </tr>

                <tr style={{ background: "#f0fdf4", borderTop: "2px solid #86efac" }}>
                  <td>
                    <strong style={{ fontSize: "14px", color: "#15803d" }}>[=] LITROS LIBRES (Ganancia Neta)</strong>
                    <div style={{ fontSize: "11px", color: "#166534" }}>Margen neto: {margenNetoPct}% sobre facturación</div>
                  </td>
                  <td>
                    <strong style={{ color: "#15803d" }}>+${gananciaPesosPorVODia.toLocaleString("es-AR")} / VO / día</strong>
                    <div style={{ fontSize: "11px", color: "var(--slate-600)" }}>Limpio de alimentación y costos operativos</div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span className="pill badgeGreen" style={{ fontSize: "13px", fontWeight: 900 }}>
                      {litrosLibresPorVO} Litros Libres
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "15px", color: "#15803d" }}>
                      +${gananciaPesosRodeoDia.toLocaleString("es-AR")} / día
                    </strong>
                    <div style={{ fontSize: "10.5px", color: "#166534" }}>~${((gananciaPesosRodeoDia * 30) / 1000000).toFixed(2)}M / mes</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* TABLA 2: AGRICULTURA — MATRIZ REAL AUDITADA CON 142 ha DE MAÍZ */}
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>🌾</span>
              <h2 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>
                2. Agricultura — Matriz de Cultivos (279 ha)
              </h2>
            </div>
            <div style={{ fontSize: "12px", color: "#c2410c", fontWeight: 800 }}>
              🌽 Total Maíz: {totalMaizHa} ha (50,9% de la superficie)
            </div>
          </div>

          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th style={{ minWidth: "220px" }}>Cultivo</th>
                  <th style={{ minWidth: "320px" }}>Lotes y Campos Asignados</th>
                  <th style={{ width: "130px", textAlign: "right" }}>Superficie</th>
                  <th style={{ width: "110px", textAlign: "right" }}>% Campo</th>
                </tr>
              </thead>
              <tbody>
                {matrizAgricola.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      background: item.esMaiz ? "#fffbeb" : "transparent",
                    }}
                  >
                    <td>
                      <strong style={{ color: item.esMaiz ? "#92400e" : "var(--slate-800)" }}>
                        {item.cultivo}
                      </strong>
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--slate-600)" }}>
                      {item.lotes}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: item.esMaiz ? "#b45309" : "var(--slate-900)" }}>
                      {item.ha} ha
                    </td>
                    <td style={{ textAlign: "right", color: "var(--slate-600)" }}>
                      {item.pct}%
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "#f8fafc", fontWeight: 800, borderTop: "2px solid var(--line)" }}>
                  <td colSpan={2}>
                    Total Superficie Agrícola HJB (5 campos)
                  </td>
                  <td style={{ textAlign: "right", color: "var(--slate-900)" }}>
                    {superficieTotalHa} ha
                  </td>
                  <td style={{ textAlign: "right", color: "var(--slate-900)" }}>
                    100.0%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* TABLA 3: GANADERÍA — ENGORDE ESCALONADO Y CONFIRMACIÓN DE FAENA */}
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>🥩</span>
              <h2 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>
                3. Ganadería — Engorde a Corral de Machos ({totalMachosEngorde} cab.)
              </h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setModalConfirmarFaenaOpen(true)}
                className="secondaryBtn"
                style={{
                  fontSize: "12px",
                  padding: "5px 12px",
                  fontWeight: 800,
                  background: "#eff6ff",
                  border: "1px solid #93c5fd",
                  color: "#1d4ed8",
                }}
              >
                📋 Confirmar Novillos para Frigorífico ({proyeccionVentaConfirmada.cabezas})
              </button>
            </div>
          </div>

          <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "0 0 12px 0" }}>
            Lógica escalonada DelPro: los novillos ingresan en tandas y no todos salen juntos. Solo los machos van a faena; las hembras van 100% al tambo.
          </p>

          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th style={{ minWidth: "190px" }}>Corral / Etapa</th>
                  <th style={{ width: "90px", textAlign: "right" }}>Cabezas</th>
                  <th style={{ width: "110px", textAlign: "right" }}>Peso Promedio</th>
                  <th style={{ width: "110px", textAlign: "right" }}>Peso Objetivo</th>
                  <th style={{ width: "120px", textAlign: "right" }}>Ganancia (GDPV)</th>
                  <th style={{ minWidth: "220px", textAlign: "left" }}>Estado & Salida Escalonada</th>
                </tr>
              </thead>
              <tbody>
                {tablaCorralesMachos.map((corral, idx) => (
                  <tr
                    key={idx}
                    style={{
                      background: corral.destacado ? "#fff7ed" : "transparent",
                      fontWeight: corral.destacado ? 700 : 400,
                    }}
                  >
                    <td>
                      <strong style={{ color: corral.destacado ? "#c2410c" : "var(--slate-800)" }}>
                        {corral.etapa}
                      </strong>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800 }}>
                      {corral.cabezasTotal} cab.
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {corral.peso}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--slate-600)" }}>
                      {corral.objetivo}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="pill badgeGreen" style={{ fontSize: "11px" }}>
                        {corral.gdpv}
                      </span>
                    </td>
                    <td>
                      {corral.destacado ? (
                        <div>
                          <div style={{ color: "#c2410c", fontWeight: 800, fontSize: "12.5px" }}>
                            🥩 {corral.cabezasConfirmadas} novillos confirmados para venta inmediata (~${(proyeccionVentaConfirmada.facturacion / 1000000).toFixed(2)}M)
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                            ⏳ {corral.cabezasContinuo} novillos continúan en engorde (salida escalonada a 35d y 70d)
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "var(--slate-600)", fontSize: "12px" }}>
                          {corral.estado}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMAR NOVILLOS PARA SALIDA A FRIGORÍFICO (DELPRO ESCALONADO)   */}
      {/* ========================================================================= */}
      {modalConfirmarFaenaOpen && (
        <div className="modalOverlay" onClick={() => setModalConfirmarFaenaOpen(false)}>
          <div
            className="modalContent"
            style={{ maxWidth: "780px", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }}>📋</span>
                <div>
                  <h2 style={{ fontSize: "18px", margin: 0 }}>Confirmación de Novillos para Frigorífico</h2>
                  <div style={{ fontSize: "12px", color: "var(--slate-500)" }}>
                    Cálculo predictivo DelPro según días acumulados en el corral de terminación.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalConfirmarFaenaOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            </div>

            {/* Barra de resumen de selección */}
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <span style={{ fontSize: "12px", color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
                  Tropa Seleccionada para el Camión:
                </span>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#15803d" }}>
                  {proyeccionVentaConfirmada.cabezas} Novillos Confirmados
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "13px", color: "var(--slate-700)" }}>
                  Peso neto est. (7% desbaste): <strong>{proyeccionVentaConfirmada.pesoNeto.toLocaleString("es-AR")} kg</strong>
                </div>
                <div style={{ fontSize: "15px", fontWeight: 900, color: "#15803d" }}>
                  Facturación est.: ~${(proyeccionVentaConfirmada.facturacion / 1000000).toFixed(2)}M (${dieta.precioNovilloGordoVivoArs || 4200}/kg)
                </div>
              </div>
            </div>

            {/* Acciones rápidas de selección */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontSize: "12.5px", color: "var(--slate-600)" }}>
                Marca con el tilde los novillos que se cargarán al camión:
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    const listosIds = novillosTerminacion
                      .filter((n) => n.categoriaFaena === "listo_para_venta")
                      .map((n) => n.id);
                    setNovillosTerminacion(confirmarListaNovillos(listosIds));
                  }}
                  className="secondaryBtn"
                  style={{ fontSize: "11.5px", padding: "4px 8px" }}
                >
                  Tildar solo Punta de Tropa (10)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const todosIds = novillosTerminacion.map((n) => n.id);
                    setNovillosTerminacion(confirmarListaNovillos(todosIds));
                  }}
                  className="secondaryBtn"
                  style={{ fontSize: "11.5px", padding: "4px 8px" }}
                >
                  Tildar todos (26)
                </button>
                <button
                  type="button"
                  onClick={() => setNovillosTerminacion(confirmarListaNovillos([]))}
                  className="secondaryBtn"
                  style={{ fontSize: "11.5px", padding: "4px 8px" }}
                >
                  Limpiar
                </button>
              </div>
            </div>

            {/* Tabla de novillos individuales */}
            <div className="tableWrap" style={{ maxHeight: "320px", overflowY: "auto", marginBottom: "16px" }}>
              <table className="dataTable" style={{ fontSize: "12px" }}>
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>Cargar</th>
                    <th style={{ minWidth: "100px" }}>Caravana RP</th>
                    <th style={{ minWidth: "90px" }}>RP Madre</th>
                    <th style={{ minWidth: "90px" }}>Ingreso</th>
                    <th style={{ width: "100px", textAlign: "right" }}>Días Corral</th>
                    <th style={{ width: "90px", textAlign: "right" }}>Peso Ingreso</th>
                    <th style={{ width: "110px", textAlign: "right" }}>Peso DelPro</th>
                    <th style={{ minWidth: "150px" }}>Estado Faena</th>
                  </tr>
                </thead>
                <tbody>
                  {novillosTerminacion.map((novillo) => (
                    <tr
                      key={novillo.id}
                      style={{
                        background: novillo.confirmadoVenta ? "#f0fdf4" : "transparent",
                      }}
                    >
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={novillo.confirmadoVenta}
                          onChange={() => setNovillosTerminacion(toggleConfirmacionNovillo(novillo.id))}
                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        />
                      </td>
                      <td>
                        <strong>{novillo.caravana}</strong>
                      </td>
                      <td style={{ color: "var(--slate-500)" }}>
                        {novillo.rpMadre || "-"}
                      </td>
                      <td style={{ color: "var(--slate-600)" }}>
                        {novillo.fechaIngreso}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {novillo.diasEnCorral} d
                      </td>
                      <td style={{ textAlign: "right", color: "var(--slate-600)" }}>
                        {novillo.pesoIngresoKg} kg
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <strong
                          style={{
                            color: novillo.pesoActualEstimadoKg >= 400 ? "#15803d" : "var(--slate-900)",
                          }}
                        >
                          {novillo.pesoActualEstimadoKg} kg
                        </strong>
                      </td>
                      <td>
                        {novillo.categoriaFaena === "listo_para_venta" && (
                          <span className="pill badgeGreen" style={{ fontSize: "10.5px", fontWeight: 700 }}>
                            🥩 Listo para Faena (Punta)
                          </span>
                        )}
                        {novillo.categoriaFaena === "engorde_medio" && (
                          <span className="pill badgeSlate" style={{ fontSize: "10.5px" }}>
                            🌾 Engorde medio (~35d)
                          </span>
                        )}
                        {novillo.categoriaFaena === "recien_ingresado" && (
                          <span className="pill badgeSlate" style={{ fontSize: "10.5px", color: "#64748b" }}>
                            ⏳ Recién ingresado (~70d)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "11.5px", color: "var(--slate-500)" }}>
                * Los cambios se guardan y recalculan el tablero en tiempo real.
              </div>
              <button
                type="button"
                onClick={() => setModalConfirmarFaenaOpen(false)}
                className="primaryBtn"
                style={{ padding: "8px 20px" }}
              >
                Guardar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PARÁMETROS REALES HJB                                              */}
      {/* ========================================================================= */}
      {modalParametrosOpen && (
        <div className="modalOverlay" onClick={() => setModalParametrosOpen(false)}>
          <div
            className="modalContent"
            style={{ maxWidth: "520px", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", margin: 0 }}>⚙️ Parámetros Operativos HJB</h2>
              <button
                type="button"
                onClick={() => setModalParametrosOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            </div>

            {feedbackParametros && (
              <div style={{ background: "#f0fdf4", color: "#166534", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", marginBottom: "12px" }}>
                {feedbackParametros}
              </div>
            )}

            <form onSubmit={handleGuardarParametros}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Precio de la Leche ($/litro)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="inputField"
                    value={formParametros.precioLitroLecheArs}
                    onChange={(e) => setFormParametros({ ...formParametros, precioLitroLecheArs: Number(e.target.value) })}
                  />
                  <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                    Liquidación usina actual: $549,00 / litro
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Costo Operativo Tambo (Litros de Leche / VO / día)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="inputField"
                    value={formParametros.costoOperativoLitrosVO}
                    onChange={(e) => setFormParametros({ ...formParametros, costoOperativoLitrosVO: Number(e.target.value) })}
                  />
                  <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                    Regla fijada por el productor: 10,0 litros / VO (personal, luz, flete, sanidad)
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Precio Novillo Gordo Vivo ($/kg)
                  </label>
                  <input
                    type="number"
                    className="inputField"
                    value={formParametros.precioNovilloGordoVivoArs}
                    onChange={(e) => setFormParametros({ ...formParametros, precioNovilloGordoVivoArs: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" onClick={() => setModalParametrosOpen(false)} className="secondaryBtn">
                  Cancelar
                </button>
                <button type="submit" className="primaryBtn">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INTEGRACIÓN DELAVAL DELPRO (SQL SERVER)                            */}
      {/* ========================================================================= */}
      {modalDelProOpen && (
        <div className="modalOverlay" onClick={() => setModalDelProOpen(false)}>
          <div
            className="modalContent"
            style={{ maxWidth: "620px", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }}>🔗</span>
                <h2 style={{ fontSize: "18px", margin: 0 }}>Integración DeLaval DelPro FarmManager</h2>
              </div>
              <button
                type="button"
                onClick={() => setModalDelProOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            </div>

            {/* Solapas del Modal */}
            <div style={{ display: "flex", gap: "6px", borderBottom: "1px solid var(--line)", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={() => setTabDelProModal("sql_extractor")}
                style={{
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: tabDelProModal === "sql_extractor" ? 800 : 500,
                  border: "none",
                  borderBottom: tabDelProModal === "sql_extractor" ? "2px solid #2563eb" : "2px solid transparent",
                  background: "none",
                  color: tabDelProModal === "sql_extractor" ? "#2563eb" : "var(--slate-600)",
                  cursor: "pointer",
                }}
              >
                📥 Extractor SQL Server
              </button>
              <button
                type="button"
                onClick={() => setTabDelProModal("resumen")}
                style={{
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: tabDelProModal === "resumen" ? 800 : 500,
                  border: "none",
                  borderBottom: tabDelProModal === "resumen" ? "2px solid #2563eb" : "2px solid transparent",
                  background: "none",
                  color: tabDelProModal === "resumen" ? "#2563eb" : "var(--slate-600)",
                  cursor: "pointer",
                }}
              >
                📊 Métricas Sincronizadas
              </button>
              <button
                type="button"
                onClick={() => setTabDelProModal("queries")}
                style={{
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: tabDelProModal === "queries" ? 800 : 500,
                  border: "none",
                  borderBottom: tabDelProModal === "queries" ? "2px solid #2563eb" : "2px solid transparent",
                  background: "none",
                  color: tabDelProModal === "queries" ? "#2563eb" : "var(--slate-600)",
                  cursor: "pointer",
                }}
              >
                📋 Consultas SQL (SSMS)
              </button>
            </div>

            {feedbackDelPro && (
              <div
                style={{
                  background: feedbackDelPro.startsWith("❌") ? "#fef2f2" : "#f0fdf4",
                  border: `1px solid ${feedbackDelPro.startsWith("❌") ? "#fecaca" : "#bbf7d0"}`,
                  color: feedbackDelPro.startsWith("❌") ? "#991b1b" : "#166534",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  marginBottom: "16px",
                }}
              >
                {feedbackDelPro}
              </div>
            )}

            {/* CONTENIDO SOLAPA 1: EXTRACTOR SQL SERVER */}
            {tabDelProModal === "sql_extractor" && (
              <div>
                <div style={{ background: "#f8fafc", border: "2px dashed #cbd5e1", borderRadius: "10px", padding: "18px", textAlign: "center", marginBottom: "16px" }}>
                  <div style={{ fontSize: "28px", marginBottom: "4px" }}>💾</div>
                  <strong style={{ fontSize: "14px", color: "var(--slate-800)" }}>Cargar Archivo Extraído de SQL Server</strong>
                  <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "4px 0 14px" }}>
                    Selecciona el archivo <code>delpro_sync.json</code> generado por el script en la computadora del tambo:
                  </p>
                  <label className="primaryBtn" style={{ display: "inline-block", cursor: "pointer", padding: "9px 20px", fontSize: "13px", fontWeight: 700 }}>
                    📁 Seleccionar delpro_sync.json
                    <input type="file" accept=".json" onChange={handleCargarArchivoJson} style={{ display: "none" }} />
                  </label>
                </div>

                <div style={{ background: "#f1f5f9", padding: "14px", borderRadius: "8px", marginBottom: "16px", fontSize: "12.5px" }}>
                  <strong style={{ display: "block", marginBottom: "6px", color: "var(--slate-800)" }}>
                    💻 ¿Cómo ejecutar el extractor en la máquina del tambo?
                  </strong>
                  <div style={{ fontSize: "12px", color: "var(--slate-600)", marginBottom: "8px" }}>
                    En la PC donde está instalado DeLaval DelPro, abrir PowerShell y ejecutar:
                  </div>
                  <div style={{ background: "#0f172a", color: "#38bdf8", padding: "10px 12px", borderRadius: "6px", fontFamily: "monospace", fontSize: "12px", overflowX: "auto" }}>
                    powershell -ExecutionPolicy Bypass -File .\scripts\delpro\extraer_delpro.ps1
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "6px" }}>
                    * Para automatizarlo, puedes programar la tarea en Windows para las 07:30 y 18:30 (ver guía en <code>scripts/delpro/README_DELPRO.md</code>).
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    type="button"
                    className="secondaryBtn"
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                    onClick={() => {
                      const res = importarPayloadDesdeJson(JSON.stringify(DELPRO_CONFIG_DEFAULT.datosSincronizados));
                      if (res.success && res.config) {
                        setDelproConfig(res.config);
                        cargarTodo();
                        setFeedbackDelPro("✓ Datos de prueba de SQL Server sincronizados correctamente.");
                      }
                    }}
                  >
                    ⚡ Recalcular con Datos Reales HJB
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalDelProOpen(false)}
                    className="primaryBtn"
                    style={{ padding: "8px 18px" }}
                  >
                    Listo
                  </button>
                </div>
              </div>
            )}

            {/* CONTENIDO SOLAPA 2: RESUMEN DE MÉTRICAS */}
            {tabDelProModal === "resumen" && (
              <div>
                <div style={{ fontSize: "13px", color: "var(--slate-700)", marginBottom: "14px", lineHeight: "1.5" }}>
                  Variables productivas enlazadas con la base de datos de DeLaval DelPro:
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                  <div style={{ background: "#f8fafc", border: "1px solid var(--line)", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                      1. Producción Lechera
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#1e40af", marginTop: "2px" }}>
                      🥛 {litrosTotalesDia.toLocaleString("es-AR")} lts/día
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                      Caudalímetros DelPro / Tanque de leche
                    </div>
                  </div>

                  <div style={{ background: "#f8fafc", border: "1px solid var(--line)", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                      2. Rodeo en Ordeñe (VO)
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#15803d", marginTop: "2px" }}>
                      🐄 {vacasVO} Vacas en Ordeñe
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                      Promedio: {litrosPromedioVO} lts/VO/día
                    </div>
                  </div>

                  <div style={{ background: "#f8fafc", border: "1px solid var(--line)", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                      3. Dieta y Raciones
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#ca8a04", marginTop: "2px" }}>
                      🥣 Formulaciones Activas
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                      Estaciones de alimentación y mixer
                    </div>
                  </div>

                  <div style={{ background: "#f8fafc", border: "1px solid var(--line)", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase" }}>
                      4. Partos & Destino Animal
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#c2410c", marginTop: "2px" }}>
                      🐂 Solo Machos al Engorde
                    </div>
                    <div style={{ fontSize: "11px", color: "#166534", fontWeight: 700, marginTop: "2px" }}>
                      ✓ Hembras 100% al Tambo (Reposición)
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setModalDelProOpen(false)}
                    className="primaryBtn"
                    style={{ padding: "8px 18px" }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}

            {/* CONTENIDO SOLAPA 3: CONSULTAS SQL */}
            {tabDelProModal === "queries" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12.5px", color: "var(--slate-600)" }}>
                    Consultas SQL de solo lectura con <code>WITH (NOLOCK)</code> para auditar en SSMS:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopiarSql}
                    className="secondaryBtn"
                    style={{ fontSize: "12px", padding: "4px 10px", fontWeight: 700 }}
                  >
                    {copiadoSql ? "✓ ¡Copiado!" : "📋 Copiar SQL"}
                  </button>
                </div>

                <pre
                  style={{
                    background: "#0f172a",
                    color: "#e2e8f0",
                    padding: "14px",
                    borderRadius: "8px",
                    fontSize: "11.5px",
                    lineHeight: "1.4",
                    fontFamily: "monospace",
                    maxHeight: "260px",
                    overflowY: "auto",
                    marginBottom: "16px",
                  }}
                >
                  {DELPRO_SQL_QUERIES_SAMPLE}
                </pre>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setModalDelProOpen(false)}
                    className="primaryBtn"
                    style={{ padding: "8px 18px" }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
