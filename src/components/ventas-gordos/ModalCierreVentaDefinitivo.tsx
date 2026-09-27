"use client";

import { useState, useMemo } from "react";
import {
  VentaGordoExpediente,
  cerrarVentaADefinitivo,
  calcularLiquidacionRealConDesvios,
} from "@/lib/ventasGordosData";

interface Props {
  isOpen: boolean;
  venta: VentaGordoExpediente;
  onClose: () => void;
  onVentaCerrada: (venta: VentaGordoExpediente) => void;
  usuarioActual: string;
}

export default function ModalCierreVentaDefinitivo({
  isOpen,
  venta,
  onClose,
  onVentaCerrada,
  usuarioActual,
}: Props) {
  // Datos Reales
  const [fechaReal, setFechaReal] = useState(() => venta.fechaReal || new Date().toISOString().slice(0, 10));
  const [fechaFaena, setFechaFaena] = useState(() => venta.liquidacionReal?.fechaFaena || new Date().toISOString().slice(0, 10));
  const [cantidadReal, setCantidadReal] = useState<number>(venta.cantidadReal || venta.cantidadEstimada);
  const [pesoCampoRealKg, setPesoCampoRealKg] = useState<number>(venta.pesoCampoRealKg || venta.pesoCampoEstimadoKg);
  const [pesoFrigorificoRealKg, setPesoFrigorificoRealKg] = useState<number>(
    venta.liquidacionReal?.pesoFrigorificoRealKg || Number((venta.pesoCampoEstimadoKg * 0.96).toFixed(1))
  );
  const [kgResReales, setKgResReales] = useState<number>(
    venta.liquidacionReal?.kgResReales || Number(((venta.pesoCampoEstimadoKg * 0.96) * 0.5582).toFixed(1))
  );

  const metodoRef = venta.metodoElegido || "RENDIMIENTO";
  const [precioRealKgResArs, setPrecioRealKgResArs] = useState<number>(
    venta.liquidacionReal?.precioRealKgResArs || venta.proyeccion.altRendimiento.precioKgResArs
  );
  const [precioRealKgVivoArs, setPrecioRealKgVivoArs] = useState<number>(
    venta.liquidacionReal?.precioRealKgVivoArs || venta.proyeccion.altKiloVivo.precioKgVivoArs
  );

  // Ingreso Bruto Real Liquidado
  const [ingresoBrutoRealArs, setIngresoBrutoRealArs] = useState<number>(() => {
    if (venta.liquidacionReal?.ingresoBrutoRealArs) return venta.liquidacionReal.ingresoBrutoRealArs;
    if (metodoRef === "RENDIMIENTO") {
      return Number((kgResReales * precioRealKgResArs).toFixed(2));
    }
    return Number((pesoFrigorificoRealKg * precioRealKgVivoArs).toFixed(2));
  });

  const [gastosDirectosRealesArs, setGastosDirectosRealesArs] = useState<number>(
    venta.liquidacionReal?.gastosDirectosRealesArs || venta.proyeccion.altRendimiento.gastosVentaEstimadosArs || 25000
  );
  const [frigorificoReal, setFrigorificoReal] = useState(venta.frigorificoDestino || "Frigorífico Logros S.A.");
  const [observaciones, setObservaciones] = useState(venta.observaciones || "");

  // Auto-cálculo de ingreso bruto si cambia kg de res o precio
  function recalcularIngresoEstimadoSegunRes() {
    const calc = Number((kgResReales * precioRealKgResArs).toFixed(2));
    setIngresoBrutoRealArs(calc);
  }

  // Desvío y liquidación en tiempo real
  const calculoPreeliminar = useMemo(() => {
    const costoDirectoRealArs = Number((venta.costoDirectoUnitarioAplicado * cantidadReal).toFixed(2));
    return calcularLiquidacionRealConDesvios({
      proyeccion: venta.proyeccion,
      metodoElegido: metodoRef,
      pesoCampoRealKg,
      pesoFrigorificoRealKg,
      kgResReales,
      ingresoBrutoRealArs,
      gastosDirectosRealesArs,
      costoDirectoRealArs,
      porcentajeCostoIndirecto: venta.porcentajeCostoIndirecto,
      cantidadReal,
      precioRealKgVivoArs,
      precioRealKgResArs,
      fechaFaena,
    });
  }, [
    venta,
    metodoRef,
    pesoCampoRealKg,
    pesoFrigorificoRealKg,
    kgResReales,
    ingresoBrutoRealArs,
    gastosDirectosRealesArs,
    cantidadReal,
    precioRealKgVivoArs,
    precioRealKgResArs,
    fechaFaena,
  ]);

  function handleConfirmarCierre() {
    if (ingresoBrutoRealArs <= 0) {
      alert("Por favor ingrese el ingreso bruto real liquidado.");
      return;
    }

    const updated = cerrarVentaADefinitivo({
      ventaId: venta.id,
      fechaReal,
      fechaFaena,
      cantidadReal,
      pesoCampoRealKg,
      pesoFrigorificoRealKg,
      kgResReales,
      precioRealKgVivoArs,
      precioRealKgResArs,
      ingresoBrutoRealArs,
      gastosDirectosRealesArs,
      frigorificoReal,
      observaciones,
      usuario: usuarioActual || "Operador",
    });

    onVentaCerrada(updated);
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
          maxWidth: "1100px",
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
            background: "linear-gradient(135deg, #14532d 0%, #166534 100%)",
            color: "#ffffff",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "24px" }}>🏁</span>
              <h2 style={{ fontSize: "19px", fontWeight: 800, margin: 0 }}>
                Cierre de Operación: Venta N° {venta.numeroVenta} ({venta.clienteNombre})
              </h2>
              <span
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                PASO A DEFINITIVO
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#bbf7d0" }}>
              Cargue los datos oficiales del romaneo y la liquidación del frigorífico para calcular el margen real y desvíos.
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
            }}
          >
            ✕
          </button>
        </div>

        {/* Contenido */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: "24px",
            flex: 1,
            backgroundColor: "#f8fafc",
          }}
        >
          {/* Formulario de Carga Real */}
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
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
              📄 Datos de Romaneo & Liquidación Oficial
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Fecha Real de Despacho</label>
                <input
                  type="date"
                  value={fechaReal}
                  onChange={(e) => setFechaReal(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Fecha Faena Frigorífico</label>
                <input
                  type="date"
                  value={fechaFaena}
                  onChange={(e) => setFechaFaena(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Cabezas Reales Faenadas</label>
                <input
                  type="number"
                  min="1"
                  value={cantidadReal}
                  onChange={(e) => setCantidadReal(Number(e.target.value) || 1)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Frigorífico Definitivo</label>
                <input
                  type="text"
                  value={frigorificoReal}
                  onChange={(e) => setFrigorificoReal(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Peso Campo Real (kg)</label>
                <input
                  type="number"
                  step="1"
                  value={pesoCampoRealKg}
                  onChange={(e) => setPesoCampoRealKg(Number(e.target.value) || 0)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Peso Vivo Frigorífico (kg)</label>
                <input
                  type="number"
                  step="1"
                  value={pesoFrigorificoRealKg}
                  onChange={(e) => setPesoFrigorificoRealKg(Number(e.target.value) || 0)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Kg Res Reales (al Gancho)</label>
                <input
                  type="number"
                  step="0.5"
                  value={kgResReales}
                  onChange={(e) => setKgResReales(Number(e.target.value) || 0)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: 700, color: "#14532d" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Precio Real $/kg Res</label>
                <input
                  type="number"
                  step="10"
                  value={precioRealKgResArs}
                  onChange={(e) => setPrecioRealKgResArs(Number(e.target.value) || 0)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                  Ingreso Bruto Real Liquidado ($ sin IVA) *
                </label>
                <button
                  type="button"
                  onClick={recalcularIngresoEstimadoSegunRes}
                  style={{ fontSize: "11px", color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                >
                  Calcular Res × Precio
                </button>
              </div>
              <input
                type="number"
                value={ingresoBrutoRealArs}
                onChange={(e) => setIngresoBrutoRealArs(Number(e.target.value) || 0)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: "2px solid #16a34a", fontSize: "16px", fontWeight: 800, color: "#14532d" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Gastos Directos Reales (DT-e, fletes $)</label>
                <input
                  type="number"
                  value={gastosDirectosRealesArs}
                  onChange={(e) => setGastosDirectosRealesArs(Number(e.target.value) || 0)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Precio Equiv. $/kg Vivo</label>
                <input
                  type="number"
                  step="10"
                  value={precioRealKgVivoArs}
                  onChange={(e) => setPrecioRealKgVivoArs(Number(e.target.value) || 0)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Observaciones del Cierre</label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Detalle de cheques, plazos, notas de faena..."
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", resize: "none" }}
              />
            </div>
          </div>

          {/* Panel de Desvíos Proyectado vs Real */}
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
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 12px 0", color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                📊 Desvíos: Proyectado vs. Real
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Desvío Rendimiento */}
                <div style={{ backgroundColor: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ color: "#64748b" }}>Rendimiento al Gancho:</span>
                    <strong>{calculoPreeliminar.rendimientoRealPct}%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px" }}>
                    <span style={{ color: "#94a3b8" }}>
                      Estimado: {venta.proyeccion.altRendimiento.rendimientoEstimadoPct}%
                    </span>
                    <strong style={{ color: calculoPreeliminar.desvioRendimientoPuntosPct >= 0 ? "#166534" : "#dc2626" }}>
                      {calculoPreeliminar.desvioRendimientoPuntosPct >= 0 ? "+" : ""}
                      {calculoPreeliminar.desvioRendimientoPuntosPct} pts %
                    </strong>
                  </div>
                </div>

                {/* Desvío Desbaste */}
                <div style={{ backgroundColor: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ color: "#64748b" }}>Desbaste de Traslado:</span>
                    <strong>{calculoPreeliminar.desbasteRealPct}%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px" }}>
                    <span style={{ color: "#94a3b8" }}>
                      Estimado: {venta.proyeccion.altRendimiento.desbasteTrasladoPct}%
                    </span>
                    <strong style={{ color: calculoPreeliminar.desvioDesbastePuntosPct <= 0 ? "#166534" : "#dc2626" }}>
                      {calculoPreeliminar.desvioDesbastePuntosPct >= 0 ? "+" : ""}
                      {calculoPreeliminar.desvioDesbastePuntosPct} pts %
                    </strong>
                  </div>
                </div>

                {/* Desvío Ingreso Bruto */}
                <div style={{ backgroundColor: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ color: "#64748b" }}>Ingreso Bruto Real:</span>
                    <strong style={{ color: "#166534", fontSize: "13px" }}>
                      ${calculoPreeliminar.ingresoBrutoRealArs.toLocaleString("es-AR")}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px" }}>
                    <span style={{ color: "#94a3b8" }}>
                      Proyectado: $
                      {(metodoRef === "RENDIMIENTO"
                        ? venta.proyeccion.altRendimiento.ingresoBrutoEstimadoArs
                        : venta.proyeccion.altKiloVivo.ingresoBrutoEstimadoArs
                      ).toLocaleString("es-AR")}
                    </span>
                    <strong style={{ color: calculoPreeliminar.desvioIngresoBrutoArs >= 0 ? "#166534" : "#dc2626" }}>
                      {calculoPreeliminar.desvioIngresoBrutoArs >= 0 ? "+$" : "-$"}
                      {Math.abs(calculoPreeliminar.desvioIngresoBrutoArs).toLocaleString("es-AR")} (
                      {calculoPreeliminar.desvioIngresoBrutoPct}%)
                    </strong>
                  </div>
                </div>

                {/* Resultado Definitivo */}
                <div
                  style={{
                    backgroundColor: "#f0fdf4",
                    border: "1.5px solid #86efac",
                    padding: "12px",
                    borderRadius: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "#166534" }}>Costo Total Considerado:</span>
                    <span>${calculoPreeliminar.costoTotalRealArs.toLocaleString("es-AR")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 800, borderTop: "1px solid #bbf7d0", paddingTop: "6px" }}>
                    <span style={{ color: "#14532d" }}>Margen Operativo Real:</span>
                    <span style={{ color: "#15803d" }}>${calculoPreeliminar.margenOperativoRealArs.toLocaleString("es-AR")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "#166534" }}>Margen por Animal:</span>
                    <strong>${calculoPreeliminar.margenRealPorAnimalArs.toLocaleString("es-AR")} / cab.</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "#166534" }}>Margen s/ Venta:</span>
                    <strong>{calculoPreeliminar.margenRealSobreVentasPct}%</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={handleConfirmarCierre}
                style={{
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "8px",
                  fontWeight: 800,
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 6px -1px rgba(22, 163, 74, 0.3)",
                }}
              >
                <span>🔒</span> Confirmar Cierre y Pasar a DEFINITIVO
              </button>

              <button
                type="button"
                className="ghostButton"
                onClick={onClose}
                style={{ padding: "8px", fontSize: "12px" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
