/**
 * EcoPrint Studio - Motor de Procesamiento Gráfico y Ahorro de Tinta
 */

/**
 * Renderiza una imagen aplicando recorte, rotación, aclarado, contraste y blanqueado de fondo (Eco-Tinta)
 * @param {Object} item - Objeto de datos de la imagen
 * @param {HTMLCanvasElement} targetCanvas - Canvas destino donde se dibujará
 * @param {number} [maxResolution=1400] - Resolución máxima para rendimiento óptimo
 */
export function renderProcessedImageToCanvas(item, targetCanvas, maxResolution = 1400) {
  const img = item.imgElement;
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;

  // Coordenadas absolutas de recorte basadas en factores normalizados (0.0 - 1.0)
  const cx = item.crop.x * sw;
  const cy = item.crop.y * sh;
  const cw = item.crop.w * sw;
  const ch = item.crop.h * sh;

  // Dimensiones según rotación angular (0°, 90°, 180°, 270°)
  const is90 = item.rotation === 90 || item.rotation === 270;
  const unrotatedW = cw;
  const unrotatedH = ch;
  const outW = is90 ? unrotatedH : unrotatedW;
  const outH = is90 ? unrotatedW : unrotatedH;

  // Limitar resolución máxima para balancear fidelidad y memoria
  let scale = 1;
  const maxDim = Math.max(outW, outH);
  if (maxDim > maxResolution) {
    scale = maxResolution / maxDim;
  }

  targetCanvas.width = Math.max(1, Math.round(outW * scale));
  targetCanvas.height = Math.max(1, Math.round(outH * scale));
  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });

  // Transformación geométrica de rotación centrada
  ctx.save();
  ctx.translate(targetCanvas.width / 2, targetCanvas.height / 2);
  ctx.rotate((item.rotation * Math.PI) / 180);

  const drawW = Math.round(cw * scale);
  const drawH = Math.round(ch * scale);
  ctx.drawImage(img, cx, cy, cw, ch, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  // Aplicar filtros a nivel de pixel si hay ajustes activos
  if (item.brightness !== 0 || item.contrast !== 0 || item.inkSaver) {
    const imgData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
    const data = imgData.data;

    // Aclarado proporcional en medios tonos y sombras sin quemar grises por sí solo
    const bRatio = item.brightness / 100; // 0.0 a 0.9

    // Factor de curva de contraste
    const cVal = item.contrast * 1.8;
    const cFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));

    // Umbral de luminancia para blanqueado de fondo (Eco-Tinta)
    const hardWhiteThreshold = item.inkThreshold ? Math.min(item.inkThreshold, 195) : 190;
    const softStartThreshold = hardWhiteThreshold - 45; // Zona de transición suave (145..190)

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // 1. Filtro Blanquear Fondo (Eco-Tinta):
      // Evalúa la luminancia y saturación del fondo antes de que otros ajustes distorsionen el umbral
      if (item.inkSaver) {
        const lumOrig = 0.299 * r + 0.587 * g + 0.114 * b;
        const maxCh = r > g ? (r > b ? r : b) : (g > b ? g : b);
        const minCh = r < g ? (r < b ? r : b) : (g < b ? g : b);
        const chroma = maxCh - minCh;

        // Los fondos grises/papel escaneado tienen baja saturación (chroma < 45) y luminancia media-alta
        const effectiveLum = chroma < 45 ? lumOrig + 15 : lumOrig;

        if (effectiveLum >= hardWhiteThreshold) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          continue;
        } else if (effectiveLum > softStartThreshold) {
          // Interpolación suave hacia blanco puro para eliminar sombras de escaneo sin bordes dentados
          const t = (effectiveLum - softStartThreshold) / (hardWhiteThreshold - softStartThreshold);
          const smoothT = t * t * (3 - 2 * t); // smoothstep
          r = r + (255 - r) * smoothT;
          g = g + (255 - g) * smoothT;
          b = b + (255 - b) * smoothT;
        }
      }

      // 2. Contraste
      if (item.contrast !== 0) {
        r = cFactor * (r - 128) + 128;
        g = cFactor * (g - 128) + 128;
        b = cFactor * (b - 128) + 128;
      }

      // 3. Aclarar (Brillo adaptativo que levanta sombras y tonos oscuros preservando el rango superior)
      if (bRatio > 0) {
        r = r + (245 - r) * (bRatio * 0.65);
        g = g + (245 - g) * (bRatio * 0.65);
        b = b + (245 - b) * (bRatio * 0.65);
      }

      // Delimitar al rango estándar 0..255
      data[i] = r < 0 ? 0 : (r > 255 ? 255 : r);
      data[i + 1] = g < 0 ? 0 : (g > 255 ? 255 : g);
      data[i + 2] = b < 0 ? 0 : (b > 255 ? 255 : b);
    }

    ctx.putImageData(imgData, 0, 0);
  }
}
