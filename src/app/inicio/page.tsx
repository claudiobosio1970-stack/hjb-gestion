import Link from "next/link";
import AppShell from "@/components/AppShell";
import MetricCard from "@/components/MetricCard";
import { campos } from "@/lib/mockData";

export default function InicioPage() {
  return (
    <AppShell active="Inicio">
      <div className="pageHeader">
        <div>
          <div className="badgeRow">
            <span className="pill badgeGreen">Operaciones HJB</span>
            <span className="pill badgeSlate">Campaña 2026/27</span>
          </div>
          <h1>Panel de Control</h1>
          <p className="muted">Resumen ejecutivo y operativo de las tres unidades productivas de HJB.</p>
        </div>
      </div>

      {/* Tres Pilares Productivos Reales */}
      <section className="section">
        <div className="sectionTitle">
          <div>
            <h2>Unidades Productivas</h2>
            <p className="muted">Ejes centrales de la operación agropecuaria de HJB.</p>
          </div>
        </div>

        <div className="pillarsGrid">
          {/* Agricultura */}
          <Link href="/agricultura" className="pillarCard featurePillar clickableCard">
            <div className="pillarHeader">
              <div className="pillarIconWrap iconGreen">🌾</div>
              <span className="statusPill statusActive">Operativo v0.4</span>
            </div>
            <h3>Agricultura</h3>
            <p className="pillarDesc">
              Centraliza todos los campos de la empresa. Campañas, rotaciones, labores (Plan vs Real), insumos y suelos.
            </p>
            <div className="pillarMeta">
              <span><strong>5</strong> campos</span>
              <span><strong>Maíz / Pasturas</strong></span>
            </div>
          </Link>

          {/* Tambo */}
          <Link href="/tambo" className="pillarCard clickableCard">
            <div className="pillarHeader">
              <div className="pillarIconWrap iconBlue">🥛</div>
              <span className="statusPill statusUpcoming">En desarrollo</span>
            </div>
            <h3>Tambo</h3>
            <p className="pillarDesc">
              Gestión lechera integral: rodeo en ordeñe, vacas secas, entregas diarias de leche, calidad, sanidad y forrajes.
            </p>
            <div className="pillarMeta">
              <span><strong>9</strong> lotes forrajeros</span>
              <span><strong>Rodeo lechero</strong></span>
            </div>
          </Link>

          {/* Ganadería */}
          <Link href="/ganaderia" className="pillarCard clickableCard">
            <div className="pillarHeader">
              <div className="pillarIconWrap iconAmber">🐂</div>
              <span className="statusPill statusUpcoming">En desarrollo</span>
            </div>
            <h3>Ganadería</h3>
            <p className="pillarDesc">
              Producción de carne: tropas, recría, terminación, pesajes, ganancias diarias de peso vivo y sanidad.
            </p>
            <div className="pillarMeta">
              <span><strong>Recría</strong> & terminación</span>
              <span><strong>Hacienda</strong></span>
            </div>
          </Link>
        </div>
      </section>

      {/* Todos los Campos bajo Agricultura */}
      <section className="section">
        <div className="sectionTitle">
          <div>
            <h2>Campos en Agricultura</h2>
            <p className="muted">Todos los establecimientos de HJB integrados en el área agrícola.</p>
          </div>
          <Link href="/agricultura" className="inlineLink">Ver gestión completa →</Link>
        </div>

        <div className="fieldCardsGrid">
          {campos.map((campo) => (
            <Link
              key={campo.nombre}
              href={`/agricultura/${campo.slug}`}
              className={`fieldCardModern ${campo.estado === "Activo" ? "borderActive" : ""}`}
            >
              <div className="fieldCardTop">
                <span className="fieldName">{campo.nombre}</span>
                <span className={`statusDot ${campo.estado === "Activo" ? "dotGreen" : "dotAmber"}`}>
                  {campo.estado}
                </span>
              </div>
              <div className="fieldSuperficie">{campo.superficie}</div>
              <p className="fieldDetail">{campo.detalle}</p>
              <span className="fieldAction">
                "Ver campo y lotes →"
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Indicadores Clave */}
      <section className="section">
        <div className="sectionTitle">
          <div>
            <h2>Indicadores de Campaña 2026/27</h2>
            <p className="muted">Métricas consolidadas del ejercicio actual.</p>
          </div>
        </div>
        <div className="metricsGrid four">
          <MetricCard label="Campos Totales" value="5" note="Superficie centralizada" />
          <MetricCard label="Destino Maíz Agrícola" value="3 campos" note="Aguilera, Racca 2, Kitty" />
          <MetricCard label="Maíz Forrajero Tambo" value="43 ha" note="Superficie confirmada" />
          <MetricCard label="Estado del Sistema" value="Tester Activo" note="Ambiente de pruebas" />
        </div>
      </section>
    </AppShell>
  );
}
