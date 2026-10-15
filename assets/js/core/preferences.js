/* ==========================================================================
   core/preferences.js
   Preferencias del usuario (idioma y tema), persistidas en localStorage.

   Al cambiar una preferencia:
     1. Actualiza <html lang> y <html data-theme>.
     2. Guarda en localStorage.
     3. Re-aplica las traducciones del HTML estático.
     4. Emite el evento 'hb:preferenceschange' para que cada página
        re-renderice lo que sea dinámico:
            document.addEventListener('hb:preferenceschange', (e) => {
              // e.detail = { previous, current, langChanged, themeChanged }
            });
   ========================================================================== */
(function (HB) {
  'use strict';

  const STORAGE_KEY = 'hardboard-prefs'; // Mantener igual que en theme-init.js
  const EVENT_NAME = 'hb:preferenceschange';

  /** Garantiza que solo existan valores válidos. */
  function normalize(prefs) {
    return {
      lang: prefs && prefs.lang === 'en' ? 'en' : 'es',
      theme: prefs && prefs.theme === 'dark' ? 'dark' : 'light'
    };
  }

  let current = normalize(HB.storage.read(STORAGE_KEY, {}));

  function applyToDocument() {
    const root = document.documentElement;
    root.dataset.theme = current.theme;
    root.lang = current.lang;
  }

  /** Copia de las preferencias actuales. */
  function get() {
    return Object.assign({}, current);
  }

  /** Cambia una o más preferencias: set({ lang: 'en' }) / set({ theme: 'dark' }). */
  function set(patch) {
    const previous = current;
    current = normalize(Object.assign({}, current, patch));
    if (current.lang === previous.lang && current.theme === previous.theme) return;

    applyToDocument();
    HB.storage.write(STORAGE_KEY, current);
    HB.i18n.apply();

    document.dispatchEvent(new CustomEvent(EVENT_NAME, {
      detail: {
        previous,
        current: get(),
        langChanged: previous.lang !== current.lang,
        themeChanged: previous.theme !== current.theme
      }
    }));
  }

  /** Sincroniza el documento con las preferencias guardadas (llamar al arrancar). */
  function init() {
    applyToDocument();
    HB.i18n.apply();
  }

  HB.preferences = { get, set, init, EVENT_NAME };
})(window.HB);
