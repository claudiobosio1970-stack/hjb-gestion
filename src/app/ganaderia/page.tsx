"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import {
  CORRALES_DEFINICION,
  DefinicionCorral,
  EtapaCorralId,
  FichaVentaFrigorifico,
  PesajeRegistro,
  TropaGanadera,
  getCostoDiarioPorAnimal,
  getCostoInsumoDieta,
  getPesajes,
  getResumenGanaderia,
  getTropas,
  getVentas,
  savePesajes,
  saveTropas,
  saveVentas,
} from "@/lib/ganaderiaData";

export default function GanaderiaPage() {
  const [activeTab, setActiveTab] = useState<"corrales" | "dietas" | "pesajes" | "ventas">("corrales");
  const [tropas, setTropas] = useState<TropaGanadera[]>([]);
  const [pesajes, setPesajes] = useState<PesajeRegistro[]>([]);
  const [ventas, setVentas] = useState<FichaVentaFrigorifico[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modales
  const [modalFichaVenta, setModalFichaVenta] = useState<FichaVentaFrigorifico | null>(null);
  const [modalNuevaVentaOpen, setModalNuevaVentaOpen] = useState(false);
  const [modalMoverCorralOpen, setModalMoverCorralOpen] = useState(false);
  const [tropaAMover, setTropaAMover] = useState<TropaGanadera | null>(null);
  const [modalNuevoPesajeOpen, setModalNuevoPesajeOpen] = useState(false);
  const [modalNuevaGuacheraOpen, setModalNuevaGuacheraOpen] = useState(false);

  // Formulario Nueva Venta
  const [formVenta, setFormVenta] = useState({
    tropaId: "",
    frigorifico: "Frigorífico Logros S.A.",
    remitoDte: "",
    cabezas: 25,
    pesoBrutoTotal: 10250,
    precioKg: 4200,
    otrosGastos: 950000,
  });

  // Formulario Mover Corral
  const [formMover, setFormMover] = useState({
    nuevoCorralId: "rm1" as EtapaCorralId,
    cabezas: 0,
    nuevoPeso: 0,
  });

  // Formulario Nuevo Pesaje
  const [formPesaje, setFormPesaje] = useState({
    tropaId: "",
    cabezas: 0,
    pesoPromedio: 0,
    observaciones: "",
  });

  // Formulario Nueva Guachera
  const [formGuachera, setFormGuachera] = useState({
    codigo: "",
    nombre: "Camada Machos Guachera",
    cabezas: 15,
    pesoInicial: 38,
  });

  useEffect(() => {
    setTropas(getTropas());
    setPesajes(getPesajes());
    setVentas(getVentas());
  }, []);

  const resumen = getResumenGanaderia();

  function triggerFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  }

  // Handler Mover Corral
  function handleAbrirMover(tropa: TropaGanadera) {
    setTropaAMover(tropa);
    const corrActualIdx = CORRALES_DEFINICION.findIndex((c) => c.id === tropa.corralId);
    const sigCorral = CORRALES_DEFINICION[corrActualIdx + 1] || CORRALES_DEFINICION[corrActualIdx];
    setFormMover({
      nuevoCorralId: sigCorral.id,
      cabezas: tropa.cabezas,
      nuevoPeso: Math.round(tropa.pesoActualKg),
    });
    setModalMoverCorralOpen(true);
  }

  function handleConfirmarMover() {
    if (!tropaAMover) return;
    const today = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    const updated = tropas.map((t) => {
      if (t.id === tropaAMover.id) {
        return {
          ...t,
          corralId: formMover.nuevoCorralId,
          pesoActualKg: formMover.nuevoPeso || t.pesoActualKg,
          diasEnCorral: 0,
          fechaIngreso: today,
        };
      }
      return t;
    });
    setTropas(updated);
    saveTropas(updated);
    setModalMoverCorralOpen(false);
    triggerFeedback(`Tropa ${tropaAMover.codigo} trasladada con éxito al nuevo corral.`);
  }

  // Handler Registrar Pesaje
  function handleRegistrarPesaje() {
    if (!formPesaje.tropaId) return;
    const tropa = tropas.find((t) => t.id === formPesaje.tropaId);
    if (!tropa) return;

    const today = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    const diffDias = Math.max(tropa.diasEnCorral, 1);
    const ganancia = formPesaje.pesoPromedio - tropa.pesoInicialKg;
    const gdpv = Number((ganancia / diffDias).toFixed(2));

    const nuevoPesaje: PesajeRegistro = {
      id: "pes-" + Date.now(),
      tropaId: tropa.id,
      tropaNombre: tropa.nombre,
      corralId: tropa.corralId,
      fecha: today,
      cabezas: formPesaje.cabezas || tropa.cabezas,
      pesoPromedioKg: formPesaje.pesoPromedio,
      pesoTotalKg: Math.round((formPesaje.cabezas || tropa.cabezas) * formPesaje.pesoPromedio),
      gdpvCalculada: gdpv > 0 ? gdpv : tropa.gdpvKgDia,
      observaciones: formPesaje.observaciones || "Control de balanza",
    };

    const nuevosPesajes = [nuevoPesaje, ...pesajes];
    setPesajes(nuevosPesajes);
    savePesajes(nuevosPesajes);

    // Actualizar peso de la tropa
    const updatedTropas = tropas.map((t) =>
      t.id === tropa.id ? { ...t, pesoActualKg: formPesaje.pesoPromedio, gdpvKgDia: nuevoPesaje.gdpvCalculada } : t
    );
    setTropas(updatedTropas);
    saveTropas(updatedTropas);

    setModalNuevoPesajeOpen(false);
    triggerFeedback(`Pesaje registrado: ${formPesaje.pesoPromedio} kg de promedio (GDPV: ${nuevoPesaje.gdpvCalculada} kg/d).`);
  }

  // Handler Registrar Venta a Frigorífico
  function handleRegistrarVenta() {
    if (!formVenta.tropaId) return;
    const tropa = tropas.find((t) => t.id === formVenta.tropaId);
    if (!tropa) return;

    const today = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    const cabezas = formVenta.cabezas || tropa.cabezas;
    const pesoBrutoTotal = formVenta.pesoBrutoTotal;
    const pesoBrutoPromedio = Number((pesoBrutoTotal / cabezas).toFixed(1));
    const desbastePct = 7.0;
    const pesoNetoTotal = Number((pesoBrutoTotal * (1 - desbastePct / 100)).toFixed(1));
    const pesoNetoPromedio = Number((pesoNetoTotal / cabezas).toFixed(1));
    const facturacionTotal = Math.round(pesoNetoTotal * formVenta.precioKg);

    // Costo acumulado estimado según Excel HJB (~$721.058 x cabeza)
    const costoUnitAlim = 721058;
    const costoAlimTotal = Math.round(costoUnitAlim * cabezas);
    const otrosGastos = Number(formVenta.otrosGastos || 0);
    const costoTotal = costoAlimTotal + otrosGastos;
    const gananciaNetaTotal = facturacionTotal - costoTotal;
    const gananciaNetaPorCabeza = Math.round(gananciaNetaTotal / cabezas);
    const margenPct = Number(((gananciaNetaTotal / costoTotal) * 100).toFixed(1));

    const nuevaFicha: FichaVentaFrigorifico = {
      id: "venta-" + Date.now(),
      fecha: today,
      tropaId: tropa.id,
      tropaCodigo: tropa.codigo,
      frigorifico: formVenta.frigorifico,
      remitoDte: formVenta.remitoDte || `DTe 0048-${Math.floor(100000 + Math.random() * 900000)}`,
      cabezas,
      pesoBrutoTotalKg: pesoBrutoTotal,
      pesoBrutoPromedioKg: pesoBrutoPromedio,
      desbastePct,
      pesoNetoTotalKg: pesoNetoTotal,
      pesoNetoPromedioKg: pesoNetoPromedio,
      precioKgVivoArs: formVenta.precioKg,
      facturacionTotalArs: facturacionTotal,
      costoAlimentacionTotalArs: costoAlimTotal,
      otrosGastosArs: otrosGastos,
      costoTotalArs: costoTotal,
      gananciaNetaTotalArs: gananciaNetaTotal,
      gananciaNetaPorCabezaArs: gananciaNetaPorCabeza,
      margenSobreCostoPct: margenPct,
      diasCicloTotal: 360,
    };

    const nuevasVentas = [nuevaFicha, ...ventas];
    setVentas(nuevasVentas);
    saveVentas(nuevasVentas);

    // Si se vendieron todas las cabezas, remover tropa, o descontar cabezas
    let updatedTropas = tropas;
    if (cabezas >= tropa.cabezas) {
      updatedTropas = tropas.filter((t) => t.id !== tropa.id);
    } else {
      updatedTropas = tropas.map((t) => (t.id === tropa.id ? { ...t, cabezas: t.cabezas - cabezas } : t));
    }
    setTropas(updatedTropas);
    saveTropas(updatedTropas);

    setModalNuevaVentaOpen(false);
    setModalFichaVenta(nuevaFicha);
    triggerFeedback(`¡Venta registrada con éxito! Despachadas ${cabezas} cabezas a ${formVenta.frigorifico}.`);
  }

  // Handler Nueva Camada Guachera
  function handleNuevaGuachera() {
    const today = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    const cod = formGuachera.codigo || `TR-26-G${tropas.filter((t) => t.corralId === "guachera").length + 2}`;
    const nueva: TropaGanadera = {
      id: "tropa-" + Date.now(),
      codigo: cod,
      nombre: formGuachera.nombre,
      corralId: "guachera",
      cabezas: Number(formGuachera.cabezas || 1),
      fechaIngreso: today,
      diasEnCorral: 0,
      pesoInicialKg: Number(formGuachera.pesoInicial || 38),
      pesoActualKg: Number(formGuachera.pesoInicial || 38),
      gdpvKgDia: 0.6,
      origen: "Nacimientos Tambo HJB",
    };
    const updated = [nueva, ...tropas];
    setTropas(updated);
    saveTropas(updated);
    setModalNuevaGuacheraOpen(false);
    triggerFeedback(`Nueva camada ${cod} ingresada a Guachera con éxito.`);
  }

  return (
    <AppShell active="Ganadería">
      {/* Encabezado */}
      <div className="pageHeader">
        <div>
          <div className="badgeRow" style={{ marginBottom: "6px" }}>
            <span className="pill badgeAmber">🐂 Engorde a Corral de Machos</span>
            <span className="pill badgeSlate">Ciclo Cerrado (Guachera ➔ Frigorífico)</span>
            <span className="pill badgeGreen">Modelo HJB</span>
          </div>
          <h1>Ganadería HJB</h1>
          <p className="muted">
            Gestión intensiva a corral de machos desde nacimiento/guachera hasta los 400 kg de salida comercial a frigorífico.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="ghostButton"
            onClick={() => setModalNuevaGuacheraOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            🍼 + Camada Guachera
          </button>
          <button
            type="button"
            className="ghostButton"
            onClick={() => {
              if (tropas.length > 0) {
                setFormPesaje({
                  tropaId: tropas[0].id,
                  cabezas: tropas[0].cabezas,
                  pesoPromedio: tropas[0].pesoActualKg,
                  observaciones: "",
                });
              }
              setModalNuevoPesajeOpen(true);
            }}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            ⚖️ + Cargar Pesaje
          </button>
          <button
            type="button"
            className="primaryButton"
            onClick={() => {
              const tropaGordos = tropas.find((t) => t.corralId === "terminacion") || tropas[0];
              if (tropaGordos) {
                setFormVenta({
                  tropaId: tropaGordos.id,
                  frigorifico: "Frigorífico Logros S.A.",
                  remitoDte: "",
                  cabezas: tropaGordos.cabezas,
                  pesoBrutoTotal: Math.round(tropaGordos.cabezas * tropaGordos.pesoActualKg),
                  precioKg: 4200,
                  otrosGastos: 950000,
                });
              }
              setModalNuevaVentaOpen(true);
            }}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            🚛 + Registrar Venta
          </button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "13.5px",
            fontWeight: 600,
            background: "#dcfce7",
            color: "#166534",
            border: "1px solid #86efac",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>✓</span>
          <span>{feedback}</span>
        </div>
      )}

      {/* Tarjetas de Métricas Principales */}
      <div className="metricsGrid four" style={{ marginBottom: "22px" }}>
        <MetricCard
          label="Cabezas en Engorde"
          value={`${resumen.totalCabezas} cab.`}
          note="Machos activos en 5 corrales"
        />
        <MetricCard
          label="Kilos Vivos en Corral"
          value={`${resumen.totalKilos.toLocaleString("es-AR")} kg`}
          note={`Promedio: ${resumen.pesoPromedioGeneral} kg / cab.`}
        />
        <MetricCard
          label="Listos p/ Frigorífico"
          value={`${resumen.listosFrigorifico} cab.`}
          note="Terminación (≥ 370 kg)"
        />
        <MetricCard
          label="Costo Diario Alim."
          value={`$${resumen.costoDiarioTotal.toLocaleString("es-AR")}`}
          note="Raciones vía Valores Móviles"
        />
      </div>

      {/* Navegación por Pestañas */}
      <div className="tabs" style={{ marginBottom: "20px" }}>
        <button
          type="button"
          className={activeTab === "corrales" ? "tab active" : "tab"}
          onClick={() => setActiveTab("corrales")}
        >
          📋 Corrales & Stock ({resumen.totalCabezas} cab)
        </button>
        <button
          type="button"
          className={activeTab === "dietas" ? "tab active" : "tab"}
          onClick={() => setActiveTab("dietas")}
        >
          🥣 Dietas & Costos de Alimentación
        </button>
        <button
          type="button"
          className={activeTab === "pesajes" ? "tab active" : "tab"}
          onClick={() => setActiveTab("pesajes")}
        >
          ⚖️ Control de Pesajes ({pesajes.length})
        </button>
        <button
          type="button"
          className={activeTab === "ventas" ? "tab active" : "tab"}
          onClick={() => setActiveTab("ventas")}
        >
          🚛 Ventas a Frigorífico & Fichas ({ventas.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CORRALES Y STOCK                                                  */}
      {/* ========================================================================= */}
      {activeTab === "corrales" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Grid visual de los 5 corrales */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            {CORRALES_DEFINICION.map((c) => {
              const tropasCorral = tropas.filter((t) => t.corralId === c.id);
              const cabezasCorral = tropasCorral.reduce((acc, t) => acc + t.cabezas, 0);
              const pesoPromCorral =
                cabezasCorral > 0
                  ? Math.round(tropasCorral.reduce((acc, t) => acc + t.cabezas * t.pesoActualKg, 0) / cabezasCorral)
                  : c.pesoEntradaKg;
              const progresoPct = Math.min(
                100,
                Math.round(((pesoPromCorral - c.pesoEntradaKg) / (c.pesoObjetivoKg - c.pesoEntradaKg)) * 100)
              );
              const costoDiaAnimal = getCostoDiarioPorAnimal(c.id);

              return (
                <div
                  key={c.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid var(--line)",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "var(--shadow-sm)",
                    position: "relative",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "24px" }}>{c.icono}</span>
                      <span
                        className="pill"
                        style={{ background: "#f1f5f9", color: "#334155", fontSize: "11px", fontWeight: 700 }}
                      >
                        {c.diasEstimados} días
                      </span>
                    </div>

                    <h3 style={{ fontSize: "15px", margin: "0 0 4px 0", color: "var(--slate-950)" }}>
                      {c.nombreCorto}
                    </h3>
                    <div style={{ fontSize: "12px", color: "var(--slate-500)", marginBottom: "12px" }}>
                      Objetivo: {c.pesoObjetivoKg} kg
                    </div>

                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "26px", fontWeight: 800, color: "var(--slate-900)" }}>
                        {cabezasCorral}
                      </span>
                      <span style={{ fontSize: "13px", color: "var(--slate-600)", fontWeight: 600 }}>cabezas</span>
                    </div>

                    {/* Barra de progreso de peso */}
                    <div style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "3px" }}>
                        <span style={{ color: "var(--slate-600)" }}>Peso promedio:</span>
                        <strong style={{ color: "var(--slate-900)" }}>{pesoPromCorral} kg</strong>
                      </div>
                      <div style={{ width: "100%", height: "7px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${Math.max(progresoPct, 8)}%`,
                            height: "100%",
                            background: c.color,
                            borderRadius: "999px",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "10px", marginTop: "6px" }}>
                    <div style={{ fontSize: "11.5px", color: "var(--slate-600)", marginBottom: "4px" }}>
                      Costo ración: <strong>${costoDiaAnimal.toLocaleString("es-AR")} / animal / día</strong>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--slate-400)" }}>
                      Total corral: ${(costoDiaAnimal * cabezasCorral).toLocaleString("es-AR")} / día
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabla de Tropas en Engorde */}
          <section className="panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <h2 style={{ fontSize: "17px", margin: 0 }}>Tropas Activas en Corrales</h2>
                <p className="muted" style={{ fontSize: "12.5px", margin: "3px 0 0 0" }}>
                  Inventario de machos en seguimiento con ganancia diaria y días de corral.
                </p>
              </div>
            </div>

            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Código / Nombre</th>
                    <th>Corral Actual</th>
                    <th style={{ textAlign: "right" }}>Cabezas</th>
                    <th style={{ textAlign: "right" }}>Peso Inicial</th>
                    <th style={{ textAlign: "right" }}>Peso Actual</th>
                    <th style={{ textAlign: "right" }}>Ganancia (GDPV)</th>
                    <th style={{ textAlign: "right" }}>Días Corral</th>
                    <th>Ingreso</th>
                    <th>Origen</th>
                    <th style={{ textAlign: "center" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {tropas.map((t) => {
                    const corral = CORRALES_DEFINICION.find((c) => c.id === t.corralId);
                    return (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.codigo}</strong>
                          <div style={{ fontSize: "12px", color: "var(--slate-500)" }}>{t.nombre}</div>
                        </td>
                        <td>
                          <span
                            className="pill"
                            style={{
                              background: corral?.color ? `${corral.color}20` : "#f1f5f9",
                              color: corral?.color || "#334155",
                              border: `1px solid ${corral?.color ? `${corral.color}50` : "#cbd5e1"}`,
                              fontWeight: 700,
                            }}
                          >
                            {corral?.icono} {corral?.nombreCorto}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <strong>{t.cabezas}</strong>
                        </td>
                        <td style={{ textAlign: "right" }}>{t.pesoInicialKg} kg</td>
                        <td style={{ textAlign: "right" }}>
                          <strong style={{ color: "var(--slate-950)" }}>{t.pesoActualKg} kg</strong>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className="pill badgeGreen" style={{ fontSize: "11px" }}>
                            +{t.gdpvKgDia} kg/d
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>{t.diasEnCorral} d</td>
                        <td>{t.fechaIngreso}</td>
                        <td style={{ fontSize: "12px", color: "var(--slate-600)" }}>{t.origen}</td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="ghostButton"
                            onClick={() => handleAbrirMover(t)}
                            style={{ padding: "4px 8px", fontSize: "12px" }}
                          >
                            🔄 Mover corral
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DIETAS Y COSTOS DE ALIMENTACIÓN                                    */}
      {/* ========================================================================= */}
      {activeTab === "dietas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <section className="panel" style={{ padding: "20px" }}>
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "17px", margin: 0 }}>Raciones & Dietas Diarias por Etapa (Excel HJB)</h2>
              <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                Ingredientes y kilos consumidos por animal al día en cada corral, valorizados automáticamente con los precios activos de <strong>Valores Móviles</strong>.
              </p>
            </div>

            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th style={{ minWidth: "190px" }}>Corral / Etapa</th>
                    <th style={{ minWidth: "260px" }}>Componentes de la Dieta (por animal/día)</th>
                    <th style={{ width: "110px", textAlign: "right" }}>Días Etapa</th>
                    <th style={{ width: "160px", textAlign: "right" }}>Costo Animal / Día</th>
                    <th style={{ width: "170px", textAlign: "right" }}>Costo Total Etapa / Cab.</th>
                    <th style={{ width: "170px", textAlign: "right" }}>Costo Total Corral / Día</th>
                  </tr>
                </thead>
                <tbody>
                  {CORRALES_DEFINICION.map((c) => {
                    const tropasCorral = tropas.filter((t) => t.corralId === c.id);
                    const cabezasCorral = tropasCorral.reduce((acc, t) => acc + t.cabezas, 0);
                    const costoDiaAnimal = getCostoDiarioPorAnimal(c.id);
                    const costoEtapaAnimal = costoDiaAnimal * c.diasEstimados;
                    const costoTotalCorralDia = costoDiaAnimal * cabezasCorral;

                    return (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "20px" }}>{c.icono}</span>
                            <div>
                              <strong>{c.nombreCorto}</strong>
                              <div style={{ fontSize: "11.5px", color: "var(--slate-500)" }}>
                                {c.pesoEntradaKg} kg ➔ {c.pesoObjetivoKg} kg
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12.5px", color: "var(--slate-800)" }}>
                            {c.dietaBase.map((d, i) => {
                              const precio = getCostoInsumoDieta(d.insumoId);
                              return (
                                <li key={i} style={{ marginBottom: "2px" }}>
                                  <strong>{d.cantidadKgDia} {d.unidad}</strong> de {d.nombre}{" "}
                                  <span style={{ color: "var(--slate-500)", fontSize: "11px" }}>
                                    (${precio.toLocaleString("es-AR")}/{d.unidad})
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <span className="pill badgeSlate">{c.diasEstimados} días</span>
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <strong style={{ fontSize: "14px", color: "var(--slate-950)" }}>
                            ${costoDiaAnimal.toLocaleString("es-AR")}
                          </strong>
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <strong style={{ color: "#166534" }}>${costoEtapaAnimal.toLocaleString("es-AR")}</strong>
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <strong>${costoTotalCorralDia.toLocaleString("es-AR")}</strong>
                          <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>({cabezasCorral} cabezas)</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Resumen Acumulado del Ciclo Completo */}
          <section className="panel" style={{ padding: "20px", background: "#f8fafc" }}>
            <h3 style={{ fontSize: "15px", margin: "0 0 8px 0" }}>💡 Balance Acumulado del Ciclo Completo de Engorde</h3>
            <p style={{ fontSize: "13px", color: "var(--slate-700)", margin: 0, lineHeight: 1.5 }}>
              Un ternero macho que recorre las 5 etapas consume en total aproximadamente <strong>~360 días</strong> en corrales. La suma de las dietas arroja un costo total de alimentación por animal terminado gordo (~410 kg) de aproximadamente <strong>$721.058</strong>. Al venderse en frigorífico a $4.200/kg vivo (con 7% de desbaste), genera una facturación neta de <strong>$1.601.460</strong>, dejando un margen neto superior al <strong>100%</strong> sobre los costos de alimentación.
            </p>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONTROL DE PESAJES                                                 */}
      {/* ========================================================================= */}
      {activeTab === "pesajes" && (
        <section className="panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "17px", margin: 0 }}>Historial de Balanza & Pesajes (GDPV)</h2>
              <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                Seguimiento de curvas de crecimiento y ganancia diaria de peso vivo (kg/día) por tropa.
              </p>
            </div>
            <button
              type="button"
              className="primaryButton"
              onClick={() => {
                if (tropas.length > 0) {
                  setFormPesaje({
                    tropaId: tropas[0].id,
                    cabezas: tropas[0].cabezas,
                    pesoPromedio: tropas[0].pesoActualKg,
                    observaciones: "",
                  });
                }
                setModalNuevoPesajeOpen(true);
              }}
            >
              ➕ Cargar nuevo pesaje
            </button>
          </div>

          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tropa</th>
                  <th>Corral</th>
                  <th style={{ textAlign: "right" }}>Cabezas Pesadas</th>
                  <th style={{ textAlign: "right" }}>Peso Promedio</th>
                  <th style={{ textAlign: "right" }}>Kilos Totales Lote</th>
                  <th style={{ textAlign: "right" }}>Ganancia Diaria (GDPV)</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {pesajes.map((p) => {
                  const corral = CORRALES_DEFINICION.find((c) => c.id === p.corralId);
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.fecha}</strong>
                      </td>
                      <td>{p.tropaNombre}</td>
                      <td>
                        <span className="pill badgeSlate" style={{ fontSize: "11px" }}>
                          {corral?.icono} {corral?.nombreCorto}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>{p.cabezas} cab.</td>
                      <td style={{ textAlign: "right" }}>
                        <strong>{p.pesoPromedioKg} kg</strong>
                      </td>
                      <td style={{ textAlign: "right" }}>{p.pesoTotalKg.toLocaleString("es-AR")} kg</td>
                      <td style={{ textAlign: "right" }}>
                        <span className="pill badgeGreen">+{p.gdpvCalculada} kg/d</span>
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--slate-600)" }}>{p.observaciones || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: VENTAS A FRIGORÍFICO & FICHAS DE LIQUIDACIÓN                       */}
      {/* ========================================================================= */}
      {activeTab === "ventas" && (
        <section className="panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "17px", margin: 0 }}>Historial de Ventas a Frigorífico</h2>
              <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                Registro comercial con aplicación de desbaste (7%), liquidación de kilos netos y cálculo de ganancia neta.
              </p>
            </div>
            <button
              type="button"
              className="primaryButton"
              onClick={() => {
                const tropaGordos = tropas.find((t) => t.corralId === "terminacion") || tropas[0];
                if (tropaGordos) {
                  setFormVenta({
                    tropaId: tropaGordos.id,
                    frigorifico: "Frigorífico Logros S.A.",
                    remitoDte: "",
                    cabezas: tropaGordos.cabezas,
                    pesoBrutoTotal: Math.round(tropaGordos.cabezas * tropaGordos.pesoActualKg),
                    precioKg: 4200,
                    otrosGastos: 950000,
                  });
                }
                setModalNuevaVentaOpen(true);
              }}
            >
              ➕ Registrar Venta a Frigorífico
            </button>
          </div>

          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Frigorífico / Comprador</th>
                  <th>Tropa / DTe</th>
                  <th style={{ textAlign: "right" }}>Cabezas</th>
                  <th style={{ textAlign: "right" }}>Peso Bruto</th>
                  <th style={{ textAlign: "right" }}>Desbaste</th>
                  <th style={{ textAlign: "right" }}>Peso Neto Facturado</th>
                  <th style={{ textAlign: "right" }}>Precio/kg</th>
                  <th style={{ textAlign: "right" }}>Facturación Total</th>
                  <th style={{ textAlign: "right" }}>Ganancia Neta</th>
                  <th style={{ textAlign: "center" }}>Ficha Oficial</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <strong>{v.fecha}</strong>
                    </td>
                    <td>
                      <strong>{v.frigorifico}</strong>
                    </td>
                    <td>
                      <div>{v.tropaCodigo}</div>
                      <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>{v.remitoDte}</div>
                    </td>
                    <td style={{ textAlign: "right" }}>{v.cabezas}</td>
                    <td style={{ textAlign: "right" }}>
                      {v.pesoBrutoTotalKg.toLocaleString("es-AR")} kg
                      <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>({v.pesoBrutoPromedioKg} kg/cab)</div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="pill badgeSlate">-{v.desbastePct}%</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>{v.pesoNetoTotalKg.toLocaleString("es-AR")} kg</strong>
                      <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>({v.pesoNetoPromedioKg} kg/cab)</div>
                    </td>
                    <td style={{ textAlign: "right" }}>${v.precioKgVivoArs.toLocaleString("es-AR")}</td>
                    <td style={{ textAlign: "right" }}>
                      <strong>${v.facturacionTotalArs.toLocaleString("es-AR")}</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong style={{ color: "#166534" }}>
                        +${v.gananciaNetaTotalArs.toLocaleString("es-AR")}
                      </strong>
                      <div style={{ fontSize: "11px", color: "#15803d" }}>
                        (+${v.gananciaNetaPorCabezaArs.toLocaleString("es-AR")}/cab)
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="primaryButton"
                        onClick={() => setModalFichaVenta(v)}
                        style={{ padding: "4px 10px", fontSize: "12px", background: "#0f172a" }}
                      >
                        📄 Ver Ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FICHA COMPLETA DE VENTA A FRIGORÍFICO                              */}
      {/* ========================================================================= */}
      {modalFichaVenta && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "750px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              border: "1px solid var(--line)",
              padding: "28px",
            }}
          >
            {/* Cabecera Ficha */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #e2e8f0", paddingBottom: "16px", marginBottom: "20px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className="pill badgeGreen">HJB Gestión Ganadera</span>
                  <span className="pill badgeSlate">{modalFichaVenta.remitoDte}</span>
                </div>
                <h2 style={{ fontSize: "20px", margin: 0, color: "var(--slate-950)" }}>
                  Ficha de Venta & Liquidación de Tropa
                </h2>
                <p className="muted" style={{ fontSize: "13px", margin: "2px 0 0 0" }}>
                  Despacho de Machos Gordos Terminados a Frigorífico
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalFichaVenta(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            </div>

            {/* Datos Generales */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px", background: "#f8fafc", padding: "14px", borderRadius: "8px", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--slate-500)" }}>Frigorífico Comprador:</div>
                <strong style={{ fontSize: "14.5px" }}>{modalFichaVenta.frigorifico}</strong>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--slate-500)" }}>Fecha de Despacho:</div>
                <strong style={{ fontSize: "14.5px" }}>{modalFichaVenta.fecha}</strong>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--slate-500)" }}>Tropa Origen:</div>
                <strong>{modalFichaVenta.tropaCodigo}</strong>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--slate-500)" }}>Cantidad de Cabezas:</div>
                <strong style={{ fontSize: "15px", color: "#166534" }}>{modalFichaVenta.cabezas} machos gordos</strong>
              </div>
            </div>

            {/* Desglose de Balanza y Desbaste */}
            <h3 style={{ fontSize: "15px", marginBottom: "10px", color: "var(--slate-900)" }}>
              ⚖️ Balanza & Merma Comercial (Excel HJB)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
              <div style={{ background: "#ffffff", border: "1px solid var(--line)", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11.5px", color: "var(--slate-500)" }}>Peso Bruto Total:</div>
                <strong style={{ fontSize: "16px" }}>{modalFichaVenta.pesoBrutoTotalKg.toLocaleString("es-AR")} kg</strong>
                <div style={{ fontSize: "11px", color: "var(--slate-400)" }}>({modalFichaVenta.pesoBrutoPromedioKg} kg / cab.)</div>
              </div>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11.5px", color: "#991b1b" }}>Desbaste Comercial:</div>
                <strong style={{ fontSize: "16px", color: "#991b1b" }}>-{modalFichaVenta.desbastePct}%</strong>
                <div style={{ fontSize: "11px", color: "#b91c1c" }}>Merma 370–420 kg</div>
              </div>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11.5px", color: "#166534" }}>Peso Neto Liquidado:</div>
                <strong style={{ fontSize: "16px", color: "#166534" }}>{modalFichaVenta.pesoNetoTotalKg.toLocaleString("es-AR")} kg</strong>
                <div style={{ fontSize: "11px", color: "#15803d" }}>({modalFichaVenta.pesoNetoPromedioKg} kg / cab.)</div>
              </div>
            </div>

            {/* Liquidación Económica */}
            <h3 style={{ fontSize: "15px", marginBottom: "10px", color: "var(--slate-900)" }}>
              💵 Liquidación Económica & Ganancia Neta
            </h3>
            <div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--line)" }}>
                <span>Precio pactado por kg vivo:</span>
                <strong>${modalFichaVenta.precioKgVivoArs.toLocaleString("es-AR")} / kg</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#f8fafc", borderBottom: "1px solid var(--line)" }}>
                <strong style={{ color: "var(--slate-900)" }}>Facturación Bruta Total ({modalFichaVenta.pesoNetoTotalKg.toLocaleString("es-AR")} kg netos):</strong>
                <strong style={{ color: "var(--slate-950)", fontSize: "15px" }}>${modalFichaVenta.facturacionTotalArs.toLocaleString("es-AR")}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--line)", color: "#b91c1c" }}>
                <span>(-) Costo de Alimentación Acumulado (5 etapas):</span>
                <span>-${modalFichaVenta.costoAlimentacionTotalArs.toLocaleString("es-AR")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--line)", color: "#b91c1c" }}>
                <span>(-) Flete de hacienda y DTe:</span>
                <span>-${modalFichaVenta.otrosGastosArs.toLocaleString("es-AR")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px", background: "#dcfce7", color: "#166534", fontSize: "16px" }}>
                <strong>(=) GANANCIA NETA TOTAL:</strong>
                <strong>+${modalFichaVenta.gananciaNetaTotalArs.toLocaleString("es-AR")}</strong>
              </div>
            </div>

            {/* Métricas Unitarias */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", textAlign: "center", marginBottom: "24px" }}>
              <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>Ganancia Neta por Cabeza:</div>
                <strong style={{ color: "#166534", fontSize: "15px" }}>+${modalFichaVenta.gananciaNetaPorCabezaArs.toLocaleString("es-AR")}</strong>
              </div>
              <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>Rentabilidad s/ Costo:</div>
                <strong style={{ color: "#166534", fontSize: "15px" }}>+{modalFichaVenta.margenSobreCostoPct}%</strong>
              </div>
              <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>Días Totales Ciclo:</div>
                <strong style={{ fontSize: "15px" }}>{modalFichaVenta.diasCicloTotal} días</strong>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="ghostButton"
                onClick={() => window.print()}
              >
                🖨️ Imprimir Ficha
              </button>
              <button
                type="button"
                className="primaryButton"
                onClick={() => setModalFichaVenta(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR NUEVA VENTA A FRIGORÍFICO                                */}
      {/* ========================================================================= */}
      {modalNuevaVentaOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "550px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h2 style={{ fontSize: "18px", margin: "0 0 14px 0" }}>🚛 Registrar Venta a Frigorífico</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  Seleccionar Tropa de Terminación:
                </label>
                <select
                  value={formVenta.tropaId}
                  onChange={(e) => {
                    const sel = tropas.find((t) => t.id === e.target.value);
                    setFormVenta({
                      ...formVenta,
                      tropaId: e.target.value,
                      cabezas: sel ? sel.cabezas : formVenta.cabezas,
                      pesoBrutoTotal: sel ? Math.round(sel.cabezas * sel.pesoActualKg) : formVenta.pesoBrutoTotal,
                    });
                  }}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                >
                  {tropas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.codigo} - {t.nombre} ({t.cabezas} cab., {t.pesoActualKg} kg prom.)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  Frigorífico / Comprador:
                </label>
                <input
                  type="text"
                  value={formVenta.frigorifico}
                  onChange={(e) => setFormVenta({ ...formVenta, frigorifico: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Nº Remito / DTe:
                  </label>
                  <input
                    type="text"
                    placeholder="DTe 0048-..."
                    value={formVenta.remitoDte}
                    onChange={(e) => setFormVenta({ ...formVenta, remitoDte: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Cabezas Vendidas:
                  </label>
                  <input
                    type="number"
                    value={formVenta.cabezas}
                    onChange={(e) => setFormVenta({ ...formVenta, cabezas: parseInt(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Peso Bruto Balanza Total (kg):
                  </label>
                  <input
                    type="number"
                    value={formVenta.pesoBrutoTotal}
                    onChange={(e) => setFormVenta({ ...formVenta, pesoBrutoTotal: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                  />
                  <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                    Desbaste automático: 7%
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Precio pactado $/kg vivo:
                  </label>
                  <input
                    type="number"
                    value={formVenta.precioKg}
                    onChange={(e) => setFormVenta({ ...formVenta, precioKg: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  Gastos Comerciales y Flete ($):
                </label>
                <input
                  type="number"
                  value={formVenta.otrosGastos}
                  onChange={(e) => setFormVenta({ ...formVenta, otrosGastos: parseFloat(e.target.value) || 0 })}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="ghostButton"
                onClick={() => setModalNuevaVentaOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primaryButton"
                onClick={handleRegistrarVenta}
              >
                Confirmar y Generar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MOVER DE CORRAL                                                    */}
      {/* ========================================================================= */}
      {modalMoverCorralOpen && tropaAMover && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
            }}
          >
            <h2 style={{ fontSize: "18px", margin: "0 0 12px 0" }}>
              🔄 Trasladar Tropa {tropaAMover.codigo}
            </h2>
            <p style={{ fontSize: "13px", color: "var(--slate-600)", marginBottom: "16px" }}>
              Mover animales hacia el siguiente corral en la secuencia de crecimiento.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  Destino del Corral:
                </label>
                <select
                  value={formMover.nuevoCorralId}
                  onChange={(e) => setFormMover({ ...formMover, nuevoCorralId: e.target.value as EtapaCorralId })}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                >
                  {CORRALES_DEFINICION.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icono} {c.nombreCompleto}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  Peso Actual de Entrada al Nuevo Corral (kg):
                </label>
                <input
                  type="number"
                  value={formMover.nuevoPeso}
                  onChange={(e) => setFormMover({ ...formMover, nuevoPeso: parseFloat(e.target.value) || 0 })}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="ghostButton"
                onClick={() => setModalMoverCorralOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primaryButton"
                onClick={handleConfirmarMover}
              >
                Confirmar Traslado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CARGAR PESAJE                                                      */}
      {/* ========================================================================= */}
      {modalNuevoPesajeOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
            }}
          >
            <h2 style={{ fontSize: "18px", margin: "0 0 12px 0" }}>⚖️ Cargar Pesaje de Control</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  Tropa a Pesar:
                </label>
                <select
                  value={formPesaje.tropaId}
                  onChange={(e) => {
                    const sel = tropas.find((t) => t.id === e.target.value);
                    setFormPesaje({
                      ...formPesaje,
                      tropaId: e.target.value,
                      cabezas: sel ? sel.cabezas : formPesaje.cabezas,
                      pesoPromedio: sel ? sel.pesoActualKg : formPesaje.pesoPromedio,
                    });
                  }}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                >
                  {tropas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.codigo} - {t.nombre} ({t.cabezas} cab.)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  Peso Promedio Balanza (kg):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formPesaje.pesoPromedio}
                  onChange={(e) => setFormPesaje({ ...formPesaje, pesoPromedio: parseFloat(e.target.value) || 0 })}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  Observaciones:
                </label>
                <input
                  type="text"
                  placeholder="Pesaje de rutina / desleche..."
                  value={formPesaje.observaciones}
                  onChange={(e) => setFormPesaje({ ...formPesaje, observaciones: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="ghostButton"
                onClick={() => setModalNuevoPesajeOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primaryButton"
                onClick={handleRegistrarPesaje}
              >
                Guardar Pesaje
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NUEVA CAMADA GUACHERA                                              */}
      {/* ========================================================================= */}
      {modalNuevaGuacheraOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
            }}
          >
            <h2 style={{ fontSize: "18px", margin: "0 0 12px 0" }}>🍼 Ingresar Camada a Guachera</h2>
            <p style={{ fontSize: "13px", color: "var(--slate-600)", marginBottom: "16px" }}>
              Dar de alta nuevos terneros machos nacidos en el tambo para inicio de crianza artificial.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  Nombre / Lote:
                </label>
                <input
                  type="text"
                  value={formGuachera.nombre}
                  onChange={(e) => setFormGuachera({ ...formGuachera, nombre: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Cantidad Cabezas:
                  </label>
                  <input
                    type="number"
                    value={formGuachera.cabezas}
                    onChange={(e) => setFormGuachera({ ...formGuachera, cabezas: parseInt(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Peso Nacimiento (kg):
                  </label>
                  <input
                    type="number"
                    value={formGuachera.pesoInicial}
                    onChange={(e) => setFormGuachera({ ...formGuachera, pesoInicial: parseFloat(e.target.value) || 38 })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="ghostButton"
                onClick={() => setModalNuevaGuacheraOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primaryButton"
                onClick={handleNuevaGuachera}
              >
                Ingresar a Guachera
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
