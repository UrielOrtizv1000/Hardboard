/* ==========================================================================
   pages/landing.js
   Lógica de index.html:
     - Dibuja el CV de ejemplo (y lo redibuja al cambiar de idioma).
     - Escala la hoja al ancho disponible.
     - Conecta el botón de donaciones con services/donations.js.
   ========================================================================== */
(function (HB) {
  'use strict';

  const sheet = document.getElementById('example-sheet');
  const donateButton = document.querySelector('[data-action="donate"]');

  /** Dibuja el CV de ejemplo en el idioma actual. */
  function renderExample() {
    const lang = HB.preferences.get().lang;
    const cv = HB.sampleCv(lang);

    sheet.className = 'cv-sheet cv-sheet--fixed ' + HB.cvRenderer.fontClass(cv.font);
    sheet.innerHTML = HB.cvRenderer.render(cv, { lang, interactive: false });
  }

  /** Si el backend está activo, inicia el pago; si no, el enlace queda inerte. */
  function handleDonate(event) {
    if (!HB.donations.isEnabled()) return;

    event.preventDefault();
    HB.donations.start().catch((error) => console.error('[donations]', error));
  }

  renderExample();

  HB.createSheetScaler({
    box: document.getElementById('example-box'),
    wrap: document.getElementById('example-wrap'),
    inner: document.getElementById('example-inner'),
    sheet
  });

  document.addEventListener(HB.preferences.EVENT_NAME, (event) => {
    if (event.detail.langChanged) renderExample();
  });

  if (donateButton) donateButton.addEventListener('click', handleDonate);
})(window.HB);
