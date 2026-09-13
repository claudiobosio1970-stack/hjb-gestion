import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";

export default function TamboPage() {
  return (
    <AppShell active="Tambo">
      <div className="pageHeader">
        <div>
          <div className="badgeRow">
            <span className="pill badgeGreen">Producción Lechera</span>
            <span className="pill badgeSlate">Campaña 2026/27</span>
          </div>
          <h1>Tambo HJB</h1>
          <p className="muted">Control lechero, rodeo, alimentación y sanidad en Tambo.</p>
        </div>
      </div>

      <div className="metricsGrid four">
        <MetricCard label="Vacas en Ordeñe" value="--" note="Configurando rodeo" />
        <MetricCard label="Litros / Día" value="--" note="Promedio diario" />
        <MetricCard label="Lotes Forrajeros" value="9" note="Tambo (43 ha maíz/pasturas)" />
        <MetricCard label="Estado" value="En maduración" note="Próxima integración" />
      </div>

      <section className="section">
        <div className="sectionTitle">
          <div>
            <h2>Módulos del Tambo</h2>
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

          <div className="pillarCard">
            <div className="pillarIcon">🌱</div>
            <h3>Alimentación y Forrajes</h3>
            <p>Dieta diaria, ración, silo de maíz, pasturas en lotes de Tambo y balance de reservas.</p>
            <span className="statusPill statusUpcoming">Próximamente</span>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
