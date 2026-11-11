/**
 * EcoPrint Studio - Maquetación de Hojas y Preparación para Impresión
 */

import { getImages } from './state.js';
import { renderProcessedImageToCanvas } from './processor.js';
import { showToast } from './toast.js';

/**
 * Calcula columnas, filas y cantidad por página según el diseño seleccionado
 * @returns {{ cols: number, rows: number, perPage: number }}
 */
export function getGridSpecs() {
  const layout = document.getElementById('layoutSelect')?.value || '2v';
  let cols = 1;
  let rows = 1;
  let perPage = 1;

  switch (layout) {
    case '1':
      cols = 1; rows = 1; perPage = 1; break;
    case '2v':
      cols = 1; rows = 2; perPage = 2; break;
    case '2h':
      cols = 2; rows = 1; perPage = 2; break;
    case '4':
      cols = 2; rows = 2; perPage = 4; break;
    case '6':
      cols = 2; rows = 3; perPage = 6; break;
    case '8':
      cols = 2; rows = 4; perPage = 8; break;
    default:
      cols = 1; rows = 2; perPage = 2; break;
  }
  return { cols, rows, perPage };
}

/**
 * Inyecta dinámicamente la regla CSS @page según tamaño de papel, orientación y margen
 */
export function updatePrintStyles() {
  const paperSelect = document.getElementById('paperSizeSelect');
  const orientSelect = document.getElementById('orientationSelect');
  const marginSelect = document.getElementById('marginSelect');

  const paperSize = paperSelect ? paperSelect.value : 'A4';
  const orientation = orientSelect ? orientSelect.value : 'portrait';
  const margin = marginSelect ? marginSelect.value : '6mm';

  let styleTag = document.getElementById('dynamicPageRule');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'dynamicPageRule';
    document.head.appendChild(styleTag);
  }
  styleTag.innerHTML = `
    @page {
      size: ${paperSize} ${orientation};
      margin: ${margin};
    }
  `;
}

/**
 * Actualiza el contador de hojas estimadas en la interfaz
 */
export function updatePageCountEstimate() {
  const images = getImages();
  const { perPage } = getGridSpecs();
  const totalPages = Math.ceil(images.length / perPage) || 0;
  const badge = document.getElementById('pageCountBadge');
  if (badge) {
    badge.textContent = totalPages;
  }
}

/**
 * Renderiza las hojas físicas completas con imágenes en alta resolución en el área de impresión
 */
export function renderPrintSheets() {
  const printArea = document.getElementById('printArea');
  if (!printArea) return;
  printArea.innerHTML = '';

  const images = getImages();

  if (images.length === 0) {
    printArea.innerHTML = `
      <div class="text-center py-20 text-slate-500">
        <p class="text-base font-medium">No hay imágenes para maquetar</p>
        <p class="text-xs text-slate-600 mt-1">Carga imágenes en la pestaña "Galería & Edición"</p>
      </div>
    `;
    return;
  }

  const { cols, rows, perPage } = getGridSpecs();
  const paperSize = document.getElementById('paperSizeSelect')?.value || 'A4';
  const orientation = document.getElementById('orientationSelect')?.value || 'portrait';
  const margin = document.getElementById('marginSelect')?.value || '6mm';
  const fitMode = document.getElementById('fitSelect')?.value || 'contain';
  const cutGuides = document.getElementById('cutGuidesCheck')?.checked || false;

  const totalPages = Math.ceil(images.length / perPage);
  const sheetCssClass = `sheet-${paperSize}-${orientation}`;

  for (let p = 0; p < totalPages; p++) {
    const sheet = document.createElement('div');
    sheet.className = `print-sheet ${sheetCssClass} bg-white text-black shadow-2xl relative flex flex-col justify-between overflow-hidden`;
    sheet.style.padding = margin;

    // Badge visual del número de hoja en pantalla (se oculta automáticamente en papel)
    const badge = document.createElement('div');
    badge.className = "page-badge absolute -top-7 left-0 text-slate-400 text-xs font-mono font-medium flex items-center gap-1.5";
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> Hoja ${p + 1} de ${totalPages}`;
    sheet.appendChild(badge);

    // Cuadrícula interior de la hoja
    const grid = document.createElement('div');
    grid.className = "w-full h-full flex-1 grid gap-2";
    grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    grid.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;

    const startIdx = p * perPage;
    const endIdx = Math.min(startIdx + perPage, images.length);

    for (let i = startIdx; i < endIdx; i++) {
      const item = images[i];

      const slot = document.createElement('div');
      slot.className = `w-full h-full relative flex items-center justify-center overflow-hidden ${
        cutGuides ? 'border border-dashed border-slate-300' : ''
      }`;

      const canvas = document.createElement('canvas');
      canvas.className = `w-full h-full ${
        fitMode === 'contain' ? 'object-contain' : 'object-cover'
      }`;

      // Renderizado de máxima fidelidad (hasta 1800px para nitidez en papel)
      renderProcessedImageToCanvas(item, canvas, 1800);
      slot.appendChild(canvas);
      grid.appendChild(slot);
    }

    // Rellenar celdas vacías en la última página incompleta si se solicitaron líneas guía
    const emptySlotsCount = perPage - (endIdx - startIdx);
    for (let k = 0; k < emptySlotsCount; k++) {
      const emptySlot = document.createElement('div');
      if (cutGuides) {
        emptySlot.className = "border border-dashed border-slate-200";
      }
      grid.appendChild(emptySlot);
    }

    sheet.appendChild(grid);
    printArea.appendChild(sheet);
  }
}

/**
 * Disparador para abrir el cuadro de diálogo de impresión del navegador / exportación a PDF
 */
export function triggerPrint() {
  const images = getImages();
  if (images.length === 0) {
    showToast('Carga al menos una imagen antes de imprimir.', true);
    return;
  }

  // Asegura que las hojas estén calculadas y actualizadas
  renderPrintSheets();

  showToast('Preparando hojas para impresión...');

  // Espera breve para dar tiempo al motor gráfico de volcar los canvases en memoria
  setTimeout(() => {
    window.print();
  }, 300);
}
