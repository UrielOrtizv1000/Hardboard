/* ==========================================================================
   i18n/es.js — Diccionario en ESPAÑOL
   Namespaces:
     common  → textos compartidos (cabecera, pie)
     landing → página de inicio
     editor  → editor de CV (formulario, vista previa y títulos por defecto)
   Para añadir un idioma: copiar este archivo, traducir y registrar con otro
   código; luego agregarlo al selector de idioma del header.
   ========================================================================== */
HB.i18n.register('es', {
  common: {
    home: 'Inicio',
    editor: 'Editor',
    dark: 'Oscuro',
    light: 'Claro',
    disclaimer: 'No afiliado a Harvard University'
  },

  landing: {
    docTitle: 'Hardboard. — CV',
    example: 'Ejemplo',
    create: 'Crear mi CV',
    kicker: 'Welcome to',
    h1a: 'Un currículum',
    h1b: 'de ignorar',
    sub: 'Llena tus datos, mira la hoja en vivo y descárgala en PDF.',
    cta: 'Haz tu currículum',
    seeA: 'Así se',
    seeB: 've',
    seeP: 'Perfil, educación y experiencia van siempre. Lo demás —habilidades, proyectos, cursos o lo que necesites— lo agregas, renombras o quitas tú.',
    start: 'Empezar',
    donateText: 'Esta página se mantiene por donaciones. No son obligatorias, pero ayudan.',
    donate: 'Donar'
  },

  editor: {
    docTitle: 'Editor — Hardboard.',
    download: 'Descargar PDF',
    downloadDocx: 'Descargar DOCX',
    downloadMenu: 'Descargar',
    exportError: 'No se pudo generar el archivo. Revisa tu conexión e inténtalo de nuevo.',
    edit: 'Editar',
    preview: 'Vista previa',
    autosaved: 'Se guarda solo',
    h1a: 'Llena, ordena,',
    h1b: 'descarga.',
    loadSample: 'Cargar ejemplo',
    blank: 'Hoja en blanco',
    sure: '¿Seguro? Toca otra vez',

    /* Datos personales */
    personal: 'Datos personales',
    required: 'Obligatoria',
    fullName: 'Nombre completo',
    phName: 'Ej. Daniela Ríos Méndez',
    headline: 'Línea de títulos',
    phHeadline: 'Ej. Contadora Pública | Auditoría | Excel avanzado | Inglés B2',
    contacts: 'Contacto y enlaces',
    phText: 'Texto visible',
    phLink: 'Enlace (opcional)',
    remove: 'Quitar',
    addContact: '+ Añadir contacto',

    /* Controles de sección */
    hiddenTag: 'Oculta',
    up: 'Subir',
    down: 'Bajar',
    secTitle: 'Título de la sección',
    phSecTitle: 'Ej. Voluntariado',
    deleteSec: 'Eliminar sección',
    show: 'Mostrar en la hoja',
    hide: 'Ocultar de la hoja',
    untitled: 'Sin título',
    addGroup: '+ Añadir grupo',
    addEntry: '+ Añadir entrada',

    /* Perfil */
    summary: 'Resumen',
    phSummary: 'Quién eres, qué haces bien y cómo trabajas. 3–4 líneas.',

    /* Educación */
    institution: 'Institución',
    phInstitution: 'Ej. Universidad Autónoma de…',
    degree: 'Carrera / título',
    phDegree: 'Ej. Lic. en Diseño',
    dates: 'Fechas',
    phDates1: '2020 – 2024',
    phDates2: 'Ene 2023 – Actualidad',
    descOpt: 'Descripción (opcional)',
    phEduDesc: 'Enfoque, promedio, tesis, distinciones…',

    /* Experiencia */
    company: 'Empresa',
    phCompany: 'Ej. Grupo Bimbo',
    role: 'Puesto',
    phRole: 'Ej. Analista de ventas',
    achievements: 'Logros · uno por línea',
    phAch: 'Reduje el tiempo de respuesta 30%…',

    /* Proyectos */
    name: 'Nombre',
    phProjName: 'Ej. Feria de ciencias',
    subtitle: 'Subtítulo (cursiva)',
    phSubtitle: 'Ej. Primer lugar estatal (2023)',
    linkLine: 'Línea de enlace (opcional)',
    datesOpt: 'Fechas (opcional)',
    desc: 'Descripción',
    phProjDesc: 'Qué es y con qué se hizo.',
    contribution: 'Tu aporte · uno por línea',
    phContrib: 'Coordiné un equipo de 4 personas…',

    /* Habilidades */
    label: 'Etiqueta',
    phSkillLabel: 'Ej. Software',
    skills: 'Habilidades',

    /* Cursos e idiomas */
    coursesWord: 'Cursos',
    coursesLines: 'Cursos · uno por línea',
    languagesWord: 'Idiomas',
    phLang: 'Español nativo. Inglés B2.',

    /* Añadir sección opcional */
    addOptional: 'Añadir sección opcional',
    addSkills: '+ Habilidades',
    addProjects: '+ Proyectos',
    addCourses: '+ Cursos e idiomas',
    addCustom: '+ Sección libre',

    /* Vista previa */
    font: 'Letra',
    yourName: 'Tu nombre',
    writeSummary: 'Escribe tu resumen en el editor…',
    page: 'Página',
    onePage: '1 página',
    pages: 'páginas',

    /* Títulos por defecto de las secciones */
    tSkills: 'Habilidades',
    tCourses: 'Cursos e idiomas',
    tCustom: 'Sección libre',
    tProjects: 'Proyectos',
    tProfile: 'Perfil profesional',
    tEducation: 'Educación',
    tExperience: 'Experiencia profesional'
  }
});
