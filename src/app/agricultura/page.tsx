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
import { campos } from "@/lib/mockData";
import { Activity, agricultureData } from "@/lib/agricultureData";

export default function AgriculturaPage() {
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  function refresh() {
    setActivities(agricultureData.listActivities());
  }

  useEffect(() => {
    refresh();
  }, []);

  const filteredActivities = useMemo(() => {
    return filterActivities(activities, filters);
  }, [activities, filters]);

  return (
    <AppShell active="Agricultura">
      <div className="pageHeader">
        <div>
          <div className="badgeRow" style={{ marginBottom: "6px" }}>
            <span className="pill badgeGreen">Producción Vegetal</span>
            <span className="pill badgeSlate">Historial 2024/25 - 2026/27</span>
          </div>
          <h1>Agricultura</h1>
          <p className="muted">
            Todos los campos y lotes de HJB, rotaciones, labores, insumos y rendimientos históricos.
          </p>
        </div>
        <button className="primaryButton" onClick={() => setOpen(true)}>+ Nueva labor</button>
      </div>

      <div className="metricsGrid four">
        <MetricCard label="Campos Totales" value="5" note="Aguilera, Tambo, Racca, Kitty, Keuneke" />
        <MetricCard label="Historial Completo" value={String(activities.length)} note="Labores registradas" />
        <MetricCard label="Campañas Activas" value="3" note="2024/25 · 2025/26 · 2026/27" />
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
              Consulta y filtra todas las labores por fecha, campo, lote, cultivo, estado u observaciones.
            </p>
          </div>
        </div>

        {/* Barra de Filtros Completa */}
        <ActivityFilterBar
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(INITIAL_FILTERS)}
          showCampo={true}
          totalCount={activities.length}
          filteredCount={filteredActivities.length}
        />

        <ActivityTable activities={filteredActivities} showCampo={true} />
      </section>

      <NewActivityModal open={open} onClose={() => setOpen(false)} onSaved={refresh} />
    </AppShell>
  );
}
