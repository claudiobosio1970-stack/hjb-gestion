"use client";

import { useState } from "react";
import { DocumentRecord, agricultureData } from "@/lib/agricultureData";

function fmtDate(value: string) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

export default function DocumentsPanel({
  documents,
  onChanged,
}: {
  documents: DocumentRecord[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("Análisis de suelo");
  const [fecha, setFecha] = useState("");
  const [archivoNombre, setArchivoNombre] = useState("");
  const [observaciones, setObservaciones] = useState("");

  function save() {
    if (!nombre || !fecha) {
      alert("Ingresá nombre y fecha.");
      return;
    }
    agricultureData.saveDocument({
      id: crypto.randomUUID(),
      campo: "Aguilera",
      campana: "2026/27",
      nombre,
      tipo,
      fecha,
      archivoNombre,
      observaciones,
      createdAt: new Date().toISOString(),
    });
    setOpen(false);
    setNombre("");
    setFecha("");
    setArchivoNombre("");
    setObservaciones("");
    onChanged();
  }

  return (
    <>
      <div className="sectionTitle">
        <div>
          <h2>Documentos</h2>
          <p className="muted">En v0.4 se guarda la ficha del documento; el archivo real llegará con Firebase Storage.</p>
        </div>
        <button className="secondaryButton" onClick={() => setOpen(true)}>+ Agregar documento</button>
      </div>

      {!documents.length ? (
        <div className="emptyState">Todavía no hay documentos registrados para Aguilera.</div>
      ) : (
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Archivo</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td><strong>{doc.nombre}</strong><small>{doc.observaciones}</small></td>
                  <td>{doc.tipo}</td>
                  <td>{fmtDate(doc.fecha)}</td>
                  <td>{doc.archivoNombre || "Sin archivo adjunto"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="modalBackdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Aguilera · Documentos</p>
                <h2>Agregar documento</h2>
              </div>
              <button className="iconButton" onClick={() => setOpen(false)}>×</button>
            </div>

            <div className="formGrid">
              <div>
                <label>Nombre</label>
                <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Análisis suelo 2026" />
              </div>
              <div>
                <label>Tipo</label>
                <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option>Análisis de suelo</option>
                  <option>Penetrometría</option>
                  <option>Recomendación</option>
                  <option>Planificación</option>
                  <option>Foto</option>
                  <option>Otro</option>
                </select>
              </div>
              <div>
                <label>Fecha</label>
                <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div>
                <label>Archivo</label>
                <input className="input fileInput" type="file" onChange={(e) => setArchivoNombre(e.target.files?.[0]?.name || "")} />
              </div>
            </div>

            <div>
              <label>Observaciones</label>
              <textarea className="input textarea" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>

            <div className="infoCallout">
              En esta versión se conserva el nombre y la relación del documento. El contenido del archivo todavía no se sube a la nube.
            </div>

            <div className="modalFooter">
              <button className="secondaryButton" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="primaryButton" onClick={save}>Guardar documento</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
