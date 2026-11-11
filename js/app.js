/**
 * EcoPrint Studio - Orquestador Principal y Punto de Entrada
 */

import {
  state,
  subscribeState,
  getImages,
  clearAllImagesState,
  applyGlobalAdjustmentsState,
  setCurrentView
} from './state.js';
import { renderGalleryCards } from './gallery.js';
import {
  renderPrintSheets,
  updatePrintStyles,
  updatePageCountEstimate,
  triggerPrint
} from './layout.js';
import { setupDropZone, setupPasteSupport } from './file-handler.js';
import {
  openCropModal,
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
  const clearBtn = document.getElementById('clearAllBtn');
  const emptyMsg = document.getElementById('emptyGalleryMessage');

  if (countBadge) countBadge.textContent = count;
  if (clearBtn) clearBtn.classList.toggle('hidden', count === 0);
  if (emptyMsg) emptyMsg.classList.toggle('hidden', count > 0);

  if (state.currentView === 'gallery') {
    renderGalleryCards();
  } else {
    renderPrintSheets();
  }

  updatePageCountEstimate();
}

/**
 * Alterna entre la vista de edición individual y la vista de hojas maquetadas
 * @param {'gallery'|'sheets'} view 
 */
export function switchView(view) {
  setCurrentView(view);

  const galleryBtn = document.getElementById('viewGalleryBtn');
  const sheetsBtn = document.getElementById('viewSheetsBtn');
  const gallerySection = document.getElementById('galleryView');
  const sheetsSection = document.getElementById('sheetsView');
  const uploadContainer = document.getElementById('uploadContainer');

  if (view === 'gallery') {
    if (galleryBtn) galleryBtn.className = "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 bg-emerald-600 text-white shadow";
    if (sheetsBtn) sheetsBtn.className = "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-slate-400 hover:text-white";
    if (gallerySection) gallerySection.classList.remove('hidden');
    if (sheetsSection) sheetsSection.classList.add('hidden');
    if (uploadContainer) uploadContainer.classList.remove('hidden');
    renderGalleryCards();
  } else {
    if (sheetsBtn) sheetsBtn.className = "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 bg-emerald-600 text-white shadow";
    if (galleryBtn) galleryBtn.className = "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-slate-400 hover:text-white";
    if (sheetsSection) sheetsSection.classList.remove('hidden');
    if (gallerySection) gallerySection.classList.add('hidden');
    if (uploadContainer) uploadContainer.classList.add('hidden');
    renderPrintSheets();
  }
}

/**
 * Elimina todas las imágenes cargadas previa confirmación/acción
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
 * @param {number|string} val 
 */
export function updateGlobalBrightnessLabel(val) {
  const lbl = document.getElementById('globalBrightnessVal');
  if (lbl) lbl.textContent = `+${val}%`;
}

/**
 * Actualiza la etiqueta visual del contraste global
 * @param {number|string} val 
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
}

/**
 * Inicialización de todos los módulos y listeners DOM
 */
function initApp() {
  setupDropZone();
  setupPasteSupport();
  setupCropCanvasEvents();
  updatePrintStyles();

  // Suscribirse a cambios en el estado para reactividad automática
  subscribeState(() => {
    updateUI();
  });

  // Vincular eventos de la barra de controles globales
  const globalBrightness = document.getElementById('globalBrightness');
  if (globalBrightness) {
    globalBrightness.addEventListener('input', (e) => updateGlobalBrightnessLabel(e.target.value));
  }

  const globalContrast = document.getElementById('globalContrast');
  if (globalContrast) {
    globalContrast.addEventListener('input', (e) => updateGlobalContrastLabel(e.target.value));
  }

  const applyGlobalBtn = document.getElementById('applyGlobalBtn');
  if (applyGlobalBtn) {
    applyGlobalBtn.addEventListener('click', applyGlobalAdjustmentsToAll);
  }

  // Vincular selectores de maquetación
  const layoutSelect = document.getElementById('layoutSelect');
  const paperSizeSelect = document.getElementById('paperSizeSelect');
  const orientationSelect = document.getElementById('orientationSelect');
  const marginSelect = document.getElementById('marginSelect');
  const fitSelect = document.getElementById('fitSelect');
  const cutGuidesCheck = document.getElementById('cutGuidesCheck');

  [layoutSelect, paperSizeSelect, orientationSelect, marginSelect, fitSelect, cutGuidesCheck].forEach(elem => {
    if (elem) {
      elem.addEventListener('change', onLayoutChange);
    }
  });

  // Render inicial de UI
  updateUI();
}

// Compatibilidad con eventos inline HTML y consola del desarrollador
window.switchView = switchView;
window.triggerPrint = triggerPrint;
window.clearAllImages = clearAllImages;
window.loadSampleImages = loadSampleImages;
window.applyGlobalAdjustmentsToAll = applyGlobalAdjustmentsToAll;
window.updateGlobalBrightnessLabel = updateGlobalBrightnessLabel;
window.updateGlobalContrastLabel = updateGlobalContrastLabel;
window.onLayoutChange = onLayoutChange;
window.openCropModal = openCropModal;
window.closeCropModal = closeCropModal;
window.resetCurrentCrop = resetCurrentCrop;
window.confirmCrop = confirmCrop;
window.setCropAspect = setCropAspect;

// Iniciar aplicación
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
