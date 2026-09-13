"use client";

import { useState } from "react";
import { SoilAnalysis, agricultureData } from "@/lib/agricultureData";

const defaultParams = [
  ["Materia orgánica", "%"],
  ["Fósforo", "ppm"],
  ["Nitrógeno", "ppm"],
  ["Azufre", "ppm"],
  ["Zinc", "ppm"],
  ["pH", ""],
];

function fmtDate(value: string) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

export default function SoilPanel({
  analyses,
  onChanged,
}: {
  analyses: SoilAnalysis[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [fecha, setFecha] = useState("");
  const [laboratorio, setLaboratorio] = useState("");
  const [profundidad, setProfundidad] = useState("0–20 cm");
  const [values, setValues] = useState<Record<string, string>>({});

  function save() {
    if (!fecha) {
      alert("Ingresá la fecha del análisis.");
      return;
    }

    agricultureData.saveSoilAnalysis({
      id: crypto.randomUUID(),
      campo: "Aguilera",
      campana: "2026/27",
      fecha,
      laboratorio,
      profundidad,
      parametros: defaultParams
        .filter(([name]) => values[name])
        .map(([name, unit]) => ({
          id: crypto.randomUUID(),
          nombre: name,
          valor: values[name],
          unidad: unit,
        })),
      createdAt: new Date().toISOString(),
    });
    setOpen(false);
    setFecha("");
    setLaboratorio("");
    setValues({});
    onChanged();
  }

  return (
    <>
      <div className="sectionTitle">
        <div>
          <h2>Análisis de suelo</h2>
          <p className="muted">Cada análisis queda asociado a Aguilera y a la campaña.</p>
        </div>
        <button className="secondaryButton" onClick={() => setOpen(true)}>+ Agregar análisis</button>
      </div>

      {!analyses.length ? (
        <div className="emptyState">Todavía no hay análisis estructurados cargados en esta versión.</div>
      ) : (
        <div className="soilCards">
          {analyses.map((analysis) => (
            <div className="soilCard" key={analysis.id}>
              <div className="soilCardHeader">
                <div>
                  <strong>{fmtDate(analysis.fecha)}</strong>
                  <small>{analysis.laboratorio || "Laboratorio no indicado"} · {analysis.profundidad}</small>
                </div>
                <span className="status good">{analysis.parametros.length} parámetros</span>
              </div>
              <div className="soilParamGrid">
                {analysis.parametros.map((p) => (
                  <div className="soilParam" key={p.id}>
                    <span>{p.nombre}</span>
                    <strong>{p.valor} {p.unidad}</strong>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="modalBackdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Aguilera · Suelos</p>
                <h2>Agregar análisis</h2>
              </div>
              <button className="iconButton" onClick={() => setOpen(false)}>×</button>
            </div>

            <div className="formGrid">
              <div>
                <label>Fecha</label>
                <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div>
                <label>Laboratorio</label>
                <input className="input" value={laboratorio} onChange={(e) => setLaboratorio(e.target.value)} placeholder="Nombre del laboratorio" />
              </div>
              <div>
                <label>Profundidad</label>
                <input className="input" value={profundidad} onChange={(e) => setProfundidad(e.target.value)} />
              </div>
            </div>

            <div className="formSection">
              <h3>Parámetros</h3>
              <div className="parameterGrid">
                {defaultParams.map(([name, unit]) => (
                  <div key={name}>
                    <label>{name} {unit ? `(${unit})` : ""}</label>
                    <input
                      className="input"
                      inputMode="decimal"
                      value={values[name] || ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="modalFooter">
              <button className="secondaryButton" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="primaryButton" onClick={save}>Guardar análisis</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
