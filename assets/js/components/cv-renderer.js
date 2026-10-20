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

  /* ======================================================================
     Plantillas de dos columnas (Vitae y Genérico)
     El reparto de secciones entre columnas lo define cvModel.splitColumns().
     ====================================================================== */

  /** Lista con viñetas coloreadas por la plantilla (el texto queda en negro). */
  function tplBullets(lines) {
    if (!lines.length) return '';
    return '<ul>' + lines.map((line) => '<li><span>' + esc(line) + '</span></li>').join('') + '</ul>';
  }

  function tplDate(date) {
    return hasText(date) ? '<div class="tpl-date">' + esc(date) + '</div>' : '';
  }

  function tplDesc(text) {
    return hasText(text) ? '<div class="tpl-desc">' + esc(text) + '</div>' : '';
  }

  function tplProfile(section, ctx) {
    return hasText(section.text)
      ? '<div class="cv-text">' + esc(section.text) + '</div>'
      : '<div class="cv-placeholder" data-noprint>' + esc(ctx.tr('writeSummary')) + '</div>';
  }

  function tplCourses(section, ctx, languagesAsList) {
    const courses = splitLines(section.courses);
    const languagesLabel = section.languagesLabel || ctx.tr('languagesWord');
    const languages = hasText(section.languages)
      ? '<b>' + esc(languagesLabel) + ': </b><span>' + esc(section.languages) + '</span>'
      : '';
    let langHtml = '';
    if (languages) langHtml = languagesAsList ? '<ul><li>' + languages + '</li></ul>' : '<div>' + languages + '</div>';
    return '<div class="tpl-stack tpl-stack--xs">' + tplBullets(courses) + langHtml + '</div>';
  }

  function tplSkills(section) {
    const items = (section.groups || []).map((g) => {
      const label = hasText(g.label) ? '<b>' + esc(g.label) + ': </b>' : '';
      return '<li><span>' + label + esc(g.items) + '</span></li>';
    });
    return '<ul>' + items.join('') + '</ul>';
  }

  function tplStack(entries, size) {
    return '<div class="tpl-stack tpl-stack--' + size + '">' + entries.join('') + '</div>';
  }

  const VITAE_BODIES = {
    profile: tplProfile,

    education(section) {
      return tplStack((section.entries || []).map((e) =>
        '<div class="cv-entry">'
        + (hasText(e.detail) ? '<div class="tpl-caps">' + esc(e.detail) + '</div>' : '')
        + '<div>' + esc(e.org) + '</div>'
        + (hasText(e.date) ? '<div class="tpl-muted">' + esc(e.date) + '</div>' : '')
        + '</div>'), 'md');
    },

    skills: tplSkills,

    courses(section, ctx) { return tplCourses(section, ctx, false); },

    experience(section) {
      return tplStack((section.entries || []).map((e) => {
        const role = hasText(e.role) ? '<span>' + esc(e.role) + ' | </span>' : '';
        return '<div class="cv-entry"><div class="tpl-caps">' + role + '<span>' + esc(e.org) + '</span></div>'
          + tplDate(e.date) + tplBullets(splitLines(e.bullets)) + '</div>';
      }), 'lg');
    },

    projects(section) {
      return tplStack((section.entries || []).map((e) => {
        const subtitle = hasText(e.subtitle) ? '<span> | ' + esc(e.subtitle) + '</span>' : '';
        return '<div class="cv-entry"><div class="tpl-caps"><span>' + esc(e.name) + '</span>' + subtitle + '</div>'
          + tplDate(e.date) + tplDesc(e.desc) + tplBullets(splitLines(e.bullets)) + '</div>';
      }), 'lg');
    }
  };

  const GENERIC_BODIES = {
    profile: tplProfile,

    education(section) {
      return tplStack((section.entries || []).map((e) =>
        '<div class="cv-entry">'
        + (hasText(e.detail) ? '<div class="tpl-strong">' + esc(e.detail) + '</div>' : '')
        + '<div>' + esc(e.org) + '</div>'
        + (hasText(e.date) ? '<div class="tpl-muted">' + esc(e.date) + '</div>' : '')
        + '</div>'), 'md');
    },

    skills: tplSkills,

    courses(section, ctx) { return tplCourses(section, ctx, true); },

    experience(section) {
      return tplStack((section.entries || []).map((e) => {
        const date = hasText(e.date) ? '<span> - ' + esc(e.date) + '</span>' : '';
        return '<div class="cv-entry">'
          + (hasText(e.role) ? '<div class="tpl-strong">' + esc(e.role) + '</div>' : '')
          + '<div class="tpl-muted">' + esc(e.org) + date + '</div>'
          + tplBullets(splitLines(e.bullets)) + '</div>';
      }), 'lg');
    },

    projects(section) {
      return tplStack((section.entries || []).map((e) => {
        const date = hasText(e.date) ? '<span> - ' + esc(e.date) + '</span>' : '';
        const sub = hasText(e.subtitle) || hasText(e.date)
          ? '<div class="tpl-muted">' + esc(e.subtitle) + date + '</div>' : '';
        return '<div class="cv-entry">'
          + (hasText(e.name) ? '<div class="tpl-strong">' + esc(e.name) + '</div>' : '')
          + sub + tplDesc(e.desc) + tplBullets(splitLines(e.bullets)) + '</div>';
      }), 'lg');
    }
  };

  const TEMPLATE_BODIES = { vitae: VITAE_BODIES, generic: GENERIC_BODIES };

  function renderTplSection(section, ctx, bodies) {
    const body = bodies[section.type];
    if (!body) return '';
    const title = '<div class="tpl-title">' + esc(section.title) + '</div>';
    return block(section.id, title + body(section, ctx), ctx, 'tpl-section');
  }

  /** Contactos con texto, cada uno envuelto por `wrap(labelHtml)`. */
  function contactItems(contacts, wrap) {
    return contacts.filter((c) => hasText(c.text)).map((c) => {
      const href = toHref(c.url);
      const label = href
        ? '<a class="tpl-link" href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(c.text) + '</a>'
        : '<span>' + esc(c.text) + '</span>';
      return wrap(label);
    });
  }

  /** Foto circular de la cabecera Vitae (solo se admiten data URL de imagen). */
  function vitaePhoto(photo) {
    const src = typeof photo === 'string' && /^data:image\/(jpeg|png|webp);base64,/i.test(photo) ? photo : '';
    return '<div class="vt-photo">' + (src ? '<img src="' + esc(src) + '" alt="">' : '') + '</div>';
  }

  function nameHtml(personal, cls, ctx) {
    return hasText(personal.name)
      ? '<div class="' + cls + '">' + esc(personal.name) + '</div>'
      : '<div class="' + cls + ' cv-placeholder" data-noprint>' + esc(ctx.tr('yourName')) + '</div>';
  }

  function renderVitaeHeader(cv, ctx) {
    const p = cv.personal;
    const tagline = hasText(p.tagline) ? '<div class="vt-tagline">' + esc(p.tagline) + '</div>' : '';
    return block('personal', nameHtml(p, 'vt-name', ctx) + tagline + vitaePhoto(p.photo), ctx, 'vt-header');
  }

  function renderGenericHeader(cv, ctx) {
    const p = cv.personal;
    const tagline = hasText(p.tagline) ? '<div class="gn-tagline">' + esc(p.tagline) + '</div>' : '';
    const items = contactItems(p.contacts || [], (label) => '<div>' + label + '</div>');
    const contacts = items.length ? '<div class="gn-contacts">' + items.join('') + '</div>' : '';
    return block('personal', nameHtml(p, 'gn-name', ctx) + tagline + contacts, ctx, 'gn-header');
  }

  function renderColumns(cv, ctx, templateKey) {
    const bodies = TEMPLATE_BODIES[templateKey];
    const { top, left, right } = HB.cvModel.splitColumns(cv);

    let leftHtml = '';
    if (templateKey === 'vitae') {
      const items = contactItems(cv.personal.contacts || [], (label) => '<div class="vt-contact"><i></i>' + label + '</div>');
      if (items.length) {
        const title = '<div class="tpl-title">' + esc(ctx.tr('contacts')) + '</div>';
        leftHtml += block('personal', title + tplStack(items, 'xs'), ctx, 'tpl-section');
      }
    }
    leftHtml += left.map((s) => renderTplSection(s, ctx, bodies)).join('');
    const rightHtml = right.map((s) => renderTplSection(s, ctx, bodies)).join('');

    return top.map((s) => '<div class="tpl-top">' + renderTplSection(s, ctx, bodies) + '</div>').join('')
      + '<div class="tpl-cols"><div class="tpl-col tpl-col--left">' + leftHtml + '</div>'
      + '<div class="tpl-col tpl-col--right">' + rightHtml + '</div></div>';
  }

  function renderTemplate(cv, ctx, templateKey) {
    const isVitae = templateKey === 'vitae';
    const header = isVitae ? renderVitaeHeader(cv, ctx) : renderGenericHeader(cv, ctx);
    const style = isVitae ? ' style="--vt-bg:' + HB.cvModel.vitaeHex(cv) + '"' : '';
    return '<div class="cv-tpl cv-tpl--' + templateKey + '"' + style + '>'
      + header + renderColumns(cv, ctx, templateKey) + '</div>';
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

    const template = HB.cvModel.templateOf(cv);
    if (template !== 'harvard') return renderTemplate(cv, ctx, template);

    const visibleSections = cv.sections.filter((s) => !s.hidden);
    return renderHeader(cv.personal, ctx) + visibleSections.map((s) => renderSection(s, ctx)).join('');
  }

  HB.cvRenderer = { render, fontClass };
})(window.HB);
