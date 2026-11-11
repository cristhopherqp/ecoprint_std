/**
 * EcoPrint Studio - Motor de Procesamiento Gráfico y Ahorro de Tinta
 */

/**
 * Renderiza una imagen aplicando recorte, rotación, aclarado, contraste y ahorro de tinta
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

  // Aplicar filtros a nivel de pixel si se modificaron los valores
  if (item.brightness !== 0 || item.contrast !== 0 || item.inkSaver) {
    const imgData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
    const data = imgData.data;

    // Desplazamiento por brillo (aclarado)
    const bOffset = (item.brightness / 100) * 255;

    // Factor de curva de contraste (-255 a +255)
    const cVal = item.contrast * 2.55;
    const cFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));

    // Umbral de luminancia para filtro Eco-Tinta (ahorro de toner/tinta)
    const inkThreshold = item.inkSaver ? (item.inkThreshold ?? 215) : 9999;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // 1. Contraste
      if (item.contrast !== 0) {
        r = cFactor * (r - 128) + 128;
        g = cFactor * (g - 128) + 128;
        b = cFactor * (b - 128) + 128;
      }

      // 2. Aclarado (Brillo positivo)
      if (item.brightness !== 0) {
        r += bOffset;
        g += bOffset;
        b += bOffset;
      }

      // 3. Filtro Ahorro de Tinta:
      // Convierte grises claros y sombras de fondo escaneadas en blanco puro
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (item.inkSaver && lum >= inkThreshold) {
        r = 255;
        g = 255;
        b = 255;
      }

      // Delimitar al rango estándar 0..255
      data[i] = r < 0 ? 0 : (r > 255 ? 255 : r);
      data[i + 1] = g < 0 ? 0 : (g > 255 ? 255 : g);
      data[i + 2] = b < 0 ? 0 : (b > 255 ? 255 : b);
    }

    ctx.putImageData(imgData, 0, 0);
  }
}

