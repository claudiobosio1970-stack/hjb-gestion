"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import {
  Equipment,
  EquipmentCategory,
  EquipmentStatus,
  OwnershipStatus,
  hasHorometro,
  machineryData,
} from "@/lib/machineryData";

export default function MaquinariasPage() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [selectedOwnership, setSelectedOwnership] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Estado para el modal de agregar nuevo equipo
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newMarca, setNewMarca] = useState("");
  const [newModelo, setNewModelo] = useState("");
  const [newTipo, setNewTipo] = useState<EquipmentCategory>("Tractor");
  const [newPropiedad, setNewPropiedad] = useState<OwnershipStatus>("Propiedad HJB");
  const [newEstado, setNewEstado] = useState<EquipmentStatus>("Operativo");
  const [newCondicion, setNewCondicion] = useState("En servicio");
  const [newAno, setNewAno] = useState("");
  const [newProveedor, setNewProveedor] = useState("");
  const [newCapacidad, setNewCapacidad] = useState("");
  const [newHorometro, setNewHorometro] = useState("");
  const [newRubro, setNewRubro] = useState("");
  const [newNotas, setNewNotas] = useState("");
  const [newUnidades, setNewUnidades] = useState<string[]>(["HJB Leche", "HJB Cereales"]);

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

  const CATEGORIES: ("Todos" | EquipmentCategory)[] = [
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

  function toggleNewUnidad(u: string) {
    setNewUnidades((prev) =>
      prev.includes(u) ? prev.filter((item) => item !== u) : [...prev, u]
    );
  }

  function handleCreateEquipment(e: React.FormEvent) {
    e.preventDefault();
    if (!newNombre.trim()) return;

    // Buscar el siguiente ID disponible en el rango de slots pre-generados
    let assignedId = "";
    for (let i = 1; i <= 50; i++) {
      const candidate = `equipo-${i}`;
      if (!equipmentList.some((eq) => eq.id === candidate)) {
        assignedId = candidate;
        break;
      }
    }
    if (!assignedId) assignedId = `equipo-${Date.now()}`;

    const newEquipment: Equipment = {
      id: assignedId,
      nombre: newNombre.trim(),
      marca: newMarca.trim() || "DATO PENDIENTE",
      modelo: newModelo.trim() || "DATO PENDIENTE",
      tipo: newTipo,
      propiedad: newPropiedad,
      condicion: newCondicion.trim() || "En servicio",
      anoIncorporacion: newAno.trim() || "DATO PENDIENTE",
      proveedor: newProveedor.trim() || "DATO PENDIENTE",
      estadoOperativo: newEstado,
      capacidad: newCapacidad.trim() || null,
      horometroActual: hasHorometro(newTipo) && newHorometro ? parseFloat(newHorometro) : null,
      rubroContable: newRubro.trim() || null,
      notas: newNotas.trim() || "Equipo incorporado al sistema.",
      unidadesNegocio: newUnidades.length ? newUnidades : ["Transversal"],
      mantenimientos: [],
      labores: [],
    };

    machineryData.saveEquipment(newEquipment);
    refresh();
    setShowAddModal(false);

    // Resetear campos del form
    setNewNombre("");
    setNewMarca("");
    setNewModelo("");
    setNewTipo("Tractor");
    setNewPropiedad("Propiedad HJB");
    setNewEstado("Operativo");
    setNewCondicion("En servicio");
    setNewAno("");
    setNewProveedor("");
    setNewCapacidad("");
    setNewHorometro("");
    setNewRubro("");
    setNewNotas("");
    setNewUnidades(["HJB Leche", "HJB Cereales"]);
  }

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
        <button className="primaryButton" onClick={() => setShowAddModal(true)}>
          + Nueva Maquinaria / Implemento
        </button>
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

                    {hasHorometro(eq.tipo) && eq.horometroActual !== null && (
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

      {/* ======================================================== */}
      {/* MODAL: AGREGAR NUEVA MAQUINARIA O IMPLEMENTO             */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="modalBackdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal modalWide" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <p style={{ fontSize: "12px", color: "var(--slate-500)", textTransform: "uppercase", fontWeight: 700, margin: "0 0 4px", letterSpacing: ".04em" }}>
                  Inventario de Maquinarias HJB
                </p>
                <h2>Registrar Nueva Maquinaria o Implemento</h2>
              </div>
              <button type="button" className="iconButton" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateEquipment}>
              {/* Sección 1: Identificación */}
              <div className="formSection" style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}>
                <h3>1. Identificación Principal</h3>
                <div className="formGrid">
                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                      Nombre del Equipo / Implemento *:
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="ej: Tractor New Holland, Rastrillo estelar, Mixer vertical"
                      value={newNombre}
                      onChange={(e) => setNewNombre(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                      Categoría / Tipo *:
                    </label>
                    <select
                      className="input"
                      value={newTipo}
                      onChange={(e) => setNewTipo(e.target.value as EquipmentCategory)}
                    >
                      {CATEGORIES.filter((c) => c !== "Todos").map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="formGrid" style={{ marginTop: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Marca:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="ej: John Deere, Mainero, Yomel o DATO PENDIENTE"
                      value={newMarca}
                      onChange={(e) => setNewMarca(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Modelo:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="ej: 6120E, 2932 o DATO PENDIENTE"
                      value={newModelo}
                      onChange={(e) => setNewModelo(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Condición Patrimonial y Operativa */}
              <div className="formSection">
                <h3>2. Estado Patrimonial y Operativo</h3>
                <div className="formGrid">
                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Condición de Propiedad:</label>
                    <select
                      className="input"
                      value={newPropiedad}
                      onChange={(e) => setNewPropiedad(e.target.value as OwnershipStatus)}
                    >
                      <option value="Propiedad HJB">Propiedad HJB</option>
                      <option value="Propiedad a confirmar">Propiedad a confirmar</option>
                      <option value="Tercero / Contratista">Tercero / Contratista</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Estado Operativo:</label>
                    <select
                      className="input"
                      value={newEstado}
                      onChange={(e) => setNewEstado(e.target.value as EquipmentStatus)}
                    >
                      <option value="Operativo">Operativo</option>
                      <option value="En servicio">En servicio</option>
                      <option value="En mantenimiento">En mantenimiento</option>
                      <option value="A confirmar">A confirmar</option>
                      <option value="Fuera de servicio">Fuera de servicio</option>
                    </select>
                  </div>
                </div>

                <div className="formGrid" style={{ marginTop: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Condición Descriptiva:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="ej: Nuevo, En servicio operativo, Histórico"
                      value={newCondicion}
                      onChange={(e) => setNewCondicion(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Año de Incorporación:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="ej: 2026 o DATO PENDIENTE"
                      value={newAno}
                      onChange={(e) => setNewAno(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Especificaciones Técnicas */}
              <div className="formSection">
                <h3>3. Especificaciones Técnicas y Proveedor</h3>
                <div className="formGrid">
                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Proveedor / Concesionario:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="ej: Agronorte SRL, Gergolet Agri o DATO PENDIENTE"
                      value={newProveedor}
                      onChange={(e) => setNewProveedor(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Capacidad / Medidas:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="ej: 12.000 L, 2 metros, 1,60 m o DATO PENDIENTE"
                      value={newCapacidad}
                      onChange={(e) => setNewCapacidad(e.target.value)}
                    />
                  </div>
                </div>

                {hasHorometro(newTipo) && (
                  <div style={{ marginTop: "12px" }}>
                    <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                      Horómetro Inicial (horas de motor):
                    </label>
                    <input
                      type="number"
                      className="input"
                      placeholder="ej: 0, 100, 250"
                      value={newHorometro}
                      onChange={(e) => setNewHorometro(e.target.value)}
                    />
                    <small style={{ color: "var(--slate-500)", display: "block", marginTop: "3px" }}>
                      Solo aplicable a tractores y maquinaria autopropulsada con motor.
                    </small>
                  </div>
                )}
              </div>

              {/* Sección 4: Asignación y Notas */}
              <div className="formSection">
                <h3>4. Asignación Contable y Notas</h3>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Rubro Contable:</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="ej: Inversión · Maquinaria y Equipos"
                    value={newRubro}
                    onChange={(e) => setNewRubro(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: "12px" }}>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Unidades de Negocio Habilitadas:</label>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "6px" }}>
                    {["HJB Leche", "HJB Cereales", "HJB Carne", "Transversal"].map((u) => {
                      const selected = newUnidades.includes(u);
                      return (
                        <button
                          key={u}
                          type="button"
                          className={`pill ${selected ? "badgeGreen" : "badgeSlate"}`}
                          style={{ cursor: "pointer", padding: "6px 12px", fontSize: "12px" }}
                          onClick={() => toggleNewUnidad(u)}
                        >
                          {selected ? "✓ " : "+ "}{u}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: "12px" }}>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Notas Técnicas y Operativas:</label>
                  <textarea
                    className="input textarea"
                    rows={3}
                    value={newNotas}
                    onChange={(e) => setNewNotas(e.target.value)}
                    placeholder="Detalles sobre el equipo, estado, documentación o directivas de uso..."
                  />
                </div>
              </div>

              <div className="modalFooter">
                <button type="button" className="secondaryButton" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="primaryButton">
                  Registrar Equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
