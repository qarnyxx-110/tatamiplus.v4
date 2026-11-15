// Small progressive enhancements for Django storefront and academy templates.
(() => {
  'use strict';

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