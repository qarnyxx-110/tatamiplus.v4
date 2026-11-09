// Tatami Plus — progressive enhancements for course pages and coach editor.
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Locked lesson buttons open the purchase information dialog.
  $$('[data-open-purchase]').forEach(button => {
    button.addEventListener('click', event => {
      const dialogId = button.getAttribute('aria-controls');
      const dialog = dialogId ? document.getElementById(dialogId) : null;
      if (dialog && typeof dialog.showModal === 'function') {
        event.preventDefault();
        if (!dialog.open) dialog.showModal();
      }
    });
  });

  // Searchable coach select on the course catalogue.
  const coachSearch = $('[data-coach-search]');
  const coachSelect = $('[data-coach-select]');
  if (coachSearch && coachSelect) {
    coachSearch.addEventListener('input', () => {
      const query = coachSearch.value.trim().toLocaleLowerCase();
      [...coachSelect.options].forEach((option, index) => {
        if (index === 0) { option.hidden = false; return; }
        option.hidden = query !== '' && !option.textContent.toLocaleLowerCase().includes(query);
      });
    });
  }

  // Coach editor: sortable episode cards; the hidden ORDER field is submitted to Django.
  const sortable = $('[data-sortable-list]');
  if (sortable) {
    let dragged = null;
    const cards = () => $$('[data-episode-item]:not(.is-deleted)', sortable);
    const writeOrder = () => {
      cards().forEach((card, index) => {
        const orderInput = $('input[name$="-order"], input[name$="-ORDER"]', card);
        if (orderInput) orderInput.value = String(index + 1);
        const number = $('[data-episode-number]', card);
        if (number) number.textContent = new Intl.NumberFormat('fa-IR').format(index + 1);
      });
    };

    sortable.addEventListener('click', event => {
      const card = event.target.closest('[data-episode-item]');
      if (!card) return;
      if (event.target.closest('[data-remove-episode]')) {
        const deleteInput = $('input[type="checkbox"][name$="-DELETE"]', card);
        if (deleteInput) { deleteInput.checked = true; card.classList.add('is-deleted'); }
        else card.remove();
        writeOrder();
        return;
      }
      if (event.target.closest('[data-move-up]')) {
        const previous = card.previousElementSibling;
        if (previous) sortable.insertBefore(card, previous);
        writeOrder();
      }
      if (event.target.closest('[data-move-down]')) {
        const next = card.nextElementSibling;
        if (next) sortable.insertBefore(next, card);
        writeOrder();
      }
    });

    sortable.addEventListener('change', event => {
      const input = event.target;
      if (input.matches('input[type="checkbox"][name$="-DELETE"]')) {
        input.closest('[data-episode-item]')?.classList.toggle('is-deleted', input.checked);
        writeOrder();
      }
    });

    sortable.addEventListener('dragstart', event => {
      const handle = event.target.closest('[data-drag-handle]');
      if (!handle) { event.preventDefault(); return; }
      dragged = handle.closest('[data-episode-item]');
      if (!dragged) { event.preventDefault(); return; }
      dragged.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', 'episode');
    });
    sortable.addEventListener('dragover', event => {
      if (!dragged) return;
      event.preventDefault();
      const target = event.target.closest('[data-episode-item]');
      if (!target || target === dragged || target.classList.contains('is-deleted')) return;
      const rect = target.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      sortable.insertBefore(dragged, after ? target.nextSibling : target);
    });
    sortable.addEventListener('drop', event => { if (dragged) event.preventDefault(); writeOrder(); });
    sortable.addEventListener('dragend', () => {
      if (dragged) dragged.classList.remove('is-dragging');
      dragged = null;
      writeOrder();
    });
    sortable.addEventListener('pointerdown', event => {
      const handle = event.target.closest('[data-drag-handle]');
      if (handle) handle.closest('[data-episode-item]')?.setAttribute('draggable', 'true');
    });
    sortable.addEventListener('pointerup', () => $$('[data-episode-item]', sortable).forEach(card => card.setAttribute('draggable', 'false')));

    // Add a Django formset empty_form by replacing its __prefix__ placeholder.
    const addButton = $('[data-add-episode]');
    const emptyTemplate = $('#empty-episode-template');
    const totalInput = $('input[name$="-TOTAL_FORMS"]');
    if (addButton && emptyTemplate && totalInput) {
      addButton.addEventListener('click', () => {
        const index = Number.parseInt(totalInput.value, 10);
        if (!Number.isInteger(index) || index < 0) return;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = emptyTemplate.innerHTML.replaceAll('__prefix__', String(index)).trim();
        const card = wrapper.firstElementChild;
        if (!card) return;
        sortable.appendChild(card);
        totalInput.value = String(index + 1);
        writeOrder();
        card.querySelector('input:not([type=hidden]),textarea,select')?.focus();
      });
    }
    writeOrder();
  }

  // File selection and drag/drop preflight. The authoritative limits must come from Django context.
  const courseForm = $('[data-course-upload-form]');
  if (courseForm) {
    const status = $('[data-upload-status]');
    const message = $('[data-upload-message]');
    const percent = $('[data-upload-percent]');
    const progress = $('[data-upload-progress]');
    const cancel = $('[data-cancel-upload]');
    let xhr = null;

    const say = text => { if (message) message.textContent = text; };
    const toFa = value => new Intl.NumberFormat('fa-IR').format(value);
    const showFile = input => {
      const output = input.closest('[data-drop-zone]')?.querySelector('[data-file-name]');
      const file = input.files && input.files[0];
      if (output) output.textContent = file ? file.name + ' · ' + toFa(Math.ceil(file.size / 1024)) + ' کیلوبایت' : 'فایلی انتخاب نشده است.';
    };

    $$('input[type="file"]', courseForm).forEach(input => {
      input.addEventListener('change', () => showFile(input));
      const zone = input.closest('[data-drop-zone]');
      if (!zone) return;
      ['dragenter', 'dragover'].forEach(type => zone.addEventListener(type, event => {
        event.preventDefault(); zone.classList.add('is-over');
      }));
      ['dragleave', 'drop'].forEach(type => zone.addEventListener(type, event => {
        event.preventDefault(); zone.classList.remove('is-over');
      }));
      zone.addEventListener('drop', event => {
        const files = event.dataTransfer?.files;
        if (!files?.length) return;
        try {
          const transfer = new DataTransfer();
          [...files].forEach(file => transfer.items.add(file));
          input.files = transfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (_) {
          say('انتخاب فایل با کشیدن و رها کردن در این مرورگر پشتیبانی نمی‌شود؛ از دکمهٔ انتخاب فایل استفاده کنید.');
        }
      });
    });

    courseForm.addEventListener('submit', event => {
      const inputs = $$('input[type="file"]', courseForm);
      const files = inputs.flatMap(input => [...(input.files || [])].map(file => ({ file, input })));
      if (!files.length) return; // Text-only form submission remains a normal Django POST.
      event.preventDefault();

      const allowed = (courseForm.dataset.videoExtensions || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
      const maxBytes = Number.parseInt(courseForm.dataset.videoMaxBytes || '0', 10);
      if (!allowed.length) { say('فهرست فرمت‌های مجاز ویدئو از تنظیمات بک‌اند دریافت نشده است؛ آپلود متوقف شد.'); if (status) status.hidden = false; return; }
      if (!Number.isFinite(maxBytes) || maxBytes <= 0) { say('حداکثر حجم مجاز ویدئو از تنظیمات بک‌اند دریافت نشده است؛ آپلود متوقف شد.'); if (status) status.hidden = false; return; }

      for (const { file, input } of files) {
        const dot = file.name.lastIndexOf('.');
        const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
        if (!allowed.includes(extension)) {
          say('فرمت فایل «' + file.name + '» مجاز نیست. فرمت‌های مجاز: ' + allowed.join('، '));
          if (status) status.hidden = false;
          input.focus();
          return;
        }
        if (file.size > maxBytes) {
          say('حجم فایل «' + file.name + '» بیشتر از حد مجاز (' + toFa(Math.ceil(maxBytes / 1024 / 1024)) + ' مگابایت) است.');
          if (status) status.hidden = false;
          input.focus();
          return;
        }
      }

      if (status) status.hidden = false;
      if (progress) progress.value = 0;
      if (percent) percent.textContent = '۰٪';
      say('در حال ارسال اطلاعات و ویدئو…');
      const submit = $('button[type="submit"]', courseForm);
      if (submit) submit.disabled = true;
      xhr = new XMLHttpRequest();
      xhr.open((courseForm.method || 'POST').toUpperCase(), courseForm.action || window.location.href, true);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.upload.addEventListener('progress', event => {
        if (!event.lengthComputable) return;
        const value = Math.min(100, Math.round(event.loaded / event.total * 100));
        if (progress) progress.value = value;
        if (percent) percent.textContent = toFa(value) + '٪';
        say('در حال بارگذاری ویدئو…');
      });
      xhr.addEventListener('load', () => {
        if (submit) submit.disabled = false;
        if (xhr.status >= 200 && xhr.status < 400 && xhr.responseText) {
          say('ارسال پایان یافت؛ پاسخ سرور نمایش داده می‌شود.');
          try {
            const responseUrl = new URL(xhr.responseURL || window.location.href, window.location.href);
            if (responseUrl.origin === window.location.origin) {
              document.open(); document.write(xhr.responseText); document.close(); return;
            }
          } catch (_) { /* Fall through to a normal reload. */ }
          window.location.reload();
        } else {
          say('ارسال ناموفق بود (کد ' + toFa(xhr.status) + '). خطاهای فرم را بررسی و دوباره تلاش کنید.');
        }
        xhr = null;
      });
      xhr.addEventListener('error', () => { if (submit) submit.disabled = false; say('ارتباط با سرور برقرار نشد. اتصال را بررسی و دوباره تلاش کنید.'); xhr = null; });
      xhr.addEventListener('abort', () => { if (submit) submit.disabled = false; say('آپلود لغو شد. اطلاعات ثبت‌نشده باقی ماندند.'); xhr = null; });
      if (cancel) cancel.onclick = () => { if (xhr && xhr.readyState !== XMLHttpRequest.DONE) xhr.abort(); };
      xhr.send(new FormData(courseForm));
    });
  }
})();