"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CampoGeo, getCamposGeo, saveCampoCoordinates, resetAllCampoCoordinates } from "@/lib/geoData";

declare global {
  interface Window {
    google?: any;
    initHJBGoogleMap?: () => void;
  }
}

export default function GoogleMapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoWindowRef = useRef<any>(null);

  const [campos, setCampos] = useState<CampoGeo[]>([]);
  const [selectedCampo, setSelectedCampo] = useState<CampoGeo | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const DEFAULT_MAPS_KEY = "AIzaSyDlcWjg9_Tb3ZnvVkL-loRridz6AuVD5R4";
  const [apiKey, setApiKey] = useState<string>(
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || DEFAULT_MAPS_KEY
  );
  const [inputKey, setInputKey] = useState<string>(
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || DEFAULT_MAPS_KEY
  );
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Cargar datos geográficos al montar
  useEffect(() => {
    setCampos(getCamposGeo());
    const envKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || DEFAULT_MAPS_KEY;
    const storedKey = typeof window !== "undefined" ? localStorage.getItem("hjb_gmaps_api_key") || "" : "";
    const activeKey = storedKey || envKey;
    setApiKey(activeKey);
    setInputKey(activeKey);

    // Escuchar posibles errores de autenticación de Google Maps
    (window as any).gm_authFailure = () => {
      setLoadError("Google Maps reportó que la clave requiere verificar que la 'Maps JavaScript API' esté habilitada en Google Cloud Console.");
    };
  }, []);

  // Inicializar Google Maps
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Si ya existe la instancia de Google Maps en window
    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    // Si no hay API key todavía
    if (!apiKey) {
      setLoadError("Falta configurar la clave de Google Maps API (API Key)");
      return;
    }

    setLoadError(null);
    const existingScript = document.getElementById("google-maps-script");
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initMap();
    };
    script.onerror = () => {
      setLoadError("No se pudo conectar con los servidores de Google Maps. Verificá la clave o la conexión.");
    };
    document.head.appendChild(script);

    return () => {
      // cleanup si desmonta
    };
  }, [apiKey]);

  function initMap() {
    if (!mapContainerRef.current || !window.google || !window.google.maps) return;

    try {
      const centerCoords = { lat: -31.435, lng: -62.075 };
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: centerCoords,
        zoom: 12,
        mapTypeId: "hybrid", // Satelital con nombres de rutas, pueblos y caminos
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_RIGHT,
        },
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });

      mapInstanceRef.current = map;
      infoWindowRef.current = new window.google.maps.InfoWindow();

      renderMarkers(map, campos, isCalibrating);
      setMapLoaded(true);
      setLoadError(null);
    } catch (err: any) {
      console.error("Error inicializando mapa:", err);
      setLoadError("Error al inicializar Google Maps: " + (err.message || String(err)));
    }
  }

  // Renderizar o actualizar marcadores
  function renderMarkers(map: any, camposList: CampoGeo[], calibrating: boolean) {
    if (!map || !window.google || !window.google.maps) return;

    // Limpiar marcadores viejos
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    const bounds = new window.google.maps.LatLngBounds();

    camposList.forEach((campo) => {
      const position = { lat: campo.lat, lng: campo.lng };
      bounds.extend(position);

      // Crear pin SVG estilizado con el color del campo
      const pinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/>
            </filter>
          </defs>
          <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 28 18 28s18-14.5 18-28C36 8.06 27.94 0 18 0z" fill="${campo.color}" filter="url(#shadow)"/>
          <circle cx="18" cy="18" r="13" fill="#ffffff"/>
          <text x="18" y="22" font-size="12" font-weight="bold" font-family="system-ui, sans-serif" fill="${campo.color}" text-anchor="middle">
            ${campo.nombre.substring(0, 2).toUpperCase()}
          </text>
        </svg>
      `;

      const marker = new window.google.maps.Marker({
        position,
        map,
        title: `${campo.nombre} (${campo.superficie})`,
        draggable: calibrating,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(pinSvg),
          scaledSize: new window.google.maps.Size(36, 46),
          anchor: new window.google.maps.Point(18, 46),
        },
      });

      // Evento de arrastre al calibrar
      if (calibrating) {
        marker.addListener("dragend", (e: any) => {
          const newLat = Number(e.latLng.lat().toFixed(6));
          const newLng = Number(e.latLng.lng().toFixed(6));
          saveCampoCoordinates(campo.id, newLat, newLng);

          setCampos((prev) =>
            prev.map((c) => (c.id === campo.id ? { ...c, lat: newLat, lng: newLng } : c))
          );
          setStatusNotice(`✓ Coordenadas de "${campo.nombre}" actualizadas a: ${newLat}, ${newLng}`);
          setTimeout(() => setStatusNotice(null), 4500);
        });
      }

      // Evento clic en marcador
      marker.addListener("click", () => {
        setSelectedCampo(campo);
        focusOnCampo(campo);
        openInfoWindow(map, marker, campo);
      });

      markersRef.current.set(campo.id, marker);
    });
  }

  function openInfoWindow(map: any, marker: any, campo: CampoGeo) {
    if (!infoWindowRef.current) return;

    const contentString = `
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px 4px; min-width: 220px; color: #0f172a;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 2px 7px; border-radius: 4px;">
            ${campo.estado}
          </span>
          <strong style="font-size: 13px; color: #15803d;">${campo.superficie}</strong>
        </div>
        <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 800; color: #0f172a;">
          📍 Campo ${campo.nombre}
        </h3>
        <p style="margin: 0 0 8px 0; font-size: 12.5px; color: #475569;">
          <strong>Cultivo:</strong> ${campo.cultivoPrincipal}<br/>
          <strong>Subdivisión:</strong> ${campo.cantLotes} ${campo.cantLotes === 1 ? "lote único" : "lotes"}
        </p>
        <div style="margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          <a href="/agricultura/${campo.slug}" style="display: block; text-align: center; background: #166534; color: #ffffff; text-decoration: none; padding: 7px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 700;">
            Ver labores y lotes →
          </a>
        </div>
      </div>
    `;

    infoWindowRef.current.setContent(contentString);
    infoWindowRef.current.open(map, marker);
  }

  function focusOnCampo(campo: CampoGeo) {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.panTo({ lat: campo.lat, lng: campo.lng });
    mapInstanceRef.current.setZoom(14);
    setSelectedCampo(campo);

    const marker = markersRef.current.get(campo.id);
    if (marker) {
      openInfoWindow(mapInstanceRef.current, marker, campo);
    }
  }

  function fitAllBounds() {
    if (!mapInstanceRef.current || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    campos.forEach((c) => bounds.extend({ lat: c.lat, lng: c.lng }));
    mapInstanceRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    setSelectedCampo(null);
    if (infoWindowRef.current) infoWindowRef.current.close();
  }

  function toggleCalibrating() {
    const nextState = !isCalibrating;
    setIsCalibrating(nextState);
    if (mapInstanceRef.current) {
      renderMarkers(mapInstanceRef.current, campos, nextState);
    }
  }

  function handleSaveKey(newKey: string) {
    const cleaned = newKey.trim();
    localStorage.setItem("hjb_gmaps_api_key", cleaned);
    setApiKey(cleaned);
    setShowKeyModal(false);
  }

  function handleResetCoords() {
    if (window.confirm("¿Deseás restaurar las coordenadas de los 5 campos a los valores predeterminados?")) {
      resetAllCampoCoordinates();
      const defs = getCamposGeo();
      setCampos(defs);
      if (mapInstanceRef.current) {
        renderMarkers(mapInstanceRef.current, defs, isCalibrating);
      }
      setStatusNotice("✓ Coordenadas restauradas a valores iniciales.");
      setTimeout(() => setStatusNotice(null), 4000);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Barra de Control Superior */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          background: "var(--card-bg, #ffffff)",
          padding: "14px 18px",
          borderRadius: "12px",
          border: "1px solid var(--line, #e2e8f0)",
          boxShadow: "var(--shadow-sm, 0 1px 2px 0 rgba(0,0,0,0.05))",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--brand-900, #064e3b)" }}>
            Visor Geográfico Satelital
          </h2>
          <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "var(--muted, #64748b)" }}>
            Google Maps Híbrido · Cobertura completa de los 5 campos HJB
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondaryButton"
            onClick={fitAllBounds}
            title="Encuadra la vista para abarcar todos los campos en pantalla"
            style={{ fontSize: "12.5px", padding: "6px 14px" }}
          >
            🌍 Ver todos los campos
          </button>

          <button
            type="button"
            className={isCalibrating ? "primaryButton" : "secondaryButton"}
            onClick={toggleCalibrating}
            style={{
              fontSize: "12.5px",
              padding: "6px 14px",
              borderColor: isCalibrating ? "var(--amber-500, #f59e0b)" : undefined,
              backgroundColor: isCalibrating ? "var(--amber-600, #d97706)" : undefined,
            }}
            title="Permite arrastrar los marcadores para ubicar cada campo en el lugar exacto"
          >
            {isCalibrating ? "✓ Finalizar calibración" : "📍 Calibrar coordenadas"}
          </button>

          <button
            type="button"
            className="thResetBtn"
            onClick={() => setShowKeyModal(true)}
            style={{ fontSize: "12px", padding: "6px 10px" }}
            title="Configurar clave de Google Maps API"
          >
            ⚙️ Clave API {apiKey ? "(Configurada)" : "(Pendiente)"}
          </button>
        </div>
      </div>

      {/* Notificación de estado si se calibró algo */}
      {statusNotice && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            color: "#166534",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          {statusNotice}
        </div>
      )}

      {isCalibrating && (
        <div
          style={{
            padding: "12px 18px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "10px",
            color: "#92400e",
            fontSize: "13px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <strong>Modo Calibración Activo:</strong> Podés arrastrar cualquiera de los 5 pines con el cursor hasta su ubicación real. La latitud y longitud se guardarán automáticamente en tu navegador.
          </div>
          <button
            type="button"
            onClick={handleResetCoords}
            className="thResetBtn"
            style={{ fontSize: "11.5px", color: "#b45309" }}
          >
            Restaurar predeterminados
          </button>
        </div>
      )}

      {/* Contenedor Principal: Lista de Campos + Mapa */}
      <div className="mapGridResponsive">
        {/* Panel Lateral de Campos */}
        <div className="mapSidebarFields">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <strong style={{ fontSize: "14px", color: "var(--slate-800, #1e293b)" }}>
              Establecimientos ({campos.length})
            </strong>
            <span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
              Total: 590 ha
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {campos.map((campo) => {
              const isSelected = selectedCampo?.id === campo.id;
              return (
                <div
                  key={campo.id}
                  onClick={() => focusOnCampo(campo)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: `1.5px solid ${isSelected ? campo.color : "var(--line, #e2e8f0)"}`,
                    background: isSelected ? `${campo.color}0d` : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease-in-out",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: campo.color,
                          display: "inline-block",
                        }}
                      />
                      <strong style={{ fontSize: "14px", color: "var(--slate-900, #0f172a)" }}>
                        {campo.nombre}
                      </strong>
                    </div>
                    <span
                      className="pill"
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        backgroundColor: isSelected ? campo.color : "var(--slate-100, #f1f5f9)",
                        color: isSelected ? "#ffffff" : "var(--slate-700, #334155)",
                        padding: "2px 8px",
                      }}
                    >
                      {campo.superficie}
                    </span>
                  </div>

                  <p style={{ margin: "2px 0 6px 0", fontSize: "12px", color: "var(--slate-600, #475569)", lineHeight: 1.3 }}>
                    {campo.cultivoPrincipal}
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
                    <span style={{ color: "var(--muted, #64748b)" }}>
                      Lat: {campo.lat.toFixed(4)}, Lng: {campo.lng.toFixed(4)}
                    </span>
                    <Link
                      href={`/agricultura/${campo.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontWeight: 700,
                        color: campo.color,
                        textDecoration: "none",
                      }}
                    >
                      Ver campo →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visor del Mapa Google Maps */}
        <div className="mapVisorContainer">
          <div ref={mapContainerRef} className="mapCanvas" />

          {/* Mensaje de carga o aviso de API Key */}
          {loadError && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "rgba(15, 23, 42, 0.95)",
                color: "#ffffff",
                padding: "28px",
                borderRadius: "14px",
                maxWidth: "460px",
                textAlign: "center",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>🗺️</div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "17px", fontWeight: 700 }}>
                Integración con Google Maps API
              </h3>
              <p style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "16px" }}>
                Para proyectar la vista satelital oficial, se requiere una clave de <strong>Google Maps JavaScript API</strong>.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  type="button"
                  className="primaryButton"
                  onClick={() => setShowKeyModal(true)}
                  style={{ width: "100%", padding: "10px", fontWeight: 700 }}
                >
                  🔑 Ingresar o configurar Clave de API
                </button>
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={() => {
                    // Cargar mapa embebido de respaldo
                    setLoadError(null);
                  }}
                  style={{ width: "100%", fontSize: "12px", color: "#94a3b8" }}
                >
                  Explorar campos desde el listado lateral
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para configurar API Key */}
      {showKeyModal && (
        <div className="modalBackdrop" onClick={() => setShowKeyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow" style={{ color: "var(--brand-700)", fontWeight: 700 }}>
                  Configuración Geográfica
                </p>
                <h2>Google Maps API Key</h2>
              </div>
              <button type="button" className="iconButton" onClick={() => setShowKeyModal(false)}>
                ×
              </button>
            </div>

            <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <p style={{ fontSize: "13px", color: "var(--slate-600)", lineHeight: 1.5, margin: 0 }}>
                Podés pegar aquí tu clave de <strong>Google Maps JavaScript API</strong> generada en Google Cloud Console. Quedará guardada para visualizar las capas satelitales en vivo.
              </p>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-800)" }}>
                  Clave de API (ej: AIzaSy...)
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ marginTop: "4px" }}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="Pegar Google Maps API Key..."
                />
              </div>

              <div style={{ background: "var(--slate-50)", padding: "12px", borderRadius: "8px", fontSize: "12px", color: "var(--slate-600)" }}>
                ℹ️ También podés definirla en las variables de entorno de producción como:
                <code style={{ display: "block", marginTop: "4px", color: "var(--brand-800)", fontWeight: 700 }}>
                  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_clave_aqui
                </code>
              </div>
            </div>

            <div className="modalFooter" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="secondaryButton" onClick={() => setShowKeyModal(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="primaryButton"
                onClick={() => handleSaveKey(inputKey)}
              >
                Guardar y Conectar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
