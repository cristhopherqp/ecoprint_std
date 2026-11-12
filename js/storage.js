/**
 * EcoPrint Studio - Persistencia Local con IndexedDB
 * Almacena las imágenes procesadas y la configuración de maquetación para sobrevivir recargas (F5).
 */

const DB_NAME = 'EcoPrintStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'workspace';
const SESSION_KEY = 'current_session';

let dbInstance = null;
let saveTimeout = null;

/**
 * Abre o inicializa la base de datos IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB no soportado en este navegador.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
}

/**
 * Lee los controles actuales del DOM para persistir también la configuración de hoja y filtros
 * @returns {Object}
 */
function getControlsSnapshot() {
  return {
    layout: document.getElementById('layoutSelect')?.value || '2v',
    paperSize: document.getElementById('paperSizeSelect')?.value || 'A4',
    orientation: document.getElementById('orientationSelect')?.value || 'portrait',
    margin: document.getElementById('marginSelect')?.value || '6mm',
    fit: document.getElementById('fitSelect')?.value || 'contain',
    cutGuides: document.getElementById('cutGuidesCheck')?.checked || false,
    globalBrightness: document.getElementById('globalBrightness')?.value || '30',
    globalContrast: document.getElementById('globalContrast')?.value || '10',
    globalInkSaver: document.getElementById('globalInkSaver')?.checked ?? true,
  };
}

/**
 * Guarda de forma asíncrona (con debounce) el estado completo de imágenes y controles en IndexedDB
 * @param {Object} state - Estado central de la aplicación
 * @param {number} [delay=120] - Tiempo de espera en ms para agrupar escrituras rápidas
 */
export function scheduleSaveSession(state, delay = 120) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveSessionNow(state).catch((err) => {
      console.warn('No se pudo persistir la sesión en IndexedDB:', err);
    });
  }, delay);
}

/**
 * Ejecuta el guardado inmediato del estado en IndexedDB
 * @param {Object} state
 * @returns {Promise<void>}
 */
export async function saveSessionNow(state) {
  const db = await openDB();

  const serializedImages = state.images.map((item) => ({
    id: item.id,
    name: item.name,
    src: item.imgElement?.src || '',
    naturalWidth: item.naturalWidth,
    naturalHeight: item.naturalHeight,
    rotation: item.rotation,
    crop: { ...item.crop },
    brightness: item.brightness,
    contrast: item.contrast,
    inkSaver: Boolean(item.inkSaver),
    inkThreshold: item.inkThreshold ?? 215,
  }));

  const payload = {
    updatedAt: Date.now(),
    currentView: state.currentView || 'gallery',
    controls: getControlsSnapshot(),
    images: serializedImages,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(payload, SESSION_KEY);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Carga una imagen desde su DataURL/src almacenado
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
function hydrateImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Restaura la sesión almacenada desde IndexedDB (imágenes y configuración de controles)
 * @returns {Promise<{ images: Array<Object>, currentView: string, controls: Object } | null>}
 */
export async function restoreSessionFromDB() {
  try {
    const db = await openDB();
    const saved = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(SESSION_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e.target.error);
    });

    if (!saved) return null;

    const hydratedImages = [];
    if (Array.isArray(saved.images)) {
      for (const raw of saved.images) {
        if (!raw || !raw.src) continue;
        try {
          const imgElement = await hydrateImageElement(raw.src);
          hydratedImages.push({
            id: raw.id,
            name: raw.name,
            imgElement,
            naturalWidth: raw.naturalWidth || imgElement.naturalWidth,
            naturalHeight: raw.naturalHeight || imgElement.naturalHeight,
            rotation: raw.rotation ?? 0,
            crop: raw.crop || { x: 0, y: 0, w: 1, h: 1 },
            brightness: raw.brightness ?? 30,
            contrast: raw.contrast ?? 10,
            inkSaver: raw.inkSaver ?? true,
            inkThreshold: raw.inkThreshold ?? 215,
          });
        } catch (imgErr) {
          console.warn('Error al restaurar imagen desde IndexedDB:', raw.name, imgErr);
        }
      }
    }

    return {
      images: hydratedImages,
      currentView: saved.currentView || 'gallery',
      controls: saved.controls || null,
    };
  } catch (err) {
    console.warn('No se pudo restaurar la sesión desde IndexedDB:', err);
    return null;
  }
}

