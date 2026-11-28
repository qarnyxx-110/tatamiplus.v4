// Progressive enhancements for Django storefront and academy templates.
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

  const closeDialog = (dialog) => {
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  };

  document.querySelectorAll('[data-product-gallery]').forEach((gallery) => {
    if (gallery.dataset.tpGalleryBound === 'true') return;
    gallery.dataset.tpGalleryBound = 'true';

    const mainImage = gallery.querySelector('[data-gallery-main-image]');
    const dialog = gallery.querySelector('[data-gallery-dialog]');
    const dialogImage = dialog?.querySelector('[data-gallery-dialog-image]');
    const counter = dialog?.querySelector('[data-gallery-counter]');
    const stage = dialog?.querySelector('[data-gallery-stage]');
    const thumbnails = [...gallery.querySelectorAll('[data-gallery-select]')];
    const openButton = gallery.querySelector('[data-gallery-open]');
    const images = thumbnails.map((button) => ({
      src: button.dataset.src || '',
      alt: button.dataset.alt || ''
    })).filter((item) => item.src);
    if (images.length === 0 && mainImage?.src) {
      images.push({src: mainImage.src, alt: mainImage.alt || ''});
    }
    if (!mainImage || images.length === 0) return;

    let activeIndex = Math.max(0, thumbnails.findIndex((button) => button.getAttribute('aria-pressed') === 'true'));
    let opener = null;
    let pointerStart = null;

    const render = () => {
      const image = images[activeIndex];
      if (!image) return;
      mainImage.src = image.src;
      mainImage.alt = image.alt;
      gallery.querySelector('[data-gallery-main]')?.classList.add('ok');
      thumbnails.forEach((button, index) => {
        const active = index === activeIndex;
        button.classList.toggle('is-active', active);
        button.classList.toggle('on', active);
        button.setAttribute('aria-pressed', String(active));
      });
      if (dialogImage) {
        dialogImage.src = image.src;
        dialogImage.alt = image.alt;
      }
      if (counter) counter.textContent = 'تصویر ' + (activeIndex + 1).toLocaleString('fa-IR') +
        ' از ' + images.length.toLocaleString('fa-IR');
    };

    const move = (direction) => {
      if (images.length < 2) return;
      activeIndex = (activeIndex + direction + images.length) % images.length;
      render();
    };

    thumbnails.forEach((button, index) => {
      button.addEventListener('click', () => {
        activeIndex = index;
        render();
      });
    });

    openButton?.addEventListener('click', () => {
      if (!dialog || !dialogImage) return;
      opener = openButton;
      render();
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    });

    dialog?.querySelectorAll('[data-gallery-close]').forEach((button) => {
      button.addEventListener('click', () => closeDialog(dialog));
    });
    dialog?.querySelector('[data-gallery-prev]')?.addEventListener('click', () => move(-1));
    dialog?.querySelector('[data-gallery-next]')?.addEventListener('click', () => move(1));
    dialog?.addEventListener('close', () => opener?.focus());
    dialog?.addEventListener('click', (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
    dialog?.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(-1);
      }
    });
    stage?.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      pointerStart = {x: event.clientX, y: event.clientY, id: event.pointerId};
    });
    stage?.addEventListener('pointerup', (event) => {
      if (!pointerStart || pointerStart.id !== event.pointerId) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      move(dx < 0 ? 1 : -1);
    });
    render();
  });

  document.querySelectorAll('[data-product-form]').forEach((form) => {
    if (form.dataset.tpVariantBound === 'true') return;

    const select = form.querySelector('select[name="variant"]');
    const native = form.querySelector('[data-variant-native]');
    const custom = form.querySelector('[data-variant-ui]');
    const recordsNode = form.querySelector('[data-variant-records]');
    const quantity = form.querySelector('input[name="quantity"]');
    const priceDisplay = form.querySelector('[data-variant-price-display]');
    const stockDisplay = form.querySelector('[data-variant-stock-display]');
    const primaryButtons = [...form.querySelectorAll('[data-variant-submit]')];
    const sticky = document.querySelector('[data-product-sticky]');
    const stickyPrice = sticky?.querySelector('[data-sticky-price]');
    const stickyStock = sticky?.querySelector('[data-sticky-stock]');
    if (!select || !recordsNode || !custom) return;

    const records = [...recordsNode.querySelectorAll('[data-variant-record]')].map((node) => ({
      id: node.dataset.id || '',
      size: node.dataset.size || '',
      color: node.dataset.color || '',
      stock: Math.max(0, Number(node.dataset.stock || 0)),
      price: node.dataset.price || '',
      priceLabel: node.dataset.priceLabel || ''
    })).filter((record) => record.id);
    if (!records.length) return;
    form.dataset.tpVariantBound = 'true';

    const hasSize = records.some((record) => record.size);
    const hasColor = records.some((record) => record.color);
    let selectedSize = '';
    let selectedColor = '';
    const initiallySelected = records.find((record) => record.id === select.value);
    if (initiallySelected) {
      selectedSize = initiallySelected.size;
      selectedColor = initiallySelected.color;
    }

    const sizeOptions = form.querySelector('[data-variant-options="size"]');
    const colorOptions = form.querySelector('[data-variant-options="color"]');
    const sizeGroup = form.querySelector('[data-variant-group="size"]');
    const colorGroup = form.querySelector('[data-variant-group="color"]');
    const notice = form.querySelector('[data-variant-notice]');
    const initialPrice = form.dataset.startingPriceLabel || priceDisplay?.textContent || '';

    const makeChoice = (field, value) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tp-variant-choice';
      button.dataset.variantChoice = field;
      button.dataset.value = value;
      button.setAttribute('aria-pressed', 'false');
      button.textContent = value;
      button.addEventListener('click', () => {
        if (field === 'size') selectedSize = value;
        else selectedColor = value;
        update();
      });
      return button;
    };

    const unique = (field) => [...new Set(records.map((record) => record[field]).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'fa'));

    unique('size').forEach((value) => sizeOptions?.append(makeChoice('size', value)));
    unique('color').forEach((value) => colorOptions?.append(makeChoice('color', value)));
    if (sizeGroup) sizeGroup.hidden = !hasSize;
    if (colorGroup) colorGroup.hidden = !hasColor;

    const matches = (record) =>
      (!hasSize || (selectedSize && record.size === selectedSize)) &&
      (!hasColor || (selectedColor && record.color === selectedColor));

    const setButtonsDisabled = () => {
      form.querySelectorAll('[data-variant-choice="size"]').forEach((button) => {
        const hasStock = records.some((record) =>
          record.size === button.dataset.value && record.stock > 0);
        button.disabled = !hasStock;
        button.classList.toggle('is-selected', selectedSize === button.dataset.value);
        button.setAttribute('aria-pressed', String(selectedSize === button.dataset.value));
      });
      form.querySelectorAll('[data-variant-choice="color"]').forEach((button) => {
        const hasStock = records.some((record) =>
          record.color === button.dataset.value && record.stock > 0);
        button.disabled = !hasStock;
        button.classList.toggle('is-selected', selectedColor === button.dataset.value);
        button.setAttribute('aria-pressed', String(selectedColor === button.dataset.value));
      });
    };

    const syncSticky = (enabled, message, price) => {
      primaryButtons.forEach((button) => { button.disabled = !enabled; });
      if (stickyPrice) stickyPrice.textContent = price;
      if (stickyStock) stickyStock.textContent = message;
      const stickyButton = sticky?.querySelector('[data-variant-submit]');
      if (stickyButton) stickyButton.disabled = !enabled;
    };

    const update = () => {
      setButtonsDisabled();
      const currentMatches = records.filter(matches);
      const selected = currentMatches.length === 1 ? currentMatches[0] : null;
      if (!hasSize && !hasColor && records.length === 1) {
        selectedSize = '';
        selectedColor = '';
      }

      if (selected && selected.stock > 0) {
        select.value = selected.id;
        if (quantity) {
          quantity.max = String(selected.stock);
          const currentQuantity = Math.max(1, Number(quantity.value || 1));
          quantity.value = String(Math.min(currentQuantity, selected.stock));
        }
        const price = selected.priceLabel || initialPrice;
        const stock = 'موجود · حداکثر ' + selected.stock.toLocaleString('fa-IR') + ' عدد';
        if (priceDisplay) priceDisplay.textContent = price ? price + ' تومان' : 'قیمت ثبت نشده';
        if (stockDisplay) stockDisplay.textContent = stock;
        if (notice) notice.textContent = 'تنوع انتخاب‌شده موجود است.';
        const specSize = document.querySelector('[data-product-spec-size]');
        const specColor = document.querySelector('[data-product-spec-color]');
        const specStock = document.querySelector('[data-product-spec-stock]');
        if (specSize) specSize.textContent = selected.size || 'بدون سایز';
        if (specColor) specColor.textContent = selected.color || 'بدون رنگ';
        if (specStock) specStock.textContent = stock;
        syncSticky(true, stock, price ? price + ' تومان' : 'قیمت ثبت نشده');
      } else {
        select.value = '';
        if (quantity) {
          quantity.removeAttribute('max');
          if (!quantity.value || Number(quantity.value) < 1) quantity.value = '1';
        }
        const hasSelection = (hasSize && selectedSize) || (hasColor && selectedColor);
        const message = hasSelection ? 'این ترکیب در حال حاضر موجود نیست.' : 'برای مشاهده قیمت و موجودی، ' +
          (hasSize && hasColor ? 'سایز و رنگ' : hasSize ? 'سایز' : hasColor ? 'رنگ' : 'تنوع') + ' را انتخاب کنید.';
        if (priceDisplay) priceDisplay.textContent = initialPrice ? 'از ' + initialPrice + ' تومان' : 'قیمت فروش ثبت نشده';
        if (stockDisplay) stockDisplay.textContent = hasSelection ? 'ناموجود' : 'انتخاب تنوع لازم است';
        if (notice) notice.textContent = message;
        const specSize = document.querySelector('[data-product-spec-size]');
        const specColor = document.querySelector('[data-product-spec-color]');
        const specStock = document.querySelector('[data-product-spec-stock]');
        if (specSize) specSize.textContent = selectedSize || '—';
        if (specColor) specColor.textContent = selectedColor || '—';
        if (specStock) specStock.textContent = hasSelection ? 'ترکیب انتخاب‌شده ناموجود است' : 'برای بررسی پس از انتخاب تنوع';
        syncSticky(false, message, initialPrice ? 'از ' + initialPrice + ' تومان' : 'قیمت ثبت نشده');
      }
    };

    if (native) native.hidden = true;
    custom.hidden = false;
    update();

    if (sticky) {
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          const visible = entries.some((entry) => entry.isIntersecting);
          sticky.hidden = visible;
        }, {threshold: 0.12});
        observer.observe(form);
      } else {
        sticky.hidden = false;
      }
    }
  });

  document.querySelectorAll('[data-product-tabs]').forEach((tabs) => {
    if (tabs.dataset.tpTabsBound === 'true') return;
    tabs.dataset.tpTabsBound = 'true';
    const buttons = [...tabs.querySelectorAll('[data-product-tab]')];
    const panels = [...tabs.querySelectorAll('[data-product-tab-panel]')];
    const activate = (name, moveFocus = false) => {
      buttons.forEach((button) => {
        const active = button.dataset.productTab === name;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        if (active) button.classList.add('is-active');
        else button.classList.remove('is-active');
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.productTabPanel !== name;
      });
      if (moveFocus) buttons.find((button) => button.dataset.productTab === name)?.focus();
    };
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => activate(button.dataset.productTab));
      button.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        let next = index;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else next = (index + (event.key === 'ArrowLeft' ? 1 : -1) + buttons.length) % buttons.length;
        activate(buttons[next].dataset.productTab, true);
      });
    });
    const initial = buttons.find((button) => button.getAttribute('aria-selected') === 'true') || buttons[0];
    if (initial) activate(initial.dataset.productTab);
  });

  document.querySelectorAll('[data-dialog-open]').forEach((button) => {
    if (button.dataset.tpDialogBound === 'true') return;
    button.dataset.tpDialogBound = 'true';
    const dialog = document.getElementById(button.dataset.dialogOpen);
    if (!dialog) return;
    button.addEventListener('click', () => {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    });
    dialog.querySelectorAll('[data-dialog-close]').forEach((close) => {
      close.addEventListener('click', () => closeDialog(dialog));
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
  });

  // Storefront progressive enhancement: do not let shoppers select variants
  // that the server-rendered option label identifies as having zero stock.
  // Server-side form validation remains authoritative.
  function enhanceStoreVariantStock(root) {
    const forms = root.querySelectorAll('.tp-product-form');
    forms.forEach((form) => {
      if (form.dataset.tpVariantBound === 'true' || form.dataset.tpStockOptionsBound === 'true') return;
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
