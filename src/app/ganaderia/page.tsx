"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import {
  DefinicionCorral,
  EtapaCorralId,
  FichaVentaFrigorifico,
  PesajeRegistro,
  TropaGanadera,
  getCorrales,
  getCostoDiarioPorAnimal,
  getCostoInsumoDieta,
  getPesajes,
  getResumenGanaderia,
  getTropas,
  getVentas,
  saveCorrales,
  savePesajes,
  saveTropas,
  saveVentas,
  resetCorralesToDefault,
  getPartosRecientesDelPro,
  HJB_GANADERIA_SYNC_EVENT,
} from "@/lib/ganaderiaData";
import {
  getDelProConfig,
  DelProConfig,
  HJB_DELPRO_SYNC_EVENT,
  AnimalRecriaIndividual,
  TraspasoCorralRegistro,
  getAnimalesRecria,
  saveAnimalesRecria,
  getTraspasosCorrales,
  saveTraspasosCorrales,
  evaluarYEjecutarTraspasosAutomaticos,
  calcularPesoEstimativoVida,
  resolverPesoAnimal,
} from "@/lib/delproData";
import { ModalRegistrarVentaRemito } from "@/components/ModalRegistrarVentaRemito";
import { ResultadoVentaHacienda, getVentasHacienda } from "@/lib/ventasHaciendaData";

export default function GanaderiaPage() {
  const [activeTab, setActiveTab] = useState<"corrales" | "dietas" | "pesajes" | "ventas" | "partos_delpro">("corrales");
  const [corrales, setCorrales] = useState<DefinicionCorral[]>([]);
  const [tropas, setTropas] = useState<TropaGanadera[]>([]);
  const [pesajes, setPesajes] = useState<PesajeRegistro[]>([]);
  const [ventas, setVentas] = useState<FichaVentaFrigorifico[]>([]);
  const [partosDelPro, setPartosDelPro] = useState(() => getPartosRecientesDelPro());
  const [delproConfig, setDelproConfig] = useState<DelProConfig>(() => getDelProConfig());
  const [animalesRecria, setAnimalesRecria] = useState<AnimalRecriaIndividual[]>(() => getAnimalesRecria());
  const [traspasosCorrales, setTraspasosCorrales] = useState<TraspasoCorralRegistro[]>(() => getTraspasosCorrales());
  const [filtroRecriaCorral, setFiltroRecriaCorral] = useState<string>("todos");
  const [filtroRecriaBusqueda, setFiltroRecriaBusqueda] = useState<string>("");
  const [paginaRecria, setPaginaRecria] = useState<number>(1);
  const [busquedaAnimalModal, setBusquedaAnimalModal] = useState<string>("");
  const [mostrarHistorialTraspasos, setMostrarHistorialTraspasos] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal de Venta con Foto de Remito
  const [modalVentaRemitoOpen, setModalVentaRemitoOpen] = useState(false);

  // Ficha Técnica Dedicada del Corral (Modal Enfocado)
  const [modalFichaCorralId, setModalFichaCorralId] = useState<EtapaCorralId | null>(null);
  const [modoEdicionDietaModal, setModoEdicionDietaModal] = useState(false);


  // Dietas con modificaciones no guardadas
  const [hasDietChanges, setHasDietChanges] = useState(false);

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

  function cargarTodoGanaderia() {
    setCorrales(getCorrales());
    setTropas(getTropas());
    setPesajes(getPesajes());
    setVentas(getVentas());
    setPartosDelPro(getPartosRecientesDelPro());
    setDelproConfig(getDelProConfig());
    setAnimalesRecria(getAnimalesRecria());
    setTraspasosCorrales(getTraspasosCorrales());
  }

  function handleEjecutarTraspasosAutomaticos() {
    const res = evaluarYEjecutarTraspasosAutomaticos(animalesRecria);
    setAnimalesRecria(res.animalesActualizados);
    saveAnimalesRecria(res.animalesActualizados);

    if (res.traspasosRealizados.length > 0) {
      const nuevoHistorial = [...res.traspasosRealizados, ...traspasosCorrales].slice(0, 50);
      setTraspasosCorrales(nuevoHistorial);
      saveTraspasosCorrales(nuevoHistorial);
      triggerFeedback(`✓ ¡Traspasos ejecutados! Se movieron ${res.traspasosRealizados.length} terneros a su siguiente corral según escala HJB.`);
    } else {
      triggerFeedback("✓ Todos los terneros se encuentran actualmente en el corral adecuado según su peso y estadía.");
    }
  }

  function handleTraspasarAnimalManual(rp: string, nuevoCorral: EtapaCorralId) {
    const animal = animalesRecria.find((a) => a.rp === rp);
    if (!animal) return;
    const origen = animal.corralId;
    const hoy = new Date().toLocaleDateString("es-AR");
    const actualizado: AnimalRecriaIndividual = {
      ...animal,
      corralId: nuevoCorral,
      diasEnCorral: 0,
      fechaIngresoCorral: hoy,
      listoFaena: nuevoCorral === "terminacion" && animal.pesoActualKg >= 370,
    };
    const listaActualizada = animalesRecria.map((a) => (a.rp === rp ? actualizado : a));
    const nuevoTraspaso: TraspasoCorralRegistro = {
      id: `tr-man-${Date.now()}`,
      fecha: hoy,
      rpAnimal: rp,
      corralOrigen: origen,
      corralDestino: nuevoCorral,
      pesoAlTraspaso: animal.pesoActualKg,
      motivo: `Traspaso manual por operador (${origen.toUpperCase()} ➔ ${nuevoCorral.toUpperCase()})`,
    };
    const nuevoHist = [nuevoTraspaso, ...traspasosCorrales].slice(0, 50);
    setAnimalesRecria(listaActualizada);
    saveAnimalesRecria(listaActualizada);
    setTraspasosCorrales(nuevoHist);
    saveTraspasosCorrales(nuevoHist);
    triggerFeedback(`Animal ${rp} trasladado a ${nuevoCorral.toUpperCase()}.`);
  }

  useEffect(() => {
    cargarTodoGanaderia();

    function onSync() {
      cargarTodoGanaderia();
    }

    window.addEventListener(HJB_GANADERIA_SYNC_EVENT, onSync);
    window.addEventListener(HJB_DELPRO_SYNC_EVENT, onSync);
    return () => {
      window.removeEventListener(HJB_GANADERIA_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_DELPRO_SYNC_EVENT, onSync);
    };
  }, []);

  const resumen = getResumenGanaderia(corrales, tropas);

  const censoData = delproConfig.datosSincronizados.censoRodeoTambo;
  const totalAnimalesEstablecimiento = (censoData?.totalRodeoGeneral && censoData.totalRodeoGeneral >= 500)
    ? censoData.totalRodeoGeneral
    : (delproConfig.datosSincronizados.totalRodeoGeneral && delproConfig.datosSincronizados.totalRodeoGeneral >= 500)
    ? delproConfig.datosSincronizados.totalRodeoGeneral
    : 514;

  const totalMachosGanaderia = (censoData?.novillosRecriaEngorde && censoData.novillosRecriaEngorde > 0)
    ? (censoData.novillosRecriaEngorde + (censoData.ternerosCrianzaMachos || (censoData.ternerasCrianzaHembras ? 26 - censoData.ternerasCrianzaHembras : 9)))
    : (resumen.totalCabezas || 93);

  function triggerFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  }

  // Guardar Cambios en Dietas
  function handleGuardarDietas() {
    saveCorrales(corrales);
    setHasDietChanges(false);
    triggerFeedback("¡Dietas y raciones actualizadas y guardadas con éxito!");
  }

  function handleRestaurarDietas() {
    const defaults = resetCorralesToDefault();
    setCorrales(defaults);
    setHasDietChanges(false);
    triggerFeedback("Se restauraron las raciones de referencia originales de HJB.");
  }


  // Modificar cantidad de insumo en una dieta
  function handleEditCantidadDieta(corralId: EtapaCorralId, insumoIdx: number, newCant: number) {
    const updated = corrales.map((c) => {
      if (c.id === corralId) {
        const newDieta = [...c.dietaBase];
        newDieta[insumoIdx] = { ...newDieta[insumoIdx], cantidadKgDia: Math.max(0, newCant) };
        return { ...c, dietaBase: newDieta };
      }
      return c;
    });
    setCorrales(updated);
    setHasDietChanges(true);
  }

  // Handler Mover Corral
  function handleAbrirMover(tropa: TropaGanadera) {
    setTropaAMover(tropa);
    const corrActualIdx = corrales.findIndex((c) => c.id === tropa.corralId);
    const sigCorral = corrales[corrActualIdx + 1] || corrales[corrActualIdx];
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
    triggerFeedback(`Tropa ${tropaAMover.codigo} trasladada con éxito.`);
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

    const updatedTropas = tropas.map((t) =>
      t.id === tropa.id ? { ...t, pesoActualKg: formPesaje.pesoPromedio, gdpvKgDia: nuevoPesaje.gdpvCalculada } : t
    );
    setTropas(updatedTropas);
    saveTropas(updatedTropas);

    setModalNuevoPesajeOpen(false);
    triggerFeedback(`Pesaje registrado: ${formPesaje.pesoPromedio} kg de promedio.`);
  }

  // Handler Registrar Venta
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
    triggerFeedback(`¡Venta registrada con éxito! Despachadas ${cabezas} cabezas.`);
  }

  // Handler Venta con Foto de Remito (Inteligente / Multisección)
  function handleVentaRemitoCompletada(resultado: ResultadoVentaHacienda) {
    setTropas(getTropas());
    setVentas(getVentas());
    setAnimalesRecria(getAnimalesRecria());
    setDelproConfig(getDelProConfig());
    triggerFeedback(resultado.mensaje);
    if (resultado.venta) {
      const ficha = getVentas().find((v) => v.remitoDte === resultado.venta.remitoDte) || getVentas()[0];
      if (ficha) setModalFichaVenta(ficha);
    }
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


  // Cálculos para la Ficha Técnica de Corral (Modal)
  const corralModalSeleccionado = corrales.find((c) => c.id === modalFichaCorralId);
  const tropasModal = tropas.filter((t) => t.corralId === modalFichaCorralId);
  const cabezasModal = tropasModal.reduce((acc, t) => acc + t.cabezas, 0);
  const pesoPromModal =
    cabezasModal > 0
      ? Math.round(tropasModal.reduce((acc, t) => acc + t.cabezas * t.pesoActualKg, 0) / cabezasModal)
      : (corralModalSeleccionado?.pesoEntradaKg || 0);
  const gdpvPromModal =
    cabezasModal > 0
      ? Number((tropasModal.reduce((acc, t) => acc + t.cabezas * t.gdpvKgDia, 0) / cabezasModal).toFixed(2))
      : 0;
  const diasPromModal =
    cabezasModal > 0
      ? Math.round(tropasModal.reduce((acc, t) => acc + t.cabezas * t.diasEnCorral, 0) / cabezasModal)
      : 0;
  const costoDiaAnimalModal = corralModalSeleccionado ? getCostoDiarioPorAnimal(corralModalSeleccionado.id, corrales) : 0;
  const costoTotalCorralDiaModal = costoDiaAnimalModal * cabezasModal;
  const progresoModalPct = corralModalSeleccionado
    ? Math.min(
        100,
        Math.round(
          ((pesoPromModal - corralModalSeleccionado.pesoEntradaKg) /
            (corralModalSeleccionado.pesoObjetivoKg - corralModalSeleccionado.pesoEntradaKg)) *
            100
        )
      )
    : 0;

  return (
    <AppShell active="Ganadería">
      {/* Encabezado */}
      <div className="pageHeader">
        <div>
          <div className="badgeRow" style={{ marginBottom: "6px" }}>
            <span className="pill badgeSlate">🏷️ {totalAnimalesEstablecimiento} Animales Totales (DelPro)</span>
            <span className="pill badgeAmber">♂️ {totalMachosGanaderia} Total Machos (Ganadería)</span>
            <span className="pill badgeGreen">Modelo HJB</span>
          </div>
          <h1>Ganadería HJB</h1>
          <p className="muted">
            Gestión intensiva a corral exclusiva de machos desde nacimiento en guachera hasta los 400 kg de salida comercial a frigorífico.
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
            onClick={() => setModalVentaRemitoOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#166534",
              borderColor: "#166534",
            }}
          >
            📸 Registrar Venta (Foto Remito)
          </button>
          <button
            type="button"
            className="secondaryBtn"
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
            🚛 + Venta Manual
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

      {hasDietChanges && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "13px",
            fontWeight: 600,
            background: "#fef3c7",
            color: "#92400e",
            border: "1px solid #fcd34d",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>⚠️ Modificaste los kilos de la ración. Guardá para aplicar a todo el sistema.</span>
          <button
            type="button"
            onClick={handleGuardarDietas}
            style={{
              background: "#b45309",
              color: "#ffffff",
              border: "none",
              padding: "4px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            💾 Guardar Ración ahora
          </button>
        </div>
      )}

      {/* 5 Tarjetas de Métricas Principales (Solo Machos + Total Establecimiento) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px", marginBottom: "22px" }}>
        <div style={{ background: "#f8fafc", border: "1.5px solid #94a3b8", padding: "14px", borderRadius: "10px" }}>
          <div style={{ fontSize: "11px", color: "var(--slate-600)", fontWeight: 800, textTransform: "uppercase" }}>🏷️ TOTAL ANIMALES</div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--slate-900)", marginTop: "2px" }}>
            {totalAnimalesEstablecimiento} cab.
          </div>
          <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
            100% Stock General (Machos + Hembras)
          </div>
        </div>

        <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", padding: "14px", borderRadius: "10px" }}>
          <div style={{ fontSize: "11px", color: "#b45309", fontWeight: 800, textTransform: "uppercase" }}>♂️ TOTAL MACHOS (GANADERÍA)</div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#b45309", marginTop: "2px" }}>
            {totalMachosGanaderia} cab.
          </div>
          <div style={{ fontSize: "11px", color: "#92400e", marginTop: "2px" }}>
            100% Machos en Recría & Engorde
          </div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid var(--line)", padding: "14px", borderRadius: "10px" }}>
          <div style={{ fontSize: "11px", color: "var(--slate-500)", fontWeight: 700, textTransform: "uppercase" }}>⚖️ Kilos Vivos en Corral</div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--slate-900)", marginTop: "2px" }}>
            {resumen.totalKilos.toLocaleString("es-AR")} kg
          </div>
          <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
            Promedio: {resumen.pesoPromedioGeneral} kg / cab.
          </div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid var(--line)", padding: "14px", borderRadius: "10px" }}>
          <div style={{ fontSize: "11px", color: "var(--slate-500)", fontWeight: 700, textTransform: "uppercase" }}>🥩 Listos p/ Frigorífico</div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#15803d", marginTop: "2px" }}>
            {resumen.listosFrigorifico} cab.
          </div>
          <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
            Terminación (≥ 370 kg)
          </div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid var(--line)", padding: "14px", borderRadius: "10px" }}>
          <div style={{ fontSize: "11px", color: "var(--slate-500)", fontWeight: 700, textTransform: "uppercase" }}>💵 Costo Diario Alim.</div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--slate-900)", marginTop: "2px" }}>
            ${resumen.costoDiarioTotal.toLocaleString("es-AR")}
          </div>
          <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
            Raciones vía Valores Móviles
          </div>
        </div>
      </div>

      {/* Navegación por Pestañas */}      {/* Navegación por Pestañas */}
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
          🥣 Dietas & Costos de Alimentación {hasDietChanges && "⚠️"}
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
        <button
          type="button"
          className={activeTab === "partos_delpro" ? "tab active" : "tab"}
          onClick={() => setActiveTab("partos_delpro")}
        >
          🐣 Nacimientos DelPro (
          {partosDelPro.length > 0
            ? partosDelPro.length
            : delproConfig.datosSincronizados.partosRecientes?.length || 0}
          )
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CORRALES Y STOCK                                                  */}
      {/* ========================================================================= */}
      {activeTab === "corrales" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Banner de Ayuda: Clic para entrar a cada corral */}
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "13px",
              color: "#1e40af",
            }}
          >
            <span>
              💡 <strong>Hacé clic en cualquier corral</strong> para abrir su Ficha Técnica Completa con costos de alimentación desglosados, ración para mixer y tropas.
            </span>
          </div>

          {/* Grid interactivo de los 5 corrales (Clickables) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            {corrales.map((c) => {
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
              const costoDiaAnimal = getCostoDiarioPorAnimal(c.id, corrales);

              return (
                <div
                  key={c.id}
                  onClick={() => setModalFichaCorralId(c.id)}
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
                    cursor: "pointer",
                    transition: "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = c.color;
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--line)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "var(--shadow-sm)";
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
                    <div style={{ fontSize: "11.5px", color: "var(--slate-600)", marginBottom: "2px" }}>
                      Costo ración: <strong>${costoDiaAnimal.toLocaleString("es-AR")} / animal / día</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                      <span style={{ fontSize: "11px", color: "var(--slate-400)" }}>
                        Total: ${(costoDiaAnimal * cabezasCorral).toLocaleString("es-AR")}/d
                      </span>
                      <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#2563eb" }}>
                        🔍 Ver Ficha Técnica ➔
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>



          {/* ========================================================================= */}
          {/* TABLA DE TRAZABILIDAD INDIVIDUAL Y CENSO DE TERNEROS POR CARAVANA / RP     */}
          {/* ========================================================================= */}
          {(() => {
            // EN GANADERÍA SOLO ESTÁN LOS MACHOS (100% MACHOS)
            const soloMachosRecria = animalesRecria.filter(
              (a) => a.sexo === "Macho" || (a as any).Sex === 1 || !(a.sexo === "Hembra" || (a as any).Sex === 2)
            );

            const animalesFiltrados = soloMachosRecria.filter((a) => {
              const cumpleCorral =
                filtroRecriaCorral === "todos"
                  ? true
                  : filtroRecriaCorral === "faena"
                  ? a.listoFaena
                  : a.corralId === filtroRecriaCorral;
              const cumpleRP = filtroRecriaBusqueda.trim() === "" || a.rp.toLowerCase().includes(filtroRecriaBusqueda.toLowerCase());
              return cumpleCorral && cumpleRP;
            });

            const porPagina = 15;
            const totalPaginas = Math.ceil(animalesFiltrados.length / porPagina) || 1;
            const paginaValida = Math.min(paginaRecria, totalPaginas);
            const animalesPaginados = animalesFiltrados.slice((paginaValida - 1) * porPagina, paginaValida * porPagina);

            const countGuachera = soloMachosRecria.filter((a) => a.corralId === "guachera").length;
            const countRm1 = soloMachosRecria.filter((a) => a.corralId === "rm1").length;
            const countRm2 = soloMachosRecria.filter((a) => a.corralId === "rm2").length;
            const countRm3 = soloMachosRecria.filter((a) => a.corralId === "rm3").length;
            const countTerminacion = soloMachosRecria.filter((a) => a.corralId === "terminacion").length;
            const countFaena = soloMachosRecria.filter((a) => a.listoFaena).length;

            return (
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--line)",
                  borderRadius: "12px",
                  padding: "18px 20px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {/* Header y Filtros */}
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
                    <h3 style={{ fontSize: "16px", margin: 0, fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>🏷️</span>
                      <span>Trazabilidad Individual de Machos por Caravana / RP ({soloMachosRecria.length} cabezas 100% Machos)</span>
                    </h3>
                    <p className="muted" style={{ fontSize: "12px", margin: "2px 0 0 0" }}>
                      Circuito exclusivo de terneros y novillos machos en recría y terminación comercial para frigorífico con curva biológica continua.
                    </p>
                  </div>

                  {/* Buscador de RP */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="text"
                      placeholder="🔍 Buscar RP (ej: RP-8750)..."
                      value={filtroRecriaBusqueda}
                      onChange={(e) => {
                        setFiltroRecriaBusqueda(e.target.value);
                        setPaginaRecria(1);
                      }}
                      style={{
                        padding: "6px 12px",
                        fontSize: "12.5px",
                        borderRadius: "6px",
                        border: "1px solid var(--line)",
                        width: "220px",
                      }}
                    />
                    {filtroRecriaBusqueda && (
                      <button
                        type="button"
                        className="ghostButton"
                        onClick={() => setFiltroRecriaBusqueda("")}
                        style={{ padding: "6px 10px", fontSize: "12px" }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtros por Corral */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <button
                    type="button"
                    onClick={() => { setFiltroRecriaCorral("todos"); setPaginaRecria(1); }}
                    style={{
                      padding: "5px 10px",
                      fontSize: "12px",
                      fontWeight: 700,
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      background: filtroRecriaCorral === "todos" ? "#0f172a" : "#f1f5f9",
                      color: filtroRecriaCorral === "todos" ? "#ffffff" : "#475569",
                    }}
                  >
                    Todos ({animalesRecria.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFiltroRecriaCorral("guachera"); setPaginaRecria(1); }}
                    style={{
                      padding: "5px 10px",
                      fontSize: "12px",
                      fontWeight: 700,
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      background: filtroRecriaCorral === "guachera" ? "#0284c7" : "#f1f5f9",
                      color: filtroRecriaCorral === "guachera" ? "#ffffff" : "#475569",
                    }}
                  >
                    🍼 Guachera ({countGuachera})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFiltroRecriaCorral("rm1"); setPaginaRecria(1); }}
                    style={{
                      padding: "5px 10px",
                      fontSize: "12px",
                      fontWeight: 700,
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      background: filtroRecriaCorral === "rm1" ? "#16a34a" : "#f1f5f9",
                      color: filtroRecriaCorral === "rm1" ? "#ffffff" : "#475569",
                    }}
                  >
                    🌱 RM1 ({countRm1})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFiltroRecriaCorral("rm2"); setPaginaRecria(1); }}
                    style={{
                      padding: "5px 10px",
                      fontSize: "12px",
                      fontWeight: 700,
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      background: filtroRecriaCorral === "rm2" ? "#d97706" : "#f1f5f9",
                      color: filtroRecriaCorral === "rm2" ? "#ffffff" : "#475569",
                    }}
                  >
                    🌿 RM2 ({countRm2})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFiltroRecriaCorral("rm3"); setPaginaRecria(1); }}
                    style={{
                      padding: "5px 10px",
                      fontSize: "12px",
                      fontWeight: 700,
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      background: filtroRecriaCorral === "rm3" ? "#7c3aed" : "#f1f5f9",
                      color: filtroRecriaCorral === "rm3" ? "#ffffff" : "#475569",
                    }}
                  >
                    🌾 RM3 ({countRm3})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFiltroRecriaCorral("terminacion"); setPaginaRecria(1); }}
                    style={{
                      padding: "5px 10px",
                      fontSize: "12px",
                      fontWeight: 700,
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      background: filtroRecriaCorral === "terminacion" ? "#dc2626" : "#f1f5f9",
                      color: filtroRecriaCorral === "terminacion" ? "#ffffff" : "#475569",
                    }}
                  >
                    🥩 Terminación ({countTerminacion})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFiltroRecriaCorral("faena"); setPaginaRecria(1); }}
                    style={{
                      padding: "5px 10px",
                      fontSize: "12px",
                      fontWeight: 700,
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      background: filtroRecriaCorral === "faena" ? "#15803d" : "#f1f5f9",
                      color: filtroRecriaCorral === "faena" ? "#ffffff" : "#475569",
                    }}
                  >
                    🎯 Listos p/ Faena ({countFaena})
                  </button>
                </div>

                {/* Tabla de Animales */}
                <div className="tableWrap">
                  <table className="dataTable">
                    <thead>
                      <tr>
                        <th>Caravana / RP</th>
                        <th>Corral Actual</th>
                        <th style={{ textAlign: "right" }}>Peso Animal (Balanza / Estimado)</th>
                        <th style={{ textAlign: "right" }}>Ganancia (GDPV)</th>
                        <th style={{ textAlign: "right" }}>Edad / Días Corral</th>
                        <th>Fecha Ingreso</th>
                        <th>Estado / Próximo Traspaso</th>
                        <th style={{ textAlign: "center" }}>Traspaso Manual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {animalesPaginados.map((a) => {
                        const infoPeso = resolverPesoAnimal(a);
                        const corralObj = corrales.find((c) => c.id === a.corralId);
                        const pesoMostrar = infoPeso.pesoKg;
                        const diasVidaMostrar = infoPeso.diasVida;
                        const superaCorte =
                          (a.corralId === "guachera" && (pesoMostrar >= 80 || a.diasEnCorral >= 60)) ||
                          (a.corralId === "rm1" && pesoMostrar >= 120) ||
                          (a.corralId === "rm2" && pesoMostrar >= 170) ||
                          (a.corralId === "rm3" && pesoMostrar >= 270) ||
                          (a.corralId === "terminacion" && pesoMostrar >= 370);

                        return (
                          <tr key={a.rp}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <strong style={{ fontFamily: "monospace", fontSize: "13.5px" }}>{a.rp}</strong>
                                <span className="pill badgeBlue" style={{ fontSize: "10px", fontWeight: 700, padding: "1px 6px" }}>
                                  ♂️ Macho
                                </span>
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>{a.origen}</div>
                              {a.grupoDelPro && (
                                <div style={{ fontSize: "10.5px", color: "#2563eb", fontWeight: 600 }}>
                                  🚜 DelPro: {a.grupoDelPro}
                                </div>
                              )}
                            </td>
                            <td>
                              <span
                                className="pill"
                                style={{
                                  background: "#f1f5f9",
                                  color: corralObj?.color || "#0f172a",
                                  fontWeight: 700,
                                  fontSize: "11.5px",
                                }}
                              >
                                {corralObj?.icono} {corralObj?.nombreCorto || a.corralId.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                                <strong style={{ fontSize: "14px", color: infoPeso.esOficialDelPro ? "#166534" : "#0f172a" }}>
                                  {infoPeso.pesoKg} kg
                                </strong>
                                <span
                                  className={`pill ${infoPeso.badgeClase}`}
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    padding: "2px 6px",
                                    border: infoPeso.esOficialDelPro ? "1px solid #86efac" : "1px solid #bae6fd",
                                    background: infoPeso.esOficialDelPro ? "#dcfce7" : "#e0f2fe",
                                    color: infoPeso.esOficialDelPro ? "#166534" : "#0369a1",
                                  }}
                                  title={infoPeso.detalleCalculo}
                                >
                                  {infoPeso.icono} {infoPeso.origenEtiqueta}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: "10.5px",
                                  color: infoPeso.esOficialDelPro ? "#15803d" : "#0284c7",
                                  fontWeight: 600,
                                  marginTop: "2px",
                                }}
                                title={infoPeso.detalleCalculo}
                              >
                                {infoPeso.detalleCalculo}
                              </div>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <span className="pill badgeGreen">+{infoPeso.gdpvKgDia} kg/d</span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <strong style={{ fontSize: "13px", color: "#0f172a" }}>{diasVidaMostrar} d vida</strong>
                              <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                                {a.diasEnCorral} d en corral
                              </div>
                            </td>
                            <td style={{ fontSize: "12px" }}>{a.fechaIngresoCorral}</td>
                            <td>
                              {pesoMostrar >= 370 ? (
                                <span className="pill badgeGreen" style={{ fontWeight: 800 }}>🥩 Listo Faena ({pesoMostrar} kg)</span>
                              ) : superaCorte ? (
                                <span className="pill badgeAmber" style={{ fontWeight: 700 }}>⚡ Cumple corte de traspaso</span>
                              ) : (
                                <span className="pill badgeSlate" style={{ fontSize: "11.5px" }}>
                                  Meta: {corralObj?.pesoObjetivoKg} kg ({Math.max(0, Math.round((corralObj?.pesoObjetivoKg || 0) - pesoMostrar))} kg faltantes)
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleTraspasarAnimalManual(a.rp, e.target.value as EtapaCorralId);
                                  }
                                }}
                                style={{
                                  padding: "3px 8px",
                                  fontSize: "11.5px",
                                  borderRadius: "5px",
                                  border: "1px solid var(--line)",
                                  cursor: "pointer",
                                  background: "#f8fafc",
                                }}
                              >
                                <option value="" disabled>Mover a...</option>
                                {corrales.filter((c) => c.id !== a.corralId).map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.icono} {c.nombreCorto}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                {totalPaginas > 1 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "14px",
                      paddingTop: "12px",
                      borderTop: "1px solid var(--line)",
                      fontSize: "12.5px",
                      color: "var(--slate-600)",
                    }}
                  >
                    <span>
                      Mostrando {animalesPaginados.length} de {animalesFiltrados.length} animales (Página {paginaValida} de {totalPaginas})
                    </span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        className="ghostButton"
                        disabled={paginaValida <= 1}
                        onClick={() => setPaginaRecria((p) => Math.max(1, p - 1))}
                        style={{ padding: "4px 10px", fontSize: "12px" }}
                      >
                        ◀ Anterior
                      </button>
                      <button
                        type="button"
                        className="ghostButton"
                        disabled={paginaValida >= totalPaginas}
                        onClick={() => setPaginaRecria((p) => Math.min(totalPaginas, p + 1))}
                        style={{ padding: "4px 10px", fontSize: "12px" }}
                      >
                        Siguiente ▶
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DIETAS Y COSTOS DE ALIMENTACIÓN (100% EDITABLES)                   */}
      {/* ========================================================================= */}
      {activeTab === "dietas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <section className="panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h2 style={{ fontSize: "17px", margin: 0 }}>Raciones & Dietas Diarias por Etapa (100% Editables)</h2>
                <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                  Podés modificar los kilos de cada ingrediente. Los costos se recalculan en tiempo real cruzados con los precios de <strong>Valores Móviles</strong>.
                </p>
              </div>

              <button
                type="button"
                className="primaryButton"
                onClick={handleGuardarDietas}
                disabled={!hasDietChanges}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  opacity: hasDietChanges ? 1 : 0.6,
                }}
              >
                💾 Guardar Cambios de Raciones
              </button>
            </div>

            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th style={{ minWidth: "190px" }}>Corral / Etapa</th>
                    <th style={{ minWidth: "320px" }}>Componentes de la Dieta (Editables kg/día)</th>
                    <th style={{ width: "110px", textAlign: "right" }}>Días Etapa</th>
                    <th style={{ width: "160px", textAlign: "right" }}>Costo Animal / Día</th>
                    <th style={{ width: "170px", textAlign: "right" }}>Costo Total Etapa / Cab.</th>
                    <th style={{ width: "170px", textAlign: "right" }}>Costo Total Corral / Día</th>
                  </tr>
                </thead>
                <tbody>
                  {corrales.map((c) => {
                    const tropasCorral = tropas.filter((t) => t.corralId === c.id);
                    const cabezasCorral = tropasCorral.reduce((acc, t) => acc + t.cabezas, 0);
                    const costoDiaAnimal = getCostoDiarioPorAnimal(c.id, corrales);
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
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {c.dietaBase.map((d, i) => {
                              const precio = getCostoInsumoDieta(d.insumoId);
                              return (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "8px",
                                    background: "#f8fafc",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    border: "1px solid var(--line)",
                                  }}
                                >
                                  <span style={{ fontSize: "12px", color: "var(--slate-800)", fontWeight: 500 }}>
                                    {d.nombre}:
                                  </span>
                                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    <input
                                      type="number"
                                      step="0.05"
                                      value={d.cantidadKgDia}
                                      onChange={(e) =>
                                        handleEditCantidadDieta(c.id, i, parseFloat(e.target.value) || 0)
                                      }
                                      style={{
                                        width: "65px",
                                        padding: "2px 4px",
                                        borderRadius: "4px",
                                        border: "1px solid #cbd5e1",
                                        fontWeight: 700,
                                        textAlign: "right",
                                        fontSize: "12.5px",
                                      }}
                                    />
                                    <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>{d.unidad}</span>
                                    <span style={{ fontSize: "10.5px", color: "var(--slate-400)", marginLeft: "4px" }}>
                                      (${precio}/{d.unidad})
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <span className="pill badgeSlate">{c.diasEstimados} días</span>
                          <div style={{ marginTop: "6px" }}>
                            <button
                              type="button"
                              className="ghostButton"
                              onClick={() => setModalFichaCorralId(c.id)}
                              style={{ padding: "3px 8px", fontSize: "11px", fontWeight: 700 }}
                            >
                              🔍 Ver Ficha
                            </button>
                          </div>
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
                  const corral = corrales.find((c) => c.id === p.corralId);
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
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                className="primaryButton"
                onClick={() => setModalVentaRemitoOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#166534",
                  borderColor: "#166534",
                }}
              >
                📸 Registrar Venta con Foto Remito / IA
              </button>
              <button
                type="button"
                className="secondaryBtn"
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
                ➕ Venta Manual
              </button>
            </div>
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
      {/* TAB 5: TRAZABILIDAD DE PARTOS & SEGREGACIÓN HJB (DELAVAL DELPRO)          */}
      {/* ========================================================================= */}
      {activeTab === "partos_delpro" && (
        <section className="panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }}>🐣</span>
                <h2 style={{ fontSize: "17.5px", margin: 0, fontWeight: 800 }}>
                  Trazabilidad de Partos & Segregación HJB (DeLaval DelPro)
                </h2>
                <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 700 }}>
                  🟢 Conectado con SQL DelPro
                </span>
              </div>
              <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                <strong>Regla de Negocio HJB:</strong> El 100% de los terneros machos nacidos en el tambo se integran al circuito de engorde comercial (comenzando en Guachera/Estaca). Las terneras hembras quedan 100% reservadas como futuras vaquillonas de reposición para el rodeo lechero.
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="secondaryBtn"
                onClick={() => setModalNuevaGuacheraOpen(true)}
                style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                🍼 + Crear Camada Guachera
              </button>
            </div>
          </div>

          {/* Tarjetas Informativas de Segregación */}
          <div className="metricsGrid four" style={{ marginBottom: "20px" }}>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11.5px", color: "#1e40af", fontWeight: 700 }}>MACHOS A ENGORDE COMERCIAL</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#1e3a8a", marginTop: "4px" }}>
                {delproConfig.datosSincronizados.machosEnRecriaEngorde
                  ? (delproConfig.datosSincronizados.machosEnRecriaEngorde.guachera +
                     delproConfig.datosSincronizados.machosEnRecriaEngorde.rm1 +
                     delproConfig.datosSincronizados.machosEnRecriaEngorde.rm2 +
                     delproConfig.datosSincronizados.machosEnRecriaEngorde.rm3 +
                     delproConfig.datosSincronizados.machosEnRecriaEngorde.terminacion)
                  : 130} cab.
              </div>
              <div style={{ fontSize: "11px", color: "#2563eb", marginTop: "2px" }}>
                Guachera (24) + RM1 (22) + RM2 (28) + RM3 (30) + Term (26)
              </div>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11.5px", color: "#166534", fontWeight: 700 }}>HEMBRAS REPOSICIÓN TAMBO</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#14532d", marginTop: "4px" }}>
                {delproConfig.datosSincronizados.hembrasEnReposicionTambo || 48} cab.
              </div>
              <div style={{ fontSize: "11px", color: "#15803d", marginTop: "2px" }}>
                100% reservadas como futuras vientres lecheros
              </div>
            </div>

            <div style={{ background: "#f8fafc", border: "1px solid var(--line)", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11.5px", color: "var(--slate-500)", fontWeight: 700 }}>PESO PROMEDIO AL NACER</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "var(--slate-800)", marginTop: "4px" }}>
                38.2 kg
              </div>
              <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                Registro biométrico en sala de maternidad
              </div>
            </div>

            <div style={{ background: "#f8fafc", border: "1px solid var(--line)", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11.5px", color: "var(--slate-500)", fontWeight: 700 }}>SINCRONIZACIÓN SQL DELPRO</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#166534", marginTop: "6px" }}>
                Automática
              </div>
              <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                Dos turnos diarios: 07:30 y 18:30 hs
              </div>
            </div>
          </div>

          {/* Tabla de Partos Sincronizados */}
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Fecha Parto</th>
                  <th>RP Madre (Tambo)</th>
                  <th>RP Ternero/a</th>
                  <th style={{ textAlign: "center" }}>Sexo</th>
                  <th style={{ textAlign: "right" }}>Peso Nacimiento</th>
                  <th>Destino HJB</th>
                  <th>Estado Actual</th>
                  <th>Detalle / Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {(partosDelPro.length > 0 ? partosDelPro : (delproConfig.datosSincronizados.partosRecientes || [])).map((p: any) => (
                  <tr key={p.id}>
                    <td><strong>{p.fecha}</strong></td>
                    <td>{p.rpMadre}</td>
                    <td><strong style={{ color: p.sexo === "Macho" ? "#1e40af" : "#166534" }}>{p.rpCria}</strong></td>
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
                      <span className="pill badgeSlate" style={{ fontSize: "11px" }}>
                        {p.estado}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--slate-600)" }}>
                      {p.observaciones || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FICHA TÉCNICA Y COSTO ESPECÍFICO DEL CORRAL                       */}
      {/* ========================================================================= */}
      {modalFichaCorralId && corralModalSeleccionado && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => {
            setModalFichaCorralId(null);
            setModoEdicionDietaModal(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "940px",
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--line)",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "26px" }}>{corralModalSeleccionado.icono}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <h2 style={{ fontSize: "19px", margin: 0, color: "var(--slate-950)", fontWeight: 800 }}>
                      {corralModalSeleccionado.nombreCompleto}
                    </h2>
                    <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 700 }}>
                      Etapa #{corralModalSeleccionado.numero} de 5
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px", fontSize: "12.5px", color: "var(--slate-600)", flexWrap: "wrap" }}>
                  <span>🎯 <strong>Rango de Peso:</strong> {corralModalSeleccionado.pesoEntradaKg} ➔ {corralModalSeleccionado.pesoObjetivoKg} kg</span>
                  <span>⏱️ <strong>Estadía Estimada:</strong> {corralModalSeleccionado.diasEstimados} días</span>
                  <span>🏠 <strong>Capacidad:</strong> 30 cab.</span>
                </div>
              </div>

              {/* Selector Rápido de Corral y Botón Cerrar */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ display: "flex", gap: "3px", background: "#e2e8f0", padding: "3px", borderRadius: "8px" }}>
                  {corrales.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setModalFichaCorralId(c.id)}
                      style={{
                        padding: "4px 8px",
                        fontSize: "11px",
                        fontWeight: 700,
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        background: modalFichaCorralId === c.id ? "#0f172a" : "transparent",
                        color: modalFichaCorralId === c.id ? "#ffffff" : "#475569",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {c.icono} {c.nombreCorto}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setModalFichaCorralId(null);
                    setModoEdicionDietaModal(false);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "20px",
                    cursor: "pointer",
                    color: "var(--slate-400)",
                    padding: "4px 6px",
                    borderRadius: "6px",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenido Scrolleable */}
            <div style={{ padding: "22px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* 1. ESTADO OPERATIVO DEL CORRAL */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--slate-500)" }}>
                    📊 1. Estado Operativo del Corral
                  </span>
                </div>
                <div className="metricsGrid four">
                  <MetricCard
                    label="Cabezas Actuales"
                    value={`${cabezasModal} cab.`}
                    note={`Ocupación: ${Math.round((cabezasModal / 30) * 100)}% de 30 plazas`}
                  />
                  <MetricCard
                    label="Peso Promedio Actual"
                    value={`${pesoPromModal} kg`}
                    note={`Meta: ${corralModalSeleccionado.pesoObjetivoKg} kg (${progresoModalPct}% avance)`}
                  />
                  <MetricCard
                    label="Ganancia Diaria (GDPV)"
                    value={`+${gdpvPromModal} kg/d`}
                    note="Ritmo de ganancia de peso"
                  />
                  <MetricCard
                    label="Días Promedio en Corral"
                    value={`${diasPromModal} días`}
                    note={`Estadía prevista: ${corralModalSeleccionado.diasEstimados} días`}
                  />
                </div>
              </div>

              {/* 2. COSTOS DE ALIMENTACIÓN DESGLOSADOS */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--slate-500)" }}>
                    💰 2. Costos de Alimentación Desglosados
                  </span>
                </div>
                <div className="metricsGrid four">
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "10px",
                      padding: "14px",
                    }}
                  >
                    <div style={{ fontSize: "11.5px", color: "#166534", fontWeight: 700 }}>Costo Animal / Día</div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "#14532d", margin: "4px 0" }}>
                      ${costoDiaAnimalModal.toLocaleString("es-AR")}
                    </div>
                    <div style={{ fontSize: "11px", color: "#15803d" }}>Ración individual por cabeza</div>
                  </div>

                  <div
                    style={{
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: "10px",
                      padding: "14px",
                    }}
                  >
                    <div style={{ fontSize: "11.5px", color: "#1e40af", fontWeight: 700 }}>Costo Total Corral / Día</div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "#1e3a8a", margin: "4px 0" }}>
                      ${costoTotalCorralDiaModal.toLocaleString("es-AR")}
                    </div>
                    <div style={{ fontSize: "11px", color: "#2563eb" }}>Gasto diario para ${cabezasModal} cabezas</div>
                  </div>

                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "14px",
                    }}
                  >
                    <div style={{ fontSize: "11.5px", color: "#475569", fontWeight: 700 }}>Costo Total Etapa / Cab.</div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "4px 0" }}>
                      ${(costoDiaAnimalModal * corralModalSeleccionado.diasEstimados).toLocaleString("es-AR")}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Acumulado en los ${corralModalSeleccionado.diasEstimados} días</div>
                  </div>

                  <div
                    style={{
                      background: "#fdf4ff",
                      border: "1px solid #f0abfc",
                      borderRadius: "10px",
                      padding: "14px",
                    }}
                  >
                    <div style={{ fontSize: "11.5px", color: "#86198f", fontWeight: 700 }}>Proyección Mensual (30d)</div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "#701a75", margin: "4px 0" }}>
                      ${(costoTotalCorralDiaModal * 30).toLocaleString("es-AR")}
                    </div>
                    <div style={{ fontSize: "11px", color: "#a21caf" }}>Presupuesto mensual del corral</div>
                  </div>
                </div>
              </div>

              {/* 3. RACIÓN DIARIA Y ORDEN PARA MIXER */}
              <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "10px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h3 style={{ fontSize: "14.5px", margin: 0, fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>🥣</span>
                      <span>Ración Diaria y Orden de Carga para Mixer</span>
                    </h3>
                    <p className="muted" style={{ fontSize: "12px", margin: "2px 0 0 0" }}>
                      Cantidades individuales y carga total a preparar en comedero para <strong>{cabezasModal} cabezas</strong>.
                    </p>
                    {cabezasModal > 0 && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(22, 163, 74, 0.1)", border: "1px solid rgba(22, 163, 74, 0.3)", padding: "3px 8px", borderRadius: "6px", marginTop: "4px", color: "#166534" }}>
                        <span style={{ fontSize: "12px" }}>💵</span>
                        <span style={{ fontSize: "12px", fontWeight: 800 }}>
                          Costo Diario: ${(costoTotalCorralDiaModal / cabezasModal).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / cab. / día
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <button
                      type="button"
                      className={modoEdicionDietaModal ? "primaryButton" : "ghostButton"}
                      onClick={() => setModoEdicionDietaModal(!modoEdicionDietaModal)}
                      style={{ fontSize: "11.5px", padding: "4px 8px" }}
                    >
                      {modoEdicionDietaModal ? "👀 Ver Modo Lectura" : "✏️ Modificar Ración"}
                    </button>

                    {hasDietChanges && (
                      <>
                        <button
                          type="button"
                          className="primaryButton"
                          onClick={() => {
                            handleGuardarDietas();
                            setModoEdicionDietaModal(false);
                          }}
                          style={{ fontSize: "11.5px", padding: "4px 10px", background: "#166534" }}
                        >
                          💾 Guardar Ración
                        </button>
                        <button
                          type="button"
                          className="ghostButton"
                          onClick={handleRestaurarDietas}
                          style={{ fontSize: "11.5px", padding: "4px 8px", color: "#dc2626" }}
                        >
                          ↺ Restaurar HJB
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="tableWrap">
                  <table className="dataTable">
                    <thead>
                      <tr>
                        <th>Ingrediente</th>
                        <th style={{ textAlign: "right" }}>Ración / Cabeza</th>
                        <th style={{ textAlign: "right" }}>Carga Total Mixer ({cabezasModal} cab.)</th>
                        <th style={{ textAlign: "right" }}>Precio Insumo (Móvil)</th>
                        <th style={{ textAlign: "right", color: "#166534" }}>Costo / Cab. / Día</th>
                        <th style={{ textAlign: "right" }}>Costo Total Día</th>
                        <th style={{ textAlign: "right" }}>% Ración</th>
                      </tr>
                    </thead>
                    <tbody>
                      {corralModalSeleccionado.dietaBase.map((d, idx) => {
                        const precioUnit = getCostoInsumoDieta(d.insumoId);
                        const totalKgCorral = Number((d.cantidadKgDia * cabezasModal).toFixed(1));
                        const costoInsumoDia = Math.round(totalKgCorral * precioUnit);
                        const costoInsumoDiaCab = Number((d.cantidadKgDia * precioUnit).toFixed(2));
                        const incidenciaPct = costoTotalCorralDiaModal > 0 ? Math.round((costoInsumoDia / costoTotalCorralDiaModal) * 100) : 0;

                        return (
                          <tr key={idx}>
                            <td>
                              <strong>{d.nombre}</strong>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {modoEdicionDietaModal ? (
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <input
                                    type="number"
                                    step="0.05"
                                    value={d.cantidadKgDia}
                                    onChange={(e) =>
                                      handleEditCantidadDieta(
                                        corralModalSeleccionado.id,
                                        idx,
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    style={{
                                      width: "70px",
                                      padding: "3px 6px",
                                      borderRadius: "4px",
                                      border: "1px solid #3b82f6",
                                      textAlign: "right",
                                      fontWeight: 700,
                                      fontSize: "12.5px",
                                    }}
                                  />
                                  <span style={{ fontSize: "11.5px", color: "var(--slate-500)", fontWeight: 600 }}>{d.unidad}</span>
                                </div>
                              ) : (
                                <strong style={{ fontSize: "13px" }}>{d.cantidadKgDia} {d.unidad}</strong>
                              )}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <strong style={{ color: "#0f172a" }}>{totalKgCorral.toLocaleString("es-AR")} {d.unidad}</strong>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              ${precioUnit.toLocaleString("es-AR")} / {d.unidad}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <strong style={{ color: "#166534", fontSize: "13px" }}>
                                ${costoInsumoDiaCab.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </strong>
                              <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>/ cab. / día</div>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <strong style={{ color: "#166534" }}>${costoInsumoDia.toLocaleString("es-AR")}</strong>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <span className="pill badgeSlate" style={{ fontSize: "11px" }}>{incidenciaPct}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                        <td>TOTALES RACIÓN</td>
                        <td style={{ textAlign: "right" }}>
                          {corralModalSeleccionado.dietaBase.reduce((acc, d) => acc + d.cantidadKgDia, 0).toFixed(2)} kg/Lts
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {(corralModalSeleccionado.dietaBase.reduce((acc, d) => acc + d.cantidadKgDia, 0) * cabezasModal).toFixed(1)} kg/Lts
                        </td>
                        <td style={{ textAlign: "right" }}>—</td>
                        <td style={{ textAlign: "right", color: "#166534", fontSize: "13.5px" }}>
                          ${(costoTotalCorralDiaModal / (cabezasModal || 1)).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <div style={{ fontSize: "10.5px", color: "var(--slate-600)", fontWeight: 500 }}>/ cab. / día</div>
                        </td>
                        <td style={{ textAlign: "right", color: "#166534", fontSize: "13.5px" }}>
                          ${costoTotalCorralDiaModal.toLocaleString("es-AR")}
                        </td>
                        <td style={{ textAlign: "right" }}>100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* 4. TROPAS EN ESTE CORRAL */}
              <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "10px", padding: "16px" }}>
                <h3 style={{ fontSize: "14.5px", margin: "0 0 10px 0", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🐂</span>
                  <span>Tropas Alojadas en {corralModalSeleccionado.nombreCorto} ({tropasModal.length})</span>
                </h3>

                {tropasModal.length === 0 ? (
                  <div style={{ padding: "18px", textAlign: "center", color: "var(--slate-500)", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
                    No hay tropas encerradas en este corral actualmente.
                  </div>
                ) : (
                  <div className="tableWrap">
                    <table className="dataTable">
                      <thead>
                        <tr>
                          <th>Código / Nombre</th>
                          <th style={{ textAlign: "right" }}>Cabezas</th>
                          <th style={{ textAlign: "right" }}>Peso Ingreso</th>
                          <th style={{ textAlign: "right" }}>Peso Actual</th>
                          <th style={{ textAlign: "right" }}>Ganancia (GDPV)</th>
                          <th style={{ textAlign: "right" }}>Días en Corral</th>
                          <th>Fecha Ingreso</th>
                          <th style={{ textAlign: "center" }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tropasModal.map((t) => (
                          <tr key={t.id}>
                            <td>
                              <strong>{t.codigo}</strong>
                              <div style={{ fontSize: "11.5px", color: "var(--slate-500)" }}>{t.nombre}</div>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <strong>{t.cabezas}</strong>
                            </td>
                            <td style={{ textAlign: "right" }}>{t.pesoInicialKg} kg</td>
                            <td style={{ textAlign: "right" }}>
                              <strong>{t.pesoActualKg} kg</strong>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <span className="pill badgeGreen">+{t.gdpvKgDia} kg/d</span>
                            </td>
                            <td style={{ textAlign: "right" }}>{t.diasEnCorral} d</td>
                            <td>{t.fechaIngreso}</td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="ghostButton"
                                onClick={() => {
                                  setModalFichaCorralId(null);
                                  handleAbrirMover(t);
                                }}
                                style={{ padding: "4px 8px", fontSize: "11.5px" }}
                              >
                                🔄 Mover corral
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 5. ANIMALES INDIVIDUALES EN ESTE CORRAL POR CARAVANA / RP */}
              {(() => {
                const animalesCorral = animalesRecria.filter((a) => a.corralId === corralModalSeleccionado.id);
                const animalesFiltrados = busquedaAnimalModal.trim()
                  ? animalesCorral.filter((a) => a.rp.toLowerCase().includes(busquedaAnimalModal.toLowerCase()))
                  : animalesCorral;

                return (
                  <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "10px", padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                      <div>
                        <h3 style={{ fontSize: "14.5px", margin: 0, fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>🏷️</span>
                          <span>Animales Individuales en este Corral por Caravana / RP ({animalesCorral.length} cab.)</span>
                        </h3>
                        <p className="muted" style={{ fontSize: "12px", margin: "2px 0 0 0" }}>
                          Identificación unívoca extraída de DeLaval DelPro y seguimiento individual de ganancia diaria.
                        </p>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="text"
                          placeholder="Buscar RP (ej: RP-8750)..."
                          value={busquedaAnimalModal}
                          onChange={(e) => setBusquedaAnimalModal(e.target.value)}
                          style={{
                            padding: "5px 10px",
                            fontSize: "12px",
                            borderRadius: "6px",
                            border: "1px solid var(--line)",
                            width: "180px",
                          }}
                        />
                      </div>
                    </div>

                    {animalesFiltrados.length === 0 ? (
                      <div style={{ padding: "18px", textAlign: "center", color: "var(--slate-500)", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
                        {animalesCorral.length === 0 ? "No hay terneros individuales en este corral actualmente." : "No se encontraron animales con el RP buscado."}
                      </div>
                    ) : (
                      <div className="tableWrap" style={{ maxHeight: "300px", overflowY: "auto" }}>
                        <table className="dataTable">
                          <thead>
                            <tr>
                              <th>Caravana / RP</th>
                              <th style={{ textAlign: "right" }}>Peso Actual</th>
                              <th style={{ textAlign: "right" }}>Ganancia (GDPV)</th>
                              <th style={{ textAlign: "right" }}>Días en Corral</th>
                              <th>Fecha Ingreso</th>
                              <th>Condición / Traspaso</th>
                              <th style={{ textAlign: "center" }}>Traspasar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {animalesFiltrados.map((a) => {
                              const infoPeso = resolverPesoAnimal(a);
                              const pesoMostrar = infoPeso.pesoKg;
                              const superaCorte =
                                (a.corralId === "guachera" && (pesoMostrar >= 80 || a.diasEnCorral >= 60)) ||
                                (a.corralId === "rm1" && pesoMostrar >= 120) ||
                                (a.corralId === "rm2" && pesoMostrar >= 170) ||
                                (a.corralId === "rm3" && pesoMostrar >= 270) ||
                                (a.corralId === "terminacion" && pesoMostrar >= 370);

                              return (
                                <tr key={a.rp}>
                                  <td>
                                    <strong style={{ fontFamily: "monospace", fontSize: "13px" }}>{a.rp}</strong>
                                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>{a.origen}</div>
                                    {a.grupoDelPro && (
                                      <div style={{ fontSize: "10px", color: "#2563eb", fontWeight: 600 }}>
                                        🚜 DelPro: {a.grupoDelPro}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ textAlign: "right" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "5px" }}>
                                      <strong style={{ fontSize: "13px", color: infoPeso.esOficialDelPro ? "#166534" : "#0f172a" }}>
                                        {pesoMostrar} kg
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
                                  </td>
                                  <td style={{ textAlign: "right" }}>
                                    <span className="pill badgeGreen">+{infoPeso.gdpvKgDia} kg/d</span>
                                  </td>
                                  <td style={{ textAlign: "right" }}>
                                    <strong>{a.diasEnCorral} d</strong>
                                  </td>
                                  <td style={{ fontSize: "12px" }}>{a.fechaIngresoCorral}</td>
                                  <td>
                                    {pesoMostrar >= 370 ? (
                                      <span className="pill badgeGreen" style={{ fontWeight: 800 }}>🥩 Listo Faena (≥370 kg)</span>
                                    ) : superaCorte ? (
                                      <span className="pill badgeAmber" style={{ fontWeight: 700 }}>⚡ Cumple corte de traspaso</span>
                                    ) : (
                                      <span className="pill badgeSlate" style={{ fontSize: "11.5px" }}>
                                        Faltan {Math.max(0, Math.round(corralModalSeleccionado.pesoObjetivoKg - pesoMostrar))} kg
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: "center" }}>
                                    <select
                                      defaultValue=""
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleTraspasarAnimalManual(a.rp, e.target.value as EtapaCorralId);
                                        }
                                      }}
                                      style={{
                                        padding: "3px 6px",
                                        fontSize: "11px",
                                        borderRadius: "5px",
                                        border: "1px solid var(--line)",
                                        cursor: "pointer",
                                        background: "#f8fafc",
                                      }}
                                    >
                                      <option value="" disabled>Mover a...</option>
                                      {corrales.filter((c) => c.id !== a.corralId).map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.icono} {c.nombreCorto}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Footer del Modal */}
            <div
              style={{
                padding: "12px 24px",
                background: "#f8fafc",
                borderTop: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "12px", color: "var(--slate-500)" }}>
                💡 Ración sincronizada en tiempo real con <strong>Valores Móviles</strong>.
              </div>
              <button
                type="button"
                className="ghostButton"
                onClick={() => {
                  setModalFichaCorralId(null);
                  setModoEdicionDietaModal(false);
                }}
                style={{ fontWeight: 700, padding: "6px 14px" }}
              >
                ✕ Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
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

            {/* Foto del Remito Escaneado si existe */}
            {(() => {
              const ventaRemito = getVentasHacienda().find((vr) => vr.remitoDte === modalFichaVenta.remitoDte);
              if (!ventaRemito?.remitoFotoUrl) return null;
              return (
                <div style={{ marginBottom: "20px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📸</span> Foto del Remito / DTe Oficial:
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ventaRemito.remitoFotoUrl}
                    alt="Foto del remito"
                    style={{ maxWidth: "100%", maxHeight: "240px", objectFit: "contain", borderRadius: "6px", border: "1px solid #94a3b8", display: "block" }}
                  />
                </div>
              );
            })()}

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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "18px", margin: 0 }}>🚛 Registrar Venta a Frigorífico</h2>
              <button
                type="button"
                onClick={() => {
                  setModalNuevaVentaOpen(false);
                  setModalVentaRemitoOpen(true);
                }}
                style={{
                  fontSize: "11.5px",
                  fontWeight: 700,
                  color: "#166534",
                  background: "#dcfce7",
                  border: "1px solid #86efac",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                📸 Cargar con Foto Remito
              </button>
            </div>

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
                  {corrales.map((c) => (
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

      {/* Modal Inteligente de Venta con Foto de Remito */}
      <ModalRegistrarVentaRemito
        isOpen={modalVentaRemitoOpen}
        onClose={() => setModalVentaRemitoOpen(false)}
        onVentaCompletada={handleVentaRemitoCompletada}
        seccionInicial="ganaderia"
      />
    </AppShell>
  );
}
