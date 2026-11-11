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

  // setCurrentView dispara notifyStateChange -> updateUI
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
}

/**
 * Inicialización de todos los módulos y listeners DOM sin atributos inline
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

  // Navegación de vistas y botones de impresión
  document.getElementById('viewGalleryBtn')?.addEventListener('click', () => switchView('gallery'));
  document.getElementById('viewSheetsBtn')?.addEventListener('click', () => switchView('sheets'));
  document.getElementById('backToGalleryBtn')?.addEventListener('click', () => switchView('gallery'));
  document.getElementById('mainPrintBtn')?.addEventListener('click', triggerPrint);
  document.getElementById('secondaryPrintBtn')?.addEventListener('click', triggerPrint);

  // Botones de zona de carga
  document.getElementById('loadSampleBtn')?.addEventListener('click', loadSampleImages);
  document.getElementById('clearAllBtn')?.addEventListener('click', clearAllImages);

  // Controles globales
  document.getElementById('globalBrightness')?.addEventListener('input', (e) => {
    updateGlobalBrightnessLabel(e.target.value);
  });
  document.getElementById('globalContrast')?.addEventListener('input', (e) => {
    updateGlobalContrastLabel(e.target.value);
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

  // Render inicial de UI
  updateUI();
}

// Iniciar aplicación al estar listo el DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
