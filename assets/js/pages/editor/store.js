/* ==========================================================================
   pages/editor/store.js
   Estado único del editor + persistencia automática del CV.

   Estado:
     cv        → datos del CV (se guarda en localStorage en cada cambio)
     open      → id de la sección abierta en el formulario ('personal' o id)
     view      → 'edit' | 'preview' (solo relevante en pantallas angostas)
     armBlank  → true mientras el botón "Hoja en blanco" espera confirmación

   Los cambios notifican a los suscriptores con un "tipo":
     'field'     → se escribió en un campo (solo hay que repintar la hoja)
     'structure' → cambió la estructura (repintar formulario y hoja)
     'ui'        → cambió algo de interfaz (pestaña, acordeón, confirmación)
   ========================================================================== */
(function (HB) {
  'use strict';

  const STORAGE_KEY = 'hardvard-cv-v1'; // Clave histórica: se conserva para no perder CVs guardados
  const listeners = [];

  function loadCv() {
    const saved = HB.storage.read(STORAGE_KEY, null);
    return HB.cvModel.isValidCv(saved) ? saved : HB.sampleCv(HB.preferences.get().lang);
  }

  const state = {
    cv: loadCv(),
    open: 'personal',
    view: 'edit',
    armBlank: false
  };

  function notify(kind) {
    listeners.forEach((listener) => listener(kind, state));
  }

  function persist() {
    HB.storage.write(STORAGE_KEY, state.cv);
  }

  HB.editorStore = {
    /** Estado actual (solo lectura por convención). */
    getState: () => state,

    /** Registra un callback (kind, state) => void. */
    subscribe(listener) {
      listeners.push(listener);
    },

    /**
     * Modifica el CV mediante una función que recibe el CV y lo muta.
     * @param {function(Object): void} mutator
     * @param {'field'|'structure'} [kind='structure']
     */
    mutateCv(mutator, kind) {
      mutator(state.cv);
      persist();
      notify(kind || 'structure');
    },

    /** Reemplaza el CV completo (cargar ejemplo / hoja en blanco). */
    replaceCv(cv, patch) {
      state.cv = cv;
      Object.assign(state, patch || {});
      persist();
      notify('structure');
    },

    /** Cambia estado de interfaz (open, view, armBlank). */
    setUi(patch) {
      Object.assign(state, patch);
      notify('ui');
    }
  };
})(window.HB);
