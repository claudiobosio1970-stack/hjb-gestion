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

  return (
    <div className="appShell">
      <Sidebar active={active} email={email} onLogout={handleLogout} />
      <main className="content">
        <header className="topbar">
          <div>
            <strong>HJB Gestión</strong>
          </div>
          <div className="topActions">
            <button className="ghostButton">Buscar</button>
            <div className="avatar small">H</div>
          </div>
        </header>
        <div className="pageBody">{children}</div>
      </main>
    </div>
  );
}
