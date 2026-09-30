"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ComprobanteGasto,
  LineaImputacion,
  DestinoEconomicoId,
  TipoEconomicoEgreso,
  TipoMovimientoId,
  UNIDADES_ECONOMICAS_HJB,
  TIPOS_EGRESO_INFO,
  CENTROS_COSTO_DEFAULT,
  RUBROS_DEFAULT,
  PROVEEDORES_DEFAULT,
  TIPOS_COMPROBANTE_AFIP,
  getProveedores,
  getCentrosCosto,
  validarImputacionComprobante,
  recalcularLineasImputacion,
  verificarComprobanteDuplicado,
  guardarComprobante,
  REGLAS_DISTRIBUCION_DEFAULT,
} from "@/lib/administracionData";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  comprobanteParaEditar?: ComprobanteGasto | null;
  onGuardadoExitoso: (comp: ComprobanteGasto) => void;
}

export default function ModalComprobante({
  isOpen,
  onClose,
  comprobanteParaEditar,
  onGuardadoExitoso,
}: Props) {
  const proveedores = useMemo(() => getProveedores(), []);
  const centrosCosto = useMemo(() => getCentrosCosto(), []);

  // Formulario General
  const [fechaComprobante, setFechaComprobante] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [fechaContabilizacion, setFechaContabilizacion] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [tipoComprobante, setTipoComprobante] = useState("Factura A");
  const [letra, setLetra] = useState<"A" | "B" | "C" | "M" | "X">("A");
  const [puntoVenta, setPuntoVenta] = useState("0001");
  const [numeroComprobante, setNumeroComprobante] = useState("");
  const [proveedorId, setProveedorId] = useState(proveedores[0]?.id || "");
  const [descripcion, setDescripcion] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Moneda e Impuestos
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [tipoCambio, setTipoCambio] = useState<number>(1);
  const [netoGravado, setNetoGravado] = useState<number>(0);
  const [netoNoGravado, setNetoNoGravado] = useState<number>(0);
  const [alicuotaIva, setAlicuotaIva] = useState<number>(21);
  const [ivaCalculado, setIvaCalculado] = useState<number>(0);
  const [percepcionesIibb, setPercepcionesIibb] = useState<number>(0);
  const [percepcionesIva, setPercepcionesIva] = useState<number>(0);
  const [retenciones, setRetenciones] = useState<number>(0);
  const [otrosImpuestos, setOtrosImpuestos] = useState<number>(0);
  const [totalComprobante, setTotalComprobante] = useState<number>(0);

  // Clasificación Económica
  const [tipoEgreso, setTipoEgreso] = useState<TipoEconomicoEgreso>("GASTO_OPERATIVO");
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimientoId>("COMPRA_INSUMO");
  const [rubroId, setRubroId] = useState<string>(RUBROS_DEFAULT[0]?.id || "");
  const [concepto, setConcepto] = useState<string>(RUBROS_DEFAULT[0]?.conceptos[0] || "");
  const [campana, setCampana] = useState<string>("2026/27");

  // CAPEX
  const [vidaUtilAnos, setVidaUtilAnos] = useState<number>(10);
  const [categoriaActivo, setCategoriaActivo] = useState<any>("Implemento");

  // Imputaciones
  const [lineas, setLineas] = useState<LineaImputacion[]>([]);
  const [errorDuplicado, setErrorDuplicado] = useState<string | null>(null);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  // Cargar datos al abrir o editar
  useEffect(() => {
    if (comprobanteParaEditar) {
      setFechaComprobante(comprobanteParaEditar.fechaComprobante);
      setFechaContabilizacion(comprobanteParaEditar.fechaContabilizacion);
      setTipoComprobante(comprobanteParaEditar.tipoComprobante);
      setLetra(comprobanteParaEditar.letra);
      setPuntoVenta(comprobanteParaEditar.puntoVenta);
      setNumeroComprobante(comprobanteParaEditar.numeroComprobante);
      setProveedorId(comprobanteParaEditar.proveedorId);
      setDescripcion(comprobanteParaEditar.descripcion);
      setObservaciones(comprobanteParaEditar.observaciones || "");
      setMoneda(comprobanteParaEditar.moneda);
      setTipoCambio(comprobanteParaEditar.tipoCambio || 1);
      setNetoGravado(comprobanteParaEditar.netoGravado);
      setNetoNoGravado(comprobanteParaEditar.netoNoGravado);
      setIvaCalculado(comprobanteParaEditar.ivaTotal);
      setPercepcionesIibb(comprobanteParaEditar.percepcionesIibb || 0);
      setPercepcionesIva(comprobanteParaEditar.percepcionesIva || 0);
      setRetenciones(comprobanteParaEditar.retenciones || 0);
      setOtrosImpuestos(comprobanteParaEditar.otrosImpuestos || 0);
      setTotalComprobante(comprobanteParaEditar.totalComprobante);
      setTipoEgreso(comprobanteParaEditar.tipoEgreso);
      setTipoMovimiento(comprobanteParaEditar.tipoMovimiento);
      setRubroId(comprobanteParaEditar.rubroId);
      setConcepto(comprobanteParaEditar.concepto);
      setCampana(comprobanteParaEditar.campana || "2026/27");
      setLineas(comprobanteParaEditar.imputaciones || []);
      if (comprobanteParaEditar.datosCapex) {
        setVidaUtilAnos(comprobanteParaEditar.datosCapex.vidaUtilAnos || 10);
        setCategoriaActivo(comprobanteParaEditar.datosCapex.categoriaActivo || "Implemento");
      }
    } else {
      // Nuevo comprobante
      const hoy = new Date().toISOString().slice(0, 10);
      setFechaComprobante(hoy);
      setFechaContabilizacion(hoy);
      setTipoComprobante("Factura A");
      setLetra("A");
      setPuntoVenta("0001");
      setNumeroComprobante("");
      setProveedorId(proveedores[0]?.id || "");
      setDescripcion("");
      setObservaciones("");
      setNetoGravado(0);
      setNetoNoGravado(0);
      setAlicuotaIva(21);
      setIvaCalculado(0);
      setPercepcionesIibb(0);
      setPercepcionesIva(0);
      setRetenciones(0);
      setOtrosImpuestos(0);
      setTotalComprobante(0);
      setTipoEgreso("GASTO_OPERATIVO");
      setTipoMovimiento("COMPRA_INSUMO");
      setRubroId(RUBROS_DEFAULT[0]?.id || "");
      setConcepto(RUBROS_DEFAULT[0]?.conceptos[0] || "");
      setCampana("2026/27");
      // Línea inicial 100% sin imputar todavía
      setLineas([
        {
          id: `imp-${Date.now()}-1`,
          destino: "10-LECHE",
          centroCostoId: "cc-leche-tambo",
          actividad: "Operación Tambo General",
          establecimientoCampo: "Tambo",
          campanaPeriodo: "2026/27",
          porcentaje: 100,
          importeCalculado: 0,
          observacion: "",
        },
      ]);
    }
    setErrorDuplicado(null);
    setErrorValidacion(null);
  }, [comprobanteParaEditar, isOpen, proveedores]);

  // Recálculo automático de IVA y Total
  function handleActualizarValores(neto: number, alicIva: number, noGrav: number, pIibb: number, pIva: number, ret: number, otros: number) {
    const iva = Math.round(neto * (alicIva / 100));
    const total = Math.max(0, Math.round(neto + noGrav + iva + pIibb + pIva - ret + otros));
    setNetoGravado(neto);
    setIvaCalculado(iva);
    setNetoNoGravado(noGrav);
    setPercepcionesIibb(pIibb);
    setPercepcionesIva(pIva);
    setRetenciones(ret);
    setOtrosImpuestos(otros);
    setTotalComprobante(total);

    // Ajustar importes en líneas
    setLineas((prev) => recalcularLineasImputacion(total, prev));
  }

  // Selección de tipo comprobante AFIP actualiza letra
  function handleCambioTipoComprobante(tipoNom: string) {
    setTipoComprobante(tipoNom);
    const afip = TIPOS_COMPROBANTE_AFIP.find((t) => t.nombre === tipoNom);
    if (afip) {
      setLetra(afip.letra);
      if (!afip.discriminaIva) {
        setAlicuotaIva(0);
        handleActualizarValores(netoGravado, 0, netoNoGravado, percepcionesIibb, percepcionesIva, retenciones, otrosImpuestos);
      }
    }
  }

  // Cambio de rubro actualiza conceptos disponibles
  const conceptosDelRubro = useMemo(() => {
    const r = RUBROS_DEFAULT.find((x) => x.id === rubroId);
    return r ? r.conceptos : [];
  }, [rubroId]);

  function handleCambioRubro(rId: string) {
    setRubroId(rId);
    const r = RUBROS_DEFAULT.find((x) => x.id === rId);
    if (r && r.conceptos.length > 0) {
      setConcepto(r.conceptos[0]);
      setTipoEgreso(r.tipoEgresoDefault);
    }
  }

  // Manipulación de Líneas de Imputación
  function handleAgregarLinea() {
    const sumaActual = lineas.reduce((acc, l) => acc + (Number(l.porcentaje) || 0), 0);
    const restante = Math.max(0, 100 - sumaActual);
    const nueva: LineaImputacion = {
      id: `imp-${Date.now()}-${lineas.length + 1}`,
      destino: "20-CEREALES",
      centroCostoId: "cc-agri-aguilera",
      actividad: "Agricultura Comercial",
      establecimientoCampo: "Aguilera",
      campanaPeriodo: campana,
      porcentaje: restante,
      importeCalculado: Math.round(totalComprobante * (restante / 100)),
      observacion: "",
    };
    const actualizadas = recalcularLineasImputacion(totalComprobante, [...lineas, nueva]);
    setLineas(actualizadas);
  }

  function handleEliminarLinea(id: string) {
    if (lineas.length <= 1) return;
    const filtradas = lineas.filter((l) => l.id !== id);
    setLineas(recalcularLineasImputacion(totalComprobante, filtradas));
  }

  function handleCambioPorcentajeLinea(id: string, nuevoPct: number) {
    const actualizadas = lineas.map((l) => (l.id === id ? { ...l, porcentaje: nuevoPct } : l));
    setLineas(recalcularLineasImputacion(totalComprobante, actualizadas));
  }

  function handleCambioDestinoLinea(id: string, nuevoDestino: DestinoEconomicoId) {
    // Filtrar primer centro de costo coherente con la unidad
    const cc = centrosCosto.find((c) => c.unidadId === nuevoDestino);
    const actualizadas = lineas.map((l) =>
      l.id === id
        ? {
            ...l,
            destino: nuevoDestino,
            centroCostoId: cc ? cc.id : l.centroCostoId,
            actividad: UNIDADES_ECONOMICAS_HJB[nuevoDestino]?.nombreCorto || "",
          }
        : l
    );
    setLineas(actualizadas);
  }

  function handleAplicarRegla(reglaId: string) {
    const regla = REGLAS_DISTRIBUCION_DEFAULT.find((r) => r.id === reglaId);
    if (!regla) return;
    const nuevasLineas: LineaImputacion[] = regla.distribucion.map((d, idx) => ({
      id: `imp-r-${Date.now()}-${idx}`,
      destino: d.destino,
      centroCostoId: d.centroCostoIdDefault || "",
      actividad: d.actividadDefault || UNIDADES_ECONOMICAS_HJB[d.destino]?.nombreCorto || "",
      campanaPeriodo: campana,
      porcentaje: d.porcentaje,
      importeCalculado: Math.round(totalComprobante * (d.porcentaje / 100)),
      observacion: `Preset aplicado: ${regla.nombre}`,
    }));
    setLineas(recalcularLineasImputacion(totalComprobante, nuevasLineas));
  }

  // Validación en tiempo real
  const validacion = useMemo(() => {
    return validarImputacionComprobante(totalComprobante, lineas);
  }, [totalComprobante, lineas]);

  // Chequeo de duplicado preventivo
  useEffect(() => {
    const prov = proveedores.find((p) => p.id === proveedorId);
    if (prov && numeroComprobante.trim().length >= 4) {
      const dup = verificarComprobanteDuplicado(
        {
          proveedorCuit: prov.cuit,
          tipoComprobante,
          letra,
          puntoVenta,
          numeroComprobante,
        },
        comprobanteParaEditar?.id
      );
      if (dup) {
        setErrorDuplicado(
          `⚠️ Atención: Ya existe un comprobante registrado con este número para ${dup.proveedorRazonSocial}: ${dup.tipoComprobante} ${dup.letra} ${dup.puntoVenta}-${dup.numeroComprobante} por $${dup.totalComprobante.toLocaleString("es-AR")}.`
        );
      } else {
        setErrorDuplicado(null);
      }
    } else {
      setErrorDuplicado(null);
    }
  }, [proveedorId, tipoComprobante, letra, puntoVenta, numeroComprobante, proveedores, comprobanteParaEditar]);

  // Guardado (Borrador vs Confirmado)
  function handleGuardar(confirmar: boolean) {
    if (!numeroComprobante.trim()) {
      setErrorValidacion("Debe ingresar el número del comprobante.");
      return;
    }
    const prov = proveedores.find((p) => p.id === proveedorId);
    if (!prov) {
      setErrorValidacion("Debe seleccionar un proveedor válido.");
      return;
    }

    if (confirmar && !validacion.esValidoParaConfirmar) {
      setErrorValidacion(validacion.errores.join(" "));
      return;
    }

    const rubroSel = RUBROS_DEFAULT.find((r) => r.id === rubroId);
    const rubroNombre = rubroSel?.nombre || "General";

    const compData = {
      id: comprobanteParaEditar?.id,
      fechaComprobante,
      fechaContabilizacion,
      tipoComprobante,
      letra,
      puntoVenta: puntoVenta.padStart(4, "0"),
      numeroComprobante: numeroComprobante.padStart(8, "0"),
      proveedorId: prov.id,
      proveedorRazonSocial: prov.razonSocial,
      proveedorCuit: prov.cuit,
      descripcion: descripcion || `${concepto} (${rubroNombre})`,
      observaciones,
      moneda,
      tipoCambio,
      netoGravado,
      netoNoGravado,
      iva21: alicuotaIva === 21 ? ivaCalculado : 0,
      iva105: alicuotaIva === 10.5 ? ivaCalculado : 0,
      iva27: alicuotaIva === 27 ? ivaCalculado : 0,
      ivaTotal: ivaCalculado,
      percepcionesIibb,
      percepcionesIva,
      percepcionesGanancias: 0,
      retenciones,
      otrosImpuestos,
      totalComprobante,
      totalConvertidoArs: moneda === "USD" ? Math.round(totalComprobante * tipoCambio) : totalComprobante,
      tipoMovimiento,
      tipoEgreso,
      rubroId,
      rubroNombre,
      concepto,
      campana,
      imputaciones: lineas,
      porcentajeImputadoTotal: validacion.porcentajeTotal,
      importeImputadoTotal: validacion.importeTotalImputado,
      diferenciaPendienteImporte: Math.max(0, totalComprobante - validacion.importeTotalImputado),
      estadoImputacion: (confirmar ? "CONFIRMADO" : validacion.porcentajeTotal === 100 ? "IMPUTADO_100" : "IMPUTACION_PARCIAL") as any,
      usuarioCreador: comprobanteParaEditar?.usuarioCreador || "Operador HJB",
      datosCapex:
        tipoEgreso === "INVERSION_CAPEX"
          ? {
              descripcionActivo: descripcion || concepto,
              categoriaActivo,
              vidaUtilAnos,
              metodoAmortizacion: "LINEAL_ANUAL" as const,
              valorResidualEstimadoPct: 10,
              fechaPuestaEnMarcha: fechaComprobante,
              unidadesUsuarias: Array.from(new Set(lineas.map((l) => l.destino))),
              criterioDistribucionAmortizacion: "Distribución según líneas de imputación porcentual.",
            }
          : undefined,
    };

    const res = guardarComprobante(compData, "Operador HJB", confirmar);
    if (res.error) {
      setErrorValidacion(res.error);
      return;
    }

    onGuardadoExitoso(res.comprobante);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="modalBackdrop" style={{ zIndex: 1200 }}>
      <div
        className="modalCard"
        style={{
          maxWidth: "960px",
          width: "95vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Encabezado */}
        <div
          style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg, #0f172a, #1e293b)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800 }}>
              {comprobanteParaEditar ? "✏️ Editar Comprobante" : "📑 Nuevo Comprobante de Compra / Gasto"}
            </h3>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              Imputación económica estricta (Control 100% · CREA Agropecuario)
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Alerta de duplicado */}
        {errorDuplicado && (
          <div style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a", color: "#b45309", padding: "10px 20px", fontSize: "12px", fontWeight: 600 }}>
            {errorDuplicado}
          </div>
        )}

        {/* Alerta de error de validación */}
        {errorValidacion && (
          <div style={{ background: "#fef2f2", borderBottom: "1px solid #fecaca", color: "#dc2626", padding: "10px 20px", fontSize: "12px", fontWeight: 600 }}>
            {errorValidacion}
          </div>
        )}

        {/* Cuerpo con Scroll */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* SECCIÓN 1: IDENTIFICACIÓN DEL COMPROBANTE (AFIP) */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid var(--line)" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--slate-700)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "12px" }}>
              1. Identificación del Comprobante Fiscal & Proveedor
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Tipo de Comprobante:</label>
                <select
                  value={tipoComprobante}
                  onChange={(e) => handleCambioTipoComprobante(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", background: "white", fontSize: "13px" }}
                >
                  {TIPOS_COMPROBANTE_AFIP.map((t) => (
                    <option key={t.codigo} value={t.nombre}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Punto de Venta (4 dígitos):</label>
                <input
                  type="text"
                  maxLength={5}
                  value={puntoVenta}
                  onChange={(e) => setPuntoVenta(e.target.value.replace(/\D/g, ""))}
                  placeholder="0001"
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Número Comprobante (8 dígitos):</label>
                <input
                  type="text"
                  maxLength={8}
                  value={numeroComprobante}
                  onChange={(e) => setNumeroComprobante(e.target.value.replace(/\D/g, ""))}
                  placeholder="00012345"
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Fecha Comprobante:</label>
                <input
                  type="date"
                  value={fechaComprobante}
                  onChange={(e) => setFechaComprobante(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Fecha Contabilización:</label>
                <input
                  type="date"
                  value={fechaContabilizacion}
                  onChange={(e) => setFechaContabilizacion(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px", marginTop: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Proveedor:</label>
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", background: "white", fontSize: "13px" }}
                >
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.razonSocial} (CUIT: {p.cuit}) — {p.rubroPrincipal}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Campaña Agropecuaria:</label>
                <select
                  value={campana}
                  onChange={(e) => setCampana(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", background: "white", fontSize: "13px" }}
                >
                  <option value="2026/27">Campaña 2026/27</option>
                  <option value="2025/26">Campaña 2025/26</option>
                  <option value="2024/25">Campaña 2024/25</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: "12px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Descripción / Detalle del Comprobante:</label>
              <input
                type="text"
                placeholder="Ej: Compra de fertilizante MAP granulado y semilla maíz..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
              />
            </div>
          </div>

          {/* SECCIÓN 2: CLASIFICACIÓN ECONÓMICA & TIPO DE EGRESO */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid var(--line)" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--slate-700)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "12px" }}>
              2. Clasificación Económica (CREA Agropecuario)
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Tipo Económico del Egreso:</label>
                <select
                  value={tipoEgreso}
                  onChange={(e) => setTipoEgreso(e.target.value as TipoEconomicoEgreso)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "6px",
                    border: `2px solid ${TIPOS_EGRESO_INFO[tipoEgreso].badgeColor}`,
                    background: "white",
                    fontWeight: 700,
                    fontSize: "13px",
                  }}
                >
                  <option value="GASTO_OPERATIVO">Gasto Operativo (OPEX)</option>
                  <option value="INVERSION_CAPEX">Inversión / Bien de Uso (CAPEX)</option>
                  <option value="EXTRAORDINARIO">Gasto Extraordinario</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Rubro Principal:</label>
                <select
                  value={rubroId}
                  onChange={(e) => handleCambioRubro(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", background: "white", fontSize: "13px" }}
                >
                  {RUBROS_DEFAULT.map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Concepto Específico:</label>
                <select
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", background: "white", fontSize: "13px" }}
                >
                  {conceptosDelRubro.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Tipo de Movimiento:</label>
                <select
                  value={tipoMovimiento}
                  onChange={(e) => setTipoMovimiento(e.target.value as TipoMovimientoId)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", background: "white", fontSize: "13px" }}
                >
                  <option value="COMPRA_INSUMO">Compra de Insumos</option>
                  <option value="SERVICIO_CONTRATADO">Servicio de Contratista / Labores</option>
                  <option value="COMBUSTIBLE_LUBRICANTE">Combustibles & Lubricantes</option>
                  <option value="MANTENIMIENTO_REPARACION">Mantenimiento & Repuestos</option>
                  <option value="HONORARIO_PROFESIONAL">Honorarios Profesionales</option>
                  <option value="PERSONAL_CARGAS">Personal & Cargas Sociales</option>
                  <option value="INVERSION_ACTIVO_FIJO">Inversión Activo Fijo</option>
                  <option value="IMPUESTO_TASA">Impuesto o Tasa Comunal</option>
                  <option value="GASTO_GENERAL">Gasto General</option>
                </select>
              </div>
            </div>

            {/* Panel Condicional CAPEX */}
            {tipoEgreso === "INVERSION_CAPEX" && (
              <div style={{ marginTop: "14px", padding: "12px", background: "#fef3c7", borderRadius: "6px", border: "1px solid #fde68a" }}>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "#92400e", display: "block", marginBottom: "6px" }}>
                  🚜 Parámetros del Activo Fijo (Inversión Pluri-anual amortizable):
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", fontSize: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 600 }}>Categoría Activo:</label>
                    <select
                      value={categoriaActivo}
                      onChange={(e) => setCategoriaActivo(e.target.value)}
                      style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                    >
                      <option value="Tractor">Tractor</option>
                      <option value="Implemento">Implemento Agrícola / Efluentes</option>
                      <option value="Equipo Tambo">Equipo Tambo</option>
                      <option value="Instalación">Instalación / Aguada</option>
                      <option value="Rodado">Rodado / Acoplado</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600 }}>Vida Útil Estimada:</label>
                    <input
                      type="number"
                      value={vidaUtilAnos}
                      onChange={(e) => setVidaUtilAnos(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                    />
                    <span style={{ fontSize: "10px", color: "#78350f" }}>Años de amortización lineal</span>
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600 }}>Impacto Económico:</label>
                    <div style={{ fontSize: "11px", color: "#92400e", marginTop: "6px" }}>
                      ✓ <strong>No se computa 100% como gasto operativo corriente</strong>. Se amortiza anualmente.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: DESGLOSE IMPOSITIVO Y VALORES */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid var(--line)" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--slate-700)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "12px" }}>
              3. Desglose Impositivo & Importes ($ ARS)
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Neto Gravado ($):</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={netoGravado || ""}
                  onChange={(e) => handleActualizarValores(parseFloat(e.target.value) || 0, alicuotaIva, netoNoGravado, percepcionesIibb, percepcionesIva, retenciones, otrosImpuestos)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px", fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Alícuota IVA:</label>
                <select
                  value={alicuotaIva}
                  onChange={(e) => handleActualizarValores(netoGravado, parseFloat(e.target.value) || 0, netoNoGravado, percepcionesIibb, percepcionesIva, retenciones, otrosImpuestos)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", background: "white", fontSize: "13px" }}
                >
                  <option value={21}>21.0% (General)</option>
                  <option value={10.5}>10.5% (Bienes Capital / Alimentos / Semillas)</option>
                  <option value={27}>27.0% (Energía / Telecomunicaciones)</option>
                  <option value={0}>0.0% (Exento / No Gravado)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>IVA Calculado ($):</label>
                <input
                  type="number"
                  disabled
                  value={ivaCalculado}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f1f5f9", fontSize: "13px", fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Neto No Gravado ($):</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={netoNoGravado || ""}
                  onChange={(e) => handleActualizarValores(netoGravado, alicuotaIva, parseFloat(e.target.value) || 0, percepcionesIibb, percepcionesIva, retenciones, otrosImpuestos)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Percep. IIBB ($):</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={percepcionesIibb || ""}
                  onChange={(e) => handleActualizarValores(netoGravado, alicuotaIva, netoNoGravado, parseFloat(e.target.value) || 0, percepcionesIva, retenciones, otrosImpuestos)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Percep. IVA ($):</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={percepcionesIva || ""}
                  onChange={(e) => handleActualizarValores(netoGravado, alicuotaIva, netoNoGravado, percepcionesIibb, parseFloat(e.target.value) || 0, retenciones, otrosImpuestos)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Otros Impuestos ($):</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={otrosImpuestos || ""}
                  onChange={(e) => handleActualizarValores(netoGravado, alicuotaIva, netoNoGravado, percepcionesIibb, percepcionesIva, retenciones, parseFloat(e.target.value) || 0)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
                />
              </div>

              <div style={{ background: "#e0f2fe", padding: "8px", borderRadius: "6px", border: "1px solid #7dd3fc" }}>
                <label style={{ fontSize: "11px", fontWeight: 800, color: "#0369a1", display: "block", marginBottom: "4px" }}>Total a Imputar ($):</label>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#0369a1" }}>
                  ${totalComprobante.toLocaleString("es-AR")}
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: MOTOR DE IMPUTACIÓN ECONÓMICA OBLIGATORIA (100%) */}
          <div style={{ background: "white", padding: "18px", borderRadius: "8px", border: "2px solid #cbd5e1", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <span style={{ fontSize: "13px", fontWeight: 900, color: "var(--slate-800)", textTransform: "uppercase" }}>
                  4. Imputación por Unidad de Negocio & Centro de Costo
                </span>
                <span style={{ fontSize: "11px", color: "var(--slate-500)", display: "block" }}>
                  Regla de control interno: La sumatoria de imputaciones debe ser exactamente el 100%.
                </span>
              </div>

              {/* Presets y acciones de imputación */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAplicarRegla(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #86efac",
                    color: "#166534",
                    fontSize: "12px",
                    fontWeight: 800,
                    padding: "6px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  <option value="" disabled>⚡ Aplicar Preset de Costo Compartido...</option>
                  {REGLAS_DISTRIBUCION_DEFAULT.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAgregarLinea}
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    color: "#1d4ed8",
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  ➕ Agregar Línea
                </button>
              </div>
            </div>

            {/* Barra de progreso de imputación */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                <span>
                  Estado Imputación:{" "}
                  {validacion.porcentajeTotal === 100 ? (
                    <strong style={{ color: "#16a34a" }}>✓ 100% Imputado</strong>
                  ) : validacion.porcentajeTotal < 100 ? (
                    <strong style={{ color: "#d97706" }}>⚠️ Falta {validacion.porcentajeFaltante}%</strong>
                  ) : (
                    <strong style={{ color: "#dc2626" }}>❌ Excedido en {validacion.porcentajeExcedente}%</strong>
                  )}
                </span>
                <span>
                  ${validacion.importeTotalImputado.toLocaleString("es-AR")} de ${totalComprobante.toLocaleString("es-AR")} ({validacion.porcentajeTotal}%)
                </span>
              </div>

              {/* Barra interactiva */}
              <div style={{ height: "10px", background: "#e2e8f0", borderRadius: "5px", overflow: "hidden", display: "flex" }}>
                <div
                  style={{
                    width: `${Math.min(100, validacion.porcentajeTotal)}%`,
                    background:
                      validacion.porcentajeTotal === 100
                        ? "#16a34a"
                        : validacion.porcentajeTotal < 100
                        ? "#f59e0b"
                        : "#dc2626",
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
            </div>

            {/* Tabla de Líneas */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {lineas.map((linea, index) => {
                const unidadInfo = UNIDADES_ECONOMICAS_HJB[linea.destino];
                const ccsDeEstaUnidad = centrosCosto.filter(
                  (c) => c.unidadId === linea.destino
                );

                return (
                  <div
                    key={linea.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1.5fr 1.2fr 80px 120px 40px",
                      gap: "10px",
                      alignItems: "center",
                      background: "#f8fafc",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      borderLeft: `4px solid ${unidadInfo?.color || "#cbd5e1"}`,
                      borderTop: "1px solid var(--line)",
                      borderRight: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    {/* Unidad / Destino */}
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--slate-500)", display: "block" }}>
                        Destino #{index + 1}:
                      </label>
                      <select
                        value={linea.destino}
                        onChange={(e) => handleCambioDestinoLinea(linea.id, e.target.value as DestinoEconomicoId)}
                        style={{
                          width: "100%",
                          padding: "6px",
                          borderRadius: "4px",
                          border: "1px solid var(--line)",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: unidadInfo?.color,
                        }}
                      >
                        <option value="10-LECHE">10 — HJB Leche</option>
                        <option value="20-CEREALES">20 — HJB Cereales</option>
                        <option value="30-CARNE">30 — HJB Carne</option>
                        <option value="ADMINISTRACION">Administración (Transversal)</option>
                        <option value="PARTICULAR">Particular (Aislado HJB)</option>
                      </select>
                    </div>

                    {/* Centro de Costo */}
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--slate-500)", display: "block" }}>
                        Centro de Costo:
                      </label>
                      <select
                        value={linea.centroCostoId}
                        onChange={(e) => {
                          const act = lineas.map((l) => (l.id === linea.id ? { ...l, centroCostoId: e.target.value } : l));
                          setLineas(act);
                        }}
                        style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid var(--line)", fontSize: "12px" }}
                      >
                        {ccsDeEstaUnidad.map((c) => (
                          <option key={c.id} value={c.id}>{c.codigo} {c.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Campo / Lote / Actividad */}
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--slate-500)", display: "block" }}>
                        Campo / Actividad:
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Aguilera / Lote 3"
                        value={linea.actividad}
                        onChange={(e) => {
                          const act = lineas.map((l) => (l.id === linea.id ? { ...l, actividad: e.target.value } : l));
                          setLineas(act);
                        }}
                        style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid var(--line)", fontSize: "12px" }}
                      />
                    </div>

                    {/* Porcentaje */}
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--slate-500)", display: "block" }}>
                        % Asignado:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={linea.porcentaje}
                        onChange={(e) => handleCambioPorcentajeLinea(linea.id, parseFloat(e.target.value) || 0)}
                        style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid var(--line)", fontWeight: 800, fontSize: "12px" }}
                      />
                    </div>

                    {/* Importe Calculado */}
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--slate-500)", display: "block" }}>
                        Importe ($):
                      </label>
                      <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--slate-900)" }}>
                        ${linea.importeCalculado.toLocaleString("es-AR")}
                      </div>
                    </div>

                    {/* Eliminar */}
                    <div style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => handleEliminarLinea(linea.id)}
                        disabled={lineas.length <= 1}
                        title="Eliminar línea"
                        style={{
                          background: "none",
                          border: "none",
                          color: lineas.length <= 1 ? "#cbd5e1" : "#ef4444",
                          cursor: lineas.length <= 1 ? "not-allowed" : "pointer",
                          fontSize: "16px",
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer con Acciones */}
        <div
          style={{
            padding: "16px 20px",
            background: "#f8fafc",
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--slate-600)" }}>
            {validacion.porcentajeTotal === 100 ? (
              <span style={{ color: "#16a34a", fontWeight: 700 }}>✓ Listo para confirmar definitivamente.</span>
            ) : (
              <span style={{ color: "#b45309" }}>⚠️ Puede guardarse como borrador. Requiere 100% para confirmación final.</span>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                background: "white",
                color: "var(--slate-700)",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Cancelar
            </button>

            {/* Guardar Borrador (Permite parciales) */}
            <button
              type="button"
              onClick={() => handleGuardar(false)}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#f1f5f9",
                color: "var(--slate-800)",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              💾 Guardar Borrador
            </button>

            {/* Confirmar 100% */}
            <button
              type="button"
              onClick={() => handleGuardar(true)}
              disabled={!validacion.esValidoParaConfirmar}
              style={{
                padding: "8px 18px",
                borderRadius: "6px",
                border: "none",
                background: validacion.esValidoParaConfirmar ? "#16a34a" : "#94a3b8",
                color: "white",
                fontWeight: 800,
                fontSize: "13px",
                cursor: validacion.esValidoParaConfirmar ? "pointer" : "not-allowed",
                boxShadow: validacion.esValidoParaConfirmar ? "0 2px 4px rgba(22,163,74,0.3)" : "none",
              }}
            >
              ✓ Confirmar Comprobante (100%)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
