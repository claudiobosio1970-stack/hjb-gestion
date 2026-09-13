"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import NewActivityModal from "@/components/NewActivityModal";
import ActivityTable from "@/components/ActivityTable";
import ActivityFilterBar, {
  FilterState,
  INITIAL_FILTERS,
  filterActivities,
} from "@/components/ActivityFilterBar";
import InputsPanel from "@/components/InputsPanel";
import SoilPanel from "@/components/SoilPanel";
import DocumentsPanel from "@/components/DocumentsPanel";
import {
  Activity,
  DocumentRecord,
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

type Tab = "Actividades" | "Rotaciones" | "Insumos" | "Biofertilización" | "Suelos" | "Documentos";

export default function CampoClientView({ campoSlug }: { campoSlug: string }) {
  const slug = campoSlug.toLowerCase();
  const campoNombre = CAMPO_NAMES[slug] || "Aguilera";

  const [tab, setTab] = useState<Tab>("Actividades");
  const [openModal, setOpenModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Filtros unificados
  const [filters, setFilters] = useState<FilterState>({
    ...INITIAL_FILTERS,
    campo: campoNombre,
  });

  // Datos
  const [activities, setActivities] = useState<Activity[]>([]);
  const [soils, setSoils] = useState<SoilAnalysis[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);

  function refresh() {
    const all = agricultureData.listActivities();
    setActivities(all.filter((x) => x.campo.toLowerCase() === campoNombre.toLowerCase()));
    setSoils(agricultureData.listSoilAnalyses().filter((x) => x.campo.toLowerCase() === campoNombre.toLowerCase()));
    setDocuments(agricultureData.listDocuments().filter((x) => x.campo.toLowerCase() === campoNombre.toLowerCase()));
  }

  useEffect(() => {
    refresh();
    setFilters({ ...INITIAL_FILTERS, campo: campoNombre });
  }, [campoNombre]);

  const lotesDisponibles = LOTES_POR_CAMPO[campoNombre] || ["Lote Único"];
  const campoMeta = campos.find((c) => c.nombre.toLowerCase() === campoNombre.toLowerCase());
  const rotacionesCampo = ROTACIONES_HISTORICAS.filter(
    (r) => r.campo.toLowerCase() === campoNombre.toLowerCase()
  );

  // Actividades filtradas usando el mismo motor
  const actividadesFiltradas = useMemo(() => {
    return filterActivities(activities, { ...filters, campo: campoNombre });
  }, [activities, filters, campoNombre]);

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
        <button className="primaryButton" onClick={startNew}>+ Registrar labor</button>
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
        {(["Actividades", "Rotaciones", "Insumos", "Biofertilización", "Suelos", "Documentos"] as Tab[]).map((name) => (
          <button
            key={name}
            className={tab === name ? "tab active" : "tab"}
            onClick={() => setTab(name)}
          >
            {name === "Biofertilización" && campoNombre === "Tambo" ? "🐄 Biofertilización" : name}
            {name === "Actividades" && ` (${actividadesFiltradas.length})`}
            {name === "Rotaciones" && ` (${rotacionesCampo.length})`}
          </button>
        ))}
      </div>

      {/* PESTAÑA: ACTIVIDADES */}
      {tab === "Actividades" && (
        <section className="panel">
          {/* Barra de Filtros Completa */}
          <ActivityFilterBar
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters({ ...INITIAL_FILTERS, campo: campoNombre })}
            showCampo={false}
            fixedCampo={campoNombre}
            totalCount={activities.length}
            filteredCount={actividadesFiltradas.length}
          />

          <ActivityTable activities={actividadesFiltradas} onEdit={startEdit} showCampo={false} />
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
          <InputsPanel activities={actividadesFiltradas} />
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

          <ActivityTable activities={biofertActivities} onEdit={startEdit} showCampo={false} />
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
        fixedLote={filters.lote !== "Todos" ? filters.lote : undefined}
        fixedCampana={filters.campana !== "Todas" ? filters.campana : undefined}
        editingActivity={editingActivity}
      />
    </AppShell>
  );
}
