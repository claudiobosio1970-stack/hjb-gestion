"use client";

import { useMemo, useState } from "react";
import { Activity, agricultureData, Lote, LoteStatus } from "@/lib/agricultureData";

const CULTIVOS_SUGERIDOS = [
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

const ESTADOS_LOTE: LoteStatus[] = [
  "En producción",
  "Barbecho / Descanso",
  "Pastoreo",
  "Implantación",
  "Planificado",
];

function emptyLote(campo: string): Lote {
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
  const [form, setForm] = useState<Lote>(emptyLote(campoNombre));

  function openCreate() {
    setEditingLote(null);
    setForm(emptyLote(campoNombre));
    setModalOpen(true);
  }

  function openEdit(lote: Lote) {
    setEditingLote(lote);
    setForm({ ...lote });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingLote(null);
  }

  function handleSave() {
    if (!form.nombre.trim()) {
      alert("Por favor ingresá un nombre o identificación para el lote.");
      return;
    }

    const loteToSave: Lote = {
      ...form,
      id: form.id || `lote-${campoNombre.toLowerCase()}-${Date.now()}`,
      campo: campoNombre,
      nombre: form.nombre.trim(),
      superficieHa: form.superficieHa !== null && form.superficieHa !== undefined && form.superficieHa !== ("" as any)
        ? Number(form.superficieHa)
        : null,
      updatedAt: new Date().toISOString(),
    };

    agricultureData.saveLote(loteToSave);
    onChanged();
    closeModal();
  }

  function handleDelete() {
    if (!form.id) return;
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseás eliminar el lote "${form.nombre}" de ${campoNombre}?\n\nEsta acción no afectará el historial de labores pasadas, pero quitará la ficha del lote.`
    );
    if (confirmDelete) {
      agricultureData.deleteLote(form.id);
      onChanged();
      closeModal();
    }
  }

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
            Superficie asignada, cultivo actual, estado productivo y aptitud de suelo de cada lote.
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
            // Contar labores históricas asociadas a este lote
            const countLabores = activities.filter((act) => {
              const matchesLote = (act.lote || "").toLowerCase() === lote.nombre.toLowerCase();
              const matchesGrupal = act.esGrupal && act.lotesAfectados?.some(
                (la) => la.toLowerCase() === lote.nombre.toLowerCase()
              );
              return matchesLote || matchesGrupal;
            }).length;

            return (
              <div key={lote.id} className="fieldCardModern borderActive" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  {/* Encabezado tarjeta */}
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

                  {/* Superficie */}
                  <div className="fieldSuperficie" style={{ fontSize: "20px", margin: "4px 0 8px 0" }}>
                    {lote.superficieHa ? `${lote.superficieHa} ha` : "— ha"}
                  </div>

                  {/* Detalles agronómicos */}
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

                {/* Pie de tarjeta con botón Editar */}
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="tableAction"
                    style={{ padding: "6px 14px", fontWeight: 600 }}
                    onClick={() => openEdit(lote)}
                  >
                    ✏️ Editar Lote
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Alta / Edición de Lote */}
      {modalOpen && (
        <div className="modalBackdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow" style={{ color: "var(--brand-700)", fontWeight: 700 }}>
                  Establecimiento {campoNombre}
                </p>
                <h2>{editingLote ? `Editar ${form.nombre}` : `Nuevo Lote en ${campoNombre}`}</h2>
              </div>
              <button type="button" className="iconButton" onClick={closeModal} title="Cerrar">
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
                <button type="button" className="secondaryButton" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="button" className="primaryButton" onClick={handleSave}>
                  {editingLote ? "Guardar cambios" : "Crear Lote"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
