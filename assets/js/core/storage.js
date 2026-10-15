/* ==========================================================================
   core/storage.js
   Envoltorio seguro de localStorage. En modo privado o con el almacenamiento
   bloqueado el navegador lanza excepciones; aquí se absorben para que la app
   siga funcionando (simplemente sin persistencia).
   ========================================================================== */
(function (HB) {
  'use strict';

  /** Lee y parsea un valor JSON. Devuelve `fallback` si no existe o falla. */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  /** Guarda un valor como JSON. Devuelve true si se pudo guardar. */
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  HB.storage = { read, write };
})(window.HB);
