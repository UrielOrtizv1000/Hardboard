/* ==========================================================================
   data/cv-model.js
   Forma de los datos del CV y fábricas de objetos vacíos.

   Estructura del CV:
   {
     font: 'arial' | 'times' | 'georgia',
     template: 'harvard' | 'vitae' | 'generic',   (por defecto 'harvard')
     vitaeColor: clave de VITAE_COLORS             (solo plantilla Vitae)
     personal: { name, tagline, photo?, contacts: [{ id, text, url }] },
               photo = data URL de la foto (solo plantilla Vitae)
     sections: [ Section, … ]
   }

   Tipos de sección (Section.type):
     profile     → { text }                                  (obligatoria)
     education   → { entries: [{ org, detail, date, desc }] } (obligatoria)
     experience  → { entries: [{ org, role, date, bullets }] }(obligatoria)
     projects    → { entries: [{ name, subtitle, link, date, desc, bullets }] }
     skills      → { groups:  [{ label, items }] }
     courses     → { coursesLabel, courses, languagesLabel, languages }
   Todas tienen además: id, title y, opcionalmente, required / hidden.

   Para añadir un tipo de sección nuevo hay que tocar:
     1. este archivo (blankItem / newSection)
     2. components/cv-renderer.js (cómo se dibuja en la hoja)
     3. pages/editor/editor-view.js (qué campos tiene el formulario)
   ========================================================================== */
(function (HB) {
  'use strict';

  const { uid } = HB.utils;

  /** Fuentes disponibles para la hoja. */
  const FONTS = ['arial', 'times', 'georgia'];

  /** Plantillas de hoja disponibles. */
  const TEMPLATES = ['harvard', 'vitae', 'generic'];

  /** Colores de fondo de la cabecera Vitae (clave → hex). */
  const VITAE_COLORS = {
    graphite: '#3d3d3d',
    gray: '#6b6b6b',
    navy: '#1f3a5f',
    wine: '#6e2636',
    green: '#2f4f3f',
    rose: '#a84f6b',
    retro: '#9c4f2e'
  };

  /** Plantilla efectiva de un CV (las guardadas antes de existir esta opción son Harvard). */
  function templateOf(cv) {
    return TEMPLATES.indexOf(cv.template) >= 0 ? cv.template : 'harvard';
  }

  /** Hex del color Vitae elegido (grafito si la clave no existe). */
  function vitaeHex(cv) {
    return VITAE_COLORS[cv.vitaeColor] || VITAE_COLORS.graphite;
  }

  /**
   * Reparto de las secciones visibles en las plantillas de dos columnas:
   * el perfil arriba; educación, habilidades y cursos a la izquierda;
   * experiencia y proyectos (incluidas las secciones libres) a la derecha.
   */
  function splitColumns(cv) {
    const visible = cv.sections.filter((s) => !s.hidden);
    const left = ['education', 'skills', 'courses'];
    return {
      top: visible.filter((s) => s.type === 'profile'),
      left: visible.filter((s) => left.indexOf(s.type) >= 0),
      right: visible.filter((s) => s.type !== 'profile' && left.indexOf(s.type) < 0)
    };
  }

  /** Nombre de la propiedad que contiene la lista de elementos de una sección. */
  function listKey(section) {
    return section.type === 'skills' ? 'groups' : 'entries';
  }

  /** Lista de elementos de una sección (vacía si no tiene). */
  function items(section) {
    return section[listKey(section)] || [];
  }

  /** Crea un elemento vacío para una sección del tipo indicado. */
  function blankItem(type) {
    switch (type) {
      case 'education':  return { id: uid(), org: '', detail: '', date: '', desc: '' };
      case 'experience': return { id: uid(), org: '', role: '', date: '', bullets: '' };
      case 'skills':     return { id: uid(), label: '', items: '' };
      default:           return { id: uid(), name: '', subtitle: '', link: '', date: '', desc: '', bullets: '' };
    }
  }

  /** Crea una sección opcional nueva ('skills' | 'courses' | 'custom' | 'projects'). */
  function newSection(kind, lang) {
    const tr = (key) => HB.i18n.t('editor.' + key, lang);

    switch (kind) {
      case 'skills':
        return { id: uid(), type: 'skills', title: tr('tSkills'), groups: [blankItem('skills')] };
      case 'courses':
        return {
          id: uid(), type: 'courses', title: tr('tCourses'),
          coursesLabel: tr('coursesWord'), courses: '',
          languagesLabel: tr('languagesWord'), languages: ''
        };
      case 'custom': // Sección libre: usa el mismo formato que "projects"
        return { id: uid(), type: 'projects', title: tr('tCustom'), entries: [blankItem('projects')] };
      default:
        return { id: uid(), type: 'projects', title: tr('tProjects'), entries: [blankItem('projects')] };
    }
  }

  /** Hoja en blanco: solo las tres secciones obligatorias. */
  function blankCv(lang) {
    const tr = (key) => HB.i18n.t('editor.' + key, lang);
    return {
      font: 'arial',
      template: 'harvard',
      vitaeColor: 'graphite',
      personal: {
        name: '',
        tagline: '',
        photo: '',
        contacts: [{ id: uid(), text: '', url: '' }, { id: uid(), text: '', url: '' }]
      },
      sections: [
        { id: 'profile', type: 'profile', required: true, title: tr('tProfile'), text: '' },
        { id: 'education', type: 'education', required: true, title: tr('tEducation'), entries: [blankItem('education')] },
        { id: 'experience', type: 'experience', required: true, title: tr('tExperience'), entries: [blankItem('experience')] }
      ]
    };
  }

  /** ¿Es un objeto con la forma mínima de un CV? (valida datos de localStorage) */
  function isValidCv(value) {
    return Boolean(value && value.personal && Array.isArray(value.sections));
  }

  HB.cvModel = { FONTS, TEMPLATES, VITAE_COLORS, templateOf, vitaeHex, splitColumns, listKey, items, blankItem, newSection, blankCv, isValidCv };
})(window.HB);
