/* ==========================================================================
   services/donations.js
   Cliente HTTP del módulo de donaciones (PREPARADO PARA EL BACKEND FUTURO).

   Flujo previsto:
     1. El usuario pulsa "Donar".
     2. El front llama a POST {apiBaseUrl}/donations/checkout.
     3. El backend crea la sesión con el proveedor de pagos y responde
        { checkoutUrl }.
     4. El front redirige al usuario a esa URL.

   El front NUNCA maneja datos de tarjeta ni claves del proveedor: todo eso
   vive en el backend (ver backend/README.md y backend/docs/donations-api.md).
   ========================================================================== */
(function (HB) {
  'use strict';

  /** ¿Está configurado y activado el backend de donaciones? */
  function isEnabled() {
    const { apiBaseUrl, donations } = HB.config;
    return Boolean(apiBaseUrl && donations.enabled);
  }

  /**
   * Pide al backend una sesión de pago.
   * @param {{ amount?: number, currency?: string }} [payload]
   * @returns {Promise<{ checkoutUrl: string }>}
   */
  async function createCheckout(payload) {
    if (!isEnabled()) {
      throw new Error('Donations backend is not configured (see services/config.js).');
    }

    const url = HB.config.apiBaseUrl + HB.config.donations.checkoutPath;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ locale: HB.preferences.get().lang }, payload))
    });

    if (!response.ok) {
      throw new Error('Donations API responded with status ' + response.status);
    }
    return response.json();
  }

  /** Crea la sesión de pago y redirige al usuario al proveedor. */
  async function start(payload) {
    const { checkoutUrl } = await createCheckout(payload);
    window.location.assign(checkoutUrl);
  }

  HB.donations = { isEnabled, createCheckout, start };
})(window.HB);
