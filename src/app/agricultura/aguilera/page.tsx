"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import NewActivityModal from "@/components/NewActivityModal";
import ActivityTable from "@/components/ActivityTable";
import InputsPanel from "@/components/InputsPanel";
import SoilPanel from "@/components/SoilPanel";
import DocumentsPanel from "@/components/DocumentsPanel";
import {
  Activity,
  DocumentRecord,
  SoilAnalysis,
  agricultureData,
} from "@/lib/agricultureData";

type Tab = "Resumen" | "Actividades" | "Insumos" | "Suelos" | "Documentos";

export default function AguileraPage() {
  const [tab, setTab] = useState<Tab>("Resumen");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [soils, setSoils] = useState<SoilAnalysis[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);

  function refresh() {
    setActivities(agricultureData.listActivities().filter((x) => x.campo === "Aguilera"));
    setSoils(agricultureData.listSoilAnalyses().filter((x) => x.campo === "Aguilera"));
    setDocuments(agricultureData.listDocuments().filter((x) => x.campo === "Aguilera"));
  }

  useEffect(() => { refresh(); }, []);

  function startNew() {
    setEditing(null);
    setOpen(true);
  }

  function startEdit(activity: Activity) {
    setEditing(activity);
    setOpen(true);
  }

  const stats = useMemo(() => ({
    planificadas: activities.filter((x) => x.estado === "Planificada").length,
    realizadas: activities.filter((x) => x.estado === "Realizada").length,
  }), [activities]);

  return (
    <AppShell active="Agricultura">
      <div className="breadcrumb">Agricultura / Aguilera</div>

      <div className="pageHeader">
        <div>
          <p className="eyebrow">HJB Cereales · Campaña 2026/27</p>
          <h1>Aguilera</h1>
          <p className="muted">Maíz · superficie pendiente de completar</p>
        </div>
        <button className="primaryButton" onClick={startNew}>+ Nueva actividad</button>
      </div>

      <div className="tabs">
        {(["Resumen", "Actividades", "Insumos", "Suelos", "Documentos"] as Tab[]).map((name) => (
          <button
            key={name}
            className={tab === name ? "tab active" : "tab"}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === "Resumen" && (
        <>
          <div className="metricsGrid four">
            <div className="metricCard"><span>Cultivo</span><strong>Maíz</strong><small>2026/27</small></div>
            <div className="metricCard"><span>Superficie</span><strong>—</strong><small>Pendiente</small></div>
            <div className="metricCard"><span>Planificadas</span><strong>{stats.planificadas}</strong><small>Actividades</small></div>
            <div className="metricCard"><span>Realizadas</span><strong>{stats.realizadas}</strong><small>Actividades</small></div>
          </div>

          <section className="twoCol">
            <div className="panel">
              <div className="sectionTitle"><h2>Ciclo productivo</h2></div>
              <div className="cycleCard">
                <div>
                  <span className="eyebrow">Ciclo 1</span>
                  <h3>Maíz</h3>
                  <p>Destino: grano</p>
                </div>
                <span className="status warn">Planificación</span>
              </div>
            </div>

            <div className="panel">
              <div className="sectionTitle"><h2>Estado de información</h2></div>
              <div className="miniStatusList">
                <div><span>Actividades</span><strong>{activities.length}</strong></div>
                <div><span>Análisis de suelo</span><strong>{soils.length}</strong></div>
                <div><span>Documentos</span><strong>{documents.length}</strong></div>
              </div>
            </div>
          </section>

          <section className="panel section">
            <div className="sectionTitle">
              <div>
                <h2>Últimas actividades</h2>
                <p className="muted">Vista rápida. El detalle completo está en la pestaña Actividades.</p>
              </div>
              <button className="secondaryButton" onClick={() => setTab("Actividades")}>Ver todas</button>
            </div>
            <ActivityTable activities={activities.slice(0, 5)} onEdit={startEdit} />
          </section>
        </>
      )}

      {tab === "Actividades" && (
        <section className="panel">
          <div className="sectionTitle">
            <div>
              <h2>Actividades</h2>
              <p className="muted">Planificá, ejecutá y compará Plan vs. Real.</p>
            </div>
            <button className="primaryButton" onClick={startNew}>+ Nueva actividad</button>
          </div>
          <ActivityTable activities={activities} onEdit={startEdit} />
        </section>
      )}

      {tab === "Insumos" && (
        <section className="panel">
          <div className="sectionTitle">
            <div>
              <h2>Insumos</h2>
              <p className="muted">Se calculan automáticamente a partir de las actividades.</p>
            </div>
          </div>
          <InputsPanel activities={activities} />
        </section>
      )}

      {tab === "Suelos" && (
        <section className="panel">
          <SoilPanel analyses={soils} onChanged={refresh} />
        </section>
      )}

      {tab === "Documentos" && (
        <section className="panel">
          <DocumentsPanel documents={documents} onChanged={refresh} />
        </section>
      )}

      <NewActivityModal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSaved={refresh}
        fixedCampo="Aguilera"
        editingActivity={editing}
      />
    </AppShell>
  );
}
