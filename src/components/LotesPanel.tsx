"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, agricultureData, Lote, LoteStatus, isActivityInLote } from "@/lib/agricultureData";
import ActivityTable from "@/components/ActivityTable";
import NewActivityModal from "@/components/NewActivityModal";
import { getLiquidManureAnalysis, getManureAnalysis, HJB_SOIL_SYNC_EVENT } from "@/lib/soilManureData";

export const CULTIVOS_SUGERIDOS = [
  "Maíz Grano",
  "Maíz Silo",
  "Soja de 1ra",
  "Soja de 2da",
  "Trigo",
  "Trigo Catalpa",
  "Avena",
  "Avena para Rollos",
  "Alfalfa",
  "Alfalfa Forraje Tambo",
  "Pastura Consociada",
  "Moha",
  "Sorgo Forrajero",
  "Barbecho químico",
];

export const ESTADOS_LOTE: LoteStatus[] = [
  "En producción",
  "Barbecho / Descanso",
  "Pastoreo",
  "Implantación",
  "Planificado",
];

export function emptyLote(campo: string): Lote {
  return {
    id: "",
    campo,
    nombre: "",
    superficieHa: null,
    cultivoActual: "",
    estado: "En producción",
    aptitudSuelo: "Agrícola Clase I-II",
    observaciones: "",
  };
}

export function LoteModal({
  open,
  onClose,
  campoNombre,
  editingLote,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  campoNombre: string;
  editingLote: Lote | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Lote>(emptyLote(campoNombre));

  useEffect(() => {
    if (!open) return;
    if (editingLote) {
      setForm({
        ...emptyLote(campoNombre),
        ...editingLote,
        nombre: editingLote.nombre || "",
        superficieHa:
          editingLote.superficieHa !== null && editingLote.superficieHa !== undefined
            ? Number(editingLote.superficieHa)
            : null,
        cultivoActual: editingLote.cultivoActual || "",
        estado: editingLote.estado || "En producción",
        aptitudSuelo: editingLote.aptitudSuelo || "",
        observaciones: editingLote.observaciones || "",
      });
    } else {
      setForm(emptyLote(campoNombre));
    }
  }, [open, editingLote, campoNombre]);

  if (!open) return null;

  function handleSave() {
    if (!form.nombre.trim()) {
      alert("Por favor ingresá un nombre o identificación para el lote.");
      return;
    }

    const loteToSave: Lote = {
      ...form,
      id: form.id || editingLote?.id || `lote-${campoNombre.toLowerCase()}-${Date.now()}`,
      campo: campoNombre,
      nombre: form.nombre.trim(),
      superficieHa:
        form.superficieHa !== null && form.superficieHa !== undefined && form.superficieHa !== ("" as any)
          ? Number(form.superficieHa)
          : null,
      cultivoActual: form.cultivoActual?.trim() || "",
      estado: form.estado || "En producción",
      aptitudSuelo: form.aptitudSuelo?.trim() || "",
      observaciones: form.observaciones?.trim() || "",
      updatedAt: new Date().toISOString(),
    };

    agricultureData.saveLote(loteToSave);
    onSaved();
    onClose();
  }

  function handleDelete() {
    if (!form.id) return;
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseás eliminar el lote "${form.nombre}" de ${campoNombre}?\n\nEsta acción no afectará el historial de labores pasadas, pero quitará la ficha del lote.`
    );
    if (confirmDelete) {
      agricultureData.deleteLote(form.id);
      onSaved();
      onClose();
    }
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
        <div className="modalHeader">
          <div>
            <p className="eyebrow" style={{ color: "var(--brand-700)", fontWeight: 700 }}>
              Establecimiento {campoNombre}
            </p>
            <h2>{editingLote ? `Editar ${form.nombre}` : `Nuevo Lote en ${campoNombre}`}</h2>
          </div>
          <button type="button" className="iconButton" onClick={onClose} title="Cerrar">
            ×
          </button>
        </div>

        <div className="formSection noTopBorder">
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label>Nombre o Identificación del Lote *</label>
              <input
                className="input"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="ej: Lote 1, Lote Norte, Bajo 2..."
                autoFocus
              />
            </div>

            <div className="formGrid two">
              <div>
                <label>Superficie (ha)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={form.superficieHa ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      superficieHa: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="ej: 38"
                />
              </div>

              <div>
                <label>Estado Productivo</label>
                <select
                  className="input"
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value as LoteStatus })}
                >
                  {ESTADOS_LOTE.map((est) => (
                    <option key={est} value={est}>
                      {est}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label>Cultivo Actual / Uso</label>
              <input
                className="input"
                value={form.cultivoActual || ""}
                onChange={(e) => setForm({ ...form, cultivoActual: e.target.value })}
                placeholder="ej: Maíz Grano, Soja de 2da, Alfalfa..."
                list="cultivos-sugeridos-lote"
              />
              <datalist id="cultivos-sugeridos-lote">
                {CULTIVOS_SUGERIDOS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label>Aptitud / Tipo de Suelo</label>
              <input
                className="input"
                value={form.aptitudSuelo || ""}
                onChange={(e) => setForm({ ...form, aptitudSuelo: e.target.value })}
                placeholder="ej: Agrícola Clase I, Agrícola-Ganadero, Bajo dulce..."
              />
            </div>

            <div>
              <label>Observaciones y Manejo Agronómico</label>
              <textarea
                className="input textarea"
                rows={3}
                value={form.observaciones || ""}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                placeholder="Anotaciones particulares: drenaje, manejo de malezas (ej: Alepo), pendientes, etc."
              />
            </div>
          </div>
        </div>

        <div className="modalFooter" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {editingLote && (
              <button
                type="button"
                className="thResetBtn"
                style={{ color: "#dc2626", borderColor: "#fca5a5", fontWeight: 700, padding: "8px 16px" }}
                onClick={handleDelete}
                title="Eliminar este lote"
              >
                🗑️ Eliminar Lote
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" className="secondaryButton" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="primaryButton" onClick={handleSave}>
              {editingLote ? "Guardar cambios" : "Crear Lote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LotesPanel({
  campoNombre,
  lotes,
  activities,
  onChanged,
  selectedLote: controlledSelectedLote,
  onSelectLote,
}: {
  campoNombre: string;
  lotes: Lote[];
  activities: Activity[];
  onChanged: () => void;
  selectedLote?: Lote | null;
  onSelectLote?: (lote: Lote | null) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLote, setEditingLote] = useState<Lote | null>(null);

  // Estado para entrar a un lote específico y cargar actividades directamente
  const [internalSelectedLote, setInternalSelectedLote] = useState<Lote | null>(null);
  const selectedLote = controlledSelectedLote !== undefined ? controlledSelectedLote : internalSelectedLote;
  const setSelectedLote = (lote: Lote | null) => {
    if (onSelectLote) onSelectLote(lote);
    setInternalSelectedLote(lote);
  };
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  function openCreate() {
    setEditingLote(null);
    setModalOpen(true);
  }

  function openEdit(lote: Lote) {
    setEditingLote(lote);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingLote(null);
  }

  // Mantener el lote activo siempre sincronizado con la lista más reciente de lotes
  const activeLote = useMemo(() => {
    if (!selectedLote) return null;
    return (
      lotes.find(
        (l) =>
          l.id === selectedLote.id ||
          (l.campo.toLowerCase() === selectedLote.campo.toLowerCase() &&
            l.nombre.toLowerCase() === selectedLote.nombre.toLowerCase())
      ) || selectedLote
    );
  }, [selectedLote, lotes]);

  const [soilVersion, setSoilVersion] = useState(0);

  useEffect(() => {
    function onSync() {
      setSoilVersion((v) => v + 1);
    }
    window.addEventListener(HJB_SOIL_SYNC_EVENT, onSync);
    return () => window.removeEventListener(HJB_SOIL_SYNC_EVENT, onSync);
  }, []);

  const activeLoteActivities = useMemo(() => {
    if (!activeLote) return [];
    return activities.filter((act) => isActivityInLote(act, campoNombre, activeLote.nombre));
  }, [activities, activeLote, campoNombre]);

  // Resumen agronómico automático del lote: Biofertilización/ha, Fertilizantes/ha y Fumigaciones
  const resumenAgronomico = useMemo(() => {
    if (!activeLote) return null;
    const supHa = activeLote.superficieHa || 1;

    let bioLiqTanques = 0;
    let bioLiqTotalKL = 0;
    let bioSolCarros = 0;
    let bioSolTotalTn = 0;

    const fertilizantesMap = new Map<string, { dosisHa: number; totalKg: number; unidad: string }>();
    const fumigaciones: Array<{ fecha: string; tipo: string; productos: string[] }> = [];

    activeLoteActivities.forEach((act) => {
      const isBio = act.tipo.toLowerCase().includes("biofertiliz");
      const isFert = act.tipo.toLowerCase().includes("fertiliz") && !isBio;
      const isFumig =
        act.tipo.toLowerCase().includes("fumig") ||
        act.tipo.toLowerCase().includes("pulveri") ||
        act.tipo.toLowerCase().includes("barbecho");

      if (isBio) {
        const curLiquid = getLiquidManureAnalysis();
        const curSolid = getManureAnalysis();
        const m3Tanque = curLiquid.m3PorTanque || 12;
        const tnCarro = curSolid.toneladasPorCarro || 5;

        act.insumos?.forEach((ins) => {
          const p = (ins.producto || "").toLowerCase();
          const obs = (ins.observacion || "").toLowerCase();
          const total = ins.cantidadTotal || 0;
          const dosis = ins.dosisReal || ins.dosisPlanificada || (total ? total / supHa : 0);
          const isLiq =
            p.includes("líquid") ||
            p.includes("liquido") ||
            p.includes("efluente") ||
            ins.unidad.includes("kL") ||
            obs.includes("tanque") ||
            ins.id === "bio-efluente-liq";

          if (isLiq) {
            const matchTanques = obs.match(/(\d+(?:\.\d+)?)\s*tanque/i) || (act.observaciones || "").match(/(\d+(?:\.\d+)?)\s*tanque/i);
            let tCount = matchTanques ? Number(matchTanques[1]) : 0;
            if (!tCount && total) {
              const prevCapM = obs.match(/(?:tanques? de\s*)(\d+(?:\.\d+)?)\s*(?:m³|kl|l)/i);
              const prevCap = prevCapM ? parseFloat(prevCapM[1]) : 12;
              tCount = Math.round((total / prevCap) * 10) / 10;
            }
            const kl = tCount > 0 ? Number((tCount * m3Tanque).toFixed(2)) : (total || (dosis * supHa));
            bioLiqTanques += tCount;
            bioLiqTotalKL += kl;
          } else {
            const matchCarros = obs.match(/(\d+(?:\.\d+)?)\s*carro/i) || (act.observaciones || "").match(/(\d+(?:\.\d+)?)\s*carro/i);
            let cCount = matchCarros ? Number(matchCarros[1]) : 0;
            if (!cCount && total) {
              const prevCapM = obs.match(/(?:carros? de\s*)(\d+(?:\.\d+)?)\s*(?:tn|t|toneladas)/i);
              const prevCap = prevCapM ? parseFloat(prevCapM[1]) : 5;
              cCount = Math.round((total / prevCap) * 10) / 10;
            }
            const tn = cCount > 0 ? Number((cCount * tnCarro).toFixed(2)) : (total || (dosis * supHa));
            bioSolCarros += cCount;
            bioSolTotalTn += tn;
          }
        });
      } else if (isFert) {
        act.insumos?.forEach((ins) => {
          if (!ins.producto) return;
          const prod = ins.producto.trim();
          const dosis = ins.dosisReal || ins.dosisPlanificada || 0;
          const total = ins.cantidadTotal || (dosis * supHa);
          const current = fertilizantesMap.get(prod) || { dosisHa: 0, totalKg: 0, unidad: ins.unidad || "kg/ha" };
          fertilizantesMap.set(prod, {
            dosisHa: current.dosisHa + dosis,
            totalKg: current.totalKg + total,
            unidad: ins.unidad || "kg/ha",
          });
        });
      } else if (isFumig) {
        const prodList = act.insumos
          ?.filter((i) => i.producto && i.producto.trim())
          .map((i) => {
            const dosis = i.dosisReal || i.dosisPlanificada;
            return dosis ? `${i.producto} (${dosis} ${i.unidad})` : i.producto;
          }) || [];

        fumigaciones.push({
          fecha: act.fechaReal || act.fechaPlanificada || "—",
          tipo: act.tipo,
          productos: prodList.length > 0 ? prodList : ["Aplicación sin productos especificados"],
        });
      }
    });

    const bioLiqDosisHa = activeLote.superficieHa ? (bioLiqTotalKL / activeLote.superficieHa).toFixed(2) : "0";
    const bioSolDosisHa = activeLote.superficieHa ? (bioSolTotalTn / activeLote.superficieHa).toFixed(2) : "0";

    return {
      bioLiqTotalKL: Math.round(bioLiqTotalKL * 10) / 10,
      bioLiqTanques: Math.round(bioLiqTanques * 10) / 10,
      bioLiqDosisHa,
      bioSolTotalTn: Math.round(bioSolTotalTn * 10) / 10,
      bioSolCarros: Math.round(bioSolCarros * 10) / 10,
      bioSolDosisHa,
      fertilizantes: Array.from(fertilizantesMap.entries()).map(([nombre, d]) => ({
        nombre,
        dosisHa: Math.round(d.dosisHa * 10) / 10,
        totalKg: Math.round(d.totalKg * 10) / 10,
        unidad: d.unidad,
      })),
      fumigaciones,
    };
  }, [activeLote, activeLoteActivities, soilVersion]);

  // Métricas resumidas de los lotes de este campo
  const stats = useMemo(() => {
    const totalSuperficie = lotes.reduce((acc, l) => acc + (l.superficieHa || 0), 0);
    const enProduccion = lotes.filter((l) => l.estado === "En producción").length;
    const enPastoreo = lotes.filter((l) => l.estado === "Pastoreo").length;
    return {
      count: lotes.length,
      totalSuperficie,
      enProduccion,
      enPastoreo,
    };
  }, [lotes]);

  // VISTA 1: DETALLE DE UN LOTE ESPECÍFICO (Para cargar labores seguidas en este lote)
  if (activeLote) {
    const cleanObservaciones =
      activeLote.observaciones && !/^\d+\s*ha$/i.test(activeLote.observaciones.trim())
        ? activeLote.observaciones
        : null;

    return (
      <div>
        {/* Barra de navegación superior y acciones del lote */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div>
            <button
              type="button"
              className="thResetBtn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--brand-700)",
                marginBottom: "8px",
                cursor: "pointer",
              }}
              onClick={() => setSelectedLote(null)}
            >
              ← Volver a todos los lotes de {campoNombre}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>
                {campoNombre} — {activeLote.nombre}
              </h2>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="tableAction"
              style={{ padding: "8px 16px", fontWeight: 700, borderColor: "var(--line)" }}
              onClick={() => openEdit(activeLote)}
            >
              ✏️ Editar Lote
            </button>
            <button
              type="button"
              className="primaryButton"
              style={{
                padding: "8px 20px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
              }}
              onClick={() => {
                setEditingActivity(null);
                setActivityModalOpen(true);
              }}
            >
              + Cargar labor en {activeLote.nombre}
            </button>
          </div>
        </div>

        {/* Ficha Resumen de Lote */}
        <div
          className="tableCard"
          style={{
            padding: "16px 20px",
            marginBottom: "20px",
            background: "#ffffff",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ fontSize: "11.5px", textTransform: "uppercase", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.5px" }}>
              Superficie
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--slate-900)", marginTop: "3px" }}>
              {activeLote.superficieHa ? `${activeLote.superficieHa} ha` : "Sin definir"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11.5px", textTransform: "uppercase", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.5px" }}>
              Cultivo Actual
            </div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--slate-900)", marginTop: "4px" }}>
              {activeLote.cultivoActual || "Sin cultivo asignado"}
            </div>
          </div>


          <div>
            <div style={{ fontSize: "11.5px", textTransform: "uppercase", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.5px" }}>
              Labores en Historial
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--brand-700)", marginTop: "3px" }}>
              {activeLoteActivities.length} {activeLoteActivities.length === 1 ? "labor" : "labores"}
            </div>
          </div>

          {cleanObservaciones && (
            <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--line)", paddingTop: "10px", fontSize: "13px", color: "var(--slate-600)", fontStyle: "italic" }}>
              <strong>Observaciones:</strong> {cleanObservaciones}
            </div>
          )}
        </div>

        {/* TABLA EJECUTIVA AGRONÓMICA: Cultivo | Biofertilizante/ha | Fertilizante/ha | Con qué se fumigó */}
        <div style={{ marginBottom: "26px" }}>
          <div className="tableWrap" style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid var(--line)", overflow: "hidden" }}>
            <table className="dataTable" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: campoNombre.toLowerCase() === "tambo" ? "20%" : "25%" }}>Cultivo</th>
                  {campoNombre.toLowerCase() === "tambo" && (
                    <th style={{ width: "26%" }}>Biofertilización / ha</th>
                  )}
                  <th style={{ width: campoNombre.toLowerCase() === "tambo" ? "26%" : "35%" }}>Fertilización / ha</th>
                  <th style={{ width: campoNombre.toLowerCase() === "tambo" ? "28%" : "40%" }}>Con qué se fumigó</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {/* Cultivo */}
                  <td style={{ verticalAlign: "top" }}>
                    <div style={{ fontWeight: 700, color: "var(--slate-900)", fontSize: "14px" }}>
                      {activeLote.cultivoActual || "Campaña 2026/27"}
                    </div>
                    <span className="pill badgeGreen" style={{ fontSize: "11px", marginTop: "4px", display: "inline-block" }}>
                      {activeLote.superficieHa ? `${activeLote.superficieHa} ha` : "Lote delimitado"}
                    </span>
                  </td>

                  {/* Biofertilizante / ha (Exclusivo Tambo) */}
                  {campoNombre.toLowerCase() === "tambo" && (
                    <td style={{ verticalAlign: "top" }}>
                      {resumenAgronomico && (resumenAgronomico.bioLiqTotalKL > 0 || resumenAgronomico.bioSolTotalTn > 0) ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {resumenAgronomico.bioLiqTotalKL > 0 && (
                            <div style={{ background: "#f0f9ff", padding: "6px 10px", borderRadius: "6px", border: "1px solid #bae6fd" }}>
                              <div style={{ fontWeight: 700, color: "#0369a1", fontSize: "13px" }}>
                                💧 {resumenAgronomico.bioLiqDosisHa} kL/ha (Líquido)
                              </div>
                              <div style={{ fontSize: "11.5px", color: "#0284c7", marginTop: "2px" }}>
                                Total: {resumenAgronomico.bioLiqTotalKL} kL · {resumenAgronomico.bioLiqTanques > 0 ? `${resumenAgronomico.bioLiqTanques} tanques` : "Efluente tratado"}
                              </div>
                            </div>
                          )}
                          {resumenAgronomico.bioSolTotalTn > 0 && (
                            <div style={{ background: "#f0fdf4", padding: "6px 10px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                              <div style={{ fontWeight: 700, color: "#15803d", fontSize: "13px" }}>
                                🚜 {resumenAgronomico.bioSolDosisHa} tn/ha (Sólido)
                              </div>
                              <div style={{ fontSize: "11.5px", color: "#16a34a", marginTop: "2px" }}>
                                Total: {resumenAgronomico.bioSolTotalTn} tn · {resumenAgronomico.bioSolCarros > 0 ? `${resumenAgronomico.bioSolCarros} carros` : "Estiércol sólido"}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: "13px" }}>— Sin biofertilización registrada</span>
                      )}
                    </td>
                  )}

                  {/* Fertilizante / ha */}
                  <td style={{ verticalAlign: "top" }}>
                    {resumenAgronomico && resumenAgronomico.fertilizantes.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {resumenAgronomico.fertilizantes.map((fert, idx) => (
                          <div key={idx} style={{ background: "#f8fafc", padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontWeight: 700, color: "var(--slate-800)", fontSize: "13px" }}>
                              🌱 {fert.dosisHa} {fert.unidad}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "var(--slate-600)", marginTop: "2px" }}>
                              {fert.nombre} (Total: {fert.totalKg} kg)
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: "13px" }}>— Sin fertilización mineral</span>
                    )}
                  </td>

                  {/* Con qué se fumigó */}
                  <td style={{ verticalAlign: "top" }}>
                    {resumenAgronomico && resumenAgronomico.fumigaciones.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {resumenAgronomico.fumigaciones.map((fum, idx) => (
                          <div key={idx} style={{ background: "#f8fafc", padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px" }}>
                            <div style={{ fontWeight: 700, color: "var(--slate-800)" }}>
                              🛡️ {fum.tipo} <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: "11px" }}>({fum.fecha})</span>
                            </div>
                            <div style={{ color: "var(--slate-700)", marginTop: "2px" }}>
                              {fum.productos.join(" + ")}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: "13px" }}>— Sin fumigaciones registradas</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección Historial Completo de Labores del Lote */}
        <div style={{ marginBottom: "14px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", color: "var(--slate-900)" }}>
            Historial de Labores de {activeLote.nombre}
          </h3>
        </div>

        {activeLoteActivities.length === 0 ? (
          <div
            className="emptyState"
            style={{
              padding: "45px 20px",
              textAlign: "center",
              background: "#ffffff",
              borderRadius: "10px",
              border: "1px dashed var(--line)",
              marginBottom: "20px",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>🌱</div>
            <h4 style={{ margin: "0 0 6px 0", color: "var(--slate-800)", fontSize: "16px" }}>
              Todavía no hay labores registradas en {activeLote.nombre}
            </h4>
            <p className="muted" style={{ margin: "0 0 16px 0", fontSize: "13px" }}>
              Cargá la primera labor directamente en este lote (con las hectáreas y datos ya listos).
            </p>
            <button
              type="button"
              className="primaryButton"
              onClick={() => {
                setEditingActivity(null);
                setActivityModalOpen(true);
              }}
            >
              + Cargar primera labor en {activeLote.nombre}
            </button>
          </div>
        ) : (
          <ActivityTable
            activities={activeLoteActivities}
            onEdit={(act) => {
              setEditingActivity(act);
              setActivityModalOpen(true);
            }}
            onSaved={onChanged}
            showCampo={false}
            hideCountNote={true}
          />
        )}

        {/* Modal de Lote para edición */}
        <LoteModal
          open={modalOpen}
          onClose={closeModal}
          campoNombre={campoNombre}
          editingLote={editingLote}
          onSaved={onChanged}
        />

        {/* Modal de Carga de Labor con Lote Preseleccionado */}
        <NewActivityModal
          open={activityModalOpen}
          onClose={() => {
            setActivityModalOpen(false);
            setEditingActivity(null);
          }}
          onSaved={() => {
            onChanged();
            setActivityModalOpen(false);
            setEditingActivity(null);
          }}
          fixedCampo={campoNombre}
          fixedLote={activeLote.nombre}
          editingActivity={editingActivity}
        />
      </div>
    );
  }

  // VISTA 2: LISTA DE TODOS LOS LOTES DEL CAMPO
  return (
    <div>
      {/* Barra Superior con Métricas y Botón + Nuevo Lote */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2>Lotes y Potreros de {campoNombre}</h2>
          <p className="muted" style={{ margin: "2px 0 0 0" }}>
            Hacé clic en cualquier lote para entrar, ver su historial completo y cargar labores directamente.
          </p>
          <div className="badgeRow" style={{ marginTop: "8px" }}>
            <span className="pill badgeSlate">{stats.count} lotes configurados</span>
            <span className="pill badgeGreen">{stats.totalSuperficie.toLocaleString("es-AR")} ha loteadas</span>
            <span className="pill badgeTeal">{stats.enProduccion} en producción</span>
            {stats.enPastoreo > 0 && (
              <span className="pill badgeBlue">{stats.enPastoreo} en pastoreo</span>
            )}
          </div>
        </div>

        <button className="primaryButton" onClick={openCreate}>
          + Nuevo Lote
        </button>
      </div>

      {/* Grilla de Tarjetas de Lotes */}
      {lotes.length === 0 ? (
        <div className="emptyState" style={{ padding: "40px", textAlign: "center" }}>
          No hay lotes configurados para este campo. Hacé clic en <strong>+ Nuevo Lote</strong> para crear el primero.
        </div>
      ) : (
        <div className="fieldCardsGrid">
          {lotes.map((lote) => {
            const countLabores = activities.filter((act) =>
              isActivityInLote(act, campoNombre, lote.nombre)
            ).length;

            return (
              <div
                key={lote.id}
                className="fieldCardModern borderActive"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                onClick={() => setSelectedLote(lote)}
              >
                <div>
                  <div className="fieldCardTop">
                    <span className="fieldName" style={{ fontSize: "16px", fontWeight: 700 }}>
                      {lote.nombre}
                    </span>
                    <span
                      className={`pill ${
                        lote.estado === "En producción"
                          ? "badgeGreen"
                          : lote.estado === "Pastoreo"
                          ? "badgeTeal"
                          : lote.estado === "Barbecho / Descanso"
                          ? "badgeSlate"
                          : "badgeAmber"
                      }`}
                      style={{ fontSize: "11px" }}
                    >
                      {lote.estado}
                    </span>
                  </div>

                  <div className="fieldSuperficie" style={{ fontSize: "20px", margin: "4px 0 8px 0" }}>
                    {lote.superficieHa ? `${lote.superficieHa} ha` : "— ha"}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "var(--slate-700)", marginBottom: "12px" }}>
                    <div>
                      <strong style={{ color: "var(--slate-900)" }}>Cultivo actual: </strong>
                      <span>{lote.cultivoActual || "Sin cultivo asignado"}</span>
                    </div>

                    {lote.aptitudSuelo && (
                      <div>
                        <strong style={{ color: "var(--slate-900)" }}>Aptitud suelo: </strong>
                        <span style={{ color: "var(--muted)" }}>{lote.aptitudSuelo}</span>
                      </div>
                    )}

                    <div>
                      <strong style={{ color: "var(--slate-900)" }}>Historial: </strong>
                      <span className="pill badgeSlate" style={{ fontSize: "11px", padding: "1px 6px" }}>
                        {countLabores} {countLabores === 1 ? "labor" : "labores"} registradas
                      </span>
                    </div>

                    {lote.observaciones && (
                      <div
                        style={{
                          marginTop: "6px",
                          padding: "6px 8px",
                          background: "var(--slate-50)",
                          borderRadius: "6px",
                          fontSize: "12px",
                          color: "var(--slate-600)",
                          fontStyle: "italic",
                          borderLeft: "2px solid var(--brand-500)",
                        }}
                      >
                        {lote.observaciones}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    borderTop: "1px solid var(--line)",
                    paddingTop: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <button
                    type="button"
                    className="tableAction"
                    style={{ padding: "6px 12px", fontWeight: 600, fontSize: "12.5px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(lote);
                    }}
                    title="Editar los datos del lote"
                  >
                    ✏️ Editar Lote
                  </button>

                  <button
                    type="button"
                    className="primaryButton"
                    style={{
                      padding: "6px 14px",
                      fontWeight: 700,
                      fontSize: "12.5px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLote(lote);
                    }}
                    title="Entrar a este lote para ver su historial y cargar labores"
                  >
                    Entrar y Cargar →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Lote */}
      <LoteModal
        open={modalOpen}
        onClose={closeModal}
        campoNombre={campoNombre}
        editingLote={editingLote}
        onSaved={onChanged}
      />
    </div>
  );
}
