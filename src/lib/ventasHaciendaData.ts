import { getTropas, saveTropas, getVentas, saveVentas, FichaVentaFrigorifico, HJB_GANADERIA_SYNC_EVENT } from "./ganaderiaData";
import { getDelProConfig, saveDelProConfig, HJB_DELPRO_SYNC_EVENT, VacaTamboIndividual } from "./delproData";

export interface VentaHaciendaRemito {
  id: string;
  fecha: string;
  remitoDte: string;
  frigorifico: string;
  remitoFotoUrl?: string;
  cabezasNovillos: number;
  cabezasVacas: number;
  totalCabezas: number;
  pesoTotalKg: number;
  pesoNetoKg: number;
  desbastePct: number;
  precioTotalArs: number;
  precioKgPromedioArs: number;
  precioPorCabezaPromedioArs: number;
  otrosGastosArs?: number;
  observaciones?: string;
  descontadoGanaderia: boolean;
  descontadoTambo: boolean;
  creadoEn: string;
}

export interface DatosDetectadosRemito {
  cabezasNovillos: number;
  cabezasVacas: number;
  pesoTotalKg: number;
  precioTotalArs: number;
  remitoDte: string;
  frigorifico: string;
  fecha: string;
  precioKgEstimado: number;
  confianza: "alta" | "media" | "manual";
  textoDetectado?: string;
}

export interface InputRegistroVentaRemito {
  remitoFotoUrl?: string;
  remitoDte: string;
  frigorifico: string;
  fecha?: string;
  cabezasNovillos: number;
  cabezasVacas: number;
  pesoTotalKg: number;
  precioTotalArs: number;
  desbastePct?: number;
  otrosGastosArs?: number;
  observaciones?: string;
}

export interface ResultadoVentaHacienda {
  success: boolean;
  mensaje: string;
  venta: VentaHaciendaRemito;
  resumen: {
    novillosDescontados: number;
    vacasDescontadas: number;
    ganaderiaStockRestante: number;
    tamboStockRestante: number;
  };
}

export const STORAGE_VENTAS_HACIENDA = "hjb_ventas_hacienda_remitos";
export const HJB_VENTA_HACIENDA_EVENT = "hjb_venta_hacienda_completada";

/**
 * Reduce y optimiza una imagen en el navegador a través de Canvas
 * para no exceder la cuota de localStorage (~150-250 KB max).
 */
export async function comprimirImagenRemito(
  fileOrBlob: File | Blob,
  maxDimension = 1400,
  calidad = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Fondo blanco para imágenes transparentes
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", calidad);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("No se pudo cargar la imagen para compresión"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Error leyendo el archivo"));
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Analizador semántico y de patrones especializado en Remitos de Hacienda,
 * DTe (Documento de Tránsito Electrónico SENASA) y Liquidaciones de Frigorífico.
 */
export function procesarTextoOCRRemito(rawText: string, nombreArchivo?: string): DatosDetectadosRemito {
  const text = (rawText || "").replace(/\r/g, " ");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let cabezasNovillos = 0;
  let cabezasVacas = 0;
  let pesoTotalKg = 0;
  let precioTotalArs = 0;
  let remitoDte = "";
  let frigorifico = "";
  let fecha = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

  // 1. Detección de Nº de DTe / Remito
  const matchDte = text.match(/(?:DTe|D\.T\.e|Remito|Gu[íi]a|Comprobante|N[°ºo\.]*)\s*[:#\-\s]*([0-9]{3,5}[\-\s]?[0-9]{5,8})/i);
  if (matchDte) {
    remitoDte = `DTe ${matchDte[1].replace(/\s+/g, "-")}`;
  } else {
    // Buscar patrón tipo 0048-XXXXXX
    const matchNumeroGuia = text.match(/\b([0-9]{4,5}[\-][0-9]{5,8})\b/);
    if (matchNumeroGuia) {
      remitoDte = `DTe ${matchNumeroGuia[1]}`;
    }
  }

  // 2. Detección de Frigorífico / Comprador
  const conocidos = [
    { pattern: /rafaela\s*alimentos/i, nombre: "Rafaela Alimentos S.A." },
    { pattern: /swift/i, nombre: "Swift Argentina S.A." },
    { pattern: /quickfood/i, nombre: "Quickfood S.A. (Marfrig)" },
    { pattern: /lehmann|coop(?:erativa)?\s*lehmann/i, nombre: "Cooperativa Guillermo Lehmann" },
    { pattern: /mattievich/i, nombre: "Frigorífico Mattievich" },
    { pattern: /santa\s*fe/i, nombre: "Frigorífico Santa Fe" },
    { pattern: /caba[ñn]a\s*don\s*felipe/i, nombre: "Cabaña Don Felipe" },
    { pattern: /consignataria/i, nombre: "Consignataria de Hacienda" },
  ];

  for (const c of conocidos) {
    if (c.pattern.test(text)) {
      frigorifico = c.nombre;
      break;
    }
  }

  if (!frigorifico) {
    const matchDest = text.match(/(?:Destino|Comprador|Frigor[íi]fico|Se[ñn]or(?:es)?|Cliente)[:\s]+([A-Za-z0-9\s\.\,]{4,35})/i);
    if (matchDest) {
      frigorifico = matchDest[1].trim();
    }
  }

  // 3. Detección de Fecha
  const matchFecha = text.match(/\b([0-3]?[0-9][\/\-][0-1]?[0-9][\/\-](?:20)?[12][0-9])\b/);
  if (matchFecha) {
    fecha = matchFecha[1].replace(/-/g, "/");
  }

  // 4. Detección de Novillos y Vacas línea por línea
  for (const line of lines) {
    const lLower = line.toLowerCase();

    // Novillos / Novillitos / Toritos / Gordos
    if (lLower.includes("novillo") || lLower.includes("novillito") || lLower.includes("macho") || lLower.includes("gordo") || lLower.includes("torito")) {
      const matchNum = line.match(/\b([0-9]{1,3})\s*(?:cab(?:ezas)?|un(?:idades)?|anim(?:ales)?|\b)/i);
      if (matchNum) {
        const val = parseInt(matchNum[1], 10);
        if (val > 0 && val < 500) {
          cabezasNovillos = Math.max(cabezasNovillos, val);
        }
      }
    }

    // Vacas / Vaquillonas / Conserva / Manufactura / Descarte
    if (lLower.includes("vaca") || lLower.includes("vaquillona") || lLower.includes("conserva") || lLower.includes("manufactura") || lLower.includes("descarte")) {
      const matchNum = line.match(/\b([0-9]{1,3})\s*(?:cab(?:ezas)?|un(?:idades)?|anim(?:ales)?|\b)/i);
      if (matchNum) {
        const val = parseInt(matchNum[1], 10);
        if (val > 0 && val < 500) {
          cabezasVacas = Math.max(cabezasVacas, val);
        }
      }
    }

    // Kilos / Peso Total
    if (lLower.includes("kg") || lLower.includes("kilo") || lLower.includes("peso") || lLower.includes("bruto") || lLower.includes("neto")) {
      const matchPeso = line.match(/(?:peso|kg|kilos|bruto|neto|total)?[\s\:\.\=]*([0-9]{1,3}(?:\.[0-9]{3})*(?:\,[0-9]+)?|[0-9]{3,6})\s*(?:kg|kilos)?/i);
      if (matchPeso) {
        const rawP = matchPeso[1].replace(/\./g, "").replace(",", ".");
        const valP = parseFloat(rawP);
        if (valP >= 300 && valP <= 50000) {
          pesoTotalKg = Math.max(pesoTotalKg, valP);
        }
      }
    }

    // Importe Total ($)
    if (lLower.includes("total") || lLower.includes("importe") || lLower.includes("liquidado") || lLower.includes("neto") || lLower.includes("$")) {
      const matchDinero = line.match(/(?:\$|importe|total|liquidado|neto)[\s\:\.\=]*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})+(?:\,[0-9]{2})?|[0-9]{6,10})/i);
      if (matchDinero) {
        const rawM = matchDinero[1].replace(/\./g, "").replace(",", ".");
        const valM = parseFloat(rawM);
        if (valM >= 100000) {
          precioTotalArs = Math.max(precioTotalArs, valM);
        }
      }
    }
  }

  // Si no se detectó DTe pero hay nombre de archivo sugerente
  if (!remitoDte && nombreArchivo) {
    const matchFn = nombreArchivo.match(/([0-9]{4,8})/);
    if (matchFn) {
      remitoDte = `DTe 0048-${matchFn[1]}`;
    }
  }

  // Valores predeterminados sugeridos si la imagen fue muy borrosa
  if (!remitoDte) {
    remitoDte = `DTe 0048-${Math.floor(200000 + Math.random() * 800000)}`;
  }
  if (!frigorifico) {
    frigorifico = "Rafaela Alimentos S.A.";
  }

  const totalCab = cabezasNovillos + cabezasVacas;
  const precioKgEstimado = (pesoTotalKg > 0 && precioTotalArs > 0)
    ? Number((precioTotalArs / pesoTotalKg).toFixed(2))
    : 2450.0;

  const confianza = (cabezasNovillos > 0 || cabezasVacas > 0) && pesoTotalKg > 0 ? "alta" : (cabezasNovillos > 0 || cabezasVacas > 0) ? "media" : "manual";

  return {
    cabezasNovillos,
    cabezasVacas,
    pesoTotalKg,
    precioTotalArs,
    remitoDte,
    frigorifico,
    fecha,
    precioKgEstimado,
    confianza,
    textoDetectado: text.slice(0, 500),
  };
}

/**
 * Ejecuta OCR con Tesseract.js de forma dinámica en el cliente.
 */
export async function ejecutarOCRRemito(
  imagenDataUrl: string,
  onProgress?: (porcentaje: number, mensaje: string) => void
): Promise<string> {
  if (typeof window === "undefined") return "";

  try {
    if (onProgress) onProgress(10, "Cargando motor OCR inteligente...");
    const { createWorker } = await import("tesseract.js");

    const worker = await createWorker("spa");

    if (onProgress) onProgress(35, "Reconociendo tipografía y tabla de hacienda...");
    const ret = await worker.recognize(imagenDataUrl);

    if (onProgress) onProgress(90, "Estructurando datos del remito/DTe...");
    await worker.terminate();

    if (onProgress) onProgress(100, "¡Reconocimiento completado!");
    return ret.data.text || "";
  } catch (err: any) {
    console.warn("Fallo en OCR Tesseract, activando modo asistido:", err);
    throw err;
  }
}

/**
 * Obtiene el historial de ventas registradas por remito.
 */
export function getVentasHacienda(): VentaHaciendaRemito[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_VENTAS_HACIENDA);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda el historial de ventas registradas por remito.
 */
export function saveVentasHacienda(ventas: VentaHaciendaRemito[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_VENTAS_HACIENDA, JSON.stringify(ventas));
  window.dispatchEvent(new CustomEvent(HJB_VENTA_HACIENDA_EVENT, { detail: ventas }));
}

/**
 * EJECUTA EL REGISTRO DE VENTA Y DESCUENTA EN CADA SECCIÓN CORRESPONDIENTE:
 * 1. Descuenta los NOVILLOS de Ganadería (de la tropa de Terminación Gordos y del stock de recría machos).
 * 2. Descuenta las VACAS de Tambo (del censo del rodeo lechero, vacas secas/descarte).
 * 3. Registra la ficha de venta en el historial de ventas a frigorífico con su foto, peso y precio.
 */
export function ejecutarVentaHacienda(input: InputRegistroVentaRemito): ResultadoVentaHacienda {
  const totalCabezas = (input.cabezasNovillos || 0) + (input.cabezasVacas || 0);
  if (totalCabezas <= 0) {
    throw new Error("Debe ingresar al menos 1 novillo o 1 vaca vendida.");
  }

  const pesoTotal = input.pesoTotalKg || 0;
  const precioTotal = input.precioTotalArs || 0;
  const desbaste = input.desbastePct !== undefined ? input.desbastePct : 7.0;
  const pesoNeto = Number((pesoTotal * (1 - desbaste / 100)).toFixed(1));
  const precioKgProm = pesoNeto > 0 ? Number((precioTotal / pesoNeto).toFixed(2)) : 0;
  const precioPorCabProm = totalCabezas > 0 ? Math.round(precioTotal / totalCabezas) : 0;
  const fechaVenta = input.fecha || new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

  let ganaderiaStockRestante = 0;
  let tamboStockRestante = 0;

  // =========================================================================
  // 1. DESCUENTO DE NOVILLOS EN GANADERÍA
  // =========================================================================
  let descontadoGanaderia = false;
  if (input.cabezasNovillos > 0) {
    const tropasActuales = getTropas();
    let cabARestar = input.cabezasNovillos;

    // Se descuenta prioritariamente del corral de Terminación Gordos
    const updatedTropas = tropasActuales.map((t) => {
      if (t.corralId === "terminacion") {
        const restar = Math.min(t.cabezas, cabARestar);
        cabARestar -= restar;
        return {
          ...t,
          cabezas: Math.max(0, t.cabezas - restar),
        };
      }
      return t;
    });

    // Si aún quedan novillos por restar, se descuentan de RM3
    if (cabARestar > 0) {
      const idxRm3 = updatedTropas.findIndex((t) => t.corralId === "rm3");
      if (idxRm3 >= 0) {
        const restar = Math.min(updatedTropas[idxRm3].cabezas, cabARestar);
        cabARestar -= restar;
        updatedTropas[idxRm3] = {
          ...updatedTropas[idxRm3],
          cabezas: Math.max(0, updatedTropas[idxRm3].cabezas - restar),
        };
      }
    }

    saveTropas(updatedTropas);
    ganaderiaStockRestante = updatedTropas.reduce((acc, t) => acc + t.cabezas, 0);

    // Descontar también en la lista individual de animalesRecria de DelPro
    const delproConfig = getDelProConfig();
    if (delproConfig?.datosSincronizados?.animalesRecria) {
      const recria = [...delproConfig.datosSincronizados.animalesRecria];
      let eliminados = 0;
      // Eliminar de los de terminación primero
      const nuevaRecria = recria.filter((a) => {
        if (eliminados < input.cabezasNovillos && a.corralId === "terminacion") {
          eliminados++;
          return false;
        }
        return true;
      });

      // Actualizar conteos en censo de DelPro
      const censo = delproConfig.datosSincronizados.censoRodeoTambo;
      const nuevoTotalGeneral = Math.max(0, (delproConfig.datosSincronizados.totalRodeoGeneral || 514) - input.cabezasNovillos);
      const nuevosNovillos = Math.max(0, (censo?.novillosRecriaEngorde || 99) - input.cabezasNovillos);

      saveDelProConfig({
        datosSincronizados: {
          ...delproConfig.datosSincronizados,
          totalRodeoGeneral: nuevoTotalGeneral,
          animalesRecria: nuevaRecria,
          censoRodeoTambo: censo ? {
            ...censo,
            totalRodeoGeneral: nuevoTotalGeneral,
            novillosRecriaEngorde: nuevosNovillos,
          } : undefined,
        },
      }, true);
    }

    // Generar Ficha de Venta de Frigorífico en Ganadería
    const pesoNovillosBruto = totalCabezas > 0 ? (pesoTotal * input.cabezasNovillos) / totalCabezas : pesoTotal;
    const pesoNovillosNeto = Number((pesoNovillosBruto * (1 - desbaste / 100)).toFixed(1));
    const facturacionNovillos = totalCabezas > 0 ? Math.round((precioTotal * input.cabezasNovillos) / totalCabezas) : precioTotal;
    const costoAlim = 721058 * input.cabezasNovillos;
    const flete = input.otrosGastosArs ? Math.round((input.otrosGastosArs * input.cabezasNovillos) / totalCabezas) : 0;
    const costoTotal = costoAlim + flete;
    const ganancia = facturacionNovillos - costoTotal;

    const nuevaFichaGanaderia: FichaVentaFrigorifico = {
      id: "venta-remito-" + Date.now(),
      fecha: fechaVenta,
      tropaId: "t-terminacion",
      tropaCodigo: "T-05",
      frigorifico: input.frigorifico,
      remitoDte: input.remitoDte,
      cabezas: input.cabezasNovillos,
      pesoBrutoTotalKg: Number(pesoNovillosBruto.toFixed(1)),
      pesoBrutoPromedioKg: Number((pesoNovillosBruto / input.cabezasNovillos).toFixed(1)),
      desbastePct: desbaste,
      pesoNetoTotalKg: pesoNovillosNeto,
      pesoNetoPromedioKg: Number((pesoNovillosNeto / input.cabezasNovillos).toFixed(1)),
      precioKgVivoArs: pesoNovillosNeto > 0 ? Number((facturacionNovillos / pesoNovillosNeto).toFixed(2)) : 2450,
      facturacionTotalArs: facturacionNovillos,
      costoAlimentacionTotalArs: costoAlim,
      otrosGastosArs: flete,
      costoTotalArs: costoTotal,
      gananciaNetaTotalArs: ganancia,
      gananciaNetaPorCabezaArs: Math.round(ganancia / input.cabezasNovillos),
      margenSobreCostoPct: costoTotal > 0 ? Number(((ganancia / costoTotal) * 100).toFixed(1)) : 0,
      diasCicloTotal: 360,
    };

    const ventasActuales = getVentas();
    saveVentas([nuevaFichaGanaderia, ...ventasActuales]);
    descontadoGanaderia = true;
  }

  // =========================================================================
  // 2. DESCUENTO DE VACAS EN TAMBO
  // =========================================================================
  let descontadoTambo = false;
  if (input.cabezasVacas > 0) {
    const delproConfig = getDelProConfig();
    const censo = delproConfig?.datosSincronizados?.censoRodeoTambo;

    if (censo) {
      const vacasSecasActuales = censo.vacasSecas || 34;
      const restarSecas = Math.min(vacasSecasActuales, input.cabezasVacas);
      const restoRestar = input.cabezasVacas - restarSecas;

      const nuevasSecas = Math.max(0, vacasSecasActuales - restarSecas);
      const nuevasVO = restoRestar > 0 ? Math.max(0, (censo.vacasEnOrdenie || 192) - restoRestar) : (censo.vacasEnOrdenie || 192);
      const nuevasAdultas = nuevasVO + nuevasSecas;
      const nuevoTotalGeneral = Math.max(0, (censo.totalRodeoGeneral || 514) - input.cabezasVacas);

      // Descontar en la lista detallada de vacas
      let detalleVacasActual = censo.detalleVacas ? [...censo.detalleVacas] : [];
      let vacasRemovidas = 0;

      // 1. Remover vacas secas primero
      detalleVacasActual = detalleVacasActual.filter((v: VacaTamboIndividual) => {
        if (vacasRemovidas < input.cabezasVacas && (v.corralId === "secas" || v.estadoProductivo === "Seca")) {
          vacasRemovidas++;
          return false;
        }
        return true;
      });

      // 2. Si faltan por descontar, remover de vacas en ordeñe con baja producción
      if (vacasRemovidas < input.cabezasVacas) {
        detalleVacasActual = detalleVacasActual.filter((v: VacaTamboIndividual) => {
          if (vacasRemovidas < input.cabezasVacas) {
            vacasRemovidas++;
            return false;
          }
          return true;
        });
      }

      tamboStockRestante = nuevasAdultas;

      saveDelProConfig({
        datosSincronizados: {
          ...delproConfig.datosSincronizados,
          totalRodeoGeneral: nuevoTotalGeneral,
          vacasSecasPreparto: nuevasSecas,
          censoRodeoTambo: {
            ...censo,
            totalRodeoGeneral: nuevoTotalGeneral,
            vacasSecas: nuevasSecas,
            vacasEnOrdenie: nuevasVO,
            totalVacasAdultas: nuevasAdultas,
            detalleVacas: detalleVacasActual,
          },
        },
      }, true);

      descontadoTambo = true;
    }
  }

  // =========================================================================
  // 3. REGISTRO UNIFICADO DE LA VENTA CON REMITO
  // =========================================================================
  const nuevaVentaRemito: VentaHaciendaRemito = {
    id: "venta-remito-" + Date.now(),
    fecha: fechaVenta,
    remitoDte: input.remitoDte,
    frigorifico: input.frigorifico,
    remitoFotoUrl: input.remitoFotoUrl,
    cabezasNovillos: input.cabezasNovillos,
    cabezasVacas: input.cabezasVacas,
    totalCabezas,
    pesoTotalKg: pesoTotal,
    pesoNetoKg: pesoNeto,
    desbastePct: desbaste,
    precioTotalArs: precioTotal,
    precioKgPromedioArs: precioKgProm,
    precioPorCabezaPromedioArs: precioPorCabProm,
    otrosGastosArs: input.otrosGastosArs,
    observaciones: input.observaciones,
    descontadoGanaderia,
    descontadoTambo,
    creadoEn: new Date().toISOString(),
  };

  const historial = getVentasHacienda();
  saveVentasHacienda([nuevaVentaRemito, ...historial]);

  // Mensaje detallado de retorno
  let detalleMsg = `✓ Venta registrada con éxito: ${totalCabezas} cabezas totales.`;
  if (input.cabezasNovillos > 0 && input.cabezasVacas > 0) {
    detalleMsg += ` Se descontaron ${input.cabezasNovillos} novillos de Ganadería (Terminación) y ${input.cabezasVacas} vacas de Tambo (Secas/Descarte).`;
  } else if (input.cabezasNovillos > 0) {
    detalleMsg += ` Se descontaron ${input.cabezasNovillos} novillos de Ganadería (Terminación).`;
  } else if (input.cabezasVacas > 0) {
    detalleMsg += ` Se descontaron ${input.cabezasVacas} vacas del Tambo (Secas/Descarte).`;
  }
  detalleMsg += ` Peso total: ${pesoTotal.toLocaleString("es-AR")} kg | Facturación: $${precioTotal.toLocaleString("es-AR")}.`;

  return {
    success: true,
    mensaje: detalleMsg,
    venta: nuevaVentaRemito,
    resumen: {
      novillosDescontados: input.cabezasNovillos,
      vacasDescontadas: input.cabezasVacas,
      ganaderiaStockRestante,
      tamboStockRestante,
    },
  };
}
