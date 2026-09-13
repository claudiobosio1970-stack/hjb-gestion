"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

function friendlyError(code?: string) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "El correo o la contraseña no son correctos.";
    case "auth/invalid-email":
      return "El correo electrónico no tiene un formato válido.";
    case "auth/too-many-requests":
      return "Hubo demasiados intentos. Esperá unos minutos y probá otra vez.";
    default:
      return "No pudimos iniciar sesión. Revisá los datos e intentá nuevamente.";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/inicio");
      } else {
        setChecking(false);
      }
    });
    return unsubscribe;
  }, [router]);

  async function doLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/inicio");
    } catch (err: any) {
      setError(friendlyError(err?.code));
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="authLoading">
        <div className="authLoadingCard">
          <div className="brandMark compact">HJB</div>
          <p>Verificando sesión…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="loginPage">
      <section className="loginHero">
        <div className="brandMark">HJB</div>
        <div className="brandSub">GESTIÓN</div>
        <div className="heroCopy">
          <h1>Una sola plataforma para gestionar HJB.</h1>
          <p>Datos, procesos, historia y decisiones en un mismo lugar.</p>
        </div>
      </section>

      <section className="loginPanel">
        <form className="loginCard" onSubmit={doLogin}>
          <p className="eyebrow">HJB Gestión</p>
          <h2>Bienvenido</h2>
          <p className="muted">Ingresá con tu usuario autorizado.</p>

          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@hjb.com"
            required
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && <div className="errorMessage">{error}</div>}

          <button className="primaryButton full" type="submit" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </button>

          <p className="prototypeNote">
            Acceso validado por Firebase Authentication.
          </p>
        </form>
      </section>
    </main>
  );
}
