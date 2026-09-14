"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ActivityInput,
  ActivityStatus,
  agricultureData,
} from "@/lib/agricultureData";
import { LOTES_POR_CAMPO } from "@/lib/historicalData";
import { productos, tiposActividad } from "@/lib/mockData";
import { INITIAL_EQUIPMENT } from "@/lib/machineryData";

const CAMPOS_HJB = ["Aguilera", "Tambo", "Racca", "Kitty", "Keuneke"];
const CAMPANAS_HJB = ["2026/27", "2025/26", "2024/25", "2023/24"];

const CULTIVOS_PRESET = [
  "Maíz",
  "Maíz Silo",
  "Soja de 1ra",
  "Soja de 2da",
  "Trigo",
  "Trigo Catalpa",
  "Avena",
  "Alfalfa",
  "Pastura Consociada",
  "Moha",
  "Sorgo Forrajero",
  "Barbecho químico",
];

const MAQUINARIAS_PRESET = [
  ...INITIAL_EQUIPMENT.map((eq) => `${eq.nombre} (${eq.marca} ${eq.modelo})`),
  "Tractor John Deere 6120E (120 HP)",
  "Tractor John Deere 5705 (85 HP)",
  "Tanque Estercolero Fliegl 14000L",
  "Removedor de Fosa Cri-Man",
  "Mixer Kuhn Knight 5144",
  "Sembradora de Grano Grueso",
  "Sembradora de Fina",
  "Pulverizadora Autopropulsada",
  "Cosechadora (Contratista)",
  "Picadora de Forraje Claas (Contratista)",
  "Rastra de Discos",
  "Acoplado Tolva",
  "Sin asignar",
];

function newInput(producto = "Urea granulada"): ActivityInput {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `inp-${Math.random().toString(36).substring(2, 9)}`,
    producto,
    unidad: "kg/ha",
    dosisPlanificada: null,
    dosisReal: null,
    cantidadTotal: null,
    unidadTotal: "",
    observacion: "",
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
    superficieNota: "",
    insumos: [newInput()],
    metodoAplicacion: "Terrestre",
    maquinaria: "Sin asignar",
    operador: "Sin asignar",
    observaciones: "",
    discrepancia: "",
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
  const [showProduccion, setShowProduccion] = useState(false);
  const [isMultiLote, setIsMultiLote] = useState(false);

  // Lista de todos los lotes configurados en la app
  const allLotes = agricultureData.listLotes();

  useEffect(() => {
    if (!open) return;
    if (editingActivity) {
      setForm({
        ...editingActivity,
        insumos: editingActivity.insumos || [],
      });
      const isGroup = Boolean(
        editingActivity.esGrupal ||
        (editingActivity.lotesAfectados && editingActivity.lotesAfectados.length > 1)
      );
      setIsMultiLote(isGroup);
      setShowProduccion(
        Boolean(
          editingActivity.produccion &&
          (editingActivity.produccion.rendimiento !== null || editingActivity.produccion.cantidad !== null)
        ) ||
        editingActivity.tipo === "Cosecha" ||
        editingActivity.tipo === "Picado" ||
        editingActivity.tipo === "Rollos"
      );
    } else {
      const c = fixedCampo || "Aguilera";
      const lots = LOTES_POR_CAMPO[c] || ["Lote Único"];
      const newAct = emptyActivity(c, fixedLote || lots[0], fixedCampana || "2026/27");
      setForm(newAct);
      setIsMultiLote(false);
      setShowProduccion(false);
    }
  }, [open, fixedCampo, fixedLote, fixedCampana, editingActivity]);

  if (!open) return null;

  const isReal = form.estado === "Realizada";

  function set<K extends keyof Activity>(key: K, value: Activity[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCampoChange(nuevoCampo: string) {
    const dynamicLots = agricultureData.listLotes(nuevoCampo).map((l) => l.nombre);
    const nuevosLotes = dynamicLots.length > 0 ? dynamicLots : LOTES_POR_CAMPO[nuevoCampo] || ["Lote Único"];
    setForm((prev) => ({
      ...prev,
      campo: nuevoCampo,
      lote: nuevosLotes[0],
      cultivo: nuevoCampo === "Tambo" ? "Maíz Silo" : prev.cultivo || "Maíz",
    }));
  }

  // Lógica interactiva de selección de múltiples lotes
  function toggleLoteAfectado(loteKey: string) {
    const current = form.lotesAfectados || [];
    const exists = current.includes(loteKey);
    const updated = exists ? current.filter((k) => k !== loteKey) : [...current, loteKey];

    const totalHa = updated.reduce((sum, key) => {
      const match = allLotes.find((l) => `${l.campo} - ${l.nombre}` === key);
      return sum + (match?.superficieHa || 0);
    }, 0);

    const camposInvolucrados = Array.from(new Set(updated.map((k) => k.split(" - ")[0])));
    const campoLabel = camposInvolucrados.length === 1 ? camposInvolucrados[0] : "Multicampo";
    const lotesLabel = updated.map((k) => k.replace(" - ", " ")).join(", ");

    setForm((prev) => ({
      ...prev,
      esGrupal: true,
      lotesAfectados: updated,
      campo: campoLabel || prev.campo,
      lote: lotesLabel || "Múltiples Lotes",
      superficiePlanificada: totalHa > 0 ? totalHa : prev.superficiePlanificada,
      superficieReal: prev.estado === "Realizada" && totalHa > 0 ? totalHa : prev.superficieReal,
      superficieNota: updated.length > 0 ? `Multilote (${updated.length} lotes: ${camposInvolucrados.join(", ")})` : "",
    }));
  }

  function selectAllCampo(campoName: string) {
    const lotesDeEsteCampo = allLotes.filter((l) => l.campo.toLowerCase() === campoName.toLowerCase());
    const keysDeEsteCampo = lotesDeEsteCampo.map((l) => `${l.campo} - ${l.nombre}`);
    const current = form.lotesAfectados || [];
    const allSelected = keysDeEsteCampo.length > 0 && keysDeEsteCampo.every((k) => current.includes(k));

    let updated: string[];
    if (allSelected) {
      updated = current.filter((k) => !keysDeEsteCampo.includes(k));
    } else {
      updated = Array.from(new Set([...current, ...keysDeEsteCampo]));
    }

    const totalHa = updated.reduce((sum, key) => {
      const match = allLotes.find((l) => `${l.campo} - ${l.nombre}` === key);
      return sum + (match?.superficieHa || 0);
    }, 0);

    const camposInvolucrados = Array.from(new Set(updated.map((k) => k.split(" - ")[0])));
    const campoLabel = camposInvolucrados.length === 1 ? camposInvolucrados[0] : "Multicampo";
    const lotesLabel = updated.map((k) => k.replace(" - ", " ")).join(", ");

    setForm((prev) => ({
      ...prev,
      esGrupal: true,
      lotesAfectados: updated,
      campo: campoLabel || prev.campo,
      lote: lotesLabel || "Múltiples Lotes",
      superficiePlanificada: totalHa > 0 ? totalHa : prev.superficiePlanificada,
      superficieReal: prev.estado === "Realizada" && totalHa > 0 ? totalHa : prev.superficieReal,
      superficieNota: updated.length > 0 ? `Multilote (${updated.length} lotes: ${camposInvolucrados.join(", ")})` : "",
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

  function handleDatePickerChange(isoDate: string) {
    if (!isoDate) return;
    const parts = isoDate.split("-");
    if (parts.length === 3) {
      const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      if (isReal) {
        set("fechaReal", formatted);
        if (!form.fechaPlanificada) set("fechaPlanificada", formatted);
      } else {
        set("fechaPlanificada", formatted);
      }
    }
  }

  function setTodayDate() {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, "0");
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const y = today.getFullYear();
    const formatted = `${d}/${m}/${y}`;
    if (isReal) {
      set("fechaReal", formatted);
      if (!form.fechaPlanificada) set("fechaPlanificada", formatted);
    } else {
      set("fechaPlanificada", formatted);
    }
  }

  function save() {
    const activeDate = isReal ? (form.fechaReal || form.fechaPlanificada) : form.fechaPlanificada;
    if (!activeDate || !activeDate.trim()) {
      alert("Por favor ingresá la fecha de la actividad.");
      return;
    }

    if (isMultiLote && (!form.lotesAfectados || form.lotesAfectados.length === 0)) {
      alert("Por favor marcá al menos un lote para la labor grupal.");
      return;
    }

    const activeSup = isReal ? (form.superficieReal ?? form.superficiePlanificada) : form.superficiePlanificada;
    if (activeSup === null && form.superficieReal === null && form.superficiePlanificada === null) {
      alert("Por favor ingresá la superficie trabajada (en hectáreas).");
      return;
    }

    const now = new Date().toISOString();
    const activityToSave: Activity = {
      ...form,
      id: form.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `act-${Date.now()}`),
      campo: isMultiLote ? (form.campo || "Multicampo") : form.campo,
      lote: isMultiLote ? (form.lote || (form.lotesAfectados || []).join(", ")) : (form.lote || "Lote Único"),
      esGrupal: isMultiLote ? true : false,
      lotesAfectados: isMultiLote ? form.lotesAfectados : undefined,
      fechaPlanificada: form.fechaPlanificada || form.fechaReal || "",
      fechaReal: isReal ? (form.fechaReal || form.fechaPlanificada) : form.fechaReal,
      superficiePlanificada: form.superficiePlanificada ?? form.superficieReal ?? null,
      superficieReal: isReal ? (form.superficieReal ?? form.superficiePlanificada) : form.superficieReal,
      produccion: showProduccion && form.produccion ? form.produccion : undefined,
      createdAt: form.id ? form.createdAt : now,
      updatedAt: now,
    };

    agricultureData.saveActivity(activityToSave);
    onSaved(activityToSave);
    onClose();
  }

  function handleDelete() {
    if (!form.id) return;
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseás eliminar esta labor de "${form.tipo}" en ${form.campo} (${form.lote || "Lote único"})?\n\nEsta acción la removerá del historial.`
    );
    if (confirmDelete) {
      agricultureData.deleteActivity(form.id);
      onSaved(form);
      onClose();
    }
  }

  const dynamicLotes = agricultureData.listLotes(form.campo).map((l) => l.nombre);
  const baseLotes = dynamicLotes.length > 0 ? dynamicLotes : LOTES_POR_CAMPO[form.campo] || ["Lote Único"];
  const allLoteOptions = Array.from(
    new Set([...baseLotes, ...(form.lote ? [form.lote] : []), "General", "Lote Único"])
  );

  const allTiposActividad = Array.from(
    new Set([...tiposActividad, "Barbecho", "Fumigación", ...(form.tipo ? [form.tipo] : [])])
  );

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal modalWide" onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div className="modalHeader">
          <div>
            <p className="eyebrow" style={{ color: "var(--brand-700)", fontWeight: 700 }}>
              {editingActivity
                ? (isMultiLote
                    ? `👥 Labor Grupal (${(form.lotesAfectados || []).length} lotes) · Campaña ${form.campana}`
                    : `📍 ${form.campo} · ${form.lote || "Lote"} · Campaña ${form.campana}`)
                : (isMultiLote
                    ? `👥 Labor Grupal (${(form.lotesAfectados || []).length} lotes)`
                    : `${form.campo} · ${form.lote || "Lote"} · Campaña ${form.campana}`)}
            </p>
            <h2>
              {editingActivity
                ? `Editar labor: ${form.tipo || "Labor"} · ${form.cultivo || "Cultivo"}`
                : "Registrar labor agrícola"}
            </h2>
          </div>
          <button type="button" className="iconButton" onClick={onClose} title="Cerrar">
            ×
          </button>
        </div>

        {/* SECCIÓN 1: Modalidad y Ubicación */}
        {editingActivity ? (
          /* MODO EDICIÓN DIRECTA: Vista limpia y enfocada en este trabajo específico */
          <div className="formSection noTopBorder">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <h3 style={{ margin: 0 }}>Ubicación y Cultivo</h3>
              <span className="pill badgeNeutral" style={{ fontSize: "12px", padding: "4px 10px" }}>
                {isMultiLote
                  ? `👥 Multilote (${(form.lotesAfectados || []).length} lotes)`
                  : `📍 ${form.campo} · ${form.lote || "Lote único"}`}
              </span>
            </div>

            <div className="formGrid fourForm">
              <div>
                <label>Campo</label>
                <select
                  className="input"
                  value={form.campo}
                  disabled={isMultiLote}
                  onChange={(e) => handleCampoChange(e.target.value)}
                >
                  {CAMPOS_HJB.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Lote</label>
                {isMultiLote ? (
                  <input
                    className="input"
                    value={form.lote || "Múltiples lotes"}
                    disabled
                    title="Labor aplicada a múltiples lotes"
                  />
                ) : (
                  <select
                    className="input"
                    value={form.lote || allLoteOptions[0]}
                    onChange={(e) => set("lote", e.target.value)}
                  >
                    {allLoteOptions.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label>Campaña</label>
                <select
                  className="input"
                  value={form.campana}
                  onChange={(e) => set("campana", e.target.value)}
                >
                  {CAMPANAS_HJB.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Cultivo</label>
                <input
                  className="input"
                  value={form.cultivo}
                  onChange={(e) => set("cultivo", e.target.value)}
                  placeholder="ej: Maíz, Soja 2da..."
                  list="cultivos-preset"
                />
                <datalist id="cultivos-preset">
                  {CULTIVOS_PRESET.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            {isMultiLote && (form.lotesAfectados || []).length > 0 && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "8px 12px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  color: "#166534",
                }}
              >
                <strong>✓ Lotes asignados a esta labor: </strong>
                {(form.lotesAfectados || []).join(" · ")}
              </div>
            )}
          </div>
        ) : (
          /* MODO CREACIÓN NUEVA LABOR: Selección de Lote Individual o Múltiples Lotes / Campos */
          <div className="formSection noTopBorder">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <h3>Ubicación y Asignación de Lotes</h3>

              {/* Selector interactivo de Modo Individual vs Múltiple */}
              <div style={{ display: "flex", gap: "8px", background: "var(--slate-100)", padding: "3px", borderRadius: "8px" }}>
                <button
                  type="button"
                  className={!isMultiLote ? "primaryButton" : "secondaryButton"}
                  style={{
                    padding: "5px 12px",
                    fontSize: "12px",
                    borderRadius: "6px",
                    border: 0,
                    boxShadow: !isMultiLote ? "var(--shadow-sm)" : "none",
                  }}
                  onClick={() => {
                    setIsMultiLote(false);
                    const c = fixedCampo || "Aguilera";
                    const lots = LOTES_POR_CAMPO[c] || ["Lote Único"];
                    setForm((prev) => ({
                      ...prev,
                      esGrupal: false,
                      campo: c,
                      lote: lots[0],
                    }));
                  }}
                >
                  📍 Lote Individual
                </button>
                <button
                  type="button"
                  className={isMultiLote ? "primaryButton" : "secondaryButton"}
                  style={{
                    padding: "5px 12px",
                    fontSize: "12px",
                    borderRadius: "6px",
                    border: 0,
                    boxShadow: isMultiLote ? "var(--shadow-sm)" : "none",
                  }}
                  onClick={() => {
                    setIsMultiLote(true);
                    setForm((prev) => ({
                      ...prev,
                      esGrupal: true,
                      lotesAfectados: prev.lotesAfectados && prev.lotesAfectados.length > 0 ? prev.lotesAfectados : [],
                    }));
                  }}
                >
                  👥 Múltiples Lotes / Campos
                </button>
              </div>
            </div>

            {/* MODO A: Lote Individual */}
            {!isMultiLote ? (
              <div className="formGrid fourForm">
                <div>
                  <label>Campo</label>
                  <select
                    className="input"
                    value={form.campo}
                    disabled={Boolean(fixedCampo)}
                    onChange={(e) => handleCampoChange(e.target.value)}
                  >
                    {CAMPOS_HJB.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Lote</label>
                  <select
                    className="input"
                    value={form.lote || allLoteOptions[0]}
                    onChange={(e) => set("lote", e.target.value)}
                  >
                    {allLoteOptions.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Campaña</label>
                  <select
                    className="input"
                    value={form.campana}
                    onChange={(e) => set("campana", e.target.value)}
                  >
                    {CAMPANAS_HJB.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Cultivo</label>
                  <input
                    className="input"
                    value={form.cultivo}
                    onChange={(e) => set("cultivo", e.target.value)}
                    placeholder="ej: Maíz, Soja 2da..."
                    list="cultivos-preset"
                  />
                  <datalist id="cultivos-preset">
                    {CULTIVOS_PRESET.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>
            ) : (
              /* MODO B: Múltiples Lotes / Campos con Checkboxes */
              <div>
                <div className="formGrid two" style={{ marginBottom: "14px" }}>
                  <div>
                    <label>Campaña</label>
                    <select
                      className="input"
                      value={form.campana}
                      onChange={(e) => set("campana", e.target.value)}
                    >
                      {CAMPANAS_HJB.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Cultivo objetivo o destino</label>
                    <input
                      className="input"
                      value={form.cultivo}
                      onChange={(e) => set("cultivo", e.target.value)}
                      placeholder="ej: Barbecho químico, Maíz, Soja..."
                      list="cultivos-preset"
                    />
                  </div>
                </div>

                {/* Selector interactivo organizado por campos */}
                <div
                  style={{
                    padding: "14px",
                    background: "var(--slate-50)",
                    borderRadius: "10px",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div>
                      <strong style={{ fontSize: "13.5px", color: "var(--slate-900)" }}>
                        Seleccioná los lotes a tratar conjuntamente:
                      </strong>
                      <span style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>
                        Podés tildar lotes de diferentes campos. Las hectáreas se sumarán automáticamente.
                      </span>
                    </div>
                    <span className="pill badgeGreen" style={{ fontSize: "12px", padding: "4px 10px", fontWeight: 700 }}>
                      {(form.lotesAfectados || []).length} lotes seleccionados
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    {CAMPOS_HJB.map((cName) => {
                      const cLotes = allLotes.filter((l) => l.campo.toLowerCase() === cName.toLowerCase());
                      const cKeys = cLotes.map((l) => `${l.campo} - ${l.nombre}`);
                      const allChecked = cKeys.length > 0 && cKeys.every((k) => (form.lotesAfectados || []).includes(k));

                      return (
                        <div
                          key={cName}
                          style={{
                            background: "#ffffff",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid var(--line)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              borderBottom: "1px solid var(--slate-100)",
                              paddingBottom: "4px",
                            }}
                          >
                            <strong style={{ fontSize: "13px", color: "var(--brand-800)" }}>{cName}</strong>
                            <button
                              type="button"
                              className="thResetBtn"
                              style={{ fontSize: "10.5px", padding: "1px 4px" }}
                              onClick={() => selectAllCampo(cName)}
                            >
                              {allChecked ? "Desmarcar" : "Tildar todos"}
                            </button>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                            {cLotes.map((lote) => {
                              const key = `${lote.campo} - ${lote.nombre}`;
                              const checked = (form.lotesAfectados || []).includes(key);

                              return (
                                <label
                                  key={key}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    color: checked ? "var(--slate-900)" : "var(--slate-600)",
                                    fontWeight: checked ? 700 : 400,
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleLoteAfectado(key)}
                                    style={{ cursor: "pointer" }}
                                  />
                                  <span>{lote.nombre}</span>
                                  {lote.superficieHa && (
                                    <small style={{ color: "var(--muted)", marginLeft: "auto" }}>
                                      {lote.superficieHa} ha
                                    </small>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {(form.lotesAfectados || []).length > 0 && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "8px 12px",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: "6px",
                        fontSize: "12.5px",
                        color: "#166534",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <strong>✓ Lotes afectados: </strong>
                        {(form.lotesAfectados || []).join(" · ")}
                      </div>
                      <strong>
                        Superficie acumulada: {form.superficiePlanificada || form.superficieReal || 0} ha
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 2: Labor, Estado y Método */}
        <div className="formSection">
          <h3>Labor, Estado y Método</h3>
          <div className="formGrid fourForm">
            <div>
              <label>Tipo de labor</label>
              <select
                className="input"
                value={form.tipo}
                onChange={(e) => {
                  const newTipo = e.target.value;
                  set("tipo", newTipo);
                  if (newTipo === "Cosecha" || newTipo === "Picado" || newTipo === "Rollos") {
                    setShowProduccion(true);
                  }
                }}
              >
                {allTiposActividad.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Estado</label>
              <select
                className="input"
                value={form.estado}
                onChange={(e) => {
                  const newEstado = e.target.value as ActivityStatus;
                  set("estado", newEstado);
                  if (newEstado === "Realizada") {
                    if (!form.fechaReal && form.fechaPlanificada) {
                      set("fechaReal", form.fechaPlanificada);
                    }
                    if (form.superficieReal === null && form.superficiePlanificada !== null) {
                      set("superficieReal", form.superficiePlanificada);
                    }
                  }
                }}
              >
                <option value="Planificada">Planificada</option>
                <option value="Realizada">Realizada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
            <div>
              <label>Método de aplicación</label>
              <select
                className="input"
                value={form.metodoAplicacion || "Terrestre"}
                onChange={(e) => set("metodoAplicacion", e.target.value as "Terrestre" | "Aérea")}
              >
                <option value="Terrestre">Terrestre</option>
                <option value="Aérea">Aérea</option>
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

        {/* SECCIÓN 3: Fechas y Superficie */}
        <div className="formSection">
          <h3>Fechas y Superficie Total</h3>
          <div className="formGrid two">
            {/* Campo Fecha Flexible */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ margin: 0 }}>
                  Fecha {isReal ? "Realizada / Ejecutada" : "Planificada"}
                </label>
                <button
                  type="button"
                  className="thResetBtn"
                  style={{ fontSize: "11px", padding: "2px 6px" }}
                  onClick={setTodayDate}
                >
                  Poner Hoy
                </button>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="text"
                  className="input"
                  style={{ flex: 1 }}
                  value={isReal ? (form.fechaReal ?? form.fechaPlanificada ?? "") : (form.fechaPlanificada ?? "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isReal) {
                      set("fechaReal", val);
                      if (!form.fechaPlanificada) set("fechaPlanificada", val);
                    } else {
                      set("fechaPlanificada", val);
                    }
                  }}
                  placeholder="ej: 15/10/2024 o - / 11 / 2026"
                />

                {/* Datepicker helper */}
                <input
                  type="date"
                  className="input"
                  style={{ width: "42px", padding: "4px", cursor: "pointer" }}
                  title="Abrir calendario para elegir fecha exacta"
                  onChange={(e) => handleDatePickerChange(e.target.value)}
                />
              </div>
              <small style={{ color: "var(--slate-500)", fontSize: "11px", display: "block", marginTop: "3px" }}>
                Admite fechas exactas (<code>DD/MM/YYYY</code>), aproximadas (ej: <code>- / 11 / 2026</code>) o estacionales.
              </small>
            </div>

            {/* Campo Superficie */}
            <div>
              <label>
                Superficie {isReal ? "Realizada (ha)" : "Planificada (ha)"}
                {isMultiLote && " — Suma de lotes"}
              </label>
              <input
                type="number"
                step="0.01"
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
                placeholder="Hectáreas totales"
              />

              <input
                type="text"
                className="input"
                style={{ marginTop: "6px", fontSize: "12px" }}
                value={form.superficieNota || ""}
                onChange={(e) => set("superficieNota", e.target.value)}
                placeholder="Aclaración de superficie (ej: 'Multilote', 'Cabeceras', etc.)"
              />
            </div>
          </div>

          {/* Si es Realizada y además se desea mantener/editar fecha o superficie planificada original */}
          {isReal && (
            <div className="formGrid two" style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed var(--slate-200)" }}>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--slate-600)" }}>
                  Fecha Planificada original (opcional)
                </label>
                <input
                  type="text"
                  className="input"
                  value={form.fechaPlanificada || ""}
                  onChange={(e) => set("fechaPlanificada", e.target.value)}
                  placeholder="ej: Octubre 2025 o 01/10/2025"
                  style={{ fontSize: "12px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11.5px", color: "var(--slate-600)" }}>
                  Superficie Planificada original (ha)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={form.superficiePlanificada ?? ""}
                  onChange={(e) => set("superficiePlanificada", e.target.value ? Number(e.target.value) : null)}
                  placeholder="ha planificadas"
                  style={{ fontSize: "12px" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* SECCIÓN 4: Insumos y Dosis */}
        <div className="formSection">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <h3>Insumos y Dosis</h3>
              <p className="muted" style={{ fontSize: "12px", margin: 0 }}>
                Productos, fertilizantes, semillas o agroquímicos aplicados sobre la superficie seleccionada.
              </p>
            </div>
            <button type="button" className="secondaryButton smallButton" onClick={addInput}>
              + Agregar insumo
            </button>
          </div>

          {form.insumos.length === 0 ? (
            <div style={{ padding: "16px", background: "var(--slate-50)", borderRadius: "8px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
              Esta labor no registra insumos cargados. Hacé clic en <strong>+ Agregar insumo</strong> si querés detallar alguno.
            </div>
          ) : (
            <div className="inputLines">
              {form.insumos.map((input, idx) => {
                const supActiva = isReal ? (form.superficieReal ?? form.superficiePlanificada) : form.superficiePlanificada;
                const dosisActiva = isReal ? (input.dosisReal ?? input.dosisPlanificada) : input.dosisPlanificada;
                const calculoSugerido = supActiva && dosisActiva ? (supActiva * dosisActiva).toFixed(1) : null;

                return (
                  <div key={input.id} className="inputLineCard">
                    <div className="inputLineHeader">
                      <strong>Insumo #{idx + 1}</strong>
                      <button
                        type="button"
                        className="textDanger"
                        onClick={() => removeInput(input.id)}
                        title="Eliminar este insumo"
                      >
                        Eliminar
                      </button>
                    </div>

                    <div className="formGrid fourForm">
                      <div>
                        <label>Producto / Semilla / Fertilizante</label>
                        <input
                          className="input"
                          value={input.producto}
                          onChange={(e) => updateInput(input.id, { producto: e.target.value })}
                          placeholder="Nombre producto"
                          list="productos-preset"
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
                            const totalSugerido = val && supActiva ? Number((val * supActiva).toFixed(2)) : input.cantidadTotal;
                            if (isReal) {
                              updateInput(input.id, {
                                dosisReal: val,
                                dosisPlanificada: input.dosisPlanificada ?? val,
                                cantidadTotal: totalSugerido,
                              });
                            } else {
                              updateInput(input.id, {
                                dosisPlanificada: val,
                                cantidadTotal: totalSugerido,
                              });
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
                          <option value="cc/ha">cc/ha</option>
                          <option value="bolsas/ha">bolsas/ha</option>
                        </select>
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <label style={{ margin: 0 }}>Cantidad Total</label>
                          {calculoSugerido && (
                            <button
                              type="button"
                              className="thResetBtn"
                              style={{ fontSize: "10px", padding: "1px 4px" }}
                              onClick={() => updateInput(input.id, { cantidadTotal: Number(calculoSugerido) })}
                              title="Calcular dosis × superficie total"
                            >
                              = {calculoSugerido}
                            </button>
                          )}
                        </div>
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

                    <div className="formGrid two" style={{ marginTop: "8px" }}>
                      <div>
                        <label style={{ fontSize: "11px", color: "var(--slate-600)" }}>
                          Observación del insumo (opcional)
                        </label>
                        <input
                          className="input"
                          value={input.observacion || ""}
                          onChange={(e) => updateInput(input.id, { observacion: e.target.value })}
                          placeholder="ej: Dosis calculada s/análisis, en cabeceras..."
                          style={{ fontSize: "12px" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", color: "var(--slate-600)" }}>
                          Unidad de cantidad total (opcional)
                        </label>
                        <input
                          className="input"
                          value={input.unidadTotal || ""}
                          onChange={(e) => updateInput(input.id, { unidadTotal: e.target.value })}
                          placeholder="ej: kg, L, litros, bolsas, tn"
                          style={{ fontSize: "12px" }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <datalist id="productos-preset">
            {productos.map((p) => (
              <option key={p} value={p} />
            ))}
            <option value="Glifosato" />
            <option value="Atrazina" />
            <option value="2,4-D" />
            <option value="Cletodim" />
            <option value="Fungicida" />
            <option value="Insecticida" />
            <option value="Efluente Tambo (Líquido)" />
            <option value="Estiércol Tambo (Sólido)" />
          </datalist>
        </div>

        {/* SECCIÓN 5: Producción / Rendimiento */}
        <div className="formSection">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div>
              <h3>Resultado Productivo / Cosecha / Forraje</h3>
              <p className="muted" style={{ fontSize: "12px", margin: 0 }}>
                Rinde por hectárea, volumen cosechado y destino productivo.
              </p>
            </div>

            {showProduccion ? (
              <button
                type="button"
                className="textDanger"
                style={{ fontSize: "12px" }}
                onClick={() => {
                  setShowProduccion(false);
                  set("produccion", undefined);
                }}
              >
                Quitar datos de producción
              </button>
            ) : (
              <button
                type="button"
                className="secondaryButton smallButton"
                onClick={() => {
                  setShowProduccion(true);
                  if (!form.produccion) {
                    set("produccion", {
                      rendimiento: null,
                      unidadRendimiento: form.tipo === "Picado" ? "m/ha" : form.tipo === "Rollos" ? "rollos/ha" : "qq/ha",
                      cantidad: null,
                      unidad: form.tipo === "Picado" ? "metros silo" : form.tipo === "Rollos" ? "rollos" : "kg",
                      destino: form.tipo === "Picado" ? "Silo" : form.tipo === "Rollos" ? "Rollos" : "Grano",
                    });
                  }
                }}
              >
                + Cargar rendimiento / cosecha
              </button>
            )}
          </div>

          {showProduccion && (
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
                  <option value="kg/ha">kg/ha</option>
                  <option value="t/ha">t/ha</option>
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
                  <option value="Venta directa">Venta directa</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* SECCIÓN 6: Maquinaria y Operador */}
        <div className="formSection">
          <h3>Maquinaria y Operador</h3>
          <div className="formGrid two">
            <div>
              <label>Maquinaria utilizada</label>
              <input
                className="input"
                value={form.maquinaria || "Sin asignar"}
                onChange={(e) => set("maquinaria", e.target.value)}
                placeholder="Seleccionar o escribir maquinaria..."
                list="maquinarias-preset"
              />
              <datalist id="maquinarias-preset">
                {MAQUINARIAS_PRESET.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
            <div>
              <label>Operador o Contratista</label>
              <input
                className="input"
                value={form.operador || ""}
                onChange={(e) => set("operador", e.target.value)}
                placeholder="Nombre del operario o empresa contratista..."
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 7: Observaciones y Discrepancias */}
        <div className="formSection">
          <h3>Observaciones y Discrepancias</h3>
          <div className="formGrid two">
            <div>
              <label>Observaciones de campo</label>
              <textarea
                className="input textarea"
                rows={3}
                value={form.observaciones || ""}
                onChange={(e) => set("observaciones", e.target.value)}
                placeholder="Detalle agronómico de la labor, clima, estado del cultivo..."
              />
            </div>
            <div>
              <label style={{ color: "var(--amber-800, #92400e)" }}>
                ⚠️ Discrepancia documental (opcional)
              </label>
              <textarea
                className="input textarea"
                rows={3}
                value={form.discrepancia || ""}
                onChange={(e) => set("discrepancia", e.target.value)}
                placeholder="Anotar si difiere remito de factura, dosis s/cuaderno vs planilla..."
                style={{
                  borderColor: form.discrepancia ? "var(--amber-400, #fbbf24)" : undefined,
                  background: form.discrepancia ? "var(--amber-50, #fffbeb)" : undefined,
                }}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer con botón de eliminar a la izquierda y guardar a la derecha */}
        <div className="modalFooter" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {editingActivity && (
              <button
                type="button"
                className="thResetBtn"
                style={{ color: "#dc2626", borderColor: "#fca5a5", fontWeight: 700, padding: "8px 16px" }}
                onClick={handleDelete}
                title="Eliminar definitivamente esta labor del historial"
              >
                🗑️ Eliminar labor
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" className="secondaryButton" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="primaryButton" onClick={save}>
              {editingActivity ? "Guardar cambios" : "Registrar actividad"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
