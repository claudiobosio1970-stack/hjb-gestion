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
  const [activities, setActivities] = useState<Activity[]>([]);

  function refresh() {
    setActivities(agricultureData.listActivities());
  }

  useEffect(() => { refresh(); }, []);

  return (
    <AppShell active="Agricultura">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Campaña 2026/27</p>
          <h1>Agricultura</h1>
          <p className="muted">Campos, lotes, ciclos productivos y actividades.</p>
        </div>
        <button className="primaryButton" onClick={() => setOpen(true)}>+ Nueva actividad</button>
      </div>

      <div className="metricsGrid four">
        <MetricCard label="Campos" value="5" note="Activos" />
        <MetricCard label="Maíces agrícolas" value="3" note="Aguilera, Kitty, Racca 2" />
        <MetricCard label="Tambo maíz/forraje" value="43 ha" note="Superficie confirmada" />
        <MetricCard label="Actividades" value={String(activities.length)} note="Repositorio local v0.4" />
      </div>

      <section className="section">
        <div className="sectionTitle">
          <div>
            <h2>Campos</h2>
            <p className="muted">Seleccioná un campo para ver su situación productiva.</p>
          </div>
          <select className="select"><option>2026/27</option></select>
        </div>

        <div className="fieldGrid">
          {campos.map((campo) => {
            const content = (
              <>
                <div className="fieldTop">
                  <span className="fieldIcon">↗</span>
                  <span className={campo.estado === "Activo" ? "status good" : "status warn"}>{campo.estado}</span>
                </div>
                <h3>{campo.nombre}</h3>
                <p>{campo.unidad}</p>
                <strong>{campo.detalle}</strong>
                <span className="fieldLink">Ver campo →</span>
              </>
            );

            return campo.nombre === "Aguilera" ? (
              <Link key={campo.nombre} href="/agricultura/aguilera" className="fieldCard">{content}</Link>
            ) : (
              <div key={campo.nombre} className="fieldCard mutedCard" title="Se habilitará en próximas iteraciones">{content}</div>
            );
          })}
        </div>
      </section>

      <section className="panel section">
        <div className="sectionTitle">
          <div>
            <h2>Actividad reciente</h2>
            <p className="muted">Las pantallas ya consumen datos mediante una capa de servicio preparada para SQL Connect.</p>
          </div>
        </div>
        <ActivityTable activities={activities.slice(0, 10)} />
      </section>

      <NewActivityModal open={open} onClose={() => setOpen(false)} onSaved={refresh} />
    </AppShell>
  );
}
