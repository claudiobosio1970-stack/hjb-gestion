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
          <div className="badgeRow">
            <span className="pill badgeGreen">Producción Vegetal</span>
            <span className="pill badgeSlate">Campaña 2026/27</span>
          </div>
          <h1>Agricultura</h1>
          <p className="muted">Todos los campos y lotes de HJB, rotaciones, labores y registros agronómicos.</p>
        </div>
        <button className="primaryButton" onClick={() => setOpen(true)}>+ Nueva actividad</button>
      </div>

      <div className="metricsGrid four">
        <MetricCard label="Campos Totales" value="5" note="Superficie centralizada" />
        <MetricCard label="Maíces Agrícolas" value="3" note="Aguilera, Kitty, Racca 2" />
        <MetricCard label="Tambo Maíz/Forraje" value="43 ha" note="Superficie confirmada" />
        <MetricCard label="Actividades Cargadas" value={String(activities.length)} note="Plan vs Real" />
      </div>

      <section className="section">
        <div className="sectionTitle">
          <div>
            <h2>Campos y Lotes</h2>
            <p className="muted">Selecciona un campo para ver sus lotes, labores, insumos y suelos.</p>
          </div>
          <div className="badgeRow">
            <span className="pill badgeSlate">Campaña activa: 2026/27</span>
          </div>
        </div>

        <div className="fieldCardsGrid">
          {campos.map((campo) => {
            const isAguilera = campo.nombre === "Aguilera";
            const content = (
              <>
                <div className="fieldCardTop">
                  <span className="fieldName">{campo.nombre}</span>
                  <span className={`statusDot ${campo.estado === "Activo" ? "dotGreen" : "dotAmber"}`}>
                    {campo.estado}
                  </span>
                </div>
                <div className="fieldSuperficie">{campo.superficie}</div>
                <p className="fieldDetail">{campo.detalle}</p>
                <span className="fieldAction">
                  {isAguilera ? "Gestionar lote completo →" : "Ver información →"}
                </span>
              </>
            );

            return isAguilera ? (
              <Link key={campo.nombre} href="/agricultura/aguilera" className="fieldCardModern borderActive">
                {content}
              </Link>
            ) : (
              <div key={campo.nombre} className="fieldCardModern mutedModern" title="Próximamente disponible">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel section">
        <div className="sectionTitle">
          <div>
            <h2>Actividades Recientes</h2>
            <p className="muted">Labores agronómicas registradas con seguimiento Plan vs Real.</p>
          </div>
        </div>
        <ActivityTable activities={activities.slice(0, 10)} />
      </section>

      <NewActivityModal open={open} onClose={() => setOpen(false)} onSaved={refresh} />
    </AppShell>
  );
}
