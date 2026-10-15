/* ==========================================================================
   pages/editor/actions.js
   Acciones del editor. Cada botón del HTML declara qué hace con
   data-action="nombre" y, si hace falta, data-sec / data-entry / etc.
   Aquí cada acción es una función registrada en HANDLERS.

   Agregar una acción nueva = añadir una entrada en HANDLERS + el botón.
   ========================================================================== */
(function (HB) {
  'use strict';

  const store = HB.editorStore;
  const BLANK_CONFIRM_MS = 3000;
  const NARROW_QUERY = '(max-width: 959px)'; // Debe coincidir con el breakpoint de editor.css

  let blankTimer = null;

  /* ----- Ayudantes ----- */

  const isNarrow = () => window.matchMedia(NARROW_QUERY).matches;
  const currentLang = () => HB.preferences.get().lang;

  function swap(list, a, b) {
    const tmp = list[a];
    list[a] = list[b];
    list[b] = tmp;
  }

  /** Ejecuta `fn(sections, index, section)` sobre la sección indicada en `d.sec`. */
  function withSection(d, fn) {
    store.mutateCv((cv) => {
      const index = cv.sections.findIndex((s) => s.id === d.sec);
      if (index >= 0) fn(cv.sections, index, cv.sections[index]);
    });
  }

  /** Ejecuta `fn(list, index)` sobre el elemento `d.entry` de la sección `d.sec`. */
  function withEntry(d, fn) {
    withSection(d, (sections, i, section) => {
      const list = HB.cvModel.items(section);
      const index = list.findIndex((item) => item.id === d.entry);
      if (index >= 0) fn(list, index);
    });
  }

  /** Abre una sección y baja el formulario hasta ella. */
  function openAndReveal(id, extraUi) {
    store.setUi(Object.assign({ open: id }, extraUi));
    HB.editorView.scrollToSection(document.getElementById('editor-panel'), id);
  }

  /* ----- Acciones ----- */

  const HANDLERS = {
    /* Interfaz */
    'open': (d) => store.setUi({ open: store.getState().open === d.sec ? null : d.sec }),
    'open-section': (d) => openAndReveal(d.sec, isNarrow() ? { view: 'edit' } : {}),
    'view': (d) => store.setUi({ view: d.view }),
    'font': (d) => store.mutateCv((cv) => { cv.font = d.font; }),

    'print': () => {
      const previousTitle = document.title;
      const name = (store.getState().cv.personal.name || '').trim();
      document.title = name ? 'CV - ' + name : 'CV'; // Nombre sugerido del PDF
      setTimeout(() => {
        window.print();
        document.title = previousTitle;
      }, 50);
    },

    /* Contenido completo */
    'sample': () => store.replaceCv(HB.sampleCv(currentLang()), { open: 'personal' }),

    // Doble clic de seguridad: el primero "arma", el segundo (≤3s) borra todo
    'blank': () => {
      if (store.getState().armBlank) {
        clearTimeout(blankTimer);
        store.replaceCv(HB.cvModel.blankCv(currentLang()), { armBlank: false, open: 'personal' });
        return;
      }
      store.setUi({ armBlank: true });
      blankTimer = setTimeout(() => store.setUi({ armBlank: false }), BLANK_CONFIRM_MS);
    },

    /* Contactos */
    'contact-add': () => store.mutateCv((cv) => {
      cv.personal.contacts.push({ id: HB.utils.uid(), text: '', url: '' });
    }),
    'contact-remove': (d) => store.mutateCv((cv) => {
      cv.personal.contacts = cv.personal.contacts.filter((c) => c.id !== d.entry);
    }),

    /* Secciones */
    'add-section': (d) => {
      const section = HB.cvModel.newSection(d.type, currentLang());
      store.mutateCv((cv) => { cv.sections.push(section); });
      openAndReveal(section.id);
    },
    // El índice 0 es el perfil (fijo): ninguna sección puede subir por encima
    'sec-up': (d) => withSection(d, (list, i) => { if (i > 1) swap(list, i, i - 1); }),
    'sec-down': (d) => withSection(d, (list, i) => { if (i < list.length - 1) swap(list, i, i + 1); }),
    'sec-hide': (d) => withSection(d, (list, i, section) => { section.hidden = !section.hidden; }),
    'sec-remove': (d) => withSection(d, (list, i, section) => { if (!section.required) list.splice(i, 1); }),

    /* Elementos dentro de una sección */
    'entry-add': (d) => withSection(d, (list, i, section) => {
      const key = HB.cvModel.listKey(section);
      section[key] = section[key] || [];
      section[key].push(HB.cvModel.blankItem(section.type));
    }),
    'entry-up': (d) => withEntry(d, (list, i) => { if (i > 0) swap(list, i, i - 1); }),
    'entry-down': (d) => withEntry(d, (list, i) => { if (i < list.length - 1) swap(list, i, i + 1); }),
    'entry-remove': (d) => withEntry(d, (list, i) => { list.splice(i, 1); })
  };

  /** Ejecuta la acción por nombre. Devuelve true si el editor la conocía. */
  function dispatch(name, dataset) {
    const handler = HANDLERS[name];
    if (!handler) return false;
    handler(dataset);
    return true;
  }

  /**
   * Edición de campos: cada <input>/<textarea> lleva data-sec, data-field y,
   * si pertenece a un elemento de lista, data-entry.
   */
  function updateField(target) {
    const { sec, entry, field } = target.dataset;
    const value = target.value;

    store.mutateCv((cv) => {
      if (sec === 'personal') {
        cv.personal[field] = value;
        return;
      }
      if (sec === 'contacts') {
        const contact = cv.personal.contacts.find((c) => c.id === entry);
        if (contact) contact[field] = value;
        return;
      }
      const section = cv.sections.find((s) => s.id === sec);
      if (!section) return;
      const owner = entry ? HB.cvModel.items(section).find((item) => item.id === entry) : section;
      if (owner) owner[field] = value;
    }, 'field');
  }

  HB.editorActions = { dispatch, updateField };
})(window.HB);
