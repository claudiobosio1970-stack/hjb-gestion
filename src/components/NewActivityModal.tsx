"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ActivityInput,
  ActivityStatus,
  agricultureData,
  plannedQuantity,
  realQuantity,
} from "@/lib/agricultureData";
import { LOTES_POR_CAMPO } from "@/lib/historicalData";
import { maquinarias, productos, tiposActividad } from "@/lib/mockData";

const campos = ["Aguilera", "Tambo", "Racca", "Kitty", "Keuneke"];
const campanas = ["2026/27", "2025/26", "2024/25"];
const tiposConInsumos = ["Fertilización", "Biofertilización", "Pulverización", "Fumigación", "Siembra", "Barbecho"];

function newInput(producto = "Urea granulada"): ActivityInput {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
    producto,
    unidad: "kg/ha",
    dosisPlanificada: null,
    dosisReal: null,
  };
}

function emptyActivity(campo = "Aguilera", lote = "Lote Único", campana = "2026/27"): Activity {
  const now = new Date().toISOString();
  return {
    id: "",
    campo,
    lote,
    campana,
    cultivo: campo === "Tambo" ? "Maíz Silo" : "Maíz",
    cultivoAntecesor: "",
    tipo: "Fertilización",
    estado: "Planificada",
    fechaPlanificada: "",
    fechaReal: "",
    superficiePlanificada: null,
    superficieReal: null,
    insumos: [newInput()],
    maquinaria: "Sin asignar",
    operador: "Sin asignar",
    observaciones: "",
    createdAt: now,
    updatedAt: now,
  };
}

export default function NewActivityModal({
  open,
  onClose,
  onSaved,
  fixedCampo,
  fixedLote,
  fixedCampana,
  editingActivity,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (activity: Activity) => void;
  fixedCampo?: string;
  fixedLote?: string;
  fixedCampana?: string;
  editingActivity?: Activity | null;
}) {
  const initialCampo = fixedCampo || "Aguilera";
  const lotesDisponibles = LOTES_POR_CAMPO[initialCampo] || ["Lote Único"];
  const initialLote = fixedLote || lotesDisponibles[0];
  const initialCampana = fixedCampana || "2026/27";

  const [form, setForm] = useState<Activity>(emptyActivity(initialCampo, initialLote, initialCampana));

  useEffect(() => {
    if (!open) return;
    if (editingActivity) {
      setForm(editingActivity);
    } else {
      const c = fixedCampo || "Aguilera";
      const lots = LOTES_POR_CAMPO[c] || ["Lote Único"];
      setForm(emptyActivity(c, fixedLote || lots[0], fixedCampana || "2026/27"));
    }
  }, [open, fixedCampo, fixedLote, fixedCampana, editingActivity]);

  const showInputs = tiposConInsumos.includes(form.tipo);
  const isReal = form.estado === "Realizada";

  if (!open) return null;

  function set<K extends keyof Activity>(key: K, value: Activity[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCampoChange(nuevoCampo: string) {
    const nuevosLotes = LOTES_POR_CAMPO[nuevoCampo] || ["Lote Único"];
    setForm((prev) => ({
      ...prev,
      campo: nuevoCampo,
      lote: nuevosLotes[0],
      cultivo: nuevoCampo === "Tambo" ? "Maíz Silo" : "Maíz",
    }));
  }

  function updateInput(id: string, patch: Partial<ActivityInput>) {
    setForm((prev) => ({
      ...prev,
      insumos: prev.insumos.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }

  function addInput() {
    setForm((prev) => ({ ...prev, insumos: [...prev.insumos, newInput("Otro")] }));
  }

  function removeInput(id: string) {
    setForm((prev) => ({ ...prev, insumos: prev.insumos.filter((i) => i.id !== id) }));
  }

  function save() {
    if (!form.fechaPlanificada && !form.fechaReal) {
      alert("Ingresá la fecha de la actividad.");
      return;
    }
    if (!form.superficiePlanificada && !form.superficieReal) {
      alert("Ingresá la superficie trabajada.");
      return;
    }

    const now = new Date().toISOString();
    const activity: Activity = {
      ...form,
      id: form.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString()),
      campo: fixedCampo || form.campo,
      createdAt: form.id ? form.createdAt : now,
      updatedAt: now,
    };

    agricultureData.saveActivity(activity);
    onSaved(activity);
    onClose();
  }

  const lotesActuales = LOTES_POR_CAMPO[form.campo] || ["Lote Único"];

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal modalWide" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <p className="eyebrow">{fixedCampo || form.campo} · {form.lote || "Lote"} · {form.campana}</p>
            <h2>{editingActivity ? "Editar labor / actividad" : "Registrar labor / actividad"}</h2>
          </div>
          <button className="iconButton" onClick={onClose}>×</button>
        </div>

        {/* Sección Campo, Lote, Campaña y Cultivo */}
        <div className="formSection noTopBorder">
          <h3>Ubicación y Período</h3>
          <div className="formGrid fourForm">
            <div>
              <label>Campo</label>
              <select
                className="input"
                value={form.campo}
                disabled={Boolean(fixedCampo)}
                onChange={(e) => handleCampoChange(e.target.value)}
              >
                {campos.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label>Lote</label>
              <select
                className="input"
                value={form.lote || lotesActuales[0]}
                onChange={(e) => set("lote", e.target.value)}
              >
                {lotesActuales.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label>Campaña</label>
              <select
                className="input"
                value={form.campana}
                onChange={(e) => set("campana", e.target.value)}
              >
                {campanas.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label>Cultivo</label>
              <input
                className="input"
                value={form.cultivo}
                onChange={(e) => set("cultivo", e.target.value)}
                placeholder="ej: Maíz, Soja de 2da, Trigo, Alfalfa..."
              />
            </div>
          </div>
        </div>

        {/* Sección Labor y Estado */}
        <div className="formSection">
          <h3>Labor y Estado</h3>
          <div className="formGrid three">
            <div>
              <label>Tipo de labor</label>
              <select className="input" value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
                {tiposActividad.map((tipo) => <option key={tipo}>{tipo}</option>)}
              </select>
            </div>
            <div>
              <label>Estado</label>
              <select
                className="input"
                value={form.estado}
                onChange={(e) => set("estado", e.target.value as ActivityStatus)}
              >
                <option value="Planificada">Planificada</option>
                <option value="Realizada">Realizada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
            <div>
              <label>Cultivo Antecesor (opcional)</label>
              <input
                className="input"
                value={form.cultivoAntecesor || ""}
                onChange={(e) => set("cultivoAntecesor", e.target.value)}
                placeholder="ej: Trigo, Avena, Maíz..."
              />
            </div>
          </div>
        </div>

        {/* Fechas y Superficies */}
        <div className="formSection">
          <h3>Fechas y Superficie</h3>
          <div className="formGrid">
            <div>
              <label>Fecha {isReal ? "Real / Ejecutada" : "Planificada"}</label>
              <input
                type="date"
                className="input"
                value={isReal ? (form.fechaReal || form.fechaPlanificada) : form.fechaPlanificada}
                onChange={(e) => {
                  if (isReal) {
                    set("fechaReal", e.target.value);
                    if (!form.fechaPlanificada) set("fechaPlanificada", e.target.value);
                  } else {
                    set("fechaPlanificada", e.target.value);
                  }
                }}
              />
            </div>
            <div>
              <label>Superficie {isReal ? "Real (ha)" : "Planificada (ha)"}</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={
                  (isReal ? form.superficieReal ?? form.superficiePlanificada : form.superficiePlanificada) ?? ""
                }
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  if (isReal) {
                    set("superficieReal", val);
                    if (!form.superficiePlanificada) set("superficiePlanificada", val);
                  } else {
                    set("superficiePlanificada", val);
                  }
                }}
                placeholder="Hectáreas"
              />
            </div>
          </div>
        </div>

        {/* Insumos */}
        {showInputs && (
          <div className="formSection">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3>Insumos y Dosis</h3>
              <button type="button" className="secondaryButton smallButton" onClick={addInput}>
                + Agregar producto
              </button>
            </div>

            <div className="inputLines">
              {form.insumos.map((input, idx) => (
                <div key={input.id} className="inputLineCard">
                  <div className="inputLineHeader">
                    <strong>Producto #{idx + 1}</strong>
                    {form.insumos.length > 1 && (
                      <button type="button" className="textDanger" onClick={() => removeInput(input.id)}>
                        Eliminar
                      </button>
                    )}
                  </div>
                  <div className="fourForm">
                    <div>
                      <label>Producto / Semilla / Fertilizante</label>
                      <input
                        className="input"
                        value={input.producto}
                        onChange={(e) => updateInput(input.id, { producto: e.target.value })}
                        placeholder="Nombre comercial o genérico"
                      />
                    </div>
                    <div>
                      <label>Dosis por ha</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        value={
                          (isReal ? input.dosisReal ?? input.dosisPlanificada : input.dosisPlanificada) ?? ""
                        }
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          if (isReal) {
                            updateInput(input.id, { dosisReal: val, dosisPlanificada: input.dosisPlanificada ?? val });
                          } else {
                            updateInput(input.id, { dosisPlanificada: val });
                          }
                        }}
                        placeholder="Dosis"
                      />
                    </div>
                    <div>
                      <label>Unidad de dosis</label>
                      <select
                        className="input"
                        value={input.unidad}
                        onChange={(e) => updateInput(input.id, { unidad: e.target.value })}
                      >
                        <option value="kg/ha">kg/ha</option>
                        <option value="L/ha">L/ha</option>
                        <option value="kL/ha">kL/ha (Efluente líq.)</option>
                        <option value="t/ha">t/ha (Estiércol sól.)</option>
                        <option value="g/ha">g/ha</option>
                        <option value="bolsas/ha">bolsas/ha</option>
                      </select>
                    </div>
                    <div>
                      <label>Cantidad Total (opc.)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input"
                        value={input.cantidadTotal ?? ""}
                        onChange={(e) => updateInput(input.id, { cantidadTotal: e.target.value ? Number(e.target.value) : null })}
                        placeholder="Total aplicado"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Producción / Rendimiento (para Cosechas o Picados) */}
        {(form.tipo === "Cosecha" || form.tipo === "Picado" || form.tipo === "Rollos") && (
          <div className="formSection">
            <h3>Resultado Productivo / Cosecha</h3>
            <div className="formGrid fourForm">
              <div>
                <label>Rendimiento</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={form.produccion?.rendimiento ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    set("produccion", {
                      rendimiento: val,
                      unidadRendimiento: form.produccion?.unidadRendimiento || (form.tipo === "Picado" ? "m/ha" : form.tipo === "Rollos" ? "rollos/ha" : "qq/ha"),
                      cantidad: form.produccion?.cantidad ?? null,
                      unidad: form.produccion?.unidad || (form.tipo === "Picado" ? "metros silo" : form.tipo === "Rollos" ? "rollos" : "kg"),
                      destino: form.produccion?.destino || (form.tipo === "Picado" ? "Silo" : form.tipo === "Rollos" ? "Rollos" : "Grano"),
                    });
                  }}
                  placeholder="ej: 39.37"
                />
              </div>
              <div>
                <label>Unidad Rendimiento</label>
                <select
                  className="input"
                  value={form.produccion?.unidadRendimiento || "qq/ha"}
                  onChange={(e) => {
                    set("produccion", {
                      ...form.produccion,
                      unidadRendimiento: e.target.value as any,
                      cantidad: form.produccion?.cantidad ?? null,
                      unidad: form.produccion?.unidad || "kg",
                      rendimiento: form.produccion?.rendimiento ?? null,
                    });
                  }}
                >
                  <option value="qq/ha">qq/ha (Quintales/ha)</option>
                  <option value="m/ha">m/ha (Metros silo/ha)</option>
                  <option value="rollos/ha">rollos/ha</option>
                </select>
              </div>
              <div>
                <label>Producción Total</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={form.produccion?.cantidad ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    set("produccion", {
                      ...form.produccion,
                      cantidad: val,
                      unidad: form.produccion?.unidad || "kg",
                      rendimiento: form.produccion?.rendimiento ?? null,
                      unidadRendimiento: form.produccion?.unidadRendimiento || "qq/ha",
                    });
                  }}
                  placeholder="Total kilos / metros"
                />
              </div>
              <div>
                <label>Destino</label>
                <select
                  className="input"
                  value={form.produccion?.destino || "Grano"}
                  onChange={(e) => {
                    set("produccion", {
                      ...form.produccion,
                      destino: e.target.value as any,
                      cantidad: form.produccion?.cantidad ?? null,
                      unidad: form.produccion?.unidad || "kg",
                      rendimiento: form.produccion?.rendimiento ?? null,
                      unidadRendimiento: form.produccion?.unidadRendimiento || "qq/ha",
                    });
                  }}
                >
                  <option value="Grano">Grano</option>
                  <option value="Silo">Silo</option>
                  <option value="Rollos">Rollos</option>
                  <option value="Forraje Tambo">Forraje Tambo</option>
                  <option value="Pastoreo">Pastoreo</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Observaciones */}
        <div className="formSection">
          <h3>Observaciones y Maquinaria</h3>
          <div className="formGrid">
            <div>
              <label>Observaciones de campo</label>
              <textarea
                className="input textarea"
                value={form.observaciones || ""}
                onChange={(e) => set("observaciones", e.target.value)}
                placeholder="Detalle de la labor, clima, estado del lote..."
              />
            </div>
            <div>
              <label>Maquinaria</label>
              <select className="input" value={form.maquinaria} onChange={(e) => set("maquinaria", e.target.value)}>
                {maquinarias.map((m) => <option key={m}>{m}</option>)}
              </select>
              <label style={{ marginTop: "12px" }}>Operador / Contratista</label>
              <input
                className="input"
                value={form.operador || ""}
                onChange={(e) => set("operador", e.target.value)}
                placeholder="Operador o contratista"
              />
            </div>
          </div>
        </div>

        <div className="modalFooter">
          <button className="secondaryButton" onClick={onClose}>Cancelar</button>
          <button className="primaryButton" onClick={save}>
            {editingActivity ? "Guardar cambios" : "Registrar actividad"}
          </button>
        </div>
      </div>
    </div>
  );
}
