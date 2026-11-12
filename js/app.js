/**
 * EcoPrint Studio - Orquestador Principal y Punto de Entrada
 */

import {
  state,
  subscribeState,
  hydrateState,
  getImages,
  clearAllImagesState,
  applyGlobalAdjustmentsState,
  sortImagesState,
  setAllCardsControlsOpenState,
  setCurrentView
} from './state.js';
import { restoreSessionFromDB, scheduleSaveSession } from './storage.js';
import { renderGalleryCards, setupLightboxEvents } from './gallery.js';
import {
  BRIGHTNESS_PRESETS,
  CONTRAST_PRESETS,
  bindCompositeFilterControl
} from './filter-controls.js';
import {
  renderPrintSheets,
  updatePrintStyles,
  updatePageCountEstimate,
  triggerPrint
} from './layout.js';
import { setupDropZone, setupPasteSupport } from './file-handler.js';
import {
  closeCropModal,
  resetCurrentCrop,
  confirmCrop,
  setCropAspect,
  setupCropCanvasEvents
} from './crop.js';
import { loadSampleImages } from './samples.js';
import { showToast } from './toast.js';

let globalBrightnessController = null;
let globalContrastController = null;

/**
 * Actualiza el tamaño visual de las tarjetas en #imageCardsGrid mediante variables CSS
 * Permite desde 6 imágenes por fila (mínimo ~160px) hasta 1 imagen por fila (máximo 850px / 100%)
 * @param {number|string} rawSize - Ancho mínimo de tarjeta en píxeles (160..850)
 */
export function applyGalleryCardSize(rawSize) {
  const size = Math.max(160, Math.min(850, parseInt(String(rawSize), 10) || 300));
  const isSingleRow = size >= 750;
  const previewHeight = isSingleRow
    ? 440
    : Math.min(380, Math.max(130, Math.round(size * 0.62)));

  const grid = document.getElementById('imageCardsGrid');
  if (grid) {
    grid.style.setProperty('--card-min-width', isSingleRow ? '100%' : `${size}px`);
    grid.style.setProperty('--card-preview-height', `${previewHeight}px`);
  }

  const sizeRange = document.getElementById('cardSizeRange');
  if (sizeRange && Number(sizeRange.value) !== size) {
    sizeRange.value = String(size);
  }

  const sizeSelect = document.getElementById('cardSizeSelect');
  if (sizeSelect) {
    if ([165, 300, 850].includes(size)) {
      sizeSelect.value = String(size);
    } else {
      sizeSelect.value = 'custom';
    }
  }
}

/**
 * Sincroniza el texto del botón global de plegar/desplegar ajustes de tarjetas
 */
function updateCollapseAllBtnLabel() {
  const btn = document.getElementById('toggleAllCardsCollapseBtn');
  if (!btn) return;
  const images = getImages();
  const anyOpen = images.some((img) => img.controlsOpen !== false);
  btn.textContent = anyOpen ? 'Plegar ajustes' : 'Desplegar ajustes';
}

/**
 * Actualiza la interfaz global según el estado actual
 */
export function updateUI() {
  const images = getImages();
  const count = images.length;

  const countBadge = document.getElementById('imgCountBadge');
  const dropZone = document.getElementById('dropZone');
  const instructionsBanner = document.getElementById('uploadInstructionsBanner');
  const compactToolbar = document.getElementById('compactUploadToolbar');
  const emptyMsg = document.getElementById('emptyGalleryMessage');
  const galleryContentLayout = document.getElementById('galleryContentLayout');

  if (countBadge) countBadge.textContent = count;

  // Transición del estado cuando hay al menos una imagen cargada
  if (dropZone) dropZone.classList.toggle('hidden', count > 0);
  if (instructionsBanner) instructionsBanner.classList.toggle('hidden', count === 0);
  if (compactToolbar) compactToolbar.classList.toggle('hidden', count === 0);
  if (emptyMsg) emptyMsg.classList.toggle('hidden', count > 0);
  if (galleryContentLayout) galleryContentLayout.classList.toggle('hidden', count === 0);

  updateCollapseAllBtnLabel();

  if (state.currentView === 'gallery') {
    renderGalleryCards();
  } else {
    renderPrintSheets();
  }

  updatePageCountEstimate();
}

/**
 * Alterna entre la vista de edición individual y la vista de hojas maquetadas
 * @param {'gallery'|'sheets'} view - Vista destino
 */
export function switchView(view) {
  const galleryBtn = document.getElementById('viewGalleryBtn');
  const sheetsBtn = document.getElementById('viewSheetsBtn');
  const gallerySection = document.getElementById('galleryView');
  const sheetsSection = document.getElementById('sheetsView');
  const uploadContainer = document.getElementById('uploadContainer');

  if (view === 'gallery') {
    if (galleryBtn) {
      galleryBtn.className = 'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 bg-emerald-600 text-white shadow';
      galleryBtn.setAttribute('aria-selected', 'true');
    }
    if (sheetsBtn) {
      sheetsBtn.className = 'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-slate-400 hover:text-white';
      sheetsBtn.setAttribute('aria-selected', 'false');
    }
    if (gallerySection) gallerySection.classList.remove('hidden');
    if (sheetsSection) sheetsSection.classList.add('hidden');
    if (uploadContainer) uploadContainer.classList.remove('hidden');
  } else {
    if (sheetsBtn) {
      sheetsBtn.className = 'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 bg-emerald-600 text-white shadow';
      sheetsBtn.setAttribute('aria-selected', 'true');
    }
    if (galleryBtn) {
      galleryBtn.className = 'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-slate-400 hover:text-white';
      galleryBtn.setAttribute('aria-selected', 'false');
    }
    if (sheetsSection) sheetsSection.classList.remove('hidden');
    if (gallerySection) gallerySection.classList.add('hidden');
    if (uploadContainer) uploadContainer.classList.add('hidden');
  }

  setCurrentView(view);
}

/**
 * Elimina todas las imágenes cargadas
 * @param {Event} [e] - Evento de clic opcional
 */
export function clearAllImages(e) {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  clearAllImagesState();
  showToast('Todas las imágenes fueron eliminadas.');
}

/**
 * Aplica los ajustes de la barra global a todas las imágenes en lista
 */
export function applyGlobalAdjustmentsToAll() {
  const images = getImages();
  if (images.length === 0) {
    showToast('No hay imágenes cargadas para ajustar.', true);
    return;
  }

  const b = globalBrightnessController
    ? globalBrightnessController.getValue()
    : parseInt(document.getElementById('globalBrightness')?.value || '30', 10);
  const c = globalContrastController
    ? globalContrastController.getValue()
    : parseInt(document.getElementById('globalContrast')?.value || '10', 10);
  const s = document.getElementById('globalInkSaver')?.checked ?? true;

  applyGlobalAdjustmentsState({ brightness: b, contrast: c, inkSaver: s });
  showToast(`Ajustes aplicados a las ${images.length} imágenes.`);
}

/**
 * Reacciona al cambio de configuración de maquetación (selector de rejilla, N personalizado, papel, márgenes, etc.)
 */
export function onLayoutChange() {
  updatePrintStyles();
  updatePageCountEstimate();
  if (state.currentView === 'sheets') {
    renderPrintSheets();
  }
  scheduleSaveSession(state);
}

/**
 * Restaura los valores de los controles del DOM desde una sesión guardada
 * @param {Object} controls
 */
function restoreControlsToDOM(controls) {
  if (!controls) return;
  const setSelectVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  };
  setSelectVal('layoutSelect', controls.layout);
  setSelectVal('customPerPageInput', controls.customPerPage);
  setSelectVal('paperSizeSelect', controls.paperSize);
  setSelectVal('orientationSelect', controls.orientation);
  setSelectVal('marginSelect', controls.margin);
  setSelectVal('fitSelect', controls.fit);
  setSelectVal('sortGallerySelect', controls.sortMode);

  const cutGuidesCheck = document.getElementById('cutGuidesCheck');
  if (cutGuidesCheck && controls.cutGuides !== undefined) {
    cutGuidesCheck.checked = Boolean(controls.cutGuides);
  }

  if (controls.globalBrightness !== undefined && globalBrightnessController) {
    globalBrightnessController.setValue(Number(controls.globalBrightness), false);
  }

  if (controls.globalContrast !== undefined && globalContrastController) {
    globalContrastController.setValue(Number(controls.globalContrast), false);
  }

  const globalInkSaver = document.getElementById('globalInkSaver');
  if (globalInkSaver && controls.globalInkSaver !== undefined) {
    globalInkSaver.checked = Boolean(controls.globalInkSaver);
  }

  if (controls.cardSize !== undefined) {
    applyGalleryCardSize(controls.cardSize);
  }
}

/**
 * Inicialización de todos los módulos, restauración de sesión desde IndexedDB y listeners DOM
 */
async function initApp() {
  setupDropZone();
  setupPasteSupport();
  setupCropCanvasEvents();
  setupLightboxEvents();

  // Suscribirse a cambios en el estado para reactividad automática
  subscribeState(() => {
    updateUI();
  });

  // Navegación de vistas y botones de impresión
  document.getElementById('viewGalleryBtn')?.addEventListener('click', () => switchView('gallery'));
  document.getElementById('viewSheetsBtn')?.addEventListener('click', () => switchView('sheets'));
  document.getElementById('backToGalleryBtn')?.addEventListener('click', () => switchView('gallery'));
  document.getElementById('mainPrintBtn')?.addEventListener('click', triggerPrint);
  document.getElementById('secondaryPrintBtn')?.addEventListener('click', triggerPrint);

  // Botones de zona de carga
  document.getElementById('loadSampleBtn')?.addEventListener('click', loadSampleImages);
  document.getElementById('loadSampleCompactBtn')?.addEventListener('click', loadSampleImages);
  document.getElementById('clearAllBtn')?.addEventListener('click', clearAllImages);

  // Controles de tamaño de tarjetas en la barra superior compacta
  document.getElementById('cardSizeSelect')?.addEventListener('change', (e) => {
    if (e.target.value !== 'custom') {
      applyGalleryCardSize(e.target.value);
      scheduleSaveSession(state);
    }
  });
  document.getElementById('cardSizeRange')?.addEventListener('input', (e) => {
    applyGalleryCardSize(e.target.value);
    scheduleSaveSession(state);
  });

  // Ordenamiento de la galería
  document.getElementById('sortGallerySelect')?.addEventListener('change', (e) => {
    sortImagesState(e.target.value);
    showToast('Galería reordenada.');
  });

  // Plegar / desplegar todas las tarjetas
  document.getElementById('toggleAllCardsCollapseBtn')?.addEventListener('click', () => {
    const images = getImages();
    if (images.length === 0) return;
    const anyOpen = images.some((img) => img.controlsOpen !== false);
    setAllCardsControlsOpenState(!anyOpen);
  });

  // Controles compuestos globales (Aclarar y Contraste: Slider + Número + Presets)
  globalBrightnessController = bindCompositeFilterControl({
    rangeEl: document.getElementById('globalBrightness'),
    numberEl: document.getElementById('globalBrightnessNum'),
    presetEl: document.getElementById('globalBrightnessPreset'),
    min: 0,
    max: 90,
    presets: BRIGHTNESS_PRESETS,
    initialValue: 30,
    onChange: () => {
      scheduleSaveSession(state);
    }
  });

  globalContrastController = bindCompositeFilterControl({
    rangeEl: document.getElementById('globalContrast'),
    numberEl: document.getElementById('globalContrastNum'),
    presetEl: document.getElementById('globalContrastPreset'),
    min: -20,
    max: 60,
    presets: CONTRAST_PRESETS,
    initialValue: 10,
    onChange: () => {
      scheduleSaveSession(state);
    }
  });

  document.getElementById('globalInkSaver')?.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    if (getImages().length > 0) {
      applyGlobalAdjustmentsState({ inkSaver: enabled });
      showToast(enabled ? 'Blanqueado de fondo (Eco-Tinta) activado.' : 'Blanqueado de fondo desactivado.');
    } else {
      scheduleSaveSession(state);
    }
  });
  document.getElementById('applyGlobalBtn')?.addEventListener('click', applyGlobalAdjustmentsToAll);

  // Selectores de maquetación (incluyendo cantidad personalizada por hoja)
  const layoutControlIds = [
    'layoutSelect',
    'paperSizeSelect',
    'orientationSelect',
    'marginSelect',
    'fitSelect',
    'cutGuidesCheck'
  ];
  layoutControlIds.forEach(id => {
    document.getElementById(id)?.addEventListener('change', onLayoutChange);
  });

  const customPerPageInput = document.getElementById('customPerPageInput');
  if (customPerPageInput) {
    customPerPageInput.addEventListener('input', () => {
      if (customPerPageInput.value !== '') {
        onLayoutChange();
      }
    });
    customPerPageInput.addEventListener('change', () => {
      const clamped = Math.max(1, Math.min(64, parseInt(customPerPageInput.value, 10) || 9));
      customPerPageInput.value = String(clamped);
      onLayoutChange();
    });
  }

  // Controles del modal de recorte
  document.querySelectorAll('.crop-aspect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const aspect = btn.getAttribute('data-aspect') || 'free';
      setCropAspect(aspect);
    });
  });
  document.getElementById('resetCropBtn')?.addEventListener('click', resetCurrentCrop);
  document.getElementById('cancelCropBtn')?.addEventListener('click', closeCropModal);
  document.getElementById('confirmCropBtn')?.addEventListener('click', confirmCrop);

  // Restaurar sesión persistida desde IndexedDB si existe
  const restored = await restoreSessionFromDB();
  if (restored) {
    restoreControlsToDOM(restored.controls);
    updatePrintStyles();
    hydrateState({ images: restored.images, currentView: restored.currentView });
    if (restored.currentView === 'sheets') {
      switchView('sheets');
    }
    if (restored.images.length > 0) {
      showToast(`Sesión restaurada (${restored.images.length} imagen(es)).`);
    }
  } else {
    updatePrintStyles();
    updateUI();
  }
}

// Iniciar aplicación al estar listo el DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
