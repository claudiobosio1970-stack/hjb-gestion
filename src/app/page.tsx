"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
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
  const [viewMode, setViewMode] = useState<"login" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Estados para recuperación de contraseña
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");

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

  async function doResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResetSuccess("");

    const targetEmail = email.trim();
    if (!targetEmail) {
      setError("Por favor ingresá tu correo electrónico.");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetSuccess(
        `Te enviamos un correo a "${targetEmail}" con el enlace para restablecer tu contraseña. Revisá tu bandeja de entrada o la carpeta de spam.`
      );
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") {
        setError("No existe ninguna cuenta registrada con este correo electrónico.");
      } else if (err?.code === "auth/invalid-email") {
        setError("El correo electrónico no tiene un formato válido.");
      } else if (err?.code === "auth/too-many-requests") {
        setError("Se realizaron demasiadas solicitudes. Aguardá unos minutos antes de reintentar.");
      } else {
        setError("No pudimos enviar el correo de recuperación. Verificá los datos o consultá al administrador.");
      }
    } finally {
      setResetLoading(false);
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
        {viewMode === "login" ? (
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

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "6px" }}>
              <label htmlFor="password" style={{ margin: "18px 0 7px" }}>Contraseña</label>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setResetSuccess("");
                  setViewMode("reset");
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "var(--brand-700)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {error && (
              <div
                style={{
                  marginTop: "14px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            <button className="primaryButton full" type="submit" disabled={loading}>
              {loading ? "Ingresando…" : "Ingresar"}
            </button>

            <p className="prototypeNote">
              Acceso validado por Firebase Authentication.
            </p>
          </form>
        ) : (
          <form className="loginCard" onSubmit={doResetPassword}>
            <p className="eyebrow">HJB Gestión</p>
            <h2>Recuperar Contraseña</h2>
            <p className="muted">
              Ingresá tu correo electrónico y te enviaremos un enlace oficial de Google para crear una nueva clave.
            </p>

            <label htmlFor="reset-email">Correo electrónico registrado</label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@hjb.com"
              required
              autoFocus
            />

            {error && (
              <div
                style={{
                  marginTop: "14px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            {resetSuccess && (
              <div
                style={{
                  marginTop: "14px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  fontSize: "13px",
                  lineHeight: "1.45",
                }}
              >
                <strong>✓ Correo enviado con éxito.</strong>
                <div style={{ marginTop: "4px" }}>{resetSuccess}</div>
              </div>
            )}

            <button
              className="primaryButton full"
              type="submit"
              disabled={resetLoading}
              style={{ marginTop: resetSuccess ? "16px" : "22px" }}
            >
              {resetLoading ? "Enviando correo…" : "Enviar enlace de recuperación"}
            </button>

            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setResetSuccess("");
                  setViewMode("login");
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: "6px 12px",
                  color: "var(--slate-600)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                ← Volver al inicio de sesión
              </button>
            </div>

            <p className="prototypeNote">
              Servicio de recuperación seguro provisto por Firebase Authentication.
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
