/* ==========================================================================
   data/sample-cv.js
   CV de ejemplo (landing + botón "Cargar ejemplo" del editor).
   El contenido de cada idioma está en CONTENT; build() lo convierte al
   modelo de datos de cv-model.js, así la estructura no se duplica.
   ========================================================================== */
(function (HB) {
  'use strict';

  const { uid } = HB.utils;

  /* Datos que NO cambian entre idiomas */
  const PERSON = { name: 'Alex Example' };
  const PROJECT_LINKS = {
    es: ['Proyecto: example.com/projects/resiliencia-k8s', 'Proyecto: example.com/projects/bookstore'],
    en: ['Project: example.com/projects/resiliencia-k8s', 'Project: example.com/projects/bookstore']
  };

  /* Contenido traducible */
  const CONTENT = {
    es: {
      tagline: 'Ingeniería en Sistemas Computacionales | Cloud | Soporte TI | Frontend Jr. | Inglés C1',
      portfolio: 'portfolio.example.com (Portafolio)',
      profileTitle: 'Perfil profesional',
      profile: 'Estudiante de 8.º semestre de Ingeniería en Sistemas Computacionales con experiencia en soporte TI, atención al cliente y documentación de procesos. Trabajo con método: primero un plan, luego paso a paso, y al final de cada fase depuro y ajusto lo necesario antes de avanzar.',
      eduTitle: 'Educación',
      uni: 'Universidad Tecnológica del Centro',
      degree: 'Ingeniería en Sistemas Computacionales',
      eduDate: 'Ago 2022 – Actualidad',
      eduDesc: 'Formación en bases de datos (diseño, normalización y administración) y despliegue de aplicaciones web con enfoque en seguridad.',
      skillsTitle: 'Habilidades técnicas',
      skills: [
        { label: 'Lenguajes y frontend', items: 'HTML, CSS, JavaScript, TypeScript, React.' },
        { label: 'Backend y APIs', items: 'REST APIs, Node.js, FastAPI, documentación técnica.' },
        { label: 'Cloud y herramientas', items: 'Git/GitHub, Docker, Kubernetes básico, Azure.' },
        { label: 'Procesos y soporte', items: 'Gestión de incidencias, ITIL, seguimiento de casos.' }
      ],
      projectsTitle: 'Proyectos destacados',
      projects: [
        { name: 'Resiliencia-K8s', subtitle: 'Microservicios desplegados en Kubernetes (Proyecto académico)', desc: 'Sistema que prueba cómo se comporta una aplicación cuando un servicio falla y cómo se recupera. Python, FastAPI, Docker y Docker Compose.', bullets: 'Generé 50,000 usuarios simulados para pruebas de carga y documenté la observabilidad con Prometheus y Grafana.' },
        { name: 'Librería Online', subtitle: 'Tienda de libros en línea (Proyecto académico)', desc: 'Búsqueda, consulta y compra de libros con Angular en el frontend, Node.js en el backend y MySQL.', bullets: 'Construí la navegación y el flujo de compra, y mejoré la usabilidad del carrito.' }
      ],
      expTitle: 'Experiencia profesional',
      jobs: [
        { org: 'Atento', role: 'Ejecutiva de atención a clientes / Facturación', date: 'Abr 2020 – Oct 2021', bullets: ['Gestión de solicitudes de clientes en facturación y soporte técnico.', 'Registro de llamadas y manejo de datos sensibles en sistemas internos.', 'Seguimiento de casos aplicando fundamentos de ITIL.'] },
        { org: 'Despacho Contable Méndez', role: 'Apoyo administrativo y documentación', date: 'Ene 2024 – Actualidad', bullets: ['Organización y mejora de la documentación interna.', 'Revisión de datos en el sistema de compras: precios, registros y consistencia.'] }
      ],
      coursesTitle: 'Cursos e idiomas',
      coursesLabel: 'Cursos',
      courses: ['ITIL 4 Foundation: Service Management — Udemy.', 'Azure Fundamentals AZ-900 — Microsoft Learn.'],
      languagesLabel: 'Idiomas',
      languages: 'Español nativo. Inglés avanzado C1.'
    },

    en: {
      tagline: 'Computer Systems Engineering | Cloud | IT Support | Jr. Frontend | English C1',
      portfolio: 'portfolio.example.com (Portfolio)',
      profileTitle: 'Professional profile',
      profile: '8th-semester Computer Systems Engineering student with experience in IT support, customer service and process documentation. I work methodically: plan first, then step by step, and at the end of each phase I debug and adjust whatever is needed before moving on.',
      eduTitle: 'Education',
      uni: 'Universidad Tecnológica del Centro',
      degree: 'Computer Systems Engineering',
      eduDate: 'Aug 2022 – Present',
      eduDesc: 'Training in databases (design, normalization and administration) and deploying web applications with a focus on security.',
      skillsTitle: 'Technical skills',
      skills: [
        { label: 'Languages and frontend', items: 'HTML, CSS, JavaScript, TypeScript, React.' },
        { label: 'Backend and APIs', items: 'REST APIs, Node.js, FastAPI, technical documentation.' },
        { label: 'Cloud and tools', items: 'Git/GitHub, Docker, Kubernetes fundamentals, Azure.' },
        { label: 'Processes and support', items: 'Incident management, ITIL, case tracking.' }
      ],
      projectsTitle: 'Featured projects',
      projects: [
        { name: 'Resiliencia-K8s', subtitle: 'Microservices deployed on Kubernetes (Academic project)', desc: 'A system that tests how an application behaves when a service fails and how it recovers. Python, FastAPI, Docker and Docker Compose.', bullets: 'Generated 50,000 simulated users for load testing and documented observability with Prometheus and Grafana.' },
        { name: 'Online Bookstore', subtitle: 'Online book store (Academic project)', desc: 'Search, browse and buy books with Angular on the frontend, Node.js on the backend and MySQL.', bullets: 'Built the navigation and purchase flow, and improved cart usability.' }
      ],
      expTitle: 'Professional experience',
      jobs: [
        { org: 'Atento', role: 'Customer service representative / Billing', date: 'Apr 2020 – Oct 2021', bullets: ['Managed customer requests for billing and technical support.', 'Logged calls and handled sensitive data in internal systems.', 'Tracked cases applying ITIL fundamentals.'] },
        { org: 'Despacho Contable Méndez', role: 'Administrative support and documentation', date: 'Jan 2024 – Present', bullets: ['Organized and improved internal documentation.', 'Reviewed data in the purchasing system: prices, records and consistency.'] }
      ],
      coursesTitle: 'Courses & languages',
      coursesLabel: 'Courses',
      courses: ['ITIL 4 Foundation: Service Management — Udemy.', 'Azure Fundamentals AZ-900 — Microsoft Learn.'],
      languagesLabel: 'Languages',
      languages: 'Native Spanish. Advanced English C1.'
    }
  };

  /** Convierte el contenido de un idioma al modelo de CV (con ids nuevos). */
  function build(c, lang) {
    return {
      font: 'arial',
      personal: {
        name: PERSON.name,
        tagline: c.tagline,
        contacts: [
          { id: uid(), text: c.portfolio, url: 'portfolio.example.com' },
          { id: uid(), text: 'alex@example.com', url: 'mailto:alex@example.com' },
          { id: uid(), text: '+1 202 555 0100', url: '' },
          { id: uid(), text: 'example.com/profile', url: 'example.com/profile' }
        ]
      },
      sections: [
        { id: 'profile', type: 'profile', required: true, title: c.profileTitle, text: c.profile },
        {
          id: 'education', type: 'education', required: true, title: c.eduTitle,
          entries: [{ id: uid(), org: c.uni, detail: c.degree, date: c.eduDate, desc: c.eduDesc }]
        },
        {
          id: uid(), type: 'skills', title: c.skillsTitle,
          groups: c.skills.map((g) => ({ id: uid(), label: g.label, items: g.items }))
        },
        {
          id: uid(), type: 'projects', title: c.projectsTitle,
          entries: c.projects.map((p, i) => ({
            id: uid(), name: p.name, subtitle: p.subtitle, link: PROJECT_LINKS[lang][i],
            date: '', desc: p.desc, bullets: p.bullets
          }))
        },
        {
          id: 'experience', type: 'experience', required: true, title: c.expTitle,
          entries: c.jobs.map((j) => ({
            id: uid(), org: j.org, role: j.role, date: j.date, bullets: j.bullets.join('\n')
          }))
        },
        {
          id: uid(), type: 'courses', title: c.coursesTitle,
          coursesLabel: c.coursesLabel, courses: c.courses.join('\n'),
          languagesLabel: c.languagesLabel, languages: c.languages
        }
      ]
    };
  }

  /** CV de ejemplo en el idioma indicado ('es' por defecto). */
  HB.sampleCv = function sampleCv(lang) {
    const key = lang === 'en' ? 'en' : 'es';
    return build(CONTENT[key], key);
  };
})(window.HB);
