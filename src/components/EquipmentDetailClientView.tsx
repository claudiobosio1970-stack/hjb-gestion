"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import {
  Equipment,
  EquipmentCategory,
  EquipmentStatus,
  MaintenanceRecord,
  MachineryWorkRecord,
  OwnershipStatus,
  hasHorometro,
  machineryData,
} from "@/lib/machineryData";

export default function EquipmentDetailClientView({ equipmentId }: { equipmentId: string }) {
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [activeTab, setActiveTab] = useState<"ficha" | "mantenimientos" | "labores" | "administracion">("ficha");
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states para edición de equipo
  const [editNombre, setEditNombre] = useState("");
  const [editMarca, setEditMarca] = useState("");
  const [editModelo, setEditModelo] = useState("");
  const [editTipo, setEditTipo] = useState<EquipmentCategory>("Tractor");
  const [editPropiedad, setEditPropiedad] = useState<OwnershipStatus>("Propiedad HJB");
  const [editCondicion, setEditCondicion] = useState("");
  const [editAno, setEditAno] = useState("");
  const [editProveedor, setEditProveedor] = useState("");
  const [editCapacidad, setEditCapacidad] = useState("");
  const [editEstado, setEditEstado] = useState<EquipmentStatus>("Operativo");
  const [editHorometro, setEditHorometro] = useState("");
  const [editRubro, setEditRubro] = useState("");
  const [editNotas, setEditNotas] = useState("");

  // Form states para nuevo mantenimiento
  const [maintTipo, setMaintTipo] = useState<MaintenanceRecord["tipoEvento"]>("Mantenimiento Programado");
  const [maintFecha, setMaintFecha] = useState("");
  const [maintComponente, setMaintComponente] = useState("");
  const [maintDescripcion, setMaintDescripcion] = useState("");
  const [maintHorometro, setMaintHorometro] = useState("");
  const [maintTaller, setMaintTaller] = useState("");
  const [maintCosto, setMaintCosto] = useState("");
  const [maintObservaciones, setMaintObservaciones] = useState("");

  // Form states para nueva labor
  const [workFecha, setWorkFecha] = useState("");
  const [workActividad, setWorkActividad] = useState("");
  const [workCampo, setWorkCampo] = useState("Tambo");
  const [workLote, setWorkLote] = useState("");
  const [workCampana, setWorkCampana] = useState("2026/27");
  const [workOperadores, setWorkOperadores] = useState("");
  const [workUnidadNegocio, setWorkUnidadNegocio] = useState<MachineryWorkRecord["unidadNegocio"]>("Transversal");
  const [workSuperficie, setWorkSuperficie] = useState("");
  const [workObservaciones, setWorkObservaciones] = useState("");

  function refresh() {
    const eq = machineryData.getEquipmentById(equipmentId);
    if (eq) setEquipment({ ...eq });
  }

  useEffect(() => {
    refresh();
  }, [equipmentId]);

  if (!equipment) {
    return (
      <AppShell active="Maquinarias">
        <div className="pageHeader">
          <h1>Equipo no encontrado</h1>
          <p className="muted">No se encontró el equipo solicitado.</p>
          <Link href="/maquinarias" className="fieldAction">← Volver al listado</Link>
        </div>
      </AppShell>
    );
  }

  const isPropio = equipment.propiedad === "Propiedad HJB";
  const carriesHorometro = hasHorometro(equipment.tipo);

  function openEditModal() {
    if (!equipment) return;
    setEditNombre(equipment.nombre);
    setEditMarca(equipment.marca);
    setEditModelo(equipment.modelo);
    setEditTipo(equipment.tipo);
    setEditPropiedad(equipment.propiedad);
    setEditCondicion(equipment.condicion);
    setEditAno(equipment.anoIncorporacion ? String(equipment.anoIncorporacion) : "");
    setEditProveedor(equipment.proveedor);
    setEditCapacidad(equipment.capacidad || "");
    setEditEstado(equipment.estadoOperativo);
    setEditHorometro(
      equipment.horometroActual !== null && equipment.horometroActual !== undefined
        ? String(equipment.horometroActual)
        : ""
    );
    setEditRubro(equipment.rubroContable || "");
    setEditNotas(equipment.notas || "");
    setShowEditModal(true);
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!equipment) return;
    const updated: Equipment = {
      ...equipment,
      nombre: editNombre.trim() || equipment.nombre,
      marca: editMarca.trim() || equipment.marca,
      modelo: editModelo.trim() || equipment.modelo,
      tipo: editTipo,
      propiedad: editPropiedad,
      condicion: editCondicion.trim() || equipment.condicion,
      anoIncorporacion: editAno ? editAno : "DATO PENDIENTE",
      proveedor: editProveedor.trim() || equipment.proveedor,
      capacidad: editCapacidad.trim() || null,
      estadoOperativo: editEstado,
      horometroActual: hasHorometro(editTipo) && editHorometro ? parseFloat(editHorometro) : null,
      rubroContable: editRubro.trim() || null,
      notas: editNotas.trim() || equipment.notas,
    };

    machineryData.saveEquipment(updated);
    setEquipment(updated);
    setShowEditModal(false);
  }

  function handleDelete() {
    if (!equipment) return;
    const ok = window.confirm(
      `¿Estás seguro de que deseas dar de baja / eliminar "${equipment.nombre}" del inventario de HJB?\n\nEsta acción quitará el equipo y sus registros asociados del sistema.`
    );
    if (!ok) return;
    machineryData.deleteEquipment(equipment.id);
    router.push("/maquinarias");
  }

  function handleSaveMaint(e: React.FormEvent) {
    e.preventDefault();
    if (!equipment) return;
    machineryData.addMaintenanceRecord(equipment.id, {
      fecha: maintFecha || new Date().toISOString().split("T")[0],
      tipoEvento: maintTipo,
      componentes: maintComponente ? [maintComponente] : ["General"],
      descripcion: maintDescripcion || "Mantenimiento registrado",
      horometro: carriesHorometro && maintHorometro ? parseFloat(maintHorometro) : null,
      estado: "Realizado",
      costo: maintCosto || "DATO PENDIENTE",
      proveedorTaller: maintTaller || "DATO PENDIENTE",
      observaciones: maintObservaciones || undefined,
    });
    setShowMaintModal(false);
    setMaintFecha("");
    setMaintComponente("");
    setMaintDescripcion("");
    setMaintHorometro("");
    setMaintTaller("");
    setMaintCosto("");
    setMaintObservaciones("");
    refresh();
  }

  function handleSaveWork(e: React.FormEvent) {
    e.preventDefault();
    if (!equipment) return;
    machineryData.addWorkRecord(equipment.id, {
      fecha: workFecha || new Date().toISOString().split("T")[0],
      actividad: workActividad || "Labor operativa",
      campo: workCampo,
      lote: workLote || "Lote a confirmar",
      campana: workCampana,
      tractor: equipment.tipo === "Tractor" ? equipment.nombre : null,
      implemento: equipment.tipo !== "Tractor" ? equipment.nombre : null,
      operadores: workOperadores ? workOperadores.split(",").map((s) => s.trim()) : ["Personal HJB"],
      unidadNegocio: workUnidadNegocio,
      horasTrabajadas: null,
      superficieHa: workSuperficie ? parseFloat(workSuperficie) : null,
      cantidadAplicada: null,
      combustible: null,
      observaciones: workObservaciones || undefined,
    });
    setShowWorkModal(false);
    setWorkFecha("");
    setWorkActividad("");
    setWorkLote("");
    setWorkOperadores("");
    setWorkSuperficie("");
    setWorkObservaciones("");
    refresh();
  }

  const CATEGORIES_OPTIONS: EquipmentCategory[] = [
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
      <div style={{ marginBottom: "12px" }}>
        <Link href="/maquinarias" style={{ fontSize: "13px", color: "var(--brand-800)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
          ← Volver a Maquinarias e Implementos
        </Link>
      </div>

      <div className="pageHeader">
        <div>
          <div className="badgeRow" style={{ marginBottom: "6px" }}>
            <span className={`pill ${isPropio ? "badgeGreen" : "badgeAmber"}`}>
              {equipment.propiedad}
            </span>
            <span className="pill badgeSlate">{equipment.tipo}</span>
            <span className={`statusDot ${equipment.estadoOperativo === "Operativo" ? "dotGreen" : "dotAmber"}`}>
              {equipment.estadoOperativo}
            </span>
          </div>
          <h1>{equipment.nombre}</h1>
          <p className="muted">
            {equipment.marca} · {equipment.modelo} — {equipment.condicion}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button className="primaryButton" onClick={() => setShowMaintModal(true)}>
            + Registrar Mantenimiento
          </button>
          <button className="tableAction" style={{ padding: "8px 16px" }} onClick={() => setShowWorkModal(true)}>
            + Registrar Labor / Uso
          </button>
          <button
            type="button"
            className="tableAction"
            style={{ padding: "8px 16px", borderColor: "var(--brand-600)", color: "var(--brand-800)", fontWeight: 600 }}
            onClick={openEditModal}
          >
            ✏️ Editar Equipo
          </button>
          <button
            type="button"
            className="thResetBtn"
            style={{ padding: "8px 14px", color: "#dc2626", borderColor: "#fca5a5" }}
            onClick={handleDelete}
            title="Eliminar este equipo del sistema"
          >
            🗑️ Eliminar
          </button>
        </div>
      </div>

      {!isPropio && (
        <div className="discrepancyBox" style={{ marginBottom: "20px", background: "var(--amber-50, #fffbeb)", borderColor: "var(--amber-300, #fcd34d)" }}>
          <strong>⚠️ Aviso patrimonial: PROPIEDAD A CONFIRMAR</strong>
          <div>
            Este equipo se encuentra referenciado en registros y labores históricas de HJB, pero NO está confirmado fehacientemente como activo de propiedad exclusiva. Debe mantenerse como <strong>PROPIEDAD A CONFIRMAR / TERCERO</strong> hasta disponer de documentación de titularidad.
          </div>
        </div>
      )}

      <div className="metricsGrid four">
        {carriesHorometro ? (
          <MetricCard
            label="Horómetro / Horas"
            value={equipment.horometroActual ? `${equipment.horometroActual} h` : "DATO PENDIENTE"}
            note="Horas de motor registradas"
          />
        ) : (
          <MetricCard
            label="Capacidad / Dimensión"
            value={equipment.capacidad || "DATO PENDIENTE"}
            note="Especificación del implemento"
          />
        )}
        <MetricCard label="Mantenimientos" value={String(equipment.mantenimientos.length)} note="Services y reparaciones" />
        <MetricCard label="Labores Registradas" value={String(equipment.labores.length)} note="Intervenciones a campo" />
        <MetricCard label="Año Incorporación" value={equipment.anoIncorporacion ? String(equipment.anoIncorporacion) : "DATO PENDIENTE"} note={equipment.proveedor} />
      </div>

      {/* Tabs de la Ficha */}
      <div className="tabsRow" style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--line)", marginBottom: "20px" }}>
        <button
          className={`tabButton ${activeTab === "ficha" ? "tabActive" : ""}`}
          style={{ padding: "10px 18px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "ficha" ? "2px solid var(--brand-700)" : "none", fontWeight: activeTab === "ficha" ? 700 : 500 }}
          onClick={() => setActiveTab("ficha")}
        >
          Ficha Técnica
        </button>
        <button
          className={`tabButton ${activeTab === "mantenimientos" ? "tabActive" : ""}`}
          style={{ padding: "10px 18px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "mantenimientos" ? "2px solid var(--brand-700)" : "none", fontWeight: activeTab === "mantenimientos" ? 700 : 500 }}
          onClick={() => setActiveTab("mantenimientos")}
        >
          Historial de Mantenimientos ({equipment.mantenimientos.length})
        </button>
        <button
          className={`tabButton ${activeTab === "labores" ? "tabActive" : ""}`}
          style={{ padding: "10px 18px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "labores" ? "2px solid var(--brand-700)" : "none", fontWeight: activeTab === "labores" ? 700 : 500 }}
          onClick={() => setActiveTab("labores")}
        >
          Labores y Trabajos Realizados ({equipment.labores.length})
        </button>
        <button
          className={`tabButton ${activeTab === "administracion" ? "tabActive" : ""}`}
          style={{ padding: "10px 18px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "administracion" ? "2px solid var(--brand-700)" : "none", fontWeight: activeTab === "administracion" ? 700 : 500 }}
          onClick={() => setActiveTab("administracion")}
        >
          Administración y Proveedor
        </button>
      </div>

      {/* Tab 1: Ficha Técnica */}
      {activeTab === "ficha" && (
        <div className="panel section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2>Ficha Técnica del Equipo</h2>
            <button
              type="button"
              className="tableAction"
              style={{ fontSize: "12.5px" }}
              onClick={openEditModal}
            >
              ✏️ Editar Ficha Técnica
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
            <div className="inputSummary">
              <span style={{ color: "var(--slate-500)", fontSize: "12px", display: "block" }}>Nombre de Equipo:</span>
              <strong style={{ fontSize: "15px", color: "var(--slate-900)" }}>{equipment.nombre}</strong>
            </div>

            <div className="inputSummary">
              <span style={{ color: "var(--slate-500)", fontSize: "12px", display: "block" }}>Marca:</span>
              <strong style={{ fontSize: "15px", color: "var(--slate-900)" }}>{equipment.marca}</strong>
            </div>

            <div className="inputSummary">
              <span style={{ color: "var(--slate-500)", fontSize: "12px", display: "block" }}>Modelo:</span>
              <strong style={{ fontSize: "15px", color: "var(--slate-900)" }}>{equipment.modelo}</strong>
            </div>

            <div className="inputSummary">
              <span style={{ color: "var(--slate-500)", fontSize: "12px", display: "block" }}>Tipo de Activo:</span>
              <strong style={{ fontSize: "15px", color: "var(--slate-900)" }}>{equipment.tipo}</strong>
            </div>

            <div className="inputSummary">
              <span style={{ color: "var(--slate-500)", fontSize: "12px", display: "block" }}>Condición Patrimonial:</span>
              <span className={`pill ${isPropio ? "badgeGreen" : "badgeAmber"}`} style={{ marginTop: "4px", display: "inline-block" }}>
                {equipment.propiedad}
              </span>
            </div>

            <div className="inputSummary">
              <span style={{ color: "var(--slate-500)", fontSize: "12px", display: "block" }}>Capacidad / Especificación:</span>
              <strong style={{ fontSize: "15px", color: "var(--brand-800)" }}>{equipment.capacidad || "DATO PENDIENTE"}</strong>
            </div>

            <div className="inputSummary">
              <span style={{ color: "var(--slate-500)", fontSize: "12px", display: "block" }}>Año de Incorporación:</span>
              <strong style={{ fontSize: "15px", color: "var(--slate-900)" }}>{equipment.anoIncorporacion || "DATO PENDIENTE"}</strong>
            </div>

            <div className="inputSummary">
              <span style={{ color: "var(--slate-500)", fontSize: "12px", display: "block" }}>Proveedor / Operación:</span>
              <strong style={{ fontSize: "15px", color: "var(--slate-900)" }}>{equipment.proveedor}</strong>
            </div>

            {carriesHorometro && (
              <div className="inputSummary">
                <span style={{ color: "var(--slate-500)", fontSize: "12px", display: "block" }}>Horómetro Actual:</span>
                <strong style={{ fontSize: "15px", color: "var(--slate-900)" }}>
                  {equipment.horometroActual ? `${equipment.horometroActual} h` : "DATO PENDIENTE"}
                </strong>
              </div>
            )}

            <div className="inputSummary">
              <span style={{ color: "var(--slate-500)", fontSize: "12px", display: "block" }}>Unidades de Negocio de Uso:</span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                {equipment.unidadesNegocio.map((u) => (
                  <span key={u} className="pill badgeSlate" style={{ fontSize: "11px" }}>{u}</span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
            <h3 style={{ fontSize: "14px", marginBottom: "6px", color: "var(--slate-800)" }}>Notas y Directivas Operativas:</h3>
            <p style={{ fontSize: "13.5px", color: "var(--slate-700)", lineHeight: 1.5, background: "var(--surface)", padding: "14px", borderRadius: "8px" }}>
              {equipment.notas}
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Historial de Mantenimientos */}
      {activeTab === "mantenimientos" && (
        <div className="panel section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2>Historial de Mantenimientos y Reparaciones</h2>
              <p className="muted">Servicios programados de rodaje, intervenciones mecánicas y mejoras registradas.</p>
            </div>
            <button className="primaryButton" onClick={() => setShowMaintModal(true)}>
              + Registrar Mantenimiento
            </button>
          </div>

          {!equipment.mantenimientos.length ? (
            <p className="muted" style={{ padding: "30px 0", textAlign: "center" }}>
              No hay mantenimientos registrados aún para este equipo.
            </p>
          ) : (
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Componentes</th>
                    {carriesHorometro && <th>Horómetro</th>}
                    <th>Taller / Proveedor</th>
                    <th>Costo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.mantenimientos.map((m) => (
                    <tr key={m.id}>
                      <td><strong>{m.fecha}</strong></td>
                      <td>
                        <span className="pill badgeTeal" style={{ fontSize: "11px" }}>{m.tipoEvento}</span>
                      </td>
                      <td>
                        <strong>{m.descripcion}</strong>
                        {m.observaciones && (
                          <small style={{ color: "var(--slate-500)", display: "block", marginTop: "2px" }}>
                            {m.observaciones}
                          </small>
                        )}
                      </td>
                      <td>{m.componentes.join(", ")}</td>
                      {carriesHorometro && <td>{m.horometro ? `${m.horometro} h` : "—"}</td>}
                      <td>{m.proveedorTaller || "DATO PENDIENTE"}</td>
                      <td>{m.costo || "DATO PENDIENTE"}</td>
                      <td><span className="status good">{m.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Labores Realizadas */}
      {activeTab === "labores" && (
        <div className="panel section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2>Labores y Trabajos Realizados</h2>
              <p className="muted">Registro operativo de labores agrícolas, efluentes y movimiento de materiales a campo.</p>
            </div>
            <button className="primaryButton" onClick={() => setShowWorkModal(true)}>
              + Registrar Labor / Uso
            </button>
          </div>

          {!equipment.labores.length ? (
            <p className="muted" style={{ padding: "30px 0", textAlign: "center" }}>
              No hay labores registradas aún vinculadas directamente a este equipo.
            </p>
          ) : (
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Fecha / Campaña</th>
                    <th>Actividad</th>
                    <th>Campo y Lote</th>
                    <th>Tractor / Implemento</th>
                    <th>Operarios</th>
                    <th>Unidad de Negocio</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.labores.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <strong>{w.fecha}</strong>
                        <small style={{ color: "var(--slate-500)", display: "block", marginTop: "2px" }}>
                          Campaña {w.campana}
                        </small>
                      </td>
                      <td><strong>{w.actividad}</strong></td>
                      <td>
                        <strong style={{ color: "var(--slate-900)" }}>{w.campo}</strong> · {w.lote}
                        {w.superficieHa && <small style={{ display: "block", color: "var(--muted)" }}>{w.superficieHa} ha</small>}
                      </td>
                      <td>
                        <div>Tractor: {w.tractor || "—"}</div>
                        <small style={{ color: "var(--slate-500)" }}>Implemento: {w.implemento || "—"}</small>
                      </td>
                      <td>{w.operadores.join(", ")}</td>
                      <td>
                        <span className="pill badgeSlate" style={{ fontSize: "11px" }}>{w.unidadNegocio}</span>
                      </td>
                      <td>
                        {w.cantidadAplicada && <div style={{ fontWeight: 600, color: "var(--brand-800)" }}>{w.cantidadAplicada}</div>}
                        <small style={{ color: "var(--slate-600)" }}>{w.observaciones || "—"}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Administración y Proveedor */}
      {activeTab === "administracion" && (
        <div className="panel section">
          <h2 style={{ marginBottom: "16px" }}>Datos Contables y de Proveedor</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="inputSummary">
              <span style={{ color: "var(--slate-500)", fontSize: "12px", display: "block" }}>Proveedor Asociado:</span>
              <strong style={{ fontSize: "15px", color: "var(--slate-900)" }}>{equipment.proveedor}</strong>
            </div>

            <div className="inputSummary">
              <span style={{ color: "var(--slate-500)", fontSize: "12px", display: "block" }}>Rubro Contable Registrado:</span>
              <strong style={{ fontSize: "14px", color: "var(--slate-900)" }}>{equipment.rubroContable || "DATO PENDIENTE"}</strong>
            </div>

            <div className="inputSummary">
              <span style={{ color: "var(--slate-500)", fontSize: "12px", display: "block" }}>Regla de Imputación de Costos:</span>
              <p style={{ fontSize: "13px", color: "var(--slate-700)", marginTop: "4px" }}>
                El costo operativo y de amortización de esta máquina se imputará según las horas/hectáreas trabajadas en cada labor a la unidad de negocio correspondiente (HJB Leche, HJB Cereales o HJB Carne), evitando asignar el activo permanentemente a un solo centro de costos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar Datos de la Máquina */}
      {showEditModal && (
        <div className="modalOverlay">
          <div className="modalCard" style={{ maxWidth: "600px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3>Editar Ficha del Equipo</h3>
              <button className="thResetBtn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Nombre del Equipo:</label>
                <input
                  type="text"
                  className="thFilterInput"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  style={{ width: "100%", padding: "8px" }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Marca:</label>
                  <input
                    type="text"
                    className="thFilterInput"
                    value={editMarca}
                    onChange={(e) => setEditMarca(e.target.value)}
                    style={{ width: "100%", padding: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Modelo:</label>
                  <input
                    type="text"
                    className="thFilterInput"
                    value={editModelo}
                    onChange={(e) => setEditModelo(e.target.value)}
                    style={{ width: "100%", padding: "8px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Tipo de Equipo:</label>
                  <select
                    className="thFilterSelect"
                    value={editTipo}
                    onChange={(e) => setEditTipo(e.target.value as EquipmentCategory)}
                    style={{ width: "100%", padding: "8px" }}
                  >
                    {CATEGORIES_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Condición Patrimonial:</label>
                  <select
                    className="thFilterSelect"
                    value={editPropiedad}
                    onChange={(e) => setEditPropiedad(e.target.value as OwnershipStatus)}
                    style={{ width: "100%", padding: "8px" }}
                  >
                    <option value="Propiedad HJB">Propiedad HJB</option>
                    <option value="Propiedad a confirmar">Propiedad a confirmar</option>
                    <option value="Tercero / Contratista">Tercero / Contratista</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Año de Incorporación:</label>
                  <input
                    type="text"
                    className="thFilterInput"
                    placeholder="ej: 2026 o DATO PENDIENTE"
                    value={editAno}
                    onChange={(e) => setEditAno(e.target.value)}
                    style={{ width: "100%", padding: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Estado Operativo:</label>
                  <select
                    className="thFilterSelect"
                    value={editEstado}
                    onChange={(e) => setEditEstado(e.target.value as EquipmentStatus)}
                    style={{ width: "100%", padding: "8px" }}
                  >
                    <option value="Operativo">Operativo</option>
                    <option value="En servicio">En servicio</option>
                    <option value="En mantenimiento">En mantenimiento</option>
                    <option value="A confirmar">A confirmar</option>
                    <option value="Fuera de servicio">Fuera de servicio</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Proveedor:</label>
                  <input
                    type="text"
                    className="thFilterInput"
                    value={editProveedor}
                    onChange={(e) => setEditProveedor(e.target.value)}
                    style={{ width: "100%", padding: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Capacidad / Medida:</label>
                  <input
                    type="text"
                    className="thFilterInput"
                    placeholder="ej: 12.000 L, 2 m, 1.60 m"
                    value={editCapacidad}
                    onChange={(e) => setEditCapacidad(e.target.value)}
                    style={{ width: "100%", padding: "8px" }}
                  />
                </div>
              </div>

              {hasHorometro(editTipo) && (
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Horómetro Actual (horas):</label>
                  <input
                    type="number"
                    className="thFilterInput"
                    placeholder="ej: 100"
                    value={editHorometro}
                    onChange={(e) => setEditHorometro(e.target.value)}
                    style={{ width: "100%", padding: "8px" }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Condición / Estado:</label>
                <input
                  type="text"
                  className="thFilterInput"
                  value={editCondicion}
                  onChange={(e) => setEditCondicion(e.target.value)}
                  style={{ width: "100%", padding: "8px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Rubro Contable:</label>
                <input
                  type="text"
                  className="thFilterInput"
                  value={editRubro}
                  onChange={(e) => setEditRubro(e.target.value)}
                  style={{ width: "100%", padding: "8px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Notas Técnicas / Operativas:</label>
                <textarea
                  className="thFilterInput"
                  rows={3}
                  value={editNotas}
                  onChange={(e) => setEditNotas(e.target.value)}
                  style={{ width: "100%", padding: "8px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button type="button" className="thResetBtn" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button type="submit" className="primaryButton">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Registrar Mantenimiento */}
      {showMaintModal && (
        <div className="modalOverlay">
          <div className="modalCard" style={{ maxWidth: "560px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3>Registrar Mantenimiento / Reparación</h3>
              <button className="thResetBtn" onClick={() => setShowMaintModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveMaint} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Tipo de Evento:</label>
                <select
                  className="thFilterSelect"
                  value={maintTipo}
                  onChange={(e) => setMaintTipo(e.target.value as MaintenanceRecord["tipoEvento"])}
                  style={{ width: "100%", padding: "8px" }}
                >
                  <option value="Mantenimiento Programado">Mantenimiento Programado</option>
                  <option value="Reparación">Reparación</option>
                  <option value="Mejora / Modificación">Mejora / Modificación</option>
                  <option value="Service">Service</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: carriesHorometro ? "1fr 1fr" : "1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Fecha:</label>
                  <input
                    type="date"
                    className="thFilterInput"
                    value={maintFecha}
                    onChange={(e) => setMaintFecha(e.target.value)}
                    style={{ width: "100%", padding: "8px" }}
                  />
                </div>
                {carriesHorometro && (
                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Horómetro (horas):</label>
                    <input
                      type="number"
                      className="thFilterInput"
                      placeholder="ej: 100, 250"
                      value={maintHorometro}
                      onChange={(e) => setMaintHorometro(e.target.value)}
                      style={{ width: "100%", padding: "8px" }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Descripción del Trabajo:</label>
                <input
                  type="text"
                  className="thFilterInput"
                  placeholder="ej: Cambio de aceite, filtros, engrase general"
                  value={maintDescripcion}
                  onChange={(e) => setMaintDescripcion(e.target.value)}
                  style={{ width: "100%", padding: "8px" }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Componentes Afectados:</label>
                <input
                  type="text"
                  className="thFilterInput"
                  placeholder="ej: Filtros de rodaje, embrague, caja de cambios"
                  value={maintComponente}
                  onChange={(e) => setMaintComponente(e.target.value)}
                  style={{ width: "100%", padding: "8px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Taller / Proveedor:</label>
                  <input
                    type="text"
                    className="thFilterInput"
                    placeholder="ej: Taller propio, Agronorte"
                    value={maintTaller}
                    onChange={(e) => setMaintTaller(e.target.value)}
                    style={{ width: "100%", padding: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Costo (si aplica):</label>
                  <input
                    type="text"
                    className="thFilterInput"
                    placeholder="DATO PENDIENTE"
                    value={maintCosto}
                    onChange={(e) => setMaintCosto(e.target.value)}
                    style={{ width: "100%", padding: "8px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Observaciones:</label>
                <textarea
                  className="thFilterInput"
                  rows={3}
                  placeholder="Notas adicionales..."
                  value={maintObservaciones}
                  onChange={(e) => setMaintObservaciones(e.target.value)}
                  style={{ width: "100%", padding: "8px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button type="button" className="thResetBtn" onClick={() => setShowMaintModal(false)}>Cancelar</button>
                <button type="submit" className="primaryButton">Guardar Mantenimiento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Registrar Labor */}
      {showWorkModal && (
        <div className="modalOverlay">
          <div className="modalCard" style={{ maxWidth: "560px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3>Registrar Labor / Uso a Campo</h3>
              <button className="thResetBtn" onClick={() => setShowWorkModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveWork} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Actividad / Labor:</label>
                <input
                  type="text"
                  className="thFilterInput"
                  placeholder="ej: Aplicación de efluente, siembra, confección de rollos"
                  value={workActividad}
                  onChange={(e) => setWorkActividad(e.target.value)}
                  style={{ width: "100%", padding: "8px" }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Campo:</label>
                  <select
                    className="thFilterSelect"
                    value={workCampo}
                    onChange={(e) => setWorkCampo(e.target.value)}
                    style={{ width: "100%", padding: "8px" }}
                  >
                    <option value="Tambo">Tambo</option>
                    <option value="Aguilera">Aguilera</option>
                    <option value="Racca">Racca</option>
                    <option value="Kitty">Kitty</option>
                    <option value="Keuneke">Keuneke</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Lote:</label>
                  <input
                    type="text"
                    className="thFilterInput"
                    placeholder="ej: Lote 1, Lote 7"
                    value={workLote}
                    onChange={(e) => setWorkLote(e.target.value)}
                    style={{ width: "100%", padding: "8px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Fecha:</label>
                  <input
                    type="date"
                    className="thFilterInput"
                    value={workFecha}
                    onChange={(e) => setWorkFecha(e.target.value)}
                    style={{ width: "100%", padding: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Campaña:</label>
                  <input
                    type="text"
                    className="thFilterInput"
                    value={workCampana}
                    onChange={(e) => setWorkCampana(e.target.value)}
                    style={{ width: "100%", padding: "8px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Operarios:</label>
                  <input
                    type="text"
                    className="thFilterInput"
                    placeholder="ej: Edgard, Gonzalo"
                    value={workOperadores}
                    onChange={(e) => setWorkOperadores(e.target.value)}
                    style={{ width: "100%", padding: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Unidad de Negocio:</label>
                  <select
                    className="thFilterSelect"
                    value={workUnidadNegocio}
                    onChange={(e) => setWorkUnidadNegocio(e.target.value as MachineryWorkRecord["unidadNegocio"])}
                    style={{ width: "100%", padding: "8px" }}
                  >
                    <option value="Transversal">Transversal</option>
                    <option value="HJB Leche">HJB Leche</option>
                    <option value="HJB Cereales">HJB Cereales</option>
                    <option value="HJB Carne">HJB Carne</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Superficie (ha):</label>
                <input
                  type="number"
                  step="0.1"
                  className="thFilterInput"
                  placeholder="ej: 25.5"
                  value={workSuperficie}
                  onChange={(e) => setWorkSuperficie(e.target.value)}
                  style={{ width: "100%", padding: "8px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Observaciones:</label>
                <textarea
                  className="thFilterInput"
                  rows={2}
                  placeholder="Detalles del trabajo..."
                  value={workObservaciones}
                  onChange={(e) => setWorkObservaciones(e.target.value)}
                  style={{ width: "100%", padding: "8px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button type="button" className="thResetBtn" onClick={() => setShowWorkModal(false)}>Cancelar</button>
                <button type="submit" className="primaryButton">Guardar Labor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
