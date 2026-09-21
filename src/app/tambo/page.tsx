"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import {
  getStockActualInsumos,
  getDietaTambo,
  saveDietaTambo,
  DietaTamboConfig,
  HJB_DIETA_SYNC_EVENT,
  HJB_STOCK_SYNC_EVENT,
} from "@/lib/stockInsumosData";
import { getPrecioReferencia } from "@/lib/valoresMovilesData";

export default function TamboPage() {
  const [dieta, setDieta] = useState<DietaTamboConfig>(getDietaTambo());
  const [stockData, setStockData] = useState(() => getStockActualInsumos());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Form local state
  const [formDieta, setFormDieta] = useState({
    vacasEnOrdeñe: dieta.vacasEnOrdeñe,
    pelletSoja: dieta.racionesKgDia["pellet-soja"] || 2.5,
    pelletTrigo: dieta.racionesKgDia["pellet-trigo"] || 3.0,
    siloMaiz: dieta.racionesKgDia["silo-maiz"] || 22.0,
    maiz: dieta.racionesKgDia["maiz"] || 5.5,
  });

  function cargarTodo() {
    const currentDieta = getDietaTambo();
    setDieta(currentDieta);
    setStockData(getStockActualInsumos());
    setFormDieta({
      vacasEnOrdeñe: currentDieta.vacasEnOrdeñe,
      pelletSoja: currentDieta.racionesKgDia["pellet-soja"] || 2.5,
      pelletTrigo: currentDieta.racionesKgDia["pellet-trigo"] || 3.0,
      siloMaiz: currentDieta.racionesKgDia["silo-maiz"] || 22.0,
      maiz: currentDieta.racionesKgDia["maiz"] || 5.5,
    });
    setHasChanges(false);
  }

  useEffect(() => {
    cargarTodo();

    function onSync() {
      cargarTodo();
    }

    window.addEventListener(HJB_DIETA_SYNC_EVENT, onSync);
    window.addEventListener(HJB_STOCK_SYNC_EVENT, onSync);
    return () => {
      window.removeEventListener(HJB_DIETA_SYNC_EVENT, onSync);
      window.removeEventListener(HJB_STOCK_SYNC_EVENT, onSync);
    };
  }, []);

  function triggerFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4500);
  }

  function handleGuardarDieta(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (formDieta.vacasEnOrdeñe <= 0) {
      alert("Por favor ingresá un número de vacas en ordeñe válido mayor a 0.");
      return;
    }

    const updated = saveDietaTambo({
      vacasEnOrdeñe: formDieta.vacasEnOrdeñe,
      racionesKgDia: {
        ...dieta.racionesKgDia,
        "pellet-soja": formDieta.pelletSoja,
        "pellet-trigo": formDieta.pelletTrigo,
        "silo-maiz": formDieta.siloMaiz,
        maiz: formDieta.maiz,
      },
      actualizadoPor: "Módulo Tambo HJB",
    });

    setDieta(updated);
    setHasChanges(false);
    triggerFeedback(`✓ Dieta del Tambo guardada y sincronizada: ${formDieta.vacasEnOrdeñe} VO · Pellet Soja ${formDieta.pelletSoja} kg/d · Silo ${formDieta.siloMaiz} kg/d.`);
  }

  // Stock disponible actual en el Tambo
  const itemPelletSoja = stockData.items.find((x) => x.id === "pellet-soja");
  const itemPelletTrigo = stockData.items.find((x) => x.id === "pellet-trigo");
  const itemSilo = stockData.items.find((x) => x.id === "silo-maiz");

  const stockPelletSojaKg = itemPelletSoja?.stockActual || 0;
  const stockPelletTrigoKg = itemPelletTrigo?.stockActual || 0;
  const stockSiloKg = itemSilo?.stockActual || 0;

  // Autonomías reactivas según los valores actualmente tipeados en el formulario
  const consumoDiaSoja = Math.round(formDieta.vacasEnOrdeñe * formDieta.pelletSoja * 10) / 10;
  const diasSoja = consumoDiaSoja > 0 ? Math.floor(stockPelletSojaKg / consumoDiaSoja) : 0;

  const consumoDiaTrigo = Math.round(formDieta.vacasEnOrdeñe * formDieta.pelletTrigo * 10) / 10;
  const diasTrigo = consumoDiaTrigo > 0 ? Math.floor(stockPelletTrigoKg / consumoDiaTrigo) : 0;

  const consumoDiaSilo = Math.round(formDieta.vacasEnOrdeñe * formDieta.siloMaiz * 10) / 10;
  const diasSilo = consumoDiaSilo > 0 ? Math.floor(stockSiloKg / consumoDiaSilo) : 0;

  // Costos de alimentación por vaca en ordeño (VO) y totales de rodeo
  const precioKgSoja = (getPrecioReferencia("pellet-soja", "ARS") || 295200) / 1000;
  const precioKgTrigo = (getPrecioReferencia("pellet-trigo", "ARS") || 221800) / 1000;
  const precioKgSilo = getPrecioReferencia("silo-maiz", "ARS") || 80;
  const precioKgMaiz = (getPrecioReferencia("maiz", "ARS") || 210000) / 1000;

  const costoDiaVOSoja = Number((formDieta.pelletSoja * precioKgSoja).toFixed(2));
  const costoDiaVOTrigo = Number((formDieta.pelletTrigo * precioKgTrigo).toFixed(2));
  const costoDiaVOSilo = Number((formDieta.siloMaiz * precioKgSilo).toFixed(2));
  const costoDiaVOMaiz = Number((formDieta.maiz * precioKgMaiz).toFixed(2));

  const costoTotalDiaVO = Number((costoDiaVOSoja + costoDiaVOTrigo + costoDiaVOSilo + costoDiaVOMaiz).toFixed(2));
  const costoTotalRodeoDia = Math.round(costoTotalDiaVO * formDieta.vacasEnOrdeñe);

  return (
    <AppShell active="Tambo">
      <div className="pageHeader">
        <div>
          <div className="badgeRow">
            <span className="pill badgeGreen">Producción Lechera</span>
            <span className="pill badgeSlate">Campaña 2026/27</span>
            <span className="pill badgeBlue">Dieta Sincronizada</span>
          </div>
          <h1>Tambo HJB</h1>
          <p className="muted">Control lechero, rodeo en ordeñe, formulación de raciones y balance forrajero.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link
            href="/insumos"
            className="secondaryBtn"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            🌾 Insumos & Stock
          </Link>
          <button
            type="button"
            className="primaryButton"
            onClick={() => handleGuardarDieta()}
            disabled={!hasChanges}
            style={{
              background: hasChanges ? "#15803d" : "var(--slate-400)",
              borderColor: hasChanges ? "#15803d" : "var(--slate-400)",
              opacity: hasChanges ? 1 : 0.7,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            💾 Guardar Dieta {hasChanges && "⚠️"}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: "12px 16px",
            background: "#ecfdf5",
            border: "1px solid #10b981",
            color: "#065f46",
            borderRadius: "8px",
            marginBottom: "16px",
            fontWeight: 700,
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#065f46", fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards principales de alimentación */}
      <div className="metricsGrid four">
        <MetricCard
          label="Vacas en Ordeñe"
          value={`${formDieta.vacasEnOrdeñe} VO`}
          note={hasChanges ? "Modificado sin guardar" : "Rodeo activo en ordeño"}
        />
        <MetricCard
          label="Pellet de Soja Tambo"
          value={`${stockPelletSojaKg.toLocaleString("es-AR")} kg`}
          note={
            diasSoja > 0
              ? `${diasSoja} días de ración (${(stockPelletSojaKg / 1000).toFixed(1)} Tn)`
              : "Sin stock disponible en Tambo"
          }
        />
        <MetricCard
          label="Silo de Maíz Picado"
          value={`${stockSiloKg.toLocaleString("es-AR")} kg`}
          note={
            diasSilo > 0
              ? `${diasSilo} días de reserva (${(stockSiloKg / 1000).toFixed(1)} Tn)`
              : "Sin stock cargado"
          }
        />
        <MetricCard
          label="Lotes Forrajeros"
          value="9 lotes"
          note="43 ha asignadas a Tambo"
        />
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN INTERACTIVA: DIETA Y RACIONES DEL RODEO (100% EDITABLE)           */}
      {/* ========================================================================= */}
      <section className="section" style={{ marginTop: "24px" }}>
        <div className="panel" style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }}>🥣</span>
                <h2 style={{ fontSize: "17.5px", margin: 0 }}>
                  Ración Diaria & Dieta Oficial del Rodeo (100% Editable)
                </h2>
              </div>
              <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 0 0" }}>
                Cualquier cambio aquí recalcula automáticamente la duración del stock de forrajes y el panel de <strong>Canje de Pellet en AFA</strong>.
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(22, 163, 74, 0.1)", border: "1px solid rgba(22, 163, 74, 0.3)", padding: "4px 10px", borderRadius: "6px", color: "#166534", marginTop: "6px" }}>
                <span style={{ fontSize: "13px" }}>💵</span>
                <span style={{ fontSize: "12px", fontWeight: 800 }}>
                  Costo Diario Alimentación: ${costoTotalDiaVO.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / VO / día (${costoTotalRodeoDia.toLocaleString("es-AR")}/d rodeo)
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--line)" }}>
              <label style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--slate-800)" }}>
                Vacas en Ordeñe (VO):
              </label>
              <input
                type="number"
                min="1"
                value={formDieta.vacasEnOrdeñe}
                onChange={(e) => {
                  setFormDieta({ ...formDieta, vacasEnOrdeñe: parseInt(e.target.value) || 1 });
                  setHasChanges(true);
                }}
                style={{
                  width: "80px",
                  padding: "5px 8px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontWeight: 800,
                  fontSize: "14px",
                  textAlign: "center",
                }}
              />
              <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>cabezas</span>
            </div>
          </div>

          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th style={{ minWidth: "220px" }}>Alimento / Subproducto</th>
                  <th style={{ width: "150px", textAlign: "right" }}>Ración kg/VO/día</th>
                  <th style={{ width: "160px", textAlign: "right" }}>Consumo Rodeo / Día</th>
                  <th style={{ width: "150px", textAlign: "right", color: "#166534" }}>Costo / VO / Día</th>
                  <th style={{ width: "150px", textAlign: "right" }}>Stock en Tambo</th>
                  <th style={{ width: "160px", textAlign: "center" }}>Autonomía Restante</th>
                  <th style={{ width: "130px", textAlign: "center" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Pellet de Soja Proteico */}
                <tr>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "20px" }}>🥣</span>
                      <div>
                        <strong>Pellet de Soja Proteico (Harina)</strong>
                        <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                          Suplementación proteica en Tambo · Canje AFA
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formDieta.pelletSoja}
                        onChange={(e) => {
                          setFormDieta({ ...formDieta, pelletSoja: parseFloat(e.target.value) || 0 });
                          setHasChanges(true);
                        }}
                        style={{
                          width: "75px",
                          padding: "4px 6px",
                          borderRadius: "4px",
                          border: "1px solid #cbd5e1",
                          fontWeight: 700,
                          textAlign: "right",
                          fontSize: "13px",
                        }}
                      />
                      <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>kg/vaca</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "13.5px" }}>{consumoDiaSoja.toLocaleString("es-AR")} kg/día</strong>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                      {(consumoDiaSoja / 1000).toFixed(2)} Tn/día
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ color: "#166534", fontSize: "13.5px" }}>
                      ${costoDiaVOSoja.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                    <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>
                      ${precioKgSoja.toLocaleString("es-AR", { minimumFractionDigits: 1 })}/kg · ${(Math.round(costoDiaVOSoja * formDieta.vacasEnOrdeñe)).toLocaleString("es-AR")}/d rodeo
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: stockPelletSojaKg > 0 ? "#15803d" : "#64748b" }}>
                      {stockPelletSojaKg.toLocaleString("es-AR")} kg
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                      {(stockPelletSojaKg / 1000).toFixed(2)} Tn disponibles
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {diasSoja > 0 ? (
                      <span className="pill badgeGreen" style={{ fontSize: "12px", fontWeight: 800 }}>
                        ⏱️ {diasSoja} días de stock
                      </span>
                    ) : (
                      <span className="pill badgeAmber" style={{ fontSize: "11px" }}>
                        Sin stock disponible
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Link
                      href="/insumos"
                      className="inlineLink"
                      style={{ fontSize: "12px", fontWeight: 700 }}
                      title="Convertir grano en pellet en AFA"
                    >
                      🔄 Canje AFA →
                    </Link>
                  </td>
                </tr>

                {/* 2. Pellet de Trigo */}
                <tr>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "20px" }}>🌾</span>
                      <div>
                        <strong>Pellet de Trigo (Afrechillo)</strong>
                        <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                          Subproducto de molienda de trigo · Tambo
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formDieta.pelletTrigo}
                        onChange={(e) => {
                          setFormDieta({ ...formDieta, pelletTrigo: parseFloat(e.target.value) || 0 });
                          setHasChanges(true);
                        }}
                        style={{
                          width: "75px",
                          padding: "4px 6px",
                          borderRadius: "4px",
                          border: "1px solid #cbd5e1",
                          fontWeight: 700,
                          textAlign: "right",
                          fontSize: "13px",
                        }}
                      />
                      <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>kg/vaca</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "13.5px" }}>{consumoDiaTrigo.toLocaleString("es-AR")} kg/día</strong>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                      {(consumoDiaTrigo / 1000).toFixed(2)} Tn/día
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ color: "#166534", fontSize: "13.5px" }}>
                      ${costoDiaVOTrigo.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                    <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>
                      ${precioKgTrigo.toLocaleString("es-AR", { minimumFractionDigits: 1 })}/kg · ${(Math.round(costoDiaVOTrigo * formDieta.vacasEnOrdeñe)).toLocaleString("es-AR")}/d rodeo
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: stockPelletTrigoKg > 0 ? "#15803d" : "#64748b" }}>
                      {stockPelletTrigoKg.toLocaleString("es-AR")} kg
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                      {(stockPelletTrigoKg / 1000).toFixed(2)} Tn disponibles
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {diasTrigo > 0 ? (
                      <span className="pill badgeGreen" style={{ fontSize: "12px", fontWeight: 800 }}>
                        ⏱️ {diasTrigo} días de stock
                      </span>
                    ) : (
                      <span className="pill badgeSlate" style={{ fontSize: "11px" }}>
                        Sin existencias
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Link
                      href="/insumos"
                      className="inlineLink"
                      style={{ fontSize: "12px", fontWeight: 700 }}
                    >
                      Ver stock →
                    </Link>
                  </td>
                </tr>

                {/* 3. Silo de Maíz */}
                <tr>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "20px" }}>🌽</span>
                      <div>
                        <strong>Silo de Maíz Picado Fino (Bolsa)</strong>
                        <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                          Base forrajera principal de fibra y energía en Tambo
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={formDieta.siloMaiz}
                        onChange={(e) => {
                          setFormDieta({ ...formDieta, siloMaiz: parseFloat(e.target.value) || 0 });
                          setHasChanges(true);
                        }}
                        style={{
                          width: "75px",
                          padding: "4px 6px",
                          borderRadius: "4px",
                          border: "1px solid #cbd5e1",
                          fontWeight: 700,
                          textAlign: "right",
                          fontSize: "13px",
                        }}
                      />
                      <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>kg/vaca</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "13.5px" }}>{consumoDiaSilo.toLocaleString("es-AR")} kg/día</strong>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                      {(consumoDiaSilo / 1000).toFixed(2)} Tn/día
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ color: "#166534", fontSize: "13.5px" }}>
                      ${costoDiaVOSilo.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                    <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>
                      ${precioKgSilo.toLocaleString("es-AR", { minimumFractionDigits: 1 })}/kg · ${(Math.round(costoDiaVOSilo * formDieta.vacasEnOrdeñe)).toLocaleString("es-AR")}/d rodeo
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: stockSiloKg > 0 ? "#15803d" : "#64748b" }}>
                      {stockSiloKg.toLocaleString("es-AR")} kg
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                      {(stockSiloKg / 1000).toFixed(2)} Tn disponibles
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {diasSilo > 0 ? (
                      <span className="pill badgeGreen" style={{ fontSize: "12px", fontWeight: 800 }}>
                        ⏱️ {diasSilo} días de reserva
                      </span>
                    ) : (
                      <span className="pill badgeAmber" style={{ fontSize: "11px" }}>
                        Confeccionar silo
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="pill badgeGreen" style={{ fontSize: "11px" }}>
                      43 ha Tambo
                    </span>
                  </td>
                </tr>

                {/* 4. Maíz Grano Molido */}
                <tr>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "20px" }}>⚡</span>
                      <div>
                        <strong>Maíz Grano Seco Molido / Quebrado</strong>
                        <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                          Aporte de almidón y energía para producción de leche
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formDieta.maiz}
                        onChange={(e) => {
                          setFormDieta({ ...formDieta, maiz: parseFloat(e.target.value) || 0 });
                          setHasChanges(true);
                        }}
                        style={{
                          width: "75px",
                          padding: "4px 6px",
                          borderRadius: "4px",
                          border: "1px solid #cbd5e1",
                          fontWeight: 700,
                          textAlign: "right",
                          fontSize: "13px",
                        }}
                      />
                      <span style={{ fontSize: "11px", color: "var(--slate-500)" }}>kg/vaca</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "13.5px" }}>
                      {(Math.round(formDieta.vacasEnOrdeñe * formDieta.maiz * 10) / 10).toLocaleString("es-AR")} kg/día
                    </strong>
                    <div style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                      {((formDieta.vacasEnOrdeñe * formDieta.maiz) / 1000).toFixed(2)} Tn/día
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ color: "#166534", fontSize: "13.5px" }}>
                      ${costoDiaVOMaiz.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                    <div style={{ fontSize: "10.5px", color: "var(--slate-500)" }}>
                      ${precioKgMaiz.toLocaleString("es-AR", { minimumFractionDigits: 1 })}/kg · ${(Math.round(costoDiaVOMaiz * formDieta.vacasEnOrdeñe)).toLocaleString("es-AR")}/d rodeo
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "13px", color: "var(--slate-600)" }}>
                      Acopio propio / AFA
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="pill badgeBlue" style={{ fontSize: "11px" }}>
                      Conectado a silos
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Link href="/insumos" className="inlineLink" style={{ fontSize: "12px", fontWeight: 700 }}>
                      Ver granos →
                    </Link>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                  <td>TOTALES RACIÓN RODEO</td>
                  <td style={{ textAlign: "right" }}>
                    {(formDieta.pelletSoja + formDieta.pelletTrigo + formDieta.siloMaiz + formDieta.maiz).toFixed(1)} kg/VO
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {((formDieta.pelletSoja + formDieta.pelletTrigo + formDieta.siloMaiz + formDieta.maiz) * formDieta.vacasEnOrdeñe / 1000).toFixed(2)} Tn/d
                  </td>
                  <td style={{ textAlign: "right", color: "#166534", fontSize: "14px", fontWeight: 900 }}>
                    ${costoTotalDiaVO.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <div style={{ fontSize: "10.5px", color: "var(--slate-600)", fontWeight: 600 }}>/ VO / día</div>
                  </td>
                  <td style={{ textAlign: "right" }}>—</td>
                  <td style={{ textAlign: "center" }}>—</td>
                  <td style={{ textAlign: "center" }}>—</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "12.5px", color: "#166534" }}>
              💡 <strong>Sincronización activa:</strong> Al guardar, la cantidad de vacas y las raciones se aplican automáticamente a los módulos de <strong>Insumos</strong>, <strong>Canje en AFA Los Cardos</strong> y control de stock.
            </div>

            <button
              type="button"
              className="primaryButton"
              onClick={() => handleGuardarDieta()}
              disabled={!hasChanges}
              style={{
                background: hasChanges ? "#15803d" : "var(--slate-400)",
                borderColor: hasChanges ? "#15803d" : "var(--slate-400)",
                padding: "8px 16px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              💾 Guardar Cambios en Dieta
            </button>
          </div>
        </div>
      </section>

      {/* Módulos restantes del Tambo */}
      <section className="section" style={{ marginTop: "24px" }}>
        <div className="sectionTitle">
          <div>
            <h2>Módulos Operativos del Tambo</h2>
            <p className="muted">Estructura operativa en desarrollo para Tambo HJB.</p>
          </div>
        </div>

        <div className="gridThree">
          <div className="pillarCard">
            <div className="pillarIcon">🥛</div>
            <h3>Producción y Calidad</h3>
            <p>Registro de entregas diarias, remitos de leche, tenor graso, proteínas y células somáticas.</p>
            <span className="statusPill statusUpcoming">Próximamente</span>
          </div>

          <div className="pillarCard">
            <div className="pillarIcon">🐄</div>
            <h3>Rodeo y Sanidad</h3>
            <p>Control de vacas en ordeñe, vacas secas, vaquillonas, partos, celos y tratamientos sanitarios.</p>
            <span className="statusPill statusUpcoming">Próximamente</span>
          </div>

          <div className="pillarCard" style={{ borderColor: "#86efac", background: "#f0fdf4" }}>
            <div className="pillarIcon">🌱</div>
            <h3>Alimentación y Forrajes</h3>
            <p>Dieta diaria sincronizada, ración, silo de maíz, pellets proteicos en AFA y balance de reservas.</p>
            <span className="pill badgeGreen" style={{ fontSize: "11px", fontWeight: 700 }}>
              ✓ Activo y Sincronizado
            </span>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
