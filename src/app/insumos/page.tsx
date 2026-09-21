"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import {
  CategoriaInsumo,
  InsumoStockItem,
  MovimientoStockItem,
  getStockActualInsumos,
  registrarIngresoStock,
  actualizarIngresoStock,
  eliminarIngresoStock,
  reasignarAcopioGrano,
  getIngresosManuales,
  AjusteStockManual,
  getAjustesStock,
  registrarAjusteStock,
  eliminarAjusteStock,
  registrarCanjeGranoPellet,
  trasladarStockPellet,
  calcularAutonomiaPelletTambo,
  getDietaTambo,
  saveDietaTambo,
  HJB_DIETA_SYNC_EVENT,
  DietaTamboConfig,
  DIETA_TAMBO_HJB_DEFAULT,
  HJB_STOCK_SYNC_EVENT,
} from "@/lib/stockInsumosData";
import { HJB_AGRICULTURE_SYNC_EVENT } from "@/lib/agricultureData";

export default function InsumosPage() {
  const [data, setData] = useState<{
    items: InsumoStockItem[];
    movimientos: MovimientoStockItem[];
    valorTotalGeneralArs: number;
    valorTotalGeneralUsd: number;
    totalInsumos: number;
    insumosEnAlerta: number;
  }>({
    items: [],
    movimientos: [],
    valorTotalGeneralArs: 0,
    valorTotalGeneralUsd: 0,
    totalInsumos: 0,
    insumosEnAlerta: 0,
  });

  const [filtroCategoria, setFiltroCategoria] = useState<string>("Todos");
  const [filtroTexto, setFiltroTexto] = useState<string>("");
  const [soloAlertas, setSoloAlertas] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal Ingreso de Stock
  const [modalIngresoOpen, setModalIngresoOpen] = useState(false);
  const [formIngreso, setFormIngreso] = useState<{
    insumoId: string;
    cantidad: number;
    cantidadTn?: number;
    fecha: string;
    remitoProveedor: string;
    costoUnitarioArs: number;
    observaciones: string;
    ubicacion: string;
    tipoLugar?: any;
  }>({
    insumoId: "soja-grano",
    cantidad: 68000,
    cantidadTn: 68,
    fecha: new Date().toISOString().split("T")[0],
    remitoProveedor: "",
    costoUnitarioArs: 0,
    observaciones: "",
    ubicacion: "AFA Los Cardos",
    tipoLugar: "afa",
  });

  // Modal Canje de Grano a Pellet (AFA)
  const [modalCanjeOpen, setModalCanjeOpen] = useState(false);
  const [dietaActiva, setDietaActiva] = useState<DietaTamboConfig>(getDietaTambo());
  const [formCanje, setFormCanje] = useState({
    cerealInsumoId: "soja-grano",
    toneladasGrano: 30,
    porcentajeCanje: 75,
    pelletInsumoId: "pellet-soja",
    fecha: new Date().toISOString().split("T")[0],
    destinoPellet: "Tambo",
    comprobante: "",
    observaciones: "",
    vacasEnOrdeñe: DIETA_TAMBO_HJB_DEFAULT.vacasEnOrdeñe,
    racionKgVacaDia: DIETA_TAMBO_HJB_DEFAULT.racionesKgDia["pellet-soja"],
    mostrarAjusteDieta: false,
  });

  // Modal Trazabilidad / Movimientos de Insumo
  const [insumoTrazabilidad, setInsumoTrazabilidad] = useState<InsumoStockItem | null>(null);

  // Modal Stock por Ubicación (Cereales y Rollos)
  const [insumoUbicaciones, setInsumoUbicaciones] = useState<InsumoStockItem | null>(null);

  // Modal Ajustar Stock / Corregir Inventario (Restar toneladas por error, mermas, eliminar ingresos erróneos)
  const [modalAjusteOpen, setModalAjusteOpen] = useState(false);
  const [insumoAjuste, setInsumoAjuste] = useState<InsumoStockItem | null>(null);
  const [formAjuste, setFormAjuste] = useState<{
    tipo: "restar" | "sumar" | "fijar";
    cantidad: number;
    cantidadTn?: number;
    motivo: string;
    ubicacion: string;
  }>({
    tipo: "restar",
    cantidad: 1000,
    cantidadTn: 1,
    motivo: "Error de carga / Corrección de toneladas",
    ubicacion: "",
  });

  // Modal Traslado de Pellet (de AFA Los Cardos a Tambo)
  const [modalTrasladoPelletOpen, setModalTrasladoPelletOpen] = useState(false);
  const [formTrasladoPellet, setFormTrasladoPellet] = useState<{
    insumoId: string;
    insumoNombre: string;
    origen: string;
    destino: string;
    toneladas: number;
    fecha: string;
    remito: string;
    observaciones: string;
  }>({
    insumoId: "pellet-soja",
    insumoNombre: "Pellet de Soja Proteico (Harina)",
    origen: "AFA Los Cardos",
    destino: "Tambo",
    toneladas: 5,
    fecha: new Date().toISOString().split("T")[0],
    remito: "",
    observaciones: "",
  });

  function handleAbrirTrasladoPellet(item: InsumoStockItem, origen: string = "AFA Los Cardos", destino: string = "Tambo") {
    const afaU = item.stockPorUbicacion?.find((u) => u.tipoLugar === "afa" || /afa|cardos/i.test(u.lugar));
    const defTn = afaU && afaU.cantidad > 0 ? (afaU.cantidadTn || Number((afaU.cantidad / 1000).toFixed(2))) : 5;
    setFormTrasladoPellet({
      insumoId: item.id,
      insumoNombre: item.nombre,
      origen,
      destino,
      toneladas: defTn,
      fecha: new Date().toISOString().split("T")[0],
      remito: "",
      observaciones: "",
    });
    setModalTrasladoPelletOpen(true);
  }

  function handleGuardarTrasladoPellet(e: React.FormEvent) {
    e.preventDefault();
    if (formTrasladoPellet.toneladas <= 0) {
      alert("Por favor ingresá una cantidad en toneladas mayor a cero.");
      return;
    }
    trasladarStockPellet({
      pelletInsumoId: formTrasladoPellet.insumoId,
      origen: formTrasladoPellet.origen,
      destino: formTrasladoPellet.destino,
      toneladas: formTrasladoPellet.toneladas,
      fecha: formTrasladoPellet.fecha,
      remito: formTrasladoPellet.remito.trim() || undefined,
      observaciones: formTrasladoPellet.observaciones.trim() || undefined,
    });
    setModalTrasladoPelletOpen(false);
    cargarDatos();
    triggerFeedback(`✓ Traslado registrado: ${formTrasladoPellet.toneladas} Tn de ${formTrasladoPellet.insumoNombre} trasladadas de ${formTrasladoPellet.origen} a ${formTrasladoPellet.destino}.`);
  }

  function cargarDatos() {
    setData(getStockActualInsumos());
    setDietaActiva(getDietaTambo());
  }

  useEffect(() => {
    if (insumoUbicaciones) {
      const updated = data.items.find((x) => x.id === insumoUbicaciones.id);
      if (updated) setInsumoUbicaciones(updated);
    }
    if (insumoAjuste) {
      const updated = data.items.find((x) => x.id === insumoAjuste.id);
      if (updated) setInsumoAjuste(updated);
    }
  }, [data]);

  useEffect(() => {
    cargarDatos();

    function onSync() {
      cargarDatos();
    }

    window.addEventListener(HJB_STOCK_SYNC_EVENT, onSync);
    window.addEventListener(HJB_AGRICULTURE_SYNC_EVENT, onSync);
    window.addEventListener(HJB_DIETA_SYNC_EVENT, onSync);
    return () => {
      window.removeEventListener(HJB_STOCK_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_AGRICULTURE_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_DIETA_SYNC_EVENT, onSync);
    };
  }, []);

  function triggerFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4500);
  }

  function handleAbrirIngreso(insumoId?: string) {
    const id = insumoId || (data.items[0]?.id ?? "soja-grano");
    const item = data.items.find((x) => x.id === id);
    const isGrano = (item?.categoria === "Granos" || item?.categoria === "Forrajes & Granos") && (item?.id.includes("grano") || item?.id === "silo-maiz");
    const isRollo = item?.id.includes("rollo");

    let defUbic = item?.ubicacion || "Depósito Central";
    let defTipo: any = "otro";

    if (isGrano) {
      defUbic = "AFA Los Cardos";
      defTipo = "afa";
    } else if (isRollo) {
      defUbic = "Campo Keuneke";
      defTipo = "campo";
    } else if (item?.id.includes("pellet")) {
      defUbic = "Tambo";
      defTipo = "tambo";
    }

    setFormIngreso({
      insumoId: id,
      cantidad: isGrano ? 30000 : 100,
      cantidadTn: isGrano ? 30 : undefined,
      fecha: new Date().toISOString().split("T")[0],
      remitoProveedor: "",
      costoUnitarioArs: 0,
      observaciones: "",
      ubicacion: defUbic,
      tipoLugar: defTipo,
    });
    setModalIngresoOpen(true);
  }

  function handleCambiarInsumoIngreso(newId: string) {
    const item = data.items.find((x) => x.id === newId);
    const isGrano = (item?.categoria === "Granos" || item?.categoria === "Forrajes & Granos") && (item?.id.includes("grano") || item?.id === "silo-maiz");
    let defUbic = item?.ubicacion || "Depósito Central";
    let defTipo: any = "otro";
    if (isGrano) {
      defUbic = "AFA Los Cardos";
      defTipo = "afa";
    } else if (item?.id.includes("pellet")) {
      defUbic = "Tambo";
      defTipo = "tambo";
    }
    const cant = isGrano ? (formIngreso.cantidadTn ? formIngreso.cantidadTn * 1000 : 30000) : (formIngreso.cantidad || 100);
    setFormIngreso({
      ...formIngreso,
      insumoId: newId,
      cantidad: cant,
      cantidadTn: isGrano ? cant / 1000 : undefined,
      ubicacion: defUbic,
      tipoLugar: defTipo,
    });
  }

  function handleGuardarIngreso(e: React.FormEvent) {
    e.preventDefault();
    if (!formIngreso.insumoId || formIngreso.cantidad <= 0) {
      alert("Por favor ingresá un insumo y una cantidad válida mayor a cero.");
      return;
    }

    const item = data.items.find((x) => x.id === formIngreso.insumoId);
    const isGrano = (item?.categoria === "Granos" || item?.categoria === "Forrajes & Granos") && (item?.id.includes("grano") || item?.id === "silo-maiz");

    registrarIngresoStock({
      insumoId: formIngreso.insumoId,
      cantidad: Number(formIngreso.cantidad),
      cantidadTn: isGrano ? (formIngreso.cantidadTn || Number(formIngreso.cantidad) / 1000) : undefined,
      fecha: formIngreso.fecha || new Date().toISOString().split("T")[0],
      remitoProveedor: formIngreso.remitoProveedor.trim() || `Ingreso manual a ${formIngreso.ubicacion || "galpón"}`,
      costoUnitarioArs: formIngreso.costoUnitarioArs ? Number(formIngreso.costoUnitarioArs) : undefined,
      observaciones: formIngreso.observaciones.trim() || undefined,
      ubicacion: formIngreso.ubicacion,
      tipoLugar: formIngreso.tipoLugar,
    });

    setModalIngresoOpen(false);
    cargarDatos();
    const cantStr = isGrano
      ? `${((formIngreso.cantidad || 0) / 1000).toLocaleString("es-AR")} Tn`
      : `${formIngreso.cantidad} ${item?.unidad || ""}`;
    triggerFeedback(`✓ Se ingresaron +${cantStr} de ${item?.nombre || "insumo"} en ${formIngreso.ubicacion || "stock"}.`);
  }

  function handleReasignarStockGrano(cerealId: string, nuevoLugar: string) {
    const allIngresos = getIngresosManuales().filter((x) => x.insumoId === cerealId && !x.deleted);
    if (allIngresos.length === 0) {
      registrarIngresoStock({
        insumoId: cerealId,
        cantidad: 68000,
        cantidadTn: 68,
        fecha: new Date().toISOString().split("T")[0],
        remitoProveedor: `Asignación de stock a ${nuevoLugar}`,
        ubicacion: nuevoLugar,
      });
    } else {
      for (const ing of allIngresos) {
        reasignarAcopioGrano(ing.id, nuevoLugar);
      }
    }
    cargarDatos();
    triggerFeedback(`✓ Stock de grano asignado exitosamente a: ${nuevoLugar}`);
  }

  function handleEliminarIngreso(ingresoId: string) {
    if (confirm("¿Estás seguro de que deseás eliminar este registro de ingreso de stock?")) {
      eliminarIngresoStock(ingresoId);
      cargarDatos();
      triggerFeedback("✓ Ingreso de stock eliminado exitosamente.");
    }
  }

  function handleAbrirAjuste(item: InsumoStockItem) {
    setInsumoAjuste(item);
    const isGrano = (item.categoria === "Granos" || item.categoria === "Forrajes & Granos") && (item.id.includes("grano") || item.id === "silo-maiz");
    const isPellet = item.id.includes("pellet");
    const defaultTn = isGrano ? (item.totalTn || 1) : Number((item.stockActual / 1000).toFixed(2));
    const defCant = (isGrano || isPellet)
      ? (defaultTn > 0 ? defaultTn * 1000 : 1000)
      : Math.min(item.stockActual > 0 ? item.stockActual : 10, 100);

    setFormAjuste({
      tipo: "restar",
      cantidad: defCant,
      cantidadTn: (isGrano || isPellet) ? (defCant / 1000) : undefined,
      motivo: "Error de carga / Corrección de stock",
      ubicacion: item.ubicacion || (item.stockPorUbicacion?.[0]?.lugar || "Stock General"),
    });
    setModalAjusteOpen(true);
  }

  function handleGuardarAjuste(e: React.FormEvent) {
    e.preventDefault();
    if (!insumoAjuste) return;

    const cantNum = Number(formAjuste.cantidad) || 0;
    if (cantNum <= 0 && formAjuste.tipo !== "fijar") {
      alert("Por favor ingresá una cantidad mayor a cero para ajustar.");
      return;
    }

    let delta = 0;
    if (formAjuste.tipo === "restar") {
      delta = -Math.abs(cantNum);
    } else if (formAjuste.tipo === "sumar") {
      delta = Math.abs(cantNum);
    } else if (formAjuste.tipo === "fijar") {
      delta = cantNum - insumoAjuste.stockActual;
    }

    if (delta === 0) {
      alert("El valor ingresado no genera ningún cambio en el stock actual.");
      return;
    }

    const stockResultante = Math.max(0, Math.round((insumoAjuste.stockActual + delta) * 10) / 10);
    const isGranoOPellet = insumoAjuste.esCerealOGrano || insumoAjuste.id.includes("pellet");
    const cantTn = isGranoOPellet ? Number((delta / 1000).toFixed(2)) : undefined;

    registrarAjusteStock({
      insumoId: insumoAjuste.id,
      fecha: new Date().toISOString().split("T")[0],
      tipo: formAjuste.tipo,
      cantidadDelta: delta,
      cantidadTn: cantTn,
      stockResultante,
      motivo: formAjuste.motivo.trim() || "Ajuste manual de inventario",
      ubicacion: formAjuste.ubicacion || undefined,
    });

    setModalAjusteOpen(false);
    cargarDatos();
    const cantStr = cantTn !== undefined
      ? `${Math.abs(cantTn).toLocaleString("es-AR")} Tn`
      : `${Math.abs(delta).toLocaleString("es-AR")} ${insumoAjuste.unidad}`;
    triggerFeedback(`✓ Ajuste registrado en ${insumoAjuste.nombre}: ${delta < 0 ? `-${cantStr}` : `+${cantStr}`}. Stock actual: ${stockResultante.toLocaleString("es-AR")} ${insumoAjuste.unidad}.`);
  }

  function handleEliminarAjuste(ajusteId: string) {
    if (confirm("¿Estás seguro de que deseás eliminar este ajuste de inventario?")) {
      eliminarAjusteStock(ajusteId);
      cargarDatos();
      triggerFeedback("✓ Ajuste de inventario revertido y eliminado.");
    }
  }

  function handleAbrirCanje(cerealId?: string) {
    const id = cerealId || "soja-grano";
    const cerealItem = data.items.find((x) => x.id === id);
    const afaUbic = cerealItem?.stockPorUbicacion?.find((u) => u.tipoLugar === "afa" || /afa|cardos/i.test(u.lugar));
    const availTn = afaUbic ? (afaUbic.cantidadTn || 0) : 0;

    const currentDieta = getDietaTambo();
    const defaultPelletId = "pellet-soja";
    const defaultRacion = currentDieta.racionesKgDia[defaultPelletId] || 2.5;

    setFormCanje({
      cerealInsumoId: id,
      toneladasGrano: availTn > 0 ? availTn : 10,
      porcentajeCanje: 75,
      pelletInsumoId: defaultPelletId, // SIEMPRE subproducto pellet, nunca balanceado de guacheras
      fecha: new Date().toISOString().split("T")[0],
      destinoPellet: "Tambo", // ÚNICAMENTE Tambo
      comprobante: "",
      observaciones: "",
      vacasEnOrdeñe: currentDieta.vacasEnOrdeñe,
      racionKgVacaDia: defaultRacion,
      mostrarAjusteDieta: false,
    });
    setModalCanjeOpen(true);
  }

  function handleGuardarCanje(e: React.FormEvent) {
    e.preventDefault();
    if (!formCanje.toneladasGrano || formCanje.toneladasGrano <= 0) {
      alert("Por favor ingresá una cantidad de toneladas válida mayor a cero.");
      return;
    }
    if (!formCanje.porcentajeCanje || formCanje.porcentajeCanje <= 0 || formCanje.porcentajeCanje > 100) {
      alert("El porcentaje de canje debe estar comprendido entre 1% y 100%.");
      return;
    }

    // 1. Guardar y actualizar la dieta activa del Tambo con los parámetros vigentes
    saveDietaTambo({
      vacasEnOrdeñe: formCanje.vacasEnOrdeñe,
      racionesKgDia: {
        ...getDietaTambo().racionesKgDia,
        [formCanje.pelletInsumoId]: formCanje.racionKgVacaDia,
      },
      actualizadoPor: "Canje AFA en Insumos",
    });

    const cerealItem = data.items.find((x) => x.id === formCanje.cerealInsumoId);
    const pelletItem = data.items.find((x) => x.id === formCanje.pelletInsumoId);

    const tnPellet = Number((formCanje.toneladasGrano * (formCanje.porcentajeCanje / 100)).toFixed(2));
    const kgGrano = Math.round(formCanje.toneladasGrano * 1000);
    const kgPellet = Math.round(tnPellet * 1000);

    const { diasAutonomia } = calcularAutonomiaPelletTambo(
      kgPellet,
      formCanje.pelletInsumoId,
      formCanje.vacasEnOrdeñe,
      formCanje.racionKgVacaDia
    );

    registrarCanjeGranoPellet({
      fecha: formCanje.fecha,
      cerealInsumoId: formCanje.cerealInsumoId,
      cerealNombre: cerealItem?.nombre || "Grano Comercial",
      acopioOrigen: "AFA Los Cardos",
      toneladasGrano: formCanje.toneladasGrano,
      kgGrano,
      porcentajeCanje: formCanje.porcentajeCanje,
      toneladasPellet: tnPellet,
      kgPellet,
      pelletInsumoId: formCanje.pelletInsumoId,
      pelletNombre: pelletItem?.nombre || "Pellet de Soja Proteico (Harina)",
      destinoPellet: formCanje.destinoPellet || "Tambo",
      comprobante: formCanje.comprobante.trim() || undefined,
      observaciones: formCanje.observaciones.trim() || undefined,
    });

    setModalCanjeOpen(false);
    cargarDatos();
    triggerFeedback(`✓ Canje registrado (${formCanje.destinoPellet === "AFA Los Cardos" ? "Stockeado en AFA Los Cardos" : "Destino Tambo"} · ${formCanje.vacasEnOrdeñe} vacas @ ${formCanje.racionKgVacaDia} kg/día): +${tnPellet} Tn de ${pelletItem?.nombre || "Pellet"} (${diasAutonomia} días de alimentación).`);
  }

  // Filtrado de la tabla de insumos
  const itemsFiltrados = data.items.filter((item) => {
    if (soloAlertas && !item.enAlerta) return false;
    if (filtroCategoria !== "Todos") {
      if (filtroCategoria === "Granos") {
        if (item.categoria !== "Granos" && !(item.categoria === "Forrajes & Granos" && item.id.includes("grano"))) return false;
      } else if (filtroCategoria === "Forrajes") {
        if (item.categoria !== "Forrajes" && !(item.categoria === "Forrajes & Granos" && !item.id.includes("grano"))) return false;
        if (item.id.includes("pellet") || item.id.includes("sal-") || item.id === "semilla-algodon") return false;
      } else if (filtroCategoria === "Pellets & Sales") {
        if (item.categoria !== "Pellets & Sales" && !item.id.includes("pellet") && !item.id.includes("sal-") && item.id !== "semilla-algodon") return false;
      } else if (item.categoria !== filtroCategoria) {
        return false;
      }
    }
    if (filtroTexto.trim()) {
      const q = filtroTexto.toLowerCase();
      const match =
        item.nombre.toLowerCase().includes(q) ||
        item.ubicacion.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const categorias: { id: string; label: string; icon: string }[] = [
    { id: "Todos", label: `Todos (${data.items.length})`, icon: "📋" },
    { id: "Fitosanitarios", label: "Fitosanitarios", icon: "🧪" },
    { id: "Semillas", label: "Semillas", icon: "🌱" },
    { id: "Fertilizantes", label: "Fertilizantes", icon: "🌾" },
    { id: "Granos", label: "Granos", icon: "🌽" },
    { id: "Forrajes", label: "Forrajes", icon: "🌿" },
    { id: "Pellets & Sales", label: "Pellets & Sales", icon: "🥣" },
    { id: "Combustibles", label: "Combustibles", icon: "⛽" },
  ];

  return (
    <AppShell active="Insumos & Stock">
      {/* Encabezado */}
      <div className="pageHeader">
        <div>
          <div className="badgeRow" style={{ marginBottom: "6px" }}>
            <span className="pill badgeGreen">Inventario Central HJB</span>
            <span className="pill badgeSlate">Valorizado en Vivo con Valores Móviles</span>
            <span className="pill badgeBlue">Descuento Automático Multimódulo</span>
          </div>
          <h1>Insumos & Stock General</h1>
          <p className="muted">
            Control de existencias en galpón y depósitos. Cada labor realizada en los campos o ración ganadera se descuenta en tiempo real.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="ghostButton"
            onClick={cargarDatos}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
            title="Recalcular consumos de labores y cotizaciones"
          >
            🔄 Actualizar Stock
          </button>
          <button
            type="button"
            className="secondaryButton"
            onClick={() => handleAbrirCanje("soja-grano")}
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
            title="Convertir grano acopiado en AFA Los Cardos en Pellet de Soja para el Tambo"
          >
            🔄 Canje Grano a Pellet (AFA)
          </button>
          <button
            type="button"
            className="primaryButton"
            onClick={() => handleAbrirIngreso()}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            ➕ Ingreso de Stock / Compra
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

      {/* Métricas Principales */}
      <div className="metricsGrid four" style={{ marginBottom: "22px" }}>
        <MetricCard
          label="Valorización Total Stock"
          value={`$${data.valorTotalGeneralArs.toLocaleString("es-AR")}`}
          note="Valuación total en Pesos ARS"
        />
        <MetricCard
          label="Valorización en Dólares"
          value={`USD ${data.valorTotalGeneralUsd.toLocaleString("es-AR")}`}
          note="Calculado a Dólar BNA Oficial"
        />
        <MetricCard
          label="Total Insumos en Galpón"
          value={`${data.totalInsumos} insumos`}
          note={`${new Set(data.items.map((i) => i.categoria)).size} rubros productivos activos`}
        />
        <MetricCard
          label="Alertas Stock Bajo"
          value={`${data.insumosEnAlerta} insumos`}
          note={data.insumosEnAlerta === 0 ? "Todos los insumos sobre el mínimo" : "Requieren reposición urgente"}
        />
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <section className="panel" style={{ padding: "18px 20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", marginBottom: "14px" }}>
          {/* Pestañas de Rubro / Categoría */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {categorias.map((c) => {
              const active = filtroCategoria === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFiltroCategoria(c.id)}
                  className={active ? "pill badgeGreen" : "pill badgeSlate"}
                  style={{ cursor: "pointer", fontSize: "12px", fontWeight: active ? 700 : 500, padding: "6px 12px" }}
                >
                  {c.icon} {c.label}
                </button>
              );
            })}
          </div>

          {/* Toggle Solo Alertas */}
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "#991b1b" }}>
            <input
              type="checkbox"
              checked={soloAlertas}
              onChange={(e) => setSoloAlertas(e.target.checked)}
              style={{ cursor: "pointer", width: "16px", height: "16px" }}
            />
            <span>⚠️ Ver solo alertas de reposición</span>
          </label>
        </div>

        {/* Buscador de Texto */}
        <div style={{ position: "relative", maxWidth: "420px" }}>
          <input
            type="text"
            placeholder="🔍 Buscar insumo por nombre o depósito..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
            }}
          />
          {filtroTexto && (
            <button
              type="button"
              onClick={() => setFiltroTexto("")}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--slate-400)",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </section>

      {/* Tabla de Inventario de Stock */}
      <section className="panel" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ fontSize: "17px", margin: 0 }}>Existencias en Depósito & Valorización</h2>
            <p className="muted" style={{ fontSize: "12.5px", margin: "2px 0 0 0" }}>
              Precios sincronizados en tiempo real con <strong>Valores Móviles</strong>. Descuento automático de labores realizadas.
            </p>
          </div>
          <span className="pill badgeSlate" style={{ fontSize: "12px" }}>
            Mostrando {itemsFiltrados.length} de {data.items.length} insumos
          </span>
        </div>

        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th style={{ minWidth: "220px" }}>Insumo & Ubicación</th>
                <th>Rubro</th>
                <th style={{ width: "180px", textAlign: "right" }}>Stock Actual Disponible</th>
                <th style={{ width: "140px", textAlign: "center" }}>Estado / Nivel</th>
                <th style={{ width: "150px", textAlign: "right" }}>Consumo Campaña</th>
                <th style={{ width: "150px", textAlign: "right" }}>Precio Ref. (Móvil)</th>
                <th style={{ width: "170px", textAlign: "right" }}>Valorización Total</th>
                <th style={{ width: "160px", textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {itemsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--slate-500)" }}>
                    No se encontraron insumos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                itemsFiltrados.map((item) => {
                  const hasUbicaciones = Boolean(
                    item.esCerealOGrano ||
                    item.esRollo ||
                    item.id.includes("pellet") ||
                    (item.stockPorUbicacion && item.stockPorUbicacion.length > 0)
                  );

                  return (
                    <tr
                      key={item.id}
                      style={{
                        cursor: hasUbicaciones ? "pointer" : "default",
                        transition: "background 0.15s ease",
                      }}
                      onClick={() => {
                        if (hasUbicaciones) {
                          setInsumoUbicaciones(item);
                        }
                      }}
                      title={hasUbicaciones ? `Click para ver distribución y toneladas en cada lugar de ${item.nombre}` : undefined}
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                          <span style={{ fontWeight: 800, color: "var(--slate-950)", fontSize: "13.5px" }}>
                            {item.nombre}
                          </span>
                          {hasUbicaciones && (
                            <span
                              className="pill"
                              style={{
                                fontSize: "10px",
                                padding: "1px 6px",
                                background: item.esCerealOGrano
                                  ? "rgba(217, 119, 6, 0.12)"
                                  : item.id.includes("pellet")
                                  ? "rgba(147, 51, 234, 0.12)"
                                  : "rgba(37, 99, 235, 0.12)",
                                color: item.esCerealOGrano
                                  ? "#92400e"
                                  : item.id.includes("pellet")
                                  ? "#7e22ce"
                                  : "#1e40af",
                                fontWeight: 700,
                              }}
                            >
                              📍 Ver por lugar
                            </span>
                          )}
                        </div>

                        {/* Chips de Ubicaciones / Acopio */}
                        {item.stockPorUbicacion && item.stockPorUbicacion.length > 0 ? (
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                            {item.stockPorUbicacion.map((u) => (
                              <span
                                key={u.lugar}
                                className="pill"
                                style={{
                                  fontSize: "10px",
                                  padding: "1px 6px",
                                  background: u.cantidad > 0 ? "rgba(22, 163, 74, 0.1)" : "#f1f5f9",
                                  color: u.cantidad > 0 ? "#166534" : "var(--slate-400)",
                                  fontWeight: u.cantidad > 0 ? 700 : 500,
                                  border: u.cantidad > 0 ? "1px solid rgba(22, 163, 74, 0.25)" : "1px solid #e2e8f0",
                                }}
                              >
                                {u.icono} {u.lugar}:{" "}
                                {item.esCerealOGrano || item.id.includes("pellet")
                                  ? `${(u.cantidadTn !== undefined ? u.cantidadTn : Number((u.cantidad / 1000).toFixed(2))).toLocaleString("es-AR")} Tn`
                                  : item.esRollo
                                  ? `${u.cantidad.toLocaleString("es-AR")} rollos`
                                  : `${u.cantidad.toLocaleString("es-AR")} ${item.unidad}`}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: "11.5px", color: "var(--slate-500)", marginTop: "2px" }}>
                            📍 {item.ubicacion}
                          </div>
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            item.categoria === "Pellets & Sales"
                              ? "pill badgePurple"
                              : item.categoria === "Granos"
                              ? "pill badgeAmber"
                              : item.categoria === "Forrajes"
                              ? "pill badgeGreen"
                              : item.categoria === "Combustibles"
                              ? "pill badgeBlue"
                              : "pill badgeSlate"
                          }
                          style={{ fontSize: "11px", fontWeight: 600 }}
                        >
                          {item.categoria}
                        </span>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        {item.esCerealOGrano || item.id.includes("pellet") ? (
                          <>
                            <div style={{ fontSize: "16px", fontWeight: 900, color: item.stockActual > 0 ? "#15803d" : "#64748b" }}>
                              {(item.totalTn !== undefined ? item.totalTn : Number((item.stockActual / 1000).toFixed(2))).toLocaleString("es-AR")} Tn
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                              {item.stockActual.toLocaleString("es-AR")} kg netos
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: "15px", fontWeight: 800, color: item.stockActual > 0 ? (item.enAlerta ? "#991b1b" : "var(--slate-900)") : "#64748b" }}>
                            {item.stockActual.toLocaleString("es-AR")} {item.unidad}
                          </div>
                        )}

                        {/* Indicador reactivo de autonomía según la dieta activa del rodeo */}
                        {(item.id === "pellet-soja" || item.id === "pellet-trigo") && item.stockActual > 0 && (() => {
                          const auto = calcularAutonomiaPelletTambo(item.stockActual, item.id);
                          if (auto.diasAutonomia <= 0) return null;
                          return (
                            <div style={{ marginTop: "3px" }}>
                              <span
                                className="pill badgeGreen"
                                style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px" }}
                                title={`Dieta activa: ${auto.vacasOrdeñe} vacas @ ${auto.racionKgVacaDia} kg/vaca/día (${auto.consumoDiarioTotalKg} kg/día totales)`}
                              >
                                🥛 {auto.diasAutonomia} d ración ({auto.vacasOrdeñe} VO)
                              </span>
                            </div>
                          );
                        })()}

                        <div style={{ fontSize: "11px", color: "var(--slate-400)", marginTop: "2px" }}>
                          {item.produccionPropia > 0 ? (
                            <span style={{ color: "#166534", fontWeight: 600 }}>
                              {item.esCerealOGrano
                                ? `🌾 Cosecha: +${((item.produccionPropia || 0) / 1000).toLocaleString("es-AR")} Tn`
                                : `🌾 Confección: +${item.produccionPropia.toLocaleString("es-AR")} ${item.unidad}`}
                            </span>
                          ) : item.ingresosCompras > 0 ? (
                            `Ingresados: +${item.ingresosCompras.toLocaleString("es-AR")} ${item.unidad}`
                          ) : (
                            "Sin ingresos aún"
                          )}
                        </div>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        {item.ingresosCompras === 0 && item.produccionPropia === 0 && item.stockActual === 0 ? (
                          <span className="pill badgeSlate" style={{ fontSize: "11px" }}>
                            Sin existencias (0)
                          </span>
                        ) : item.enAlerta ? (
                          <span className="pill badgeAmber" style={{ fontSize: "11px", fontWeight: 700 }}>
                            ⚠️ Reponer (Mín: {item.stockMinimoAlerta} {item.unidad})
                          </span>
                        ) : (
                          <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 700 }}>
                            ✓ Con Stock
                          </span>
                        )}
                        {(item.ingresosCompras > 0 || item.produccionPropia > 0) && (
                          <div style={{ width: "100%", height: "5px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden", marginTop: "5px" }}>
                            <div
                              style={{
                                width: `${item.porcentajeStock}%`,
                                height: "100%",
                                background: item.enAlerta ? "#dc2626" : "#16a34a",
                                borderRadius: "999px",
                              }}
                            />
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        {item.consumoAgricola > 0 ? (
                          <div>
                            <strong style={{ color: "#b91c1c", fontSize: "13px" }}>
                              -{item.consumoAgricola.toLocaleString("es-AR")} {item.unidad}
                            </strong>
                            <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>aplicados en campo</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--slate-400)" }}>Sin consumos</span>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <strong style={{ fontSize: "13px" }}>
                          ${item.precioUnitarioArs.toLocaleString("es-AR")}
                        </strong>
                        <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                          USD {item.precioUnitarioUsd.toLocaleString("es-AR")} / {item.unidad}
                        </div>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <strong style={{ color: "#166534", fontSize: "14px" }}>
                          ${item.valorTotalArs.toLocaleString("es-AR")}
                        </strong>
                        <div style={{ fontSize: "11px", color: "#15803d" }}>
                          USD {item.valorTotalUsd.toLocaleString("es-AR")}
                        </div>
                      </td>

                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", gap: "5px", flexWrap: "wrap", justifyContent: "center" }}>
                          {hasUbicaciones && (
                            <button
                              type="button"
                              className="ghostButton"
                              onClick={() => setInsumoUbicaciones(item)}
                              style={{
                                padding: "3px 7px",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#1e40af",
                                background: "rgba(37, 99, 235, 0.08)",
                                borderColor: "rgba(37, 99, 235, 0.25)",
                              }}
                              title="Ver toneladas y desglose en cada acopio o campo"
                            >
                              📍 Ubicaciones
                            </button>
                          )}
                          {(item.categoria === "Granos" || item.esCerealOGrano) && (
                            <button
                              type="button"
                              className="ghostButton"
                              onClick={() => handleAbrirCanje(item.id)}
                              style={{
                                padding: "3px 7px",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#15803d",
                                background: "rgba(22, 163, 74, 0.08)",
                                borderColor: "rgba(22, 163, 74, 0.3)",
                              }}
                              title="Convertir grano acopiado en AFA Los Cardos a Pellet"
                            >
                              🔄 Canje Pellet
                            </button>
                          )}
                          <button
                            type="button"
                            className="ghostButton"
                            onClick={() => handleAbrirIngreso(item.id)}
                            style={{ padding: "3px 7px", fontSize: "11px", fontWeight: 700 }}
                            title="Cargar ingreso o compra de este insumo"
                          >
                            ➕ Ingreso
                          </button>
                          <button
                            type="button"
                            className="ghostButton"
                            onClick={() => handleAbrirAjuste(item)}
                            style={{
                              padding: "3px 7px",
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "#b45309",
                              background: "rgba(245, 158, 11, 0.08)",
                              borderColor: "rgba(245, 158, 11, 0.35)",
                            }}
                            title="Editar stock, restar toneladas por error o corregir inventario"
                          >
                            ✏️ Ajustar
                          </button>
                          <button
                            type="button"
                            className="ghostButton"
                            onClick={() => setInsumoTrazabilidad(item)}
                            style={{ padding: "3px 7px", fontSize: "11px", fontWeight: 700 }}
                            title="Ver historial de aplicaciones y compras"
                          >
                            📜 Movimientos
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRAR INGRESO DE STOCK / COMPRA                              */}
      {/* ========================================================================= */}
      {modalIngresoOpen && (
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
          onClick={() => setModalIngresoOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "540px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--line)",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }}>📦</span>
                <h3 style={{ margin: 0, fontSize: "18px", color: "var(--slate-950)" }}>
                  Registrar Ingreso de Stock / Compra
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalIngresoOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarIngreso} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "4px" }}>
                  Insumo a Ingresar:
                </label>
                <select
                  value={formIngreso.insumoId}
                  onChange={(e) => handleCambiarInsumoIngreso(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13.5px", fontWeight: 600 }}
                  required
                >
                  {data.items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.nombre} ({it.unidad}) · {it.categoria}
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const itemSel = data.items.find((x) => x.id === formIngreso.insumoId);
                const isGrano =
                  (itemSel?.categoria === "Granos" || itemSel?.categoria === "Forrajes & Granos") &&
                  (itemSel?.id.includes("grano") || itemSel?.id === "silo-maiz");
                const isPellet = Boolean(itemSel?.id.includes("pellet"));
                return (
                  <>
                    {/* SELECCIÓN DE LUGAR DE ACOPIO / DESTINO DEL GRANO O PELLET */}
                    {isGrano ? (
                      <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "10px", padding: "12px 14px" }}>
                        <label style={{ display: "block", fontSize: "12.5px", fontWeight: 800, color: "#166534", marginBottom: "8px" }}>
                          📍 ¿A dónde va a quedar stockeado el grano? (Lugar de Acopio):
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                          {[
                            { id: "AFA Los Cardos", tipo: "afa", label: "AFA Los Cardos", icon: "🌾", desc: "Acopio externo (Habilita canje a Pellet)" },
                            { id: "Silos", tipo: "silo", label: "Silos (Planta / Campo)", icon: "🏢", desc: "Almacenamiento en silos propios" },
                            { id: "Cooperativa", tipo: "cooperativa", label: "Cooperativa", icon: "🏬", desc: "Acopio cooperativo Lehmann / similar" },
                            { id: "Puerto (San Lorenzo)", tipo: "puerto", label: "Puerto (San Lorenzo)", icon: "🚢", desc: "Entrega directa a terminal portuaria" },
                          ].map((op) => {
                            const isSelected = formIngreso.ubicacion === op.id;
                            return (
                              <button
                                type="button"
                                key={op.id}
                                onClick={() => setFormIngreso({ ...formIngreso, ubicacion: op.id, tipoLugar: op.tipo as any })}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "flex-start",
                                  textAlign: "left",
                                  padding: "8px 10px",
                                  borderRadius: "8px",
                                  border: isSelected ? "2px solid #16a34a" : "1px solid #cbd5e1",
                                  background: isSelected ? "#ffffff" : "#f8fafc",
                                  boxShadow: isSelected ? "0 2px 6px rgba(22, 163, 74, 0.15)" : "none",
                                  cursor: "pointer",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "12.5px", color: isSelected ? "#15803d" : "#334155" }}>
                                  <span>{op.icon}</span>
                                  <span>{op.label}</span>
                                  {isSelected && <span style={{ marginLeft: "auto", color: "#16a34a", fontSize: "13px" }}>✓</span>}
                                </div>
                                <span style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>{op.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : isPellet ? (
                      <div style={{ background: "#faf5ff", border: "1.5px solid #d8b4fe", borderRadius: "10px", padding: "12px 14px" }}>
                        <label style={{ display: "block", fontSize: "12.5px", fontWeight: 800, color: "#6b21a8", marginBottom: "8px" }}>
                          📍 ¿A dónde va a quedar stockeado el pellet?:
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                          {[
                            { id: "Tambo", tipo: "tambo", label: "🥛 Tambo (Galpón de Raciones)", icon: "🥛", desc: "Disponible en el campo para alimentar vacas" },
                            { id: "AFA Los Cardos", tipo: "afa", label: "🌾 AFA Los Cardos (Planta)", icon: "🌾", desc: "Saldo / stock acopiado en planta AFA" },
                          ].map((op) => {
                            const isSelected = formIngreso.ubicacion === op.id || (!formIngreso.ubicacion && op.id === "Tambo");
                            return (
                              <button
                                type="button"
                                key={op.id}
                                onClick={() => setFormIngreso({ ...formIngreso, ubicacion: op.id, tipoLugar: op.tipo as any })}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "flex-start",
                                  textAlign: "left",
                                  padding: "8px 10px",
                                  borderRadius: "8px",
                                  border: isSelected ? "2px solid #9333ea" : "1px solid #cbd5e1",
                                  background: isSelected ? "#ffffff" : "#f8fafc",
                                  boxShadow: isSelected ? "0 2px 6px rgba(147, 51, 234, 0.15)" : "none",
                                  cursor: "pointer",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "12.5px", color: isSelected ? "#7e22ce" : "#334155" }}>
                                  <span>{op.icon}</span>
                                  <span>{op.label}</span>
                                  {isSelected && <span style={{ marginLeft: "auto", color: "#9333ea", fontSize: "13px" }}>✓</span>}
                                </div>
                                <span style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>{op.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "4px" }}>
                          📍 Ubicación de Almacenamiento / Depósito:
                        </label>
                        <input
                          type="text"
                          value={formIngreso.ubicacion}
                          onChange={(e) => setFormIngreso({ ...formIngreso, ubicacion: e.target.value })}
                          placeholder="Ej: Depósito de Químicos - Aguilera, Galpón Tambo, etc."
                          style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                        />
                      </div>
                    )}

                    {/* CANTIDAD Y FECHA */}
                    {isGrano || isPellet ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "4px" }}>
                            Cantidad en Toneladas (Tn):
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formIngreso.cantidadTn !== undefined ? formIngreso.cantidadTn : (formIngreso.cantidad ? formIngreso.cantidad / 1000 : "")}
                            onChange={(e) => {
                              const tn = parseFloat(e.target.value) || 0;
                              setFormIngreso({
                                ...formIngreso,
                                cantidadTn: tn,
                                cantidad: Math.round(tn * 1000),
                              });
                            }}
                            placeholder="Ej: 68 Tn"
                            style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: 700 }}
                            required
                          />
                          <small style={{ color: "#166534", fontWeight: 600, fontSize: "11px", marginTop: "3px", display: "block" }}>
                            = {(formIngreso.cantidad || 0).toLocaleString("es-AR")} kg netos
                          </small>
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "4px" }}>
                            Fecha de Recepción:
                          </label>
                          <input
                            type="date"
                            value={formIngreso.fecha}
                            onChange={(e) => setFormIngreso({ ...formIngreso, fecha: e.target.value })}
                            style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "4px" }}>
                            Cantidad Ingresada ({itemSel?.unidad || "unidades"}):
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={formIngreso.cantidad}
                            onChange={(e) => setFormIngreso({ ...formIngreso, cantidad: parseFloat(e.target.value) || 0 })}
                            style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: 700 }}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "4px" }}>
                            Fecha de Recepción:
                          </label>
                          <input
                            type="date"
                            value={formIngreso.fecha}
                            onChange={(e) => setFormIngreso({ ...formIngreso, fecha: e.target.value })}
                            style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                            required
                          />
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "4px" }}>
                  Remito / Factura / Proveedor:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Remito #5910 - Cooperativa Lehmann"
                  value={formIngreso.remitoProveedor}
                  onChange={(e) => setFormIngreso({ ...formIngreso, remitoProveedor: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "4px" }}>
                  Observaciones / Lote de Fabricación (opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: Descargado en Galpón Principal"
                  value={formIngreso.observaciones}
                  onChange={(e) => setFormIngreso({ ...formIngreso, observaciones: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="ghostButton"
                  onClick={() => setModalIngresoOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primaryButton"
                  style={{ background: "#166534" }}
                >
                  ✓ Confirmar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TRAZABILIDAD Y HISTORIAL DE MOVIMIENTOS DEL INSUMO               */}
      {/* ========================================================================= */}
      {insumoTrazabilidad && (
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
          onClick={() => setInsumoTrazabilidad(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--line)",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className="pill badgeGreen">Trazabilidad de Stock</span>
                  <span className="pill badgeSlate">{insumoTrazabilidad.categoria}</span>
                </div>
                <h3 style={{ margin: 0, fontSize: "18px", color: "var(--slate-950)" }}>
                  {insumoTrazabilidad.nombre}
                </h3>
                <p className="muted" style={{ margin: "2px 0 0 0", fontSize: "12px" }}>
                  📍 {insumoTrazabilidad.ubicacion} · Stock actual: <strong>{insumoTrazabilidad.stockActual.toLocaleString("es-AR")} {insumoTrazabilidad.unidad}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInsumoTrazabilidad(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className={`metricsGrid ${insumoTrazabilidad.produccionPropia > 0 ? "four" : "three"}`}>
                <MetricCard
                  label="Stock Inicial"
                  value={`${insumoTrazabilidad.stockInicial.toLocaleString("es-AR")} ${insumoTrazabilidad.unidad}`}
                  note="Punto de partida de campaña"
                />
                {insumoTrazabilidad.produccionPropia > 0 && (
                  <MetricCard
                    label="Producción Propia"
                    value={`+${insumoTrazabilidad.produccionPropia.toLocaleString("es-AR")} ${insumoTrazabilidad.unidad}`}
                    note="Confección de rollos a campo"
                  />
                )}
                <MetricCard
                  label="Ingresos / Compras"
                  value={`+${insumoTrazabilidad.ingresosCompras.toLocaleString("es-AR")} ${insumoTrazabilidad.unidad}`}
                  note="Compras y reposiciones"
                />
                <MetricCard
                  label="Consumo Aplicado"
                  value={`-${insumoTrazabilidad.consumoAgricola.toLocaleString("es-AR")} ${insumoTrazabilidad.unidad}`}
                  note="Descuentos automáticos de labores"
                />
              </div>

              <h4 style={{ fontSize: "14px", margin: "10px 0 4px 0", color: "var(--slate-700)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Historial de Aplicaciones y Movimientos
              </h4>

              {(() => {
                const movs = data.movimientos.filter((m) => m.insumoId === insumoTrazabilidad.id);
                if (movs.length === 0) {
                  return (
                    <div style={{ padding: "30px", textAlign: "center", color: "var(--slate-500)", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
                      No se registran movimientos ni consumos para este insumo en la campaña actual.
                    </div>
                  );
                }
                return (
                  <div className="tableWrap">
                    <table className="dataTable">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Tipo de Movimiento</th>
                          <th style={{ textAlign: "right" }}>Cantidad</th>
                          <th>Detalle de Origen / Labor / Remito</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movs.map((m) => (
                          <tr key={m.id}>
                            <td><strong>{m.fecha}</strong></td>
                            <td>
                              <span
                                className="pill"
                                style={{
                                  background: m.tipo === "Traslado / Destino" ? "#dbeafe" : m.cantidad > 0 ? "#dcfce7" : "#fee2e2",
                                  color: m.tipo === "Traslado / Destino" ? "#1e40af" : m.cantidad > 0 ? "#166534" : "#991b1b",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                }}
                              >
                                {m.tipo === "Producción Propia" ? `🚜 ${m.tipo}` : m.tipo === "Traslado / Destino" ? `📦 ${m.tipo}` : m.tipo}
                              </span>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 800, color: m.cantidad > 0 ? "#166534" : "#991b1b" }}>
                              {m.cantidad > 0 ? `+${m.cantidad.toLocaleString("es-AR")}` : `${m.cantidad.toLocaleString("es-AR")}`} {m.unidad}
                            </td>
                            <td style={{ fontSize: "12.5px" }}>{m.detalle}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            <div
              style={{
                padding: "12px 24px",
                background: "#f8fafc",
                borderTop: "1px solid var(--line)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="ghostButton"
                onClick={() => setInsumoTrazabilidad(null)}
                style={{ fontWeight: 700, padding: "6px 14px" }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: STOCK POR UBICACIÓN (CEREALES: TONELADAS EN SILOS, COOP, PUERTO, AFA / ROLLOS) */}
      {/* ========================================================================= */}
      {insumoUbicaciones && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={() => setInsumoUbicaciones(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              maxWidth: "860px",
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: insumoUbicaciones.esCerealOGrano
                  ? "linear-gradient(to right, #fffbeb, #ffffff)"
                  : "linear-gradient(to right, #f0fdf4, #ffffff)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "24px" }}>{insumoUbicaciones.esCerealOGrano ? "🌾" : "📦"}</span>
                  <h3 style={{ margin: 0, fontSize: "17.5px", color: "var(--slate-900)" }}>
                    Stock por Ubicación: {insumoUbicaciones.nombre}
                  </h3>
                </div>
                <p className="muted" style={{ margin: "3px 0 0 0", fontSize: "12.5px" }}>
                  {insumoUbicaciones.esCerealOGrano
                    ? "Control de toneladas físicas acopiadas en Silos, Cooperativa, Puerto y AFA Los Cardos."
                    : "Existencias y distribución de rollos entre el campo de origen (Keuneke) y el Tambo."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInsumoUbicaciones(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Tarjeta Resumen Total */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <span style={{ fontSize: "11.5px", color: "var(--slate-500)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                    Stock Físico Disponible
                  </span>
                  <div style={{ fontSize: "26px", fontWeight: 900, color: "#166534", marginTop: "2px" }}>
                    {insumoUbicaciones.esCerealOGrano
                      ? `${(insumoUbicaciones.totalTn || 0).toLocaleString("es-AR")} Toneladas`
                      : `${insumoUbicaciones.stockActual.toLocaleString("es-AR")} Rollos`}
                  </div>
                  {insumoUbicaciones.esCerealOGrano && (
                    <small style={{ color: "var(--slate-500)", fontSize: "12px" }}>
                      Equivale a {insumoUbicaciones.stockActual.toLocaleString("es-AR")} kg netos
                    </small>
                  )}
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "11.5px", color: "var(--slate-500)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                    Valorización Estimada
                  </span>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--slate-900)", marginTop: "2px" }}>
                    USD {insumoUbicaciones.valorTotalUsd.toLocaleString("es-AR")}
                  </div>
                  <small style={{ color: "#15803d", fontWeight: 600, fontSize: "12px" }}>
                    ${insumoUbicaciones.valorTotalArs.toLocaleString("es-AR")} ARS (Valores Móviles)
                  </small>
                </div>
              </div>

              {/* Barra de Asignación Rápida de Acopio de Grano */}
              {insumoUbicaciones.esCerealOGrano && (
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1.5px solid #86efac",
                    borderRadius: "10px",
                    padding: "14px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <strong style={{ fontSize: "13.5px", color: "#166534", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>📍</span> ¿A dónde va a quedar stockeado el grano? (Asignación Rápida)
                      </strong>
                      <p style={{ margin: "3px 0 0 0", fontSize: "12px", color: "#15803d" }}>
                        Podés asignar o reasignar todo el stock disponible ({insumoUbicaciones.totalTn || 0} Tn) al acopio que desees con un clic:
                      </p>
                    </div>
                    <button
                      type="button"
                      className="primaryButton"
                      onClick={() => {
                        const cId = insumoUbicaciones.id;
                        setInsumoUbicaciones(null);
                        handleAbrirIngreso(cId);
                      }}
                      style={{ fontSize: "12px", padding: "6px 12px", background: "#15803d" }}
                    >
                      ➕ Cargar Ingreso de Grano
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {[
                      { id: "AFA Los Cardos", icon: "🌾", label: "AFA Los Cardos (Canje a Pellet)" },
                      { id: "Silos", icon: "🏢", label: "Silos (Planta / Campo)" },
                      { id: "Cooperativa", icon: "🏬", label: "Cooperativa" },
                      { id: "Puerto (San Lorenzo)", icon: "🚢", label: "Puerto (San Lorenzo)" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleReasignarStockGrano(insumoUbicaciones.id, opt.id)}
                        className="ghostButton"
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          background: "#ffffff",
                          borderColor: "#86efac",
                          color: "#166534",
                          padding: "6px 12px",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                        title={`Asignar o trasladar stock a ${opt.label}`}
                      >
                        <span>{opt.icon}</span>
                        <span>Asignar a {opt.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid de Ubicaciones / Acopios */}
              <div>
                <h4 style={{ fontSize: "13.5px", margin: "0 0 10px 0", color: "var(--slate-800)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {insumoUbicaciones.esCerealOGrano
                    ? "📍 Toneladas Disponibles por Lugar de Acopio"
                    : insumoUbicaciones.id.includes("pellet")
                    ? "📍 Stock de Pellet Disponible por Ubicación (Tambo / AFA)"
                    : "📍 Rollos Disponibles por Ubicación (Keuneke / Tambo)"}
                </h4>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px" }}>
                  {(insumoUbicaciones.stockPorUbicacion || []).map((ubic) => (
                    <div
                      key={ubic.lugar}
                      style={{
                        background: ubic.cantidad > 0 ? "#ffffff" : "#f8fafc",
                        border: ubic.cantidad > 0 ? "2px solid #86efac" : "1px solid var(--line)",
                        borderRadius: "10px",
                        padding: "14px",
                        boxShadow: ubic.cantidad > 0 ? "var(--shadow-sm)" : "none",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ fontSize: "22px" }}>{ubic.icono}</span>
                          <span
                            className="pill"
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 700,
                              background: ubic.cantidad > 0 ? "#dcfce7" : "#f1f5f9",
                              color: ubic.cantidad > 0 ? "#166534" : "var(--slate-400)",
                            }}
                          >
                            {ubic.porcentaje}%
                          </span>
                        </div>
                        <strong style={{ fontSize: "14px", color: "var(--slate-900)", display: "block" }}>
                          {ubic.lugar}
                        </strong>
                      </div>

                      <div style={{ marginTop: "12px" }}>
                        <div style={{ fontSize: "20px", fontWeight: 900, color: ubic.cantidad > 0 ? "#166534" : "#94a3b8" }}>
                          {insumoUbicaciones.esCerealOGrano || insumoUbicaciones.id.includes("pellet")
                            ? `${(ubic.cantidadTn !== undefined ? ubic.cantidadTn : Number((ubic.cantidad / 1000).toFixed(2))).toLocaleString("es-AR")} Tn`
                            : `${ubic.cantidad.toLocaleString("es-AR")} ${insumoUbicaciones.unidad}`}
                        </div>
                        {(insumoUbicaciones.esCerealOGrano || insumoUbicaciones.id.includes("pellet")) && (
                          <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                            {ubic.cantidad.toLocaleString("es-AR")} kg
                          </div>
                        )}
                        <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden", marginTop: "8px" }}>
                          <div
                            style={{
                              width: `${ubic.porcentaje}%`,
                              height: "100%",
                              background: ubic.cantidad > 0 ? "#16a34a" : "transparent",
                              borderRadius: "999px",
                            }}
                          />
                        </div>

                        {/* ACCIONES PARA PELLETS (TRASLADO A TAMBO Y AJUSTE) */}
                        {insumoUbicaciones.id.includes("pellet") && (
                          <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                            {(ubic.tipoLugar === "afa" || /afa|cardos/i.test(ubic.lugar)) && ubic.cantidad > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleAbrirTrasladoPellet(insumoUbicaciones, ubic.lugar, "Tambo");
                                }}
                                style={{
                                  width: "100%",
                                  padding: "6px 10px",
                                  fontSize: "11.5px",
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "6px",
                                  background: "#7e22ce",
                                  color: "#ffffff",
                                  borderRadius: "6px",
                                  border: "none",
                                  cursor: "pointer",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                }}
                              >
                                🚚 Trasladar al Tambo
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const it = insumoUbicaciones;
                                setInsumoUbicaciones(null);
                                handleAbrirAjuste(it);
                                setFormAjuste((prev) => ({ ...prev, ubicacion: ubic.lugar }));
                              }}
                              style={{
                                width: "100%",
                                padding: "5px 8px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background: ubic.cantidad > 0 ? "rgba(126, 34, 206, 0.08)" : "#f8fafc",
                                color: ubic.cantidad > 0 ? "#7e22ce" : "var(--slate-600)",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                cursor: "pointer",
                              }}
                            >
                              ⚖️ Ajustar stock en {ubic.lugar}
                            </button>
                          </div>
                        )}

                        {insumoUbicaciones.esCerealOGrano && (
                          <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                            {(ubic.tipoLugar === "afa" || /afa|cardos/i.test(ubic.lugar)) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const cId = insumoUbicaciones.id;
                                  setInsumoUbicaciones(null);
                                  handleAbrirCanje(cId);
                                }}
                                style={{
                                  width: "100%",
                                  padding: "6px 10px",
                                  fontSize: "11.5px",
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "6px",
                                  background: "#15803d",
                                  color: "#ffffff",
                                  borderRadius: "6px",
                                  border: "none",
                                  cursor: "pointer",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                }}
                              >
                                🔄 Convertir en Pellet (AFA)
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleReasignarStockGrano(insumoUbicaciones.id, ubic.lugar)}
                              style={{
                                width: "100%",
                                padding: "5px 8px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background: ubic.cantidad > 0 ? "rgba(22, 163, 74, 0.08)" : "#f8fafc",
                                color: ubic.cantidad > 0 ? "#166534" : "var(--slate-600)",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                cursor: "pointer",
                              }}
                              title={`Asignar stock a ${ubic.lugar}`}
                            >
                              📍 Asignar stock aquí
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trazabilidad: Cosechas y Movimientos que explican el acopio */}
              <div>
                <h4 style={{ fontSize: "13.5px", margin: "10px 0 8px 0", color: "var(--slate-800)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  📜 Cosechas y Entregas Registradas
                </h4>

                {(() => {
                  const allDetalles = (insumoUbicaciones.stockPorUbicacion || []).flatMap((u) => u.detalles);
                  if (allDetalles.length === 0) {
                    return (
                      <div style={{ padding: "24px", textAlign: "center", color: "var(--slate-500)", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
                        💡 Todavía no hay cosechas ni traslados registrados para este cereal o rollo. Al cargar una nueva labor de Cosecha seleccionando Silos, Cooperativa, Puerto o AFA Los Cardos (o rollos en Keuneke/Tambo), aparecerá aquí de forma automática.
                      </div>
                    );
                  }

                  allDetalles.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

                  return (
                    <div className="tableWrap">
                      <table className="dataTable">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Labor / Origen</th>
                            <th>Lugar de Acopio</th>
                            <th style={{ textAlign: "right" }}>Cantidad Acreditada</th>
                            <th>Detalle de Operación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allDetalles.map((det) => (
                            <tr key={det.id}>
                              <td><strong>{det.fecha}</strong></td>
                              <td>
                                <div style={{ fontWeight: 700, color: "var(--slate-900)" }}>
                                  {det.campo} {det.lote ? `(${det.lote})` : ""}
                                </div>
                                <small style={{ color: "var(--slate-500)" }}>{det.tipo}</small>
                              </td>
                              <td>
                                {insumoUbicaciones.esCerealOGrano && det.id.startsWith("ing-") ? (
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <select
                                      value={
                                        /afa|cardos/i.test(det.referencia || "")
                                          ? "AFA Los Cardos"
                                          : /silo/i.test(det.referencia || "")
                                          ? "Silos"
                                          : /coop/i.test(det.referencia || "")
                                          ? "Cooperativa"
                                          : /puerto/i.test(det.referencia || "")
                                          ? "Puerto (San Lorenzo)"
                                          : "AFA Los Cardos"
                                      }
                                      onChange={(e) => {
                                        const rawIngId = det.id.replace("ing-", "");
                                        reasignarAcopioGrano(rawIngId, e.target.value);
                                        cargarDatos();
                                        triggerFeedback(`✓ Acopio reasignado a: ${e.target.value}`);
                                      }}
                                      style={{
                                        fontSize: "11px",
                                        padding: "3px 6px",
                                        borderRadius: "6px",
                                        border: "1.5px solid #86efac",
                                        background: "#f0fdf4",
                                        fontWeight: 700,
                                        color: "#166534",
                                        cursor: "pointer",
                                      }}
                                    >
                                      <option value="AFA Los Cardos">🌾 AFA Los Cardos</option>
                                      <option value="Silos">🏢 Silos</option>
                                      <option value="Cooperativa">🏬 Cooperativa</option>
                                      <option value="Puerto (San Lorenzo)">🚢 Puerto</option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => handleEliminarIngreso(det.id.replace("ing-", ""))}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "#ef4444",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                        padding: "2px",
                                      }}
                                      title="Eliminar este ingreso"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <span className="pill badgeBlue" style={{ fontSize: "11px", fontWeight: 700 }}>
                                    📍 {det.referencia}
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: "right", fontWeight: 800, color: "#166534" }}>
                                {insumoUbicaciones.esCerealOGrano && det.cantidadTn !== undefined
                                  ? `+${det.cantidadTn.toLocaleString("es-AR")} Tn (${det.cantidad.toLocaleString("es-AR")} kg)`
                                  : `+${det.cantidad.toLocaleString("es-AR")} ${det.unidad}`}
                              </td>
                              <td style={{ fontSize: "12px", color: "var(--slate-600)" }}>{det.detalle}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Pie */}
            <div
              style={{
                padding: "12px 24px",
                background: "#f8fafc",
                borderTop: "1px solid var(--line)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="ghostButton"
                onClick={() => setInsumoUbicaciones(null)}
                style={{ fontWeight: 700, padding: "6px 16px" }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONVERTIR GRANO EN PELLET (CANJE EN AFA LOS CARDOS)             */}
      {/* ========================================================================= */}
      {modalCanjeOpen && (
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
          onClick={() => setModalCanjeOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "580px",
              width: "100%",
              maxHeight: "calc(100vh - 28px)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Fijo */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--line)",
                background: "linear-gradient(to right, #f0fdf4, #ffffff)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>🔄</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "var(--slate-950)" }}>
                    Convertir Grano en Pellet (Canje AFA)
                  </h3>
                  <small style={{ color: "var(--slate-500)", fontSize: "12px" }}>
                    Acreditación de pellet para Tambo contra cereal acopiado en AFA Los Cardos.
                  </small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCanjeOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            </div>

            {/* Formulario con Scroll interno y campos compactos */}
            <form
              onSubmit={handleGuardarCanje}
              style={{
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                flex: "1 1 auto",
              }}
            >
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Fila 1: Selector de Grano de Origen y Fecha */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      Grano de Origen en AFA Los Cardos:
                    </label>
                    <select
                      value={formCanje.cerealInsumoId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        const cItem = data.items.find((x) => x.id === newId);
                        const afaU = cItem?.stockPorUbicacion?.find((u) => u.tipoLugar === "afa" || /afa|cardos/i.test(u.lugar));
                        setFormCanje({
                          ...formCanje,
                          cerealInsumoId: newId,
                          toneladasGrano: afaU && (afaU.cantidadTn || 0) > 0 ? afaU.cantidadTn || 0 : formCanje.toneladasGrano,
                        });
                      }}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 600 }}
                      required
                    >
                      {data.items
                        .filter((it) => it.categoria === "Granos" || it.id.includes("grano"))
                        .map((it) => {
                          const afaU = it.stockPorUbicacion?.find((u) => u.tipoLugar === "afa" || /afa|cardos/i.test(u.lugar));
                          const tnAfa = afaU?.cantidadTn || 0;
                          return (
                            <option key={it.id} value={it.id}>
                              🌾 {it.nombre} — En AFA: {tnAfa.toLocaleString("es-AR")} Tn
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      Fecha de Liquidación:
                    </label>
                    <input
                      type="date"
                      value={formCanje.fecha}
                      onChange={(e) => setFormCanje({ ...formCanje, fecha: e.target.value })}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                      required
                    />
                  </div>
                </div>

                {/* Fila 2: Toneladas a Canjear y Porcentaje de Canje */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      Toneladas de Grano a Canjear:
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formCanje.toneladasGrano}
                        onChange={(e) => setFormCanje({ ...formCanje, toneladasGrano: parseFloat(e.target.value) || 0 })}
                        style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13.5px", fontWeight: 700 }}
                        required
                      />
                      <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "11.5px", color: "var(--slate-400)", fontWeight: 700 }}>
                        Tn
                      </span>
                    </div>
                    <small style={{ fontSize: "10.5px", color: "var(--slate-500)", marginTop: "2px", display: "block" }}>
                      Equivale a {(formCanje.toneladasGrano * 1000).toLocaleString("es-AR")} kg de cereal
                    </small>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      Porcentaje de Canje (%):
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="100"
                        value={formCanje.porcentajeCanje}
                        onChange={(e) => setFormCanje({ ...formCanje, porcentajeCanje: parseFloat(e.target.value) || 0 })}
                        style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13.5px", fontWeight: 700 }}
                        required
                      />
                      <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "11.5px", color: "var(--slate-400)", fontWeight: 700 }}>
                        %
                      </span>
                    </div>
                    <small style={{ fontSize: "10.5px", color: "var(--slate-500)", marginTop: "2px", display: "block" }}>
                      Relación acordada con AFA
                    </small>
                  </div>
                </div>

                {/* Fila 3: Subproducto Resultante a Ingresar y Destino Físico (ÚNICAMENTE TAMBO) */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      Subproducto resultante a ingresar:
                    </label>
                    <select
                      value={formCanje.pelletInsumoId}
                      onChange={(e) => {
                        const newPelletId = e.target.value;
                        const newRacion = DIETA_TAMBO_HJB_DEFAULT.racionesKgDia[newPelletId as keyof typeof DIETA_TAMBO_HJB_DEFAULT.racionesKgDia] || 2.5;
                        setFormCanje({
                          ...formCanje,
                          pelletInsumoId: newPelletId,
                          racionKgVacaDia: newRacion,
                        });
                      }}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 600 }}
                      required
                    >
                      <option value="pellet-soja">🥣 Pellet de Soja Proteico (Harina)</option>
                      <option value="pellet-trigo">🌾 Pellet de Trigo (Afrechillo)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      ¿Dónde queda stockeado el pellet?:
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                      {[
                        { id: "Tambo", label: "🥛 Tambo", sub: "Entrega física" },
                        { id: "AFA Los Cardos", label: "🌾 AFA", sub: "Saldo en AFA" },
                      ].map((d) => {
                        const isSel = (formCanje.destinoPellet || "Tambo") === d.id;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setFormCanje({ ...formCanje, destinoPellet: d.id })}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: isSel ? "2px solid #16a34a" : "1px solid #cbd5e1",
                              background: isSel ? "#f0fdf4" : "#ffffff",
                              color: isSel ? "#166534" : "var(--slate-700)",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              textAlign: "left",
                              height: "35px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>{d.label}</span>
                            {isSel && <span style={{ fontSize: "11px", color: "#16a34a" }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Tarjeta de Cálculo en Tiempo Real y Autonomía de Dieta */}
                {(() => {
                  const tnPellet = Number((formCanje.toneladasGrano * (formCanje.porcentajeCanje / 100)).toFixed(2));
                  const kgPellet = Math.round(tnPellet * 1000);
                  const cerealItem = data.items.find((x) => x.id === formCanje.cerealInsumoId);
                  const pelletItem = data.items.find((x) => x.id === formCanje.pelletInsumoId) || { nombre: "Pellet de Soja Proteico (Harina)" };

                  const { diasAutonomia, mesesAutonomia, consumoDiarioTotalKg, racionKgVacaDia, vacasOrdeñe } = calcularAutonomiaPelletTambo(
                    kgPellet,
                    formCanje.pelletInsumoId,
                    formCanje.vacasEnOrdeñe,
                    formCanje.racionKgVacaDia
                  );

                  const fechaBase = formCanje.fecha ? new Date(formCanje.fecha + "T12:00:00") : new Date();
                  const fechaFin = new Date(fechaBase.getTime() + diasAutonomia * 24 * 60 * 60 * 1000);
                  const fechaFinStr = diasAutonomia > 0
                    ? fechaFin.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })
                    : "--";

                  return (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #86efac",
                        borderRadius: "10px",
                        padding: "12px 14px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>
                          🌾 Subproducto Resultante a Ingresar:
                        </span>
                        <span className="pill badgeGreen" style={{ fontSize: "10px", fontWeight: 800 }}>
                          {formCanje.porcentajeCanje}% Canje AFA
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                        <div>
                          <strong style={{ fontSize: "14.5px", color: "#166534", display: "block" }}>
                            {pelletItem.nombre}
                          </strong>
                          <span style={{ fontSize: "11.5px", color: "var(--slate-600)" }}>
                            Destino asignado: <strong>Tambo</strong> (Alimentación del rodeo)
                          </span>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "20px", fontWeight: 900, color: "#15803d" }}>
                            +{tnPellet.toLocaleString("es-AR")} Tn
                          </div>
                          <small style={{ color: "#166534", fontWeight: 600, fontSize: "11px" }}>
                            +{kgPellet.toLocaleString("es-AR")} kg disponibles en Tambo
                          </small>
                        </div>
                      </div>

                      {/* Autonomía de Dieta para el Rodeo de Vacas */}
                      <div
                        style={{
                          marginTop: "8px",
                          padding: "9px 12px",
                          background: "#ffffff",
                          borderRadius: "8px",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ fontSize: "15px" }}>⏱️</span>
                            <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>
                              Autonomía para el Rodeo del Tambo:
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "14.5px",
                              fontWeight: 900,
                              color: diasAutonomia > 0 ? "#15803d" : "var(--slate-400)",
                            }}
                          >
                            {diasAutonomia} días de stock
                          </span>
                        </div>

                        <div style={{ fontSize: "11.5px", color: "var(--slate-700)", lineHeight: 1.45 }}>
                          Alcanza para alimentar a las <strong>{vacasOrdeñe} vacas en ordeñe</strong> durante{" "}
                          <strong>{diasAutonomia} días</strong> (aprox. {mesesAutonomia} meses{diasAutonomia > 0 ? `, hasta el ${fechaFinStr}` : ""}) según la dieta oficial de <strong>{racionKgVacaDia} kg/vaca/día</strong> ({consumoDiarioTotalKg} kg/día totales del rodeo).
                        </div>

                        <div style={{ marginTop: "6px", paddingTop: "5px", borderTop: "1px dashed #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => setFormCanje({ ...formCanje, mostrarAjusteDieta: !formCanje.mostrarAjusteDieta })}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              fontSize: "11px",
                              color: "#15803d",
                              fontWeight: 700,
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                          >
                            {formCanje.mostrarAjusteDieta ? "▲ Ocultar ajuste de rodeo" : "⚙️ Ajustar vacas en ordeñe o ración"}
                          </button>
                          <span style={{ fontSize: "10px", color: "var(--slate-400)" }}>
                            Dieta Tambo HJB
                          </span>
                        </div>

                        {formCanje.mostrarAjusteDieta && (
                          <div
                            style={{
                              marginTop: "6px",
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "8px",
                              background: "#f8fafc",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <div>
                              <label style={{ fontSize: "10px", fontWeight: 700, display: "block", color: "var(--slate-600)", marginBottom: "2px" }}>
                                Vacas en Ordeñe (VO):
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={formCanje.vacasEnOrdeñe}
                                onChange={(e) => setFormCanje({ ...formCanje, vacasEnOrdeñe: parseInt(e.target.value) || 1 })}
                                style={{ width: "100%", padding: "4px 6px", fontSize: "11.5px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: "10px", fontWeight: 700, display: "block", color: "var(--slate-600)", marginBottom: "2px" }}>
                                Ración Pellet (kg/vaca/día):
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={formCanje.racionKgVacaDia}
                                onChange={(e) => setFormCanje({ ...formCanje, racionKgVacaDia: parseFloat(e.target.value) || 0.1 })}
                                style={{ width: "100%", padding: "4px 6px", fontSize: "11.5px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                              />
                            </div>
                            <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", paddingTop: "4px", borderTop: "1px dashed #cbd5e1" }}>
                              <span style={{ fontSize: "10px", color: "var(--slate-500)" }}>
                                {dietaActiva.ultimaActualizacion ? `Actualizada: ${new Date(dietaActiva.ultimaActualizacion).toLocaleDateString("es-AR")}` : "Dieta oficial HJB"}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const saved = saveDietaTambo({
                                    vacasEnOrdeñe: formCanje.vacasEnOrdeñe,
                                    racionesKgDia: {
                                      ...getDietaTambo().racionesKgDia,
                                      [formCanje.pelletInsumoId]: formCanje.racionKgVacaDia,
                                    },
                                    actualizadoPor: "Panel Canje Insumos",
                                  });
                                  setDietaActiva(saved);
                                  triggerFeedback(`✓ Dieta guardada como vigente en todo el sistema: ${formCanje.vacasEnOrdeñe} vacas @ ${formCanje.racionKgVacaDia} kg/día.`);
                                }}
                                style={{
                                  background: "#166534",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  padding: "3px 8px",
                                  fontSize: "10.5px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                💾 Guardar como Dieta Vigente
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px dashed #bbf7d0", fontSize: "11px", color: "#166534" }}>
                        💡 Descuenta <strong>{formCanje.toneladasGrano} Tn</strong> de {cerealItem?.nombre || "grano"} en <strong>AFA Los Cardos</strong> e ingresa <strong>{tnPellet} Tn</strong> al stock de Tambo.
                      </div>
                    </div>
                  );
                })()}

                {/* Fila 4: Nro de Comprobante / Liquidación AFA y Observaciones */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      Nro. Liquidación / Remito AFA:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Liq. AFA N° 84920"
                      value={formCanje.comprobante}
                      onChange={(e) => setFormCanje({ ...formCanje, comprobante: e.target.value })}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "3px" }}>
                      Observaciones / Flete:
                    </label>
                    <input
                      type="text"
                      placeholder="Detalles sobre entrega en planta o flete..."
                      value={formCanje.observaciones}
                      onChange={(e) => setFormCanje({ ...formCanje, observaciones: e.target.value })}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer Fijo con Botones Siempre Visibles */}
              <div
                style={{
                  padding: "12px 20px",
                  borderTop: "1px solid var(--line)",
                  background: "#f8fafc",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  className="ghostButton"
                  onClick={() => setModalCanjeOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primaryButton"
                  style={{ background: "#15803d", borderColor: "#15803d", padding: "8px 18px" }}
                >
                  ✓ Confirmar Canje a Pellet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL 5: AJUSTAR STOCK / CORREGIR INVENTARIO (RESTAR TONELADAS POR ERROR) */}
      {/* ========================================================================= */}
      {modalAjusteOpen && insumoAjuste && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={() => setModalAjusteOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado del Modal */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "linear-gradient(to right, #fffbeb, #ffffff)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "24px" }}>⚖️</span>
                  <h3 style={{ margin: 0, fontSize: "17.5px", color: "var(--slate-900)" }}>
                    Ajustar Stock: {insumoAjuste.nombre}
                  </h3>
                </div>
                <p className="muted" style={{ margin: "3px 0 0 0", fontSize: "12.5px" }}>
                  Restá toneladas por error de carga, asentá mermas o eliminá directamente compras e ingresos erróneos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalAjusteOpen(false)}
                style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Tarjeta de Stock Actual */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", color: "var(--slate-500)", textTransform: "uppercase", fontWeight: 700 }}>
                    Stock Físico Actual
                  </span>
                  <div style={{ fontSize: "22px", fontWeight: 900, color: insumoAjuste.stockActual > 0 ? "#166534" : "#64748b" }}>
                    {insumoAjuste.esCerealOGrano || insumoAjuste.id.includes("pellet")
                      ? `${(insumoAjuste.stockActual / 1000).toLocaleString("es-AR")} Toneladas`
                      : `${insumoAjuste.stockActual.toLocaleString("es-AR")} ${insumoAjuste.unidad}`}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--slate-500)" }}>
                    {insumoAjuste.stockActual.toLocaleString("es-AR")} {insumoAjuste.unidad} en existencias
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span className="pill badgeSlate" style={{ fontSize: "11px" }}>
                    📍 {insumoAjuste.ubicacion}
                  </span>
                  <div style={{ fontSize: "11.5px", color: "var(--slate-500)", marginTop: "4px" }}>
                    Valor ref: ${insumoAjuste.precioUnitarioArs.toLocaleString("es-AR")} / {insumoAjuste.unidad}
                  </div>
                </div>
              </div>

              {/* Formulario de Ajuste Manual */}
              <form onSubmit={handleGuardarAjuste} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <strong style={{ fontSize: "14px", color: "var(--slate-900)" }}>
                  1. Registrar Nuevo Ajuste de Inventario
                </strong>

                {/* Selección de Ubicación a Ajustar */}
                {insumoAjuste.stockPorUbicacion && insumoAjuste.stockPorUbicacion.length > 0 && (
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                      📍 Lugar / Depósito de stock a ajustar:
                    </label>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {insumoAjuste.stockPorUbicacion.map((u) => {
                        const isSel = (formAjuste.ubicacion || insumoAjuste.stockPorUbicacion![0].lugar) === u.lugar;
                        return (
                          <button
                            key={u.lugar}
                            type="button"
                            onClick={() => setFormAjuste({ ...formAjuste, ubicacion: u.lugar })}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "6px",
                              border: isSel ? "2px solid #2563eb" : "1px solid #cbd5e1",
                              background: isSel ? "#eff6ff" : "#ffffff",
                              color: isSel ? "#1d4ed8" : "var(--slate-700)",
                              fontWeight: isSel ? 800 : 600,
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            {u.icono} {u.lugar} ({(u.cantidadTn !== undefined ? `${u.cantidadTn} Tn` : `${u.cantidad.toLocaleString("es-AR")} ${insumoAjuste.unidad}`)})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tipo de Ajuste */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    Operación a realizar:
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    {[
                      { id: "restar", label: "➖ Restar Toneladas / Stock", sub: "Por error de carga o merma", color: "#dc2626" },
                      { id: "sumar", label: "➕ Sumar Stock", sub: "Sobrante o ingreso omitido", color: "#16a34a" },
                      { id: "fijar", label: "🎯 Fijar Stock Exacto", sub: "Recuento físico auditado", color: "#2563eb" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormAjuste({ ...formAjuste, tipo: opt.id as any })}
                        style={{
                          padding: "10px",
                          borderRadius: "8px",
                          border: formAjuste.tipo === opt.id ? `2px solid ${opt.color}` : "1px solid var(--line)",
                          background: formAjuste.tipo === opt.id ? "#ffffff" : "#f8fafc",
                          cursor: "pointer",
                          textAlign: "left",
                          boxShadow: formAjuste.tipo === opt.id ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
                        }}
                      >
                        <div style={{ fontSize: "12.5px", fontWeight: 800, color: formAjuste.tipo === opt.id ? opt.color : "var(--slate-800)" }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
                          {opt.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cantidades a ajustar */}
                <div style={{ display: "grid", gridTemplateColumns: insumoAjuste.esCerealOGrano || insumoAjuste.id.includes("pellet") ? "1fr 1fr" : "1fr", gap: "12px" }}>
                  {(insumoAjuste.esCerealOGrano || insumoAjuste.id.includes("pellet")) && (
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                        Cantidad en Toneladas (Tn):
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={formAjuste.cantidadTn ?? (formAjuste.cantidad / 1000)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setFormAjuste({
                              ...formAjuste,
                              cantidadTn: val,
                              cantidad: val * 1000,
                            });
                          }}
                          style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: 800 }}
                        />
                        <span style={{ fontWeight: 700, color: "var(--slate-600)" }}>Tn</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                      Cantidad en {insumoAjuste.unidad}:
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="number"
                        step={insumoAjuste.unidad === "Rollos" ? "1" : "10"}
                        min="1"
                        value={formAjuste.cantidad}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFormAjuste({
                            ...formAjuste,
                            cantidad: val,
                            cantidadTn: (insumoAjuste.esCerealOGrano || insumoAjuste.id.includes("pellet")) ? val / 1000 : undefined,
                          });
                        }}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: 800 }}
                      />
                      <span style={{ fontWeight: 700, color: "var(--slate-600)" }}>{insumoAjuste.unidad}</span>
                    </div>
                  </div>
                </div>

                {/* Motivo del Ajuste con Chips Rápidos */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Motivo o Justificación del Ajuste:
                  </label>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
                    {[
                      "Error de carga inicial",
                      "Diferencia de balanza / remito",
                      "Merma de acopio",
                      "Recuento físico de inventario",
                      "Consumo no registrado",
                    ].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFormAjuste({ ...formAjuste, motivo: m })}
                        className="pill badgeSlate"
                        style={{
                          fontSize: "11px",
                          cursor: "pointer",
                          border: formAjuste.motivo === m ? "1px solid #2563eb" : "1px solid #cbd5e1",
                          background: formAjuste.motivo === m ? "#eff6ff" : "#ffffff",
                          color: formAjuste.motivo === m ? "#1d4ed8" : "var(--slate-700)",
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={formAjuste.motivo}
                    onChange={(e) => setFormAjuste({ ...formAjuste, motivo: e.target.value })}
                    placeholder="Ej: Se cargaron toneladas por error en pellet en vez de grano comercial"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                </div>

                {/* Previsualización del Resultado */}
                {(() => {
                  const cantNum = Number(formAjuste.cantidad) || 0;
                  let delta = 0;
                  if (formAjuste.tipo === "restar") delta = -Math.abs(cantNum);
                  else if (formAjuste.tipo === "sumar") delta = Math.abs(cantNum);
                  else if (formAjuste.tipo === "fijar") delta = cantNum - insumoAjuste.stockActual;

                  const finalStock = Math.max(0, Math.round((insumoAjuste.stockActual + delta) * 10) / 10);
                  const deltaTn = (insumoAjuste.esCerealOGrano || insumoAjuste.id.includes("pellet"))
                    ? Number((delta / 1000).toFixed(2))
                    : undefined;
                  const finalTn = (insumoAjuste.esCerealOGrano || insumoAjuste.id.includes("pellet"))
                    ? Number((finalStock / 1000).toFixed(2))
                    : undefined;

                  return (
                    <div
                      style={{
                        background: delta < 0 ? "#fef2f2" : "#f0fdf4",
                        border: delta < 0 ? "1px solid #fecaca" : "1px solid #bbf7d0",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: delta < 0 ? "#991b1b" : "#166534" }}>
                          Impacto en el Stock Disponible:
                        </span>
                        <div style={{ fontSize: "13.5px", fontWeight: 700, marginTop: "2px" }}>
                          {insumoAjuste.stockActual.toLocaleString("es-AR")} {insumoAjuste.unidad}
                          {" ➔ "}
                          <span style={{ color: delta < 0 ? "#dc2626" : "#16a34a" }}>
                            {delta < 0 ? `-${Math.abs(delta).toLocaleString("es-AR")}` : `+${delta.toLocaleString("es-AR")}`}
                          </span>
                          {" ➔ "}
                          <strong style={{ color: "#0f172a" }}>
                            {finalStock.toLocaleString("es-AR")} {insumoAjuste.unidad}
                            {finalTn !== undefined && ` (${finalTn} Tn)`}
                          </strong>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="primaryButton"
                        style={{
                          background: delta < 0 ? "#dc2626" : "#16a34a",
                          borderColor: delta < 0 ? "#dc2626" : "#16a34a",
                          padding: "8px 16px",
                          fontSize: "13px",
                        }}
                      >
                        {delta < 0 ? "💾 Aplicar Resta de Stock" : "💾 Guardar Ajuste"}
                      </button>
                    </div>
                  );
                })()}
              </form>

              <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "4px 0" }} />

              {/* 2. Ingresos Manuales Registrados de este Insumo (Eliminar ingresos erróneos directamente) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div>
                    <strong style={{ fontSize: "14px", color: "var(--slate-900)" }}>
                      2. Compras e Ingresos Manuales Registrados
                    </strong>
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--slate-500)" }}>
                      Si cargaste un ingreso con cantidad equivocada (por ej. 68.000 kg en lugar de grano), podés eliminarlo directamente:
                    </p>
                  </div>
                </div>

                {(() => {
                  const ingresosItem = getIngresosManuales().filter((x) => x.insumoId === insumoAjuste.id && !x.deleted);
                  if (ingresosItem.length === 0) {
                    return (
                      <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", fontSize: "12.5px", color: "var(--slate-500)", textAlign: "center" }}>
                        No hay ingresos manuales registrados para este insumo.
                      </div>
                    );
                  }

                  return (
                    <div className="tableWrap">
                      <table className="dataTable" style={{ fontSize: "12px" }}>
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th style={{ textAlign: "right" }}>Cantidad</th>
                            <th>Ubicación</th>
                            <th>Remito / Detalle</th>
                            <th style={{ textAlign: "center" }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ingresosItem.map((ing) => {
                            const cantTn = (insumoAjuste.esCerealOGrano || insumoAjuste.id.includes("pellet"))
                              ? Number((ing.cantidad / 1000).toFixed(2))
                              : undefined;

                            return (
                              <tr key={ing.id}>
                                <td>{ing.fecha}</td>
                                <td style={{ textAlign: "right", fontWeight: 800, color: "#166534" }}>
                                  +{ing.cantidad.toLocaleString("es-AR")} {insumoAjuste.unidad}
                                  {cantTn !== undefined && (
                                    <span style={{ fontSize: "11px", color: "var(--slate-500)", display: "block" }}>
                                      ({cantTn} Tn)
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span className="pill badgeSlate" style={{ fontSize: "10.5px" }}>
                                    {ing.ubicacion || "Depósito"}
                                  </span>
                                </td>
                                <td style={{ color: "var(--slate-600)" }}>
                                  {ing.remitoProveedor} {ing.observaciones ? `· ${ing.observaciones}` : ""}
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    type="button"
                                    className="ghostButton"
                                    onClick={() => handleEliminarIngreso(ing.id)}
                                    style={{
                                      padding: "3px 8px",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      color: "#dc2626",
                                      borderColor: "#fca5a5",
                                      background: "#fef2f2",
                                    }}
                                    title="Eliminar este ingreso erróneo de la base de datos"
                                  >
                                    🗑️ Eliminar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* 3. Historial de Ajustes Previos Realizados */}
              {(() => {
                const ajustesItem = getAjustesStock().filter((x) => x.insumoId === insumoAjuste.id && !x.deleted);
                if (ajustesItem.length === 0) return null;

                return (
                  <div>
                    <strong style={{ fontSize: "13.5px", color: "var(--slate-900)", display: "block", marginBottom: "6px" }}>
                      3. Ajustes de Inventario Realizados Anteriormente ({ajustesItem.length})
                    </strong>
                    <div className="tableWrap">
                      <table className="dataTable" style={{ fontSize: "12px" }}>
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th style={{ textAlign: "right" }}>Ajuste</th>
                            <th>Motivo</th>
                            <th style={{ textAlign: "center" }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ajustesItem.map((aj) => (
                            <tr key={aj.id}>
                              <td>{aj.fecha}</td>
                              <td style={{ textAlign: "right", fontWeight: 800, color: aj.cantidadDelta < 0 ? "#dc2626" : "#16a34a" }}>
                                {aj.cantidadDelta > 0 ? `+${aj.cantidadDelta.toLocaleString("es-AR")}` : aj.cantidadDelta.toLocaleString("es-AR")} {insumoAjuste.unidad}
                                {aj.cantidadTn !== undefined && (
                                  <span style={{ fontSize: "11px", color: "var(--slate-500)", display: "block" }}>
                                    ({aj.cantidadTn > 0 ? `+${aj.cantidadTn}` : aj.cantidadTn} Tn)
                                  </span>
                                )}
                              </td>
                              <td style={{ color: "var(--slate-600)" }}>{aj.motivo}</td>
                              <td style={{ textAlign: "center" }}>
                                <button
                                  type="button"
                                  className="ghostButton"
                                  onClick={() => handleEliminarAjuste(aj.id)}
                                  style={{ padding: "2px 6px", fontSize: "11px", color: "#dc2626" }}
                                  title="Revertir este ajuste"
                                >
                                  🗑️ Deshacer
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer Modal */}
            <div
              style={{
                padding: "12px 24px",
                borderTop: "1px solid var(--line)",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="ghostButton"
                onClick={() => setModalAjusteOpen(false)}
                style={{ fontWeight: 700, padding: "6px 14px" }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRASLADO DE PELLET (DE AFA LOS CARDOS A TAMBO) */}
      {modalTrasladoPelletOpen && (
        <div className="modalOverlay" onClick={() => setModalTrasladoPelletOpen(false)}>
          <div
            className="modalContent"
            style={{ maxWidth: "480px", width: "95%", borderRadius: "12px", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--line)",
                background: "#faf5ff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span className="pill badgePurple" style={{ fontSize: "11px", marginBottom: "4px" }}>
                  Movimiento entre Depósitos / Acopios
                </span>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#6b21a8" }}>
                  🚚 Trasladar Pellet al Tambo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalTrasladoPelletOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--slate-400)" }}
              >
                ✕
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleGuardarTrasladoPellet} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "11px", color: "var(--slate-500)", fontWeight: 600 }}>Insumo a Trasladar:</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--slate-900)" }}>
                  🥣 {formTrasladoPellet.insumoNombre}
                </div>
              </div>

              {/* Origen y Destino */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "8px" }}>
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "10.5px", color: "#1e40af", fontWeight: 700 }}>ORIGEN (Se descuenta)</div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e3a8a", marginTop: "2px" }}>
                    🌾 {formTrasladoPellet.origen}
                  </div>
                </div>
                <div style={{ fontSize: "18px", color: "var(--slate-400)" }}>➔</div>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "10.5px", color: "#166534", fontWeight: 700 }}>DESTINO (Ingresa)</div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#14532d", marginTop: "2px" }}>
                    🥛 {formTrasladoPellet.destino}
                  </div>
                </div>
              </div>

              {/* Toneladas y Kilos */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Cantidad a Trasladar (Tn):
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formTrasladoPellet.toneladas}
                      onChange={(e) => setFormTrasladoPellet({ ...formTrasladoPellet, toneladas: parseFloat(e.target.value) || 0 })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: 800 }}
                      required
                    />
                    <span style={{ fontWeight: 700, color: "var(--slate-600)" }}>Tn</span>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Equivalente en kilos (kg):
                  </label>
                  <div style={{ padding: "8px 10px", background: "#f1f5f9", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: 800, color: "var(--slate-800)" }}>
                    {Math.round(formTrasladoPellet.toneladas * 1000).toLocaleString("es-AR")} kg
                  </div>
                </div>
              </div>

              {/* Fecha y Remito */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Fecha del Traslado:
                  </label>
                  <input
                    type="date"
                    value={formTrasladoPellet.fecha}
                    onChange={(e) => setFormTrasladoPellet({ ...formTrasladoPellet, fecha: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Remito / Chofer / Guía:
                  </label>
                  <input
                    type="text"
                    value={formTrasladoPellet.remito}
                    onChange={(e) => setFormTrasladoPellet({ ...formTrasladoPellet, remito: e.target.value })}
                    placeholder="Ej: Remito AFA 004829"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  Observaciones adicionales:
                </label>
                <input
                  type="text"
                  value={formTrasladoPellet.observaciones}
                  onChange={(e) => setFormTrasladoPellet({ ...formTrasladoPellet, observaciones: e.target.value })}
                  placeholder="Ej: Retiro con camión propio / Chasis cerealero"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="ghostButton"
                  onClick={() => setModalTrasladoPelletOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="brandButton"
                  style={{ background: "#7e22ce", borderColor: "#6b21a8" }}
                >
                  ✓ Confirmar Traslado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
