"use client";

import { useState, useMemo } from "react";
import {
  COSTOS_HISTORICOS_DEFAULT,
  generarProyeccionComercial,
  crearProyeccionVenta,
  pasarVentaATemporal,
  buscarOperacionSimilar,
  getClientesCompradores,
  agregarClienteComprador,
  getFrigorificosDestino,
  agregarFrigorificoDestino,
  MetodoVentaGordo,
  VentaGordoExpediente,
} from "@/lib/ventasGordosData";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onVentaGuardada: (venta: VentaGordoExpediente) => void;
  usuarioActual: string;
}

export default function ModalProyeccionVenta({
  isOpen,
  onClose,
  onVentaGuardada,
  usuarioActual,
}: Props) {
  // Lote y Parámetros Generales
  const [fechaEstimada, setFechaEstimada] = useState(() => new Date().toISOString().slice(0, 10));

  // Clientes con Desplegable + Opción de Agregar Nuevo
  const [listaClientes, setListaClientes] = useState<string[]>(() => getClientesCompradores());
  const [clienteNombre, setClienteNombre] = useState<string>(() => listaClientes[0] || "La Tercera S.R.L.");
  const [modoNuevoCliente, setModoNuevoCliente] = useState(false);
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");

  // Frigoríficos con Desplegable + Opción de Agregar Nuevo
  const [listaFrigorificos, setListaFrigorificos] = useState<string[]>(() => getFrigorificosDestino());
  const [frigorificoDestino, setFrigorificoDestino] = useState<string>(() => listaFrigorificos[0] || "Frigorífico Logros S.A.");
  const [modoNuevoFrigorifico, setModoNuevoFrigorifico] = useState(false);
  const [nuevoFrigorificoNombre, setNuevoFrigorificoNombre] = useState("");

  // Inputs Numéricos (Estados como string para permitir borrar completamente y tipear libremente ej: 255)
  const [cantidadCabezasStr, setCantidadCabezasStr] = useState<string>("25");
  const [pesoPromedioCampoKgStr, setPesoPromedioCampoKgStr] = useState<string>("405");
  const [periodoCosto, setPeriodoCosto] = useState<string>("Sep-2026");
  const [costoDirectoUnitarioStr, setCostoDirectoUnitarioStr] = useState<string>("794021.98");
  const [porcentajeCostoIndirectoStr, setPorcentajeCostoIndirectoStr] = useState<string>("5");
  const [gastosVentaArsStr, setGastosVentaArsStr] = useState<string>("35000");
  const [observaciones, setObservaciones] = useState("");

  // Alternativa A: Kilo Vivo
  const [precioKgVivoArsStr, setPrecioKgVivoArsStr] = useState<string>("4250");
  const [desbasteKiloVivoPctStr, setDesbasteKiloVivoPctStr] = useState<string>("8");

  // Alternativa B: A Rendimiento
  const [precioKgResArsStr, setPrecioKgResArsStr] = useState<string>("7600");
  const [desbasteTrasladoPctStr, setDesbasteTrasladoPctStr] = useState<string>("4");
  const [rendimientoEstimadoPctStr, setRendimientoEstimadoPctStr] = useState<string>("55.82");

  // Decisión Comercial
  const [metodoElegidoManual, setMetodoElegidoManual] = useState<MetodoVentaGordo | null>(null);

  // Advertencia de Duplicado
  const [advertenciaDuplicado, setAdvertenciaDuplicado] = useState<VentaGordoExpediente | null>(null);
  const [accionPendienteTrasAdvertencia, setAccionPendienteTrasAdvertencia] = useState<"PROYECCION" | "TEMPORAL" | null>(null);

  // Conversión reactiva a números para cálculos sin trabar el tipeo
  const cantidadCabezas = useMemo(() => {
    const val = Number(cantidadCabezasStr);
    return isNaN(val) ? 0 : val;
  }, [cantidadCabezasStr]);

  const pesoPromedioCampoKg = useMemo(() => {
    const val = Number(pesoPromedioCampoKgStr);
    return isNaN(val) ? 0 : val;
  }, [pesoPromedioCampoKgStr]);

  const costoDirectoUnitario = useMemo(() => {
    const val = Number(costoDirectoUnitarioStr);
    return isNaN(val) ? 0 : val;
  }, [costoDirectoUnitarioStr]);

  const porcentajeCostoIndirecto = useMemo(() => {
    const val = Number(porcentajeCostoIndirectoStr);
    return isNaN(val) ? 0 : val;
  }, [porcentajeCostoIndirectoStr]);

  const gastosVentaArs = useMemo(() => {
    const val = Number(gastosVentaArsStr);
    return isNaN(val) ? 0 : val;
  }, [gastosVentaArsStr]);

  const precioKgVivoArs = useMemo(() => {
    const val = Number(precioKgVivoArsStr);
    return isNaN(val) ? 0 : val;
  }, [precioKgVivoArsStr]);

  const desbasteKiloVivoPct = useMemo(() => {
    const val = Number(desbasteKiloVivoPctStr);
    return isNaN(val) ? 0 : val;
  }, [desbasteKiloVivoPctStr]);

  const precioKgResArs = useMemo(() => {
    const val = Number(precioKgResArsStr);
    return isNaN(val) ? 0 : val;
  }, [precioKgResArsStr]);

  const desbasteTrasladoPct = useMemo(() => {
    const val = Number(desbasteTrasladoPctStr);
    return isNaN(val) ? 0 : val;
  }, [desbasteTrasladoPctStr]);

  const rendimientoEstimadoPct = useMemo(() => {
    const val = Number(rendimientoEstimadoPctStr);
    return isNaN(val) ? 0 : val;
  }, [rendimientoEstimadoPctStr]);

  // Cálculos en tiempo real
  const pesoCampoTotalKg = useMemo(() => {
    return Number((cantidadCabezas * pesoPromedioCampoKg).toFixed(1));
  }, [cantidadCabezas, pesoPromedioCampoKg]);

  const proyeccion = useMemo(() => {
    return generarProyeccionComercial({
      pesoCampoTotalKg,
      cantidadCabezas,
      costoDirectoUnitario,
      porcentajeCostoIndirecto,
      gastosVentaArs,
      precioKgVivoArs,
      desbasteKiloVivoPct,
      precioKgResArs,
      desbasteTrasladoPct,
      rendimientoEstimadoPct,
    });
  }, [
    pesoCampoTotalKg,
    cantidadCabezas,
    costoDirectoUnitario,
    porcentajeCostoIndirecto,
    gastosVentaArs,
    precioKgVivoArs,
    desbasteKiloVivoPct,
    precioKgResArs,
    desbasteTrasladoPct,
    rendimientoEstimadoPct,
  ]);

  const metodoFinal = metodoElegidoManual || proyeccion.alternativaRecomendada;
  const altSeleccionada = metodoFinal === "RENDIMIENTO" ? proyeccion.altRendimiento : proyeccion.altKiloVivo;

  // Manejo de cambio de período de costo
  function handlePeriodoCostoChange(periodo: string) {
    setPeriodoCosto(periodo);
    const encontrado = COSTOS_HISTORICOS_DEFAULT.find((c) => c.periodo === periodo);
    if (encontrado) {
      setCostoDirectoUnitarioStr(String(encontrado.costoDirectoUnitario));
    }
  }

  // Funciones para guardar nuevo Cliente / Comprador
  function handleGuardarNuevoCliente() {
    const clean = nuevoClienteNombre.trim();
    if (!clean) return;
    const updated = agregarClienteComprador(clean);
    setListaClientes(updated);
    setClienteNombre(clean);
    setNuevoClienteNombre("");
    setModoNuevoCliente(false);
  }

  // Funciones para guardar nuevo Frigorífico Destino
  function handleGuardarNuevoFrigorifico() {
    const clean = nuevoFrigorificoNombre.trim();
    if (!clean) return;
    const updated = agregarFrigorificoDestino(clean);
    setListaFrigorificos(updated);
    setFrigorificoDestino(clean);
    setNuevoFrigorificoNombre("");
    setModoNuevoFrigorifico(false);
  }

  // Guardado de la Venta
  function ejecutarGuardado(estadoDestino: "PROYECCION" | "TEMPORAL") {
    if (!clienteNombre.trim()) {
      alert("Por favor seleccione o ingrese el cliente o comprador.");
      return;
    }
    if (cantidadCabezas <= 0 || pesoPromedioCampoKg <= 0) {
      alert("La cantidad de cabezas y peso promedio deben ser mayores a 0.");
      return;
    }

    // Verificar posible duplicado
    const similar = buscarOperacionSimilar({
      fecha: fechaEstimada,
      cliente: clienteNombre,
      cantidad: cantidadCabezas,
      pesoCampo: pesoCampoTotalKg,
    });

    if (similar && !advertenciaDuplicado) {
      setAdvertenciaDuplicado(similar);
      setAccionPendienteTrasAdvertencia(estadoDestino);
      return;
    }

    // Crear la venta
    const nueva = crearProyeccionVenta({
      fechaEstimada,
      clienteNombre: clienteNombre.trim(),
      frigorificoDestino: frigorificoDestino.trim(),
      cantidadEstimada: cantidadCabezas,
      pesoPromedioEstimadoKg: pesoPromedioCampoKg,
      periodoCosto,
      costoDirectoUnitario,
      porcentajeCostoIndirecto,
      gastosVentaArs,
      precioKgVivoArs,
      desbasteKiloVivoPct,
      precioKgResArs,
      desbasteTrasladoPct,
      rendimientoEstimadoPct,
      observaciones,
      usuario: usuarioActual || "Operador",
    });

    if (estadoDestino === "TEMPORAL") {
      const temporal = pasarVentaATemporal({
        ventaId: nueva.id,
        metodoElegido: metodoFinal,
        usuario: usuarioActual || "Operador",
      });
      onVentaGuardada(temporal);
    } else {
      onVentaGuardada(nueva);
    }

    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "1350px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "24px" }}>🥩</span>
              <h2 style={{ fontSize: "19px", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                Nuevo Expediente de Venta: Proyección & Comparador Comercial
              </h2>
              <span
                style={{
                  background: "rgba(59, 130, 246, 0.25)",
                  color: "#93c5fd",
                  border: "1px solid rgba(59, 130, 246, 0.5)",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                ESTADO INICIAL: PROYECCIÓN
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#94a3b8" }}>
              Analice simultáneamente la oferta por Kilo Vivo vs. Rendimiento al Gancho antes de cerrar el negocio.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#ffffff",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Duplicados Advertencia */}
        {advertenciaDuplicado && (
          <div
            style={{
              backgroundColor: "#fef3c7",
              borderBottom: "2px solid #f59e0b",
              padding: "12px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>⚠️</span>
              <div style={{ fontSize: "13px", color: "#92400e" }}>
                <strong>Existe una operación similar:</strong> Venta N° {advertenciaDuplicado.numeroVenta} (
                {advertenciaDuplicado.clienteNombre} - {advertenciaDuplicado.cantidadEstimada} cabezas -{" "}
                {advertenciaDuplicado.pesoCampoEstimadoKg} kg). ¿Desea continuar y crear un nuevo expediente de todos
                modos?
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="ghostButton"
                onClick={() => {
                  setAdvertenciaDuplicado(null);
                  setAccionPendienteTrasAdvertencia(null);
                }}
                style={{ fontSize: "12px", padding: "4px 10px" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primaryButton"
                onClick={() => {
                  const accion = accionPendienteTrasAdvertencia || "PROYECCION";
                  setAdvertenciaDuplicado(null);
                  ejecutarGuardado(accion);
                }}
                style={{ fontSize: "12px", padding: "4px 12px", background: "#d97706" }}
              >
                Sí, crear de todas formas
              </button>
            </div>
          </div>
        )}

        {/* Cuerpo del Modal: 3 Columnas Ergonómicas */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "1fr 1.55fr 1fr",
            gap: "20px",
            flex: 1,
            backgroundColor: "#f8fafc",
          }}
        >
          {/* ======================================================== */}
          {/* COLUMNA 1: PARÁMETROS DEL LOTE Y COSTOS                  */}
          {/* ======================================================== */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "18px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
              <span style={{ fontSize: "18px" }}>📋</span>
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                1. Datos del Lote & Costos
              </h3>
            </div>

            <div>
              <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Fecha Estimada de Venta</label>
              <input
                type="date"
                value={fechaEstimada}
                onChange={(e) => setFechaEstimada(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>

            {/* Selector Desplegable Cliente / Comprador con opción de Agregar Nuevo */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Cliente / Comprador *</label>
                <button
                  type="button"
                  onClick={() => setModoNuevoCliente(!modoNuevoCliente)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {modoNuevoCliente ? "✕ Elegir de la lista" : "➕ + Agregar nuevo"}
                </button>
              </div>

              {!modoNuevoCliente ? (
                <select
                  value={clienteNombre}
                  onChange={(e) => {
                    if (e.target.value === "__nuevo__") {
                      setModoNuevoCliente(true);
                    } else {
                      setClienteNombre(e.target.value);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    backgroundColor: "#ffffff",
                    fontWeight: 600,
                    color: "#0f172a",
                  }}
                >
                  <option value="">-- Seleccionar Comprador --</option>
                  {listaClientes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__nuevo__">➕ + Agregar nuevo comprador...</option>
                </select>
              ) : (
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    placeholder="Nombre del nuevo comprador..."
                    value={nuevoClienteNombre}
                    onChange={(e) => setNuevoClienteNombre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleGuardarNuevoCliente();
                      }
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      padding: "7px 10px",
                      borderRadius: "6px",
                      border: "1.5px solid #2563eb",
                      fontSize: "13px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleGuardarNuevoCliente}
                    style={{
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Guardar
                  </button>
                </div>
              )}
            </div>

            {/* Selector Desplegable Frigorífico Destino con opción de Agregar Nuevo */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Frigorífico Destino</label>
                <button
                  type="button"
                  onClick={() => setModoNuevoFrigorifico(!modoNuevoFrigorifico)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {modoNuevoFrigorifico ? "✕ Elegir de la lista" : "➕ + Agregar nuevo"}
                </button>
              </div>

              {!modoNuevoFrigorifico ? (
                <select
                  value={frigorificoDestino}
                  onChange={(e) => {
                    if (e.target.value === "__nuevo__") {
                      setModoNuevoFrigorifico(true);
                    } else {
                      setFrigorificoDestino(e.target.value);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    backgroundColor: "#ffffff",
                    fontWeight: 600,
                    color: "#0f172a",
                  }}
                >
                  <option value="">-- Seleccionar Frigorífico --</option>
                  {listaFrigorificos.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                  <option value="__nuevo__">➕ + Agregar nuevo frigorífico...</option>
                </select>
              ) : (
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    placeholder="Nombre del nuevo frigorífico..."
                    value={nuevoFrigorificoNombre}
                    onChange={(e) => setNuevoFrigorificoNombre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleGuardarNuevoFrigorifico();
                      }
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      padding: "7px 10px",
                      borderRadius: "6px",
                      border: "1.5px solid #2563eb",
                      fontSize: "13px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleGuardarNuevoFrigorifico}
                    style={{
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Guardar
                  </button>
                </div>
              )}
            </div>

            {/* Inputs de Cabezas Estimadas y Peso Promedio (Editables libremente) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Cabezas Estimadas</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="ej: 25 o 255"
                  value={cantidadCabezasStr}
                  onChange={(e) => setCantidadCabezasStr(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Peso Promedio (kg/cab)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="ej: 405"
                  value={pesoPromedioCampoKgStr}
                  onChange={(e) => setPesoPromedioCampoKgStr(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            {/* Peso Total Calculado en vivo */}
            <div
              style={{
                backgroundColor: "#f1f5f9",
                padding: "8px 12px",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "12px", color: "#475569" }}>Peso Total Lote en Campo:</span>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                {pesoCampoTotalKg.toLocaleString("es-AR")} kg
              </strong>
            </div>

            {/* Período de Costo */}
            <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "10px" }}>
              <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Período de Costo Productivo</label>
              <select
                value={periodoCosto}
                onChange={(e) => handlePeriodoCostoChange(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
              >
                {COSTOS_HISTORICOS_DEFAULT.map((c) => (
                  <option key={c.periodo} value={c.periodo}>
                    {c.periodo} (${c.costoDirectoUnitario.toLocaleString("es-AR")}/animal)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Costo Directo ($/cab)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={costoDirectoUnitarioStr}
                  onChange={(e) => setCostoDirectoUnitarioStr(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Indirecto (%)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={porcentajeCostoIndirectoStr}
                  onChange={(e) => setPorcentajeCostoIndirectoStr(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Gastos Directos Venta (DT-e, flete $)</label>
              <input
                type="text"
                inputMode="numeric"
                value={gastosVentaArsStr}
                onChange={(e) => setGastosVentaArsStr(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Observaciones de la Proyección</label>
              <textarea
                rows={2}
                placeholder="Notas sobre el lote, condiciones de pago, flete a cargo de..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", resize: "none" }}
              />
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUMNA 2: COMPARADOR LADO A LADO (A vs B)               */}
          {/* ======================================================== */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>⚖️</span>
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  2. Comparación Simultánea de Alternativas
                </h3>
              </div>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>Cálculo continuo en vivo</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", flex: 1 }}>
              {/* ALTERNATIVA A: KILO VIVO */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  padding: "16px",
                  borderRadius: "12px",
                  border: metodoFinal === "KILO_VIVO" ? "2px solid #2563eb" : "1px solid #e2e8f0",
                  boxShadow: metodoFinal === "KILO_VIVO" ? "0 4px 12px rgba(37, 99, 235, 0.12)" : "none",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#2563eb", letterSpacing: "0.5px" }}>
                      ALTERNATIVA A
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        backgroundColor: "#eff6ff",
                        color: "#1d4ed8",
                      }}
                    >
                      KILO VIVO
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Precio $/kg Vivo</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={precioKgVivoArsStr}
                        onChange={(e) => setPrecioKgVivoArsStr(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#1e3a8a",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>% Desbaste Estimado</label>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={desbasteKiloVivoPctStr}
                          onChange={(e) => setDesbasteKiloVivoPctStr(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        />
                        <span style={{ fontSize: "12px", color: "#64748b" }}>%</span>
                      </div>
                      <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>Ref. habitual: 8%</span>
                    </div>

                    {/* Fórmulas y Datos Calculados */}
                    <div style={{ backgroundColor: "#f8fafc", padding: "10px", borderRadius: "8px", fontSize: "11.5px", display: "flex", flexDirection: "column", gap: "5px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b" }}>Kg Descontados:</span>
                        <strong>{proyeccion.altKiloVivo.kgDesbasteDescontados.toLocaleString("es-AR")} kg</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b" }}>Neto Liquidable:</span>
                        <strong style={{ color: "#0f172a" }}>{proyeccion.altKiloVivo.pesoNetoLiquidableKg.toLocaleString("es-AR")} kg</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "5px" }}>
                        <span style={{ color: "#64748b" }}>Ingreso Bruto:</span>
                        <strong style={{ color: "#15803d", fontSize: "13px" }}>${proyeccion.altKiloVivo.ingresoBrutoEstimadoArs.toLocaleString("es-AR")}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Económico A */}
                <div style={{ marginTop: "14px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ color: "#64748b" }}>Costo Total:</span>
                    <span>${proyeccion.altKiloVivo.costoTotalConsideradoArs.toLocaleString("es-AR")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>
                    <span style={{ color: "#0f172a" }}>Margen Operativo:</span>
                    <span style={{ color: proyeccion.altKiloVivo.margenOperativoEstimadoArs >= 0 ? "#166534" : "#dc2626" }}>
                      ${proyeccion.altKiloVivo.margenOperativoEstimadoArs.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: "#64748b" }}>
                    <span>Margen / animal:</span>
                    <strong>${proyeccion.altKiloVivo.margenPorAnimalArs.toLocaleString("es-AR")}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: "#64748b" }}>
                    <span>Margen s/ venta:</span>
                    <strong>{proyeccion.altKiloVivo.margenSobreVentasPct}%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                    <span>Precio equilibrio:</span>
                    <span>${proyeccion.altKiloVivo.precioEquilibrioKgVivoArs}/kg</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMetodoElegidoManual("KILO_VIVO")}
                    style={{
                      width: "100%",
                      marginTop: "12px",
                      padding: "7px",
                      fontSize: "12px",
                      fontWeight: 700,
                      borderRadius: "6px",
                      cursor: "pointer",
                      border: "none",
                      backgroundColor: metodoFinal === "KILO_VIVO" ? "#2563eb" : "#f1f5f9",
                      color: metodoFinal === "KILO_VIVO" ? "#ffffff" : "#475569",
                    }}
                  >
                    {metodoFinal === "KILO_VIVO" ? "✓ Método Seleccionado" : "Elegir Kilo Vivo"}
                  </button>
                </div>
              </div>

              {/* ALTERNATIVA B: RENDIMIENTO */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  padding: "16px",
                  borderRadius: "12px",
                  border: metodoFinal === "RENDIMIENTO" ? "2px solid #16a34a" : "1px solid #e2e8f0",
                  boxShadow: metodoFinal === "RENDIMIENTO" ? "0 4px 12px rgba(22, 163, 74, 0.12)" : "none",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#16a34a", letterSpacing: "0.5px" }}>
                      ALTERNATIVA B
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        backgroundColor: "#f0fdf4",
                        color: "#15803d",
                      }}
                    >
                      A RENDIMIENTO
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Precio $/kg de Res</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={precioKgResArsStr}
                        onChange={(e) => setPrecioKgResArsStr(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#14532d",
                        }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>% Traslado</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={desbasteTrasladoPctStr}
                          onChange={(e) => setDesbasteTrasladoPctStr(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12.5px",
                            fontWeight: 600,
                          }}
                        />
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>Ref: 4%</span>
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>% Rendimiento</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={rendimientoEstimadoPctStr}
                          onChange={(e) => setRendimientoEstimadoPctStr(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12.5px",
                            fontWeight: 700,
                          }}
                        />
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>Ref: 55,82%</span>
                      </div>
                    </div>

                    {/* Fórmulas y Datos Calculados */}
                    <div style={{ backgroundColor: "#f8fafc", padding: "10px", borderRadius: "8px", fontSize: "11.5px", display: "flex", flexDirection: "column", gap: "5px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b" }}>Peso en Frigorífico:</span>
                        <strong>{proyeccion.altRendimiento.pesoFrigorificoEstimadoKg.toLocaleString("es-AR")} kg</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b" }}>Kg Res Estimados:</span>
                        <strong style={{ color: "#0f172a" }}>{proyeccion.altRendimiento.kgResEstimados.toLocaleString("es-AR")} kg</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "5px" }}>
                        <span style={{ color: "#64748b" }}>Ingreso Bruto:</span>
                        <strong style={{ color: "#15803d", fontSize: "13px" }}>${proyeccion.altRendimiento.ingresoBrutoEstimadoArs.toLocaleString("es-AR")}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Económico B */}
                <div style={{ marginTop: "14px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ color: "#64748b" }}>Costo Total:</span>
                    <span>${proyeccion.altRendimiento.costoTotalConsideradoArs.toLocaleString("es-AR")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>
                    <span style={{ color: "#0f172a" }}>Margen Operativo:</span>
                    <span style={{ color: proyeccion.altRendimiento.margenOperativoEstimadoArs >= 0 ? "#166534" : "#dc2626" }}>
                      ${proyeccion.altRendimiento.margenOperativoEstimadoArs.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: "#64748b" }}>
                    <span>Margen / animal:</span>
                    <strong>${proyeccion.altRendimiento.margenPorAnimalArs.toLocaleString("es-AR")}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: "#64748b" }}>
                    <span>Margen s/ venta:</span>
                    <strong>{proyeccion.altRendimiento.margenSobreVentasPct}%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                    <span>Precio equilibrio:</span>
                    <span>${proyeccion.altRendimiento.precioEquilibrioKgResArs}/kg res</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMetodoElegidoManual("RENDIMIENTO")}
                    style={{
                      width: "100%",
                      marginTop: "12px",
                      padding: "7px",
                      fontSize: "12px",
                      fontWeight: 700,
                      borderRadius: "6px",
                      cursor: "pointer",
                      border: "none",
                      backgroundColor: metodoFinal === "RENDIMIENTO" ? "#16a34a" : "#f1f5f9",
                      color: metodoFinal === "RENDIMIENTO" ? "#ffffff" : "#475569",
                    }}
                  >
                    {metodoFinal === "RENDIMIENTO" ? "✓ Método Seleccionado" : "Elegir Rendimiento"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUMNA 3: RECOMENDACIÓN & ACCIONES                      */}
          {/* ======================================================== */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "18px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px", marginBottom: "12px" }}>
                <span style={{ fontSize: "18px" }}>💡</span>
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  3. Decisión & Recomendación
                </h3>
              </div>

              {/* Dictamen Comercial */}
              <div
                style={{
                  backgroundColor: proyeccion.alternativaRecomendada === "RENDIMIENTO" ? "#f0fdf4" : "#eff6ff",
                  border: `1.5px solid ${proyeccion.alternativaRecomendada === "RENDIMIENTO" ? "#86efac" : "#bfdbfe"}`,
                  padding: "14px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "16px" }}>🏆</span>
                  <strong style={{ fontSize: "13px", color: proyeccion.alternativaRecomendada === "RENDIMIENTO" ? "#166534" : "#1e40af" }}>
                    Opción Más Conveniente: {proyeccion.alternativaRecomendada === "RENDIMIENTO" ? "A Rendimiento" : "Por Kilo Vivo"}
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: "#334155", lineHeight: "1.4" }}>
                  Deja un margen adicional de{" "}
                  <strong style={{ color: "#166534" }}>
                    +${proyeccion.diferenciaMargenFavorRecomendadaArs.toLocaleString("es-AR")}
                  </strong>{" "}
                  a favor del lote total frente a la otra alternativa comercial.
                </p>
              </div>

              {/* Selector de Método Elegido */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", display: "block", marginBottom: "6px" }}>
                  Método Comercial Elegido:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setMetodoElegidoManual("KILO_VIVO")}
                    style={{
                      padding: "8px 6px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: metodoFinal === "KILO_VIVO" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      backgroundColor: metodoFinal === "KILO_VIVO" ? "#eff6ff" : "#ffffff",
                      color: metodoFinal === "KILO_VIVO" ? "#1d4ed8" : "#64748b",
                    }}
                  >
                    Kilo Vivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoElegidoManual("RENDIMIENTO")}
                    style={{
                      padding: "8px 6px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: metodoFinal === "RENDIMIENTO" ? "2px solid #16a34a" : "1px solid #cbd5e1",
                      backgroundColor: metodoFinal === "RENDIMIENTO" ? "#f0fdf4" : "#ffffff",
                      color: metodoFinal === "RENDIMIENTO" ? "#15803d" : "#64748b",
                    }}
                  >
                    Rendimiento
                  </button>
                </div>
              </div>

              {/* Resumen Consolidado de la Decisión */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Ingreso Estimado:</span>
                  <strong style={{ color: "#15803d", fontSize: "13px" }}>
                    ${altSeleccionada.ingresoBrutoEstimadoArs.toLocaleString("es-AR")}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Costo Total del Lote:</span>
                  <span>${altSeleccionada.costoTotalConsideradoArs.toLocaleString("es-AR")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "6px" }}>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>Margen Operativo:</span>
                  <strong style={{ color: altSeleccionada.margenOperativoEstimadoArs >= 0 ? "#166534" : "#dc2626", fontSize: "14px" }}>
                    ${altSeleccionada.margenOperativoEstimadoArs.toLocaleString("es-AR")}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Margen por Animal:</span>
                  <strong>${altSeleccionada.margenPorAnimalArs.toLocaleString("es-AR")} / cab.</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Rentabilidad s/ Venta:</span>
                  <strong>{altSeleccionada.margenSobreVentasPct}%</strong>
                </div>
              </div>
            </div>

            {/* Acciones Finales */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={() => ejecutarGuardado("TEMPORAL")}
                style={{
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "8px",
                  fontWeight: 800,
                  fontSize: "13.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 6px -1px rgba(22, 163, 74, 0.3)",
                }}
              >
                <span>💾</span> Guardar como Venta Temporal
              </button>

              <button
                type="button"
                onClick={() => ejecutarGuardado("PROYECCION")}
                style={{
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <span>📝</span> Guardar Solo Proyección (Borrador)
              </button>

              <button
                type="button"
                className="ghostButton"
                onClick={onClose}
                style={{ padding: "8px", fontSize: "12px" }}
              >
                Cancelar y Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
