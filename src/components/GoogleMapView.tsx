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
    hjbDeleteLote?: (id: string) => void;
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
  const infoWindowRef = useRef<any>(null);

  // Trazador Nativo Directo (Click-to-Draw 100% nativo)
  const mapClickListenerRef = useRef<any>(null);
  const tracingPointsRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const tracingPolylineRef = useRef<any>(null);
  const tracingMarkersRef = useRef<any[]>([]);

  const [campos, setCampos] = useState<CampoGeo[]>([]);
  const [lotes, setLotes] = useState<LoteGeo[]>([]);
  const [selectedCampo, setSelectedCampo] = useState<CampoGeo | null>(null);
  const [selectedLote, setSelectedLote] = useState<LoteGeo | null>(null);

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isTracing, setIsTracing] = useState(false);
  const [tracingCount, setTracingCount] = useState(0);
  const [isEditingVertices, setIsEditingVertices] = useState(false);
  const [showLotesLayer, setShowLotesLayer] = useState(true);

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

  // Modal para guardar nuevo trazo (Perímetro de Campo o Lote Interno)
  const [showNewLoteModal, setShowNewLoteModal] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<Array<{ lat: number; lng: number }>>([]);
  const [formTipo, setFormTipo] = useState<"perimetro_campo" | "lote_interno">("lote_interno");
  const [formCampoId, setFormCampoId] = useState("racca");
  const [formNombre, setFormNombre] = useState("");
  const [formSuperficieHa, setFormSuperficieHa] = useState("");
  const [formCultivo, setFormCultivo] = useState("");
  const [formObservaciones, setFormObservaciones] = useState("");

  // Cargar datos geográficos al montar y registrar handler global de borrado para InfoWindow
  useEffect(() => {
    const c = getCamposGeo();
    const l = getLotesGeo();
    setCampos(c);
    setLotes(l);
    const racca = c.find((x) => x.id === "racca");
    if (racca) setSelectedCampo(racca);

    const envKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || DEFAULT_MAPS_KEY;
    const storedKey = typeof window !== "undefined" ? localStorage.getItem("hjb_gmaps_api_key") || "" : "";
    const activeKey = storedKey || envKey;
    setApiKey(activeKey);
    setInputKey(activeKey);

    window.hjbDeleteLote = (id: string) => {
      handleDeleteLote(id);
    };

    (window as any).gm_authFailure = () => {
      setLoadError("Google Maps reportó que la clave requiere verificar que la 'Maps JavaScript API' esté habilitada en Google Cloud Console.");
    };

    return () => {
      delete window.hjbDeleteLote;
    };
  }, []);

  // Inicializar Google Maps
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
  }, [apiKey]);

  function initMap() {
    if (!mapContainerRef.current || !window.google || !window.google.maps) return;

    try {
      const centerCoords = { lat: -32.228, lng: -61.645 };
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: centerCoords,
        zoom: 12,
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

  // Renderizar marcadores principales de los 5 Campos
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
        zIndex: 5,
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

  // Renderizar Polígonos de Lotes y Perímetros con Etiquetas Insignias
  function renderLotes(map: any, lotesList: LoteGeo[], visible: boolean, editingVertices: boolean) {
    if (!map || !window.google || !window.google.maps) return;

    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current.clear();
    labelMarkersRef.current.forEach((m) => m.setMap(null));
    labelMarkersRef.current.clear();

    if (!visible) return;

    lotesList.forEach((lote) => {
      const isPerimetro = lote.tipo === "perimetro_campo";
      const campoObj = campos.find((c) => c.id === lote.campoId);
      const strokeColor = isPerimetro ? (campoObj?.color || "#047857") : "#16a34a";
      const strokeWeight = isPerimetro ? 3.5 : 2.2;
      const fillOpacity = isPerimetro ? 0.08 : (selectedLote?.id === lote.id ? 0.45 : 0.30);
      const fillColor = isPerimetro ? (campoObj?.color || "#047857") : (lote.color || "#22c55e");
      const zIndex = isPerimetro ? 2 : 4;

      const polygon = new window.google.maps.Polygon({
        paths: lote.coordenadas,
        strokeColor,
        strokeOpacity: 0.95,
        strokeWeight,
        fillColor,
        fillOpacity,
        map,
        editable: editingVertices,
        zIndex,
      });

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

          const newCentroid = computePolygonCentroid(newCoords);
          const badge = labelMarkersRef.current.get(lote.id);
          if (badge) badge.setPosition(newCentroid);

          setStatusNotice(`✓ Vértices de "${lote.nombre}" actualizados`);
          setTimeout(() => setStatusNotice(null), 3000);
        };

        path.addListener("set_at", handlePathChange);
        path.addListener("insert_at", handlePathChange);
        path.addListener("remove_at", handlePathChange);
      }

      // Etiqueta Insignia Blanca centrada en el lote / perímetro
      const centroid = computePolygonCentroid(lote.coordenadas);
      const text = lote.nombre;
      const charWidth = 8.2;
      const padding = 20;
      const badgeWidth = Math.max(38, Math.round(text.length * charWidth + padding));
      const badgeHeight = 28;
      const textX = Math.round(badgeWidth / 2);
      const textY = 18;
      const badgeBorderColor = isPerimetro ? strokeColor : "#15803d";

      const badgeSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${badgeWidth}" height="${badgeHeight}" viewBox="0 0 ${badgeWidth} ${badgeHeight}">
          <defs>
            <filter id="badgeShadow_${lote.id}" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity="0.35"/>
            </filter>
          </defs>
          <rect x="2" y="2" width="${badgeWidth - 4}" height="${badgeHeight - 4}" rx="4" fill="#ffffff" stroke="${badgeBorderColor}" stroke-width="${isPerimetro ? '2.5' : '1.8'}" filter="url(#badgeShadow_${lote.id})"/>
          <text x="${textX}" y="${textY}" font-size="12" font-weight="900" font-family="system-ui, -apple-system, sans-serif" fill="#0f172a" text-anchor="middle">
            ${text}
          </text>
        </svg>
      `;

      const labelMarker = new window.google.maps.Marker({
        position: centroid,
        map,
        title: `${lote.nombre} - ${lote.campoNombre}`,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(badgeSvg),
          scaledSize: new window.google.maps.Size(badgeWidth, badgeHeight),
          anchor: new window.google.maps.Point(badgeWidth / 2, badgeHeight / 2),
        },
        zIndex: isPerimetro ? 9 : 10,
      });

      const onLoteClick = (e?: any) => {
        setSelectedLote(lote);
        const campoOfLote = campos.find((c) => c.id === lote.campoId);
        if (campoOfLote) setSelectedCampo(campoOfLote);
        const clickPos = e && e.latLng ? e.latLng : centroid;
        openLoteInfoWindow(map, clickPos, lote);
      };

      polygon.addListener("click", onLoteClick);
      labelMarker.addListener("click", onLoteClick);

      polygonsRef.current.set(lote.id, polygon);
      labelMarkersRef.current.set(lote.id, labelMarker);
    });
  }

  // =========================================================================
  // TRAZADOR NATIVO DIRECTO (Sin dependencias externas)
  // =========================================================================

  function startNativeTracing(targetCampoId?: string, tipoDeseado: "perimetro_campo" | "lote_interno" = "lote_interno") {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    if (isTracing) {
      cancelNativeTracing();
      return;
    }

    const campoId = targetCampoId || (selectedCampo ? selectedCampo.id : "racca");
    setFormCampoId(campoId);
    setFormTipo(tipoDeseado);

    const campoObj = campos.find((c) => c.id === campoId);
    if (tipoDeseado === "perimetro_campo") {
      setFormNombre(campoObj ? campoObj.nombre : "");
      setFormSuperficieHa(campoObj && campoObj.superficieHa ? String(campoObj.superficieHa) : "");
    } else {
      setFormNombre("");
      setFormSuperficieHa("");
    }

    setIsCalibrating(false);
    setIsEditingVertices(false);
    renderLotes(mapInstanceRef.current, lotes, showLotesLayer, false);

    cleanTracingTempObjects();
    tracingPointsRef.current = [];
    setTracingCount(0);
    setIsTracing(true);

    const map = mapInstanceRef.current;
    const strokeColor = tipoDeseado === "perimetro_campo" ? (campoObj?.color || "#047857") : "#15803d";

    tracingPolylineRef.current = new window.google.maps.Polyline({
      path: [],
      strokeColor,
      strokeOpacity: 1.0,
      strokeWeight: 3.5,
      map: map,
      zIndex: 25,
    });

    map.setOptions({ draggableCursor: "crosshair" });

    mapClickListenerRef.current = map.addListener("click", (e: any) => {
      const lat = Number(e.latLng.lat().toFixed(6));
      const lng = Number(e.latLng.lng().toFixed(6));
      const pt = { lat, lng };

      tracingPointsRef.current.push(pt);
      const newPath = [...tracingPointsRef.current];
      tracingPolylineRef.current.setPath(newPath);

      const dotMarker = new window.google.maps.Marker({
        position: pt,
        map: map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: tipoDeseado === "perimetro_campo" ? strokeColor : "#22c55e",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        zIndex: 26,
      });
      tracingMarkersRef.current.push(dotMarker);
      setTracingCount(newPath.length);
    });

    setStatusNotice(`✏️ Modo Trazo Activo: Hacé clic en el satélite en cada esquina del ${tipoDeseado === "perimetro_campo" ? "perímetro del campo" : "lote"}.`);
  }

  function undoLastTracingPoint() {
    if (tracingPointsRef.current.length === 0) return;
    tracingPointsRef.current.pop();

    if (tracingPolylineRef.current) {
      tracingPolylineRef.current.setPath([...tracingPointsRef.current]);
    }

    const lastMarker = tracingMarkersRef.current.pop();
    if (lastMarker) lastMarker.setMap(null);

    setTracingCount(tracingPointsRef.current.length);
  }

  function finishNativeTracing() {
    if (tracingPointsRef.current.length < 3) {
      alert("Por favor marcá al menos 3 puntos en el satélite para formar el polígono.");
      return;
    }

    const coords = [...tracingPointsRef.current];
    cancelNativeTracing();

    setPendingCoords(coords);
    setShowNewLoteModal(true);
  }

  function cancelNativeTracing() {
    if (mapClickListenerRef.current && window.google?.maps) {
      window.google.maps.event.removeListener(mapClickListenerRef.current);
      mapClickListenerRef.current = null;
    }
    cleanTracingTempObjects();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setOptions({ draggableCursor: null });
    }
    setIsTracing(false);
    setTracingCount(0);
  }

  function cleanTracingTempObjects() {
    if (tracingPolylineRef.current) {
      tracingPolylineRef.current.setMap(null);
      tracingPolylineRef.current = null;
    }
    tracingMarkersRef.current.forEach((m) => m.setMap(null));
    tracingMarkersRef.current = [];
  }

  // Activar o desactivar edición de vértices de lotes existentes
  function toggleEditingVertices() {
    const nextState = !isEditingVertices;
    setIsEditingVertices(nextState);
    if (isTracing) cancelNativeTracing();

    if (mapInstanceRef.current) {
      renderLotes(mapInstanceRef.current, lotes, showLotesLayer, nextState);
    }
    if (nextState) {
      setStatusNotice("📐 Modo Ajuste Activo: Podés arrastrar cualquiera de las esquinas o puntos medios de los trazos para calzarlos exactos.");
    } else {
      setStatusNotice("✓ Ajuste de esquinas finalizado y guardado");
      setTimeout(() => setStatusNotice(null), 3500);
    }
  }

  // Guardar nuevo trazo
  function handleSaveNewLote() {
    const campoFound = campos.find((c) => c.id === formCampoId) || {
      id: formCampoId,
      nombre: formCampoId.charAt(0).toUpperCase() + formCampoId.slice(1),
      superficieHa: null,
      color: "#16a34a",
    };

    // Si no ingresó nombre, asume el nombre del campo
    const finalNombre = formNombre.trim() || campoFound.nombre;

    const newLote: LoteGeo = {
      id: `${formCampoId}-${formTipo}-${Date.now()}`,
      campoId: formCampoId,
      campoNombre: campoFound.nombre,
      nombre: finalNombre,
      tipo: formTipo,
      superficieHa: formSuperficieHa ? parseFloat(formSuperficieHa) : (campoFound.superficieHa || null),
      coordenadas: pendingCoords,
      color: formTipo === "perimetro_campo" ? campoFound.color : "#22c55e",
      cultivo: formCultivo.trim() || undefined,
      observaciones: formObservaciones.trim() || undefined,
    };

    const updated = saveLoteGeo(newLote);
    setLotes(updated);
    setShowNewLoteModal(false);
    setSelectedLote(newLote);

    const relatedCampo = campos.find((c) => c.id === formCampoId);
    if (relatedCampo) setSelectedCampo(relatedCampo);

    if (mapInstanceRef.current) {
      renderLotes(mapInstanceRef.current, updated, showLotesLayer, isEditingVertices);
    }

    setStatusNotice(`✓ ${formTipo === "perimetro_campo" ? "Perímetro" : "Lote"} "${newLote.nombre}" guardado con éxito`);
    setTimeout(() => setStatusNotice(null), 4000);
  }

  // ELIMINAR TRAZO / LOTE (Fácil y directo con confirmación)
  function handleDeleteLote(loteId: string) {
    const found = lotes.find((l) => l.id === loteId);
    const nom = found ? found.nombre : "este trazo";
    const tipoTxt = found?.tipo === "perimetro_campo" ? "el perímetro general de" : "el lote";

    if (window.confirm(`¿Confirmás eliminar ${tipoTxt} "${nom}" del mapa?`)) {
      const updated = deleteLoteGeo(loteId);
      setLotes(updated);
      setSelectedLote(null);

      if (infoWindowRef.current) infoWindowRef.current.close();
      if (mapInstanceRef.current) {
        renderLotes(mapInstanceRef.current, updated, showLotesLayer, isEditingVertices);
      }

      setStatusNotice(`✓ Trazo "${nom}" eliminado del mapa`);
      setTimeout(() => setStatusNotice(null), 3500);
    }
  }

  // InfoWindow al hacer clic en un polígono
  function openLoteInfoWindow(map: any, position: any, lote: LoteGeo) {
    if (!infoWindowRef.current) return;

    const isPerimetro = lote.tipo === "perimetro_campo";

    const contentString = `
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px 4px; min-width: 240px; color: #0f172a;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 11px; font-weight: 700; background: ${isPerimetro ? '#fef3c7' : '#dcfce7'}; color: ${isPerimetro ? '#92400e' : '#166534'}; padding: 2px 7px; border-radius: 4px;">
            ${isPerimetro ? "🚩 Perímetro de Campo" : "🌾 Lote Interno"}
          </span>
          <strong style="font-size: 13px; color: #15803d;">
            ${lote.superficieHa ? lote.superficieHa + " ha" : "Sup. manual"}
          </strong>
        </div>

        <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 800; color: #0f172a;">
          ${isPerimetro ? "📍 Campo " + lote.nombre : "🌾 Lote " + lote.nombre}
        </h3>

        <p style="margin: 0 0 4px 0; font-size: 12px; color: #475569;">
          <strong>Campo:</strong> ${lote.campoNombre}<br/>
          ${lote.cultivo ? `<strong>Cultivo:</strong> ${lote.cultivo}<br/>` : ""}
          ${lote.observaciones ? `<strong>Detalle:</strong> ${lote.observaciones}<br/>` : ""}
        </p>

        <div style="margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; flex-direction: column; gap: 6px;">
          <a href="/agricultura/${lote.campoId}" style="display: block; text-align: center; background: #166534; color: #ffffff; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700;">
            Ver labores de ${lote.campoNombre} →
          </a>
          
          <button
            type="button"
            onclick="window.hjbDeleteLote('${lote.id}')"
            style="display: block; width: 100%; text-align: center; background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 5px 12px; border-radius: 6px; font-size: 11.5px; font-weight: 700; cursor: pointer;"
          >
            🗑️ Eliminar este trazo
          </button>
        </div>
      </div>
    `;

    infoWindowRef.current.setContent(contentString);
    infoWindowRef.current.setPosition(position);
    infoWindowRef.current.open(map);
  }

  function openCampoInfoWindow(map: any, marker: any, campo: CampoGeo) {
    if (!infoWindowRef.current) return;

    const lotesOfCampo = lotes.filter((l) => l.campoId === campo.id);
    const perimetros = lotesOfCampo.filter((l) => l.tipo === "perimetro_campo");
    const internos = lotesOfCampo.filter((l) => l.tipo !== "perimetro_campo");

    const contentString = `
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px 4px; min-width: 230px; color: #0f172a;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 2px 7px; border-radius: 4px;">
            ${campo.estado}
          </span>
          <strong style="font-size: 13px; color: #15803d;">${campo.superficie}</strong>
        </div>
        <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 800; color: #0f172a;">
          📍 Campo ${campo.nombre}
        </h3>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #475569;">
          <strong>Cultivo:</strong> ${campo.cultivoPrincipal}<br/>
          <strong>Perímetro delimitado:</strong> ${perimetros.length > 0 ? "Sí" : "Pendiente"}<br/>
          <strong>Lotes internos:</strong> ${internos.length > 0 ? internos.map((l) => l.nombre).join(", ") : "Ninguno aún"}
        </p>
        <div style="margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          <a href="/agricultura/${campo.slug}" style="display: block; text-align: center; background: #166534; color: #ffffff; text-decoration: none; padding: 7px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 700;">
            Ver labores y rotaciones →
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
    mapInstanceRef.current.setZoom(14.5);
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
    if (isTracing) cancelNativeTracing();
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
    if (window.confirm("¿Deseás restaurar los perímetros y lotes iniciales de referencia (Racca y Keuneke)?")) {
      const defs = resetAllLotesGeo();
      setLotes(defs);
      setSelectedLote(null);
      if (mapInstanceRef.current) {
        renderLotes(mapInstanceRef.current, defs, showLotesLayer, isEditingVertices);
      }
      setStatusNotice("✓ Perímetros y lotes restaurados a valores de referencia.");
      setTimeout(() => setStatusNotice(null), 4000);
    }
  }

  function handleClearAllTrazos() {
    if (window.confirm("¿Estás seguro de que querés borrar TODOS los trazos del mapa? Esta acción no se puede deshacer.")) {
      const empty: LoteGeo[] = [];
      saveLoteGeo({} as any); // trigger save
      localStorage.setItem("hjb_lotes_geo_polygons_v04", JSON.stringify(empty));
      setLotes(empty);
      setSelectedLote(null);
      if (infoWindowRef.current) infoWindowRef.current.close();
      if (mapInstanceRef.current) {
        renderLotes(mapInstanceRef.current, empty, showLotesLayer, isEditingVertices);
      }
      setStatusNotice("✓ Se han borrado todos los trazos del mapa.");
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
            Delimitación de perímetros de campos y lotes internos con ajuste en pantalla
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Botón Trazar Lote Nativo */}
          <button
            type="button"
            className={isTracing ? "primaryButton" : "secondaryButton"}
            onClick={() => (isTracing ? cancelNativeTracing() : startNativeTracing(selectedCampo?.id, "lote_interno"))}
            style={{
              fontSize: "12.5px",
              padding: "7px 14px",
              borderColor: isTracing ? "#b91c1c" : "var(--brand-700, #15803d)",
              backgroundColor: isTracing ? "#dc2626" : "var(--brand-700, #15803d)",
              color: "#ffffff",
              fontWeight: 700,
            }}
            title="Hacé clics sobre el satélite para delimitar el lote esquina por esquina"
          >
            {isTracing ? "✕ Cancelar trazo" : "✏️ Trazar Lote"}
          </button>

          {/* Botón Mover Vértices */}
          <button
            type="button"
            className={isEditingVertices ? "primaryButton" : "secondaryButton"}
            onClick={toggleEditingVertices}
            style={{
              fontSize: "12.5px",
              padding: "7px 14px",
              borderColor: isEditingVertices ? "#1d4ed8" : undefined,
              backgroundColor: isEditingVertices ? "#2563eb" : undefined,
              color: isEditingVertices ? "#ffffff" : undefined,
              fontWeight: 700,
            }}
            title="Muestra los tiradores en cada esquina para acomodarlas con el mouse"
          >
            {isEditingVertices ? "✓ Terminar ajuste" : "📐 Mover Vértices"}
          </button>

          {/* Botón Eliminar Trazo Seleccionado si hay uno activo */}
          {selectedLote && (
            <button
              type="button"
              onClick={() => handleDeleteLote(selectedLote.id)}
              style={{
                fontSize: "12.5px",
                padding: "7px 12px",
                background: "#fee2e2",
                color: "#b91c1c",
                border: "1px solid #fca5a5",
                borderRadius: "8px",
                fontWeight: 700,
                cursor: "pointer",
              }}
              title={`Eliminar delimitación de ${selectedLote.nombre}`}
            >
              🗑️ Borrar &quot;{selectedLote.nombre}&quot;
            </button>
          )}

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
      {statusNotice && !isTracing && (
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

      {/* Contenedor Principal: Sidebar de Campos + Mapa */}
      <div className="mapGridResponsive">
        {/* Panel Lateral: ÚNICAMENTE CAMPOS */}
        <div className="mapSidebarFields">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <strong style={{ fontSize: "14px", color: "var(--slate-800)" }}>
              Establecimientos ({campos.length})
            </strong>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Total: 590 ha</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {campos.map((campo) => {
              const isSelected = selectedCampo?.id === campo.id;
              const lotesDelCampo = lotes.filter((l) => l.campoId === campo.id);
              const perimetroCampo = lotesDelCampo.find((l) => l.tipo === "perimetro_campo");
              const lotesInternos = lotesDelCampo.filter((l) => l.tipo !== "perimetro_campo");

              return (
                <div
                  key={campo.id}
                  onClick={() => focusOnCampo(campo)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: `2px solid ${isSelected ? campo.color : "var(--line, #e2e8f0)"}`,
                    background: isSelected ? `${campo.color}08` : "#ffffff",
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
                      <strong style={{ fontSize: "14.5px", color: "var(--slate-900, #0f172a)" }}>
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

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px", marginBottom: "8px" }}>
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

                  {/* SECCIÓN INTERNA: Perímetro y Lotes de este Campo */}
                  <div
                    style={{
                      marginTop: "8px",
                      paddingTop: "8px",
                      borderTop: "1px dashed var(--line, #e2e8f0)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Botones de acción rápida para este campo */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "4px" }}>
                      <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--slate-700)" }}>
                        Delimitaciones ({lotesDelCampo.length})
                      </span>

                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          type="button"
                          onClick={() => startNativeTracing(campo.id, "perimetro_campo")}
                          style={{
                            background: perimetroCampo ? "#f1f5f9" : "#e0f2fe",
                            border: `1px solid ${perimetroCampo ? "#cbd5e1" : "#7dd3fc"}`,
                            color: perimetroCampo ? "#475569" : "#0369a1",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            fontSize: "10px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          title={`Trazar perímetro general de ${campo.nombre}`}
                        >
                          {perimetroCampo ? "🚩 Perímetro ✓" : "+ Perímetro Campo"}
                        </button>

                        <button
                          type="button"
                          onClick={() => startNativeTracing(campo.id, "lote_interno")}
                          style={{
                            background: "#f0fdf4",
                            border: "1px solid #86efac",
                            color: "#166534",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            fontSize: "10px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          title={`Trazar lote interno para ${campo.nombre}`}
                        >
                          + Lote
                        </button>
                      </div>
                    </div>

                    {/* Lista de Trazos del Campo */}
                    {lotesDelCampo.length === 0 ? (
                      <small style={{ color: "var(--muted)", fontSize: "11px", display: "block" }}>
                        Sin trazos. Presioná &quot;+ Perímetro Campo&quot; o &quot;+ Lote&quot;.
                      </small>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {lotesDelCampo.map((lote) => {
                          const isLoteActive = selectedLote?.id === lote.id;
                          const isPerim = lote.tipo === "perimetro_campo";

                          return (
                            <div
                              key={lote.id}
                              onClick={() => focusOnLote(lote)}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "5px 8px",
                                borderRadius: "6px",
                                background: isLoteActive ? (isPerim ? "#fef3c7" : "#dcfce7") : "#f8fafc",
                                border: `1px solid ${isLoteActive ? (isPerim ? "#d97706" : "#16a34a") : "#e2e8f0"}`,
                                cursor: "pointer",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    minWidth: "24px",
                                    padding: "0 4px",
                                    height: "18px",
                                    borderRadius: "3px",
                                    background: "#ffffff",
                                    border: `1.2px solid ${isPerim ? campo.color : "#16a34a"}`,
                                    fontWeight: 800,
                                    fontSize: "11px",
                                    color: "#0f172a",
                                  }}
                                >
                                  {isPerim ? "🚩" : lote.nombre}
                                </span>
                                <div>
                                  <strong style={{ fontSize: "12px", color: "var(--slate-800)" }}>
                                    {isPerim ? `Perímetro ${lote.nombre}` : `Lote ${lote.nombre}`}
                                  </strong>
                                </div>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "11px", color: isPerim ? "#b45309" : "#166534", fontWeight: 700 }}>
                                  {lote.superficieHa !== null ? `${lote.superficieHa} ha` : "Manual"}
                                </span>
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
                                    fontSize: "13px",
                                    fontWeight: 700,
                                  }}
                                  title="Eliminar este trazo"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Acciones de reseteo o limpieza */}
            <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", gap: "6px" }}>
              <button
                type="button"
                onClick={handleResetLotes}
                className="thResetBtn"
                style={{ fontSize: "11px", color: "var(--brand-700)" }}
                title="Restaurar ejemplos de Racca y Keuneke"
              >
                Restaurar Racca y Keuneke
              </button>

              <button
                type="button"
                onClick={handleClearAllTrazos}
                className="thResetBtn"
                style={{ fontSize: "11px", color: "#b91c1c" }}
                title="Borrar todos los polígonos dibujados"
              >
                Borrar todos los trazos
              </button>
            </div>
          </div>
        </div>

        {/* Visor del Mapa Google Maps */}
        <div className="mapVisorContainer" style={{ position: "relative" }}>
          <div ref={mapContainerRef} className="mapCanvas" />

          {/* Barra Flotante Superior cuando se está trazando */}
          {isTracing && (
            <div
              style={{
                position: "absolute",
                top: "14px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(15, 23, 42, 0.94)",
                color: "#ffffff",
                padding: "10px 18px",
                borderRadius: "30px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
                fontSize: "13px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "12px",
                zIndex: 20,
              }}
            >
              <span>
                ✏️ <strong>Trazando {formTipo === "perimetro_campo" ? "Perímetro de Campo" : "Lote"}</strong>: Clic en cada esquina ({tracingCount} {tracingCount === 1 ? "vértice" : "vértices"})
              </span>

              <button
                type="button"
                onClick={finishNativeTracing}
                disabled={tracingCount < 3}
                style={{
                  background: tracingCount >= 3 ? "#22c55e" : "#475569",
                  color: "#ffffff",
                  border: "none",
                  padding: "5px 12px",
                  borderRadius: "14px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: tracingCount >= 3 ? "pointer" : "not-allowed",
                }}
              >
                ✓ Guardar Trazo
              </button>

              <button
                type="button"
                onClick={undoLastTracingPoint}
                disabled={tracingCount === 0}
                style={{
                  background: "#334155",
                  color: "#cbd5e1",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "14px",
                  fontSize: "11.5px",
                  cursor: tracingCount > 0 ? "pointer" : "not-allowed",
                }}
                title="Deshacer último punto marcado"
              >
                ↩️ Deshacer
              </button>

              <button
                type="button"
                onClick={cancelNativeTracing}
                style={{
                  background: "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "14px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ✕ Cancelar
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

      {/* Modal para Guardar Nuevo Trazo */}
      {showNewLoteModal && (
        <div className="modalBackdrop" onClick={() => setShowNewLoteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow" style={{ color: "var(--brand-700)", fontWeight: 700 }}>
                  Delimitación Geográfica
                </p>
                <h2>Guardar Trazo en el Mapa</h2>
              </div>
              <button type="button" className="iconButton" onClick={() => setShowNewLoteModal(false)}>
                ×
              </button>
            </div>

            <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Selector de Tipo de Trazo: Perímetro de Campo vs Lote Interno */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-800)", display: "block", marginBottom: "6px" }}>
                  ¿Qué estás delimitando? *
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFormTipo("perimetro_campo");
                      const found = campos.find((c) => c.id === formCampoId);
                      if (found) {
                        setFormNombre(found.nombre);
                        if (found.superficieHa) setFormSuperficieHa(String(found.superficieHa));
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "8px",
                      border: `1.5px solid ${formTipo === "perimetro_campo" ? "#0369a1" : "#cbd5e1"}`,
                      background: formTipo === "perimetro_campo" ? "#e0f2fe" : "#ffffff",
                      color: formTipo === "perimetro_campo" ? "#0369a1" : "#475569",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    🚩 Perímetro de Campo
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormTipo("lote_interno");
                      setFormNombre("");
                      setFormSuperficieHa("");
                    }}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "8px",
                      border: `1.5px solid ${formTipo === "lote_interno" ? "#16a34a" : "#cbd5e1"}`,
                      background: formTipo === "lote_interno" ? "#dcfce7" : "#ffffff",
                      color: formTipo === "lote_interno" ? "#166534" : "#475569",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    🌾 Lote Interno
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-800)" }}>
                  Campo al que pertenece *
                </label>
                <select
                  className="select"
                  style={{ marginTop: "4px" }}
                  value={formCampoId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setFormCampoId(newId);
                    const found = campos.find((c) => c.id === newId);
                    if (formTipo === "perimetro_campo" && found) {
                      setFormNombre(found.nombre);
                      if (found.superficieHa) setFormSuperficieHa(String(found.superficieHa));
                    }
                  }}
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
                  {formTipo === "perimetro_campo" ? "Nombre del Establecimiento" : "Identificación / Nombre del Lote (Opcional)"}
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ marginTop: "4px" }}
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder={formTipo === "perimetro_campo" ? "Ej: Keuneke, Racca..." : `Ej: 1, 2, 3a (si se deja vacío dirá "${campos.find((c) => c.id === formCampoId)?.nombre || 'Campo'}")`}
                />
                <small style={{ color: "var(--muted)", fontSize: "11px", marginTop: "3px", display: "block" }}>
                  {formTipo === "perimetro_campo"
                    ? "Este texto identificará todo el contorno exterior del campo."
                    : "Si el campo es un lote único sin divisiones internas, podés dejarlo vacío y dirá directamente el nombre del campo."}
                </small>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-800)" }}>
                  Superficie Real en Hectáreas (ha) — Carga Manual
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  style={{ marginTop: "4px" }}
                  value={formSuperficieHa}
                  onChange={(e) => setFormSuperficieHa(e.target.value)}
                  placeholder="Ej: 20, 25, 48, 57..."
                />
                <div style={{ marginTop: "4px", background: "#f8fafc", padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  <small style={{ color: "#475569", fontSize: "11px", display: "block", lineHeight: 1.35 }}>
                    🔒 <strong>Exactitud garantizada:</strong> Las hectáreas no se calculan desde el trazo de pantalla para evitar distorsiones por imprecisiones en el mouse o zoom.
                  </small>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--slate-800)" }}>
                  Cultivo / Destino (Opcional)
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
                Guardar en el Mapa
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
