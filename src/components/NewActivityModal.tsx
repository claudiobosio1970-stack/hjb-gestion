"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Activity,
  ActivityInput,
  ActivityStatus,
  agricultureData,
  isRolloLabor,
  isLaborSinInsumos,
  isVolteoORastrillado,
  isSacadoRollosLabor,
  isArmadoRollosLabor,
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
  "Avena / Alfalfa",
  "Pastura Consociada",
  "Moha",
  "Sorgo Forrajero",
  "Barbecho químico",
];

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

function isBiofertilizacion(tipo: string): boolean {
  const t = (tipo || "").toLowerCase();
  return t.includes("biofertiliz");
}

function getDefaultMaquinaria(tipo: string): string {
  const t = (tipo || "").toLowerCase();
  if (t.includes("fumiga") || t.includes("pulveri") || t.includes("barbecho")) {
    return "Fumigador Metalford";
  }
  if (t.includes("volteo") || t.includes("voltead")) {
    return "Rastrillo Volteador / Giroscópico";
  }
  if (t.includes("rastrill") || t.includes("hilerad")) {
    return "Rastrillo Hilerador";
  }
  if (isSacadoRollosLabor(t)) {
    return "Tractor con Pala / Pinche de rollos / Carretón";
  }
  if (isArmadoRollosLabor(t) || t.includes("armado") || t.includes("rollo") || t.includes("confecci") || t.includes("enrollad")) {
    return "Rotoenfardadora / Enrolladora";
  }
  if (t.includes("cosecha") || t.includes("picado")) {
    return "";
  }
  return "Tractor Case 150";
}

function newInput(producto = ""): ActivityInput {
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

function emptyActivity(campo = "Aguilera", lote = "Lote Único", campana = "2026/27", tipo = "Fertilización"): Activity {
  const now = new Date().toISOString();
  const allLots = agricultureData.listLotes(campo);
  const found = allLots.find((l) => l.nombre === lote);
  const lotHa = found?.superficieHa || null;
  const sinInsumos = isLaborSinInsumos(tipo);

  return {
    id: "",
    campo,
    lote,
    campana,
    cultivo: "",
    cultivoAntecesor: "",
    tipo,
    estado: "Planificada",
    fechaPlanificada: "",
    fechaReal: "",
    superficiePlanificada: lotHa,
    superficieReal: lotHa,
    superficieNota: "",
    insumos: sinInsumos ? [] : [newInput("")],
    metodoAplicacion: "Terrestre",
    maquinaria: getDefaultMaquinaria(tipo),
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

  // Buscar si hubo una labor de volteo previa en este campo y lote
  const previousVolteo = useMemo(() => {
    const c = form.campo;
    const l = form.lote;
    if (!c || !l) return null;
    const cLow = c.toLowerCase();
    const lLow = l.toLowerCase();
    try {
      const allActs = agricultureData.listActivities();
      return (
        allActs.find(
          (a) =>
            a.campo.toLowerCase() === cLow &&
            (a.lote || "").toLowerCase() === lLow &&
            ((a.tipo || "").toLowerCase().includes("volteo") || (a.tipo || "").toLowerCase().includes("voltead"))
        ) || null
      );
    } catch {
      return null;
    }
  }, [form.campo, form.lote]);

  // Buscar si hubo una labor de rastrillado previa en este campo y lote
  const previousRastrillado = useMemo(() => {
    const c = form.campo;
    const l = form.lote;
    if (!c || !l) return null;
    const cLow = c.toLowerCase();
    const lLow = l.toLowerCase();
    try {
      const allActs = agricultureData.listActivities();
      return (
        allActs.find(
          (a) =>
            a.campo.toLowerCase() === cLow &&
            (a.lote || "").toLowerCase() === lLow &&
            ((a.tipo || "").toLowerCase().includes("rastrill") || (a.tipo || "").toLowerCase().includes("hilerad"))
        ) || null
      );
    } catch {
      return null;
    }
  }, [form.campo, form.lote]);

  // Buscar si hubo una labor de armado de rollos previa en este campo y lote
  const previousArmado = useMemo(() => {
    const c = form.campo;
    const l = form.lote;
    if (!c || !l) return null;
    const cLow = c.toLowerCase();
    const lLow = l.toLowerCase();
    try {
      const allActs = agricultureData.listActivities();
      return (
        allActs.find(
          (a) =>
            a.id !== form.id &&
            a.campo.toLowerCase() === cLow &&
            (a.lote || "").toLowerCase() === lLow &&
            !isSacadoRollosLabor(a.tipo || "") &&
            !isVolteoORastrillado(a.tipo || "") &&
            isArmadoRollosLabor(a.tipo || "") &&
            a.estado !== "Cancelada"
        ) || null
      );
    } catch {
      return null;
    }
  }, [form.campo, form.lote, form.id]);

  useEffect(() => {
    if (!open) return;
    if (editingActivity) {
      setForm({
        ...editingActivity,
        insumos: isRolloLabor(editingActivity.tipo) ? [] : (editingActivity.insumos || []),
      });
      const isGroup = Boolean(
        editingActivity.esGrupal ||
        (editingActivity.lotesAfectados && editingActivity.lotesAfectados.length > 1)
      );
      setIsMultiLote(isGroup);
      const isVolteoORastrill = isVolteoORastrillado(editingActivity.tipo);
      const isRollOrHarv =
        !isVolteoORastrill &&
        (editingActivity.tipo === "Cosecha" ||
          editingActivity.tipo === "Picado" ||
          editingActivity.tipo === "Rollos" ||
          editingActivity.tipo === "Armado de rollos" ||
          editingActivity.tipo === "Sacado de rollos" ||
          isArmadoRollosLabor(editingActivity.tipo) ||
          isSacadoRollosLabor(editingActivity.tipo));
      setShowProduccion(
        Boolean(
          editingActivity.produccion &&
          (editingActivity.produccion.rendimiento !== null || editingActivity.produccion.cantidad !== null)
        ) || isRollOrHarv
      );
    } else {
      const c = fixedCampo || "Aguilera";
      const dynamicLots = agricultureData.listLotes(c);
      const lotNames = dynamicLots.map((l) => l.nombre);
      const lots = lotNames.length > 0 ? lotNames : LOTES_POR_CAMPO[c] || ["Lote Único"];
      const chosenLote = fixedLote || lots[0];
      const newAct = emptyActivity(c, chosenLote, fixedCampana || "2026/27");
      setForm(newAct);
      setIsMultiLote(false);
      setShowProduccion(false);
    }
  }, [open, fixedCampo, fixedLote, fixedCampana, editingActivity]);

  const [bioTipo, setBioTipo] = useState<"liquida" | "solida">("liquida");
  const [bioCantidadUnidades, setBioCantidadUnidades] = useState<number | "">("");

  if (!open) return null;

  const isReal = form.estado === "Realizada";

  function set<K extends keyof Activity>(key: K, value: Activity[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyBiofertilizacion(tipoBio: "liquida" | "solida", unidades: number | "", supOverride?: number | null) {
    setBioTipo(tipoBio);
    setBioCantidadUnidades(unidades);

    if (!unidades || Number(unidades) <= 0) {
      return;
    }

    const cant = Number(unidades);
    const supActive = supOverride !== undefined ? supOverride : (isReal ? (form.superficieReal ?? form.superficiePlanificada) : form.superficiePlanificada);
    const supVal = supActive && supActive > 0 ? supActive : 1;

    if (tipoBio === "liquida") {
      // 1 tanque = 12 m3 = 12 kL
      const totalKl = Number((cant * 12).toFixed(2));
      const dosisKlHa = Number((totalKl / supVal).toFixed(2));
      const bioInput: ActivityInput = {
        id: "bio-efluente-liq",
        producto: "Efluente Tambo (Líquido)",
        unidad: "kL/ha",
        dosisPlanificada: dosisKlHa,
        dosisReal: isReal ? dosisKlHa : null,
        cantidadTotal: totalKl,
        unidadTotal: "kL",
        observacion: `${cant} tanques de 12 m³ (${totalKl} kL totales)`,
      };
      setForm((prev) => ({
        ...prev,
        insumos: [bioInput],
      }));
    } else {
      // 1 carro = 5 toneladas
      const totalTn = Number((cant * 5).toFixed(2));
      const dosisTnHa = Number((totalTn / supVal).toFixed(2));
      const bioInput: ActivityInput = {
        id: "bio-estiercol-sol",
        producto: "Estiércol Tambo (Sólido)",
        unidad: "t/ha",
        dosisPlanificada: dosisTnHa,
        dosisReal: isReal ? dosisTnHa : null,
        cantidadTotal: totalTn,
        unidadTotal: "tn",
        observacion: `${cant} carros de 5 tn (${totalTn} tn totales)`,
      };
      setForm((prev) => ({
        ...prev,
        insumos: [bioInput],
      }));
    }
  }

  function handleCampoChange(nuevoCampo: string) {
    const dynamicLots = agricultureData.listLotes(nuevoCampo);
    const lotNames = dynamicLots.map((l) => l.nombre);
    const nuevosLotes = lotNames.length > 0 ? lotNames : LOTES_POR_CAMPO[nuevoCampo] || ["Lote Único"];
    const firstLote = nuevosLotes[0];
    const found = dynamicLots.find((l) => l.nombre === firstLote);
    const ha = found?.superficieHa || null;
    setForm((prev) => ({
      ...prev,
      campo: nuevoCampo,
      lote: firstLote,
      superficiePlanificada: ha !== null ? ha : prev.superficiePlanificada,
      superficieReal: ha !== null ? ha : prev.superficieReal,
      cultivo: prev.cultivo || "",
    }));
    if (isBiofertilizacion(form.tipo) && bioCantidadUnidades) {
      applyBiofertilizacion(bioTipo, bioCantidadUnidades, ha);
    }
  }

  function handleLoteChange(nuevoLote: string) {
    const dynamicLots = agricultureData.listLotes(form.campo);
    const found = dynamicLots.find((l) => l.nombre === nuevoLote);
    const ha = found?.superficieHa || null;
    setForm((prev) => ({
      ...prev,
      lote: nuevoLote,
      superficiePlanificada: ha !== null ? ha : prev.superficiePlanificada,
      superficieReal: ha !== null ? ha : prev.superficieReal,
    }));
    if (isBiofertilizacion(form.tipo) && bioCantidadUnidades) {
      applyBiofertilizacion(bioTipo, bioCantidadUnidades, ha);
    }
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
    setForm((prev) => ({ ...prev, insumos: [...prev.insumos, newInput("")] }));
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
    const finalCultivo = form.tipo === "Barbecho"
      ? (form.cultivo?.trim() || "Barbecho")
      : (form.cultivo || "");

    const validInsumos = form.insumos.filter(
      (i) => (i.producto && i.producto.trim().length > 0) || i.cantidadTotal || i.dosisReal || i.dosisPlanificada
    );

    // Deducir cultivo antecesor automáticamente del historial del lote
    let autoCultivoAntecesor = form.cultivoAntecesor || "";
    if (!autoCultivoAntecesor) {
      const pastActivities = agricultureData.listActivities();
      const match = pastActivities.find(
        (a) =>
          a.id !== form.id &&
          a.campo.toLowerCase() === form.campo.toLowerCase() &&
          a.lote?.toLowerCase() === (form.lote || "").toLowerCase() &&
          a.cultivo &&
          a.cultivo.trim().length > 0 &&
          a.cultivo.toLowerCase() !== "barbecho" &&
          a.cultivo.toLowerCase() !== (finalCultivo || "").toLowerCase()
      );
      if (match && match.cultivo) {
        autoCultivoAntecesor = match.cultivo;
      } else {
        const foundLote = agricultureData.listLotes(form.campo).find((l) => l.nombre === form.lote);
        if (foundLote?.cultivoActual && foundLote.cultivoActual.toLowerCase() !== (finalCultivo || "").toLowerCase()) {
          autoCultivoAntecesor = foundLote.cultivoActual;
        }
      }
    }

    const activityToSave: Activity = {
      ...form,
      insumos: isRolloLabor(form.tipo) ? [] : validInsumos,
      cultivo: finalCultivo,
      cultivoAntecesor: autoCultivoAntecesor || undefined,
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

  const isTambo = (form.campo || "").toLowerCase() === "tambo";

  const allTiposActividad = Array.from(
    new Set([
      "Siembra",
      "Barbecho",
      "Fumigación",
      "Fertilización",
      ...(isTambo ? ["Biofertilización"] : []),
      "Volteo",
      "Rastrillado",
      "Armado de rollos",
      "Sacado de rollos",
      "Subsolado",
      "Laboreo",
      "Rastra de discos",
      "Cosecha",
      "Picado",
      "Pastoreo",
      "Monitoreo",
      ...tiposActividad.filter((t) => isTambo || !t.toLowerCase().includes("biofertiliz")),
      ...(form.tipo ? [form.tipo] : []),
    ])
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
                    onChange={(e) => handleLoteChange(e.target.value)}
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
                <label>Cultivo {form.tipo === "Barbecho" ? "(Barbecho general)" : "(opcional)"}</label>
                <input
                  className="input"
                  value={form.cultivo}
                  onChange={(e) => set("cultivo", e.target.value)}
                  placeholder={form.tipo === "Barbecho" ? "Barbecho (sin cultivo comercial)" : "ej: Maíz, Soja, o dejar en blanco..."}
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
                    onChange={(e) => handleLoteChange(e.target.value)}
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
                  <label>Cultivo {form.tipo === "Barbecho" ? "(Barbecho general)" : "(opcional)"}</label>
                  <input
                    className="input"
                    value={form.cultivo}
                    onChange={(e) => set("cultivo", e.target.value)}
                    placeholder={form.tipo === "Barbecho" ? "Barbecho (sin cultivo comercial)" : "ej: Maíz, Soja, o dejar en blanco..."}
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
                    <label>Cultivo objetivo o destino {form.tipo === "Barbecho" ? "(Barbecho)" : "(opcional)"}</label>
                    <input
                      className="input"
                      value={form.cultivo}
                      onChange={(e) => set("cultivo", e.target.value)}
                      placeholder={form.tipo === "Barbecho" ? "Barbecho (sin cultivo comercial)" : "ej: Barbecho, Maíz, o dejar en blanco..."}
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div>
              <label>Tipo de labor</label>
              <input
                className="input"
                value={form.tipo}
                onChange={(e) => {
                  const newTipo = e.target.value;
                  const newMaq = getDefaultMaquinaria(newTipo);
                  const sinInsumos = isLaborSinInsumos(newTipo);
                  const esRollo = isRolloLabor(newTipo);
                  setForm((prev) => {
                    let nextInsumos = prev.insumos;
                    if (esRollo) {
                      nextInsumos = [];
                    } else if (sinInsumos && prev.insumos.length <= 1 && (!prev.insumos[0] || !prev.insumos[0].producto)) {
                      nextInsumos = [];
                    } else if (!sinInsumos && prev.insumos.length === 0 && !isBiofertilizacion(newTipo)) {
                      nextInsumos = [newInput("")];
                    }
                    return {
                      ...prev,
                      tipo: newTipo,
                      maquinaria: newMaq,
                      cultivo: newTipo.toLowerCase().includes("barbecho")
                        ? "Barbecho"
                        : (prev.cultivo === "Barbecho" ? "" : prev.cultivo),
                      insumos: nextInsumos,
                    };
                  });
                  const isVolteoORastrill = isVolteoORastrillado(newTipo);
                  const isSacado = isSacadoRollosLabor(newTipo);
                  const isArmado =
                    !isVolteoORastrill &&
                    !isSacado &&
                    (isArmadoRollosLabor(newTipo) ||
                      newTipo.toLowerCase().includes("armado") ||
                      newTipo.toLowerCase().includes("rollo") ||
                      newTipo.toLowerCase().includes("confecci") ||
                      newTipo.toLowerCase().includes("enrollad"));
                  const isCosechaPicado =
                    newTipo.toLowerCase().includes("cosecha") ||
                    newTipo.toLowerCase().includes("picado") ||
                    isArmado ||
                    isSacado;
                  if (isCosechaPicado) {
                    setShowProduccion(true);
                    if (isArmado) {
                      setForm((prev) => ({
                        ...prev,
                        produccion: prev.produccion || {
                          rendimiento: null,
                          unidadRendimiento: "rollos/ha",
                          cantidad: null,
                          unidad: "rollos",
                          destino: (prev.campo || "").toLowerCase() === "tambo" ? "Tambo (Patio de forrajes)" : `Almacenado en ${prev.campo || "campo"}`,
                          fechaVolteada: previousVolteo ? (previousVolteo.fechaReal || previousVolteo.fechaPlanificada) : "",
                          fechaRastrillado: previousRastrillado ? (previousRastrillado.fechaReal || previousRastrillado.fechaPlanificada) : "",
                          rollosDesglose: {
                            avena: null,
                            alfalfa: null,
                            rastrojo: null,
                          },
                        },
                      }));
                    } else if (isSacado) {
                      const prevProd = previousArmado?.produccion;
                      const defaultDestino = (form.campo || "").toLowerCase() === "tambo"
                        ? "Tambo (Patio de forrajes)"
                        : `Almacenado en ${form.campo || "este campo"}`;
                      setForm((prev) => ({
                        ...prev,
                        produccion: prev.produccion || {
                          rendimiento: prevProd?.rendimiento ?? null,
                          unidadRendimiento: "rollos/ha",
                          cantidad: prevProd?.cantidad ?? null,
                          unidad: "rollos",
                          destino: defaultDestino,
                          fechaArmado: previousArmado ? (previousArmado.fechaReal || previousArmado.fechaPlanificada) : "",
                          fechaVolteada: prevProd?.fechaVolteada || (previousVolteo ? (previousVolteo.fechaReal || previousVolteo.fechaPlanificada) : ""),
                          fechaRastrillado: prevProd?.fechaRastrillado || (previousRastrillado ? (previousRastrillado.fechaReal || previousRastrillado.fechaPlanificada) : ""),
                          rollosDesglose: prevProd?.rollosDesglose || {
                            avena: null,
                            alfalfa: null,
                            rastrojo: null,
                          },
                        },
                      }));
                    }
                  } else {
                    setShowProduccion(false);
                  }
                }}
                placeholder="Elegir o escribir labor (ej: Subsolado)..."
                list="tipos-labor-preset"
              />
              <datalist id="tipos-labor-preset">
                {allTiposActividad.map((tipo) => (
                  <option key={tipo} value={tipo} />
                ))}
              </datalist>
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
        </div>

        {/* SECCIÓN 4: Insumos y Dosis (Oculto para actividades de rollos) */}
        {!isRolloLabor(form.tipo) && (
          <div className="formSection">
            <div style={{ marginBottom: "12px" }}>
              <h3>Insumos y Dosis</h3>
              <p className="muted" style={{ fontSize: "12px", margin: 0 }}>
                Productos, fertilizantes, semillas o agroquímicos aplicados sobre la superficie seleccionada.
              </p>
            </div>

          {isBiofertilizacion(form.tipo) && (
            <div
              style={{
                padding: "14px 16px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "10px",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <strong style={{ fontSize: "13.5px", color: "#166534" }}>
                    🐄 Biofertilización en Lotes del Tambo
                  </strong>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#15803d" }}>
                    Cargá directamente la cantidad de tanques o carros aplicados en el lote:
                  </p>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => applyBiofertilizacion("liquida", bioCantidadUnidades)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: bioTipo === "liquida" ? "#0284c7" : "#cbd5e1",
                      background: bioTipo === "liquida" ? "#0284c7" : "#ffffff",
                      color: bioTipo === "liquida" ? "#ffffff" : "#475569",
                    }}
                  >
                    💧 Líquida (Tanques de 12 m³)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBiofertilizacion("solida", bioCantidadUnidades)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: bioTipo === "solida" ? "#16a34a" : "#cbd5e1",
                      background: bioTipo === "solida" ? "#16a34a" : "#ffffff",
                      color: bioTipo === "solida" ? "#ffffff" : "#475569",
                    }}
                  >
                    🚜 Sólida (Carros de 5 tn)
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ minWidth: "220px" }}>
                  <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#166534", display: "block", marginBottom: "4px" }}>
                    {bioTipo === "liquida"
                      ? "Cantidad de Tanques aplicados (12 m³ c/u):"
                      : "Cantidad de Carros aplicados (5 tn c/u):"}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    className="input"
                    value={bioCantidadUnidades}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : "";
                      applyBiofertilizacion(bioTipo, val);
                    }}
                    placeholder={bioTipo === "liquida" ? "ej: 4 tanques" : "ej: 6 carros"}
                    style={{ fontWeight: 700, fontSize: "13.5px", borderColor: "#86efac" }}
                  />
                </div>

                {Number(bioCantidadUnidades) > 0 && (
                  <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: "8px", border: "1px solid #bbf7d0", fontSize: "12px", color: "#166534" }}>
                    {bioTipo === "liquida" ? (
                      <span>
                        ✓ <strong>{Number(bioCantidadUnidades) * 12} kL (m³) totales</strong> aplicados · Dosis calculada: <strong>{((Number(bioCantidadUnidades) * 12) / (isReal ? (form.superficieReal || 1) : (form.superficiePlanificada || 1))).toFixed(2)} kL/ha</strong> sobre {isReal ? (form.superficieReal || 0) : (form.superficiePlanificada || 0)} ha
                      </span>
                    ) : (
                      <span>
                        ✓ <strong>{Number(bioCantidadUnidades) * 5} toneladas totales</strong> aplicadas · Dosis calculada: <strong>{((Number(bioCantidadUnidades) * 5) / (isReal ? (form.superficieReal || 1) : (form.superficiePlanificada || 1))).toFixed(2)} tn/ha</strong> sobre {isReal ? (form.superficieReal || 0) : (form.superficiePlanificada || 0)} ha
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isBiofertilizacion(form.tipo) && (
            <>
              {isLaborSinInsumos(form.tipo) && form.insumos.length === 0 ? (
                <div
                  style={{
                    padding: "16px 20px",
                    background: "var(--slate-50)",
                    borderRadius: "8px",
                    border: "1px dashed var(--slate-300)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "13.5px", color: "var(--slate-800)" }}>
                      ✓ Labor mecánica de suelo sin insumos ({form.tipo})
                    </strong>
                    <p style={{ margin: "3px 0 0", fontSize: "12px", color: "var(--slate-500)" }}>
                      Para esta labor no se requiere cargar productos ni agroquímicos. Podés guardar directamente la labor.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondaryButton smallButton"
                    onClick={addInput}
                  >
                    + Agregar insumo si fuese necesario
                  </button>
                </div>
              ) : form.insumos.length === 0 ? (
                <div style={{ padding: "16px", background: "var(--slate-50)", borderRadius: "8px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                  Esta labor no registra insumos cargados.
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

                        <div style={{ marginTop: "8px" }}>
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
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: "14px" }}>
                <button
                  type="button"
                  className="secondaryButton"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    borderRadius: "8px",
                  }}
                  onClick={addInput}
                >
                  + Agregar insumo
                </button>
              </div>
            </>
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
        )}

        {/* SECCIÓN 5: Producción / Rendimiento (Cosecha, Picado, Armado de Rollos o Sacado de Rollos) */}
        {(form.tipo === "Cosecha" ||
          form.tipo === "Picado" ||
          (!isVolteoORastrillado(form.tipo) &&
            (form.tipo === "Armado de rollos" ||
              form.tipo === "Sacado de rollos" ||
              form.tipo === "Rollos" ||
              isArmadoRollosLabor(form.tipo) ||
              isSacadoRollosLabor(form.tipo)))) && (
          <div className="formSection">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div>
                <h3>
                  {isSacadoRollosLabor(form.tipo)
                    ? "🚜 Sacado de Rollos del Lote y Destino"
                    : isArmadoRollosLabor(form.tipo) || form.tipo.toLowerCase().includes("rollo")
                    ? "Confección y Armado de Rollos"
                    : "Resultado Productivo / Cosecha / Forraje"}
                </h3>
                <p className="muted" style={{ fontSize: "12px", margin: 0 }}>
                  {isSacadoRollosLabor(form.tipo)
                    ? "4° y última etapa: retiro físico de los rollos del lote y selección del destino (almacenamiento en este campo o traslado al Tambo)."
                    : isArmadoRollosLabor(form.tipo) || form.tipo.toLowerCase().includes("rollo")
                    ? "Rollos obtenidos por especie (Avena / Alfalfa / Rastrojo), rendimiento (rollos/ha) y fechas de volteo y rastrillado."
                    : "Rinde por hectárea, volumen cosechado y destino productivo."}
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
                      const isSac = isSacadoRollosLabor(form.tipo);
                      const isRol = isSac || isArmadoRollosLabor(form.tipo) || form.tipo.toLowerCase().includes("rollo");
                      const defaultDest = isSac || isRol
                        ? ((form.campo || "").toLowerCase() === "tambo" ? "Tambo (Patio de forrajes)" : `Almacenado en ${form.campo}`)
                        : (form.tipo === "Picado" ? "Silo" : "Grano");
                      const prevProd = isSac ? previousArmado?.produccion : undefined;
                      set("produccion", {
                        rendimiento: prevProd?.rendimiento ?? null,
                        unidadRendimiento: form.tipo === "Picado" ? "m/ha" : isRol ? "rollos/ha" : "qq/ha",
                        cantidad: prevProd?.cantidad ?? null,
                        unidad: form.tipo === "Picado" ? "metros silo" : isRol ? "rollos" : "kg",
                        destino: prevProd?.destino || defaultDest,
                        fechaArmado: previousArmado ? (previousArmado.fechaReal || previousArmado.fechaPlanificada) : "",
                        fechaVolteada: previousVolteo ? (previousVolteo.fechaReal || previousVolteo.fechaPlanificada) : "",
                        fechaRastrillado: previousRastrillado ? (previousRastrillado.fechaReal || previousRastrillado.fechaPlanificada) : "",
                        rollosDesglose: prevProd?.rollosDesglose || {
                          avena: null,
                          alfalfa: null,
                          rastrojo: null,
                        },
                      });
                    }
                  }}
                >
                  + Cargar rendimiento / rollos
                </button>
              )}
            </div>

            {showProduccion && (
              isSacadoRollosLabor(form.tipo) ? (
                /* VISTA ESPECÍFICA: SACADO DE ROLLOS DEL LOTE Y SELECCIÓN DE DESTINO */
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Banner 4° etapa */}
                  <div
                    style={{
                      background: "rgba(37, 99, 235, 0.08)",
                      border: "1px solid rgba(37, 99, 235, 0.25)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "12.5px",
                      color: "#1e40af",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>🚜</span>
                    <div>
                      <strong>4° y Última Etapa del Ciclo de Rollos:</strong> Registrá el retiro de los rollos del lote y seleccioná su destino final (si quedaron acopiados en <strong>{form.campo}</strong> o si se llevaron al <strong>Tambo</strong>).
                    </div>
                  </div>

                  {/* Banner de Labor Previa de Armado Detectada */}
                  {previousArmado && (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <div style={{ fontSize: "12.5px", color: "#166534" }}>
                        💡 <strong>Armado previo detectado en este lote:</strong>{" "}
                        <strong>{previousArmado.produccion?.cantidad || "Varios"} rollos</strong>
                        {previousArmado.produccion?.rollosDesglose ? (
                          <span>
                            {" "}
                            (
                            {[
                              previousArmado.produccion.rollosDesglose.avena ? `${previousArmado.produccion.rollosDesglose.avena} avena` : "",
                              previousArmado.produccion.rollosDesglose.alfalfa ? `${previousArmado.produccion.rollosDesglose.alfalfa} alfalfa` : "",
                              previousArmado.produccion.rollosDesglose.rastrojo ? `${previousArmado.produccion.rollosDesglose.rastrojo} rastrojo` : "",
                            ]
                              .filter(Boolean)
                              .join(", ")}
                            )
                          </span>
                        ) : null}{" "}
                        el {previousArmado.fechaReal || previousArmado.fechaPlanificada}.
                      </div>
                      <button
                        type="button"
                        className="secondaryButton smallButton"
                        style={{
                          fontSize: "11px",
                          padding: "4px 10px",
                          background: "#ffffff",
                          borderColor: "#86efac",
                          color: "#15803d",
                          fontWeight: 700,
                        }}
                        onClick={() => {
                          const p = previousArmado.produccion;
                          const defDest = (form.campo || "").toLowerCase() === "tambo" ? "Tambo (Patio de forrajes)" : `Almacenado en ${form.campo}`;
                          set("produccion", {
                            ...form.produccion,
                            cantidad: p?.cantidad ?? form.produccion?.cantidad ?? null,
                            rendimiento: p?.rendimiento ?? form.produccion?.rendimiento ?? null,
                            unidad: "rollos",
                            unidadRendimiento: "rollos/ha",
                            destino: form.produccion?.destino || defDest,
                            fechaArmado: previousArmado.fechaReal || previousArmado.fechaPlanificada || "",
                            fechaVolteada: p?.fechaVolteada || "",
                            fechaRastrillado: p?.fechaRastrillado || "",
                            rollosDesglose: p?.rollosDesglose || form.produccion?.rollosDesglose || {
                              avena: null,
                              alfalfa: null,
                              rastrojo: null,
                            },
                          });
                        }}
                      >
                        ⚡ Copiar datos del armado
                      </button>
                    </div>
                  )}

                  {/* SELECCIÓN DE DESTINO: ¿Almacenados en este campo o llevados al tambo? */}
                  <div>
                    <label style={{ fontWeight: 700, fontSize: "13px", color: "var(--slate-800)", display: "block", marginBottom: "6px" }}>
                      📍 Destino de los Rollos Retirados:
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px", marginBottom: "10px" }}>
                      {/* Opción 1: Almacenado en este campo */}
                      <div
                        onClick={() => {
                          const dest = (form.campo || "").toLowerCase() === "tambo" ? "Tambo (Patio de forrajes)" : `Almacenado en ${form.campo}`;
                          set("produccion", {
                            ...form.produccion,
                            destino: dest,
                            unidad: "rollos",
                            unidadRendimiento: "rollos/ha",
                            cantidad: form.produccion?.cantidad ?? null,
                            rendimiento: form.produccion?.rendimiento ?? null,
                          });
                        }}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "8px",
                          border: (form.produccion?.destino?.toLowerCase().includes("almacen") || form.produccion?.destino?.toLowerCase().includes((form.campo || "").toLowerCase()))
                            ? "2px solid #2563eb"
                            : "1px solid var(--line)",
                          background: (form.produccion?.destino?.toLowerCase().includes("almacen") || form.produccion?.destino?.toLowerCase().includes((form.campo || "").toLowerCase()))
                            ? "#eff6ff"
                            : "#ffffff",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <strong style={{ fontSize: "13px", color: "#1e40af" }}>
                            🏠 Almacenado en {form.campo}
                          </strong>
                          {(form.produccion?.destino?.toLowerCase().includes("almacen") || form.produccion?.destino?.toLowerCase().includes((form.campo || "").toLowerCase())) && (
                            <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: 700 }}>✓ Seleccionado</span>
                          )}
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "var(--slate-500)" }}>
                          Quedan guardados en el galpón, tinglado o cabecera de este campo ({form.campo}).
                        </p>
                      </div>

                      {/* Opción 2: Llevado al Tambo */}
                      <div
                        onClick={() => {
                          set("produccion", {
                            ...form.produccion,
                            destino: "Llevado al Tambo",
                            unidad: "rollos",
                            unidadRendimiento: "rollos/ha",
                            cantidad: form.produccion?.cantidad ?? null,
                            rendimiento: form.produccion?.rendimiento ?? null,
                          });
                        }}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "8px",
                          border: form.produccion?.destino?.toLowerCase().includes("tambo")
                            ? "2px solid #16a34a"
                            : "1px solid var(--line)",
                          background: form.produccion?.destino?.toLowerCase().includes("tambo")
                            ? "#f0fdf4"
                            : "#ffffff",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <strong style={{ fontSize: "13px", color: "#166534" }}>
                            🥛 Llevado al Tambo
                          </strong>
                          {form.produccion?.destino?.toLowerCase().includes("tambo") && (
                            <span style={{ fontSize: "12px", color: "#166534", fontWeight: 700 }}>✓ Seleccionado</span>
                          )}
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "var(--slate-500)" }}>
                          Trasladados al Tambo para patio de forrajes, comedero o ración de vacas lecheras.
                        </p>
                      </div>
                    </div>

                    {/* Selector para opciones adicionales */}
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                      <label style={{ fontSize: "11.5px", color: "var(--slate-600)", whiteSpace: "nowrap" }}>
                        Otras opciones de destino:
                      </label>
                      <select
                        className="input"
                        style={{ maxWidth: "340px", fontSize: "12px" }}
                        value={form.produccion?.destino || `Almacenado en ${form.campo}`}
                        onChange={(e) => {
                          set("produccion", {
                            ...form.produccion,
                            destino: e.target.value,
                            unidad: "rollos",
                            unidadRendimiento: "rollos/ha",
                            cantidad: form.produccion?.cantidad ?? null,
                            rendimiento: form.produccion?.rendimiento ?? null,
                          });
                        }}
                      >
                        <option value={`Almacenado en ${form.campo}`}>Almacenado en este campo ({form.campo})</option>
                        <option value="Llevado al Tambo">Llevado al Tambo (Patio de forrajes / Comedero)</option>
                        <option value="Ganadería (Corrales / Recría)">Ganadería (Corrales / Recría)</option>
                        <option value="Venta directa a terceros">Venta directa a terceros</option>
                      </select>
                    </div>
                  </div>

                  {/* Cantidad de rollos retirados */}
                  <div>
                    <label style={{ fontWeight: 700, fontSize: "13px", color: "var(--slate-800)", marginBottom: "6px", display: "block" }}>
                      🌾 Cantidad de Rollos Sacados del Lote:
                    </label>
                    <div className="formGrid threeForm" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                      <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                        <label style={{ fontSize: "12px", color: "var(--brand-800)", fontWeight: 700 }}>
                          🌾 Rollos de Avena
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="input"
                          value={form.produccion?.rollosDesglose?.avena ?? ""}
                          onChange={(e) => {
                            const av = e.target.value ? Number(e.target.value) : null;
                            const alf = form.produccion?.rollosDesglose?.alfalfa ?? null;
                            const rast = form.produccion?.rollosDesglose?.rastrojo ?? null;
                            const tot = (av || 0) + (alf || 0) + (rast || 0);
                            const sup = isReal ? (form.superficieReal ?? form.superficiePlanificada) : form.superficiePlanificada;
                            const rinde = tot > 0 && sup && sup > 0 ? Number((tot / sup).toFixed(2)) : null;
                            set("produccion", {
                              ...form.produccion,
                              unidad: "rollos",
                              unidadRendimiento: "rollos/ha",
                              destino: form.produccion?.destino || `Almacenado en ${form.campo}`,
                              cantidad: tot > 0 ? tot : (form.produccion?.cantidad ?? null),
                              rendimiento: rinde ?? form.produccion?.rendimiento ?? null,
                              rollosDesglose: {
                                ...form.produccion?.rollosDesglose,
                                avena: av,
                              },
                            });
                          }}
                          placeholder="ej: 40 rollos"
                        />
                      </div>

                      <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                        <label style={{ fontSize: "12px", color: "#15803d", fontWeight: 700 }}>
                          🌿 Rollos de Alfalfa
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="input"
                          value={form.produccion?.rollosDesglose?.alfalfa ?? ""}
                          onChange={(e) => {
                            const alf = e.target.value ? Number(e.target.value) : null;
                            const av = form.produccion?.rollosDesglose?.avena ?? null;
                            const rast = form.produccion?.rollosDesglose?.rastrojo ?? null;
                            const tot = (av || 0) + (alf || 0) + (rast || 0);
                            const sup = isReal ? (form.superficieReal ?? form.superficiePlanificada) : form.superficiePlanificada;
                            const rinde = tot > 0 && sup && sup > 0 ? Number((tot / sup).toFixed(2)) : null;
                            set("produccion", {
                              ...form.produccion,
                              unidad: "rollos",
                              unidadRendimiento: "rollos/ha",
                              destino: form.produccion?.destino || `Almacenado en ${form.campo}`,
                              cantidad: tot > 0 ? tot : (form.produccion?.cantidad ?? null),
                              rendimiento: rinde ?? form.produccion?.rendimiento ?? null,
                              rollosDesglose: {
                                ...form.produccion?.rollosDesglose,
                                alfalfa: alf,
                              },
                            });
                          }}
                          placeholder="ej: 35 rollos"
                        />
                      </div>

                      <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                        <label style={{ fontSize: "12px", color: "var(--slate-700)", fontWeight: 700 }}>
                          🌽 Rastrojo / Otros
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="input"
                          value={form.produccion?.rollosDesglose?.rastrojo ?? ""}
                          onChange={(e) => {
                            const rast = e.target.value ? Number(e.target.value) : null;
                            const av = form.produccion?.rollosDesglose?.avena ?? null;
                            const alf = form.produccion?.rollosDesglose?.alfalfa ?? null;
                            const tot = (av || 0) + (alf || 0) + (rast || 0);
                            const sup = isReal ? (form.superficieReal ?? form.superficiePlanificada) : form.superficiePlanificada;
                            const rinde = tot > 0 && sup && sup > 0 ? Number((tot / sup).toFixed(2)) : null;
                            set("produccion", {
                              ...form.produccion,
                              unidad: "rollos",
                              unidadRendimiento: "rollos/ha",
                              destino: form.produccion?.destino || `Almacenado en ${form.campo}`,
                              cantidad: tot > 0 ? tot : (form.produccion?.cantidad ?? null),
                              rendimiento: rinde ?? form.produccion?.rendimiento ?? null,
                              rollosDesglose: {
                                ...form.produccion?.rollosDesglose,
                                rastrojo: rast,
                              },
                            });
                          }}
                          placeholder="ej: 20 rollos"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Totales y Fecha de Armado Previo */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
                    <div>
                      <label>Total de Rollos Sacados</label>
                      <input
                        type="number"
                        step="1"
                        className="input"
                        value={form.produccion?.cantidad ?? ""}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          const sup = isReal ? (form.superficieReal ?? form.superficiePlanificada) : form.superficiePlanificada;
                          const rinde = val && sup && sup > 0 ? Number((val / sup).toFixed(2)) : form.produccion?.rendimiento ?? null;
                          set("produccion", {
                            ...form.produccion,
                            cantidad: val,
                            rendimiento: rinde,
                            unidad: "rollos",
                            unidadRendimiento: "rollos/ha",
                            destino: form.produccion?.destino || `Almacenado en ${form.campo}`,
                          });
                        }}
                        placeholder="Total rollos retirados"
                      />
                    </div>

                    {/* Fecha de Armado Previo */}
                    <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "6px", marginBottom: "4px" }}>
                        <div>
                          <label style={{ fontWeight: 700, fontSize: "12px", color: "var(--slate-800)", margin: 0 }}>
                            📦 3° Labor: Fecha de Armado
                          </label>
                          <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>
                            Fecha de confección previa.
                          </div>
                        </div>

                        {previousArmado && (
                          <button
                            type="button"
                            className="secondaryButton smallButton"
                            style={{ fontSize: "10.5px", padding: "2px 6px" }}
                            onClick={() => {
                              const fa = previousArmado.fechaReal || previousArmado.fechaPlanificada;
                              if (fa) {
                                set("produccion", {
                                  ...form.produccion,
                                  unidad: form.produccion?.unidad || "rollos",
                                  unidadRendimiento: form.produccion?.unidadRendimiento || "rollos/ha",
                                  cantidad: form.produccion?.cantidad ?? null,
                                  rendimiento: form.produccion?.rendimiento ?? null,
                                  fechaArmado: fa,
                                });
                              }
                            }}
                            title="Usar la fecha del armado registrado previamente en este lote"
                          >
                            💡 Usar ({previousArmado.fechaReal || previousArmado.fechaPlanificada})
                          </button>
                        )}
                      </div>

                      <input
                        type="date"
                        className="input"
                        style={{ maxWidth: "200px" }}
                        value={form.produccion?.fechaArmado || ""}
                        onChange={(e) => {
                          set("produccion", {
                            ...form.produccion,
                            unidad: form.produccion?.unidad || "rollos",
                            unidadRendimiento: form.produccion?.unidadRendimiento || "rollos/ha",
                            cantidad: form.produccion?.cantidad ?? null,
                            rendimiento: form.produccion?.rendimiento ?? null,
                            fechaArmado: e.target.value,
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : form.tipo.toLowerCase().includes("rollo") || form.tipo.toLowerCase().includes("armado") ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Banner de Acreditación Automática en Stock */}
                  <div
                    style={{
                      background: "rgba(22, 163, 74, 0.08)",
                      border: "1px solid rgba(22, 163, 74, 0.25)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "12.5px",
                      color: "#166534",
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>📦</span>
                    <div>
                      <strong>Acreditación Automática en Stock de Insumos:</strong> Al marcar esta labor como <em>"Realizada"</em>, los rollos anotados por cultivo se sumarán automáticamente al stock general (<strong>Rollos de Avena</strong> y/o <strong>Rollos de Alfalfa</strong>) y se valorizarán en vivo en <em>Insumos & Stock</em>.
                    </div>
                  </div>

                  {/* Desglose de Rollos por Cultivo */}
                  <div>
                    <label style={{ fontWeight: 700, fontSize: "13px", color: "var(--slate-800)", marginBottom: "6px", display: "block" }}>
                      🌾 Cantidad de Rollos Confeccionados por Cultivo:
                    </label>
                    <div className="formGrid threeForm" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                      <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                        <label style={{ fontSize: "12px", color: "var(--brand-800)", fontWeight: 700 }}>
                          🌾 Rollos de Avena
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="input"
                          value={form.produccion?.rollosDesglose?.avena ?? ""}
                          onChange={(e) => {
                            const av = e.target.value ? Number(e.target.value) : null;
                            const alf = form.produccion?.rollosDesglose?.alfalfa ?? null;
                            const rast = form.produccion?.rollosDesglose?.rastrojo ?? null;
                            const tot = (av || 0) + (alf || 0) + (rast || 0);
                            const sup = isReal ? (form.superficieReal ?? form.superficiePlanificada) : form.superficiePlanificada;
                            const rinde = tot > 0 && sup && sup > 0 ? Number((tot / sup).toFixed(2)) : null;
                            set("produccion", {
                              ...form.produccion,
                              unidad: "rollos",
                              unidadRendimiento: "rollos/ha",
                              destino: form.produccion?.destino || "Stock de Forrajes",
                              cantidad: tot > 0 ? tot : (form.produccion?.cantidad ?? null),
                              rendimiento: rinde ?? form.produccion?.rendimiento ?? null,
                              rollosDesglose: {
                                ...form.produccion?.rollosDesglose,
                                avena: av,
                              },
                            });
                          }}
                          placeholder="ej: 40 rollos"
                        />
                      </div>

                      <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                        <label style={{ fontSize: "12px", color: "#15803d", fontWeight: 700 }}>
                          🌿 Rollos de Alfalfa
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="input"
                          value={form.produccion?.rollosDesglose?.alfalfa ?? ""}
                          onChange={(e) => {
                            const alf = e.target.value ? Number(e.target.value) : null;
                            const av = form.produccion?.rollosDesglose?.avena ?? null;
                            const rast = form.produccion?.rollosDesglose?.rastrojo ?? null;
                            const tot = (av || 0) + (alf || 0) + (rast || 0);
                            const sup = isReal ? (form.superficieReal ?? form.superficiePlanificada) : form.superficiePlanificada;
                            const rinde = tot > 0 && sup && sup > 0 ? Number((tot / sup).toFixed(2)) : null;
                            set("produccion", {
                              ...form.produccion,
                              unidad: "rollos",
                              unidadRendimiento: "rollos/ha",
                              destino: form.produccion?.destino || "Stock de Forrajes",
                              cantidad: tot > 0 ? tot : (form.produccion?.cantidad ?? null),
                              rendimiento: rinde ?? form.produccion?.rendimiento ?? null,
                              rollosDesglose: {
                                ...form.produccion?.rollosDesglose,
                                alfalfa: alf,
                              },
                            });
                          }}
                          placeholder="ej: 35 rollos"
                        />
                      </div>

                      <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                        <label style={{ fontSize: "12px", color: "var(--slate-700)", fontWeight: 700 }}>
                          🌽 Rastrojo / Otros
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="input"
                          value={form.produccion?.rollosDesglose?.rastrojo ?? ""}
                          onChange={(e) => {
                            const rast = e.target.value ? Number(e.target.value) : null;
                            const av = form.produccion?.rollosDesglose?.avena ?? null;
                            const alf = form.produccion?.rollosDesglose?.alfalfa ?? null;
                            const tot = (av || 0) + (alf || 0) + (rast || 0);
                            const sup = isReal ? (form.superficieReal ?? form.superficiePlanificada) : form.superficiePlanificada;
                            const rinde = tot > 0 && sup && sup > 0 ? Number((tot / sup).toFixed(2)) : null;
                            set("produccion", {
                              ...form.produccion,
                              unidad: "rollos",
                              unidadRendimiento: "rollos/ha",
                              destino: form.produccion?.destino || "Stock de Forrajes",
                              cantidad: tot > 0 ? tot : (form.produccion?.cantidad ?? null),
                              rendimiento: rinde ?? form.produccion?.rendimiento ?? null,
                              rollosDesglose: {
                                ...form.produccion?.rollosDesglose,
                                rastrojo: rast,
                              },
                            });
                          }}
                          placeholder="ej: 20 rollos"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Totales, Rendimiento y Destino */}
                  <div className="formGrid threeForm" style={{ gridTemplateColumns: "1fr 1fr 1.2fr" }}>
                    <div>
                      <label>Total de Rollos Obtenidos</label>
                      <input
                        type="number"
                        step="1"
                        className="input"
                        value={form.produccion?.cantidad ?? ""}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          const sup = isReal ? (form.superficieReal ?? form.superficiePlanificada) : form.superficiePlanificada;
                          const rinde = val && sup && sup > 0 ? Number((val / sup).toFixed(2)) : form.produccion?.rendimiento ?? null;
                          set("produccion", {
                            ...form.produccion,
                            cantidad: val,
                            rendimiento: rinde,
                            unidad: "rollos",
                            unidadRendimiento: "rollos/ha",
                            destino: form.produccion?.destino || "Stock de Forrajes",
                          });
                        }}
                        placeholder="Total rollos confeccionados"
                      />
                    </div>

                    <div>
                      <label>Rendimiento (rollos/ha)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input"
                        value={form.produccion?.rendimiento ?? ""}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          set("produccion", {
                            ...form.produccion,
                            rendimiento: val,
                            unidadRendimiento: "rollos/ha",
                            unidad: "rollos",
                            cantidad: form.produccion?.cantidad ?? null,
                            destino: form.produccion?.destino || "Stock de Forrajes",
                          });
                        }}
                        placeholder="ej: 4.5 rollos/ha"
                      />
                    </div>

                    <div>
                      <label>Destino de los Rollos</label>
                      <select
                        className="input"
                        value={form.produccion?.destino || "En lote (Pendiente de sacado)"}
                        onChange={(e) => {
                          set("produccion", {
                            ...form.produccion,
                            destino: e.target.value,
                            unidad: "rollos",
                            unidadRendimiento: "rollos/ha",
                            cantidad: form.produccion?.cantidad ?? null,
                            rendimiento: form.produccion?.rendimiento ?? null,
                          });
                        }}
                      >
                        <option value="En lote (Pendiente de sacado)">En lote (Pendiente de sacado)</option>
                        <option value={`Almacenado en ${form.campo}`}>Almacenado en este campo ({form.campo})</option>
                        <option value="Llevado al Tambo">Llevado al Tambo (Patio de forrajes / Comedero)</option>
                        <option value="Stock de Forrajes">Stock de Forrajes (Galpón / Tinglado)</option>
                        <option value="Ganadería (Corrales / Recría)">Ganadería (Corrales / Recría)</option>
                        <option value="Venta directa">Venta directa a terceros</option>
                      </select>
                    </div>
                  </div>

                  {/* Fechas de Labores Previas: Volteo y Rastrillado */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
                    {/* Fecha de Volteo Previo */}
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
                        <div>
                          <label style={{ fontWeight: 700, fontSize: "12.5px", color: "var(--slate-800)" }}>
                            🔄 1° Labor: Fecha de Volteo
                          </label>
                          <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                            Fecha en que se volteó la andana.
                          </div>
                        </div>

                        {previousVolteo && (
                          <button
                            type="button"
                            className="secondaryButton smallButton"
                            style={{ fontSize: "10.5px", padding: "3px 7px" }}
                            onClick={() => {
                              const fv = previousVolteo.fechaReal || previousVolteo.fechaPlanificada;
                              if (fv) {
                                set("produccion", {
                                  ...form.produccion,
                                  unidad: form.produccion?.unidad || "rollos",
                                  unidadRendimiento: form.produccion?.unidadRendimiento || "rollos/ha",
                                  cantidad: form.produccion?.cantidad ?? null,
                                  rendimiento: form.produccion?.rendimiento ?? null,
                                  fechaVolteada: fv,
                                });
                              }
                            }}
                            title="Usar la fecha del volteo registrado previamente en este lote"
                          >
                            💡 Usar ({previousVolteo.fechaReal || previousVolteo.fechaPlanificada})
                          </button>
                        )}
                      </div>

                      <input
                        type="date"
                        className="input"
                        style={{ maxWidth: "200px" }}
                        value={form.produccion?.fechaVolteada || ""}
                        onChange={(e) => {
                          set("produccion", {
                            ...form.produccion,
                            unidad: form.produccion?.unidad || "rollos",
                            unidadRendimiento: form.produccion?.unidadRendimiento || "rollos/ha",
                            cantidad: form.produccion?.cantidad ?? null,
                            rendimiento: form.produccion?.rendimiento ?? null,
                            fechaVolteada: e.target.value,
                          });
                        }}
                      />
                    </div>

                    {/* Fecha de Rastrillado Previo */}
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
                        <div>
                          <label style={{ fontWeight: 700, fontSize: "12.5px", color: "var(--slate-800)" }}>
                            🚜 2° Labor: Fecha de Rastrillado
                          </label>
                          <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                            Fecha en que se rastrilló / hileró el pasto.
                          </div>
                        </div>

                        {previousRastrillado && (
                          <button
                            type="button"
                            className="secondaryButton smallButton"
                            style={{ fontSize: "10.5px", padding: "3px 7px" }}
                            onClick={() => {
                              const fr = previousRastrillado.fechaReal || previousRastrillado.fechaPlanificada;
                              if (fr) {
                                set("produccion", {
                                  ...form.produccion,
                                  unidad: form.produccion?.unidad || "rollos",
                                  unidadRendimiento: form.produccion?.unidadRendimiento || "rollos/ha",
                                  cantidad: form.produccion?.cantidad ?? null,
                                  rendimiento: form.produccion?.rendimiento ?? null,
                                  fechaRastrillado: fr,
                                });
                              }
                            }}
                            title="Usar la fecha del rastrillado registrado previamente en este lote"
                          >
                            💡 Usar ({previousRastrillado.fechaReal || previousRastrillado.fechaPlanificada})
                          </button>
                        )}
                      </div>

                      <input
                        type="date"
                        className="input"
                        style={{ maxWidth: "200px" }}
                        value={form.produccion?.fechaRastrillado || ""}
                        onChange={(e) => {
                          set("produccion", {
                            ...form.produccion,
                            unidad: form.produccion?.unidad || "rollos",
                            unidadRendimiento: form.produccion?.unidadRendimiento || "rollos/ha",
                            cantidad: form.produccion?.cantidad ?? null,
                            rendimiento: form.produccion?.rendimiento ?? null,
                            fechaRastrillado: e.target.value,
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
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
                          unidadRendimiento: form.produccion?.unidadRendimiento || (form.tipo === "Picado" ? "m/ha" : "qq/ha"),
                          cantidad: form.produccion?.cantidad ?? null,
                          unidad: form.produccion?.unidad || (form.tipo === "Picado" ? "metros silo" : "kg"),
                          destino: form.produccion?.destino || (form.tipo === "Picado" ? "Silo" : "Grano"),
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
              )
            )}
          </div>
        )}

        {/* SECCIÓN 6: Maquinaria y Operador */}
        <div className="formSection">
          <h3>Maquinaria y Operador</h3>
          <div className="formGrid two">
            <div>
              <label>Maquinaria utilizada</label>
              <input
                className="input"
                value={form.maquinaria || ""}
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
