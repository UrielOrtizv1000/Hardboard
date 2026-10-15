/* ==========================================================================
   core/i18n.js
   Internacionalización (ES / EN).

   - Los diccionarios viven en js/i18n/es.js y js/i18n/en.js y se registran
     con HB.i18n.register(lang, diccionario).
   - Las claves usan puntos: t('editor.fullName') → dictionary.editor.fullName
   - En el HTML se marcan los textos estáticos con atributos:
         data-i18n="clave"               → reemplaza el textContent
         data-i18n-title="clave"         → atributo title
         data-i18n-placeholder="clave"   → atributo placeholder
         data-i18n-aria-label="clave"    → atributo aria-label
   ========================================================================== */
(function (HB) {
  'use strict';

  const dictionaries = {};

  /** Registra (o reemplaza) el diccionario de un idioma. */
  function register(lang, dictionary) {
    dictionaries[lang] = dictionary;
  }

  /** Busca una clave con notación de puntos dentro de un diccionario. */
  function lookup(dictionary, key) {
    return key.split('.').reduce((node, part) => (node ? node[part] : undefined), dictionary);
  }

  /**
   * Traduce una clave. Si no se indica idioma usa el de las preferencias.
   * Si la clave no existe devuelve la propia clave (facilita detectar faltantes).
   */
  function t(key, lang) {
    const current = lang || HB.preferences.get().lang;
    const value = lookup(dictionaries[current] || {}, key);
    return typeof value === 'string' ? value : key;
  }

  /** Mapa atributo-HTML → atributo-del-elemento a traducir. */
  const ATTRIBUTE_BINDINGS = [
    ['data-i18n-title', 'title'],
    ['data-i18n-placeholder', 'placeholder'],
    ['data-i18n-aria-label', 'aria-label']
  ];

  /** Aplica las traducciones a todos los elementos marcados dentro de `root`. */
  function apply(root) {
    const scope = root || document;

    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });

    ATTRIBUTE_BINDINGS.forEach(([marker, attribute]) => {
      scope.querySelectorAll('[' + marker + ']').forEach((el) => {
        el.setAttribute(attribute, t(el.getAttribute(marker)));
      });
    });
  }

  HB.i18n = { register, t, apply };
})(window.HB);
