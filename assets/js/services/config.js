/* ==========================================================================
   services/config.js
   Configuración de integración con el backend.

   Mientras `apiBaseUrl` sea null el sitio funciona 100% en el navegador
   (sin servidor) y el botón de donar queda inactivo.

   CUANDO EXISTA EL BACKEND:
     1. Poner aquí su URL base, p. ej. 'https://api.hardboard.app'
        (o '/api' si se sirve bajo el mismo dominio).
     2. Cambiar donations.enabled a true.
     3. Revisar el contrato en backend/docs/donations-api.md.
   ========================================================================== */
(function (HB) {
  'use strict';

  HB.config = {
    apiBaseUrl: null,

    donations: {
      enabled: false,
      checkoutPath: '/donations/checkout'
    }
  };
})(window.HB);
