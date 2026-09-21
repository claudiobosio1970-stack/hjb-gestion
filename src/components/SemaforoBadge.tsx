"use client";

import React from "react";
import { SemaforoResult } from "@/lib/semaforoUtils";

interface SemaforoCellProps {
  label: string;
  value: string | number;
  unit?: string;
  result: SemaforoResult;
  showRange?: boolean;
  compact?: boolean;
}

/**
 * Componente visual de celda / tarjeta de parámetro agronómico con semáforo (Verde, Amarillo, Rojo).
 * Muestra el número con el color correspondiente, una insignia clara (Óptimo, Medio, Bajo)
 * y la referencia agronómica para que el usuario entienda si el número es poco o mucho.
 */
export function SemaforoCell({
  label,
  value,
  unit = "",
  result,
  showRange = true,
  compact = false,
}: SemaforoCellProps) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: `1.5px solid ${result.borderColor}`,
        borderRadius: "10px",
        padding: compact ? "8px 10px" : "10px 12px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "4px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        position: "relative",
        overflow: "hidden",
      }}
      title={`${label}: ${value} ${unit} - ${result.label}. ${result.explicacion}`}
    >
      {/* Indicador de semáforo superior */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
        <span
          style={{
            fontSize: compact ? "10.5px" : "11px",
            fontWeight: 700,
            color: "var(--slate-600)",
            textTransform: "uppercase",
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            fontSize: "10px",
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: "999px",
            background: result.bgColor,
            color: result.textColor,
            border: `1px solid ${result.borderColor}`,
            whiteSpace: "nowrap",
            letterSpacing: "0.01em",
          }}
        >
          {result.label}
        </span>
      </div>

      {/* Valor numérico en color semáforo destacado */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
        <strong
          style={{
            fontSize: compact ? "16px" : "19px",
            fontWeight: 900,
            color: result.textColor,
            letterSpacing: "-0.01em",
          }}
        >
          {typeof value === "number" ? value.toLocaleString("es-AR") : value}
        </strong>
        {unit && (
          <span style={{ fontSize: "11px", color: "var(--slate-500)", fontWeight: 600 }}>
            {unit}
          </span>
        )}
      </div>

      {/* Rango de referencia para que el productor sepa si es poco o mucho */}
      {showRange && result.rangoReferencia && (
        <div
          style={{
            fontSize: "10px",
            color: "var(--slate-500)",
            lineHeight: 1.25,
            borderTop: "1px dashed var(--slate-200)",
            paddingTop: "4px",
            marginTop: "2px",
          }}
        >
          {result.rangoReferencia}
        </div>
      )}
    </div>
  );
}

/**
 * Chip / Badge inline para tablas o listas
 */
export function SemaforoBadge({
  result,
  customLabel,
  valor,
  size = "md",
}: {
  result: SemaforoResult;
  customLabel?: string;
  valor?: string | number;
  size?: "sm" | "md";
}) {
  const isSm = size === "sm";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSm ? "3px" : "5px",
        fontSize: isSm ? "9.5px" : "11px",
        fontWeight: 800,
        padding: isSm ? "2px 7px" : "3px 10px",
        borderRadius: "999px",
        background: result.bgColor,
        color: result.textColor,
        border: `1px solid ${result.borderColor}`,
        whiteSpace: "nowrap",
      }}
      title={`${result.label}. ${result.explicacion}${result.rangoReferencia ? ` (${result.rangoReferencia})` : ""}`}
    >
      {valor !== undefined && <strong style={{ marginRight: "2px" }}>{valor}</strong>}
      <span>{customLabel || result.label}</span>
    </span>
  );
}
