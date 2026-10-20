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

  /** "#rrggbb" → [r, g, b]. */
  function hexToRgb(hex) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /** Foto del CV recortada en círculo (PNG con transparencia), o null si no hay. */
  function circlePhoto(photo, size) {
    if (!/^data:image\//.test(photo || '')) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = photo;
    });
  }

  /* Colores de las plantillas (RGB) */
  const TPL_COLORS = {
    vitae:   { text: [34, 34, 34], accent: [44, 79, 134], muted: [85, 85, 85], line: [181, 181, 181], profile: [51, 51, 51] },
    generic: { text: [17, 17, 17], muted: [85, 85, 85], date: [102, 102, 102], tagline: [102, 102, 102], line: [181, 181, 181] }
  };

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
    let left = PDF.marginX;
    let right = PDF.page.w - PDF.marginX;
    let width = right - left;
    let y = PDF.marginY;
    let lead = PDF.lead;
    let baseColor = [0, 0, 0];
    const template = HB.cvModel.templateOf(cv);

    doc.setProperties({ title: fileBase(cv), creator: 'Hardboard.' });

    const lineH = (size) => size * lead;
    const setFont = (style, size, fam) => {
      doc.setFont(fam || family, style || 'normal');
      doc.setFontSize(size);
    };
    const pageNo = () => doc.internal.getCurrentPageInfo().pageNumber;
    // Salta a la página siguiente; si ya existe (otra columna la creó) la reutiliza
    const ensure = (h) => {
      if (y + h > PDF.page.h - PDF.marginY) {
        if (pageNo() < doc.getNumberOfPages()) doc.setPage(pageNo() + 1);
        else doc.addPage();
        y = PDF.marginY;
      }
    };

    /** Divide segmentos {text, style} en líneas que caben en `maxW`. */
    function wrap(segs, size, maxW) {
      const lines = [[]];
      let used = 0;
      segs.forEach((seg) => {
        setFont(seg.style, size, seg.family);
        pdfText(seg.text).split(/(\s+)/).forEach((token) => {
          if (!token) return;
          const w = doc.getTextWidth(token);
          const isSpace = /^\s+$/.test(token);
          if (used + w > maxW && used > 0 && !isSpace) {
            lines.push([]);
            used = 0;
          }
          if (isSpace && used === 0) return; // sin espacios al inicio de línea
          lines[lines.length - 1].push({ text: token, style: seg.style, url: seg.url, color: seg.color, family: seg.family, width: w });
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
        setFont(p.style, size, p.family);
        if (p.url) {
          doc.setTextColor(...(p.color || (template === 'harvard' ? PDF.link : baseColor)));
          doc.textWithLink(p.text, cx, y, { url: p.url });
        } else {
          doc.setTextColor(...(p.color || baseColor));
          doc.text(p.text, cx, y);
        }
        cx += p.width;
      });
      doc.setTextColor(...baseColor);
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

    /** Viñetas. opts: { size, marker (color), segs (fragmentos en lugar de texto), gap } */
    function bullets(lines, indent, opts) {
      const o = Object.assign({ size: PDF.body, gap: 0 }, opts);
      lines.forEach((item) => {
        const x = left + (indent || 0);
        const segs = typeof item === 'string' ? [{ text: item }] : item;
        const lines2 = wrap(segs, o.size, width - (indent || 0) - 14);
        lines2.forEach((parts, i) => {
          ensure(lineH(o.size));
          y += o.size;
          if (i === 0) {
            setFont('normal', o.size);
            doc.setTextColor(...(o.marker || baseColor));
            doc.text('•', x + 3, y);
          }
          drawLine(parts, o.size, x + 14, 'left', width);
          y += lineH(o.size) - o.size;
        });
        y += o.gap;
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

    /* ------------------------------------------------------------------
       Plantillas Vitae y Genérico (cabecera propia + dos columnas).
       Las medidas son las de la hoja HTML (px × 0.75).
       ------------------------------------------------------------------ */
    async function buildTemplatePdf() {
      const isVitae = template === 'vitae';
      const C = TPL_COLORS[template];
      const T = 8.6; // 11.5px
      const pageW = PDF.page.w;
      const fullLeft = PDF.marginX;
      const fullW = pageW - PDF.marginX * 2;
      const headFamily = isVitae && !needsWideCharset ? await registerFonts(doc, 'georgia') : family;
      const photo = isVitae ? await circlePhoto(cv.personal.photo, 360) : null;
      const cols = HB.cvModel.splitColumns(cv);
      const lang = HB.preferences.get().lang;
      const accent = C.accent || C.text;

      baseColor = C.text;
      lead = isVitae ? 1.45 : 1.5;
      doc.setTextColor(...baseColor);

      /** Texto con espaciado entre letras: lo parte en líneas que caben en maxW. */
      function spacedLines(text, size, style, cs, maxW, fam) {
        setFont(style, size, fam);
        const measure = (s) => doc.getTextWidth(s) + s.length * cs;
        const lines = [];
        let current = '';
        pdfText(text).split(/\s+/).filter(Boolean).forEach((word) => {
          const attempt = current ? current + ' ' + word : word;
          if (current && measure(attempt) > maxW) {
            lines.push(current);
            current = word;
          } else {
            current = attempt;
          }
        });
        if (current) lines.push(current);
        return lines;
      }

      function drawSpaced(lines, size, style, cs, x, align, areaW, lineHeight, color, fam) {
        lines.forEach((text) => {
          setFont(style, size, fam);
          doc.setTextColor(...color);
          y += size;
          const textW = doc.getTextWidth(text) + (text.length - 1) * cs;
          const cx = align === 'center' ? x + (areaW - textW) / 2 : x;
          doc.text(text, cx, y, { charSpace: cs });
          y += lineHeight - size;
        });
        doc.setTextColor(...baseColor);
      }

      function title(text, align) {
        const size = isVitae ? 9.75 : T;
        const cs = isVitae ? size * 0.02 : size * 0.08;
        const lines = spacedLines(String(text || '').toUpperCase(), size, 'bold', cs, width, headFamily);
        ensure(size * 1.4 + lineH(T) * 2);
        drawSpaced(lines, size, 'bold', cs, left, align || 'left', width, lineH(size), baseColor, headFamily);
        y += (align === 'center' ? 7.5 : (isVitae ? 6.75 : 9)) - (lineH(size) - size);
      }

      const line = (segs, opts) => paragraph(segs, Object.assign({ size: T }, opts));

      /* ----- Cuerpo de cada tipo de sección ----- */
      const itemGap = isVitae ? 1.5 : 2.25;
      const bulletOpts = { size: T, gap: itemGap, marker: isVitae ? accent : undefined };

      function skillSegs(g) {
        const segs = [];
        if (hasText(g.label)) segs.push({ text: g.label + ': ', style: 'bold' });
        segs.push({ text: g.items || '' });
        return segs;
      }

      const BODY = {
        profile(s, align) {
          String(s.text || '').split('\n').forEach((l) => {
            if (l.trim()) line([{ text: l }], { align: align || 'left', gap: 0 });
          });
        },

        education(s) {
          (s.entries || []).forEach((e) => {
            if (hasText(e.detail)) {
              line([{ text: isVitae ? pdfText(e.detail).toUpperCase() : e.detail, style: isVitae ? 'normal' : 'bold' }]);
            }
            line([{ text: e.org || '' }]);
            if (hasText(e.date)) line([{ text: e.date, color: isVitae ? C.muted : C.date }]);
            y += 9;
          });
          y -= 9;
        },

        skills(s) {
          if (isVitae) y += 3;
          bullets((s.groups || []).map(skillSegs), 0, bulletOpts);
        },

        courses(s) {
          const courses = splitLines(s.courses);
          if (isVitae) y += 3;
          if (courses.length) bullets(courses, 0, bulletOpts);
          if (hasText(s.languages)) {
            const segs = [
              { text: (s.languagesLabel || HB.i18n.t('editor.languagesWord', lang)) + ': ', style: 'bold' },
              { text: s.languages }
            ];
            if (isVitae) {
              if (courses.length) y += 6;
              line(segs);
            } else {
              bullets([segs], 0, bulletOpts);
            }
          }
        },

        experience(s) {
          const gap = isVitae ? 10.5 : 12;
          (s.entries || []).forEach((e) => {
            ensure(lineH(T) * 4); // título + fecha + primera viñeta juntos
            if (isVitae) {
              const head = (hasText(e.role) ? e.role + ' | ' : '') + (e.org || '');
              line([{ text: pdfText(head).toUpperCase() }]);
              if (hasText(e.date)) line([{ text: e.date, style: 'italic', color: accent }]);
            } else {
              if (hasText(e.role)) line([{ text: e.role, style: 'bold' }], { size: 9.4 });
              line([{ text: (e.org || '') + (hasText(e.date) ? ' - ' + e.date : ''), color: C.muted }]);
            }
            const items = splitLines(e.bullets);
            if (items.length) {
              y += 3;
              bullets(items, 0, bulletOpts);
            }
            y += gap;
          });
          y -= gap;
        },

        projects(s) {
          const gap = isVitae ? 10.5 : 12;
          (s.entries || []).forEach((e) => {
            ensure(lineH(T) * 4); // título + fecha + primera viñeta juntos
            if (isVitae) {
              const head = (e.name || '') + (hasText(e.subtitle) ? ' | ' + e.subtitle : '');
              line([{ text: pdfText(head).toUpperCase() }]);
              if (hasText(e.date)) line([{ text: e.date, style: 'italic', color: accent }]);
            } else {
              if (hasText(e.name)) line([{ text: e.name, style: 'bold' }], { size: 9.4 });
              if (hasText(e.subtitle) || hasText(e.date)) {
                const sub = (e.subtitle || '') + (hasText(e.date) ? (hasText(e.subtitle) ? ' - ' : '') + e.date : '');
                line([{ text: sub, color: C.muted }]);
              }
            }
            if (hasText(e.desc)) {
              y += 2.25;
              multiline(e.desc, { size: T });
            }
            const items = splitLines(e.bullets);
            if (items.length) {
              y += 3;
              bullets(items, 0, bulletOpts);
            }
            y += gap;
          });
          y -= gap;
        }
      };

      function section(s) {
        if (!BODY[s.type]) return;
        title(s.title);
        BODY[s.type](s);
      }

      /* Contactos de la columna izquierda (solo Vitae): círculo + texto */
      function vitaeContacts() {
        const contacts = (cv.personal.contacts || []).filter((c) => hasText(c.text));
        if (!contacts.length) return;
        title(HB.i18n.t('editor.contacts', lang));
        contacts.forEach((c) => {
          ensure(lineH(T));
          doc.setDrawColor(...accent);
          doc.setLineWidth(0.9);
          doc.circle(left + 4.1, y + 2.25 + 4.1, 3.5, 'S');
          paragraph([{ text: c.text, url: toHref(c.url) || undefined }], { size: T, x: left + 14.25, w: width - 14.25, gap: 5.25 });
        });
        y -= 5.25;
      }

      /* ----- Cabecera ----- */
      const name = String(cv.personal.name || '');
      const tagline = String(cv.personal.tagline || '');

      if (isVitae) {
        const hx = 9;
        const hy = 9;
        const hw = pageW - 18;
        const textW = hw - 43.5 - 157.5;
        const nameLines = hasText(name) ? spacedLines(name.toUpperCase(), 22.5, 'bold', 2.7, textW) : [];
        const tagLines = hasText(tagline) ? spacedLines(tagline.toUpperCase(), 10.5, 'bold', 1.47, textW) : [];
        const nameH = nameLines.length * 22.5 * 1.15;
        const tagH = tagLines.length ? 9 + tagLines.length * lineH(10.5) : 0;
        const hh = Math.max(112.5, 30 + nameH + tagH + 25.5);

        doc.setFillColor(...hexToRgb(HB.cvModel.vitaeHex(cv)));
        doc.roundedRect(hx, hy, hw, hh, 13.5, 13.5, 'F');

        y = hy + 30;
        drawSpaced(nameLines, 22.5, 'bold', 2.7, hx + 43.5, 'left', textW, 22.5 * 1.15, [255, 255, 255]);
        if (tagLines.length) {
          y += 9;
          drawSpaced(tagLines, 10.5, 'bold', 1.47, hx + 43.5, 'left', textW, lineH(10.5), [255, 255, 255]);
        }

        const r = 43.5;
        const cx = hx + hw - 43.5 - r;
        const cy = hy + 13.5 + r;
        if (photo) {
          const inner = r - 2.25;
          doc.addImage(photo, 'PNG', cx - inner, cy - inner, inner * 2, inner * 2);
        } else {
          doc.setFillColor(90, 90, 90);
          doc.circle(cx, cy, r - 1.125, 'F');
        }
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(2.25);
        doc.circle(cx, cy, r - 1.125, 'S');

        y = hy + hh;
      } else {
        y = PDF.marginY;
        if (hasText(name)) {
          drawSpaced(spacedLines(name.toUpperCase(), 24, 'bold', 0.48, fullW), 24, 'bold', 0.48, fullLeft, 'center', fullW, 26.4, baseColor);
        }
        if (hasText(tagline)) {
          y += 4.5;
          drawSpaced(spacedLines(tagline.toUpperCase(), 11.25, 'normal', 0.675, fullW), 11.25, 'normal', 0.675, fullLeft, 'center', fullW, lineH(11.25), C.tagline);
        }
        const contacts = (cv.personal.contacts || []).filter((c) => hasText(c.text));
        if (contacts.length) {
          y += 10.5;
          setFont('normal', 8.25);
          const items = contacts.map((c) => ({ text: pdfText(c.text), url: toHref(c.url) || undefined, w: doc.getTextWidth(pdfText(c.text)) }));
          const rows = [[]];
          let used = 0;
          items.forEach((it) => {
            const row = rows[rows.length - 1];
            const need = it.w + (row.length ? 16.5 : 0);
            if (row.length && used + need > fullW) {
              rows.push([it]);
              used = it.w;
            } else {
              row.push(it);
              used += need;
            }
          });
          rows.forEach((row, i) => {
            const total = row.reduce((sum, it) => sum + it.w, 0) + 16.5 * (row.length - 1);
            let cx = fullLeft + (fullW - total) / 2;
            ensure(lineH(8.25));
            y += 8.25;
            row.forEach((it) => {
              setFont('normal', 8.25);
              doc.setTextColor(...baseColor);
              if (it.url) doc.textWithLink(it.text, cx, y, { url: it.url });
              else doc.text(it.text, cx, y);
              cx += it.w + 16.5;
            });
            y += lineH(8.25) - 8.25 + (i < rows.length - 1 ? 4.5 : 0);
          });
        }
        y += 10.5;
      }

      /* ----- Perfil a todo el ancho ----- */
      cols.top.forEach((s) => {
        if (isVitae) {
          y += 13.5;
          doc.setDrawColor(...C.line);
          doc.setLineWidth(0.75);
          doc.line(fullLeft, y, fullLeft + fullW, y);
          y += 10.5;
          title(s.title);
          lead = 1.5;
          baseColor = C.profile;
          doc.setTextColor(...baseColor);
          BODY.profile(s);
          baseColor = C.text;
          doc.setTextColor(...baseColor);
          lead = 1.45;
          y += 10.5;
          doc.line(fullLeft, y, fullLeft + fullW, y);
          y += 15;
        } else {
          y += 16.5;
          left = (pageW - 450) / 2;
          width = 450;
          right = left + width;
          title(s.title, 'center');
          BODY.profile(s, 'center');
          left = fullLeft;
          width = fullW;
          right = fullLeft + fullW;
          y += 19.5;
        }
      });

      /* ----- Dos columnas independientes que fluyen entre páginas ----- */
      const half = isVitae ? fullW * 0.4 : fullW / 2;
      const geometry = {
        leftX: fullLeft, leftW: half - 22.5,
        dividerX: fullLeft + half,
        rightX: fullLeft + half + 22.5, rightW: fullW - half - 22.5
      };
      const sectionGap = isVitae ? 16.5 : 21;

      const startPage = pageNo();
      const startY = y;

      function runColumn(x, w, fn) {
        doc.setPage(startPage);
        y = startY;
        left = x;
        width = w;
        right = x + w;
        fn();
        return { page: pageNo(), y };
      }

      function sectionsOf(list, pre) {
        return () => {
          let first = true;
          if (pre) {
            const before = y;
            pre();
            first = y === before;
          }
          list.forEach((s) => {
            if (!first) y += sectionGap;
            first = false;
            section(s);
          });
        };
      }

      const leftEnd = runColumn(geometry.leftX, geometry.leftW, sectionsOf(cols.left, isVitae ? vitaeContacts : null));
      const rightEnd = runColumn(geometry.rightX, geometry.rightW, sectionsOf(cols.right));

      // Línea divisoria entre columnas, página por página
      const endPage = Math.max(leftEnd.page, rightEnd.page);
      const endOn = (pg) => Math.max(leftEnd.page === pg ? leftEnd.y : 0, rightEnd.page === pg ? rightEnd.y : 0);
      doc.setDrawColor(...C.line);
      doc.setLineWidth(0.75);
      for (let pg = startPage; pg <= endPage; pg++) {
        doc.setPage(pg);
        const top = pg === startPage ? startY : PDF.marginY;
        const bottom = pg === endPage ? endOn(pg) : PDF.page.h - PDF.marginY;
        if (bottom > top) doc.line(geometry.dividerX, top, geometry.dividerX, bottom);
      }
    }

    if (template !== 'harvard') {
      await buildTemplatePdf();
      return doc.output('blob');
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

    const pack = (children) => d.Packer.toBlob(new d.Document({
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
    }));

    /* ------------------------------------------------------------------
       Plantillas Vitae y Genérico: cabecera + tabla de dos columnas.
       (Word no admite esquinas redondeadas ni fotos recortadas como la
       hoja; la cabecera es un recuadro de color con la foto circular.)
       ------------------------------------------------------------------ */
    const template = HB.cvModel.templateOf(cv);

    async function buildTemplateDocx() {
      const isVitae = template === 'vitae';
      const C = TPL_COLORS[template];
      const hex = (rgb) => rgb.map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
      const TS = 17; // 8.6pt en medios puntos
      const textColor = hex(C.text);
      const mutedColor = hex(C.muted);
      const accent = C.accent ? hex(C.accent) : textColor;
      const headFont = isVitae ? 'Georgia' : font;
      const cols = HB.cvModel.splitColumns(cv);
      const photo = isVitae ? await circlePhoto(cv.personal.photo, 360) : null;

      const r = (text, o) => run(text, Object.assign({ size: TS, color: textColor }, o));
      const line = (runs, o) => para(runs, Object.assign({ spacing: { after: 0, line: isVitae ? 290 : 300 } }, o));
      const bl = (runs) => line(runs, { bullet: { level: 0 }, spacing: { after: 30, line: isVitae ? 290 : 300 } });
      const gap = (after) => para([r('')], { spacing: { after: after || 120, line: 120 } });
      const none = { style: d.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
      const noBorders = { top: none, bottom: none, left: none, right: none };
      const tableBorders = Object.assign({ insideHorizontal: none, insideVertical: none }, noBorders);
      const rule = { style: d.BorderStyle.SINGLE, size: 6, color: hex(C.line), space: 6 };
      const link = (c) => {
        const href = toHref(c.url);
        return href
          ? new d.ExternalHyperlink({ link: href, children: [r(c.text, { size: isVitae ? TS : 16 })] })
          : r(c.text, { size: isVitae ? TS : 16 });
      };

      function sectionTitle(text, first, centered) {
        return para([r(String(text || '').toUpperCase(), { bold: true, font: headFont, size: isVitae ? 20 : TS, characterSpacing: isVitae ? 4 : 14 })], {
          keepNext: true,
          alignment: centered ? d.AlignmentType.CENTER : undefined,
          spacing: { before: first ? 0 : 320, after: 140, line: 276 }
        });
      }

      const bulletsOf = (lines) => lines.map((t) => bl([r(t)]));
      const textOf = (text, o) => String(text || '').split('\n').filter((l) => l.trim()).map((l) => line([r(l)], o));

      const BODY = {
        profile: (s, centered) => textOf(s.text, centered ? { alignment: d.AlignmentType.CENTER } : undefined),

        education: (s) => {
          const out = [];
          (s.entries || []).forEach((e) => {
            if (hasText(e.detail)) out.push(line([r(isVitae ? e.detail.toUpperCase() : e.detail, { bold: !isVitae })]));
            out.push(line([r(e.org || '')]));
            if (hasText(e.date)) out.push(line([r(e.date, { color: isVitae ? mutedColor : hex(C.date) })]));
            out.push(gap());
          });
          return out;
        },

        skills: (s) => (s.groups || []).map((g) => bl([
          ...(hasText(g.label) ? [r(g.label + ': ', { bold: true })] : []),
          r(g.items || '')
        ])),

        courses: (s) => {
          const out = bulletsOf(splitLines(s.courses));
          if (hasText(s.languages)) {
            const label = r((s.languagesLabel || tr('languagesWord')) + ': ', { bold: true });
            out.push(isVitae ? line([label, r(s.languages)], { spacing: { before: 100, after: 0, line: 290 } }) : bl([label, r(s.languages)]));
          }
          return out;
        },

        experience: (s) => {
          const out = [];
          (s.entries || []).forEach((e) => {
            if (isVitae) {
              out.push(line([r(((hasText(e.role) ? e.role + ' | ' : '') + (e.org || '')).toUpperCase())]));
              if (hasText(e.date)) out.push(line([r(e.date, { italics: true, color: accent })]));
            } else {
              if (hasText(e.role)) out.push(line([r(e.role, { bold: true, size: 19 })]));
              out.push(line([r((e.org || '') + (hasText(e.date) ? ' - ' + e.date : ''), { color: mutedColor })]));
            }
            out.push(...bulletsOf(splitLines(e.bullets)));
            out.push(gap(160));
          });
          return out;
        },

        projects: (s) => {
          const out = [];
          (s.entries || []).forEach((e) => {
            if (isVitae) {
              out.push(line([r(((e.name || '') + (hasText(e.subtitle) ? ' | ' + e.subtitle : '')).toUpperCase())]));
              if (hasText(e.date)) out.push(line([r(e.date, { italics: true, color: accent })]));
            } else {
              if (hasText(e.name)) out.push(line([r(e.name, { bold: true, size: 19 })]));
              if (hasText(e.subtitle) || hasText(e.date)) {
                out.push(line([r((e.subtitle || '') + (hasText(e.date) ? (hasText(e.subtitle) ? ' - ' : '') + e.date : ''), { color: mutedColor })]));
              }
            }
            if (hasText(e.desc)) out.push(...textOf(e.desc));
            out.push(...bulletsOf(splitLines(e.bullets)));
            out.push(gap(160));
          });
          return out;
        }
      };

      const sectionParas = (s, first) => (BODY[s.type] ? [sectionTitle(s.title, first), ...BODY[s.type](s)] : []);

      /* ----- Cabecera ----- */
      const out = [];
      const name = String(cv.personal.name || '');
      const tagline = String(cv.personal.tagline || '');

      if (isVitae) {
        const white = { color: 'FFFFFF' };
        const textW = photo ? TEXT_W - 2300 : TEXT_W;
        const textCell = new d.TableCell({
          width: { size: textW, type: d.WidthType.DXA },
          shading: { type: d.ShadingType.CLEAR, fill: HB.cvModel.vitaeHex(cv).slice(1).toUpperCase(), color: 'auto' },
          margins: { top: 380, bottom: 380, left: 560, right: 200 },
          verticalAlign: d.VerticalAlign.CENTER,
          borders: noBorders,
          children: [
            para([run(name.toUpperCase(), Object.assign({ bold: true, size: 40, characterSpacing: 54 }, white))], { spacing: { after: 160, line: 276 } }),
            ...(hasText(tagline) ? [para([run(tagline.toUpperCase(), Object.assign({ bold: true, size: 21, characterSpacing: 29 }, white))], { spacing: { after: 0, line: 300 } })] : [])
          ]
        });
        const cells = [textCell];
        if (photo) {
          const bytes = Uint8Array.from(atob(photo.split(',')[1]), (ch) => ch.charCodeAt(0));
          cells.push(new d.TableCell({
            width: { size: 2300, type: d.WidthType.DXA },
            shading: { type: d.ShadingType.CLEAR, fill: HB.cvModel.vitaeHex(cv).slice(1).toUpperCase(), color: 'auto' },
            margins: { top: 200, bottom: 200, left: 100, right: 400 },
            verticalAlign: d.VerticalAlign.CENTER,
            borders: noBorders,
            children: [para([new d.ImageRun({ data: bytes, transformation: { width: 100, height: 100 } })], { alignment: d.AlignmentType.RIGHT })]
          }));
        }
        out.push(new d.Table({
          width: { size: TEXT_W, type: d.WidthType.DXA },
          columnWidths: photo ? [textW, 2300] : [textW],
          borders: tableBorders,
          rows: [new d.TableRow({ children: cells })]
        }));
        out.push(gap(200));
      } else {
        if (hasText(name)) out.push(para([r(name.toUpperCase(), { bold: true, size: 48, characterSpacing: 10 })], { alignment: d.AlignmentType.CENTER, spacing: { after: 80, line: 276 } }));
        if (hasText(tagline)) out.push(para([r(tagline.toUpperCase(), { size: 22, color: hex(C.tagline), characterSpacing: 14 })], { alignment: d.AlignmentType.CENTER, spacing: { after: 140, line: 276 } }));
        const contacts = (cv.personal.contacts || []).filter((c) => hasText(c.text));
        if (contacts.length) {
          const parts = [];
          contacts.forEach((c, i) => {
            if (i > 0) parts.push(r('     ', { size: 16 }));
            parts.push(link(c));
          });
          out.push(para(parts, { alignment: d.AlignmentType.CENTER, spacing: { after: 200, line: 276 } }));
        }
      }

      /* ----- Perfil ----- */
      cols.top.forEach((s) => {
        const body = BODY.profile(s, !isVitae);
        const head = sectionTitle(s.title, true, !isVitae);
        if (isVitae) {
          out.push(new d.Paragraph({ children: [], spacing: { after: 0, line: 40 }, border: { top: rule } }));
          out.push(head, ...body);
          out.push(new d.Paragraph({ children: [], spacing: { before: 120, after: 200, line: 40 }, border: { bottom: rule } }));
        } else {
          out.push(head, ...body, gap(260));
        }
      });

      /* ----- Dos columnas ----- */
      const leftW = Math.round(TEXT_W * (isVitae ? 0.4 : 0.5));
      const rightW = TEXT_W - leftW;
      const build = (list, extra) => {
        const children = [];
        if (extra) children.push(...extra);
        list.forEach((s) => children.push(...sectionParas(s, children.length === 0)));
        return children.length ? children : [para([r('')])];
      };

      let leftExtra = null;
      const contacts = (cv.personal.contacts || []).filter((c) => hasText(c.text));
      if (isVitae && contacts.length) {
        leftExtra = [sectionTitle(tr('contacts'), true), ...contacts.map((c) => line([r('○  '), link(c)], { spacing: { after: 90, line: 290 } }))];
      }

      out.push(new d.Table({
        width: { size: TEXT_W, type: d.WidthType.DXA },
        columnWidths: [leftW, rightW],
        borders: tableBorders,
        rows: [new d.TableRow({
          children: [
            new d.TableCell({
              width: { size: leftW, type: d.WidthType.DXA },
              margins: { top: 0, bottom: 0, left: 0, right: 360 },
              borders: Object.assign({}, noBorders, { right: { style: d.BorderStyle.SINGLE, size: 6, color: hex(C.line) } }),
              children: build(cols.left, leftExtra)
            }),
            new d.TableCell({
              width: { size: rightW, type: d.WidthType.DXA },
              margins: { top: 0, bottom: 0, left: 360, right: 0 },
              borders: noBorders,
              children: build(cols.right)
            })
          ]
        })]
      }));

      return pack(out);
    }

    if (template !== 'harvard') return buildTemplateDocx();

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

    return pack(children);
  }

  /* ----- Entrega en móvil -----
     En iOS y en navegadores integrados (WhatsApp, Instagram…) el clic
     automático de descarga se bloquea cuando ocurre tras esperar a que
     carguen las librerías: el "toque" del usuario ya caducó. Por eso, en
     móvil se muestra un diálogo con un botón real que el usuario toca. */

  const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

  let activeDialog = null;

  function closeDialog() {
    if (!activeDialog) return;
    URL.revokeObjectURL(activeDialog.url);
    activeDialog.node.remove();
    activeDialog = null;
  }

  function showMobileDialog(blob, filename) {
    closeDialog();
    const lang = HB.preferences.get().lang;
    const tr = (key) => HB.i18n.t('editor.' + key, lang);
    const url = URL.createObjectURL(blob);
    const file = typeof File === 'function' ? new File([blob], filename, { type: blob.type }) : null;
    const canShare = Boolean(file && navigator.canShare && navigator.canShare({ files: [file] }));

    const node = document.createElement('div');
    node.className = 'file-dialog';
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'true');
    node.innerHTML = '<div class="file-dialog__box">'
      + '<p class="file-dialog__title"></p>'
      + '<p class="file-dialog__name"></p>'
      + '<div class="file-dialog__actions"></div></div>';
    node.querySelector('.file-dialog__title').textContent = tr('fileReady');
    node.querySelector('.file-dialog__name').textContent = filename;
    const actions = node.querySelector('.file-dialog__actions');

    if (canShare) {
      const share = document.createElement('button');
      share.type = 'button';
      share.className = 'btn-solid';
      share.textContent = tr('shareFile');
      share.addEventListener('click', () => {
        navigator.share({ files: [file], title: filename }).catch(() => {});
      });
      actions.appendChild(share);
    }

    const save = document.createElement('a');
    save.className = canShare ? 'btn-mono' : 'btn-solid';
    save.href = url;
    save.download = filename;
    save.textContent = tr('saveFile');
    // iOS ignora a veces "download" con blobs: abrir en otra pestaña permite guardarlo
    if (/iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent)) save.target = '_blank';
    actions.appendChild(save);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn-mono';
    close.textContent = tr('close');
    close.addEventListener('click', closeDialog);
    actions.appendChild(close);

    node.addEventListener('click', (event) => { if (event.target === node) closeDialog(); });
    document.body.appendChild(node);
    activeDialog = { node, url };
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
    const blob = new Blob([await BUILDERS[kind](cv)], { type: MIME[kind] });
    const filename = fileBase(cv) + '.' + kind;
    if (isMobile()) showMobileDialog(blob, filename);
    else saveBlob(blob, filename);
  }

  HB.cvExport = { download, fileBase, buildPdf };
})(window.HB);
