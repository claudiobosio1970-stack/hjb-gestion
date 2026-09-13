import Link from "next/link";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";

export default function InicioPage() {
  return (
    <AppShell active="Inicio">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Resumen general</p>
          <h1>HJB hoy</h1>
          <p className="muted">Una vista simple de la empresa y sus áreas.</p>
        </div>
      </div>

      <section className="businessGrid">
        <Link href="#" className="businessCard">
          <span className="businessTag">10</span>
          <h3>HJB Leche</h3>
          <p>Producción, rodeo, alimentación y sanidad.</p>
          <strong>Entrar →</strong>
        </Link>

        <Link href="#" className="businessCard">
          <span className="businessTag">20</span>
          <h3>HJB Cereales</h3>
          <p>Agricultura, campañas, producción y resultados.</p>
          <strong>Entrar →</strong>
        </Link>

        <Link href="#" className="businessCard">
          <span className="businessTag">30</span>
          <h3>HJB Carne</h3>
          <p>Recría, terminación, pesos, ventas y margen.</p>
          <strong>Entrar →</strong>
        </Link>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <h2>Procesos transversales</h2>
        </div>
        <div className="quickGrid">
          <Link href="/agricultura" className="quickCard">
            <strong>Agricultura</strong>
            <span>Campos, lotes, campañas y actividades</span>
          </Link>
          <div className="quickCard"><strong>Animales</strong><span>Próximamente</span></div>
          <div className="quickCard"><strong>Compras</strong><span>Próximamente</span></div>
          <div className="quickCard"><strong>Inventario</strong><span>Próximamente</span></div>
          <div className="quickCard"><strong>Maquinarias</strong><span>Próximamente</span></div>
          <div className="quickCard"><strong>Administración</strong><span>Próximamente</span></div>
        </div>
      </section>

      <section className="twoCol">
        <div className="panel">
          <div className="sectionTitle"><h2>Indicadores</h2></div>
          <div className="metricsGrid">
            <MetricCard label="Campos" value="5" note="Maestro inicial" />
            <MetricCard label="Campaña" value="2026/27" note="Activa" />
            <MetricCard label="Maíces agrícolas" value="3" note="Destinos confirmados" />
          </div>
        </div>

        <div className="panel">
          <div className="sectionTitle"><h2>Alertas y tareas</h2></div>
          <div className="emptyState">
            Todavía no hay alertas operativas cargadas.
          </div>
        </div>
      </section>
    </AppShell>
  );
}
