/**
 * EcoPrint Studio - Sistema de Notificaciones Toast
 */

let toastTimer = null;

/**
 * Muestra un mensaje flotante temporal en la interfaz
 * @param {string} message - Texto a mostrar
 * @param {boolean} [isError=false] - Define si es un mensaje de alerta/error
 */
export function showToast(message, isError = false) {
  const toast = document.getElementById('toastMessage');
  const text = document.getElementById('toastText');
  const icon = document.getElementById('toastIcon');

  if (!toast || !text || !icon) return;

  text.textContent = message;
  icon.textContent = isError ? '⚠️' : '✓';
  icon.className = isError ? 'text-rose-400 text-sm' : 'text-emerald-400 text-sm';

  toast.classList.remove('translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3500);
}

