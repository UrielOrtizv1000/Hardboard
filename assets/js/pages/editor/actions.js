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

  /** Conserva plantilla y color al reemplazar el contenido (el usuario no los "pierde"). */
  function keepLook(next) {
    const current = store.getState().cv;
    next.template = HB.cvModel.templateOf(current);
    next.vitaeColor = current.vitaeColor;
    return next;
  }

  /**
   * Foto de perfil: recorte cuadrado centrado y reducido a 400px (JPEG), para
   * que ocupe poco en localStorage y en el PDF/DOCX.
   */
  const PHOTO_SIZE = 400;

  function readPhoto(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = Math.min(PHOTO_SIZE, side);
        canvas.getContext('2d').drawImage(
          img,
          (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side,
          0, 0, canvas.width, canvas.height
        );
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Imagen no válida'));
      };
      img.src = url;
    });
  }

  /* ----- Menú de descarga ----- */

  const downloadMenu = () => document.querySelector('[data-download-menu]');
  const isDownloadMenuOpen = () => {
    const menu = downloadMenu();
    return !!menu && !menu.querySelector('.download-menu__list').hidden;
  };

  function setDownloadMenu(open) {
    const menu = downloadMenu();
    if (!menu) return;
    menu.querySelector('.download-menu__list').hidden = !open;
    menu.querySelector('.download-menu__trigger').setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  }

  // Se cierra al hacer clic fuera o con Escape
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-download-menu]')) setDownloadMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setDownloadMenu(false);
  });

  /* ----- Acciones ----- */

  const HANDLERS = {
    /* Interfaz */
    'open': (d) => store.setUi({ open: store.getState().open === d.sec ? null : d.sec }),
    'open-section': (d) => openAndReveal(d.sec, isNarrow() ? { view: 'edit' } : {}),
    'view': (d) => store.setUi({ view: d.view }),
    'font': (d) => store.mutateCv((cv) => { cv.font = d.font; }),
    'template': (d) => {
      if (HB.cvModel.TEMPLATES.indexOf(d.tpl) >= 0) store.mutateCv((cv) => { cv.template = d.tpl; });
    },
    'vitae-color': (d) => {
      if (HB.cvModel.VITAE_COLORS[d.vc]) store.mutateCv((cv) => { cv.vitaeColor = d.vc; });
    },
    'photo-pick': () => {
      const input = document.getElementById('photo-input');
      if (input) input.click();
    },
    'photo-remove': () => store.mutateCv((cv) => { cv.personal.photo = ''; }),

    // Menú "Download": se despliega hacia abajo con PDF y DOCX
    'toggle-download': () => setDownloadMenu(!isDownloadMenuOpen()),

    // Descarga directa (sin diálogo de impresión); el archivo lleva el nombre del usuario
    'download': async (d, trigger) => {
      if (trigger.disabled) return;
      trigger.disabled = true;
      trigger.classList.add('is-busy');
      setDownloadMenu(false);
      try {
        await HB.cvExport.download(d.format, store.getState().cv);
      } catch (error) {
        console.error(error);
        window.alert(HB.i18n.t('editor.exportError', currentLang()));
      } finally {
        trigger.disabled = false;
        trigger.classList.remove('is-busy');
      }
    },

    /* Contenido completo */
    'sample': () => store.replaceCv(keepLook(HB.sampleCv(currentLang())), { open: 'personal' }),

    // Doble clic de seguridad: el primero "arma", el segundo (≤3s) borra todo
    'blank': () => {
      if (store.getState().armBlank) {
        clearTimeout(blankTimer);
        store.replaceCv(keepLook(HB.cvModel.blankCv(currentLang())), { armBlank: false, open: 'personal' });
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
  function dispatch(name, dataset, trigger) {
    const handler = HANDLERS[name];
    if (!handler) return false;
    handler(dataset, trigger);
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

  /** Guarda la foto elegida en el selector de archivos. */
  async function setPhoto(file) {
    if (!file) return;
    try {
      const photo = await readPhoto(file);
      store.mutateCv((cv) => { cv.personal.photo = photo; });
    } catch (error) {
      window.alert(HB.i18n.t('editor.photoError', currentLang()));
    }
  }

  HB.editorActions = { dispatch, updateField, setPhoto };
})(window.HB);
