/**
 * EcoPrint Studio - Renderizado y Control de Galería Individual
 */

import { state, getImages, removeImage, moveImageOrderState, updateImageProps } from './state.js';
import { renderProcessedImageToCanvas } from './processor.js';
import {
  BRIGHTNESS_PRESETS,
  CONTRAST_PRESETS,
  buildPresetOptionsHTML,
  bindCompositeFilterControl
} from './filter-controls.js';
import { openCropModal } from './crop.js';
import { showToast } from './toast.js';

let lightboxEventsInitialized = false;

/**
 * Renderiza las tarjetas de edición individual en la cuadrícula de la galería
 */
export function renderGalleryCards() {
  const grid = document.getElementById('imageCardsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const images = getImages();

  images.forEach((item, index) => {
    const isControlsOpen = item.controlsOpen !== false;

    const card = document.createElement('div');
    card.className = 'card-item bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col group hover:border-slate-700 transition';

    // Contenedor visual del Canvas procesado (altura controlada por variable CSS --card-preview-height)
    const previewWrap = document.createElement('div');
    previewWrap.className = 'card-preview-wrap bg-slate-950 relative flex items-center justify-center overflow-hidden border-b border-slate-800 p-2';

    const canvas = document.createElement('canvas');
    canvas.className = 'max-h-full max-w-full object-contain rounded cursor-zoom-in';
    canvas.title = 'Doble clic para ver a pantalla completa';
    renderProcessedImageToCanvas(item, canvas, 450);
    canvas.addEventListener('dblclick', () => openLightboxModal(index));
    previewWrap.appendChild(canvas);

    // Badges flotantes en la miniatura
    const badgesContainer = document.createElement('div');
    badgesContainer.className = 'absolute top-2 left-2 flex flex-wrap gap-1 pointer-events-none';
    updateCardBadges(item, badgesContainer);
    previewWrap.appendChild(badgesContainer);

    // Contenedor de acciones rápidas en la esquina superior derecha de la miniatura (Pantalla completa + Eliminar)
    const topActions = document.createElement('div');
    topActions.className = 'absolute top-2 right-2 flex items-center gap-1';

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.type = 'button';
    fullscreenBtn.className = 'bg-slate-900/85 hover:bg-emerald-600 text-slate-200 hover:text-white p-1.5 rounded-lg opacity-85 group-hover:opacity-100 transition shadow';
    fullscreenBtn.title = 'Ver a pantalla completa';
    fullscreenBtn.setAttribute('aria-label', `Ver imagen ${index + 1} a pantalla completa`);
    fullscreenBtn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>`;
    fullscreenBtn.addEventListener('click', () => openLightboxModal(index));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'bg-slate-900/85 hover:bg-rose-600 text-slate-300 hover:text-white p-1.5 rounded-lg opacity-85 group-hover:opacity-100 transition shadow';
    deleteBtn.title = 'Eliminar imagen';
    deleteBtn.setAttribute('aria-label', `Eliminar imagen ${index + 1}`);
    deleteBtn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`;
    deleteBtn.addEventListener('click', () => deleteImage(index));

    topActions.appendChild(fullscreenBtn);
    topActions.appendChild(deleteBtn);
    previewWrap.appendChild(topActions);

    // Cuerpo de Controles de la Tarjeta (sin flex-1 ni justify-between para ajustarse exactamente a su contenido al plegar)
    const body = document.createElement('div');
    body.className = 'p-2.5 flex flex-col gap-2 text-xs';

    const brightnessPresetsHTML = buildPresetOptionsHTML(BRIGHTNESS_PRESETS, item.brightness, true, true);
    const contrastPresetsHTML = buildPresetOptionsHTML(CONTRAST_PRESETS, item.contrast, true, true);

    body.innerHTML = `
      <div>
        <!-- Encabezado de tarjeta: Índice + Botón Plegar/Desplegar + Nombre editable inline -->
        <div class="flex items-center justify-between gap-1 text-slate-400 text-[11px] mb-1">
          <span class="font-mono font-semibold text-emerald-400 shrink-0">#${index + 1}</span>

          <!-- Botón plegable entre el número y el nombre -->
          <button type="button" class="card-collapse-toggle flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition shrink-0" title="${isControlsOpen ? 'Plegar ajustes' : 'Desplegar ajustes'}" aria-expanded="${isControlsOpen}">
            <span class="card-collapse-label hidden sm:inline">Ajustes</span>
            <span class="card-collapse-icon transform transition-transform text-[9px] ${isControlsOpen ? 'rotate-180' : ''}">▼</span>
          </button>
          
          <div class="card-name-display-wrap flex-1 min-w-0 flex items-center justify-end gap-0.5">
            <span class="card-item-name truncate font-medium text-slate-200 cursor-pointer hover:text-emerald-400 transition text-[11px]" title="Doble clic para renombrar"></span>
            <button type="button" class="card-rename-btn p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition shrink-0" title="Renombrar imagen" aria-label="Renombrar imagen ${index + 1}">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            </button>
          </div>

          <div class="card-name-edit-wrap hidden flex-1 min-w-0 flex items-center gap-1">
            <input type="text" class="card-rename-input w-full bg-slate-950 border border-emerald-500/70 rounded px-1.5 py-0.5 text-slate-100 text-[11px] focus:outline-none" aria-label="Nuevo nombre de imagen">
          </div>
        </div>
        
        <!-- Controles Individuales Plegables (Aclarar y Contraste unificados en un solo contenedor) -->
        <div class="card-collapsible-body space-y-2 mt-1.5 ${isControlsOpen ? '' : 'hidden'}">
          <!-- Un solo contenedor para ambos espacios de edición -->
          <div class="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 space-y-2">
            <!-- Control Compuesto Individual: Aclarar -->
            <div class="space-y-1">
              <div class="flex items-center justify-between gap-1">
                <span class="card-filter-label flex items-center gap-1 text-slate-400 font-medium shrink-0" title="Aclarar fondo">
                  <!-- Ícono referencial para Aclarar (Círculo luminoso blanco) -->
                  <svg class="w-3.5 h-3.5 text-amber-300 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="12" cy="12" r="5"/>
                    <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                  </svg>
                  <span class="card-filter-text">Aclarar:</span>
                </span>
                <div class="flex items-center gap-1">
                  <div class="flex items-center bg-slate-900 border border-slate-700 rounded px-1 py-0.5">
                    <input type="number" min="0" max="90" value="${item.brightness}" aria-label="Número aclarar imagen ${index + 1}" class="card-brightness-num w-7 bg-transparent text-emerald-400 font-mono text-center text-[11px] focus:outline-none">
                    <span class="text-slate-500 font-mono text-[10px]">%</span>
                  </div>
                  <select aria-label="Presets aclarar imagen ${index + 1}" class="card-brightness-preset bg-slate-900 border border-slate-700 text-slate-300 rounded px-1 py-0.5 text-[10px] focus:outline-none cursor-pointer">
                    ${brightnessPresetsHTML}
                  </select>
                </div>
              </div>
              <input type="range" min="0" max="90" value="${item.brightness}" aria-label="Deslizador aclarar imagen ${index + 1}" class="card-brightness-input w-full accent-emerald-500 cursor-pointer">
            </div>

            <div class="border-t border-slate-800/70"></div>
            
            <!-- Control Compuesto Individual: Contraste -->
            <div class="space-y-1">
              <div class="flex items-center justify-between gap-1">
                <span class="card-filter-label flex items-center gap-1 text-slate-400 font-medium shrink-0" title="Contraste">
                  <!-- Ícono referencial para Contraste (Círculo dividido blanco y negro) -->
                  <svg class="w-3.5 h-3.5 text-slate-200 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18V4a8 8 0 010 16z"/>
                  </svg>
                  <span class="card-filter-text">Contraste:</span>
                </span>
                <div class="flex items-center gap-1">
                  <div class="flex items-center bg-slate-900 border border-slate-700 rounded px-1 py-0.5">
                    <input type="number" min="-20" max="60" value="${item.contrast}" aria-label="Número contraste imagen ${index + 1}" class="card-contrast-num w-8 bg-transparent text-emerald-400 font-mono text-center text-[11px] focus:outline-none">
                    <span class="text-slate-500 font-mono text-[10px]">%</span>
                  </div>
                  <select aria-label="Presets contraste imagen ${index + 1}" class="card-contrast-preset bg-slate-900 border border-slate-700 text-slate-300 rounded px-1 py-0.5 text-[10px] focus:outline-none cursor-pointer">
                    ${contrastPresetsHTML}
                  </select>
                </div>
              </div>
              <input type="range" min="-20" max="60" value="${item.contrast}" aria-label="Deslizador contraste imagen ${index + 1}" class="card-contrast-input w-full accent-emerald-500 cursor-pointer">
            </div>
          </div>

          <label class="flex items-center justify-between px-1 pt-0.5 cursor-pointer select-none text-slate-300 hover:text-white transition">
            <span class="text-slate-400">Blanquear fondo:</span>
            <input type="checkbox" ${item.inkSaver ? 'checked' : ''} class="card-inksaver-input accent-emerald-500 rounded cursor-pointer">
          </label>
        </div>
      </div>

      <!-- Acciones de la Tarjeta: Recortar, Rotar, Pantalla Completa, Ordenar -->
      <div class="pt-2 border-t border-slate-800 flex items-center justify-between gap-1">
        <div class="flex items-center gap-1">
          <button type="button" class="card-crop-btn px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Recortar
          </button>

          <button type="button" class="card-rotate-btn p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition" title="Rotar 90° horario" aria-label="Rotar 90 grados">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>

          <button type="button" class="card-expand-btn p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition" title="Pantalla completa" aria-label="Ver a pantalla completa">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </button>
        </div>

        <!-- Flechas de orden manual -->
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

    // 1. Asignación segura de nombre y lógica de renombrado inline
    const nameDisplayWrap = body.querySelector('.card-name-display-wrap');
    const nameEditWrap = body.querySelector('.card-name-edit-wrap');
    const nameEl = body.querySelector('.card-item-name');
    const renameBtn = body.querySelector('.card-rename-btn');
    const renameInput = body.querySelector('.card-rename-input');

    nameEl.textContent = item.name;
    nameEl.title = `${item.name} (Doble clic para renombrar)`;

    const startRename = () => {
      nameDisplayWrap.classList.add('hidden');
      nameEditWrap.classList.remove('hidden');
      renameInput.value = item.name;
      renameInput.focus();
      renameInput.select();
    };

    const commitRename = () => {
      if (nameEditWrap.classList.contains('hidden')) return;
      const trimmed = renameInput.value.trim();
      nameEditWrap.classList.add('hidden');
      nameDisplayWrap.classList.remove('hidden');
      if (trimmed && trimmed !== item.name) {
        updateImageProps(index, { name: trimmed }, false);
        nameEl.textContent = trimmed;
        nameEl.title = `${trimmed} (Doble clic para renombrar)`;
        showToast(`Imagen renombrada a "${trimmed}".`);
      }
    };

    const cancelRename = () => {
      nameEditWrap.classList.add('hidden');
      nameDisplayWrap.classList.remove('hidden');
    };

    renameBtn.addEventListener('click', startRename);
    nameEl.addEventListener('dblclick', startRename);
    renameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitRename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelRename();
      }
    });
    renameInput.addEventListener('blur', commitRename);

    // 2. Plegado y desplegado individual de controles
    const collapseToggle = body.querySelector('.card-collapse-toggle');
    const collapsibleBody = body.querySelector('.card-collapsible-body');
    const collapseIcon = body.querySelector('.card-collapse-icon');
    collapseToggle.addEventListener('click', () => {
      const currentlyHidden = collapsibleBody.classList.contains('hidden');
      const nextOpen = currentlyHidden;
      collapsibleBody.classList.toggle('hidden', !nextOpen);
      collapseIcon.classList.toggle('rotate-180', nextOpen);
      collapseToggle.setAttribute('aria-expanded', String(nextOpen));
      collapseToggle.title = nextOpen ? 'Plegar ajustes' : 'Desplegar ajustes';
      updateImageProps(index, { controlsOpen: nextOpen }, false);
    });

    // 3. Controles Compuestos Bidireccionales: Aclarar y Contraste
    bindCompositeFilterControl({
      rangeEl: body.querySelector('.card-brightness-input'),
      numberEl: body.querySelector('.card-brightness-num'),
      presetEl: body.querySelector('.card-brightness-preset'),
      min: 0,
      max: 90,
      presets: BRIGHTNESS_PRESETS,
      initialValue: item.brightness,
      onChange: (val) => {
        updateIndividualBrightness(index, val, false);
        renderProcessedImageToCanvas(item, canvas, 450);
      }
    });

    bindCompositeFilterControl({
      rangeEl: body.querySelector('.card-contrast-input'),
      numberEl: body.querySelector('.card-contrast-num'),
      presetEl: body.querySelector('.card-contrast-preset'),
      min: -20,
      max: 60,
      presets: CONTRAST_PRESETS,
      initialValue: item.contrast,
      onChange: (val) => {
        updateIndividualContrast(index, val, false);
        renderProcessedImageToCanvas(item, canvas, 450);
      }
    });

    const inkSaverInput = body.querySelector('.card-inksaver-input');
    inkSaverInput.addEventListener('change', (e) => {
      const checked = e.target.checked;
      updateIndividualInkSaver(index, checked, false);
      updateCardBadges(item, badgesContainer);
      renderProcessedImageToCanvas(item, canvas, 450);
    });

    // 4. Botones de acción inferior
    body.querySelector('.card-crop-btn').addEventListener('click', () => openCropModal(index));
    body.querySelector('.card-rotate-btn').addEventListener('click', () => rotateImage(index));
    body.querySelector('.card-expand-btn').addEventListener('click', () => openLightboxModal(index));
    body.querySelector('.card-move-prev').addEventListener('click', () => moveImageOrder(index, -1));
    body.querySelector('.card-move-next').addEventListener('click', () => moveImageOrder(index, 1));

    card.appendChild(previewWrap);
    card.appendChild(body);
    grid.appendChild(card);
  });
}

/**
 * Abre el modal Lightbox a pantalla completa mostrando la imagen procesada en alta resolución
 * @param {number} index - Índice de la imagen a visualizar
 */
export function openLightboxModal(index) {
  const images = getImages();
  if (!images[index]) return;

  state.lightboxIndex = index;
  const modal = document.getElementById('lightboxModal');
  if (!modal) return;

  renderLightboxCurrentImage();
  modal.classList.remove('hidden');
}

/**
 * Renderiza la imagen activa dentro del modal Lightbox
 */
function renderLightboxCurrentImage() {
  const idx = state.lightboxIndex;
  const images = getImages();
  if (idx === null || !images[idx]) return;

  const item = images[idx];
  const canvas = document.getElementById('lightboxCanvas');
  const badgeEl = document.getElementById('lightboxIndexBadge');
  const titleEl = document.getElementById('lightboxTitle');
  const metaEl = document.getElementById('lightboxMeta');
  const prevBtn = document.getElementById('lightboxPrevBtn');
  const nextBtn = document.getElementById('lightboxNextBtn');

  if (canvas) {
    renderProcessedImageToCanvas(item, canvas, 1800);
  }
  if (badgeEl) badgeEl.textContent = `#${idx + 1} / ${images.length}`;
  if (titleEl) titleEl.textContent = item.name;
  if (metaEl) {
    metaEl.textContent = `Aclarar: +${item.brightness}% | Contraste: ${item.contrast > 0 ? '+' : ''}${item.contrast}% | Eco-Tinta: ${item.inkSaver ? 'Sí' : 'No'}`;
  }
  if (prevBtn) prevBtn.disabled = idx <= 0;
  if (nextBtn) nextBtn.disabled = idx >= images.length - 1;
}

/**
 * Cierra el modal Lightbox de pantalla completa
 */
export function closeLightboxModal() {
  const modal = document.getElementById('lightboxModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  state.lightboxIndex = null;
}

/**
 * Inicializa los eventos del modal Lightbox (botones anterior/siguiente, cierre y teclado)
 */
export function setupLightboxEvents() {
  if (lightboxEventsInitialized) return;

  document.getElementById('closeLightboxBtn')?.addEventListener('click', closeLightboxModal);
  document.getElementById('lightboxBackdropArea')?.addEventListener('click', (e) => {
    if (e.target.id === 'lightboxBackdropArea') {
      closeLightboxModal();
    }
  });

  document.getElementById('lightboxPrevBtn')?.addEventListener('click', () => {
    if (state.lightboxIndex !== null && state.lightboxIndex > 0) {
      state.lightboxIndex -= 1;
      renderLightboxCurrentImage();
    }
  });

  document.getElementById('lightboxNextBtn')?.addEventListener('click', () => {
    const images = getImages();
    if (state.lightboxIndex !== null && state.lightboxIndex < images.length - 1) {
      state.lightboxIndex += 1;
      renderLightboxCurrentImage();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (state.lightboxIndex === null) return;
    if (e.key === 'Escape') {
      closeLightboxModal();
    } else if (e.key === 'ArrowLeft' && state.lightboxIndex > 0) {
      state.lightboxIndex -= 1;
      renderLightboxCurrentImage();
    } else if (e.key === 'ArrowRight' && state.lightboxIndex < getImages().length - 1) {
      state.lightboxIndex += 1;
      renderLightboxCurrentImage();
    }
  });

  lightboxEventsInitialized = true;
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
