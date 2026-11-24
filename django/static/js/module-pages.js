// Small progressive enhancements for Django storefront and academy templates.
(() => {
  'use strict';

  document.querySelectorAll('[data-copy-target]').forEach((button) => {
    if (button.dataset.tpCopyBound === 'true') return;
    button.dataset.tpCopyBound = 'true';
    button.addEventListener('click', async () => {
      const targetId = button.dataset.copyTarget;
      const field = targetId && document.getElementById(targetId);
      if (!field) return;
      const feedbackId = button.dataset.copyFeedback;
      const feedback = feedbackId && document.getElementById(feedbackId);
      const value = 'value' in field ? field.value : field.textContent.trim();
      let copied = false;

      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(value);
          copied = true;
        }
      } catch {
        // Clipboard API can be unavailable outside secure contexts or after permission denial.
      }

      if (!copied) {
        try {
          field.focus();
          if (typeof field.select === 'function') field.select();
          copied = document.execCommand('copy');
        } catch {
          copied = false;
        }
      }

      if (copied) {
        button.textContent = button.dataset.copySuccess || 'کپی شد';
        if (feedback) feedback.textContent = 'پیوند دعوت کپی شد.';
      } else {
        if (feedback) feedback.textContent = 'کپی خودکار انجام نشد؛ پیوند را انتخاب و به‌صورت دستی کپی کنید.';
        if (typeof field.select === 'function') {
          field.focus();
          field.select();
        }
      }
    });
  });

  document.querySelectorAll('[data-product-gallery]').forEach((gallery) => {
    const mainImage = gallery.querySelector('[data-gallery-main-image]');
    const mainFigure = gallery.querySelector('[data-gallery-main]');
    if (!mainImage || !mainFigure) return;

    gallery.querySelectorAll('[data-gallery-select]').forEach((button) => {
      button.addEventListener('click', () => {
        const source = button.dataset.src;
        if (!source) return;
        mainImage.src = source;
        mainImage.alt = button.dataset.alt || '';
        mainFigure.classList.add('ok');

        gallery.querySelectorAll('[data-gallery-select]').forEach((item) => {
          const active = item === button;
          item.classList.toggle('is-active', active);
          item.classList.toggle('on', active);
          item.setAttribute('aria-pressed', String(active));
        });
      });
    });
  });

  // Storefront progressive enhancement: do not let shoppers select variants
  // that the server-rendered option label identifies as having zero stock.
  // Server-side form validation remains authoritative.
  function enhanceStoreVariantStock(root) {
    const forms = root.querySelectorAll('.tp-product-form');
    forms.forEach((form) => {
      if (form.dataset.tpStockOptionsBound === 'true') return;
      const select = form.querySelector('select[name="variant"]');
      if (!select) return;

      const toAsciiDigits = (value) => String(value || '')
        .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
      const options = Array.from(select.options).filter((option) => option.value);
      const available = [];
      const unknown = [];
      let stockMetadataFound = false;
      let zeroStockCount = 0;

      options.forEach((option) => {
        const match = /موجودی\s*[:：]\s*([\d۰-۹٠-٩٬,]+)/.exec(option.textContent || '');
        if (!match) {
          unknown.push(option);
          return;
        }
        stockMetadataFound = true;
        const quantityText = toAsciiDigits(match[1]).replace(/[٬,]/g, '');
        const quantity = Number.parseInt(quantityText, 10);
        if (!Number.isFinite(quantity)) {
          unknown.push(option);
          return;
        }
        if (quantity <= 0) {
          zeroStockCount += 1;
          option.disabled = true;
          option.textContent = (option.textContent || '').trim() + ' — ناموجود';
        } else {
          available.push(option);
        }
      });

      if (!stockMetadataFound) return;
      available.push(...unknown);
      form.dataset.tpStockOptionsBound = 'true';

      const selected = select.selectedOptions && select.selectedOptions[0];
      if (!select.value || (selected && selected.disabled)) {
        select.value = available.length ? available[0].value : '';
      }

      const field = select.closest('.tp-field') || select.parentElement;
      if (field && zeroStockCount > 0 && !field.querySelector('.tp-variant-stock-note')) {
        const note = document.createElement('p');
        note.className = 'tp-hint tp-variant-stock-note';
        note.setAttribute('role', 'status');
        note.setAttribute('aria-live', 'polite');
        note.textContent = available.length
          ? 'تنوع‌های بدون موجودی قابل انتخاب نیستند.'
          : 'در حال حاضر هیچ تنوعی با موجودی قابل خرید وجود ندارد.';
        field.append(note);
      }

      if (!available.length) {
        const submit = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submit) submit.disabled = true;
      }
    });
  }

  enhanceStoreVariantStock(document);
})();
