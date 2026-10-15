/* ==========================================================================
   pages/editor/editor-view.js
   Dibuja el formulario del editor (acordeón de secciones).

   En lugar de repetir HTML por cada tipo de sección, los campos se describen
   de forma declarativa en ENTRY_LAYOUTS / SECTION_LAYOUTS y un único
   renderizador los convierte en HTML.

   Descriptor de campo:
     { field, label, ph?, phLiteral?, multiline?, cls? }
       field      → propiedad del dato que edita
       label      → clave i18n de la etiqueta   (editor.<label>)
       noLabel    → true para no mostrar etiqueta
       ph         → clave i18n del placeholder  (editor.<ph>)
       phLiteral  → placeholder fijo, sin traducción
   Descriptor de fila:
     { row: 'wide-narrow', fields: [campo, campo] }   (ver forms.css)
   ========================================================================== */
(function (HB) {
  'use strict';

  const { escapeHtml: esc } = HB.utils;
  const tr = (key) => HB.i18n.t('editor.' + key);

  /* ----- Descripción de los campos de cada tipo ----- */

  const TITLE_FIELD = { field: 'title', label: 'secTitle', ph: 'phSecTitle', cls: 'input--title' };

  const ENTRY_LAYOUTS = {
    education: [
      { field: 'org', label: 'institution', ph: 'phInstitution' },
      { row: 'wide-narrow', fields: [
        { field: 'detail', label: 'degree', ph: 'phDegree' },
        { field: 'date', label: 'dates', ph: 'phDates1' }
      ] },
      { field: 'desc', label: 'descOpt', ph: 'phEduDesc', multiline: true }
    ],
    experience: [
      { row: 'wide-narrow', fields: [
        { field: 'org', label: 'company', ph: 'phCompany' },
        { field: 'date', label: 'dates', ph: 'phDates2' }
      ] },
      { field: 'role', label: 'role', ph: 'phRole' },
      { field: 'bullets', label: 'achievements', ph: 'phAch', multiline: true, cls: 'input--area-md' }
    ],
    projects: [
      { row: 'narrow-wide', fields: [
        { field: 'name', label: 'name', ph: 'phProjName' },
        { field: 'subtitle', label: 'subtitle', ph: 'phSubtitle' }
      ] },
      { row: 'link-date', fields: [
        { field: 'link', label: 'linkLine', ph: 'phLinkLine' },
        { field: 'date', label: 'datesOpt', ph: 'phYear' }
      ] },
      { field: 'desc', label: 'desc', ph: 'phProjDesc', multiline: true },
      { field: 'bullets', label: 'contribution', ph: 'phContrib', multiline: true }
    ],
    skills: [
      { field: 'label', label: 'label', ph: 'phSkillLabel' },
      { field: 'items', label: 'skills', ph: 'phSkillItems' }
    ]
  };

  /** Secciones sin lista de elementos: sus campos viven en la propia sección. */
  const SECTION_LAYOUTS = {
    profile: [
      { field: 'text', label: 'summary', ph: 'phSummary', multiline: true, cls: 'input--area-lg' }
    ],
    courses: [
      { row: 'label-value', fields: [
        { field: 'coursesLabel', label: 'label', ph: 'coursesWord' },
        { field: 'courses', label: 'coursesLines', ph: 'phCourseLines', multiline: true }
      ] },
      { row: 'label-value', fields: [
        { field: 'languagesLabel', label: 'label', ph: 'languagesWord' },
        { field: 'languages', label: 'languagesWord', ph: 'phLang' }
      ] }
    ]
  };

  const PERSONAL_LAYOUT = [
    { field: 'name', label: 'fullName', ph: 'phName' },
    { field: 'tagline', label: 'headline', ph: 'phHeadline' }
  ];

  /* ----- Utilidades de plantilla ----- */

  /** Convierte { sec: 'x', entry: 'y' } en ' data-sec="x" data-entry="y"'. */
  function dataAttrs(map) {
    return Object.keys(map)
      .filter((key) => map[key] !== undefined && map[key] !== null)
      .map((key) => ' data-' + key + '="' + esc(map[key]) + '"')
      .join('');
  }

  /** Botón de acción pequeño (↑ ↓ ✕ …). */
  function actionButton(action, data, label, cls, title) {
    const titleAttr = title ? ' title="' + esc(title) + '"' : '';
    return '<button type="button" class="' + cls + '" data-action="' + action + '"' + dataAttrs(data) + titleAttr + '>' + label + '</button>';
  }

  /* ----- Renderizado de campos ----- */

  function renderControl(spec, ref, source) {
    const placeholder = spec.phLiteral || (spec.ph ? tr(spec.ph) : '');
    const classes = ['input', spec.cls].filter(Boolean).join(' ');
    const attrs = dataAttrs({ sec: ref.sec, entry: ref.entry, field: spec.field });
    const value = esc(source[spec.field]);

    const control = spec.multiline
      ? '<textarea class="' + classes + '" placeholder="' + esc(placeholder) + '"' + attrs + '>' + value + '</textarea>'
      : '<input class="' + classes + '" value="' + value + '" placeholder="' + esc(placeholder) + '"' + attrs + '>';

    const label = spec.noLabel ? '' : '<div class="field__label">' + esc(tr(spec.label)) + '</div>';
    return '<div class="field">' + label + control + '</div>';
  }

  function renderLayout(layout, ref, source) {
    return layout.map((item) => {
      if (!item.fields) return renderControl(item, ref, source);
      const cells = item.fields.map((f) => renderControl(f, ref, source)).join('');
      return '<div class="field-row field-row--' + item.row + '">' + cells + '</div>';
    }).join('');
  }

  /* ----- Datos personales ----- */

  function renderContactRow(contact) {
    const ref = { sec: 'contacts', entry: contact.id };
    // Sin etiqueta: el placeholder ya describe cada campo
    const text = renderControl({ field: 'text', ph: 'phText', noLabel: true, cls: 'input--compact' }, ref, contact);
    const url = renderControl({ field: 'url', ph: 'phLink', noLabel: true, cls: 'input--compact' }, ref, contact);

    return '<div class="field-row field-row--contact">'
      + text + url
      + actionButton('contact-remove', { entry: contact.id }, '✕', 'btn-mono btn-mono--icon btn-mono--danger', tr('remove'))
      + '</div>';
  }

  function renderPersonalBody(personal) {
    const contacts = (personal.contacts || []).map(renderContactRow).join('');
    return renderLayout(PERSONAL_LAYOUT, { sec: 'personal' }, personal)
      + '<div class="field">'
      + '<div class="field__label">' + esc(tr('contacts')) + '</div>'
      + '<div class="contact-list">' + contacts + '</div>'
      + '<button type="button" class="btn-dashed contact-add" data-action="contact-add">' + esc(tr('addContact')) + '</button>'
      + '</div>';
  }

  /* ----- Secciones ----- */

  /** Herramientas de una tarjeta: subir, bajar, quitar. */
  function renderEntryTools(item, index, count, min, sectionId) {
    const data = { sec: sectionId, entry: item.id };
    const tools = [];
    if (index > 0) tools.push(actionButton('entry-up', data, '↑', 'btn-mono btn-mono--icon'));
    if (index < count - 1) tools.push(actionButton('entry-down', data, '↓', 'btn-mono btn-mono--icon'));
    if (count > min) tools.push(actionButton('entry-remove', data, esc(tr('remove')), 'btn-mono btn-mono--danger'));
    return '<div class="entry-card__tools">' + tools.join('') + '</div>';
  }

  function renderEntryCards(section) {
    const list = HB.cvModel.items(section);
    const min = section.required ? 1 : 0;
    const layout = ENTRY_LAYOUTS[section.type];

    const cards = list.map((item, index) => {
      return '<div class="entry-card">'
        + renderEntryTools(item, index, list.length, min, section.id)
        + renderLayout(layout, { sec: section.id, entry: item.id }, item)
        + '</div>';
    }).join('');

    const addLabel = section.type === 'skills' ? tr('addGroup') : tr('addEntry');
    return '<div class="stack">' + cards + '</div>'
      + '<button type="button" class="btn-dashed" data-action="entry-add" data-sec="' + esc(section.id) + '">' + esc(addLabel) + '</button>';
  }

  function renderSectionTools(section) {
    const hideLabel = section.hidden ? tr('show') : tr('hide');
    return '<div class="section-tools">'
      + actionButton('sec-hide', { sec: section.id }, esc(hideLabel), 'btn-mono')
      + actionButton('sec-remove', { sec: section.id }, esc(tr('deleteSec')), 'btn-mono btn-mono--danger')
      + '</div>';
  }

  function renderSectionBody(section) {
    const ref = { sec: section.id };
    let html = renderLayout([TITLE_FIELD], ref, section);

    html += ENTRY_LAYOUTS[section.type]
      ? renderEntryCards(section)
      : renderLayout(SECTION_LAYOUTS[section.type] || [], ref, section);

    if (!section.required) html += renderSectionTools(section);
    return html;
  }

  /* ----- Acordeón ----- */

  /** Cabecera + cuerpo (si está abierto) de un bloque del formulario. */
  function renderAccordion(config) {
    const { id, title, isOpen, badges, mover, body, dimTitle } = config;

    return '<div class="accordion" id="ed-' + esc(id) + '">'
      + '<div class="accordion__head">'
      +   '<button type="button" class="accordion__toggle" data-action="open" data-sec="' + esc(id) + '" aria-expanded="' + isOpen + '">'
      +     '<span class="accordion__title' + (dimTitle ? ' is-hidden' : '') + '">' + esc(title) + '</span>' + badges
      +   '</button>'
      +   mover
      +   '<span class="accordion__caret" aria-hidden="true">' + (isOpen ? '−' : '+') + '</span>'
      + '</div>'
      + (isOpen ? '<div class="accordion__body">' + body + '</div>' : '')
      + '</div>';
  }

  function badge(text, muted) {
    return '<span class="badge' + (muted ? ' badge--muted' : '') + '">' + esc(text) + '</span>';
  }

  function renderPersonal(cv, openId) {
    return renderAccordion({
      id: 'personal',
      title: tr('personal'),
      isOpen: openId === 'personal',
      badges: badge(tr('required')),
      mover: '',
      body: renderPersonalBody(cv.personal)
    });
  }

  function renderSection(section, index, total, openId) {
    // El perfil siempre va primero; ninguna sección puede subir sobre él
    const movable = section.type !== 'profile';
    const canUp = movable && index > 1;
    const canDown = movable && index < total - 1;

    const mover = (canUp ? actionButton('sec-up', { sec: section.id }, '↑', 'btn-mono btn-mono--icon', tr('up')) : '')
      + (canDown ? actionButton('sec-down', { sec: section.id }, '↓', 'btn-mono btn-mono--icon', tr('down')) : '');

    return renderAccordion({
      id: section.id,
      title: section.title || tr('untitled'),
      isOpen: openId === section.id,
      dimTitle: Boolean(section.hidden),
      badges: (section.required ? badge(tr('required')) : '') + (section.hidden ? badge(tr('hiddenTag'), true) : ''),
      mover,
      body: renderSectionBody(section)
    });
  }

  /* ----- API pública ----- */

  /** Dibuja todo el acordeón dentro de `container`. */
  function render(container, state) {
    const sections = state.cv.sections;
    container.innerHTML = renderPersonal(state.cv, state.open)
      + sections.map((s, i) => renderSection(s, i, sections.length, state.open)).join('');
  }

  /** Desplaza el panel del formulario hasta la sección indicada. */
  function scrollToSection(panel, id) {
    setTimeout(() => {
      const target = document.getElementById('ed-' + id);
      if (panel && target) panel.scrollTo({ top: Math.max(0, target.offsetTop - 12), behavior: 'smooth' });
    }, 30);
  }

  HB.editorView = { render, scrollToSection };
})(window.HB);
