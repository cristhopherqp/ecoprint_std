# EcoPrint Studio 🌱🖨️

Herramienta web profesional para optimización, recorte, ahorro de tinta y maquetación de lotes de imágenes directamente para impresión física o guardado en PDF.

---

## 📁 Arquitectura Modular del Proyecto

El código monolítico original ha sido modularizado siguiendo los principios de separación de responsabilidades (*Separation of Concerns*) y utilizando módulos estándar de JavaScript (ES Modules):

```text
ecoprint_std/
├── index.html            # Punto de entrada HTML principal
├── ecoprint_studio.html  # Alias compatible con la ruta original
├── package.json          # Configuración del proyecto y scripts de Node.js
├── server.js             # Servidor HTTP local ligero y sin dependencias externas
├── .gitignore            # Archivos ignorados por Git
├── css/
│   ├── main.css          # Estilos generales, scrollbars y simulación de hojas en pantalla
│   └── print.css         # Reglas estrictas de impresión (@media print y @page)
└── js/
    ├── app.js            # Orquestador principal, vinculación de eventos y ciclo de vida
    ├── state.js          # Store central reactivo de imágenes y vistas
    ├── processor.js      # Procesamiento de imagen pixel a pixel (brillo, contraste y eco-tinta)
    ├── crop.js           # Herramienta interactiva de recorte con canvas, guías y manijas
    ├── layout.js         # Cálculo de maquetación (1, 2, 4, 6, 8 por hoja), CSS @page e impresión
    ├── gallery.js        # Renderizado de tarjetas de edición individual y controles
    ├── file-handler.js   # Manejo de Drag & Drop, selección de archivos y pegado (Ctrl + V)
    ├── samples.js        # Generador de documentos sintéticos para pruebas rápidas
    └── toast.js          # Sistema no intrusivo de notificaciones visuales
```

---

## 🚀 Cómo Iniciar el Proyecto

Gracias a que está diseñado con **Node.js nativo sin librerías pesadas**, no requiere instalaciones adicionales:

### Opción 1: Con npm (Node)
```bash
npm start
```

### Opción 2: Directo con Node
```bash
node server.js
```

Luego abre en tu navegador:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🛠️ Módulos y Responsabilidades

| Módulo | Responsabilidad Principal |
| :--- | :--- |
| **`js/state.js`** | Mantiene la lista de imágenes, vista actual (`gallery`/`sheets`), imagen en edición y notifica a los suscriptores ante cualquier cambio. |
| **`js/processor.js`** | Aplica el algoritmo de ahorro de tinta (conversión de grises/sombras a blanco puro según umbral de luminancia percibida), contraste y rotación en Canvas. |
| **`js/crop.js`** | Maneja el modal de recorte táctil y de ratón con relaciones de aspecto fija/libre (`1:1`, `4:3`, `a4`, `free`). |
| **`js/layout.js`** | Organiza las imágenes en rejillas de 1, 2 (vertical/horizontal), 4, 6 y 8 por página sobre hojas A4 o Carta, y dispara `window.print()`. |
| **`js/gallery.js`** | Pinta la cuadrícula de tarjetas con previsualización en tiempo real, deslizadores de brillo/contraste individuales, rotación y reordenación. |
| **`js/file-handler.js`** | Permite soltar más de 20 imágenes simultáneas o pegarlas directamente desde el portapapeles (`Ctrl + V`). |
| **`js/samples.js`** | Genera 4 documentos de prueba (facturas, diagramas, notas) con fondo gris para comprobar inmediatamente el ahorro de tinta. |
| **`css/print.css`** | Garantiza la eliminación de márgenes no deseados de la interfaz web al imprimir o guardar en PDF. |

---

## 📄 Licencia
MIT

