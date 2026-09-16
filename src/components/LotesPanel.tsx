"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, agricultureData, Lote, LoteStatus } from "@/lib/agricultureData";
import ActivityTable from "@/components/ActivityTable";
import NewActivityModal from "@/components/NewActivityModal";

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
}: {
  campoNombre: string;
  lotes: Lote[];
  activities: Activity[];
  onChanged: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLote, setEditingLote] = useState<Lote | null>(null);

  // Estado para entrar a un lote específico y cargar actividades directamente
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
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

  const activeLoteActivities = useMemo(() => {
    if (!activeLote) return [];
    return activities.filter((act) => {
      const matchesLote = (act.lote || "").toLowerCase() === activeLote.nombre.toLowerCase();
      const matchesGrupal =
        act.esGrupal &&
        act.lotesAfectados?.some((la) => la.toLowerCase().includes(activeLote.nombre.toLowerCase()));
      return matchesLote || matchesGrupal;
    });
  }, [activities, activeLote]);

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
              <span className="pill badgeGreen" style={{ fontSize: "14px", fontWeight: 700 }}>
                {activeLote.superficieHa ? `${activeLote.superficieHa} ha` : "Superficie a definir"}
              </span>
              <span
                className={`pill ${
                  activeLote.estado === "En producción"
                    ? "badgeGreen"
                    : activeLote.estado === "Pastoreo"
                    ? "badgeTeal"
                    : activeLote.estado === "Barbecho / Descanso"
                    ? "badgeSlate"
                    : "badgeAmber"
                }`}
                style={{ fontSize: "12px" }}
              >
                {activeLote.estado}
              </span>
              {activeLote.cultivoActual && (
                <span className="pill badgePurple" style={{ fontSize: "12px" }}>
                  🌾 Cultivo: {activeLote.cultivoActual}
                </span>
              )}
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
            marginBottom: "24px",
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
              Aptitud de Suelo
            </div>
            <div style={{ fontSize: "14px", color: "var(--slate-700)", marginTop: "4px" }}>
              {activeLote.aptitudSuelo || "Agrícola"}
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

          {activeLote.observaciones && (
            <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--line)", paddingTop: "10px", fontSize: "13px", color: "var(--slate-600)", fontStyle: "italic" }}>
              <strong>Observaciones:</strong> {activeLote.observaciones}
            </div>
          )}
        </div>

        {/* Sección Tabla de Labores del Lote */}
        <div style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "17px", color: "var(--slate-900)" }}>
              Historial de Labores de {activeLote.nombre} ({activeLoteActivities.length})
            </h3>
            <p className="muted" style={{ margin: "2px 0 0 0", fontSize: "13px" }}>
              Todas las labores agrícolas realizadas o planificadas exclusivamente en este lote.
            </p>
          </div>
          <button
            type="button"
            className="primaryButton"
            style={{ padding: "6px 14px", fontSize: "13px" }}
            onClick={() => {
              setEditingActivity(null);
              setActivityModalOpen(true);
            }}
          >
            + Nueva labor aquí
          </button>
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
            const countLabores = activities.filter((act) => {
              const matchesLote = (act.lote || "").toLowerCase() === lote.nombre.toLowerCase();
              const matchesGrupal = act.esGrupal && act.lotesAfectados?.some(
                (la) => la.toLowerCase() === lote.nombre.toLowerCase()
              );
              return matchesLote || matchesGrupal;
            }).length;

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
