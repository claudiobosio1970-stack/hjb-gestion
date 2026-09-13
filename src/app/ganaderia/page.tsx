import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";

export default function GanaderiaPage() {
  return (
    <AppShell active="Ganadería">
      <div className="pageHeader">
        <div>
          <div className="badgeRow">
            <span className="pill badgeAmber">Producción de Carne</span>
            <span className="pill badgeSlate">Campaña 2026/27</span>
          </div>
          <h1>Ganadería HJB</h1>
          <p className="muted">Recría, terminación, pesajes, sanidad y ventas.</p>
        </div>
      </div>

      <div className="metricsGrid four">
        <MetricCard label="Cabezas Totales" value="--" note="Inventario de hacienda" />
        <MetricCard label="Tropas Activas" value="--" note="Recría / Terminación" />
        <MetricCard label="Ganancia Diaria" value="-- kg/d" note="Promedio de pesajes" />
        <MetricCard label="Estado" value="En maduración" note="Próxima integración" />
      </div>

      <section className="section">
        <div className="sectionTitle">
          <div>
            <h2>Módulos Ganaderos</h2>
            <p className="muted">Estructura operativa para el ciclo ganadero de carne.</p>
          </div>
        </div>

        <div className="gridThree">
          <div className="pillarCard">
            <div className="pillarIcon">🐂</div>
            <h3>Tropas y Categorías</h3>
            <p>Seguimiento por lotes de animales, caravanas, categorías (terneros, novillitos, vaquillonas).</p>
            <span className="statusPill statusUpcoming">Próximamente</span>
          </div>

          <div className="pillarCard">
            <div className="pillarIcon">⚖️</div>
            <h3>Pesajes y Ganancia Diaria</h3>
            <p>Curvas de crecimiento, ganancia diaria de peso vivo (GDPV) y eficiencia de conversión.</p>
            <span className="statusPill statusUpcoming">Próximamente</span>
          </div>

          <div className="pillarCard">
            <div className="pillarIcon">📋</div>
            <h3>Sanidad y Movimientos</h3>
            <p>Calendario sanitario, vacunaciones, traslados entre potreros y remitos de faena/venta.</p>
            <span className="statusPill statusUpcoming">Próximamente</span>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
