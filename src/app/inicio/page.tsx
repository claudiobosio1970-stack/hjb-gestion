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

export default function InicioPage() {
  // Estados reactivos sincronizados
  const [dieta, setDieta] = useState<DietaTamboConfig>(() => getDietaTambo());
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [corrales, setCorrales] = useState<DefinicionCorral[]>([]);
  const [tropas, setTropas] = useState<TropaGanadera[]>([]);
  const [delproConfig, setDelproConfig] = useState<DelProConfig>(() => getDelProConfig());

  // Modales
  const [modalParametrosOpen, setModalParametrosOpen] = useState(false);
  const [modalDelProOpen, setModalDelProOpen] = useState(false);
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

    window.addEventListener(HJB_DIETA_SYNC_EVENT, onSync);
    window.addEventListener(HJB_STOCK_SYNC_EVENT, onSync);
    window.addEventListener(HJB_AGRICULTURE_SYNC_EVENT, onSync);
    window.addEventListener(HJB_DELPRO_SYNC_EVENT, onSync);

    return () => {
      window.removeEventListener(HJB_DIETA_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_STOCK_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_AGRICULTURE_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_DELPRO_SYNC_EVENT, onSync);
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
  const costoTotalEnLitros = Number((costoAlimentacionEnLitros + costoOperativoLitrosVO).toFixed(2));

  // Litros Libres y Ganancia Neta
  const gananciaPesosPorVODia = Number((facturacionPorVODia - costoTotalVODia).toFixed(2));
  const gananciaPesosRodeoDia = Math.round(gananciaPesosPorVODia * vacasVO);
  const litrosLibresPorVO = precioLitroLeche > 0 ? Number((gananciaPesosPorVODia / precioLitroLeche).toFixed(2)) : 8.23;
  const margenNetoPct = facturacionLecheDia > 0 ? Number(((gananciaPesosRodeoDia / facturacionLecheDia) * 100).toFixed(1)) : 30.5;

  // =========================================================================
  // 2. CÁLCULOS AGRICULTURA & USO DEL SUELO (279 ha)
  // =========================================================================
  const superficieTotalHa = 279;
  const matrizAgricola = [
    { cultivo: "Soja 1ra", destino: "Comercial (Granos AFA Los Cardos)", ha: 85, pct: 30.5, estado: "En desarrollo vegetativo", tipo: "granos" },
    { cultivo: "Alfalfa Henificada", destino: "Forraje Tambo HJB (Rollos)", ha: 65, pct: 23.3, estado: "En producción / cortes", tipo: "forraje" },
    { cultivo: "Maíz Grano Seco", destino: "Comercial (Granos AFA Los Cardos)", ha: 45, pct: 16.1, estado: "Campaña gruesa", tipo: "granos" },
    { cultivo: "Maíz Silo Planta Entera", destino: "Forraje Tambo HJB (Picado fino)", ha: 44, pct: 15.8, estado: "Embolsado / Silobolsa", tipo: "forraje" },
    { cultivo: "Avena / Verdeos", destino: "Pastoreo directo Tambo HJB", ha: 40, pct: 14.3, estado: "Pastoreo activo", tipo: "forraje" },
  ];
  const haGranosAFA = 130 + 20; // 150 ha comerciales
  const haForrajeTambo = 129; // 129 ha forraje tambo

  // =========================================================================
  // 3. CÁLCULOS GANADERÍA & SALIDA DE GORDOS (SOLO MACHOS)
  // =========================================================================
  const totalMachosEngorde = 130;
  const tropaTerminacion = useMemo(() => {
    return tropas.find((t) => t.corralId === "terminacion") || {
      id: "tropa-cg-1",
      codigo: "TR-26-GORDOS",
      nombre: "Lote Terminación Frigorífico (Solo Machos)",
      corralId: "terminacion" as const,
      cabezas: 26,
      fechaIngreso: "20/06/26",
      diasEnCorral: 87,
      pesoInicialKg: 274,
      pesoActualKg: 404.0,
      gdpvKgDia: 1.49,
      origen: "Solo Machos Tambo HJB (DelPro)",
    };
  }, [tropas]);

  const proximaVentaGordos = useMemo(() => {
    const cabezas = tropaTerminacion.cabezas || 26;
    const pesoActual = tropaTerminacion.pesoActualKg || 404;
    const pesoObj = 410;
    const gdpv = tropaTerminacion.gdpvKgDia || 1.49;
    const dias = gdpv > 0 ? Math.ceil((pesoObj - pesoActual) / gdpv) : 4;
    const precioKg = dieta.precioNovilloGordoVivoArs ?? 4200;
    const pesoNeto = Math.round(cabezas * pesoObj * 0.93); // 7% desbaste
    const facturacion = Math.round(pesoNeto * precioKg);
    return {
      cabezas,
      pesoActual,
      pesoObj,
      dias,
      facturacion,
      pesoNeto,
    };
  }, [tropaTerminacion, dieta.precioNovilloGordoVivoArs]);

  const tablaCorralesMachos = [
    {
      etapa: "5. Terminación (Gordos)",
      cabezas: proximaVentaGordos.cabezas,
      peso: `${proximaVentaGordos.pesoActual} kg`,
      objetivo: `${proximaVentaGordos.pesoObj} kg`,
      gdpv: "+1.49 kg/d",
      estado: `🥩 Salida en ~${proximaVentaGordos.dias} días ($${(proximaVentaGordos.facturacion / 1000000).toFixed(2)}M)`,
      destacado: true,
    },
    {
      etapa: "4. Recría Mixta 3 (RM3)",
      cabezas: 30,
      peso: "262 kg",
      objetivo: "270 kg",
      gdpv: "+0.83 kg/d",
      estado: "Pase próximo a Terminación",
      destacado: false,
    },
    {
      etapa: "3. Recría Mixta 2 (RM2)",
      cabezas: 28,
      peso: "165 kg",
      objetivo: "170 kg",
      gdpv: "+0.93 kg/d",
      estado: "En desarrollo a corral",
      destacado: false,
    },
    {
      etapa: "2. Recría Mixta 1 (RM1)",
      cabezas: 22,
      peso: "106 kg",
      objetivo: "115 kg",
      gdpv: "+1.29 kg/d",
      estado: "Transición post-guachera",
      destacado: false,
    },
    {
      etapa: "1. Guachera / Estaca",
      cabezas: 24,
      peso: "74 kg",
      objetivo: "80 kg",
      gdpv: "+0.62 kg/d",
      estado: "Crianza inicial (Hembras van al Tambo)",
      destacado: false,
    },
  ];

  return (
    <AppShell active="Inicio">
      {/* ========================================================================= */}
      {/* 1. ENCABEZADO LIMPIO & EJECUTIVO                                          */}
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
      {/* 2. LAS 3 TARJETAS KPI PRINCIPALES (PANTALLAZO RÁPIDO)                     */}
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
            {superficieTotalHa} Hectáreas
          </div>
          <div style={{ fontSize: "12px", color: "var(--slate-600)", marginTop: "4px" }}>
            <strong>{haGranosAFA} ha</strong> Granos Comerciales (AFA) · <strong>{haForrajeTambo} ha</strong> Forraje Tambo
          </div>
          <div style={{ fontSize: "11px", color: "var(--slate-400)", marginTop: "2px" }}>
            5 campos agrícolas integrados a la producción
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
              🥩 Ganadería (Solo Machos)
            </span>
            <Link href="/ganaderia" style={{ fontSize: "11.5px", color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>
              Ver corrales →
            </Link>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#1d4ed8", marginTop: "4px" }}>
            {proximaVentaGordos.cabezas} Novillos Faena
          </div>
          <div style={{ fontSize: "12px", color: "var(--slate-600)", marginTop: "4px" }}>
            Salida en <strong>~{proximaVentaGordos.dias} días</strong> ({proximaVentaGordos.pesoActual} kg → {proximaVentaGordos.pesoObj} kg)
          </div>
          <div style={{ fontSize: "11px", color: "var(--slate-400)", marginTop: "2px" }}>
            Facturación proyectada: ~${(proximaVentaGordos.facturacion / 1000000).toFixed(2)}M · {totalMachosEngorde} machos en recría
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LAS 3 TABLAS PRINCIPALES (DATOS CLAVE POR UNIDAD DE NEGOCIO)           */}
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

        {/* TABLA 2: AGRICULTURA & USO DEL SUELO */}
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>🌾</span>
              <h2 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>
                2. Agricultura — Matriz de Cultivos y Destinos (279 ha)
              </h2>
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--slate-500)" }}>
              5 campos: Aguilera, Tambo, Racca, Don Pedro, La Unión
            </div>
          </div>

          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th style={{ minWidth: "200px" }}>Cultivo / Especie</th>
                  <th style={{ minWidth: "220px" }}>Destino Principal</th>
                  <th style={{ width: "120px", textAlign: "right" }}>Superficie</th>
                  <th style={{ width: "120px", textAlign: "right" }}>% Ocupación</th>
                  <th style={{ width: "180px", textAlign: "center" }}>Estado / Campaña</th>
                </tr>
              </thead>
              <tbody>
                {matrizAgricola.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{item.cultivo}</strong>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          background: item.tipo === "granos" ? "#fef3c7" : "#dbeafe",
                          color: item.tipo === "granos" ? "#92400e" : "#1e40af",
                        }}
                      >
                        {item.destino}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800 }}>
                      {item.ha} ha
                    </td>
                    <td style={{ textAlign: "right", color: "var(--slate-600)" }}>
                      {item.pct}%
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="pill badgeSlate" style={{ fontSize: "11px" }}>
                        {item.estado}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "#f8fafc", fontWeight: 800, borderTop: "2px solid var(--line)" }}>
                  <td colSpan={2}>
                    Total Superficie Agrícola HJB
                  </td>
                  <td style={{ textAlign: "right", color: "var(--slate-900)" }}>
                    {superficieTotalHa} ha
                  </td>
                  <td style={{ textAlign: "right", color: "var(--slate-900)" }}>
                    100.0%
                  </td>
                  <td style={{ textAlign: "center", fontSize: "11.5px", color: "var(--slate-600)" }}>
                    150 ha Granos · 129 ha Forrajes
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* TABLA 3: GANADERÍA & CORRALES DE MACHOS */}
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>🥩</span>
              <h2 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>
                3. Ganadería — Engorde a Corral de Machos ({totalMachosEngorde} cab.)
              </h2>
            </div>
            <div style={{ fontSize: "11.5px", color: "#166534", fontWeight: 700 }}>
              ✓ Regla HJB: Hembras van 100% al Tambo (Reposición)
            </div>
          </div>

          <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "0 0 12px 0" }}>
            Solo los terneros machos nacidos ingresan al circuito de engorde comercial con destino a frigorífico.
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
                  <th style={{ minWidth: "200px", textAlign: "left" }}>Estado & Destino</th>
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
                      {corral.cabezas} cab.
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
                        <span style={{ color: "#c2410c", fontWeight: 800, fontSize: "12.5px" }}>
                          {corral.estado}
                        </span>
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
      {/* MODAL 1: PARÁMETROS REALES HJB                                            */}
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
      {/* MODAL 2: INTEGRACIÓN DELAVAL DELPRO (SQL SERVER)                          */}
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
