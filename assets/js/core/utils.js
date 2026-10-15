/* ==========================================================================
   core/utils.js
   Funciones puras y pequeñas, sin dependencias ni acceso al DOM.
   ========================================================================== */
(function (HB) {
  'use strict';

  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /** Escapa texto para insertarlo de forma segura en HTML (previene XSS). */
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
  }

  /** Identificador corto y único para secciones y entradas. */
  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  /** true si el valor tiene contenido además de espacios en blanco. */
  function hasText(value) {
    return String(value || '').trim().length > 0;
  }

  /**
   * Convierte un texto multilínea en una lista de viñetas limpias:
   * quita marcadores "•", "-" o "*" iniciales y descarta líneas vacías.
   */
  function splitLines(text) {
    return String(text || '')
      .split('\n')
      .map((line) => line.replace(/^\s*[•\-*]\s*/, '').trim())
      .filter(Boolean);
  }

  /**
   * Normaliza lo que escribe el usuario a un href válido.
   * - Respeta http(s), mailto y tel.
   * - Si parece un correo, agrega mailto:.
   * - En cualquier otro caso asume https://
   * Nunca devuelve un esquema peligroso (p. ej. javascript:).
   */
  function toHref(url) {
    const value = String(url || '').trim();
    if (!value) return '';
    if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
    if (value.includes('@')) return 'mailto:' + value;
    return 'https://' + value;
  }

  /** Copia profunda de datos JSON simples. */
  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  HB.utils = { escapeHtml, uid, hasText, splitLines, toHref, clone };
})(window.HB);
