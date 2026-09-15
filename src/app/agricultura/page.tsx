"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import NewActivityModal from "@/components/NewActivityModal";
import ActivityTable from "@/components/ActivityTable";
import { campos } from "@/lib/mockData";
import { Activity, agricultureData } from "@/lib/agricultureData";

export default function AgriculturaPage() {
  const [open, setOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  function refresh() {
    setActivities(agricultureData.listActivities());
  }

  function startNew() {
    setEditingActivity(null);
    setOpen(true);
  }

  function startEdit(act: Activity) {
    setEditingActivity(act);
    setOpen(true);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AppShell active="Agricultura">
      <div className="pageHeader">
        <div>
          <div className="badgeRow" style={{ marginBottom: "6px" }}>
            <span className="pill badgeGreen">Producción Vegetal</span>
            <span className="pill badgeSlate">Campaña 2026/27</span>
          </div>
          <h1>Agricultura</h1>
          <p className="muted">
            Todos los campos y lotes de HJB, rotaciones, labores, insumos y rendimientos.
          </p>
        </div>
        <button className="primaryButton" onClick={startNew}>+ Nueva labor</button>
      </div>

      <div className="metricsGrid four">
        <MetricCard label="Campos Totales" value="5" note="Aguilera, Tambo, Racca, Kitty, Keuneke" />
        <MetricCard label="Labores Registradas" value={String(activities.length)} note={activities.length === 0 ? "Historial limpio para 2026/27" : "Labores cargadas"} />
        <MetricCard label="Campaña Actual" value="2026/27" note="En curso" />
        <MetricCard label="Destinos de Producción" value="Grano · Silo · Forraje" note="Seguimiento integral" />
      </div>

      <section className="section">
        <div className="sectionTitle">
          <div>
            <h2>Campos y Lotes Productivos</h2>
            <p className="muted">Haz clic en el cuadro de cualquier campo para ver sus lotes, rotaciones, labores e insumos.</p>
          </div>
          <div className="badgeRow">
            <span className="pill badgeSlate">Acceso directo a cada campo</span>
          </div>
        </div>

        <div className="fieldCardsGrid">
          {campos.map((campo) => {
            const count = activities.filter((a) => a.campo.toLowerCase() === campo.nombre.toLowerCase()).length;
            return (
              <Link
                key={campo.nombre}
                href={`/agricultura/${campo.slug}`}
                className="fieldCardModern borderActive"
              >
                <div className="fieldCardTop">
                  <span className="fieldName">{campo.nombre}</span>
                  <span className={`statusDot ${campo.estado === "Activo" ? "dotGreen" : "dotAmber"}`}>
                    {campo.estado}
                  </span>
                </div>
                <div className="fieldSuperficie">{campo.superficie}</div>
                <p className="fieldDetail">{campo.detalle}</p>
                <span className="fieldAction">
                  Ver campo y lotes ({count} labores) →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="panel section">
        <div className="sectionTitle">
          <div>
            <h2>Historial Agronómico General</h2>
            <p className="muted">
              Filtra directamente por fecha, campo, lote, cultivo o insumo en cada columna de la tabla.
            </p>
          </div>
        </div>

        <ActivityTable activities={activities} onEdit={startEdit} onSaved={refresh} showCampo={true} />
      </section>

      <NewActivityModal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingActivity(null);
        }}
        onSaved={refresh}
        editingActivity={editingActivity}
      />
    </AppShell>
  );
}
