/**
 * EcoPrint Studio - Renderizado y Control de Galería Individual
 */

import { getImages, removeImage, moveImageOrderState, updateImageProps } from './state.js';
import { renderProcessedImageToCanvas } from './processor.js';
import { openCropModal } from './crop.js';
import { showToast } from './toast.js';

/**
 * Renderiza las tarjetas de edición individual en la cuadrícula de la galería
 */
export function renderGalleryCards() {
  const grid = document.getElementById('imageCardsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const images = getImages();

  images.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col group hover:border-slate-700 transition';

    // Contenedor visual del Canvas procesado
    const previewWrap = document.createElement('div');
    previewWrap.className = 'h-48 bg-slate-950 relative flex items-center justify-center overflow-hidden border-b border-slate-800 p-2';

    const canvas = document.createElement('canvas');
    canvas.className = 'max-h-full max-w-full object-contain rounded';
    renderProcessedImageToCanvas(item, canvas, 400);
    previewWrap.appendChild(canvas);

    // Badges flotantes en la miniatura
    const badgesContainer = document.createElement('div');
    badgesContainer.className = 'absolute top-2 left-2 flex flex-wrap gap-1 pointer-events-none';
    updateCardBadges(item, badgesContainer);
    previewWrap.appendChild(badgesContainer);

    // Botón rápido de eliminar en esquina
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'absolute top-2 right-2 bg-slate-900/80 hover:bg-rose-600 text-slate-300 hover:text-white p-1.5 rounded-lg opacity-80 group-hover:opacity-100 transition shadow';
    deleteBtn.title = 'Eliminar imagen';
    deleteBtn.setAttribute('aria-label', `Eliminar imagen ${index + 1}`);
    deleteBtn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`;
    deleteBtn.addEventListener('click', () => deleteImage(index));
    previewWrap.appendChild(deleteBtn);

    // Cuerpo de Controles de la Tarjeta
    const body = document.createElement('div');
    body.className = 'p-3 flex-1 flex flex-col justify-between gap-3 text-xs';

    body.innerHTML = `
      <div>
        <div class="flex items-center justify-between text-slate-400 text-[11px] mb-1">
          <span class="font-mono">#${index + 1}</span>
          <span class="card-item-name truncate max-w-[140px]"></span>
        </div>
        
        <!-- Controles Individuales de Brillo, Contraste y Blanqueado -->
        <div class="space-y-2 mt-2">
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Aclarar:</span>
            <div class="flex items-center gap-1.5">
              <input type="range" min="0" max="90" value="${item.brightness}" aria-label="Aclarar imagen ${index + 1}" class="card-brightness-input w-20 accent-emerald-500 cursor-pointer">
              <span class="card-brightness-val font-mono text-emerald-400 w-8 text-right font-medium">+${item.brightness}%</span>
            </div>
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Contraste:</span>
            <div class="flex items-center gap-1.5">
              <input type="range" min="-20" max="60" value="${item.contrast}" aria-label="Contraste imagen ${index + 1}" class="card-contrast-input w-20 accent-emerald-500 cursor-pointer">
              <span class="card-contrast-val font-mono text-emerald-400 w-8 text-right font-medium">${item.contrast > 0 ? '+' : ''}${item.contrast}%</span>
            </div>
          </div>

          <label class="flex items-center justify-between pt-1 cursor-pointer select-none text-slate-300 hover:text-white transition">
            <span class="text-slate-400">Blanquear fondo:</span>
            <input type="checkbox" ${item.inkSaver ? 'checked' : ''} class="card-inksaver-input accent-emerald-500 rounded cursor-pointer">
          </label>
        </div>
      </div>

      <!-- Acciones de la Tarjeta: Recortar, Rotar, Ordenar -->
      <div class="pt-2 border-t border-slate-800 flex items-center justify-between gap-1">
        <div class="flex items-center gap-1">
          <button type="button" class="card-crop-btn px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Recortar
          </button>

          <button type="button" class="card-rotate-btn p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition" title="Rotar 90° horario" aria-label="Rotar 90 grados">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>

        <!-- Flechas de orden -->
        <div class="flex items-center gap-1">
          <button type="button" class="card-move-prev p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition" ${index === 0 ? 'disabled' : ''} title="Mover antes" aria-label="Mover imagen hacia atrás">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button type="button" class="card-move-next p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition" ${index === images.length - 1 ? 'disabled' : ''} title="Mover después" aria-label="Mover imagen hacia adelante">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    `;

    // Asignación segura de texto para prevenir inyección XSS desde nombres de archivo
    const nameEl = body.querySelector('.card-item-name');
    nameEl.textContent = item.name;
    nameEl.title = item.name;

    // Conectar eventos de los deslizadores actualizando el canvas local sin reconstruir todo el DOM
    const brightInput = body.querySelector('.card-brightness-input');
    const brightValEl = body.querySelector('.card-brightness-val');
    brightInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      updateIndividualBrightness(index, val, false);
      brightValEl.textContent = `+${val}%`;
      renderProcessedImageToCanvas(item, canvas, 400);
    });

    const contrastInput = body.querySelector('.card-contrast-input');
    const contrastValEl = body.querySelector('.card-contrast-val');
    contrastInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      updateIndividualContrast(index, val, false);
      contrastValEl.textContent = `${val > 0 ? '+' : ''}${val}%`;
      renderProcessedImageToCanvas(item, canvas, 400);
    });

    const inkSaverInput = body.querySelector('.card-inksaver-input');
    inkSaverInput.addEventListener('change', (e) => {
      const checked = e.target.checked;
      updateIndividualInkSaver(index, checked, false);
      updateCardBadges(item, badgesContainer);
      renderProcessedImageToCanvas(item, canvas, 400);
    });

    const cropBtn = body.querySelector('.card-crop-btn');
    cropBtn.addEventListener('click', () => openCropModal(index));

    const rotateBtn = body.querySelector('.card-rotate-btn');
    rotateBtn.addEventListener('click', () => rotateImage(index));

    const prevBtn = body.querySelector('.card-move-prev');
    prevBtn.addEventListener('click', () => moveImageOrder(index, -1));

    const nextBtn = body.querySelector('.card-move-next');
    nextBtn.addEventListener('click', () => moveImageOrder(index, 1));

    card.appendChild(previewWrap);
    card.appendChild(body);
    grid.appendChild(card);
  });
}

/**
 * Actualiza las insignias visuales (Recortada, Rotación, Eco-Tinta) de una tarjeta
 * @param {Object} item
 * @param {HTMLElement} container
 */
function updateCardBadges(item, container) {
  const isCropped = (item.crop.w < 0.99 || item.crop.h < 0.99 || item.crop.x > 0.01 || item.crop.y > 0.01);
  let badgeHtml = '';
  if (isCropped) {
    badgeHtml += `<span class="bg-blue-500/80 backdrop-blur text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow">Recortada</span>`;
  }
  if (item.rotation !== 0) {
    badgeHtml += `<span class="bg-purple-500/80 backdrop-blur text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow">${item.rotation}°</span>`;
  }
  if (item.inkSaver) {
    badgeHtml += `<span class="bg-emerald-500/80 backdrop-blur text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow">Eco-Tinta</span>`;
  }
  container.innerHTML = badgeHtml;
}

/**
 * Actualiza el brillo de una imagen individual
 * @param {number} index - Índice de la imagen
 * @param {number|string} val - Nuevo valor de brillo (0..90)
 * @param {boolean} [reRenderAll=true] - Si debe reconstruir la cuadrícula completa
 */
export function updateIndividualBrightness(index, val, reRenderAll = true) {
  updateImageProps(index, { brightness: parseInt(val, 10) }, reRenderAll);
}

/**
 * Actualiza el contraste de una imagen individual
 * @param {number} index - Índice de la imagen
 * @param {number|string} val - Nuevo valor de contraste (-20..60)
 * @param {boolean} [reRenderAll=true] - Si debe reconstruir la cuadrícula completa
 */
export function updateIndividualContrast(index, val, reRenderAll = true) {
  updateImageProps(index, { contrast: parseInt(val, 10) }, reRenderAll);
}

/**
 * Activa o desactiva el filtro de blanqueado de fondo (Eco-Tinta) en una imagen individual
 * @param {number} index - Índice de la imagen
 * @param {boolean} enabled - Estado del filtro
 * @param {boolean} [reRenderAll=true] - Si debe reconstruir la cuadrícula completa
 */
export function updateIndividualInkSaver(index, enabled, reRenderAll = true) {
  updateImageProps(index, { inkSaver: Boolean(enabled) }, reRenderAll);
}

/**
 * Rota una imagen 90 grados en sentido horario
 * @param {number} index - Índice de la imagen
 */
export function rotateImage(index) {
  const images = getImages();
  if (!images[index]) return;
  const newRotation = (images[index].rotation + 90) % 360;
  updateImageProps(index, { rotation: newRotation });
  showToast(`Imagen #${index + 1} rotada a ${newRotation}°.`);
}

/**
 * Elimina una imagen de la galería
 * @param {number} index - Índice de la imagen
 */
export function deleteImage(index) {
  removeImage(index);
  showToast('Imagen eliminada.');
}

/**
 * Cambia la posición de una imagen en la secuencia de impresión
 * @param {number} index - Índice actual
 * @param {number} direction - Dirección (-1 o +1)
 */
export function moveImageOrder(index, direction) {
  moveImageOrderState(index, direction);
}
