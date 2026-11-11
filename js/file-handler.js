/**
 * EcoPrint Studio - Manejo de Archivos, Drag & Drop y Portapapeles (Paste)
 */

import { addImages, getImages } from './state.js';
import { showToast } from './toast.js';

let dropZoneInitialized = false;
let pasteSupportInitialized = false;

/**
 * Configura la zona interactiva de arrastrar y soltar
 */
export function setupDropZone() {
  if (dropZoneInitialized) return;
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleIncomingFiles(e.target.files);
      fileInput.value = ''; // Permite volver a seleccionar el mismo archivo si se desea
    }
  });

  ['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.add('border-emerald-500', 'bg-slate-800/80');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-emerald-500', 'bg-slate-800/80');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIncomingFiles(e.dataTransfer.files);
    }
  });

  dropZoneInitialized = true;
}

/**
 * Soporte directo para Ctrl+V para pegar capturas de pantalla desde el portapapeles
 */
export function setupPasteSupport() {
  if (pasteSupportInitialized) return;

  window.addEventListener('paste', (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) imageFiles.push(blob);
      }
    }
    if (imageFiles.length > 0) {
      handleIncomingFiles(imageFiles);
      showToast(`Se pegaron ${imageFiles.length} imagen(es) desde el portapapeles.`);
    }
  });

  pasteSupportInitialized = true;
}

/**
 * Procesa una lista de archivos entrantes y los carga al estado
 * @param {FileList|File[]} fileList 
 */
export async function handleIncomingFiles(fileList) {
  const globalBrightInput = document.getElementById('globalBrightness');
  const globalContInput = document.getElementById('globalContrast');
  const globalSaverInput = document.getElementById('globalInkSaver');

  const globalBright = globalBrightInput ? parseInt(globalBrightInput.value, 10) : 30;
  const globalCont = globalContInput ? parseInt(globalContInput.value, 10) : 10;
  const globalSaver = globalSaverInput ? globalSaverInput.checked : true;

  const validFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
  if (validFiles.length === 0) {
    showToast('Por favor selecciona archivos de imagen válidos (JPG, PNG, WebP).', true);
    return;
  }

  showToast(`Cargando ${validFiles.length} imagen(es)...`);

  const currentCount = getImages().length;
  const newItems = [];

  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i];
    try {
      const img = await loadImageFromFile(file);
      newItems.push({
        id: 'img_' + Math.random().toString(36).substring(2, 11),
        name: file.name || 'Captura_' + (currentCount + i + 1),
        imgElement: img,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        rotation: 0,
        crop: { x: 0, y: 0, w: 1, h: 1 },
        brightness: globalBright,
        contrast: globalCont,
        inkSaver: globalSaver,
        inkThreshold: 215,
      });
    } catch (err) {
      console.error("Error al cargar imagen:", file.name, err);
    }
  }

  if (newItems.length > 0) {
    addImages(newItems);
    showToast(`${newItems.length} imagen(es) listas.`);
  }
}

/**
 * Carga un archivo de imagen en un elemento Image mediante FileReader
 * @param {File} file 
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
