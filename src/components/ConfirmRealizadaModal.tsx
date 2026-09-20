"use client";

import { useState } from "react";
import {
  Activity,
  ActivityInput,
  agricultureData,
  isLaborSinInsumos,
  isArmadoRollosLabor,
  isSacadoRollosLabor,
} from "@/lib/agricultureData";
import { formatHistoricalDate } from "@/lib/dateUtils";
import { INITIAL_EQUIPMENT } from "@/lib/machineryData";

const MAQUINARIAS_PRESET = [
  "Fumigador Metalford",
  "Tractor Case 150",
  "Rastrillo Volteador / Giroscópico",
  "Rastrillo Hilerador",
  "Rotoenfardadora / Enrolladora Mainero",
  "Tractor con Pala / Pinche de rollos / Carretón",
  ...INITIAL_EQUIPMENT.map((eq) => `${eq.nombre} (${eq.marca} ${eq.modelo})`),
  "Tractor John Deere 6120E (120 HP)",
  "Tractor John Deere 5705 (85 HP)",
  "Camioneta Hilux 4x4",
  "Acoplado Tolva",
  "Sin asignar",
];

const PUERTOS_PRESET = [
  "San Lorenzo",
  "Rosario",
  "Timbúes",
  "General San Martín",
  "Arroyo Seco",
  "Bahía Blanca",
];

interface ConfirmRealizadaModalProps {
  activity: Activity | null;
  onClose: () => void;
  onConfirm?: (updatedActivity: Activity) => void;
  onOpenFullEdit?: (activity: Activity) => void;
}

export default function ConfirmRealizadaModal({
  activity,
  onClose,
  onConfirm,
  onOpenFullEdit,
}: ConfirmRealizadaModalProps) {
  if (!activity) return null;

  const today = new Date().toISOString().split("T")[0];

  // Estados locales para los datos reales
  const [fechaReal, setFechaReal] = useState<string>(
    activity.fechaReal || activity.fechaPlanificada || today
  );
  const [superficieReal, setSuperficieReal] = useState<number | "">(
    activity.superficieReal ?? activity.superficiePlanificada ?? ""
  );
  const [metodoAplicacion, setMetodoAplicacion] = useState<"Terrestre" | "Aérea">(
    activity.metodoAplicacion || "Terrestre"
  );
  const [insumos, setInsumos] = useState<ActivityInput[]>(
    (activity.insumos || []).map((i) => ({
      ...i,
      dosisReal: i.dosisReal ?? i.dosisPlanificada ?? null,
      cantidadTotal:
        i.cantidadTotal ??
        (i.dosisPlanificada && activity.superficiePlanificada
          ? Number((i.dosisPlanificada * activity.superficiePlanificada).toFixed(2))
          : null),
    }))
  );
  const [produccion, setProduccion] = useState<Activity["produccion"]>(
    activity.produccion ? { ...activity.produccion } : undefined
  );
  const [maquinaria, setMaquinaria] = useState<string>(activity.maquinaria || "");
  const [operador, setOperador] = useState<string>(activity.operador || "");
  const [observaciones, setObservaciones] = useState<string>(activity.observaciones || "");
  const [discrepancia, setDiscrepancia] = useState<string>(activity.discrepancia || "");

  const esMecanica = isLaborSinInsumos(activity.tipo);
  const esCosecha = activity.tipo.toLowerCase().includes("cosecha");
  const esPicado = activity.tipo.toLowerCase().includes("picado");
  const esRollo =
    isArmadoRollosLabor(activity.tipo) ||
    isSacadoRollosLabor(activity.tipo) ||
    activity.tipo.toLowerCase().includes("rollo");

  const requiereProduccion = esCosecha || esPicado || esRollo || Boolean(activity.produccion);

  // Ajuste rápido de fechas
  function setAyer() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setFechaReal(d.toISOString().split("T")[0]);
  }

  function setFechaPlanificada() {
    if (activity?.fechaPlanificada) {
      setFechaReal(activity.fechaPlanificada);
    }
  }

  // Recalcular cantidad total de insumos si cambia la superficie
  function handleSuperficieChange(valStr: string) {
    const num = valStr === "" ? "" : Number(valStr);
    setSuperficieReal(num);

    if (typeof num === "number" && num > 0) {
      if (esCosecha && produccion && produccion.rendimiento) {
        const rindeQq = produccion.rendimiento;
        const totalKg = Math.round(rindeQq * 100 * num);
        setProduccion({
          ...produccion,
          cantidad: totalKg,
        });
      }

      setInsumos((prev) =>
        prev.map((ins) => {
          const dosis = ins.dosisReal ?? ins.dosisPlanificada;
          if (dosis && dosis > 0) {
            return {
              ...ins,
              cantidadTotal: Number((dosis * num).toFixed(2)),
            };
          }
          return ins;
        })
      );
    }
  }

  function updateInsumoDosis(id: string, dosisVal: number | null) {
    setInsumos((prev) =>
      prev.map((ins) => {
        if (ins.id === id) {
          const sup = typeof superficieReal === "number" ? superficieReal : 0;
          const cantTotal =
            dosisVal !== null && sup > 0 ? Number((dosisVal * sup).toFixed(2)) : ins.cantidadTotal;
          return {
            ...ins,
            dosisReal: dosisVal,
            cantidadTotal: cantTotal,
          };
        }
        return ins;
      })
    );
  }

  function updateInsumoTotal(id: string, totalVal: number | null) {
    setInsumos((prev) =>
      prev.map((ins) => (ins.id === id ? { ...ins, cantidadTotal: totalVal } : ins))
    );
  }

  function updateInsumoObs(id: string, obs: string) {
    setInsumos((prev) =>
      prev.map((ins) => (ins.id === id ? { ...ins, observacion: obs } : ins))
    );
  }

  function removeInsumo(id: string) {
    setInsumos((prev) => prev.filter((i) => i.id !== id));
  }

  function addInsumo() {
    const newId = `input-${Date.now()}`;
    setInsumos((prev) => [
      ...prev,
      {
        id: newId,
        producto: "",
        unidad: "L/ha",
        dosisPlanificada: null,
        dosisReal: null,
        cantidadTotal: null,
        unidadTotal: "L",
      },
    ]);
  }

  function handleConfirm() {
    if (!activity) return;

    if (!fechaReal) {
      alert("Por favor indicá la fecha real en que se realizó la labor.");
      return;
    }

    const supNum =
      typeof superficieReal === "number"
        ? superficieReal
        : superficieReal === ""
        ? activity.superficiePlanificada ?? null
        : Number(superficieReal);

    const now = new Date().toISOString();

    const updated: Activity = {
      ...activity,
      id: activity.id,
      estado: "Realizada",
      fechaReal,
      superficieReal: supNum,
      metodoAplicacion,
      insumos: esMecanica
        ? []
        : insumos
            .filter((i) => i.producto.trim().length > 0 || i.dosisReal || i.cantidadTotal)
            .map((i) => ({
              ...i,
              dosisReal: i.dosisReal !== null ? Number(i.dosisReal) : null,
              cantidadTotal:
                i.cantidadTotal !== null && i.cantidadTotal !== undefined
                  ? Number(i.cantidadTotal)
                  : (i.dosisReal && supNum ? Number((i.dosisReal * supNum).toFixed(2)) : null),
            })),
      produccion: requiereProduccion && produccion ? produccion : undefined,
      maquinaria: maquinaria.trim() || undefined,
      operador: operador.trim() || undefined,
      observaciones: observaciones.trim() || undefined,
      discrepancia: discrepancia.trim() || undefined,
      updatedAt: now,
    };

    agricultureData.saveActivity(updated);

    if (onConfirm) onConfirm(updated);
    onClose();
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div
        className="modal"
        style={{
          width: "min(760px, 96%)",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 0,
          borderRadius: "14px",
          border: "1px solid #10b981",
          boxShadow: "0 20px 45px -10px rgba(16, 185, 129, 0.2), 0 10px 20px -5px rgba(0,0,0,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "20px 24px",
            background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)",
            borderBottom: "1px solid #a7f3d0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span
                style={{
                  background: "#10b981",
                  color: "#ffffff",
                  fontSize: "10.5px",
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: "999px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                ✓ Pasar a Realizada
              </span>
              <span style={{ fontSize: "12px", color: "#065f46", fontWeight: 600 }}>
                Campaña {activity.campana}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#064e3b" }}>
              Confirmar labor: {activity.tipo}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#047857" }}>
              Verificá o ajustá los datos reales antes de asentar esta labor en el historial.
            </p>
          </div>
          <button
            type="button"
            className="iconButton"
            onClick={onClose}
            title="Cerrar sin guardar"
            style={{ fontSize: "22px", color: "#065f46" }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            margin: "18px 24px 0",
            padding: "12px 16px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--slate-900)" }}>
              {activity.campo === "A Terceros"
                ? `🤝 A Terceros · 👤 ${activity.cliente || activity.lote}`
                : `📍 ${activity.campo} · ${activity.lote || "Lote único"}`}
            </span>
            {activity.cultivo && (
              <span className="pill badgeGreen" style={{ fontSize: "11px" }}>
                🌱 {activity.cultivo}
              </span>
            )}
            {activity.esGrupal && (
              <span className="pill badgeBlue" style={{ fontSize: "11px" }}>
                👥 Multilote ({(activity.lotesAfectados || []).length} lotes)
              </span>
            )}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            Planificada para:{" "}
            <strong style={{ color: "#334155" }}>
              {formatHistoricalDate(activity.fechaPlanificada)}
            </strong>{" "}
            ({activity.superficiePlanificada ?? "—"} ha)
          </div>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h4 style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              1. Fecha y Superficie Real
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                  📅 Fecha real de realización
                </label>
                <input
                  type="date"
                  className="input"
                  value={fechaReal}
                  onChange={(e) => setFechaReal(e.target.value)}
                  style={{ fontWeight: 600, fontSize: "13.5px" }}
                  required
                />
                <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="secondaryButton smallButton"
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                    onClick={() => setFechaReal(today)}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    className="secondaryButton smallButton"
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                    onClick={setAyer}
                  >
                    Ayer
                  </button>
                  {activity.fechaPlanificada && activity.fechaPlanificada !== today && (
                    <button
                      type="button"
                      className="secondaryButton smallButton"
                      style={{ fontSize: "11px", padding: "3px 8px" }}
                      onClick={setFechaPlanificada}
                      title="Usar la fecha que estaba planificada"
                    >
                      Planificada ({formatHistoricalDate(activity.fechaPlanificada)})
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                  <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#334155" }}>
                    📐 Superficie real trabajada (ha)
                  </label>
                  {activity.superficiePlanificada !== null && (
                    <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                      Plan: {activity.superficiePlanificada} ha
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={superficieReal}
                  onChange={(e) => handleSuperficieChange(e.target.value)}
                  placeholder="ej: 50"
                  style={{ fontWeight: 700, fontSize: "13.5px" }}
                />
                {activity.superficiePlanificada !== null &&
                  superficieReal !== "" &&
                  Number(superficieReal) !== Number(activity.superficiePlanificada) && (
                    <div style={{ marginTop: "6px" }}>
                      <button
                        type="button"
                        className="thResetBtn"
                        style={{ fontSize: "11px", padding: "2px 6px" }}
                        onClick={() => handleSuperficieChange(String(activity.superficiePlanificada))}
                      >
                        ↩ Usar planificada ({activity.superficiePlanificada} ha)
                      </button>
                    </div>
                  )}
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                2. Insumos y Dosis Aplicadas
              </h4>
              {!esMecanica && (
                <button
                  type="button"
                  className="secondaryButton smallButton"
                  style={{ fontSize: "11.5px", padding: "3px 8px" }}
                  onClick={addInsumo}
                >
                  + Agregar insumo aplicado
                </button>
              )}
            </div>

            {esMecanica ? (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  fontSize: "12.5px",
                  color: "#475569",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>🚜</span>
                <span>
                  <strong>Labor mecánica / de tracción ({activity.tipo}):</strong> No requiere registro ni descuento de insumos químicos.
                </span>
              </div>
            ) : insumos.length === 0 ? (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  fontSize: "12.5px",
                  color: "#64748b",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Sin insumos planificados para esta labor.</span>
                <button
                  type="button"
                  className="secondaryButton smallButton"
                  style={{ fontSize: "11px", padding: "3px 8px" }}
                  onClick={addInsumo}
                >
                  + Cargar insumo si se aplicó
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {insumos.map((ins) => {
                  const dosis = ins.dosisReal ?? ins.dosisPlanificada;
                  return (
                    <div
                      key={ins.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        display: "grid",
                        gridTemplateColumns: "1.4fr 1fr 1fr 1.2fr 30px",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "13px", color: "var(--slate-900)", display: "block" }}>
                          {ins.producto || "Insumo sin nombre"}
                        </strong>
                        {ins.dosisPlanificada !== null && (
                          <small style={{ color: "#64748b", fontSize: "11px" }}>
                            Dosis plan: {ins.dosisPlanificada} {ins.unidad}
                          </small>
                        )}
                      </div>

                      <div>
                        <label style={{ fontSize: "11px", color: "#475569", display: "block", marginBottom: "2px" }}>
                          Dosis Real ({ins.unidad})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="input"
                          style={{ padding: "4px 8px", fontSize: "12.5px" }}
                          value={dosis !== null && dosis !== undefined ? dosis : ""}
                          onChange={(e) => {
                            const v = e.target.value === "" ? null : Number(e.target.value);
                            updateInsumoDosis(ins.id, v);
                          }}
                          placeholder="Dosis real"
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "11px", color: "#475569", display: "block", marginBottom: "2px" }}>
                          Total ({ins.unidadTotal || ins.unidad.split("/")[0] || ""})
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          className="input"
                          style={{ padding: "4px 8px", fontSize: "12.5px" }}
                          value={ins.cantidadTotal ?? ""}
                          onChange={(e) => {
                            const v = e.target.value === "" ? null : Number(e.target.value);
                            updateInsumoTotal(ins.id, v);
                          }}
                          placeholder="Cant. total"
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "11px", color: "#475569", display: "block", marginBottom: "2px" }}>
                          Remito / Lote / Detalle
                        </label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "4px 8px", fontSize: "11.5px" }}
                          value={ins.observacion || ""}
                          onChange={(e) => updateInsumoObs(ins.id, e.target.value)}
                          placeholder="Opcional..."
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeInsumo(ins.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#94a3b8",
                          cursor: "pointer",
                          fontSize: "16px",
                          padding: "2px",
                        }}
                        title="Quitar este insumo"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {requiereProduccion && (
            <div>
              <h4 style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                3. {esCosecha ? "Rendimiento y Acopio de Granos" : esRollo ? "Confección y Destino de Rollos" : "Producción Obtenida"}
              </h4>

              {esCosecha ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 700, color: "#92400e", display: "block", marginBottom: "4px" }}>
                        🌾 Rendimiento real (qq/ha)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="input"
                        value={produccion?.rendimiento ?? ""}
                        onChange={(e) => {
                          const rinde = e.target.value === "" ? null : Number(e.target.value);
                          const sup = typeof superficieReal === "number" ? superficieReal : 0;
                          const totalKg = rinde && sup > 0 ? Math.round(rinde * 100 * sup) : produccion?.cantidad ?? null;
                          setProduccion({
                            ...produccion,
                            unidadRendimiento: "qq/ha",
                            unidad: "kg",
                            rendimiento: rinde,
                            cantidad: totalKg,
                          });
                        }}
                        placeholder="ej: 110"
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 700, color: "#92400e", display: "block", marginBottom: "4px" }}>
                        ⚖️ Producción total cosechada (Tn)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        value={produccion?.cantidad ? Number((produccion.cantidad / 1000).toFixed(2)) : ""}
                        onChange={(e) => {
                          const tn = e.target.value === "" ? null : Number(e.target.value);
                          const totalKg = tn ? Math.round(tn * 1000) : null;
                          const sup = typeof superficieReal === "number" ? superficieReal : 0;
                          const rinde = totalKg && sup > 0 ? Number(((totalKg / 100) / sup).toFixed(1)) : produccion?.rendimiento ?? null;
                          setProduccion({
                            ...produccion,
                            unidad: "kg",
                            unidadRendimiento: "qq/ha",
                            cantidad: totalKg,
                            rendimiento: rinde,
                          });
                        }}
                        placeholder="ej: 110.5"
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#92400e", display: "block", marginBottom: "6px" }}>
                      🏢 Destino de acopio del cereal
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px" }}>
                      {[
                        { id: "Silos", label: "Silos", icon: "🏢" },
                        { id: "Cooperativa", label: "Cooperativa", icon: "🏬" },
                        { id: "Puerto", label: "Puerto", icon: "🚢" },
                        { id: "AFA Los Cardos", label: "AFA Los Cardos", icon: "🌾" },
                      ].map((dest) => {
                        const isSelected =
                          produccion?.destinoCereal === dest.id ||
                          produccion?.destino === dest.id ||
                          (dest.id === "Puerto" && produccion?.destino?.includes("Puerto"));
                        return (
                          <div
                            key={dest.id}
                            onClick={() => {
                              setProduccion({
                                ...produccion,
                                destinoCereal: dest.id,
                                destino: dest.id,
                                puertoNombre: dest.id === "Puerto" ? (produccion?.puertoNombre || "San Lorenzo") : undefined,
                                lugarAcopio: dest.id === "Puerto" ? `Puerto: ${produccion?.puertoNombre || "San Lorenzo"}` : dest.id,
                                unidad: "kg",
                                unidadRendimiento: "qq/ha",
                                cantidad: produccion?.cantidad ?? null,
                                rendimiento: produccion?.rendimiento ?? null,
                              });
                            }}
                            style={{
                              border: isSelected ? "2px solid #b45309" : "1px solid #cbd5e1",
                              background: isSelected ? "#fef3c7" : "#ffffff",
                              borderRadius: "8px",
                              padding: "8px 10px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: isSelected ? 700 : 500,
                              color: isSelected ? "#78350f" : "#334155",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "all .15s ease",
                            }}
                          >
                            <span>{dest.icon}</span>
                            <span>{dest.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {(produccion?.destinoCereal === "Puerto" || produccion?.destino === "Puerto") && (
                      <div style={{ marginTop: "10px", padding: "10px", background: "#ffffff", borderRadius: "8px", border: "1px solid #fed7aa" }}>
                        <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#9a3412", display: "block", marginBottom: "5px" }}>
                          Terminal portuaria:
                        </label>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
                          {PUERTOS_PRESET.map((p) => {
                            const isPSelected = (produccion?.puertoNombre || "San Lorenzo") === p;
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => {
                                  setProduccion({
                                    ...produccion,
                                    puertoNombre: p,
                                    lugarAcopio: `Puerto: ${p}`,
                                    destinoCereal: "Puerto",
                                    destino: "Puerto",
                                    unidad: "kg",
                                    unidadRendimiento: "qq/ha",
                                    cantidad: produccion?.cantidad ?? null,
                                    rendimiento: produccion?.rendimiento ?? null,
                                  });
                                }}
                                style={{
                                  fontSize: "11px",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  border: isPSelected ? "2px solid #ea580c" : "1px solid #cbd5e1",
                                  background: isPSelected ? "#ea580c" : "#ffffff",
                                  color: isPSelected ? "#ffffff" : "#475569",
                                  fontWeight: isPSelected ? 700 : 500,
                                  cursor: "pointer",
                                }}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : esRollo ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 700, color: "#166534", display: "block", marginBottom: "4px" }}>
                        📦 Cantidad de rollos
                      </label>
                      <input
                        type="number"
                        step="1"
                        className="input"
                        value={produccion?.cantidad ?? ""}
                        onChange={(e) => {
                          const cant = e.target.value === "" ? null : Number(e.target.value);
                          const sup = typeof superficieReal === "number" ? superficieReal : 0;
                          const rinde = cant && sup > 0 ? Number((cant / sup).toFixed(1)) : produccion?.rendimiento ?? null;
                          setProduccion({
                            ...produccion,
                            unidad: "rollos",
                            unidadRendimiento: "rollos/ha",
                            cantidad: cant,
                            rendimiento: rinde,
                          });
                        }}
                        placeholder="ej: 45"
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 700, color: "#166534", display: "block", marginBottom: "4px" }}>
                        Rendimiento (rollos/ha)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="input"
                        value={produccion?.rendimiento ?? ""}
                        onChange={(e) => {
                          const r = e.target.value === "" ? null : Number(e.target.value);
                          setProduccion({
                            ...produccion,
                            unidad: "rollos",
                            unidadRendimiento: "rollos/ha",
                            rendimiento: r,
                            cantidad: produccion?.cantidad ?? null,
                          });
                        }}
                        placeholder="ej: 4.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#166534", display: "block", marginBottom: "6px" }}>
                      📍 Ubicación / Destino de los rollos
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div
                        onClick={() => {
                          const destStr = `Almacenado en ${activity.campo}`;
                          setProduccion({
                            ...produccion,
                            destino: destStr,
                            ubicacionRollos: activity.campo.toLowerCase() === "keuneke" ? "Campo Keuneke" : `Campo ${activity.campo}`,
                            unidad: "rollos",
                            unidadRendimiento: "rollos/ha",
                            cantidad: produccion?.cantidad ?? null,
                            rendimiento: produccion?.rendimiento ?? null,
                          });
                        }}
                        style={{
                          border: (!produccion?.ubicacionRollos || !produccion.ubicacionRollos.toLowerCase().includes("tambo"))
                            ? "2px solid #2563eb"
                            : "1px solid #cbd5e1",
                          background: (!produccion?.ubicacionRollos || !produccion.ubicacionRollos.toLowerCase().includes("tambo"))
                            ? "#eff6ff"
                            : "#ffffff",
                          borderRadius: "8px",
                          padding: "10px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#1e3a8a",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>🏠</span>
                        <span>Quedan en este campo ({activity.campo})</span>
                      </div>
                      <div
                        onClick={() => {
                          setProduccion({
                            ...produccion,
                            destino: "Llevado al Tambo",
                            ubicacionRollos: "Tambo",
                            unidad: "rollos",
                            unidadRendimiento: "rollos/ha",
                            cantidad: produccion?.cantidad ?? null,
                            rendimiento: produccion?.rendimiento ?? null,
                          });
                        }}
                        style={{
                          border: produccion?.ubicacionRollos?.toLowerCase().includes("tambo")
                            ? "2px solid #16a34a"
                            : "1px solid #cbd5e1",
                          background: produccion?.ubicacionRollos?.toLowerCase().includes("tambo")
                            ? "#f0fdf4"
                            : "#ffffff",
                          borderRadius: "8px",
                          padding: "10px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#166534",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>🥛</span>
                        <span>Están en el Tambo</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                      Cantidad total ({produccion?.unidad || "kg/m"})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="input"
                      value={produccion?.cantidad ?? ""}
                      onChange={(e) => {
                        const c = e.target.value === "" ? null : Number(e.target.value);
                        setProduccion({
                          ...produccion,
                          unidad: produccion?.unidad || "kg",
                          unidadRendimiento: produccion?.unidadRendimiento || "qq/ha",
                          cantidad: c,
                          rendimiento: produccion?.rendimiento ?? null,
                        });
                      }}
                      placeholder="Total"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                      Destino
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={produccion?.destino || ""}
                      onChange={(e) => {
                        setProduccion({
                          ...produccion,
                          destino: e.target.value,
                          unidad: produccion?.unidad || "kg",
                          unidadRendimiento: produccion?.unidadRendimiento || "qq/ha",
                          cantidad: produccion?.cantidad ?? null,
                          rendimiento: produccion?.rendimiento ?? null,
                        });
                      }}
                      placeholder="ej: Silo bolsa, Tambo..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <h4 style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              4. Maquinaria y Operador
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                  🚜 Maquinaria utilizada
                </label>
                <input
                  type="text"
                  className="input"
                  value={maquinaria}
                  onChange={(e) => setMaquinaria(e.target.value)}
                  placeholder="Elegir o escribir maquinaria..."
                  list="confirm-maq-preset"
                  style={{ fontSize: "12.5px" }}
                />
                <datalist id="confirm-maq-preset">
                  {MAQUINARIAS_PRESET.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                  👤 Operador o Contratista
                </label>
                <input
                  type="text"
                  className="input"
                  value={operador}
                  onChange={(e) => setOperador(e.target.value)}
                  placeholder="Nombre de quien realizó el trabajo..."
                  style={{ fontSize: "12.5px" }}
                />
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              5. Observaciones reales de campo
            </h4>
            <textarea
              className="input textarea"
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Detalles de la labor, clima, estado del suelo o lote..."
              style={{ fontSize: "12.5px" }}
            />
          </div>
        </div>

        <div
          style={{
            padding: "16px 24px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            {onOpenFullEdit && (
              <button
                type="button"
                className="secondaryButton smallButton"
                style={{ fontSize: "12px", color: "var(--brand-700)" }}
                onClick={() => {
                  onOpenFullEdit(activity);
                  onClose();
                }}
                title="Abrir el formulario completo con todas las opciones avanzadas"
              >
                ✏️ Abrir en edición completa
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button type="button" className="secondaryButton" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="primaryButton"
              onClick={handleConfirm}
              style={{
                background: "#059669",
                borderColor: "#047857",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 700,
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
              }}
            >
              <span>✓</span>
              <span>Confirmar y Guardar como Realizada</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
