"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import { Equipment, machineryData } from "@/lib/machineryData";

export default function MaquinariasPage() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [selectedOwnership, setSelectedOwnership] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");

  function refresh() {
    setEquipmentList(machineryData.listEquipment());
  }

  useEffect(() => {
    refresh();
  }, []);

  const filteredList = useMemo(() => {
    return equipmentList.filter((item) => {
      // Filtro por propiedad
      if (selectedOwnership !== "Todos") {
        if (selectedOwnership === "Propios" && item.propiedad !== "Propiedad HJB") return false;
        if (selectedOwnership === "AConfirmar" && item.propiedad === "Propiedad HJB") return false;
      }

      // Filtro por categoría
      if (selectedCategory !== "Todos") {
        if (item.tipo !== selectedCategory) return false;
      }

      // Filtro por texto de búsqueda
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const inNombre = item.nombre.toLowerCase().includes(q);
        const inMarca = item.marca.toLowerCase().includes(q);
        const inModelo = item.modelo.toLowerCase().includes(q);
        const inProveedor = item.proveedor.toLowerCase().includes(q);
        const inNotas = item.notas.toLowerCase().includes(q);
        const inRubro = (item.rubroContable || "").toLowerCase().includes(q);
        if (!inNombre && !inMarca && !inModelo && !inProveedor && !inNotas && !inRubro) {
          return false;
        }
      }

      return true;
    });
  }, [equipmentList, selectedCategory, selectedOwnership, searchTerm]);

  const totalPropios = equipmentList.filter((e) => e.propiedad === "Propiedad HJB").length;
  const totalAConfirmar = equipmentList.filter((e) => e.propiedad !== "Propiedad HJB").length;
  const totalMantenimientos = equipmentList.reduce((acc, curr) => acc + curr.mantenimientos.length, 0);
  const totalLabores = equipmentList.reduce((acc, curr) => acc + curr.labores.length, 0);

  const CATEGORIES = [
    "Todos",
    "Tractor",
    "Implemento Efluentes",
    "Implemento Forrajero",
    "Implemento Agrícola",
    "Transporte / Acoplado",
    "Equipo Tambo",
    "Maquinaria Pesada",
    "Cosecha / Picado",
  ];

  return (
    <AppShell active="Maquinarias">
      <div className="pageHeader">
        <div>
          <div className="badgeRow" style={{ marginBottom: "6px" }}>
            <span className="pill badgeGreen">Parque de Maquinaria y Equipos</span>
            <span className="pill badgeSlate">{equipmentList.length} Equipos en Inventario</span>
          </div>
          <h1>Maquinarias e Implementos</h1>
          <p className="muted">
            Inventario maestro, fichas técnicas individuales, historial de mantenimientos y registro de labores de HJB.
          </p>
        </div>
      </div>

      <div className="metricsGrid four">
        <MetricCard
          label="Total Equipos e Implementos"
          value={String(equipmentList.length)}
          note={`${totalPropios} Propios HJB · ${totalAConfirmar} A confirmar / Terceros`}
        />
        <MetricCard
          label="Activos Propios HJB"
          value={String(totalPropios)}
          note="Tractores, efluentes, tambo, forraje"
        />
        <MetricCard
          label="Mantenimientos Registrados"
          value={String(totalMantenimientos)}
          note="Services programados y reparaciones"
        />
        <MetricCard
          label="Labores Vinculadas"
          value={String(totalLabores)}
          note="Efluentes, rollos, laboreo y nivelación"
        />
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <section className="panel section" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          {/* Tabs de Propiedad */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`pill ${selectedOwnership === "Todos" ? "badgeGreen" : "badgeSlate"}`}
              style={{ cursor: "pointer", padding: "6px 14px", fontSize: "13px", fontWeight: 600 }}
              onClick={() => setSelectedOwnership("Todos")}
            >
              Todos ({equipmentList.length})
            </button>
            <button
              type="button"
              className={`pill ${selectedOwnership === "Propios" ? "badgeGreen" : "badgeSlate"}`}
              style={{ cursor: "pointer", padding: "6px 14px", fontSize: "13px", fontWeight: 600 }}
              onClick={() => setSelectedOwnership("Propios")}
            >
              Propiedad HJB ({totalPropios})
            </button>
            <button
              type="button"
              className={`pill ${selectedOwnership === "AConfirmar" ? "badgeAmber" : "badgeSlate"}`}
              style={{ cursor: "pointer", padding: "6px 14px", fontSize: "13px", fontWeight: 600 }}
              onClick={() => setSelectedOwnership("AConfirmar")}
            >
              A Confirmar / Terceros ({totalAConfirmar})
            </button>
          </div>

          {/* Campo de búsqueda */}
          <div style={{ minWidth: "260px" }}>
            <input
              type="text"
              className="thFilterInput"
              style={{ width: "100%", padding: "7px 12px", borderRadius: "8px" }}
              placeholder="Buscar máquina, marca, proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Selector de Categorías */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
          <span style={{ fontSize: "12px", color: "var(--slate-500)", alignSelf: "center", marginRight: "6px", fontWeight: 600 }}>
            Categoría:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`pill ${selectedCategory === cat ? "badgeBlue" : "badgeSlate"}`}
              style={{ cursor: "pointer", fontSize: "11.5px", padding: "3px 10px" }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Listado de Tarjetas de Maquinaria */}
      <section className="section">
        <div className="sectionTitle">
          <div>
            <h2>Inventario de Equipos ({filteredList.length})</h2>
            <p className="muted">Haz clic en cualquier equipo para acceder a su ficha técnica, historial de mantenimientos y labores.</p>
          </div>
        </div>

        <div className="fieldCardsGrid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {filteredList.map((eq) => {
            const isPropio = eq.propiedad === "Propiedad HJB";
            return (
              <Link
                key={eq.id}
                href={`/maquinarias/${eq.id}`}
                className="fieldCardModern borderActive"
                style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
              >
                <div>
                  <div className="fieldCardTop" style={{ alignItems: "flex-start" }}>
                    <div>
                      <span className="fieldName" style={{ fontSize: "17px", display: "block" }}>{eq.nombre}</span>
                      <small style={{ color: "var(--slate-500)", fontSize: "12px", display: "block", marginTop: "2px" }}>
                        {eq.tipo}
                      </small>
                    </div>
                    <span
                      className={`pill ${isPropio ? "badgeGreen" : "badgeAmber"}`}
                      style={{ fontSize: "10.5px", whiteSpace: "nowrap" }}
                    >
                      {eq.propiedad}
                    </span>
                  </div>

                  <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--slate-500)" }}>Marca / Modelo:</span>
                      <strong style={{ color: "var(--slate-900)" }}>{eq.marca} · {eq.modelo}</strong>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--slate-500)" }}>Proveedor / Origen:</span>
                      <span style={{ color: "var(--slate-800)", fontWeight: 500 }}>{eq.proveedor}</span>
                    </div>

                    {eq.capacidad && eq.capacidad !== "DATO PENDIENTE" && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--slate-500)" }}>Capacidad:</span>
                        <strong style={{ color: "var(--brand-800)" }}>{eq.capacidad}</strong>
                      </div>
                    )}

                    {eq.horometroActual !== null && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--slate-500)" }}>Horómetro:</span>
                        <strong style={{ color: "var(--slate-900)" }}>{eq.horometroActual} h</strong>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--slate-500)" }}>Estado:</span>
                      <span className={`statusDot ${eq.estadoOperativo === "Operativo" ? "dotGreen" : "dotAmber"}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        {eq.estadoOperativo}
                      </span>
                    </div>
                  </div>

                  {eq.notas && (
                    <p style={{ fontSize: "12px", color: "var(--slate-600)", marginTop: "12px", lineHeight: 1.4, borderTop: "1px dashed var(--line)", paddingTop: "8px" }}>
                      {eq.notas}
                    </p>
                  )}
                </div>

                <div style={{ marginTop: "16px", paddingTop: "10px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {eq.mantenimientos.length > 0 && (
                      <span className="pill badgeTeal" style={{ fontSize: "10.5px" }}>
                        🔧 {eq.mantenimientos.length} service
                      </span>
                    )}
                    {eq.labores.length > 0 && (
                      <span className="pill badgePurple" style={{ fontSize: "10.5px" }}>
                        🌱 {eq.labores.length} labores
                      </span>
                    )}
                  </div>
                  <span className="fieldAction" style={{ margin: 0, fontSize: "12.5px" }}>
                    Ver ficha →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Historial General de Mantenimientos y Reparaciones */}
      <section className="panel section" style={{ marginTop: "28px" }}>
        <div className="sectionTitle">
          <div>
            <h2>Historial General de Mantenimientos y Reparaciones</h2>
            <p className="muted">Registro cronológico de servicios preventivos, mantenimientos de rodaje y reparaciones mecánicas.</p>
          </div>
        </div>

        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Equipo</th>
                <th>Tipo de Evento</th>
                <th>Componentes / Trabajos</th>
                <th>Horómetro</th>
                <th>Estado</th>
                <th>Proveedor / Taller</th>
              </tr>
            </thead>
            <tbody>
              {equipmentList.flatMap((eq) =>
                eq.mantenimientos.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.fecha}</strong></td>
                    <td>
                      <Link href={`/maquinarias/${eq.id}`} style={{ color: "var(--brand-800)", fontWeight: 700 }}>
                        {eq.nombre}
                      </Link>
                    </td>
                    <td>
                      <span className="pill badgeTeal" style={{ fontSize: "11px" }}>{m.tipoEvento}</span>
                    </td>
                    <td>
                      <div><strong>{m.descripcion}</strong></div>
                      <small style={{ color: "var(--slate-500)", display: "block", marginTop: "2px" }}>
                        {m.componentes.join(" · ")}
                      </small>
                    </td>
                    <td>{m.horometro ? `${m.horometro} h` : "—"}</td>
                    <td>
                      <span className="status good">{m.estado}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "var(--slate-700)" }}>{m.proveedorTaller || "DATO PENDIENTE"}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
