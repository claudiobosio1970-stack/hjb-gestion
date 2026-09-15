import Link from "next/link";

type Props = {
  active?: string;
  email?: string;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};

const navigation = [
  {
    name: "Inicio",
    href: "/inicio",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    name: "Agricultura",
    href: "/agricultura",
    badge: "5 campos",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
      </svg>
    ),
  },
  {
    name: "Mapa de Campos",
    href: "/mapa",
    badge: "GPS",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        <line x1="9" x2="9" y1="3" y2="18"/>
        <line x1="15" x2="15" y1="6" y2="21"/>
      </svg>
    ),
  },
  {
    name: "Tambo",
    href: "/tambo",
    badge: "Lechero",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 2h10"/>
        <path d="M5 6h14"/>
        <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"/>
        <path d="M10 10v6"/>
        <path d="M14 10v6"/>
      </svg>
    ),
  },
  {
    name: "Ganadería",
    href: "/ganaderia",
    badge: "Carne",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="m14 8-4 8"/>
        <path d="M10 8h4"/>
        <path d="M10 16h4"/>
      </svg>
    ),
  },
];

const secondaryNav = [
  {
    name: "Valores Móviles",
    href: "/mercados",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    name: "Insumos & Stock",
    href: "/agricultura/aguilera#insumos",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7.5 4.27 9 5.15"/>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
        <path d="m3.3 7 8.7 5 8.7-5"/>
        <path d="M12 22V12"/>
      </svg>
    ),
  },
  {
    name: "Maquinarias",
    href: "/maquinarias",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
  {
    name: "Administración",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];

export default function Sidebar({ active, email, onLogout, mobileOpen, onCloseMobile }: Props) {
  return (
    <aside className={`sidebar ${mobileOpen ? "sidebarMobileOpen" : ""}`}>
      <div className="sideTop">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <Link href="/inicio" className="sideBrand" onClick={onCloseMobile} style={{ flex: 1 }}>
            <div className="brandLogo">HJB</div>
            <div className="brandText">
              <strong>HJB GESTIÓN</strong>
              <span className="brandTag">AGROPECUARIA</span>
            </div>
          </Link>
          {onCloseMobile && (
            <button
              type="button"
              className="sidebarCloseBtn"
              onClick={onCloseMobile}
              title="Cerrar menú"
              aria-label="Cerrar menú"
            >
              ✕
            </button>
          )}
        </div>

        <div className="navGroup">
          <span className="navGroupTitle">PRODUCCIÓN</span>
          <nav className="sideNav">
            {navigation.map((item) => {
              const isActive = active === item.name;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`navItem ${isActive ? "active" : ""}`}
                  onClick={onCloseMobile}
                >
                  <span className="navIcon">{item.icon}</span>
                  <span className="navLabel">{item.name}</span>
                  {item.badge && <span className="navBadge">{item.badge}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="navGroup">
          <span className="navGroupTitle">SOPORTE & GESTIÓN</span>
          <nav className="sideNav">
            {secondaryNav.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`navItem secondary ${active === item.name ? "active" : ""}`}
                onClick={onCloseMobile}
              >
                <span className="navIcon">{item.icon}</span>
                <span className="navLabel">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="sideFooter">
        <div className="sideUserCard">
          <div className="avatarCircle">
            {email ? email.charAt(0).toUpperCase() : "H"}
          </div>
          <div className="sideUserText">
            <span className="userName">Equipo HJB</span>
            <span className="userEmail" title={email}>{email || "Sesión activa"}</span>
          </div>
        </div>
        <button
          className="sideLogoutBtn"
          onClick={() => {
            onCloseMobile?.();
            onLogout?.();
          }}
          title="Cerrar sesión"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Salir</span>
        </button>
      </div>
    </aside>
  );
}
