"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import NewActivityModal from "@/components/NewActivityModal";
import ActivityTable from "@/components/ActivityTable";

import InputsPanel from "@/components/InputsPanel";
import SoilPanel from "@/components/SoilPanel";
import DocumentsPanel from "@/components/DocumentsPanel";
import LotesPanel, { LoteModal } from "@/components/LotesPanel";
import {
  Activity,
  DocumentRecord,
  Lote,
  SoilAnalysis,
  agricultureData,
} from "@/lib/agricultureData";
import { LOTES_POR_CAMPO, ROTACIONES_HISTORICAS } from "@/lib/historicalData";
import { campos } from "@/lib/mockData";

const CAMPO_NAMES: Record<string, string> = {
  aguilera: "Aguilera",
  tambo: "Tambo",
  racca: "Racca",
  kitty: "Kitty",
  keuneke: "Keuneke",
};

type Tab = "Actividades" | "Lotes" | "Rotaciones" | "Insumos" | "Biofertilización" | "Suelos" | "Documentos";

export default function CampoClientView({ campoSlug }: { campoSlug: string }) {
  const slug = campoSlug.toLowerCase();
  const campoNombre = CAMPO_NAMES[slug] || "Aguilera";

  const [tab, setTab] = useState<Tab>("Actividades");
  const [openModal, setOpenModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Estados para botón "Editar Lote" del encabezado
  const [headerLoteModalOpen, setHeaderLoteModalOpen] = useState(false);
  const [headerLoteToEdit, setHeaderLoteToEdit] = useState<Lote | null>(null);
  const [headerSelectorOpen, setHeaderSelectorOpen] = useState(false);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [soils, setSoils] = useState<SoilAnalysis[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);

  function refresh() {
    const all = agricultureData.listActivities();
    const cLower = campoNombre.toLowerCase();
    setActivities(
      all.filter((x) => {
        if (x.campo.toLowerCase() === cLower) return true;
        if (x.esGrupal && x.lotesAfectados?.some((la) => la.toLowerCase().includes(cLower))) return true;
        return false;
      })
    );
    setLotes(agricultureData.listLotes(campoNombre));
    setSoils(agricultureData.listSoilAnalyses().filter((x) => x.campo.toLowerCase() === cLower));
    setDocuments(agricultureData.listDocuments().filter((x) => x.campo.toLowerCase() === cLower));
  }

  useEffect(() => {
    refresh();
  }, [campoNombre]);

  const lotesDisponibles = lotes.length > 0 ? lotes.map((l) => l.nombre) : LOTES_POR_CAMPO[campoNombre] || ["Lote Único"];
  const campoMeta = campos.find((c) => c.nombre.toLowerCase() === campoNombre.toLowerCase());
  const rotacionesCampo = ROTACIONES_HISTORICAS.filter(
    (r) => r.campo.toLowerCase() === campoNombre.toLowerCase()
  );

  

  // Actividades de biofertilización para pestaña dedicada
  const biofertActivities = useMemo(() => {
    return activities.filter((act) => act.tipo === "Biofertilización");
  }, [activities]);

  const stats = useMemo(() => {
    const realizadas = activities.filter((x) => x.estado === "Realizada").length;
    const planificadas = activities.filter((x) => x.estado === "Planificada").length;
    const cosechas = activities.filter((x) => x.produccion && x.produccion.rendimiento !== null);
    return {
      total: activities.length,
      realizadas,
      planificadas,
      cosechasCount: cosechas.length,
    };
  }, [activities]);

  function startNew() {
    setEditingActivity(null);
    setOpenModal(true);
  }

  function startEdit(act: Activity) {
    setEditingActivity(act);
    setOpenModal(true);
  }

  function openHeaderLoteEdit() {
    if (lotes.length === 1) {
      setHeaderLoteToEdit(lotes[0]);
      setHeaderLoteModalOpen(true);
    } else if (lotes.length > 1) {
      setHeaderSelectorOpen(true);
    } else {
      setHeaderLoteToEdit(null);
      setHeaderLoteModalOpen(true);
    }
  }

  return (
    <AppShell active="Agricultura">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/agricultura" style={{ color: "var(--muted)" }}>Agricultura</Link>
        {" / "}
        <strong style={{ color: "var(--slate-800)" }}>{campoNombre}</strong>
      </div>

      {/* Header */}
      <div className="pageHeader">
        <div>
          <div className="badgeRow" style={{ marginBottom: "6px" }}>
            <span className="pill badgeGreen">Establecimiento {campoNombre}</span>
            <span className="pill badgeSlate">{campoMeta?.superficie || "Superficie centralizada"}</span>
            <span className="pill badgeBlue">{lotesDisponibles.join(" · ")}</span>
          </div>
          <h1>{campoNombre}</h1>
          <p className="muted">
            Historial agrícola completo: rotaciones, siembras, fertilizaciones, biofertilizaciones, fumigaciones y cosechas.
          </p>
        </div>
        <div className="campoHeaderActions">
          <button className="primaryButton" onClick={startNew}>
            + Registrar labor
          </button>
          <button
            type="button"
            className="tableAction"
            style={{
              padding: "8px 14px",
              fontWeight: 700,
              borderColor: "var(--brand-600)",
              color: "var(--brand-800)",
              background: "#ffffff",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: "var(--shadow-sm)",
            }}
            onClick={openHeaderLoteEdit}
            title="Editar los datos de los lotes de este campo"
          >
            ✏️ Editar Lote
          </button>
        </div>
      </div>

      {/* Métricas del Campo */}
      <div className="metricsGrid four">
        <MetricCard label="Superficie Total" value={campoMeta?.superficie || "—"} note={campoMeta?.detalle || ""} />
        <MetricCard label="Lotes Operativos" value={String(lotesDisponibles.length)} note={lotesDisponibles.slice(0, 3).join(", ") + (lotesDisponibles.length > 3 ? "..." : "")} />
        <MetricCard label="Labores Registradas" value={String(activities.length)} note={`${stats.realizadas} realizadas · ${stats.planificadas} planif.`} />
        <MetricCard label="Cosechas / Rendimientos" value={String(stats.cosechasCount)} note="Registros de rinde documentados" />
      </div>

      {/* Selector de Pestañas */}
      <div className="tabs">
        {(["Actividades", "Lotes", "Rotaciones", "Insumos", "Biofertilización", "Suelos", "Documentos"] as Tab[]).map((name) => (
          <button
            key={name}
            className={tab === name ? "tab active" : "tab"}
            onClick={() => setTab(name)}
          >
            {name === "Biofertilización" && campoNombre === "Tambo" ? "🐄 Biofertilización" : name}
            {name === "Actividades" && ` (${activities.length})`}
            {name === "Lotes" && ` (${lotes.length})`}
            {name === "Rotaciones" && ` (${rotacionesCampo.length})`}
          </button>
        ))}
      </div>

      {/* PESTAÑA: ACTIVIDADES */}
      {tab === "Actividades" && (
        <section className="panel">
          {/* Barra de Filtros Completa */}
          <ActivityTable activities={activities} onEdit={startEdit} onSaved={refresh} showCampo={false} />
        </section>
      )}

      {/* PESTAÑA: LOTES */}
      {tab === "Lotes" && (
        <section className="panel">
          <LotesPanel
            campoNombre={campoNombre}
            lotes={lotes}
            activities={activities}
            onChanged={refresh}
          />
        </section>
      )}

      {/* PESTAÑA: ROTACIONES Y SECUENCIAS HISTÓRICAS */}
      {tab === "Rotaciones" && (
        <section className="panel">
          <div className="sectionTitle">
            <div>
              <h2>Secuencia y Rotaciones Agrícolas</h2>
              <p className="muted">
                Historial cronológico lote por lote que muestra el cultivo antecesor, la siembra y los rindes alcanzados.
              </p>
            </div>
          </div>

          <div className="rotationGrid">
            {rotacionesCampo.length ? (
              rotacionesCampo.map((rot) => (
                <div key={rot.lote} className="rotationCard">
                  <div className="rotationHeader">
                    <span className="rotationLoteName">{rot.lote}</span>
                    <span className="pill badgeGreen">{campoNombre}</span>
                  </div>
                  <div className="rotationSteps">
                    {rot.rotaciones.map((step) => (
                      <div key={step.campana} className="rotationStep">
                        <span className="rotationCampana">{step.campana}</span>
                        <span className="rotationCrop">{step.cultivo}</span>
                        <div className="rotationYield">
                          <strong>Rendimiento:</strong> {step.rendimiento}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="emptyState">No se encontraron rotaciones cargadas para este campo.</div>
            )}
          </div>
        </section>
      )}

      {/* PESTAÑA: INSUMOS */}
      {tab === "Insumos" && (
        <section className="panel">
          <div className="sectionTitle">
            <div>
              <h2>Consumo de Insumos y Semillas</h2>
              <p className="muted">
                Agregación calculada automáticamente sobre las labores registradas en {campoNombre}.
              </p>
            </div>
          </div>
          <InputsPanel activities={activities} />
        </section>
      )}

      {/* PESTAÑA: BIOFERTILIZACIÓN */}
      {tab === "Biofertilización" && (
        <section className="panel">
          <div className="sectionTitle">
            <div>
              <h2>Historial de Biofertilización Orgánica</h2>
              <p className="muted">
                Aplicaciones reales de estiércol sólido (t/ha) y efluente líquido (kL/ha) por lote y por año.
              </p>
            </div>
            <button className="primaryButton smallButton" onClick={startNew}>
              + Registrar biofertilización
            </button>
          </div>

          <div className="biofertSummaryGrid">
            <div className="biofertCard">
              <span className="muted" style={{ fontSize: "12px", fontWeight: 600 }}>Unidad Sólida</span>
              <strong style={{ fontSize: "22px", display: "block", color: "var(--slate-900)" }}>t / ha</strong>
              <small>Estiércol sólido con estercolero</small>
            </div>
            <div className="biofertCard">
              <span className="muted" style={{ fontSize: "12px", fontWeight: 600 }}>Unidad Líquida</span>
              <strong style={{ fontSize: "22px", display: "block", color: "var(--slate-900)" }}>kL / ha</strong>
              <small>Efluente líquido con tanque</small>
            </div>
            <div className="biofertCard">
              <span className="muted" style={{ fontSize: "12px", fontWeight: 600 }}>Aplicaciones Históricas</span>
              <strong style={{ fontSize: "22px", display: "block", color: "var(--brand-700)" }}>
                {biofertActivities.length}
              </strong>
              <small>Registradas en este campo</small>
            </div>
          </div>

          <ActivityTable activities={biofertActivities} onEdit={startEdit} onSaved={refresh} showCampo={false} />
        </section>
      )}

      {/* PESTAÑA: SUELOS */}
      {tab === "Suelos" && (
        <section className="panel">
          <SoilPanel analyses={soils} onChanged={refresh} />
        </section>
      )}

      {/* PESTAÑA: DOCUMENTOS */}
      {tab === "Documentos" && (
        <section className="panel">
          <DocumentsPanel documents={documents} onChanged={refresh} />
        </section>
      )}

      {/* Modal de Nueva / Editar Actividad */}
      <NewActivityModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setEditingActivity(null);
        }}
        onSaved={refresh}
        fixedCampo={campoNombre}
        fixedLote={undefined}
        fixedCampana={undefined}
        editingActivity={editingActivity}
      />

      {/* Modal Selector de Lote para Editar (cuando hay múltiples lotes) */}
      {headerSelectorOpen && (
        <div className="modalBackdrop" onClick={() => setHeaderSelectorOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow" style={{ color: "var(--brand-700)", fontWeight: 700 }}>
                  Establecimiento {campoNombre}
                </p>
                <h2>Seleccionar Lote para Editar</h2>
              </div>
              <button
                type="button"
                className="iconButton"
                onClick={() => setHeaderSelectorOpen(false)}
                title="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="formSection noTopBorder">
              <p className="muted" style={{ marginBottom: "14px", fontSize: "13px" }}>
                Elegí el lote que deseás modificar o creá uno nuevo:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "380px", overflowY: "auto" }}>
                {lotes.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "var(--slate-50)",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "15px", color: "var(--slate-900)" }}>{l.nombre}</strong>
                        <span
                          className={`pill ${
                            l.estado === "En producción"
                              ? "badgeGreen"
                              : l.estado === "Pastoreo"
                              ? "badgeTeal"
                              : "badgeSlate"
                          }`}
                          style={{ fontSize: "11px" }}
                        >
                          {l.estado}
                        </span>
                      </div>
                      <div style={{ fontSize: "12.5px", color: "var(--muted)", marginTop: "4px" }}>
                        {l.superficieHa ? `${l.superficieHa} ha` : "Superficie a definir"} · Cultivo: {l.cultivoActual || "Sin asignar"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="tableAction"
                      style={{ padding: "6px 14px", fontWeight: 600 }}
                      onClick={() => {
                        setHeaderSelectorOpen(false);
                        setHeaderLoteToEdit(l);
                        setHeaderLoteModalOpen(true);
                      }}
                    >
                      ✏️ Editar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="modalFooter" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                className="secondaryButton"
                onClick={() => {
                  setHeaderSelectorOpen(false);
                  setTab("Lotes");
                }}
              >
                Ver todos en pestaña Lotes →
              </button>
              <button
                type="button"
                className="primaryButton"
                onClick={() => {
                  setHeaderSelectorOpen(false);
                  setHeaderLoteToEdit(null);
                  setHeaderLoteModalOpen(true);
                }}
              >
                + Nuevo Lote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lote invocado desde el Header */}
      <LoteModal
        open={headerLoteModalOpen}
        onClose={() => {
          setHeaderLoteModalOpen(false);
          setHeaderLoteToEdit(null);
        }}
        campoNombre={campoNombre}
        editingLote={headerLoteToEdit}
        onSaved={refresh}
      />
    </AppShell>
  );
}
