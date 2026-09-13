import Link from "next/link";

type Props = {
  active?: string;
  email?: string;
  onLogout?: () => void;
};

const items = [
  ["Inicio", "/inicio"],
  ["Leche", "#"],
  ["Cereales", "#"],
  ["Carne", "#"],
  ["Agricultura", "/agricultura"],
  ["Animales", "#"],
  ["Compras", "#"],
  ["Inventario", "#"],
  ["Maquinarias", "#"],
  ["Administración", "#"],
  ["Documentos", "#"],
];

export default function Sidebar({ active, email, onLogout }: Props) {
  return (
    <aside className="sidebar">
      <div>
        <Link href="/inicio" className="sideBrand">
          <strong>HJB</strong>
          <span>GESTIÓN</span>
        </Link>

        <nav className="sideNav">
          {items.map(([name, href], idx) => (
            <div key={name}>
              {(idx === 4 || idx === 9) && <div className="navDivider" />}
              <Link
                href={href}
                className={active === name ? "navItem active" : "navItem"}
              >
                {name}
              </Link>
            </div>
          ))}
        </nav>
      </div>

      <div className="sideFooter">
        <div className="sideUser">
          <div className="avatar">H</div>
          <div className="sideUserText">
            <strong>Usuario HJB</strong>
            <small title={email}>{email || "Autenticado"}</small>
          </div>
        </div>
        <button className="sideLogout" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
