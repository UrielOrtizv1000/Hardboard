/* ==========================================================================
   core/namespace.js
   Crea el espacio de nombres global `HB` (Hardboard). Todos los módulos
   cuelgan de él. Se usan scripts clásicos (no ES modules) para que el sitio
   funcione abriendo los .html directamente (file://) sin servidor.

   Orden de carga: ver los <script> al final de index.html y editor.html.
   ========================================================================== */
window.HB = window.HB || {};
