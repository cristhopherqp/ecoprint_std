/**
 * EcoPrint Studio - Herramienta Interactiva de Recorte
 */

import { getImages, getEditingItemIndex, setEditingItemIndex, updateImageProps } from './state.js';
import { showToast } from './toast.js';

let cropBox = { x: 0.05, y: 0.05, w: 0.9, h: 0.9 }; // Normalizado 0.0 a 1.0
let cropAspectMode = 'free'; // 'free' | '1:1' | '4:3' | 'a4'
let cropDragHandle = null; // null | 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w'
let cropDragStart = { mouseX: 0, mouseY: 0, boxX: 0, boxY: 0, boxW: 0, boxH: 0 };
let eventsInitialized = false;

/**
 * Abre el modal de recorte para la imagen seleccionada
 * @param {number} index 
 */
export function openCropModal(index) {
  const images = getImages();
  const item = images[index];
  if (!item) return;

  setEditingItemIndex(index);

  // Copiar configuración de recorte actual
  cropBox = { ...item.crop };
  cropAspectMode = 'free';
  updateAspectButtonsUI();

  const modal = document.getElementById('cropModal');
  if (modal) {
    modal.classList.remove('hidden');
  }

  setTimeout(initCropCanvas, 50);
}

/**
 * Cierra el modal de recorte
 */
export function closeCropModal() {
  const modal = document.getElementById('cropModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  setEditingItemIndex(null);
}

/**
 * Restablece el recorte al 100% de la imagen
 */
export function resetCurrentCrop() {
  cropBox = { x: 0, y: 0, w: 1, h: 1 };
  drawCropCanvas();
}

/**
 * Confirma el recorte y lo guarda en el estado
 */
export function confirmCrop() {
  const editingIndex = getEditingItemIndex();
  if (editingIndex === null) return;

  updateImageProps(editingIndex, { crop: { ...cropBox } });
  closeCropModal();
  showToast('Recorte guardado para la imagen.');
}

/**
 * Cambia la relación de aspecto del recorte ('free', '1:1', '4:3', 'a4')
 * @param {string} aspect 
 */
export function setCropAspect(aspect) {
  cropAspectMode = aspect;
  updateAspectButtonsUI();

  const editingIndex = getEditingItemIndex();
  if (editingIndex === null) return;
  const item = getImages()[editingIndex];
  if (!item) return;

  const img = item.imgElement;
  if (aspect === '1:1') {
    applyTargetAspect(1.0, img.naturalWidth, img.naturalHeight);
  } else if (aspect === '4:3') {
    applyTargetAspect(4 / 3, img.naturalWidth, img.naturalHeight);
  } else if (aspect === 'a4') {
    // Relación de papel ISO 1 : 1.414 (√2)
    applyTargetAspect(1 / 1.414, img.naturalWidth, img.naturalHeight);
  }
  drawCropCanvas();
}

function applyTargetAspect(targetRatio, imgW, imgH) {
  let w = cropBox.w;
  let h = (w * imgW) / (targetRatio * imgH);

  if (h > 1.0) {
    h = 1.0;
    w = (h * targetRatio * imgH) / imgW;
  }
  cropBox.w = Math.min(1.0, Math.max(0.1, w));
  cropBox.h = Math.min(1.0, Math.max(0.1, h));
  if (cropBox.x + cropBox.w > 1.0) cropBox.x = 1.0 - cropBox.w;
  if (cropBox.y + cropBox.h > 1.0) cropBox.y = 1.0 - cropBox.h;
}

export function updateAspectButtonsUI() {
  document.querySelectorAll('.crop-aspect-btn').forEach(btn => {
    if (btn.getAttribute('data-aspect') === cropAspectMode) {
      btn.className = "crop-aspect-btn px-2.5 py-1 rounded bg-emerald-600 text-white font-medium text-xs";
    } else {
      btn.className = "crop-aspect-btn px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-xs";
    }
  });
}

export function initCropCanvas() {
  const editingIndex = getEditingItemIndex();
  if (editingIndex === null) return;
  const item = getImages()[editingIndex];
  if (!item) return;

  const canvas = document.getElementById('cropCanvas');
  if (!canvas) return;
  const container = canvas.parentElement;
  if (!container) return;

  const availW = container.clientWidth - 32;
  const availH = container.clientHeight - 32;

  const imgW = item.naturalWidth;
  const imgH = item.naturalHeight;

  const ratio = Math.min(availW / imgW, availH / imgH, 1.0);
  canvas.width = Math.round(imgW * ratio);
  canvas.height = Math.round(imgH * ratio);

  drawCropCanvas();
}

export function drawCropCanvas() {
  const editingIndex = getEditingItemIndex();
  if (editingIndex === null) return;
  const item = getImages()[editingIndex];
  if (!item) return;

  const canvas = document.getElementById('cropCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // 1. Imagen base
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(item.imgElement, 0, 0, W, H);

  // 2. Máscara oscura semitransparente
  ctx.fillStyle = "rgba(10, 15, 29, 0.65)";
  ctx.fillRect(0, 0, W, H);

  // Coordenadas absolutas en canvas
  const bx = cropBox.x * W;
  const by = cropBox.y * H;
  const bw = cropBox.w * W;
  const bh = cropBox.h * H;

  // 3. Región recortada visible
  ctx.save();
  ctx.beginPath();
  ctx.rect(bx, by, bw, bh);
  ctx.clip();
  ctx.drawImage(item.imgElement, 0, 0, W, H);
  ctx.restore();

  // 4. Borde del marco de recorte
  ctx.strokeStyle = "#10b981"; // Emerald
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bh);

  // 5. Guías de tercios compositivas
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bx + bw / 3, by);
  ctx.lineTo(bx + bw / 3, by + bh);
  ctx.moveTo(bx + (2 * bw) / 3, by);
  ctx.lineTo(bx + (2 * bw) / 3, by + bh);
  ctx.moveTo(bx, by + bh / 3);
  ctx.lineTo(bx + bw, by + bh / 3);
  ctx.moveTo(bx, by + (2 * bh) / 3);
  ctx.lineTo(bx + bw, by + (2 * bh) / 3);
  ctx.stroke();

  // 6. Manijas de control (Handles)
  const handleSize = 9;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#047857";
  ctx.lineWidth = 2;

  const handles = getCropHandlesPixels(bx, by, bw, bh);
  for (const key in handles) {
    const pt = handles[key];
    ctx.beginPath();
    ctx.rect(pt.x - handleSize / 2, pt.y - handleSize / 2, handleSize, handleSize);
    ctx.fill();
    ctx.stroke();
  }
}

function getCropHandlesPixels(bx, by, bw, bh) {
  return {
    nw: { x: bx, y: by },
    ne: { x: bx + bw, y: by },
    se: { x: bx + bw, y: by + bh },
    sw: { x: bx, y: by + bh },
    n: { x: bx + bw / 2, y: by },
    s: { x: bx + bw / 2, y: by + bh },
    w: { x: bx, y: by + bh / 2 },
    e: { x: bx + bw, y: by + bh / 2 }
  };
}

/**
 * Inicializa los eventos de arrastre en el canvas de recorte
 */
export function setupCropCanvasEvents() {
  if (eventsInitialized) return;
  const canvas = document.getElementById('cropCanvas');
  if (!canvas) return;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / canvas.width,
      y: (clientY - rect.top) / canvas.height,
      pixelX: clientX - rect.left,
      pixelY: clientY - rect.top
    };
  }

  function detectHandle(px, py) {
    const W = canvas.width;
    const H = canvas.height;
    const bx = cropBox.x * W;
    const by = cropBox.y * H;
    const bw = cropBox.w * W;
    const bh = cropBox.h * H;
    const handles = getCropHandlesPixels(bx, by, bw, bh);
    const hitRadius = 14;

    for (const key in handles) {
      const pt = handles[key];
      const dist = Math.hypot(px - pt.x, py - pt.y);
      if (dist <= hitRadius) return key;
    }

    if (px >= bx && px <= bx + bw && py >= by && py <= by + bh) {
      return 'move';
    }
    return null;
  }

  const onStart = (e) => {
    const pos = getPos(e);
    cropDragHandle = detectHandle(pos.pixelX, pos.pixelY);
    if (!cropDragHandle) return;

    cropDragStart = {
      mouseX: pos.x,
      mouseY: pos.y,
      boxX: cropBox.x,
      boxY: cropBox.y,
      boxW: cropBox.w,
      boxH: cropBox.h
    };
    e.preventDefault();
  };

  const onMove = (e) => {
    const pos = getPos(e);

    if (!cropDragHandle) {
      const handle = detectHandle(pos.pixelX, pos.pixelY);
      if (handle === 'move') canvas.style.cursor = 'move';
      else if (handle === 'nw' || handle === 'se') canvas.style.cursor = 'nwse-resize';
      else if (handle === 'ne' || handle === 'sw') canvas.style.cursor = 'nesw-resize';
      else if (handle === 'n' || handle === 's') canvas.style.cursor = 'ns-resize';
      else if (handle === 'e' || handle === 'w') canvas.style.cursor = 'ew-resize';
      else canvas.style.cursor = 'crosshair';
      return;
    }

    const dx = pos.x - cropDragStart.mouseX;
    const dy = pos.y - cropDragStart.mouseY;

    const { boxX, boxY, boxW, boxH } = cropDragStart;

    if (cropDragHandle === 'move') {
      cropBox.x = Math.max(0, Math.min(1 - boxW, boxX + dx));
      cropBox.y = Math.max(0, Math.min(1 - boxH, boxY + dy));
    } else {
      let newX = cropBox.x;
      let newY = cropBox.y;
      let newW = cropBox.w;
      let newH = cropBox.h;

      if (cropDragHandle.includes('w')) {
        const right = boxX + boxW;
        newX = Math.min(right - 0.05, Math.max(0, boxX + dx));
        newW = right - newX;
      }
      if (cropDragHandle.includes('e')) {
        newW = Math.max(0.05, Math.min(1 - boxX, boxW + dx));
      }
      if (cropDragHandle.includes('n')) {
        const bottom = boxY + boxH;
        newY = Math.min(bottom - 0.05, Math.max(0, boxY + dy));
        newH = bottom - newY;
      }
      if (cropDragHandle.includes('s')) {
        newH = Math.max(0.05, Math.min(1 - boxY, boxH + dy));
      }

      cropBox.x = newX;
      cropBox.y = newY;
      cropBox.w = newW;
      cropBox.h = newH;
    }

    drawCropCanvas();
    e.preventDefault();
  };

  const onEnd = () => {
    cropDragHandle = null;
  };

  canvas.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  canvas.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd);

  eventsInitialized = true;
}
