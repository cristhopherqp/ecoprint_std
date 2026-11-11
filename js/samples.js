/**
 * EcoPrint Studio - Generador de Documentos Sintéticos de Prueba
 */

import { addImages } from './state.js';
import { showToast } from './toast.js';

/**
 * Carga 4 documentos de prueba con fondos oscuros/grises para evaluar el ahorro de tinta
 * @param {Event} [e] 
 */
export function loadSampleImages(e) {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  showToast('Generando 4 documentos de prueba...');

  const sampleConfigs = [
    {
      title: "Factura Escaneada con Fondo Gris",
      bg: "#d8dce2",
      text: "FACTURA ELECTRÓNICA N° 001-9842\nTotal a Pagar: $1,420.50\nEstado: PAGADO\nDetalle de Items con tinta económica.",
      color: "#1e293b"
    },
    {
      title: "Diagrama de Arquitectura de Red",
      bg: "#cbd5e1",
      text: "DIAGRAMA DE RED Y SERVIDORES\n[Router] ---> [Switch Core] ---> [Servidor 01]\nSegmento A: 192.168.1.0/24\nSegmento B: 10.0.0.0/8",
      color: "#0f172a"
    },
    {
      title: "Texto Copiado con Sombras",
      bg: "#e2e8f0",
      text: "APUNTES DE ESTUDIO - FÍSICA\nE = m · c²\nFuerza = Masa x Aceleración\nEste fondo gris consumía tinta innecesaria.",
      color: "#111827"
    },
    {
      title: "Gráfico Estadístico Mensual",
      bg: "#d1d5db",
      text: "REPORTE TRIMESTRAL\nEnero: +15%  |  Febrero: +28%\nMarzo: +45%  |  Abril: +60%\nImpresión optimizada en modo blanco puro.",
      color: "#1e1e1e"
    }
  ];

  const promises = sampleConfigs.map((cfg, idx) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 850;
      const ctx = canvas.getContext('2d');

      // Fondo grisáceo que típicamente gasta mucha tinta
      ctx.fillStyle = cfg.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Marco decorativo
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 6;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      // Encabezado
      ctx.fillStyle = cfg.color;
      ctx.font = "bold 38px Inter, sans-serif";
      ctx.fillText(cfg.title, 60, 90);

      // Línea divisoria
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(60, 120);
      ctx.lineTo(1140, 120);
      ctx.stroke();

      // Contenido de texto
      ctx.font = "28px monospace";
      const lines = cfg.text.split('\n');
      lines.forEach((line, lIdx) => {
        ctx.fillText(line, 60, 190 + (lIdx * 50));
      });

      // Gráficos de barras simulados
      ctx.fillStyle = "#334155";
      ctx.fillRect(60, 480, 200, 260);
      ctx.fillStyle = "#475569";
      ctx.fillRect(300, 410, 200, 330);
      ctx.fillStyle = "#64748b";
      ctx.fillRect(540, 320, 200, 420);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(780, 240, 200, 500);

      const img = new Image();
      img.onload = () => {
        resolve({
          id: 'sample_' + idx + '_' + Date.now(),
          name: cfg.title,
          imgElement: img,
          naturalWidth: canvas.width,
          naturalHeight: canvas.height,
          rotation: 0,
          crop: { x: 0, y: 0, w: 1, h: 1 },
          brightness: 30,
          contrast: 10,
          inkSaver: true,
          inkThreshold: 215,
        });
      };
      img.src = canvas.toDataURL('image/jpeg', 0.9);
    });
  });

  Promise.all(promises).then((loadedSamples) => {
    addImages(loadedSamples);
    showToast('4 documentos de prueba cargados.');
  });
}
