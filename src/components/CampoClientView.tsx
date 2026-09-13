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

  // Filtros
  const [campanaFiltro, setCampanaFiltro] = useState<string>("Todas");
  const [loteFiltro, setLoteFiltro] = useState<string>("Todos");
  const [tipoFiltro, setTipoFiltro] = useState<string>("Todos");
  const [busqueda, setBusqueda] = useState<string>("");

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
  }, [campoNombre]);

  const lotesDisponibles = LOTES_POR_CAMPO[campoNombre] || ["Lote Único"];
  const campoMeta = campos.find((c) => c.nombre.toLowerCase() === campoNombre.toLowerCase());
  const rotacionesCampo = ROTACIONES_HISTORICAS.filter(
    (r) => r.campo.toLowerCase() === campoNombre.toLowerCase()
  );

  // Filtrado de actividades
  const actividadesFiltradas = useMemo(() => {
    return activities.filter((act) => {
      if (campanaFiltro !== "Todas" && act.campana !== campanaFiltro) return false;
      if (loteFiltro !== "Todos") {
        const actLote = act.lote || "";
        const matchesLote =
          actLote.toLowerCase().includes(loteFiltro.toLowerCase()) ||
          (act.esGrupal && act.lotesAfectados?.some((l) => l.toLowerCase().includes(loteFiltro.toLowerCase())));
        if (!matchesLote) return false;
      }
      if (tipoFiltro !== "Todos" && act.tipo !== tipoFiltro) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const inCultivo = act.cultivo.toLowerCase().includes(q);
        const inTipo = act.tipo.toLowerCase().includes(q);
        const inInsumo = act.insumos.some((i) => i.producto.toLowerCase().includes(q));
        const inObs = (act.observaciones || "").toLowerCase().includes(q);
        const inLote = (act.lote || "").toLowerCase().includes(q);
        if (!inCultivo && !inTipo && !inInsumo && !inObs && !inLote) return false;
      }
      return true;
    });
  }, [activities, campanaFiltro, loteFiltro, tipoFiltro, busqueda]);

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
          {/* Barra de Filtros Cronológicos */}
          <div className="filterBar">
            <div className="filterGroup">
              <span className="filterLabel">Campaña:</span>
              <select
                className="filterSelect"
                value={campanaFiltro}
                onChange={(e) => setCampanaFiltro(e.target.value)}
              >
                <option value="Todas">Todas las campañas</option>
                <option value="2026/27">Campaña 2026/27</option>
                <option value="2025/26">Campaña 2025/26</option>
                <option value="2024/25">Campaña 2024/25</option>
              </select>
            </div>

            <div className="filterGroup">
              <span className="filterLabel">Lote:</span>
              <select
                className="filterSelect"
                value={loteFiltro}
                onChange={(e) => setLoteFiltro(e.target.value)}
              >
                <option value="Todos">Todos los lotes</option>
                {lotesDisponibles.map((lote) => (
                  <option key={lote} value={lote}>{lote}</option>
                ))}
              </select>
            </div>

            <div className="filterGroup">
              <span className="filterLabel">Labor:</span>
              <select
                className="filterSelect"
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
              >
                <option value="Todos">Todos los tipos</option>
                <option value="Siembra">Siembra</option>
                <option value="Cosecha">Cosecha</option>
                <option value="Picado">Picado</option>
                <option value="Rollos">Rollos</option>
                <option value="Fertilización">Fertilización</option>
                <option value="Biofertilización">Biofertilización</option>
                <option value="Fumigación">Fumigación</option>
                <option value="Barbecho">Barbecho</option>
                <option value="Laboreo">Laboreo</option>
              </select>
            </div>

            <div className="filterGroup" style={{ marginLeft: "auto" }}>
              <input
                type="text"
                className="searchInput"
                placeholder="Buscar cultivo, insumo, lote..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {(campanaFiltro !== "Todas" || loteFiltro !== "Todos" || tipoFiltro !== "Todos" || busqueda) && (
                <button
                  className="secondaryButton smallButton"
                  onClick={() => {
                    setCampanaFiltro("Todas");
                    setLoteFiltro("Todos");
                    setTipoFiltro("Todos");
                    setBusqueda("");
                  }}
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <ActivityTable activities={actividadesFiltradas} onEdit={startEdit} />
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

          <ActivityTable activities={biofertActivities} onEdit={startEdit} />
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
        fixedLote={loteFiltro !== "Todos" ? loteFiltro : undefined}
        fixedCampana={campanaFiltro !== "Todas" ? campanaFiltro : undefined}
        editingActivity={editingActivity}
      />
    </AppShell>
  );
}
