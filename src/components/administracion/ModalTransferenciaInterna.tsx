"use client";

import { useState, useEffect } from "react";
import {
  TransferenciaInterna,
  DestinoEconomicoId,
  CriterioValuacionTransferencia,
  UNIDADES_ECONOMICAS_HJB,
  guardarTransferenciaInterna,
} from "@/lib/administracionData";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transferenciaParaEditar?: TransferenciaInterna | null;
  onGuardadoExitoso: (trans: TransferenciaInterna) => void;
}

const CRITERIOS_VALUACION: { id: CriterioValuacionTransferencia; nombre: string; descripcion: string }[] = [
  { id: "PRECIO_MERCADO", nombre: "Precio de Mercado (FAS Rosario / Pizarra)", descripcion: "Valuación según cotización pública transparente de granos o insumos." },
  { id: "COSTO_PRODUCCION", nombre: "Costo Directo de Producción", descripcion: "Valuación al costo de labores, insumos y combustible sin margen comercial." },
  { id: "VALOR_ACORDADO", nombre: "Valor de Plaza Acordado", descripcion: "Cotización pactada entre responsables técnicos según calidad y momento." },
  { id: "PRECIO_REFERENCIA", nombre: "Precio de Referencia CREA", descripcion: "Estándar de gestión agropecuaria utilizado para comparabilidad interanual." },
];

export default function ModalTransferenciaInterna({
  isOpen,
  onClose,
  transferenciaParaEditar,
  onGuardadoExitoso,
}: Props) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [campana, setCampana] = useState("2026/27");
  const [unidadCedenteId, setUnidadCedenteId] = useState<DestinoEconomicoId>("20-CEREALES");
  const [unidadReceptoraId, setUnidadReceptoraId] = useState<DestinoEconomicoId>("10-LECHE");
  const [concepto, setConcepto] = useState("");
  const [cantidad, setCantidad] = useState<number>(100);
  const [unidadMedida, setUnidadMedida] = useState<"Tn" | "Cabezas" | "Horas" | "Litros" | "Rollos" | "Hectáreas">("Tn");
  const [precioUnitario, setPrecioUnitario] = useState<number>(195000);
  const [criterioValuacion, setCriterioValuacion] = useState<CriterioValuacionTransferencia>("PRECIO_MERCADO");
  const [detalleCriterio, setDetalleCriterio] = useState("Pizarra Rosario disponible menos flete corto");
  const [establecimientoOrigen, setEstablecimientoOrigen] = useState("Campo Aguilera");
  const [establecimientoDestino, setEstablecimientoDestino] = useState("Tambo Central");
  const [observaciones, setObservaciones] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (transferenciaParaEditar) {
      setFecha(transferenciaParaEditar.fecha);
      setCampana(transferenciaParaEditar.campana);
      setUnidadCedenteId(transferenciaParaEditar.unidadCedenteId);
      setUnidadReceptoraId(transferenciaParaEditar.unidadReceptoraId);
      setConcepto(transferenciaParaEditar.concepto);
      setCantidad(transferenciaParaEditar.cantidad);
      setUnidadMedida(transferenciaParaEditar.unidadMedida as any);
      setPrecioUnitario(transferenciaParaEditar.precioUnitario);
      setCriterioValuacion(transferenciaParaEditar.criterioValuacion);
      setDetalleCriterio(transferenciaParaEditar.detalleCriterio || "");
      setEstablecimientoOrigen(transferenciaParaEditar.establecimientoOrigen || "");
      setEstablecimientoDestino(transferenciaParaEditar.establecimientoDestino || "");
      setObservaciones(transferenciaParaEditar.observaciones || "");
    } else {
      setFecha(new Date().toISOString().slice(0, 10));
      setCampana("2026/27");
      setUnidadCedenteId("20-CEREALES");
      setUnidadReceptoraId("10-LECHE");
      setConcepto("Maíz Grano Húmedo para mixer de vacas en ordeñe");
      setCantidad(100);
      setUnidadMedida("Tn");
      setPrecioUnitario(195000);
      setCriterioValuacion("PRECIO_MERCADO");
      setDetalleCriterio("Precio Pizarra Rosario disponible menos flete corto ($195.000/Tn)");
      setEstablecimientoOrigen("Campo Aguilera");
      setEstablecimientoDestino("Tambo Central");
      setObservaciones("");
    }
    setErrorMsg(null);
  }, [transferenciaParaEditar, isOpen]);

  if (!isOpen) return null;

  const importeTotal = Math.round((Number(cantidad) || 0) * (Number(precioUnitario) || 0));

  function handlePresetMaiz() {
    setUnidadCedenteId("20-CEREALES");
    setUnidadReceptoraId("10-LECHE");
    setConcepto("Maíz Grano Húmedo para mixer de vacas en ordeñe");
    setCantidad(120);
    setUnidadMedida("Tn");
    setPrecioUnitario(195000);
    setCriterioValuacion("PRECIO_MERCADO");
    setDetalleCriterio("Pizarra Rosario disponible menos flete corto ($195.000/Tn)");
    setEstablecimientoOrigen("Campo Aguilera");
    setEstablecimientoDestino("Tambo Central");
  }

  function handlePresetTerneros() {
    setUnidadCedenteId("10-LECHE");
    setUnidadReceptoraId("30-CARNE");
    setConcepto("Terneros Machos Holando de guachera (desleche 80 kg)");
    setCantidad(25);
    setUnidadMedida("Cabezas");
    setPrecioUnitario(220000);
    setCriterioValuacion("VALOR_ACORDADO");
    setDetalleCriterio("Valor de plaza consignatario local para ternero Holando 80kg");
    setEstablecimientoOrigen("Guachera Tambo");
    setEstablecimientoDestino("Corral de Recría RM1");
  }

  function handlePresetTractor() {
    setUnidadCedenteId("ADMINISTRACION");
    setUnidadReceptoraId("20-CEREALES");
    setConcepto("Servicio de distribución de purines y efluentes con tractor");
    setCantidad(40);
    setUnidadMedida("Horas");
    setPrecioUnitario(65000);
    setCriterioValuacion("COSTO_PRODUCCION");
    setDetalleCriterio("Costo operativo tractor Case Puma + desgaste tanque estercolero ($65.000/h)");
    setEstablecimientoOrigen("Parque de Maquinarias");
    setEstablecimientoDestino("Campo Aguilera");
  }

  function handleGuardar() {
    if (unidadCedenteId === unidadReceptoraId) {
      setErrorMsg("La unidad cedente y la receptora deben ser distintas.");
      return;
    }
    if (!concepto.trim()) {
      setErrorMsg("Debe ingresar el concepto de la transferencia.");
      return;
    }
    if (cantidad <= 0 || precioUnitario <= 0) {
      setErrorMsg("La cantidad y el precio unitario deben ser mayores a cero.");
      return;
    }

    const res = guardarTransferenciaInterna(
      {
        id: transferenciaParaEditar ? transferenciaParaEditar.id : undefined,
        fecha,
        campana,
        unidadCedenteId,
        unidadReceptoraId,
        concepto,
        cantidad,
        unidadMedida,
        precioUnitario,
        importeTotal,
        criterioValuacion,
        detalleCriterio,
        establecimientoOrigen,
        establecimientoDestino,
        observaciones,
        estado: "CONFIRMADA",
      },
      "Operador HJB"
    );

    if (res.error) {
      setErrorMsg(res.error);
      return;
    }

    onGuardadoExitoso(res.transferencia);
    onClose();
  }

  const cedenteInfo = UNIDADES_ECONOMICAS_HJB[unidadCedenteId];
  const receptoraInfo = UNIDADES_ECONOMICAS_HJB[unidadReceptoraId];

  return (
    <div className="modalBackdrop" style={{ zIndex: 1200 }}>
      <div
        className="modalCard"
        style={{
          maxWidth: "800px",
          width: "95vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Header */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>🔄</span>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 800, margin: 0 }}>
                {transferenciaParaEditar ? "Editar Transferencia Interna" : "Nueva Transferencia Interna entre Unidades"}
              </h2>
              <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                Metodología CREA: Precios de transferencia internos con eliminación automática en Consolidado HJB
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Error Banner */}
          {errorMsg && (
            <div style={{ background: "#fee2e2", border: "1px solid #ef4444", color: "#991b1b", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 700 }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Presets Rápidos */}
          <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--line)" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--slate-500)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
              ⚡ Carga Rápida con Presets Frecuentes de HJB:
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <button
                type="button"
                onClick={handlePresetMaiz}
                style={{
                  background: "white",
                  border: "1px solid #10b981",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#047857",
                  cursor: "pointer",
                }}
              >
                🌽 Maíz Cereales ➔ Leche Tambo (Pizarra Rosario)
              </button>
              <button
                type="button"
                onClick={handlePresetTerneros}
                style={{
                  background: "white",
                  border: "1px solid #ef4444",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#b91c1c",
                  cursor: "pointer",
                }}
              >
                🐂 Terneros Machos Leche ➔ Carne Feedlot (Consignatario)
              </button>
              <button
                type="button"
                onClick={handlePresetTractor}
                style={{
                  background: "white",
                  border: "1px solid #7c3aed",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#6d28d9",
                  cursor: "pointer",
                }}
              >
                🚜 Horas Tractor Efluentes ➔ Cereales (Costo Directo)
              </button>
            </div>
          </div>

          {/* Flujo Cedente ➔ Receptora */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "12px", alignItems: "center" }}>
            
            {/* Unidad Cedente */}
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: `2px solid ${cedenteInfo?.color || "#cbd5e1"}` }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase", marginBottom: "4px" }}>
                Unidad Cedente (Ingreso Interno +)
              </label>
              <select
                value={unidadCedenteId}
                onChange={(e) => setUnidadCedenteId(e.target.value as DestinoEconomicoId)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", fontWeight: 700, fontSize: "13px" }}
              >
                <option value="20-CEREALES">20 — HJB Cereales (Agricultura)</option>
                <option value="10-LECHE">10 — HJB Leche (Tambo)</option>
                <option value="30-CARNE">30 — HJB Carne (Feedlot)</option>
                <option value="ADMINISTRACION">00 — Administración & Maquinaria</option>
              </select>
              <span style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "4px", display: "block" }}>
                Registra la entrega física del recurso
              </span>
            </div>

            {/* Icono de Traspaso */}
            <div style={{ fontSize: "24px", color: "#64748b", textAlign: "center" }}>
              ➔
            </div>

            {/* Unidad Receptora */}
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: `2px solid ${receptoraInfo?.color || "#cbd5e1"}` }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase", marginBottom: "4px" }}>
                Unidad Receptora (Costo Interno -)
              </label>
              <select
                value={unidadReceptoraId}
                onChange={(e) => setUnidadReceptoraId(e.target.value as DestinoEconomicoId)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", fontWeight: 700, fontSize: "13px" }}
              >
                <option value="10-LECHE">10 — HJB Leche (Tambo)</option>
                <option value="20-CEREALES">20 — HJB Cereales (Agricultura)</option>
                <option value="30-CARNE">30 — HJB Carne (Feedlot)</option>
                <option value="ADMINISTRACION">00 — Administración & Maquinaria</option>
              </select>
              <span style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "4px", display: "block" }}>
                Recibe el costo para su proceso productivo
              </span>
            </div>
          </div>

          {/* Fecha y Campaña */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--slate-700)", marginBottom: "4px" }}>
                Fecha del Traspaso
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--slate-700)", marginBottom: "4px" }}>
                Campaña Agropecuaria
              </label>
              <select
                value={campana}
                onChange={(e) => setCampana(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
              >
                <option value="2026/27">Campaña 2026/27</option>
                <option value="2025/26">Campaña 2025/26</option>
                <option value="2027/28">Campaña 2027/28</option>
              </select>
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--slate-700)", marginBottom: "4px" }}>
              Concepto / Producto Transferido
            </label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: 120 Tn Maíz Grano Húmedo para TMR mixer vacas en ordeñe"
              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
            />
          </div>

          {/* Cantidad, Unidad de Medida, Precio Unitario y Total */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.5fr 1.5fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--slate-700)", marginBottom: "4px" }}>
                Cantidad
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={cantidad}
                onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px", fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--slate-700)", marginBottom: "4px" }}>
                Unidad
              </label>
              <select
                value={unidadMedida}
                onChange={(e) => setUnidadMedida(e.target.value as any)}
                style={{ width: "100%", padding: "7px 8px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px" }}
              >
                <option value="Tn">Tn (Toneladas)</option>
                <option value="Cabezas">Cabezas (Animales)</option>
                <option value="Horas">Horas (Tracción)</option>
                <option value="Litros">Litros</option>
                <option value="Rollos">Rollos</option>
                <option value="Hectáreas">Hectáreas</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--slate-700)", marginBottom: "4px" }}>
                Precio Unitario ($ ARS)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(parseFloat(e.target.value) || 0)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "13px", fontWeight: 700 }}
              />
            </div>
            <div style={{ background: "#f0fdf4", padding: "6px 10px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
              <span style={{ display: "block", fontSize: "10.5px", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>
                Importe Total ($ ARS)
              </span>
              <strong style={{ fontSize: "16px", color: "#15803d", display: "block", marginTop: "2px" }}>
                ${importeTotal.toLocaleString("es-AR")}
              </strong>
            </div>
          </div>

          {/* Criterio de Valuación */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--slate-700)", marginBottom: "4px" }}>
                Criterio de Valuación CREA
              </label>
              <select
                value={criterioValuacion}
                onChange={(e) => setCriterioValuacion(e.target.value as CriterioValuacionTransferencia)}
                style={{ width: "100%", padding: "7px 8px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12.5px" }}
              >
                {CRITERIOS_VALUACION.map((crit) => (
                  <option key={crit.id} value={crit.id}>
                    {crit.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--slate-700)", marginBottom: "4px" }}>
                Detalle / Origen del Precio de Transferencia
              </label>
              <input
                type="text"
                value={detalleCriterio}
                onChange={(e) => setDetalleCriterio(e.target.value)}
                placeholder="Ej: Pizarra Rosario disponible menos flete corto ($195.000/Tn)"
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12.5px" }}
              />
            </div>
          </div>

          {/* Establecimientos Origen y Destino */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--slate-700)", marginBottom: "4px" }}>
                Establecimiento / Campo Origen
              </label>
              <input
                type="text"
                value={establecimientoOrigen}
                onChange={(e) => setEstablecimientoOrigen(e.target.value)}
                placeholder="Ej: Campo Aguilera (Lote 3)"
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12.5px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--slate-700)", marginBottom: "4px" }}>
                Establecimiento / Corral Destino
              </label>
              <input
                type="text"
                value={establecimientoDestino}
                onChange={(e) => setEstablecimientoDestino(e.target.value)}
                placeholder="Ej: Tambo Central (Silo Tolva)"
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12.5px" }}
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--slate-700)", marginBottom: "4px" }}>
              Observaciones de Gestión
            </label>
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Transferencia para racionamiento mensual. Deduce compra de alimento externo."
              style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12.5px" }}
            />
          </div>

          {/* Nota Metodológica CREA */}
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px 14px", borderRadius: "8px", fontSize: "11.5px", color: "#1e40af" }}>
            ℹ️ <strong>Criterio Metodológico HJB:</strong> En el análisis de gestión por unidad, esta operación computa como un ingreso interno de <strong>${importeTotal.toLocaleString("es-AR")}</strong> para <strong>{cedenteInfo?.nombre}</strong> y como costo equivalente para <strong>{receptoraInfo?.nombre}</strong>. En la consolidación general de HJB se anulan mutuamente sin inflar artificialmente la facturación de la empresa.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            background: "#f8fafc",
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "white",
              border: "1px solid var(--line)",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            style={{
              padding: "8px 20px",
              background: "#2563eb",
              border: "none",
              color: "white",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
            }}
          >
            💾 Guardar Transferencia Interna
          </button>
        </div>
      </div>
    </div>
  );
}
