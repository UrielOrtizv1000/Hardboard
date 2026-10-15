/* ==========================================================================
   pages/editor/export.js
   Descarga directa del CV como PDF o DOCX, sin diálogo de impresión.
   El archivo se llama como el nombre completo del usuario ("Ana Pérez.pdf").

   Las librerías (jsPDF y docx) se cargan bajo demanda la primera vez que se
   descarga, para no pesar en la carga inicial del editor.

   Ambos formatos se generan directo desde el modelo del CV (no desde el HTML),
   así el PDF conserva texto seleccionable y el DOCX es editable.
   ========================================================================== */
(function (HB) {
  'use strict';

  const { hasText, splitLines, toHref } = HB.utils;

  const LIBS = {
    pdf: {
      isReady: () => Boolean(window.jspdf),
      src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    },
    docx: {
      isReady: () => Boolean(window.docx),
      src: 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js'
    }
  };

  const MIME = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  /* ----- Ayudantes ----- */

  function loadLibrary(kind) {
    const lib = LIBS[kind];
    if (lib.isReady()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = lib.src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('No se pudo cargar ' + lib.src));
      document.head.appendChild(script);
    });
  }

  /** Nombre de archivo = nombre completo del usuario, sin caracteres inválidos. */
  function fileBase(cv) {
    const name = String(cv.personal.name || '')
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
    return name || 'CV';
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  /** Secciones visibles con su contenido ya normalizado. */
  function visibleSections(cv) {
    return cv.sections.filter((s) => !s.hidden);
  }

  const FONT_NAMES = { arial: 'Arial', times: 'Times New Roman', georgia: 'Georgia' };

  /* ======================================================================
     PDF (jsPDF, texto vectorial)
     Unidades en puntos. Los tamaños equivalen a los de la hoja (px × 0.75).
     ====================================================================== */

  const PDF = {
    page: { w: 612, h: 792 },
    marginX: 43.2, // 0.6in
    marginY: 36,   // 0.5in
    body: 9,
    small: 8.6,
    lead: 1.38,
    link: [26, 86, 201]
  };
  /* Fuentes TrueType incrustadas (Unicode: ñ, acentos, ç, ß, cirílico, griego…).
     Equivalentes métricos de Arial, Times New Roman y Georgia (licencia libre). */
  const FONT_CDN = 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/';
  const PDF_FONTS = {
    arial:   { id: 'Arimo',   pkg: 'arimo@0.4.3' },
    times:   { id: 'Tinos',   pkg: 'tinos@0.4.2' },
    georgia: { id: 'Gelasio', pkg: 'gelasio@0.4.1' }
  };
  const FONT_STYLES = [
    { style: 'normal', suffix: '400Regular' },
    { style: 'bold',   suffix: '700Bold' },
    { style: 'italic', suffix: '400Regular_Italic' }
  ];
  const fontCache = {}; // url → Promise<base64>

  function fetchFontBase64(url) {
    if (!fontCache[url]) {
      fontCache[url] = fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error('No se pudo cargar la fuente ' + url);
          return res.arrayBuffer();
        })
        .then((buffer) => {
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
          }
          return btoa(binary);
        })
        .catch((error) => {
          delete fontCache[url]; // permite reintentar
          throw error;
        });
    }
    return fontCache[url];
  }

  /** Registra en el documento la familia elegida (normal, negrita, cursiva). */
  async function registerFonts(doc, fontKey) {
    const font = PDF_FONTS[fontKey] || PDF_FONTS.arial;
    const [name] = font.pkg.split('@');
    const data = await Promise.all(FONT_STYLES.map((s) =>
      fetchFontBase64(FONT_CDN + font.pkg + '/' + s.suffix + '/' + font.id + '_' + s.suffix + '.ttf')));
    FONT_STYLES.forEach((s, i) => {
      const file = font.id + '-' + s.style + '.ttf';
      doc.addFileToVFS(file, data[i]);
      doc.addFont(file, font.id, s.style);
    });
    return font.id;
  }

  /** Quita lo que la fuente no puede dibujar (emojis, selectores, ancho cero). */
  function pdfText(value) {
    return String(value == null ? '' : value)
      .replace(/[   ]/g, ' ')
      .replace(/[​-‏⁠︀-️﻿]/g, '')
      .replace(/[\u{10000}-\u{10ffff}]/gu, '')
      .replace(/[☀-➿]/g, '');
  }

  async function buildPdf(cv) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
    // Gelasio (Georgia) solo cubre alfabeto latino: con griego o cirílico se usa Times
    const needsWideCharset = /[Ͱ-ӿ]/.test(JSON.stringify(cv));
    const family = await registerFonts(doc, cv.font === 'georgia' && needsWideCharset ? 'times' : cv.font);
    const left = PDF.marginX;
    const right = PDF.page.w - PDF.marginX;
    const width = right - left;
    let y = PDF.marginY;

    doc.setProperties({ title: fileBase(cv), creator: 'Hardboard.' });

    const lineH = (size) => size * PDF.lead;
    const setFont = (style, size) => {
      doc.setFont(family, style || 'normal');
      doc.setFontSize(size);
    };
    const ensure = (h) => {
      if (y + h > PDF.page.h - PDF.marginY) {
        doc.addPage();
        y = PDF.marginY;
      }
    };

    /** Divide segmentos {text, style} en líneas que caben en `maxW`. */
    function wrap(segs, size, maxW) {
      const lines = [[]];
      let used = 0;
      segs.forEach((seg) => {
        setFont(seg.style, size);
        pdfText(seg.text).split(/(\s+)/).forEach((token) => {
          if (!token) return;
          const w = doc.getTextWidth(token);
          const isSpace = /^\s+$/.test(token);
          if (used + w > maxW && used > 0 && !isSpace) {
            lines.push([]);
            used = 0;
          }
          if (isSpace && used === 0) return; // sin espacios al inicio de línea
          lines[lines.length - 1].push({ text: token, style: seg.style, url: seg.url, width: w });
          used += w;
        });
      });
      return lines;
    }

    /** Dibuja una línea de fragmentos desde x (o centrada / a la derecha). */
    function drawLine(parts, size, x, align, areaW) {
      const total = parts.reduce((sum, p) => sum + p.width, 0);
      let cx = x;
      if (align === 'center') cx = x + (areaW - total) / 2;
      if (align === 'right') cx = x + areaW - total;
      parts.forEach((p) => {
        setFont(p.style, size);
        if (p.url) {
          doc.setTextColor(...PDF.link);
          doc.textWithLink(p.text, cx, y, { url: p.url });
          doc.setTextColor(0, 0, 0);
        } else {
          doc.text(p.text, cx, y);
        }
        cx += p.width;
      });
    }

    /** Párrafo con salto de línea automático. Devuelve la altura usada. */
    function paragraph(segs, opts) {
      const o = Object.assign({ size: PDF.body, x: left, w: width, align: 'left', gap: 0 }, opts);
      const lines = wrap(segs, o.size, o.w);
      lines.forEach((parts) => {
        ensure(lineH(o.size));
        y += o.size; // baseline
        drawLine(parts, o.size, o.x, o.align, o.w);
        y += lineH(o.size) - o.size;
      });
      y += o.gap;
    }

    /** Texto con saltos de línea del usuario (pre-wrap). */
    function multiline(text, opts) {
      String(text).split('\n').forEach((line) => {
        if (line.trim()) paragraph([{ text: line }], opts);
      });
    }

    function bullets(lines, indent) {
      lines.forEach((text) => {
        const x = left + (indent || 0);
        const lines2 = wrap([{ text }], PDF.body, width - (indent || 0) - 14);
        lines2.forEach((parts, i) => {
          ensure(lineH(PDF.body));
          y += PDF.body;
          if (i === 0) {
            setFont('normal', PDF.body);
            doc.text('•', x + 3, y);
          }
          drawLine(parts, PDF.body, x + 14, 'left', width);
          y += lineH(PDF.body) - PDF.body;
        });
      });
    }

    /** Fila "texto a la izquierda · fecha a la derecha". */
    function row(segs, date) {
      let dateW = 0;
      if (hasText(date)) {
        setFont('normal', PDF.small);
        dateW = doc.getTextWidth(pdfText(date)) + 12;
      }
      const lines = wrap(segs, PDF.body, width - dateW);
      lines.forEach((parts, i) => {
        ensure(lineH(PDF.body) * (i === 0 ? 2 : 1)); // evita título huérfano
        y += PDF.body;
        drawLine(parts, PDF.body, left, 'left', width);
        if (i === 0 && hasText(date)) {
          setFont('normal', PDF.small);
          doc.text(pdfText(date), right, y, { align: 'right' });
        }
        y += lineH(PDF.body) - PDF.body;
      });
    }

    function sectionTitle(title) {
      const size = 10.1;
      ensure(size + 10 + lineH(PDF.body) * 2);
      y += 12; // margen superior de la sección (16px)
      setFont('bold', size);
      y += size;
      doc.text(pdfText(title).toUpperCase(), left, y);
      y += 2;
      doc.setLineWidth(1.1);
      doc.line(left, y, right, y);
      y += 5;
    }

    /* Cabecera */
    if (hasText(cv.personal.name)) {
      const size = 16.5;
      setFont('bold', size);
      y += size;
      doc.text(pdfText(cv.personal.name).toUpperCase(), PDF.page.w / 2, y, { align: 'center', charSpace: 0.3 });
      y += 3;
    }

    const contacts = (cv.personal.contacts || []).filter((c) => hasText(c.text));
    if (contacts.length) {
      const segs = [];
      contacts.forEach((c, i) => {
        if (i > 0) segs.push({ text: '  |  ' });
        segs.push({ text: c.text, url: toHref(c.url) || undefined });
      });
      y += 3;
      paragraph(segs, { size: PDF.small, align: 'center' });
    }
    if (hasText(cv.personal.tagline)) {
      y += 2;
      paragraph([{ text: cv.personal.tagline }], { size: PDF.small, align: 'center' });
    }

    /* Secciones */
    const detail = (main, extra, extraStyle) => {
      const segs = [{ text: main || '', style: 'bold' }];
      if (hasText(extra)) {
        segs.push({ text: ' — ' });
        segs.push({ text: extra, style: extraStyle });
      }
      return segs;
    };

    visibleSections(cv).forEach((section) => {
      sectionTitle(section.title);

      switch (section.type) {
        case 'profile':
          multiline(section.text || '');
          break;

        case 'education':
          (section.entries || []).forEach((e) => {
            row(detail(e.org, e.detail, 'normal'), e.date);
            if (hasText(e.desc)) multiline(e.desc, { gap: 0 });
            y += 6;
          });
          break;

        case 'experience':
          (section.entries || []).forEach((e) => {
            row(detail(e.org, e.role, 'italic'), e.date);
            bullets(splitLines(e.bullets));
            y += 6;
          });
          break;

        case 'projects':
          (section.entries || []).forEach((e) => {
            row(detail(e.name, e.subtitle, 'italic'), e.date);
            if (hasText(e.link)) paragraph([{ text: e.link }]);
            if (hasText(e.desc)) multiline(e.desc);
            bullets(splitLines(e.bullets));
            y += 6;
          });
          break;

        case 'skills':
          (section.groups || []).forEach((g) => {
            const segs = [];
            if (hasText(g.label)) segs.push({ text: g.label + ': ', style: 'bold' });
            segs.push({ text: g.items || '' });
            paragraph(segs, { gap: 2 });
          });
          break;

        case 'courses': {
          const courses = splitLines(section.courses);
          if (courses.length) {
            paragraph([{ text: (section.coursesLabel || HB.i18n.t('editor.coursesWord', HB.preferences.get().lang)) + ':', style: 'bold' }]);
            bullets(courses);
          }
          if (hasText(section.languages)) {
            paragraph([
              { text: (section.languagesLabel || HB.i18n.t('editor.languagesWord', HB.preferences.get().lang)) + ': ', style: 'bold' },
              { text: section.languages }
            ], { gap: 2 });
          }
          break;
        }

        default:
          break;
      }
    });

    return doc.output('blob');
  }

  /* ======================================================================
     DOCX (docx, editable en Word / Google Docs)
     ====================================================================== */

  async function buildDocx(cv) {
    const d = window.docx;
    const font = FONT_NAMES[cv.font] || 'Arial';
    const lang = HB.preferences.get().lang;
    const tr = (key) => HB.i18n.t('editor.' + key, lang);

    const PAGE_W = 12240;
    const MARGIN_X = 864; // 0.6in
    const TEXT_W = PAGE_W - MARGIN_X * 2;
    const BODY = 18;  // 9pt en medios puntos
    const SMALL = 17;

    const run = (text, o) => new d.TextRun(Object.assign({ text: String(text == null ? '' : text), font, size: BODY }, o));
    const para = (children, o) => new d.Paragraph(Object.assign({ children, spacing: { after: 0, line: 276 } }, o));
    const withDate = (children, date) => {
      if (!hasText(date)) return para(children);
      children.push(new d.TextRun({ children: [new d.Tab(), String(date)], font, size: SMALL }));
      return para(children, { tabStops: [{ type: d.TabStopType.RIGHT, position: TEXT_W }] });
    };
    const bulletParas = (lines) => lines.map((text) =>
      para([run(text)], { bullet: { level: 0 }, spacing: { after: 20, line: 276 } }));
    const textParas = (text) => String(text).split('\n').filter((l) => l.trim()).map((l) => para([run(l)]));
    const spacer = (after) => para([run('')], { spacing: { after: after || 100, line: 120 } });

    const children = [];

    if (hasText(cv.personal.name)) {
      children.push(para([run(cv.personal.name, { bold: true, allCaps: true, size: 33 })], { alignment: d.AlignmentType.CENTER }));
    }

    const contacts = (cv.personal.contacts || []).filter((c) => hasText(c.text));
    if (contacts.length) {
      const parts = [];
      contacts.forEach((c, i) => {
        if (i > 0) parts.push(run('  |  ', { size: SMALL }));
        const href = toHref(c.url);
        parts.push(href
          ? new d.ExternalHyperlink({ link: href, children: [run(c.text, { size: SMALL, color: '1A56C9' })] })
          : run(c.text, { size: SMALL }));
      });
      children.push(para(parts, { alignment: d.AlignmentType.CENTER, spacing: { before: 60, after: 0, line: 276 } }));
    }
    if (hasText(cv.personal.tagline)) {
      children.push(para([run(cv.personal.tagline, { size: SMALL })], { alignment: d.AlignmentType.CENTER }));
    }

    const titled = (main, extra, extraOpts) => {
      const parts = [run(main || '', { bold: true })];
      if (hasText(extra)) {
        parts.push(run(' — '));
        parts.push(run(extra, extraOpts));
      }
      return parts;
    };

    visibleSections(cv).forEach((section) => {
      children.push(para([run(section.title, { bold: true, allCaps: true, size: 20 })], {
        keepNext: true,
        spacing: { before: 240, after: 100, line: 276 },
        border: { bottom: { style: d.BorderStyle.SINGLE, size: 8, color: '000000', space: 1 } }
      }));

      switch (section.type) {
        case 'profile':
          children.push(...textParas(section.text || ''));
          break;

        case 'education':
          (section.entries || []).forEach((e) => {
            children.push(withDate(titled(e.org, e.detail), e.date));
            if (hasText(e.desc)) children.push(...textParas(e.desc));
            children.push(spacer());
          });
          break;

        case 'experience':
          (section.entries || []).forEach((e) => {
            children.push(withDate(titled(e.org, e.role, { italics: true }), e.date));
            children.push(...bulletParas(splitLines(e.bullets)));
            children.push(spacer());
          });
          break;

        case 'projects':
          (section.entries || []).forEach((e) => {
            children.push(withDate(titled(e.name, e.subtitle, { italics: true }), e.date));
            if (hasText(e.link)) children.push(para([run(e.link)]));
            if (hasText(e.desc)) children.push(...textParas(e.desc));
            children.push(...bulletParas(splitLines(e.bullets)));
            children.push(spacer());
          });
          break;

        case 'skills':
          (section.groups || []).forEach((g) => {
            const parts = [];
            if (hasText(g.label)) parts.push(run(g.label + ': ', { bold: true }));
            parts.push(run(g.items || ''));
            children.push(para(parts, { spacing: { after: 40, line: 276 } }));
          });
          break;

        case 'courses': {
          const courses = splitLines(section.courses);
          if (courses.length) {
            children.push(para([run((section.coursesLabel || tr('coursesWord')) + ':', { bold: true })]));
            children.push(...bulletParas(courses));
          }
          if (hasText(section.languages)) {
            children.push(para([
              run((section.languagesLabel || tr('languagesWord')) + ': ', { bold: true }),
              run(section.languages)
            ], { spacing: { before: 40, after: 0, line: 276 } }));
          }
          break;
        }

        default:
          break;
      }
    });

    const document = new d.Document({
      creator: 'Hardboard.',
      title: fileBase(cv),
      styles: { default: { document: { run: { font, size: BODY } } } },
      sections: [{
        properties: {
          page: {
            size: { width: PAGE_W, height: 15840 },
            margin: { top: 720, bottom: 720, left: MARGIN_X, right: MARGIN_X }
          }
        },
        children
      }]
    });

    return d.Packer.toBlob(document);
  }

  /* ----- API pública ----- */

  const BUILDERS = { pdf: buildPdf, docx: buildDocx };

  /**
   * Genera y descarga el CV actual. `kind` = 'pdf' | 'docx'.
   * Rechaza si la librería no carga o la generación falla.
   */
  async function download(kind, cv) {
    if (!BUILDERS[kind]) throw new Error('Formato desconocido: ' + kind);
    await loadLibrary(kind);
    const blob = await BUILDERS[kind](cv);
    saveBlob(new Blob([blob], { type: MIME[kind] }), fileBase(cv) + '.' + kind);
  }

  HB.cvExport = { download, fileBase, buildPdf };
})(window.HB);
