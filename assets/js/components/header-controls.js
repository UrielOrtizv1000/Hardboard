/* ==========================================================================
   components/header-controls.js
   Conecta los controles de la cabecera presentes en todas las páginas:
     [data-action="set-lang"][data-lang="es|en"]  → cambia el idioma
     [data-action="toggle-theme"]                 → alterna claro / oscuro

   Además mantiene sincronizado el estado accesible (aria-pressed, title).
   El aspecto visual (pastilla, icono sol/luna) lo resuelve el CSS leyendo
   <html lang> y <html data-theme>.
   ========================================================================== */
(function (HB) {
  'use strict';

  /** Refleja las preferencias actuales en los botones. */
  function syncControls() {
    const { lang, theme } = HB.preferences.get();

    document.querySelectorAll('[data-action="set-lang"]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
    });

    // El botón de tema indica a qué tema cambiaría
    const label = HB.i18n.t(theme === 'dark' ? 'common.light' : 'common.dark');
    document.querySelectorAll('[data-action="toggle-theme"]').forEach((btn) => {
      btn.title = label;
      btn.setAttribute('aria-label', label);
    });
  }

  /** Dispara la animación de giro del icono de tema. */
  function spinThemeIcon(button) {
    button.classList.remove('is-spinning');
    void button.offsetWidth; // fuerza reflow para poder reiniciar la animación
    button.classList.add('is-spinning');
    button.addEventListener('animationend', () => button.classList.remove('is-spinning'), { once: true });
  }

  function handleClick(event) {
    const control = event.target.closest('[data-action="set-lang"], [data-action="toggle-theme"]');
    if (!control) return;

    if (control.dataset.action === 'set-lang') {
      HB.preferences.set({ lang: control.dataset.lang });
    } else {
      const next = HB.preferences.get().theme === 'dark' ? 'light' : 'dark';
      HB.preferences.set({ theme: next });
      spinThemeIcon(control);
    }
  }

  document.addEventListener('click', handleClick);
  document.addEventListener(HB.preferences.EVENT_NAME, syncControls);

  HB.preferences.init(); // aplica tema/idioma guardados y traduce el HTML estático
  syncControls();
})(window.HB);
