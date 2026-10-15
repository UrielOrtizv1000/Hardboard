/* ==========================================================================
   components/sheet-scaler.js
   Escala la hoja (816px de ancho fijo) para que quepa en su contenedor.

   Estructura HTML esperada:
     <div id="box">                         ← contenedor que se mide
       <div class="sheet-scaler__wrap" id="wrap">     ← recibe ancho/alto ya escalados
         <div class="sheet-scaler__inner" id="inner"> ← recibe transform: scale()
           <div class="cv-sheet" id="sheet">…</div>   ← la hoja real
         </div>
       </div>
     </div>

   Se recalcula solo cuando cambia el tamaño del contenedor o de la hoja.
   ========================================================================== */
(function (HB) {
  'use strict';

  const SHEET_WIDTH = 816;

  /**
   * @param {Object} options
   * @param {HTMLElement} options.box      Contenedor cuyo ancho limita la escala.
   * @param {HTMLElement} options.wrap     Envoltorio que se dimensiona.
   * @param {HTMLElement} options.inner    Elemento al que se aplica el scale().
   * @param {HTMLElement} options.sheet    Hoja real (se mide su alto).
   * @param {number|function} [options.padding=0]  Espacio a restar del ancho del box.
   * @param {number} [options.minScale=0.3]        Escala mínima permitida.
   * @returns {{ fit: function, destroy: function }}
   */
  function createSheetScaler(options) {
    const { box, wrap, inner, sheet } = options;
    const minScale = options.minScale == null ? 0.3 : options.minScale;

    function padding() {
      return typeof options.padding === 'function' ? options.padding() : (options.padding || 0);
    }

    function fit() {
      const available = box.clientWidth - padding();
      if (available <= 0) return; // contenedor oculto: no se puede medir

      const scale = Math.max(minScale, Math.min(1, available / SHEET_WIDTH));
      inner.style.transform = 'scale(' + scale + ')';
      wrap.style.width = Math.round(SHEET_WIDTH * scale) + 'px';
      wrap.style.height = Math.round(sheet.offsetHeight * scale) + 'px';
    }

    const observer = new ResizeObserver(fit);
    observer.observe(box);
    observer.observe(sheet);
    fit();

    return { fit, destroy: () => observer.disconnect() };
  }

  HB.createSheetScaler = createSheetScaler;
})(window.HB);
