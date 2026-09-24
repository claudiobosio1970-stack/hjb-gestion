"use client";

import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import GoogleMapView from "@/components/GoogleMapView";

export default function MapaPage() {
  return (
    <AppShell active="Mapa de Campos">
      {/* Encabezado Compacto */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h1 style={{ margin: "0 0 2px 0", fontSize: "22px", fontWeight: 800, color: "var(--slate-900)" }}>
            Mapa de Campos & Lotes
          </h1>
          <p className="muted" style={{ margin: 0, fontSize: "12.5px" }}>
            Ubicación satelital de los 5 establecimientos (590 ha), delimitación de lotes y vinculación con labores agrícolas.
          </p>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <span className="pill badgeGreen" style={{ fontSize: "11px" }}>🌾 5 Campos · 590 ha</span>
          <span className="pill badgeSlate" style={{ fontSize: "11px" }}>🛰️ Google Maps Satelital</span>
          <span className="pill badgeGreen" style={{ fontSize: "11px" }}>✏️ Delimitación Activa</span>
        </div>
      </div>

      {/* Visor Satelital */}
      <GoogleMapView />
    </AppShell>
  );
}
