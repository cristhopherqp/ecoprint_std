# Pending & Technical Debt

*Las acciones sugeridas son solo posibles acciones estandar a tomar, no el origen exacto del problema, debes tomarlas en cuenta pero si el problema no es eso tienes que buscar el origen del problema y arreglarlo*

## Critical Fixes (Bugs)

- [x] **Fix (Impresión): Inconsistencia entre vista previa y salida de impresión**
  - **Problema:** Al ejecutar la acción desde *Hojas Maquetadas > Imprimir ahora* o desde el botón general *Imprimir / Guardar PDF*, la salida física/PDF no respeta el diseño, proporciones ni la distribución exacta de la vista previa en pantalla, se muestra una pagina con las imagenes incompletas o cortadas o solo una página en blanco.
  - **Acción sugerida:** Revisar las reglas `@media print` en CSS y el contenedor de exportación. Asegurar que las dimensiones de página (`@page`), márgenes, saltos de página (`break-inside: avoid`) y fuentes coincidan exactamente 1:1 con el canvas/DOM visualizado.
  - **Causa raíz:** (1) `#printArea` está dentro de `#sheetsView`, el cual permanecía con `class="hidden"` (`display: none`) al imprimir desde la vista Galería, generando una hoja en blanco. (2) El margen se duplicaba en `@page` y en el `padding` de `.print-sheet`, mientras que `<main>` conservaba su padding y ancho máximo en `@media print`, desbordando la altura de página. (3) Las celdas de la cuadrícula carecían de `min-h-0 min-w-0` y las hojas solo tenían `min-height`, impidiendo restringir los `<canvas>` al alto físico de la hoja.
  - **Solución aplicada:** Se forzó `display: block !important` para `#sheetsView` y reset de `html, body, main` en `@media print` (`css/print.css`), se unificó el margen en el `padding` de `.print-sheet` con `@page { margin: 0mm }`, se fijaron dimensiones exactas `width`/`height` y `aspect-ratio` (`css/main.css`), y se añadieron restricciones `min-w-0 min-h-0` y `max-w-full max-h-full` a las celdas y canvases (`js/layout.js`).

- [x] **Fix (Filtros): El botón "Blanquear fondo" no surte efecto**
  - **Problema:** Al interactuar con el botón de blanquear fondo, el canvas/imagen no procesa ninguna transformación.
  - **Acción sugerida:** Verificar el event listener del botón y la función de procesamiento en canvas (ajuste de curvas/umbral de blancos o algoritmo de sustitución de píxeles). Asegurar que aplique el nuevo `ImageData` y actualice el renderizado.
  - **Causa raíz:** (1) El checkbox `#globalInkSaver` carecía de un `event listener` para el evento `change` en `js/app.js`, y las tarjetas individuales en `js/gallery.js` tampoco tenían un control propio para activarlo/desactivarlo. (2) En `js/processor.js`, el desplazamiento lineal de brillo por defecto (`+30%` -> `+76.5` RGB) sumado al contraste saturaba a `255` cualquier fondo claro/gris ($\ge 165$) antes de evaluar `item.inkSaver`, haciendo que la imagen se viera idéntica con el filtro activado o desactivado.
  - **Solución aplicada:** Se registró el listener `change` en `#globalInkSaver` (`js/app.js`), se añadió un toggle individual de *Blanquear fondo* en cada tarjeta (`js/gallery.js`), y se rediseñó el pipeline en `js/processor.js` para evaluar la luminancia y baja saturación del fondo con interpolación suave (*smoothstep*) antes de aplicar el levantamiento adaptativo de sombras.

- [x] **Fix (Layout): Fallo en el toggle de orientación Horizontal / Vertical**
  - **Problema:** El botón de cambio de orientación no actualiza la rotación de la hoja o el contenedor.
  - **Acción sugerida:** Comprobar la lógica de alternancia de dimensiones (`width` <-> `height`). Al cambiar la orientación, recalcular la disposición de las imágenes maquetadas para que se reajusten al nuevo lienzo (`portrait` vs `landscape`).
  - **Causa raíz:** En `index.html` el selector de papel tiene `value="A4"` en mayúsculas y `js/layout.js` generaba la clase `.sheet-A4-portrait` / `.sheet-A4-landscape`, mientras que en `css/main.css` los selectores estaban en minúsculas (`.sheet-a4-portrait` / `.sheet-a4-landscape`). Al ser HTML5 sensible a mayúsculas en selectores de clase, las reglas de dimensión nunca coincidían. Además, `css/main.css` solo definía `min-height` en lugar de `height` fijo.
  - **Solución aplicada:** Se normalizó `paperSize.toLowerCase()` al construir la clase de hoja y se adaptó la distribución de columnas/filas según la orientación en `js/layout.js`, además de fijar `width`, `height` y `aspect-ratio` exactos para `.sheet-a4-*` y `.sheet-letter-*` en `css/main.css`.

- [x] **Fix (Estado): Pérdida de imágenes al refrescar la página**
  - **Problema:** Si el usuario recarga el navegador (`F5`), el array de imágenes precargadas y el estado actual se limpian por completo.
  - **Acción sugerida:** Implementar persistencia de sesión local (usar `IndexedDB` para almacenar Blobs/Base64 de forma eficiente sin el límite estricto de 5 MB de `localStorage`). Restaurar el estado y las imágenes automáticamente al montar la aplicación.
  - **Causa raíz:** El arreglo `state.images`, la vista activa (`state.currentView`) y los valores de los controles de maquetación y filtros vivían únicamente en memoria RAM de JavaScript sin ningún mecanismo de almacenamiento persistente.
  - **Solución aplicada:** Se creó el módulo `js/storage.js` con soporte `IndexedDB` (`EcoPrintStudioDB`) para persistir de forma asíncrona (con debounce) las imágenes serializadas, sus parámetros de edición y los controles del DOM, y se integró la hidratación automática al iniciar la aplicación en `js/state.js` y `js/app.js`.

- [x] **Fix (UI/UX): Transición del estado de la zona de subida (Dropzone)**
  - **Problema:** Al cargar al menos una imagen, el contenedor central *"Arrastra y suelta tus 20+ imágenes aquí, o explora tus archivos"* sigue ocupando espacio principal en pantalla.
  - **Acción sugerida:** Cuando el array de imágenes tenga longitud > 0, ocultar o colapsar el dropzone central. Mover la barra de herramientas/botones a la parte superior y alinear las instrucciones en un panel lateral derecho.
  - **Causa raíz:** `#dropZone` permanecía siempre visible en el flujo principal de `<main>` sin importar cuántas imágenes hubiera en `state.images`, ya que `updateUI()` solo alternaba `#emptyGalleryMessage`.
  - **Solución aplicada:** En `index.html`, `ecoprint_studio.html` y `js/app.js` (`updateUI`), cuando `images.length > 0` se colapsa `#dropZone`, se muestra la barra de herramientas compacta superior (`#compactUploadToolbar`) con los botones de acción rápida y se despliega el layout con el panel lateral derecho fijo (`#sideDropPanel`) para instrucciones y carga adicional.

- [x] **Fix (Drag & Drop): El navegador abre imágenes en pestañas nuevas al soltarlas fuera del recuadro**
  - **Problema:** Soltar archivos fuera del recuadro específico activa la acción por defecto del navegador (abrir archivo en nueva pestaña).
  - **Acción sugerida:**
    - Agregar `e.preventDefault()` y `e.stopPropagation()` en los eventos `dragover` y `drop` a nivel global (`window` / `document.body`).
    - Permitir que las zonas laterales vacías o los bordes de la web sigan escuchando el evento de soltado para añadir imágenes adicionales, incluso cuando la galería esté llena.
  - **Causa raíz:** Los listeners `dragenter`, `dragover`, `dragleave` y `drop` estaban registrados únicamente sobre el elemento `#dropZone` en `js/file-handler.js`, dejando el resto del `window` con el comportamiento por defecto del navegador al soltar archivos.
  - **Solución aplicada:** En `js/file-handler.js` (`setupDropZone`) se registraron los eventos `dragenter`, `dragover`, `dragleave` y `drop` a nivel global en `window` con `e.preventDefault()` y `e.stopPropagation()`, permitiendo soltar imágenes en cualquier zona libre o lateral de la ventana (incluso con la galería llena) y resaltando visualmente las zonas de carga.

## Improvements & Refactoring

- [ ] **Feature: Herramienta de recorte masivo (Batch Crop)**
  - **Requerimiento:** Implementar una acción que permita seleccionar múltiples imágenes (o "Seleccionar todas") y aplicar un recorte proporcional o predefinido uniforme (p. ej., relación de aspecto 1:1, 4:3, tamaño fijo) a todas las imágenes seleccionadas en un solo paso.

- [ ] **Feature: División de hoja mediante líneas guía interactivas (Slice / Knife Tool)**
  - **Requerimiento:** Para hojas que contienen varias capturas/imágenes agrupadas, permitir que el usuario trace líneas rectas de corte (horizontales y verticales) sobre la vista de la hoja.
  - **Flujo:** Al pulsar un botón de confirmación ("Ejecutar corte"), el sistema debe segmentar la imagen base según las coordenadas de las líneas trazadas y exportar/añadir cada sección resultante como una imagen individual e independiente en el listado.

- [ ] **Refactor: Sincronización bidireccional y presets en Controles de Imagen (Aclarar y Contraste)**
  - **Requerimiento:**
    - Reemplazar el slider simple por un control compuesto: un `<input type="range">` sincronizado bidireccionalmente con un `<input type="number">` (rango 0% a 100% o según escala). Escribir el número debe mover el slider y viceversa.
    - Añadir un selector desplegable (`<select>`) con presets configurados por pasos (p. ej. 10%, 20%, 30%, etc.) tanto para el filtro de Aclarar como para el de Contraste, aplicando el valor directamente a la imagen activa.

- [ ] **Improvement: Ordenamiento y renombramiento de imágenes en galería**
  - **Requerimiento:**
    - Agregar controles de ordenamiento: por fecha/orden de subida y por nombre de archivo (A-Z y Z-A).
    - Permitir la edición inline o modal del nombre de cada imagen cargada, actualizando la propiedad `name` interna del asset sin perder su referencia en el estado.

- [ ] Improvement: la cantidad de imagenes por hoja se pueden escoger las distribuciones predeterminadas o ingresar un número custom

- [ ] Improvement: En la función de cortar de forma individual o en grupo se debe poder ingresar numeros custom en cm, pulgadas o pixeles para el ancho y alto.

- [ ] Improvement: las opciones de edición individuales de las imagenes se deben poder desplegar o esconder y se debe agregar una opción para ver la imagen a pantalla completa.

- [ ] Improvement: Una vez se hayan cargado imagenes el panel lateral derecho de instrucciones y zona de soltado adicional -> id="sideDropPanel, el texto que contiene debe agregarse arriba de id="compactUploadTolbar", la zona de cargado es cualquiera parte libre pero dejar un espacio vacio, como un padding a cada lado de la web para que sirva solo a este proposito, un espacio de 20px a cada lado estaría más que suficiente

- [ ] Improvement: Una vez se carguen fotos, el botón loadSampleCompactBtn se oculta y entre el boton: id="addMoreFilesBtn" y id="clearAllBtn" se agregan opciones de edición como modificar el tamaño de las imagenes que se muestran dentro del id="imageCardsGrid"


## Under Observation & Edge Cases

- [ ] **Verify: Rendimiento, manejo de memoria y tiempos de carga**
  - **Puntos críticos a auditar:**
    - Carga de 20+ imágenes de alta resolución: verificar que no haya fugas de memoria (`memory leaks`) al procesar canvas. Usar `URL.revokeObjectURL()` cuando se destruyan miniaturas.
    - Renderizado en el DOM: implementar lazy loading o compresión de miniaturas para la vista previa, evitando bloquear el hilo principal de JavaScript (*main thread jank*).