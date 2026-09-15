"use client";

import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import GoogleMapView from "@/components/GoogleMapView";

export default function MapaPage() {
  return (
    <AppShell active="Mapa de Campos">
      {/* Encabezado */}
      <div className="pageHeader">
        <div>
          <div className="badgeRow" style={{ marginBottom: "6px" }}>
            <span className="pill badgeGreen">Georreferenciación HJB</span>
            <span className="pill badgeSlate">Cobertura Satelital Google Maps</span>
            <span className="pill badgeGreen">Delimitación Manual de Lotes</span>
          </div>
          <h1>Mapa de Campos & Lotes</h1>
          <p className="muted">
            Ubicación satelital y delimitación manual de lotes en tiempo real, trazado de polígonos, ajuste de vértices y vinculación con labores.
          </p>
        </div>
      </div>

      {/* Métricas del Mapa */}
      <div className="metricsGrid four" style={{ marginBottom: "18px" }}>
        <MetricCard label="Campos Monitoreados" value="5" note="Aguilera · Tambo · Racca · Kitty · Keuneke" />
        <MetricCard label="Delimitación de Lotes" value="Activa" note="Trazado y ajuste manual en pantalla" />
        <MetricCard label="Capa de Visualización" value="Híbrido" note="Satelital de alta resolución + Rutas" />
        <MetricCard label="Cómputo de Superficie" value="Manual (ha)" note="Sin distorsión por error de trazo" />
      </div>

      {/* Visor Satelital */}
      <GoogleMapView />
    </AppShell>
  );
}
