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
          item.setAttribute('aria-pressed', String(active));
        });
      });
    });
  });
})();