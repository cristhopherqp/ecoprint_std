/**
 * EcoPrint Studio - Controles Compuestos de Filtros (Slider + Input Numérico + Presets)
 */

export const BRIGHTNESS_PRESETS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
export const CONTRAST_PRESETS = [-20, -10, 0, 10, 20, 30, 40, 50, 60];

/**
 * Restringe un número dentro del rango [min, max]
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clampFilterValue(val, min, max) {
  const num = Number.isFinite(val) ? Math.round(val) : 0;
  return Math.max(min, Math.min(max, num));
}

/**
 * Genera el HTML de opciones (<option>) para un selector de presets por pasos
 * @param {number[]} presets - Lista de valores predefinidos
 * @param {number} currentValue - Valor actual seleccionado
 * @param {boolean} [showPlusSign=true] - Si debe anteponer '+' a valores positivos
 * @param {boolean} [compact=false] - Si debe mostrar solo el porcentaje sin la palabra "Preset"
 * @returns {string}
 */
export function buildPresetOptionsHTML(presets, currentValue, showPlusSign = true, compact = false) {
  const isPresetMatch = presets.includes(Number(currentValue));
  const customLabel = compact ? '—' : 'Personalizado';
  let html = `<option value="custom" ${!isPresetMatch ? 'selected' : ''} hidden>${customLabel}</option>`;

  for (const step of presets) {
    const prefix = showPlusSign && step > 0 ? '+' : '';
    const selected = Number(currentValue) === step ? 'selected' : '';
    const label = compact ? `${prefix}${step}%` : `Preset ${prefix}${step}%`;
    html += `<option value="${step}" ${selected}>${label}</option>`;
  }
  return html;
}

/**
 * Enlaza bidireccionalmente un <input type="range">, un <input type="number"> y un <select> de presets.
 * Dispara el callback onChange una sola vez por cambio validado.
 *
 * @param {Object} config
 * @param {HTMLInputElement|null} config.rangeEl - Slider de rango
 * @param {HTMLInputElement|null} config.numberEl - Campo numérico
 * @param {HTMLSelectElement|null} config.presetEl - Desplegable de presets
 * @param {number} config.min - Valor mínimo permitido
 * @param {number} config.max - Valor máximo permitido
 * @param {number[]} config.presets - Valores de pasos predefinidos
 * @param {number} [config.initialValue=0] - Valor inicial
 * @param {(val: number) => void} [config.onChange] - Callback al cambiar el valor
 * @returns {{ setValue: (val: number, emit?: boolean) => void, getValue: () => number }}
 */
export function bindCompositeFilterControl({
  rangeEl,
  numberEl,
  presetEl,
  min,
  max,
  presets = [],
  initialValue = 0,
  onChange
}) {
  let currentVal = clampFilterValue(Number(initialValue), min, max);

  const syncDOM = (val) => {
    if (rangeEl && Number(rangeEl.value) !== val) {
      rangeEl.value = String(val);
    }
    if (numberEl && Number(numberEl.value) !== val) {
      numberEl.value = String(val);
    }
    if (presetEl) {
      if (presets.includes(val)) {
        presetEl.value = String(val);
      } else {
        presetEl.value = 'custom';
      }
    }
  };

  const applyValue = (rawVal, emit = true) => {
    const parsed = parseInt(String(rawVal), 10);
    if (Number.isNaN(parsed)) return;
    const clamped = clampFilterValue(parsed, min, max);
    currentVal = clamped;
    syncDOM(clamped);
    if (emit && typeof onChange === 'function') {
      onChange(clamped);
    }
  };

  // Inicializar estado visual
  syncDOM(currentVal);

  if (rangeEl) {
    rangeEl.addEventListener('input', (e) => {
      applyValue(e.target.value, true);
    });
  }

  if (numberEl) {
    numberEl.addEventListener('input', (e) => {
      if (e.target.value === '' || e.target.value === '-') return;
      applyValue(e.target.value, true);
    });
    numberEl.addEventListener('change', (e) => {
      if (e.target.value === '' || e.target.value === '-') {
        syncDOM(currentVal);
        return;
      }
      applyValue(e.target.value, true);
    });
    numberEl.addEventListener('blur', () => {
      syncDOM(currentVal);
    });
  }

  if (presetEl) {
    presetEl.addEventListener('change', (e) => {
      if (e.target.value === 'custom') return;
      applyValue(e.target.value, true);
    });
  }

  return {
    setValue: (val, emit = false) => applyValue(val, emit),
    getValue: () => currentVal
  };
}

