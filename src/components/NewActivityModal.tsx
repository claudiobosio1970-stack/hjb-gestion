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
import { maquinarias, productos, tiposActividad } from "@/lib/mockData";

const campos = ["Tambo", "Aguilera", "Racca", "Kitty", "Keuneke"];
const tiposConInsumos = ["Fertilización", "Pulverización", "Biofertilización", "Siembra"];

function newInput(producto = "Urea granulada"): ActivityInput {
  return {
    id: crypto.randomUUID(),
    producto,
    unidad: "kg/ha",
    dosisPlanificada: null,
    dosisReal: null,
  };
}

function emptyActivity(campo = "Aguilera"): Activity {
  const now = new Date().toISOString();
  return {
    id: "",
    campo,
    campana: "2026/27",
    cultivo: campo === "Tambo" ? "Maíz / Forraje" : "Maíz",
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
  editingActivity,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (activity: Activity) => void;
  fixedCampo?: string;
  editingActivity?: Activity | null;
}) {
  const [form, setForm] = useState<Activity>(emptyActivity(fixedCampo));

  useEffect(() => {
    if (!open) return;
    setForm(editingActivity ? editingActivity : emptyActivity(fixedCampo));
  }, [open, fixedCampo, editingActivity]);

  const showInputs = tiposConInsumos.includes(form.tipo);
  const isReal = form.estado === "Realizada";

  if (!open) return null;

  function set<K extends keyof Activity>(key: K, value: Activity[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateInput(id: string, patch: Partial<ActivityInput>) {
    setForm((prev) => ({
      ...prev,
      insumos: prev.insumos.map((i) => i.id === id ? { ...i, ...patch } : i),
    }));
  }

  function addInput() {
    setForm((prev) => ({ ...prev, insumos: [...prev.insumos, newInput("Otro")] }));
  }

  function removeInput(id: string) {
    setForm((prev) => ({ ...prev, insumos: prev.insumos.filter((i) => i.id !== id) }));
  }

  function save() {
    if (!form.fechaPlanificada) {
      alert("Ingresá la fecha planificada.");
      return;
    }
    if (!form.superficiePlanificada) {
      alert("Ingresá la superficie planificada.");
      return;
    }
    if (isReal && !form.fechaReal) {
      alert("Para una actividad realizada, ingresá la fecha real.");
      return;
    }

    const now = new Date().toISOString();
    const activity: Activity = {
      ...form,
      id: form.id || crypto.randomUUID(),
      campo: fixedCampo || form.campo,
      createdAt: form.id ? form.createdAt : now,
      updatedAt: now,
    };

    agricultureData.saveActivity(activity);
    onSaved(activity);
    onClose();
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal modalWide" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <p className="eyebrow">{fixedCampo || form.campo} · 2026/27 · {form.cultivo}</p>
            <h2>{editingActivity ? "Editar actividad" : "Nueva actividad"}</h2>
          </div>
          <button className="iconButton" onClick={onClose}>×</button>
        </div>

        <div className="formSection noTopBorder">
          <h3>Actividad</h3>
          <div className="formGrid three">
            {!fixedCampo && (
              <div>
                <label>Campo</label>
                <select className="input" value={form.campo} onChange={(e) => set("campo", e.target.value)}>
                  {campos.map((campo) => <option key={campo}>{campo}</option>)}
                </select>
              </div>
            )}
            <div>
              <label>Tipo</label>
              <select className="input" value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
                {tiposActividad.map((tipo) => <option key={tipo}>{tipo}</option>)}
              </select>
            </div>
            <div>
              <label>Estado</label>
              <select className="input" value={form.estado} onChange={(e) => set("estado", e.target.value as ActivityStatus)}>
                <option>Planificada</option>
                <option>Realizada</option>
                <option>Cancelada</option>
              </select>
            </div>
          </div>
        </div>

        <div className="formSection">
          <div className="sectionTitle compact">
            <div>
              <h3>Plan</h3>
              <p className="muted">Lo que se decidió hacer.</p>
            </div>
          </div>
          <div className="formGrid">
            <div>
              <label>Fecha planificada</label>
              <input className="input" type="date" value={form.fechaPlanificada} onChange={(e) => set("fechaPlanificada", e.target.value)} />
            </div>
            <div>
              <label>Superficie planificada (ha)</label>
              <input
                className="input"
                inputMode="decimal"
                value={form.superficiePlanificada ?? ""}
                onChange={(e) => set("superficiePlanificada", e.target.value ? Number(e.target.value.replace(",", ".")) : null)}
                placeholder="Ej. 30"
              />
            </div>
          </div>
        </div>

        {isReal && (
          <div className="formSection realBlock">
            <div className="sectionTitle compact">
              <div>
                <h3>Real</h3>
                <p className="muted">Lo que efectivamente ocurrió.</p>
              </div>
            </div>
            <div className="formGrid">
              <div>
                <label>Fecha real</label>
                <input className="input" type="date" value={form.fechaReal || ""} onChange={(e) => set("fechaReal", e.target.value)} />
              </div>
              <div>
                <label>Superficie real (ha)</label>
                <input
                  className="input"
                  inputMode="decimal"
                  value={form.superficieReal ?? ""}
                  onChange={(e) => set("superficieReal", e.target.value ? Number(e.target.value.replace(",", ".")) : null)}
                  placeholder={String(form.superficiePlanificada ?? "")}
                />
              </div>
            </div>
          </div>
        )}

        {showInputs && (
          <div className="formSection">
            <div className="sectionTitle compact">
              <div>
                <h3>Insumos</h3>
                <p className="muted">Podés cargar uno o varios productos en la misma actividad.</p>
              </div>
              <button className="secondaryButton smallButton" type="button" onClick={addInput}>+ Agregar insumo</button>
            </div>

            <div className="inputLines">
              {form.insumos.map((input, index) => {
                const planQty = plannedQuantity(form, input);
                const realQty = realQuantity(form, input);
                return (
                  <div className="inputLineCard" key={input.id}>
                    <div className="inputLineHeader">
                      <strong>Insumo {index + 1}</strong>
                      {form.insumos.length > 1 && (
                        <button className="textDanger" onClick={() => removeInput(input.id)} type="button">Quitar</button>
                      )}
                    </div>
                    <div className="formGrid fourForm">
                      <div>
                        <label>Producto</label>
                        <select className="input" value={input.producto} onChange={(e) => updateInput(input.id, { producto: e.target.value })}>
                          {productos.map((p) => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label>Dosis planificada</label>
                        <input
                          className="input"
                          inputMode="decimal"
                          value={input.dosisPlanificada ?? ""}
                          onChange={(e) => updateInput(input.id, { dosisPlanificada: e.target.value ? Number(e.target.value.replace(",", ".")) : null })}
                          placeholder="kg/ha"
                        />
                      </div>
                      <div>
                        <label>Cantidad planificada</label>
                        <div className="calculated">{planQty === null ? "—" : planQty.toLocaleString("es-AR")} kg</div>
                      </div>
                      {isReal ? (
                        <div>
                          <label>Dosis real</label>
                          <input
                            className="input"
                            inputMode="decimal"
                            value={input.dosisReal ?? ""}
                            onChange={(e) => updateInput(input.id, { dosisReal: e.target.value ? Number(e.target.value.replace(",", ".")) : null })}
                            placeholder={String(input.dosisPlanificada ?? "")}
                          />
                          <small className="subCalc">Total real: {realQty === null ? "—" : realQty.toLocaleString("es-AR")} kg</small>
                        </div>
                      ) : (
                        <div>
                          <label>Unidad</label>
                          <select className="input" value={input.unidad} onChange={(e) => updateInput(input.id, { unidad: e.target.value })}>
                            <option>kg/ha</option>
                            <option>l/ha</option>
                            <option>semillas/ha</option>
                            <option>tn/ha</option>
                            <option>m³/ha</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="formSection">
          <h3>Recursos</h3>
          <div className="formGrid">
            <div>
              <label>Maquinaria</label>
              <select className="input" value={form.maquinaria} onChange={(e) => set("maquinaria", e.target.value)}>
                {maquinarias.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label>Operador</label>
              <select className="input" value={form.operador} onChange={(e) => set("operador", e.target.value)}>
                <option>Sin asignar</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label>Observaciones</label>
          <textarea className="input textarea" value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} placeholder="Observaciones de la actividad..." />
        </div>

        <div className="modalFooter">
          <button className="secondaryButton" onClick={onClose}>Cancelar</button>
          <button className="primaryButton" onClick={save}>Guardar actividad</button>
        </div>
      </div>
    </div>
  );
}
