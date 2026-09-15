"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CampoGeo,
  LoteGeo,
  getCamposGeo,
  getLotesGeo,
  saveCampoCoordinates,
  resetAllCampoCoordinates,
  saveLoteGeo,
  updateLoteCoordinates,
  deleteLoteGeo,
  resetAllLotesGeo,
} from "@/lib/geoData";

declare global {
  interface Window {
    google?: any;
    initHJBGoogleMap?: () => void;
  }
}

function computePolygonCentroid(coords: Array<{ lat: number; lng: number }>): { lat: number; lng: number } {
  if (!coords || coords.length === 0) return { lat: 0, lng: 0 };
  let sumLat = 0;
  let sumLng = 0;
  coords.forEach((c) => {
    sumLat += c.lat;
    sumLng += c.lng;
  });
  return { lat: sumLat / coords.length, lng: sumLng / coords.length };
}

export default function GoogleMapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const polygonsRef = useRef<Map<string, any>>(new Map());
  const labelMarkersRef = useRef<Map<string, any>>(new Map());
  const drawingManagerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  const [campos, setCampos] = useState<CampoGeo[]>([]);
  const [lotes, setLotes] = useState<LoteGeo[]>([]);
  const [selectedCampo, setSelectedCampo] = useState<CampoGeo | null>(null);
  const [selectedLote, setSelectedLote] = useState<LoteGeo | null>(null);

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isTracing, setIsTracing] = useState(false);
  const [isEditingVertices, setIsEditingVertices] = useState(false);
  const [showLotesLayer, setShowLotesLayer] = useState(true);
  const [activeTab, setActiveTab] = useState<"campos" | "lotes">("lotes");

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

  // Modal para guardar nuevo lote trazado
  const [showNewLoteModal, setShowNewLoteModal] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<Array<{ lat: number; lng: number }>>([]);
  const [formCampoId, setFormCampoId] = useState("racca");
  const [formNombre, setFormNombre] = useState("");
  const [formSuperficieHa, setFormSuperficieHa] = useState("");
  const [formCultivo, setFormCultivo] = useState("");
  const [formObservaciones, setFormObservaciones] = useState("");

  // Cargar datos geográficos al montar
  useEffect(() => {
    setCampos(getCamposGeo());
    setLotes(getLotesGeo());

    const envKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || DEFAULT_MAPS_KEY;
    const storedKey = typeof window !== "undefined" ? localStorage.getItem("hjb_gmaps_api_key") || "" : "";
    const activeKey = storedKey || envKey;
    setApiKey(activeKey);
    setInputKey(activeKey);

    (window as any).gm_authFailure = () => {
      setLoadError("Google Maps reportó que la clave requiere verificar que la 'Maps JavaScript API' esté habilitada en Google Cloud Console.");
    };
  }, []);

  // Inicializar Google Maps con bibliotecas geometry y drawing
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (window.google && window.google.maps) {
      initMap();
      return;
    }

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,drawing`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initMap();
    };
    script.onerror = () => {
      setLoadError("No se pudo conectar con los servidores de Google Maps. Verificá la clave o la conexión.");
    };
    document.head.appendChild(script);
  }, [apiKey]);

  function initMap() {
    if (!mapContainerRef.current || !window.google || !window.google.maps) return;

    try {
      const centerCoords = { lat: -31.425, lng: -62.072 };
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: centerCoords,
        zoom: 13,
        mapTypeId: "hybrid",
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
      renderLotes(map, lotes, showLotesLayer, isEditingVertices);

      setMapLoaded(true);
      setLoadError(null);
    } catch (err: any) {
      console.error("Error inicializando mapa:", err);
      setLoadError("Error al inicializar Google Maps: " + (err.message || String(err)));
    }
  }

  // Renderizar o actualizar marcadores de los 5 Campos
  function renderMarkers(map: any, camposList: CampoGeo[], calibrating: boolean) {
    if (!map || !window.google || !window.google.maps) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    camposList.forEach((campo) => {
      const position = { lat: campo.lat, lng: campo.lng };

      const pinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
          <defs>
            <filter id="shadow_${campo.id}" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/>
            </filter>
          </defs>
          <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 28 18 28s18-14.5 18-28C36 8.06 27.94 0 18 0z" fill="${campo.color}" filter="url(#shadow_${campo.id})"/>
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

      if (calibrating) {
        marker.addListener("dragend", (e: any) => {
          const newLat = Number(e.latLng.lat().toFixed(6));
          const newLng = Number(e.latLng.lng().toFixed(6));
          saveCampoCoordinates(campo.id, newLat, newLng);

          setCampos((prev) =>
            prev.map((c) => (c.id === campo.id ? { ...c, lat: newLat, lng: newLng } : c))
          );
          setStatusNotice(`✓ Coordenadas de "${campo.nombre}" actualizadas a: ${newLat}, ${newLng}`);
          setTimeout(() => setStatusNotice(null), 4000);
        });
      }

      marker.addListener("click", () => {
        setSelectedCampo(campo);
        setSelectedLote(null);
        focusOnCampo(campo);
        openCampoInfoWindow(map, marker, campo);
      });

      markersRef.current.set(campo.id, marker);
    });
  }

  // Renderizar o actualizar Polígonos de Lotes y Etiquetas Insignia
  function renderLotes(map: any, lotesList: LoteGeo[], visible: boolean, editingVertices: boolean) {
    if (!map || !window.google || !window.google.maps) return;

    // Limpiar polígonos y etiquetas previas
    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current.clear();
    labelMarkersRef.current.forEach((m) => m.setMap(null));
    labelMarkersRef.current.clear();

    if (!visible) return;

    lotesList.forEach((lote) => {
      const polygon = new window.google.maps.Polygon({
        paths: lote.coordenadas,
        strokeColor: "#16a34a",
        strokeOpacity: 0.95,
        strokeWeight: 2.5,
        fillColor: lote.color || "#22c55e",
        fillOpacity: selectedLote?.id === lote.id ? 0.45 : 0.28,
        map,
        editable: editingVertices,
        zIndex: 3,
      });

      // Si está en modo edición de vértices, escuchar cambios al arrastrar esquinas
      if (editingVertices) {
        const path = polygon.getPath();
        const handlePathChange = () => {
          const newCoords: Array<{ lat: number; lng: number }> = [];
          for (let i = 0; i < path.getLength(); i++) {
            const pt = path.getAt(i);
            newCoords.push({ lat: Number(pt.lat().toFixed(6)), lng: Number(pt.lng().toFixed(6)) });
          }
          const updated = updateLoteCoordinates(lote.id, newCoords);
          setLotes(updated);

          // Actualizar centroide del badge
          const newCentroid = computePolygonCentroid(newCoords);
          const badge = labelMarkersRef.current.get(lote.id);
          if (badge) badge.setPosition(newCentroid);

          setStatusNotice(`✓ Vértices del Lote ${lote.nombre} (${lote.campoNombre}) actualizados`);
          setTimeout(() => setStatusNotice(null), 3000);
        };

        path.addListener("set_at", handlePathChange);
        path.addListener("insert_at", handlePathChange);
        path.addListener("remove_at", handlePathChange);
      }

      // Etiqueta Insignia Blanca en el Centro del Lote (Estilo de las fotos)
      const centroid = computePolygonCentroid(lote.coordenadas);
      const badgeSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="42" height="28" viewBox="0 0 42 28">
          <defs>
            <filter id="badgeShadow_${lote.id}" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity="0.35"/>
            </filter>
          </defs>
          <rect x="2" y="2" width="38" height="24" rx="4" fill="#ffffff" stroke="#15803d" stroke-width="1.8" filter="url(#badgeShadow_${lote.id})"/>
          <text x="21" y="18" font-size="12.5" font-weight="900" font-family="system-ui, -apple-system, sans-serif" fill="#0f172a" text-anchor="middle">
            ${lote.nombre}
          </text>
        </svg>
      `;

      const labelMarker = new window.google.maps.Marker({
        position: centroid,
        map,
        title: `Lote ${lote.nombre} - ${lote.campoNombre}`,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(badgeSvg),
          scaledSize: new window.google.maps.Size(42, 28),
          anchor: new window.google.maps.Point(21, 14),
        },
        zIndex: 10,
      });

      const onLoteClick = (e?: any) => {
        setSelectedLote(lote);
        const clickPos = e && e.latLng ? e.latLng : centroid;
        openLoteInfoWindow(map, clickPos, lote);
      };

      polygon.addListener("click", onLoteClick);
      labelMarker.addListener("click", onLoteClick);

      polygonsRef.current.set(lote.id, polygon);
      labelMarkersRef.current.set(lote.id, labelMarker);
    });
  }

  // Activar o desactivar trazador manual
  function toggleTracing() {
    if (!mapInstanceRef.current || !window.google?.maps?.drawing) return;

    if (isTracing) {
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setDrawingMode(null);
        drawingManagerRef.current.setMap(null);
      }
      setIsTracing(false);
      setStatusNotice("Modo trazo cancelado");
      setTimeout(() => setStatusNotice(null), 3000);
      return;
    }

    // Activar modo dibujo
    setIsCalibrating(false);
    setIsEditingVertices(false);

    if (!drawingManagerRef.current) {
      const dm = new window.google.maps.drawing.DrawingManager({
        drawingMode: window.google.maps.drawing.OverlayType.POLYGON,
        drawingControl: false,
        polygonOptions: {
          strokeColor: "#15803d",
          strokeOpacity: 0.95,
          strokeWeight: 2.5,
          fillColor: "#22c55e",
          fillOpacity: 0.35,
          clickable: true,
          editable: true,
          zIndex: 6,
        },
      });

      dm.addListener("polygoncomplete", (poly: any) => {
        const path = poly.getPath();
        const coords: Array<{ lat: number; lng: number }> = [];
        for (let i = 0; i < path.getLength(); i++) {
          const pt = path.getAt(i);
          coords.push({ lat: Number(pt.lat().toFixed(6)), lng: Number(pt.lng().toFixed(6)) });
        }

        // Remover figura temporal de dibujo
        poly.setMap(null);
        dm.setDrawingMode(null);
        setIsTracing(false);

        // Abrir modal para asignar datos del lote
        setPendingCoords(coords);
        setFormNombre("");
        setFormSuperficieHa("");
        setFormCultivo("");
        setFormObservaciones("");
        setShowNewLoteModal(true);
      });

      drawingManagerRef.current = dm;
    }

    drawingManagerRef.current.setMap(mapInstanceRef.current);
    drawingManagerRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
    setIsTracing(true);
    setStatusNotice("✏️ Modo Trazo Activo: Hacé clic sobre el satélite en cada esquina del lote para delimitarlo");
  }

  // Activar o desactivar edición de vértices de lotes existentes
  function toggleEditingVertices() {
    const nextState = !isEditingVertices;
    setIsEditingVertices(nextState);
    if (isTracing && drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
      setIsTracing(false);
    }
    if (mapInstanceRef.current) {
      renderLotes(mapInstanceRef.current, lotes, showLotesLayer, nextState);
    }
    if (nextState) {
      setStatusNotice("📐 Modo Ajuste Activo: Podés arrastrar cualquiera de los vértices de los lotes para calzarlos con el satélite");
    } else {
      setStatusNotice("✓ Edición de vértices finalizada y guardada");
      setTimeout(() => setStatusNotice(null), 3000);
    }
  }

  // Guardar nuevo lote trazado
  function handleSaveNewLote() {
    if (!formNombre.trim()) {
      alert("Por favor ingresá la identificación o nombre del lote (ej: 3a, 1, 2)");
      return;
    }

    const campoFound = campos.find((c) => c.id === formCampoId) || {
      nombre: formCampoId.charAt(0).toUpperCase() + formCampoId.slice(1),
    };

    const newLote: LoteGeo = {
      id: `${formCampoId}-lote-${Date.now()}`,
      campoId: formCampoId,
      campoNombre: campoFound.nombre,
      nombre: formNombre.trim(),
      superficieHa: formSuperficieHa ? parseFloat(formSuperficieHa) : null,
      coordenadas: pendingCoords,
      color: "#22c55e",
      cultivo: formCultivo.trim() || undefined,
      observaciones: formObservaciones.trim() || undefined,
    };

    const updated = saveLoteGeo(newLote);
    setLotes(updated);
    setShowNewLoteModal(false);
    setSelectedLote(newLote);
    setActiveTab("lotes");

    if (mapInstanceRef.current) {
      renderLotes(mapInstanceRef.current, updated, showLotesLayer, isEditingVertices);
    }

    setStatusNotice(`✓ Lote "${newLote.nombre}" delimitado y guardado en Campo ${newLote.campoNombre}`);
    setTimeout(() => setStatusNotice(null), 4000);
  }

  // Eliminar delimitación de un lote
  function handleDeleteLote(loteId: string) {
    const found = lotes.find((l) => l.id === loteId);
    const nom = found ? found.nombre : "";
    if (window.confirm(`¿Deseás eliminar la delimitación del Lote "${nom}"?`)) {
      const updated = deleteLoteGeo(loteId);
      setLotes(updated);
      setSelectedLote(null);
      if (infoWindowRef.current) infoWindowRef.current.close();
      if (mapInstanceRef.current) {
        renderLotes(mapInstanceRef.current, updated, showLotesLayer, isEditingVertices);
      }
      setStatusNotice(`Lote "${nom}" eliminado del mapa`);
      setTimeout(() => setStatusNotice(null), 3500);
    }
  }

  // InfoWindow de Lote al hacer clic
  function openLoteInfoWindow(map: any, position: any, lote: LoteGeo) {
    if (!infoWindowRef.current) return;

    const contentString = `
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px 4px; min-width: 230px; color: #0f172a;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 11px; font-weight: 700; background: #dcfce7; color: #166534; padding: 2px 7px; border-radius: 4px;">
            Lote Delimitado
          </span>
          <strong style="font-size: 13px; color: #15803d;">
            ${lote.superficieHa ? lote.superficieHa + " ha" : "Sup. a definir"}
          </strong>
        </div>
        <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 800; color: #0f172a;">
          🌾 Lote ${lote.nombre}
        </h3>
        <p style="margin: 0 0 4px 0; font-size: 12.5px; color: #475569;">
          <strong>Campo:</strong> ${lote.campoNombre}<br/>
          ${lote.cultivo ? `<strong>Cultivo:</strong> ${lote.cultivo}<br/>` : ""}
          ${lote.observaciones ? `<strong>Detalle:</strong> ${lote.observaciones}<br/>` : ""}
        </p>
        <div style="margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; flex-direction: column; gap: 6px;">
          <a href="/agricultura/${lote.campoId}" style="display: block; text-align: center; background: #166534; color: #ffffff; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700;">
            Ver labores de ${lote.campoNombre} →
          </a>
        </div>
      </div>
    `;

    infoWindowRef.current.setContent(contentString);
    infoWindowRef.current.setPosition(position);
    infoWindowRef.current.open(map);
  }

  function openCampoInfoWindow(map: any, marker: any, campo: CampoGeo) {
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
      openCampoInfoWindow(mapInstanceRef.current, marker, campo);
    }
  }

  function focusOnLote(lote: LoteGeo) {
    if (!mapInstanceRef.current) return;
    const centroid = computePolygonCentroid(lote.coordenadas);
    mapInstanceRef.current.panTo(centroid);
    mapInstanceRef.current.setZoom(15.5);
    setSelectedLote(lote);
    openLoteInfoWindow(mapInstanceRef.current, centroid, lote);
  }

  function fitAllBounds() {
    if (!mapInstanceRef.current || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    campos.forEach((c) => bounds.extend({ lat: c.lat, lng: c.lng }));
    lotes.forEach((l) => l.coordenadas.forEach((coord) => bounds.extend(coord)));
    mapInstanceRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    setSelectedCampo(null);
    setSelectedLote(null);
    if (infoWindowRef.current) infoWindowRef.current.close();
  }

  function toggleCalibrating() {
    const nextState = !isCalibrating;
    setIsCalibrating(nextState);
    if (isTracing && drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
      setIsTracing(false);
    }
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

  function handleResetLotes() {
    if (window.confirm("¿Deseás restaurar los lotes iniciales predeterminados (incluyendo los 4 lotes de Racca)?")) {
      const defs = resetAllLotesGeo();
      setLotes(defs);
      if (mapInstanceRef.current) {
        renderLotes(mapInstanceRef.current, defs, showLotesLayer, isEditingVertices);
      }
      setStatusNotice("✓ Lotes predeterminados restaurados.");
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
            Visor Satelital de Campos y Lotes
          </h2>
          <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "var(--muted, #64748b)" }}>
            Delimitación de lotes con polígonos satelitales y carga manual de hectáreas
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Botón Trazar Lote Manualmente */}
          <button
            type="button"
            className={isTracing ? "primaryButton" : "secondaryButton"}
            onClick={toggleTracing}
            style={{
              fontSize: "12.5px",
              padding: "7px 14px",
              borderColor: isTracing ? "var(--brand-700, #15803d)" : undefined,
              backgroundColor: isTracing ? "var(--brand-700, #15803d)" : undefined,
            }}
            title="Hacé clics sobre el satélite para trazar el contorno de un lote"
          >
            {isTracing ? "✕ Cancelar trazo" : "✏️ Trazar Nuevo Lote"}
          </button>

          {/* Botón Mover Vértices */}
          <button
            type="button"
            className={isEditingVertices ? "primaryButton" : "secondaryButton"}
            onClick={toggleEditingVertices}
            style={{
              fontSize: "12.5px",
              padding: "7px 14px",
              borderColor: isEditingVertices ? "#2563eb" : undefined,
              backgroundColor: isEditingVertices ? "#2563eb" : undefined,
            }}
            title="Permite arrastrar cualquier esquina de los lotes existentes para acomodarlas"
          >
            {isEditingVertices ? "✓ Terminar ajuste" : "📐 Mover Vértices"}
          </button>

          {/* Toggle Capa de Lotes */}
          <button
            type="button"
            className="secondaryButton"
            onClick={() => {
              const next = !showLotesLayer;
              setShowLotesLayer(next);
              if (mapInstanceRef.current) {
                renderLotes(mapInstanceRef.current, lotes, next, isEditingVertices);
              }
            }}
            style={{ fontSize: "12.5px", padding: "7px 12px" }}
            title="Muestra u oculta los polígonos de lotes"
          >
            {showLotesLayer ? "👁️ Ocultar Lotes" : "👁️ Ver Lotes"}
          </button>

          <button
            type="button"
            className="secondaryButton"
            onClick={fitAllBounds}
            title="Encuadra la vista para abarcar todos los campos y lotes"
            style={{ fontSize: "12.5px", padding: "7px 12px" }}
          >
            🌍 Encuadrar todo
          </button>

          <button
            type="button"
            className={isCalibrating ? "primaryButton" : "secondaryButton"}
            onClick={toggleCalibrating}
            style={{
              fontSize: "12.5px",
              padding: "7px 12px",
              borderColor: isCalibrating ? "var(--amber-500, #f59e0b)" : undefined,
              backgroundColor: isCalibrating ? "var(--amber-600, #d97706)" : undefined,
            }}
            title="Permite arrastrar los pines centrales de los campos"
          >
            {isCalibrating ? "✓ Fin calibración" : "📍 Mover pines"}
          </button>

          <button
            type="button"
            className="thResetBtn"
            onClick={() => setShowKeyModal(true)}
            style={{ fontSize: "12px", padding: "7px 10px" }}
            title="Configurar clave de Google Maps API"
          >
            ⚙️ Clave API
          </button>
        </div>
      </div>

      {/* Notificación de estado */}
      {statusNotice && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            background: isTracing ? "#fef3c7" : "#f0fdf4",
            border: `1px solid ${isTracing ? "#fde68a" : "#86efac"}`,
            color: isTracing ? "#92400e" : "#166534",
            fontSize: "13px",
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{statusNotice}</span>
          {isTracing && (
            <button
              type="button"
              onClick={toggleTracing}
              style={{
                background: "transparent",
                border: "none",
                color: "#92400e",
                fontWeight: 700,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* Contenedor Principal: Sidebar + Mapa */}
      <div className="mapGridResponsive">
        {/* Panel Lateral */}
        <div className="mapSidebarFields">
          {/* Tabs del Sidebar: Lotes vs Campos */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px", borderBottom: "1px solid var(--line, #e2e8f0)", paddingBottom: "8px" }}>
            <button
              type="button"
              onClick={() => setActiveTab("lotes")}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: "8px",
                border: "none",
                background: activeTab === "lotes" ? "#166534" : "var(--slate-100, #f1f5f9)",
                color: activeTab === "lotes" ? "#ffffff" : "var(--slate-700, #334155)",
                fontWeight: 700,
                fontSize: "12.5px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              🌾 Lotes ({lotes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("campos")}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: "8px",
                border: "none",
                background: activeTab === "campos" ? "#166534" : "var(--slate-100, #f1f5f9)",
                color: activeTab === "campos" ? "#ffffff" : "var(--slate-700, #334155)",
                fontWeight: 700,
                fontSize: "12.5px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              📍 Campos ({campos.length})
            </button>
          </div>

          {/* LISTA DE LOTES */}
          {activeTab === "lotes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <small style={{ color: "var(--muted, #64748b)", fontSize: "11.5px" }}>
                  Hacé clic para enfocar en el satélite
                </small>
                <button
                  type="button"
                  onClick={handleResetLotes}
                  className="thResetBtn"
                  style={{ fontSize: "11px", color: "var(--brand-700)" }}
                  title="Restaurar lotes predeterminados (incluye los 4 de Racca)"
                >
                  Restaurar predeterminados
                </button>
              </div>

              {lotes.map((lote) => {
                const isSelected = selectedLote?.id === lote.id;
                return (
                  <div
                    key={lote.id}
                    onClick={() => focusOnLote(lote)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: `1.5px solid ${isSelected ? "#16a34a" : "var(--line, #e2e8f0)"}`,
                      background: isSelected ? "#f0fdf4" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.15s ease-in-out",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "28px",
                            height: "22px",
                            borderRadius: "4px",
                            background: "#ffffff",
                            border: "1.5px solid #16a34a",
                            fontWeight: 800,
                            fontSize: "12px",
                            color: "#0f172a",
                          }}
                        >
                          {lote.nombre}
                        </span>
                        <div>
                          <strong style={{ fontSize: "13.5px", color: "var(--slate-900, #0f172a)", display: "block" }}>
                            Lote {lote.nombre}
                          </strong>
                          <span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
                            Campo {lote.campoNombre}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span
                          className="pill"
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            backgroundColor: "#dcfce7",
                            color: "#166534",
                            padding: "2px 7px",
                          }}
                        >
                          {lote.superficieHa !== null ? `${lote.superficieHa} ha` : "Manual"}
                        </span>
                      </div>
                    </div>

                    {lote.cultivo && (
                      <div style={{ marginTop: "6px", fontSize: "11.5px", color: "var(--slate-600)" }}>
                        🌱 {lote.cultivo}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "6px", borderTop: "1px dashed var(--line, #e2e8f0)", fontSize: "11px" }}>
                      <Link
                        href={`/agricultura/${lote.campoId}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "#166534", fontWeight: 700, textDecoration: "none" }}
                      >
                        Ver labores →
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLote(lote.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          padding: "2px 4px",
                          fontSize: "11px",
                        }}
                        title="Eliminar delimitación"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LISTA DE CAMPOS */}
          {activeTab === "campos" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <strong style={{ fontSize: "13px", color: "var(--slate-800)" }}>
                  Establecimientos ({campos.length})
                </strong>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Total: 590 ha</span>
              </div>

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
                        style={{ fontWeight: 700, color: campo.color, textDecoration: "none" }}
                      >
                        Ver labores →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Visor del Mapa Google Maps */}
        <div className="mapVisorContainer" style={{ position: "relative" }}>
          <div ref={mapContainerRef} className="mapCanvas" />

          {/* Banner Flotante Informativo cuando se está trazando */}
          {isTracing && (
            <div
              style={{
                position: "absolute",
                top: "14px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(15, 23, 42, 0.92)",
                color: "#ffffff",
                padding: "10px 18px",
                borderRadius: "30px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                fontSize: "13px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "12px",
                zIndex: 20,
              }}
            >
              <span>✏️ Hacé clics en el satélite en cada esquina. Doble clic para cerrar.</span>
              <button
                type="button"
                onClick={toggleTracing}
                style={{
                  background: "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: "14px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          )}

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
                  onClick={() => setLoadError(null)}
                  style={{ width: "100%", fontSize: "12px", color: "#94a3b8" }}
                >
                  Explorar campos desde el listado lateral
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Guardar Nuevo Lote Trazado */}
      {showNewLoteModal && (
        <div className="modalBackdrop" onClick={() => setShowNewLoteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow" style={{ color: "var(--brand-700)", fontWeight: 700 }}>
                  Nuevo Lote Delimitado
                </p>
                <h2>Guardar Lote Trazado</h2>
              </div>
              <button type="button" className="iconButton" onClick={() => setShowNewLoteModal(false)}>
                ×
              </button>
            </div>

            <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-800)" }}>
                  Campo al que pertenece *
                </label>
                <select
                  className="select"
                  style={{ marginTop: "4px" }}
                  value={formCampoId}
                  onChange={(e) => setFormCampoId(e.target.value)}
                >
                  {campos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.superficie})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-800)" }}>
                  Identificación / Nombre del Lote *
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ marginTop: "4px" }}
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej: 3a, 3b, 1, 2, Lote Norte..."
                />
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                  Este texto se mostrará en la tarjeta blanca en el centro del lote sobre el satélite.
                </small>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-800)" }}>
                  Superficie Real en Hectáreas (ha) — Carga Manual *
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  style={{ marginTop: "4px" }}
                  value={formSuperficieHa}
                  onChange={(e) => setFormSuperficieHa(e.target.value)}
                  placeholder="Ej: 25, 48, 50..."
                />
                <div style={{ marginTop: "4px", background: "#f8fafc", padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  <small style={{ color: "#475569", fontSize: "11px", display: "block", lineHeight: 1.35 }}>
                    🔒 <strong>Exactitud garantizada:</strong> Las hectáreas no se calculan desde el trazo de pantalla para evitar distorsiones por imprecisiones en el mouse o zoom.
                  </small>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-800)" }}>
                  Cultivo / Ocupación Actual (Opcional)
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ marginTop: "4px" }}
                  value={formCultivo}
                  onChange={(e) => setFormCultivo(e.target.value)}
                  placeholder="Ej: Soja 1ra, Maíz tardío, Alfalfa..."
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-800)" }}>
                  Observaciones / Detalle (Opcional)
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ marginTop: "4px" }}
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                  placeholder="Ej: Lote dividido por camino central..."
                />
              </div>
            </div>

            <div className="modalFooter" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="secondaryButton" onClick={() => setShowNewLoteModal(false)}>
                Descartar Trazo
              </button>
              <button
                type="button"
                className="primaryButton"
                onClick={handleSaveNewLote}
              >
                Guardar Lote en Mapa
              </button>
            </div>
          </div>
        </div>
      )}

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
