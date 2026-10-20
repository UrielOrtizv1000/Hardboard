/* ==========================================================================
   pages/editor/main.js — PUNTO DE ENTRADA DEL EDITOR
   Conecta todas las piezas:
     store.js        → estado + persistencia
     editor-view.js  → dibuja el formulario
     cv-renderer.js  → dibuja la hoja (vista previa)
     actions.js      → qué hace cada botón
   y se encarga de:
     - repintar cuando el estado cambia,
     - calcular páginas y marcas de salto,
     - escalar la hoja al ancho del panel.
   ========================================================================== */
(function (HB) {
  'use strict';

  const store = HB.editorStore;

  /* Medidas de la hoja carta (px a 96dpi) */
  const PAGE_HEIGHT = 960;   // Alto útil de una página (11in − márgenes)
  const SHEET_MARGIN_Y = 48; // Margen superior de la hoja
  const NARROW_QUERY = '(max-width: 959px)';

  /* Elementos del DOM */
  const el = {
    app: document.getElementById('app'),
    editorPanel: document.getElementById('editor-panel'),
    sections: document.getElementById('editor-sections'),
    previewPanel: document.getElementById('preview-panel'),
    sheet: document.getElementById('cv-sheet'),
    content: document.getElementById('cv-content'),
    marks: document.getElementById('cv-marks'),
    pageLabel: document.getElementById('page-label'),
    blankButton: document.querySelector('[data-action="blank"]'),
    viewTabs: document.querySelectorAll('[data-action="view"]'),
    fontChips: document.querySelectorAll('[data-action="font"]'),
    templateChips: document.querySelectorAll('[data-action="template"]'),
    vitaeColors: document.getElementById('vitae-colors'),
    swatches: document.querySelectorAll('[data-action="vitae-color"]')
  };

  const tr = (key) => HB.i18n.t('editor.' + key);

  /* ----- Vista previa ----- */

  /** Dibuja la hoja y recalcula páginas. */
  function renderPreview(state) {
    const lang = HB.preferences.get().lang;
    el.sheet.className = 'cv-sheet ' + HB.cvRenderer.fontClass(state.cv.font);
    el.content.innerHTML = HB.cvRenderer.render(state.cv, {
      lang,
      interactive: true,
      activeId: state.open
    });
    updatePagination();
  }

  /** Calcula nº de páginas, marcas de salto, altura mínima y etiqueta. */
  function updatePagination() {
    const contentHeight = el.content.offsetHeight;
    const pages = Math.max(1, Math.ceil((contentHeight - 2) / PAGE_HEIGHT));

    let marks = '';
    for (let page = 1; page < pages; page++) {
      const top = SHEET_MARGIN_Y + PAGE_HEIGHT * page;
      marks += '<div class="cv-sheet__mark" style="top:' + top + 'px">'
        + '<span class="cv-sheet__mark-label">' + HB.utils.escapeHtml(tr('page') + ' ' + (page + 1)) + '</span></div>';
    }
    el.marks.innerHTML = marks;

    el.sheet.style.minHeight = (SHEET_MARGIN_Y * 2 + PAGE_HEIGHT * pages) + 'px';
    el.pageLabel.textContent = pages === 1 ? tr('onePage') : pages + ' ' + tr('pages');
    scaler.fit();
  }

  /* ----- Elementos de interfaz que dependen del estado ----- */

  function syncChrome(state) {
    el.app.dataset.view = state.view;

    el.viewTabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.view === state.view)));
    el.fontChips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.font === (state.cv.font || 'arial'))));

    const template = HB.cvModel.templateOf(state.cv);
    el.templateChips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.tpl === template)));
    el.vitaeColors.hidden = template !== 'vitae';
    el.swatches.forEach((swatch) => swatch.setAttribute('aria-pressed', String(swatch.dataset.vc === (state.cv.vitaeColor || 'graphite'))));

    el.blankButton.textContent = state.armBlank ? tr('sure') : tr('blank');
  }

  function renderAll(state) {
    HB.editorView.render(el.sections, state);
    renderPreview(state);
    syncChrome(state);
  }

  /* ----- Escalado de la hoja ----- */

  const scaler = HB.createSheetScaler({
    box: el.previewPanel,
    wrap: document.getElementById('sheet-wrap'),
    inner: document.getElementById('sheet-inner'),
    sheet: el.sheet,
    // Espacio lateral del panel (coincide con --gutter-preview + aire)
    padding: () => (window.matchMedia(NARROW_QUERY).matches ? 32 : 80)
  });

  /* ----- Suscripciones ----- */

  store.subscribe((kind, state) => {
    if (kind === 'field') {
      renderPreview(state); // Al teclear no se toca el formulario (conserva el foco)
    } else if (kind === 'structure') {
      renderAll(state);
    } else {
      HB.editorView.render(el.sections, state);
      renderPreview(state); // Resalta la sección activa
      syncChrome(state);
    }
  });

  document.addEventListener(HB.preferences.EVENT_NAME, (event) => {
    if (event.detail.langChanged) renderAll(store.getState());
  });

  // Recalcula páginas si cambia el alto del contenido (p. ej. al cargar la fuente)
  new ResizeObserver(updatePagination).observe(el.content);

  /* ----- Eventos de usuario (delegación) ----- */

  // Escribir en cualquier campo del formulario
  el.editorPanel.addEventListener('input', (event) => {
    const field = event.target.closest('[data-field]');
    if (field) HB.editorActions.updateField(field);
  });

  // Foto de perfil (selector de archivo del formulario)
  el.editorPanel.addEventListener('change', (event) => {
    if (event.target.id === 'photo-input') {
      HB.editorActions.setPhoto(event.target.files[0]);
      event.target.value = '';
    }
  });

  // Clic en cualquier elemento con data-action
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action]');
    if (trigger) HB.editorActions.dispatch(trigger.dataset.action, trigger.dataset, trigger);
  });

  /* ----- Arranque ----- */
  renderAll(store.getState());
})(window.HB);
