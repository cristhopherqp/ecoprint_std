/**
 * EcoPrint Studio - Gestión del Estado Central
 */

export const state = {
  images: [],
  currentView: 'gallery', // 'gallery' | 'sheets'
  editingItemIndex: null,
};

const listeners = new Set();

/**
 * Suscribe una función para recibir actualizaciones cuando cambie el estado
 * @param {Function} fn 
 * @returns {Function} Función para cancelar la suscripción
 */
export function subscribeState(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Notifica a los suscriptores de cambios en el estado
 */
export function notifyStateChange() {
  for (const fn of listeners) {
    try {
      fn(state);
    } catch (err) {
      console.error('Error en suscriptor de estado:', err);
    }
  }
}

/**
 * Obtiene la lista actual de imágenes
 */
export function getImages() {
  return state.images;
}

/**
 * Agrega una o varias imágenes al estado
 * @param {Array|Object} items 
 */
export function addImages(items) {
  const newItems = Array.isArray(items) ? items : [items];
  state.images.push(...newItems);
  notifyStateChange();
}

/**
 * Elimina una imagen por su índice
 * @param {number} index 
 */
export function removeImage(index) {
  if (index >= 0 && index < state.images.length) {
    state.images.splice(index, 1);
    notifyStateChange();
  }
}

/**
 * Elimina todas las imágenes
 */
export function clearAllImagesState() {
  state.images = [];
  notifyStateChange();
}

/**
 * Reordena una imagen moviéndola en la dirección indicada (-1 o +1)
 * @param {number} index 
 * @param {number} direction 
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
 * @param {number} index 
 * @param {Object} props 
 */
export function updateImageProps(index, props) {
  if (state.images[index]) {
    Object.assign(state.images[index], props);
    notifyStateChange();
  }
}

/**
 * Aplica ajustes globales (brillo, contraste, eco-tinta) a todas las imágenes
 * @param {Object} adjustments 
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
 * Cambia la vista actual ('gallery' | 'sheets')
 * @param {string} view 
 */
export function setCurrentView(view) {
  state.currentView = view;
  notifyStateChange();
}

/**
 * Establece el índice de la imagen en edición (recorte)
 * @param {number|null} idx 
 */
export function setEditingItemIndex(idx) {
  state.editingItemIndex = idx;
}

/**
 * Obtiene el índice de la imagen en edición
 */
export function getEditingItemIndex() {
  return state.editingItemIndex;
}
