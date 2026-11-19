// Progressive enhancement for real Django cart quantity controls.
// Quantity changes are submitted only through the existing CSRF-protected form.
(() => {
  'use strict';

  document.querySelectorAll('form[data-quantity-form]').forEach((form) => {
    if (form.dataset.tpQuantityBound === 'true') return;

    const input = form.querySelector('input[name="quantity"]');
    if (!input) return;

    form.dataset.tpQuantityBound = 'true';
    const controls = Array.from(form.querySelectorAll('[data-qty-step]'));

    function getLimits() {
      const minValue = Number.parseInt(input.min || '1', 10);
      const min = Number.isFinite(minValue) ? minValue : 1;
      const maxValue = input.max === '' ? Number.POSITIVE_INFINITY : Number.parseInt(input.max, 10);
      const max = Number.isFinite(maxValue) ? maxValue : Number.POSITIVE_INFINITY;
      return { min, max, valid: max >= min };
    }

    function updateControls() {
      const { min, max, valid } = getLimits();
      const current = Number.parseInt(input.value, 10);
      controls.forEach((button) => {
        button.hidden = false;
        const step = Number.parseInt(button.dataset.qtyStep || '0', 10);
        button.disabled = !valid || !Number.isFinite(current) ||
          (step < 0 && current <= min) ||
          (step > 0 && current >= max);
      });
    }

    controls.forEach((button) => {
      button.addEventListener('click', () => {
        const { min, max, valid } = getLimits();
        if (!valid) return;

        const step = Number.parseInt(button.dataset.qtyStep || '0', 10);
        if (step !== -1 && step !== 1) return;

        const current = Number.parseInt(input.value, 10);
        const safeCurrent = Number.isFinite(current) ? current : min;
        input.value = String(Math.min(max, Math.max(min, safeCurrent + step)));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        updateControls();
      });
    });

    input.addEventListener('input', updateControls);
    input.addEventListener('change', updateControls);
    updateControls();
  });
})();
