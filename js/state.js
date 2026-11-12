/**
 * EcoPrint Studio - Gestión del Estado Central
 */

import { scheduleSaveSession } from './storage.js';

export const state = {
  images: [],
  currentView: 'gallery', // 'gallery' | 'sheets'
  editingItemIndex: null,
};

const listeners = new Set();

/**
 * Suscribe una función para recibir actualizaciones cuando cambie el estado
 * @param {Function} fn - Callback ejecutado en cada cambio de estado
 * @returns {Function} Función para cancelar la suscripción
 */
export function subscribeState(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Notifica a todos los suscriptores registrados sobre cambios en el estado y agenda persistencia
 * @param {boolean} [persist=true] - Si debe persistir la sesión en IndexedDB
 */
export function notifyStateChange(persist = true) {
  for (const fn of listeners) {
    try {
      fn(state);
    } catch (err) {
      console.error('Error en suscriptor de estado:', err);
    }
  }
  if (persist) {
    scheduleSaveSession(state);
  }
}

/**
 * Hidrata el estado inicial desde el almacenamiento persistente (IndexedDB)
 * @param {{ images?: Array<Object>, currentView?: 'gallery'|'sheets' }} saved
 */
export function hydrateState(saved) {
  if (!saved) return;
  if (Array.isArray(saved.images)) {
    state.images = saved.images;
  }
  if (saved.currentView === 'gallery' || saved.currentView === 'sheets') {
    state.currentView = saved.currentView;
  }
  notifyStateChange(false);
}

/**
 * Obtiene la lista actual de imágenes
 * @returns {Array<Object>} Copia de referencia del arreglo de imágenes
 */
export function getImages() {
  return state.images;
}

/**
 * Agrega una o varias imágenes al estado central
 * @param {Array<Object>|Object} items - Imagen o arreglo de imágenes a insertar
 */
export function addImages(items) {
  const newItems = Array.isArray(items) ? items : [items];
  state.images.push(...newItems);
  notifyStateChange();
}

/**
 * Elimina una imagen por su índice
 * @param {number} index - Índice de la imagen a eliminar
 */
export function removeImage(index) {
  if (index >= 0 && index < state.images.length) {
    state.images.splice(index, 1);
    notifyStateChange();
  }
}

/**
 * Elimina todas las imágenes cargadas en el estado
 */
export function clearAllImagesState() {
  state.images = [];
  notifyStateChange();
}

/**
 * Reordena una imagen moviéndola en la dirección indicada (-1 o +1)
 * @param {number} index - Índice actual de la imagen
 * @param {number} direction - Desplazamiento (-1 hacia atrás, +1 hacia adelante)
 */
export function moveImageOrderState(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= state.images.length) return;
  const temp = state.images[index];
  state.images[index] = state.images[newIndex];
  state.images[newIndex] = temp;
  notifyStateChange();
}

/**
 * Actualiza propiedades de una imagen específica
 * @param {number} index - Índice de la imagen a modificar
 * @param {Object} props - Propiedades a actualizar
 * @param {boolean} [notify=true] - Si debe reconstruir la vista global
 */
export function updateImageProps(index, props, notify = true) {
  if (state.images[index]) {
    Object.assign(state.images[index], props);
    if (notify) {
      notifyStateChange();
    } else {
      scheduleSaveSession(state);
    }
  }
}

/**
 * Aplica ajustes globales (brillo, contraste, eco-tinta) a todas las imágenes
 * @param {{ brightness?: number, contrast?: number, inkSaver?: boolean }} adjustments
 */
export function applyGlobalAdjustmentsState({ brightness, contrast, inkSaver }) {
  state.images.forEach(img => {
    if (brightness !== undefined) img.brightness = brightness;
    if (contrast !== undefined) img.contrast = contrast;
    if (inkSaver !== undefined) img.inkSaver = inkSaver;
  });
  notifyStateChange();
}

/**
 * Cambia la vista activa ('gallery' | 'sheets')
 * @param {'gallery'|'sheets'} view
 */
export function setCurrentView(view) {
  state.currentView = view;
  notifyStateChange();
}

/**
 * Establece el índice de la imagen actualmente en edición de recorte
 * @param {number|null} idx
 */
export function setEditingItemIndex(idx) {
  state.editingItemIndex = idx;
}

/**
 * Obtiene el índice de la imagen actualmente en edición de recorte
 * @returns {number|null}
 */
export function getEditingItemIndex() {
  return state.editingItemIndex;
}
