"use client";

import { useMemo } from "react";
import { VacaTamboIndividual, limpiarCaravana, calcularInfoSecado } from "@/lib/delproData";

interface Props {
  isOpen: boolean;
  vaca: VacaTamboIndividual | null;
  onClose: () => void;
}

export default function ModalFichaVaca({ isOpen, vaca, onClose }: Props) {
  // Cálculo de información precisa de secado oficial DelPro
  const infoSecado = useMemo(() => {
    if (!vaca) return null;
    return calcularInfoSecado(vaca);
  }, [vaca]);

  // Cálculo de edad exacta en años y meses (solo si DelPro registró fecha de nacimiento o edad)
  const edadFormateada = useMemo(() => {
    if (!vaca) return null;
    if (vaca.edadMeses && vaca.edadMeses > 0) {
      const anios = Math.floor(vaca.edadMeses / 12);
      const meses = vaca.edadMeses % 12;
      return `${anios} años${meses > 0 ? ` y ${meses} meses` : ""}`;
    }
    if (
      vaca.fechaNacimiento &&
      typeof vaca.fechaNacimiento === "string" &&
      !vaca.fechaNacimiento.toLowerCase().includes("delpro") &&
      vaca.fechaNacimiento !== "—"
    ) {
      const partes = vaca.fechaNacimiento.split("/");
      if (partes.length === 3) {
        const dia = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10) - 1;
        let anio = parseInt(partes[2], 10);
        if (anio < 100) anio += 2000;
        const fnac = new Date(anio, mes, dia);
        if (!isNaN(fnac.getTime())) {
          const diffMs = Date.now() - fnac.getTime();
          if (diffMs > 0) {
            const totalMeses = Math.floor(diffMs / (30.4375 * 86400000));
            const a = Math.floor(totalMeses / 12);
            const m = totalMeses % 12;
            return `${a} años${m > 0 ? ` y ${m} meses` : ""}`;
          }
        }
      }
    }
    // Cero invención de datos: si DelPro no la informa, no inventar
    return null;
  }, [vaca]);

  if (!isOpen || !vaca) return null;

  const rpLimpio = limpiarCaravana(vaca.rp);
  const esOrdenie = vaca.estadoProductivo === "En Ordeñe";
  const esSeca = vaca.estadoProductivo === "Seca";
  const esVaquillona = vaca.estadoProductivo === "Vaquillona";
  const esCrianza = vaca.estadoProductivo === "Crianza";

  // Identificador de etapa de lactancia
  let etapaLactancia = "Sin lactancia activa";
  let badgeCurva = "badgeSlate";
  if (esOrdenie) {
    if (vaca.diasLactancia <= 60) {
      etapaLactancia = "Pico de Producción (0 a 60 días)";
      badgeCurva = "badgeGreen";
    } else if (vaca.diasLactancia <= 200) {
      etapaLactancia = "Persistencia Media (60 a 200 días)";
      badgeCurva = "badgeBlue";
    } else {
      etapaLactancia = "Descenso pre-secado (> 200 días)";
      badgeCurva = "badgeAmber";
    }
  } else if (esSeca) {
    etapaLactancia = "Período Seco (Reposo previo al parto)";
    badgeCurva = "badgeAmber";
  }

  // Litros histórico oficial extraído de DelPro (CERO datos inventados ni multiplicadores)
  const litrosHistorico =
    vaca.promedioHistorico !== undefined && vaca.promedioHistorico > 0
      ? vaca.promedioHistorico
      : undefined;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "860px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "28px" }}>🐄</span>
              <h2 style={{ fontSize: "21px", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                Ficha Técnica: Vaca RP {rpLimpio}
              </h2>
              <span
                style={{
                  background: esOrdenie ? "#166534" : esSeca ? "#854d0e" : "#1e40af",
                  color: "#ffffff",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  fontSize: "11.5px",
                  fontWeight: 800,
                }}
              >
                {esOrdenie ? "🥛 EN ORDEÑE" : esSeca ? "🍂 SECA" : esVaquillona ? "🌱 VAQUILLONA" : "🍼 CRIANZA"}
              </span>
              <span
                style={{
                  background:
                    vaca.estadoReproductivo === "Preñada"
                      ? "#1e40af"
                      : vaca.estadoReproductivo === "Inseminada"
                      ? "#b45309"
                      : "#64748b",
                  color: "#ffffff",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                }}
              >
                {vaca.estadoReproductivo === "Preñada"
                  ? "🤰 PREÑADA"
                  : vaca.estadoReproductivo === "Inseminada"
                  ? "💉 INSEMINADA"
                  : "⭕ VACÍA"}
              </span>
            </div>
            <p style={{ margin: "5px 0 0 0", fontSize: "13px", color: "#94a3b8" }}>
              Datos reales sincronizados desde DeLaval DelPro FarmManager · Tambo HJB
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#ffffff",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Cerrar ficha"
          >
            ✕
          </button>
        </div>

        {/* Contenido Scrolleable */}
        <div style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "22px" }}>
          
          {/* SECCIÓN 1: LOS 3 NIVELES DE PRODUCCIÓN LECHERA */}
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
              🥛 Producción de Leche (Medición DelPro)
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              {/* Card 1: Ayer */}
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  padding: "16px",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
                }}
              >
                <div style={{ fontSize: "11.5px", color: "#166534", fontWeight: 800 }}>LITROS AYER (ÚLTIMO DÍA)</div>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "#14532d", marginTop: "4px" }}>
                  {vaca.litrosAyer > 0 ? `${vaca.litrosAyer} lts/d` : "0.0 lts/d"}
                </div>
                <div style={{ fontSize: "11px", color: "#15803d", marginTop: "4px" }}>
                  Medición registrada en sala de ordeñe
                </div>
              </div>

              {/* Card 2: Promedio 7 días */}
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  padding: "16px",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
                }}
              >
                <div style={{ fontSize: "11.5px", color: "#1e40af", fontWeight: 800 }}>PROMEDIO RECIENTE (7 DÍAS)</div>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "#1e3a8a", marginTop: "4px" }}>
                  {vaca.promedio7d ? `${vaca.promedio7d} lts/d` : vaca.litrosAyer > 0 ? `${vaca.litrosAyer} lts/d` : "0.0 lts/d"}
                </div>
                <div style={{ fontSize: "11px", color: "#2563eb", marginTop: "4px" }}>
                  Media móvil de la última semana
                </div>
              </div>

              {/* Card 3: Promedio Histórico */}
              <div
                style={{
                  background: "#faf5ff",
                  border: "1px solid #e9d5ff",
                  padding: "16px",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
                }}
              >
                <div style={{ fontSize: "11.5px", color: "#6b21a8", fontWeight: 800 }}>PROMEDIO HISTÓRICO (DELPRO)</div>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "#581c87", marginTop: "4px" }}>
                  {litrosHistorico ? `${litrosHistorico} lts/d` : "—"}
                </div>
                <div style={{ fontSize: "11px", color: "#7e22ce", marginTop: "4px" }}>
                  {litrosHistorico
                    ? "Rendimiento medio de lactancia registrado en DelPro"
                    : "No registrado en informe actual de DelPro"}
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: DATOS BIOLÓGICOS Y CICLOS DE LACTANCIA */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "18px 20px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#475569", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>
              🧬 Biología & Ciclo de Lactancia
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Caravana Oficial (RP)</div>
                <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                  {rpLimpio}
                </div>
              </div>

              {edadFormateada && (
                <div>
                  <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Edad Actual</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                    {edadFormateada}
                  </div>
                </div>
              )}

              {Boolean(
                vaca.fechaNacimiento &&
                typeof vaca.fechaNacimiento === "string" &&
                vaca.fechaNacimiento.trim() !== "" &&
                !vaca.fechaNacimiento.toLowerCase().includes("delpro") &&
                vaca.fechaNacimiento !== "—" &&
                vaca.fechaNacimiento !== "null" &&
                vaca.fechaNacimiento !== "undefined"
              ) && (
                <div>
                  <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Fecha de Nacimiento</div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#334155", marginTop: "2px" }}>
                    {vaca.fechaNacimiento}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Ciclo de Lactancia (Parto N°)</div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#1e40af", marginTop: "2px" }}>
                  {vaca.partoNumero && vaca.partoNumero > 0
                    ? `Lactancia ${vaca.partoNumero} (${vaca.partoNumero === 1 ? "Primeriza" : `${vaca.partoNumero}° Parto`})`
                    : "Sin lactancias (Vaquillona / Crianza)"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Días en Leche (DEL)</div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                  {vaca.diasLactancia > 0 ? `${vaca.diasLactancia} días` : "0 días (No lactante)"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Etapa de la Curva</div>
                <div style={{ marginTop: "4px" }}>
                  <span className={`pill ${badgeCurva}`} style={{ fontSize: "11.5px", fontWeight: 700 }}>
                    {etapaLactancia}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: ESTADO REPRODUCTIVO Y CALENDARIO DE GESTACIÓN */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "18px 20px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#475569", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>
              🗓️ Estado Reproductivo & Cronograma
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Estado Reproductivo</div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                  {vaca.estadoReproductivo}
                </div>
              </div>

              {vaca.estadoReproductivo === "Preñada" && (
                <>
                  <div>
                    <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Días de Gestación</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#1d4ed8", marginTop: "2px" }}>
                      {vaca.diasGestacion || 0} días
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Fecha Probable de Parto</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#166534", marginTop: "2px" }}>
                      {vaca.fechaProbableParto && !vaca.fechaProbableParto.toLowerCase().includes("delpro") ? vaca.fechaProbableParto : "—"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Cuenta Regresiva Parto</div>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#b45309", marginTop: "2px" }}>
                      {vaca.diasParaParto !== undefined
                        ? vaca.diasParaParto <= 0
                          ? "⚡ En fecha de parto"
                          : `⏳ En ${vaca.diasParaParto} días`
                        : "—"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Día Exacto para Secarla</div>
                    <div style={{ fontSize: "15.5px", fontWeight: 800, color: "#b45309", marginTop: "2px" }}>
                      🍂 {infoSecado?.fechaSecado && infoSecado.fechaSecado !== "—" ? infoSecado.fechaSecado : vaca.fechaSecadoEstimada || "—"}
                    </div>
                    {infoSecado?.fechaSecadoLarga && (
                      <div style={{ fontSize: "11px", color: "#78350f", fontWeight: 700, marginTop: "2px" }}>
                        {infoSecado.fechaSecadoLarga}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Días para el Secado</div>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 800,
                        color:
                          infoSecado?.estadoSecado === "hoy" || infoSecado?.estadoSecado === "vencido"
                            ? "#dc2626"
                            : infoSecado?.estadoSecado === "inminente"
                            ? "#b45309"
                            : "#0f172a",
                        marginTop: "2px",
                      }}
                    >
                      {infoSecado?.estadoSecado === "ya_seca"
                        ? "✅ Ya secada (en descanso)"
                        : infoSecado?.estadoSecado === "hoy"
                        ? "🚨 ¡HOY ES EL DÍA!"
                        : infoSecado && infoSecado.diasParaSecado > 0
                        ? `⏳ Faltan ${infoSecado.diasParaSecado} días`
                        : infoSecado && infoSecado.diasParaSecado < 0
                        ? `🚨 Atrasado por ${Math.abs(infoSecado.diasParaSecado)} días`
                        : "—"}
                    </div>
                  </div>
                </>
              )}

              {vaca.estadoReproductivo === "Inseminada" && (
                <div>
                  <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Servicio / Inseminación</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#b45309", marginTop: "2px" }}>
                    Pendiente confirmación de preñez (tacto / ecografía)
                  </div>
                </div>
              )}

              {vaca.estadoReproductivo === "Vacía" && (
                <div>
                  <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Días Abiertos</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#dc2626", marginTop: "2px" }}>
                    {vaca.diasAbiertos || vaca.diasLactancia || 0} días
                  </div>
                </div>
              )}
            </div>

            {/* Panel Destacado de Instrucción de Secado para el Tambero */}
            {infoSecado && infoSecado.aplica && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background:
                    infoSecado.estadoSecado === "hoy" || infoSecado.estadoSecado === "vencido"
                      ? "#fef2f2"
                      : infoSecado.estadoSecado === "inminente"
                      ? "#fffbeb"
                      : infoSecado.estadoSecado === "ya_seca"
                      ? "#f1f5f9"
                      : "#f0fdf4",
                  border: `1.5px solid ${
                    infoSecado.estadoSecado === "hoy" || infoSecado.estadoSecado === "vencido"
                      ? "#f87171"
                      : infoSecado.estadoSecado === "inminente"
                      ? "#fcd34d"
                      : infoSecado.estadoSecado === "ya_seca"
                      ? "#cbd5e1"
                      : "#86efac"
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "24px" }}>
                    {infoSecado.estadoSecado === "ya_seca"
                      ? "🍂"
                      : infoSecado.estadoSecado === "hoy" || infoSecado.estadoSecado === "vencido"
                      ? "🚨"
                      : infoSecado.estadoSecado === "inminente"
                      ? "⚠️"
                      : "🗓️"}
                  </span>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
                      Instrucción Operativa de Secado (Protocolo DeLaval DelPro)
                    </div>
                    <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                      {infoSecado.mensaje}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background:
                      infoSecado.estadoSecado === "hoy" || infoSecado.estadoSecado === "vencido"
                        ? "#dc2626"
                        : infoSecado.estadoSecado === "inminente"
                        ? "#d97706"
                        : infoSecado.estadoSecado === "ya_seca"
                        ? "#64748b"
                        : "#16a34a",
                    color: "#ffffff",
                  }}
                >
                  {infoSecado.estadoSecado === "ya_seca"
                    ? "Período Seco Activo"
                    : infoSecado.estadoSecado === "hoy"
                    ? "Secar Hoy"
                    : infoSecado.diasParaSecado > 0
                    ? `Secado en ${infoSecado.diasParaSecado} días`
                    : "Secado Vencido"}
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 4: UBICACIÓN Y GRUPO EN EL TAMBO */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Grupo en DeLaval DelPro</div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                🏷️ {vaca.grupoDelPro || vaca.nombreCorral || "Lote General"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Corral Asignado HJB</div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#1e40af", marginTop: "2px" }}>
                🏠 {vaca.nombreCorral || "Tambo General"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>Trazabilidad HJB</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#166534", marginTop: "2px" }}>
                ✅ 100% Rodeo Lechero Tambo
              </div>
            </div>
          </div>

        </div>

        {/* Footer del Modal */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            background: "#f8fafc",
          }}
        >
          <button
            type="button"
            className="secondaryBtn"
            onClick={onClose}
            style={{ padding: "8px 20px", fontSize: "13px", fontWeight: 700 }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
