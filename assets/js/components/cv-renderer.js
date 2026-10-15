/* ==========================================================================
   components/cv-renderer.js
   Convierte el modelo de datos del CV en el HTML de la hoja.
   Lo usan la landing (ejemplo) y el editor (vista previa), por lo que el
   resultado visual es idéntico en ambos.

   Uso:
     sheetEl.className = 'cv-sheet ' + HB.cvRenderer.fontClass(cv.font);
     contentEl.innerHTML = HB.cvRenderer.render(cv, {
       lang: 'es',          // idioma de los textos guía
       interactive: true,   // true → las secciones son clicables (editor)
       activeId: 'profile'  // sección resaltada (solo si interactive)
     });

   Todo texto del usuario pasa por escapeHtml() antes de insertarse.
   ========================================================================== */
(function (HB) {
  'use strict';

  const { escapeHtml: esc, hasText, splitLines, toHref } = HB.utils;

  const FONT_CLASSES = { arial: '', times: 'cv-sheet--times', georgia: 'cv-sheet--georgia' };

  /** Clase CSS de la hoja según la tipografía elegida. */
  function fontClass(font) {
    return FONT_CLASSES[font] || '';
  }

  /* ----- Piezas reutilizables ----- */

  /** Lista con viñetas a partir de un arreglo de textos. */
  function bulletList(lines) {
    if (!lines.length) return '';
    return '<ul>' + lines.map((line) => '<li>' + esc(line) + '</li>').join('') + '</ul>';
  }

  /** Fila "contenido a la izquierda · fecha a la derecha". */
  function row(leftHtml, date) {
    const dateHtml = hasText(date) ? '<div class="cv-row__date">' + esc(date) + '</div>' : '';
    return '<div class="cv-row"><div>' + leftHtml + '</div>' + dateHtml + '</div>';
  }

  /** "<b>Principal</b> — secundario" cuando existe el secundario. */
  function titleWithDetail(main, detailHtml) {
    const dash = detailHtml ? '<span class="cv-dash">—</span>' + detailHtml : '';
    return '<b>' + esc(main) + '</b>' + dash;
  }

  /**
   * Envuelve un bloque (cabecera o sección). En modo interactivo agrega los
   * atributos que el editor usa para abrir esa sección al hacer clic.
   */
  function block(id, innerHtml, ctx, extraClass) {
    const classes = ['cv-block', extraClass];
    let attrs = '';

    if (ctx.interactive) {
      classes.push('cv-block--clickable');
      if (ctx.activeId === id) classes.push('is-active');
      attrs = ' data-action="open-section" data-sec="' + esc(id) + '"';
    }
    return '<div class="' + classes.filter(Boolean).join(' ') + '"' + attrs + '>' + innerHtml + '</div>';
  }

  /* ----- Cabecera (nombre, contactos, titulares) ----- */

  function renderContacts(contacts) {
    const visible = contacts.filter((c) => hasText(c.text));
    if (!visible.length) return '';

    const parts = visible.map((c, i) => {
      const separator = i > 0 ? '<span class="cv-sep">|</span>' : '';
      const href = toHref(c.url);
      const label = href
        ? '<a class="cv-link" href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(c.text) + '</a>'
        : '<span>' + esc(c.text) + '</span>';
      return separator + label;
    });
    return '<div class="cv-contacts">' + parts.join('') + '</div>';
  }

  function renderHeader(personal, ctx) {
    const name = hasText(personal.name)
      ? '<div class="cv-name">' + esc(personal.name) + '</div>'
      : '<div class="cv-name cv-placeholder" data-noprint>' + esc(ctx.tr('yourName')) + '</div>';

    const tagline = hasText(personal.tagline)
      ? '<div class="cv-tagline">' + esc(personal.tagline) + '</div>'
      : '';

    return block('personal', name + renderContacts(personal.contacts || []) + tagline, ctx);
  }

  /* ----- Cuerpo de cada tipo de sección ----- */

  const BODY_RENDERERS = {
    profile(section, ctx) {
      return hasText(section.text)
        ? '<div class="cv-text">' + esc(section.text) + '</div>'
        : '<div class="cv-placeholder" data-noprint>' + esc(ctx.tr('writeSummary')) + '</div>';
    },

    education(section) {
      const entries = (section.entries || []).map((e) => {
        const detail = hasText(e.detail) ? '<span>' + esc(e.detail) + '</span>' : '';
        const desc = hasText(e.desc) ? '<div class="cv-desc">' + esc(e.desc) + '</div>' : '';
        return '<div class="cv-entry">' + row(titleWithDetail(e.org, detail), e.date) + desc + '</div>';
      });
      return '<div class="cv-entries">' + entries.join('') + '</div>';
    },

    experience(section) {
      const entries = (section.entries || []).map((e) => {
        const role = hasText(e.role) ? '<i>' + esc(e.role) + '</i>' : '';
        return '<div class="cv-entry">' + row(titleWithDetail(e.org, role), e.date) + bulletList(splitLines(e.bullets)) + '</div>';
      });
      return '<div class="cv-entries">' + entries.join('') + '</div>';
    },

    projects(section) {
      const entries = (section.entries || []).map((e) => {
        const subtitle = hasText(e.subtitle) ? '<i>' + esc(e.subtitle) + '</i>' : '';
        const link = hasText(e.link) ? '<div>' + esc(e.link) + '</div>' : '';
        const desc = hasText(e.desc) ? '<div class="cv-desc cv-desc--loose">' + esc(e.desc) + '</div>' : '';
        return '<div class="cv-entry">' + row(titleWithDetail(e.name, subtitle), e.date) + link + desc + bulletList(splitLines(e.bullets)) + '</div>';
      });
      return '<div class="cv-entries">' + entries.join('') + '</div>';
    },

    skills(section) {
      const groups = (section.groups || []).map((g) => {
        const label = hasText(g.label) ? '<b>' + esc(g.label) + ':</b> ' : '';
        return '<div class="cv-entry">' + label + '<span>' + esc(g.items) + '</span></div>';
      });
      return '<div class="cv-skills">' + groups.join('') + '</div>';
    },

    courses(section, ctx) {
      const courses = splitLines(section.courses);
      const coursesLabel = section.coursesLabel || ctx.tr('coursesWord');
      const languagesLabel = section.languagesLabel || ctx.tr('languagesWord');

      const left = courses.length
        ? '<div><b>' + esc(coursesLabel) + ':</b>' + bulletList(courses) + '</div>'
        : '';
      const right = hasText(section.languages)
        ? '<div class="cv-courses__langs"><b>' + esc(languagesLabel) + ':</b> <span>' + esc(section.languages) + '</span></div>'
        : '';
      return '<div class="cv-courses">' + left + right + '</div>';
    }
  };

  function renderSection(section, ctx) {
    const render = BODY_RENDERERS[section.type];
    if (!render) return '';
    const title = '<div class="cv-section__title">' + esc(section.title) + '</div>';
    return block(section.id, title + render(section, ctx), ctx, 'cv-section');
  }

  /* ----- API pública ----- */

  /** Devuelve el HTML del contenido de la hoja (sin la hoja contenedora). */
  function render(cv, options) {
    const opts = options || {};
    const ctx = {
      interactive: Boolean(opts.interactive),
      activeId: opts.activeId,
      tr: (key) => HB.i18n.t('editor.' + key, opts.lang)
    };

    const visibleSections = cv.sections.filter((s) => !s.hidden);
    return renderHeader(cv.personal, ctx) + visibleSections.map((s) => renderSection(s, ctx)).join('');
  }

  HB.cvRenderer = { render, fontClass };
})(window.HB);
