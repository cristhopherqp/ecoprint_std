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
  setCurrentView
} from './state.js';
import { restoreSessionFromDB, scheduleSaveSession } from './storage.js';
import { renderGalleryCards } from './gallery.js';
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

/**
 * Actualiza la interfaz global según el estado actual
 */
export function updateUI() {
  const images = getImages();
  const count = images.length;

  const countBadge = document.getElementById('imgCountBadge');
  const dropZone = document.getElementById('dropZone');
  const compactToolbar = document.getElementById('compactUploadToolbar');
  const emptyMsg = document.getElementById('emptyGalleryMessage');
  const galleryContentLayout = document.getElementById('galleryContentLayout');

  if (countBadge) countBadge.textContent = count;

  // Transición del estado de la zona de subida (Dropzone central vs Barra superior + Panel lateral derecho)
  if (dropZone) dropZone.classList.toggle('hidden', count > 0);
  if (compactToolbar) compactToolbar.classList.toggle('hidden', count === 0);
  if (emptyMsg) emptyMsg.classList.toggle('hidden', count > 0);
  if (galleryContentLayout) galleryContentLayout.classList.toggle('hidden', count === 0);

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

  // setCurrentView dispara notifyStateChange -> updateUI y persistencia
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
 * Actualiza la etiqueta visual del brillo global
 * @param {number|string} val - Valor de brillo (0..90)
 */
export function updateGlobalBrightnessLabel(val) {
  const lbl = document.getElementById('globalBrightnessVal');
  if (lbl) lbl.textContent = `+${val}%`;
}

/**
 * Actualiza la etiqueta visual del contraste global
 * @param {number|string} val - Valor de contraste (-20..60)
 */
export function updateGlobalContrastLabel(val) {
  const lbl = document.getElementById('globalContrastVal');
  const num = parseInt(val, 10);
  if (lbl) lbl.textContent = `${num > 0 ? '+' : ''}${num}%`;
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

  const b = parseInt(document.getElementById('globalBrightness')?.value || '30', 10);
  const c = parseInt(document.getElementById('globalContrast')?.value || '10', 10);
  const s = document.getElementById('globalInkSaver')?.checked ?? true;

  applyGlobalAdjustmentsState({ brightness: b, contrast: c, inkSaver: s });
  showToast(`Ajustes aplicados a las ${images.length} imágenes.`);
}

/**
 * Reacciona al cambio de configuración de maquetación (selector de rejilla, papel, márgenes, etc.)
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
  setSelectVal('paperSizeSelect', controls.paperSize);
  setSelectVal('orientationSelect', controls.orientation);
  setSelectVal('marginSelect', controls.margin);
  setSelectVal('fitSelect', controls.fit);

  const cutGuidesCheck = document.getElementById('cutGuidesCheck');
  if (cutGuidesCheck && controls.cutGuides !== undefined) {
    cutGuidesCheck.checked = Boolean(controls.cutGuides);
  }

  const globalBrightness = document.getElementById('globalBrightness');
  if (globalBrightness && controls.globalBrightness !== undefined) {
    globalBrightness.value = controls.globalBrightness;
    updateGlobalBrightnessLabel(controls.globalBrightness);
  }

  const globalContrast = document.getElementById('globalContrast');
  if (globalContrast && controls.globalContrast !== undefined) {
    globalContrast.value = controls.globalContrast;
    updateGlobalContrastLabel(controls.globalContrast);
  }

  const globalInkSaver = document.getElementById('globalInkSaver');
  if (globalInkSaver && controls.globalInkSaver !== undefined) {
    globalInkSaver.checked = Boolean(controls.globalInkSaver);
  }
}

/**
 * Inicialización de todos los módulos, restauración de sesión desde IndexedDB y listeners DOM
 */
async function initApp() {
  setupDropZone();
  setupPasteSupport();
  setupCropCanvasEvents();

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

  // Controles globales
  document.getElementById('globalBrightness')?.addEventListener('input', (e) => {
    updateGlobalBrightnessLabel(e.target.value);
    scheduleSaveSession(state);
  });
  document.getElementById('globalContrast')?.addEventListener('input', (e) => {
    updateGlobalContrastLabel(e.target.value);
    scheduleSaveSession(state);
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

  // Selectores de maquetación
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
