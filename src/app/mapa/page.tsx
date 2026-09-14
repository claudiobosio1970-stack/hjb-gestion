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
          </div>
          <h1>Mapa de Campos</h1>
          <p className="muted">
            Ubicación satelital en tiempo real de los 5 campos agropecuarios, accesos rurales y vinculación con sus labores.
          </p>
        </div>
      </div>

      {/* Métricas del Mapa */}
      <div className="metricsGrid four" style={{ marginBottom: "18px" }}>
        <MetricCard label="Campos Monitoreados" value="5" note="Aguilera · Tambo · Racca · Kitty · Keuneke" />
        <MetricCard label="Superficie Georreferenciada" value="590 ha" note="100% del área productiva" />
        <MetricCard label="Capa de Visualización" value="Híbrido" note="Satelital de alta resolución + Rutas" />
        <MetricCard label="Calibración GPS" value="Activa" note="Posicionamiento ajustable en 1 clic" />
      </div>

      {/* Visor Satelital */}
      <GoogleMapView />
    </AppShell>
  );
}
