/* ==========================================================================
   theme-init.js — SE CARGA EN EL <head>, ANTES DEL CSS
   Aplica tema e idioma guardados antes del primer pintado para evitar el
   "flash" de tema claro. Es un script mínimo y autónomo (no usa HB.*).

   IMPORTANTE: la clave 'hardboard-prefs' y los valores válidos deben
   mantenerse iguales a los de core/preferences.js.
   ========================================================================== */
(function () {
  try {
    var prefs = JSON.parse(localStorage.getItem('hardboard-prefs') || '{}');
    var root = document.documentElement;
    root.dataset.theme = prefs.theme === 'dark' ? 'dark' : 'light';
    root.lang = prefs.lang === 'en' ? 'en' : 'es';
  } catch (e) {
    /* localStorage no disponible: se queda con los valores por defecto del HTML */
  }
})();
