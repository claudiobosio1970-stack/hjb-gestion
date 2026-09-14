"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Sidebar from "./Sidebar";

export default function AppShell({
  active,
  children,
}: {
  active?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/");
        return;
      }
      setEmail(user.email ?? "");
      setReady(true);
    });
    return unsubscribe;
  }, [router]);

  async function handleLogout() {
    await signOut(auth);
    router.replace("/");
  }

  if (!ready) {
    return (
      <main className="authLoading">
        <div className="authLoadingCard">
          <div className="brandMark compact">HJB</div>
          <p>Verificando acceso…</p>
        </div>
      </main>
    );
  }

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="appShell">
      <Sidebar
        active={active}
        email={email}
        onLogout={handleLogout}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {mobileNavOpen && (
        <div
          className="mobileNavBackdrop"
          onClick={() => setMobileNavOpen(false)}
          title="Tocar para cerrar el menú"
        />
      )}

      <main className="content">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              className="hamburgerBtn"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label="Abrir menú de navegación"
              title="Abrir menú"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="brandMark compact mobileBrandMark">HJB</span>
              <strong>HJB Gestión</strong>
            </div>
          </div>
          <div className="topActions">
            <button className="ghostButton searchBtnMobile">Buscar</button>
            <div className="avatar small">H</div>
          </div>
        </header>
        <div className="pageBody">{children}</div>
      </main>
    </div>
  );
}
