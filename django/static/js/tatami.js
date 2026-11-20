// تاتامی پلاس — بهبودهای کوچک سمت مرورگر برای تمپلیت‌های Django.
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ۰. قرارداد فیلدهای ورود/ثبت‌نام؛ نام‌ها و اعتبارسنجی همچنان متعلق به Django هستند.

  function enhanceDjangoRegister(form) {
    if (form.dataset.roleEnhanced === 'true') return;
    form.dataset.roleEnhanced = 'true';
    const role = form.elements.namedItem('role');
    if (role && role.tagName === 'SELECT') {
      const field = role.closest('.tp-field');
      if (field) {
        field.classList.add('tp-role-field');
        const label = field.querySelector('label');
        if (label) label.classList.add('tp-visually-hidden');
        role.classList.add('tp-visually-hidden');
        role.setAttribute('aria-hidden', 'true');
        role.tabIndex = -1;
        const picker = document.createElement('div');
        picker.className = 'tp-role-picker';
        picker.setAttribute('role', 'radiogroup');
        picker.setAttribute('aria-label', 'نوع حساب کاربری');
        const choices = [...role.options].filter(option => option.value);
        choices.forEach(option => {
          const card = document.createElement('button');
          card.type = 'button';
          card.className = 'tp-role-card';
          card.setAttribute('role', 'radio');
          card.setAttribute('aria-checked', String(option.value === role.value));
          const title = document.createElement('span');
          title.className = 'tp-role-title';
          title.textContent = option.textContent.trim();
          const desc = document.createElement('span');
          desc.className = 'tp-role-desc';
          desc.textContent = option.value === 'coach' ? 'برای آموزش و مدیریت فعالیت مربیگری' : 'برای یادگیری و پیگیری مسیر ورزشی';
          const icon = document.createElement('span');
          icon.className = 'tp-role-icon';
          icon.setAttribute('aria-hidden', 'true');
          icon.textContent = option.value === 'coach' ? '🥋' : '♟';
          card.append(icon, title, desc);
          card.addEventListener('click', () => {
            role.value = option.value;
            role.dispatchEvent(new Event('change', { bubbles: true }));
            form.dataset.rolePreview = '';
            picker.querySelectorAll('[role=radio]').forEach(item => {
              item.setAttribute('aria-checked', String(item === card));
              item.classList.toggle('is-selected', item === card);
            });
            const note = form.querySelector('.tp-club-preview');
            if (note) note.hidden = true;
            const submit = form.querySelector('[type=submit]');
            if (submit) submit.disabled = false;
          });
          if (option.value === role.value) card.classList.add('is-selected');
          picker.append(card);
        });
        const club = document.createElement('button');
        club.type = 'button';
        club.className = 'tp-role-card tp-role-preview';
        club.setAttribute('role', 'radio');
        club.setAttribute('aria-checked', 'false');
        const icon = document.createElement('span'); icon.className = 'tp-role-icon'; icon.textContent = '🏢'; icon.setAttribute('aria-hidden', 'true');
        const title = document.createElement('span'); title.className = 'tp-role-title'; title.textContent = 'باشگاه';
        const desc = document.createElement('span'); desc.className = 'tp-role-desc'; desc.textContent = 'پیش‌نمایش حساب اختصاصی باشگاه';
        const status = document.createElement('span'); status.className = 'tp-role-status'; status.textContent = 'ثبت‌نام از این مسیر در دسترس نیست';
        club.append(icon, title, desc, status);
        club.addEventListener('click', () => {
          form.dataset.rolePreview = 'club';
          picker.querySelectorAll('[role=radio]').forEach(item => {
            const selected = item === club;
            item.setAttribute('aria-checked', String(selected));
            item.classList.toggle('is-selected', selected);
          });
          const note = form.querySelector('.tp-club-preview');
          if (!note) {
            const panel = document.createElement('div');
            panel.className = 'tp-club-preview';
            panel.setAttribute('role', 'status');
            panel.setAttribute('aria-live', 'polite');
            panel.innerHTML = '<b>ثبت‌نام حساب باشگاه</b><p>در حال حاضر ساخت حساب باشگاه از این فرم امکان‌پذیر نیست. برای ثبت‌نام، نوع «هنرجو» یا «مربی» را انتخاب کنید.</p>';
            picker.insertAdjacentElement('afterend', panel);
          } else note.hidden = false;
          const submit = form.querySelector('[type=submit]');
          if (submit) submit.disabled = true;
        });
        picker.append(club);
        role.insertAdjacentElement('afterend', picker);
      }
    }
    const fieldNodes = [...form.querySelectorAll(':scope > .tp-field')];
    const firstFields = fieldNodes.filter(node => ['username', 'email', 'role'].includes(node.querySelector('input,select,textarea')?.name));
    const secondFields = fieldNodes.filter(node => ['password1', 'password2'].includes(node.querySelector('input,select,textarea')?.name));
    if (firstFields.length && secondFields.length && !form.querySelector('[data-auth-step="1"]')) {
      const first = document.createElement('section'); first.className = 'tp-auth-step'; first.dataset.authStep = '1';
      first.innerHTML = '<h2>اطلاعات حساب</h2><p class="tp-hint">اطلاعات پایه و نوع حساب را مشخص کنید.</p>';
      const second = document.createElement('section'); second.className = 'tp-auth-step'; second.dataset.authStep = '2';
      second.innerHTML = '<h2>ایمن‌سازی حساب</h2><p class="tp-hint">گذرواژه‌ای مطمئن برای حساب خود انتخاب کنید.</p>';
      const firstNode = firstFields[0]; form.insertBefore(first, firstNode);
      firstFields.forEach(node => first.append(node));
      secondFields.forEach(node => second.append(node));
      form.append(second);
      const firstNav = document.createElement('div'); firstNav.className = 'tp-auth-mobile-actions';
      const secondNav = document.createElement('div'); secondNav.className = 'tp-auth-mobile-actions';
      const back = document.createElement('button'); back.type = 'button'; back.className = 'btn o'; back.dataset.authBack = ''; back.textContent = 'بازگشت';
      const next = document.createElement('button'); next.type = 'button'; next.className = 'btn'; next.dataset.authNext = ''; next.textContent = 'ادامه';
      const submit = form.querySelector('[type=submit]');
      firstNav.append(next); first.append(firstNav);
      secondNav.append(back); second.append(secondNav);
      if (submit) second.append(submit);
      back.addEventListener('click', () => { form.dataset.step = '1'; const h = first.querySelector('h2'); if (h) h.focus(); });
      next.addEventListener('click', () => {
        const controls = [...first.querySelectorAll('input[required],select[required],textarea[required]')];
        const invalid = controls.find(control => !control.checkValidity());
        if (invalid) { invalid.reportValidity(); invalid.focus(); return; }
        form.dataset.step = '2';
        const h = second.querySelector('h2'); if (h) h.focus();
      });
      form.dataset.step = second.querySelector('[aria-invalid=true]') ? '2' : '1';
    }
    const mq = window.matchMedia('(max-width: 767px)');
    form.dataset.mobileSteps = mq.matches ? 'true' : 'false';
    if (!form.__tpAuthMqBound) {
      mq.addEventListener('change', event => { form.dataset.mobileSteps = event.matches ? 'true' : 'false'; });
      form.__tpAuthMqBound = true;
    }
    form.addEventListener('submit', event => {
      if (form.dataset.rolePreview === 'club') {
        event.preventDefault();
        let note = form.querySelector('.tp-club-preview');
        if (note) note.hidden = false;
        const submit = form.querySelector('[type=submit]');
        if (submit) submit.disabled = true;
      }
    }, true);
  }

  $$('form[data-auth-form]').forEach(form => {
    const username = form.elements.namedItem('username');
    if (username && username instanceof HTMLElement) {
      username.autocomplete = 'username';
      username.dir = 'ltr';
      username.autocapitalize = 'none';
      username.spellcheck = false;
    }
    const email = form.elements.namedItem('email');
    if (email && email instanceof HTMLElement) {
      email.autocomplete = 'email';
      email.dir = 'ltr';
      email.inputMode = 'email';
    }
    const role = form.elements.namedItem('role');
    if (role && role instanceof HTMLElement) role.autocomplete = 'off';
    const password = form.elements.namedItem('password');
    if (password && password instanceof HTMLInputElement) password.autocomplete = 'current-password';
    ['password1', 'password2'].forEach(name => {
      const field = form.elements.namedItem(name);
      if (field && field instanceof HTMLInputElement) field.autocomplete = 'new-password';
    });
    if (form.dataset.authForm === 'register') enhanceDjangoRegister(form);
  });

  // ۰-ب. قرارداد واقعی ورود Django با OTP (بدون تغییر نام فیلدها یا منطق سرور)
  const phoneInput = $('#id_phone');
  if (phoneInput) {
    phoneInput.type = 'tel';
    phoneInput.autocomplete = 'tel';
    phoneInput.inputMode = 'tel';
    phoneInput.dir = 'ltr';
    phoneInput.maxLength = 20;
    const phoneField = phoneInput.closest('.form-field');
    const phoneHint = phoneField && phoneField.querySelector('.field-help');
    if (phoneHint) {
      if (!phoneHint.id) phoneHint.id = 'tp-phone-hint';
      phoneInput.setAttribute('aria-describedby', [phoneInput.getAttribute('aria-describedby'), phoneHint.id].filter(Boolean).join(' '));
    }
  }
  const otpInput = $('#id_code');
  if (otpInput) {
    otpInput.inputMode = 'numeric';
    otpInput.autocomplete = 'one-time-code';
    otpInput.dir = 'ltr';
    otpInput.maxLength = 5;
    otpInput.pattern = '[0-9۰-۹٠-٩]{5}';
    otpInput.setAttribute('aria-label', 'کد یک‌بارمصرف پنج‌رقمی');
  }
  const roleInput = $('#id_role');
  if (roleInput) roleInput.autocomplete = 'off';
  const otpResendForm = $('form[action$="/auth/otp/send/"]');
  if (otpResendForm) {
    let note = $('.tp-otp-resend-note', otpResendForm.parentElement || document);
    if (!note) {
      note = document.createElement('p');
      note.className = 'field-help tp-otp-resend-note';
      otpResendForm.insertAdjacentElement('beforebegin', note);
    }

    const resendButton = otpResendForm.querySelector('button[type="submit"], input[type="submit"]');
    if (resendButton) {
      const storageKey = 'tp-otp-resend-until:' + window.location.pathname;
      const cooldownMs = 60 * 1000;
      const toFaDigits = value => String(value).replace(/[0-9]/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
      const readDeadline = () => {
        try {
          const value = Number(window.sessionStorage.getItem(storageKey) || 0);
          return Number.isFinite(value) && value > 0 ? value : 0;
        } catch {
          return 0;
        }
      };
      const saveDeadline = value => {
        try { window.sessionStorage.setItem(storageKey, String(value)); } catch {}
      };
      const clearDeadline = () => {
        try { window.sessionStorage.removeItem(storageKey); } catch {}
      };

      let deadline = readDeadline();
      if (!deadline) {
        deadline = Date.now() + cooldownMs;
        saveDeadline(deadline);
      }
      const initiallyDisabled = resendButton.disabled;
      let countdownTimer = 0;

      const updateCountdown = () => {
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        if (remaining > 0) {
          resendButton.disabled = true;
          note.textContent = 'ارسال مجدد تا ' + toFaDigits(remaining) +
            ' ثانیه دیگر فعال می‌شود. کد پس از ۱۲۰ ثانیه منقضی می‌شود؛ محدودیت نهایی با سرور است.';
          countdownTimer = window.setTimeout(updateCountdown, Math.min(1000, deadline - Date.now()));
          return;
        }
        resendButton.disabled = initiallyDisabled;
        note.textContent = 'اکنون می‌توانید درخواست ارسال مجدد بدهید؛ محدودیت نهایی توسط سرور اعمال می‌شود.';
        clearDeadline();
      };

      otpResendForm.addEventListener('submit', event => {
        if (event.defaultPrevented || resendButton.disabled) return;
        deadline = Date.now() + cooldownMs;
        saveDeadline(deadline);
        if (countdownTimer) window.clearTimeout(countdownTimer);
        updateCountdown();
      }, true);

      updateCountdown();
    }
  }

  // ۱. منوی کشویی موبایل (dialog بومی: تله فوکوس، Esc، بازگشت فوکوس)
  const d = $('#mnd'), b = $('#mnb');
  if (d && b && typeof d.showModal === 'function') {
    b.hidden = false;
    b.addEventListener('click', () => { d.showModal(); b.setAttribute('aria-expanded', 'true'); });
    d.addEventListener('close', () => b.setAttribute('aria-expanded', 'false'));
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    const x = $('#mnx'); if (x) x.addEventListener('click', () => d.close());
  }

  // ۲. نمایش/پنهان کردن گذرواژه
  $$('input[type=password]').forEach(i => {
    const wrap = document.createElement('div'); wrap.className = 'tp-pw';
    i.parentNode.insertBefore(wrap, i); wrap.appendChild(i);
    const t = document.createElement('button');
    t.type = 'button'; t.className = 'tp-pw-b'; t.textContent = 'نمایش'; t.setAttribute('aria-pressed', 'false');
    const lab = i.id && $(`label[for="${i.id}"]`); t.setAttribute('aria-label', 'نمایش ' + (lab ? lab.textContent.trim() : 'گذرواژه'));
    t.addEventListener('click', () => { const show = i.type === 'password'; i.type = show ? 'text' : 'password'; t.textContent = show ? 'پنهان' : 'نمایش'; t.setAttribute('aria-pressed', String(show)); i.focus(); });
    wrap.appendChild(t); i.setAttribute('dir', 'ltr');
  });

  // ۲-ب. فایل مدرک: متن فارسی به‌جای «No file chosen» مرورگر (input همان input Django می‌ماند)
  $$('input[type=file]').forEach(i => {
    const wrap = document.createElement('div'); wrap.className = 'tp-file';
    i.parentNode.insertBefore(wrap, i); wrap.appendChild(i);
    const btn = document.createElement('span'); btn.className = 'btn o s'; btn.textContent = 'انتخاب فایل'; btn.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span'); name.className = 'mu sm'; name.id = i.id + '_name'; name.setAttribute('aria-live', 'polite');
    const show = () => { const f = i.files && i.files[0]; name.textContent = f ? `${f.name} · ${Math.max(1, Math.round(f.size / 1024)).toLocaleString('fa-IR')} کیلوبایت` : 'فایلی انتخاب نشده است.'; };
    wrap.append(btn, name); show(); i.addEventListener('change', show);
    i.setAttribute('aria-describedby', [i.getAttribute('aria-describedby'), name.id].filter(Boolean).join(' '));
  });

  // ۲-ج. گزینهٔ خالی پیش‌فرض Django («---------») در انتخاب تنوع محصول
  $$('select[name=variant] option[value=""]').forEach(o => { o.textContent = 'سایز و رنگ را انتخاب کنید'; });

  // ۲-د. تنوع‌های کاملاً ناموجود را در فرم محصول قابل انتخاب نکن.
  const faDigits = value => String(value).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  $$('select[name=variant] option').forEach(option => {
    const match = option.textContent.match(/موجودی\s*:\s*([۰-۹٠-٩0-9٬,]+)/);
    if (!match) return;
    const stock = Number(faDigits(match[1]).replace(/[٬,]/g, ''));
    if (Number.isFinite(stock) && stock < 1) option.disabled = true;
  });

  // ۲-هـ. کنترل تعداد سبد؛ فقط با دکمهٔ «به‌روزرسانی» فرم به سرور ارسال می‌شود.
  document.querySelectorAll('form[data-quantity-form]').forEach(form => {
    if (form.dataset.tpQuantityBound === 'true') return;
    const input = form.querySelector('input[name=quantity]');
    if (!input) return;
    form.dataset.tpQuantityBound = 'true';
    const buttons = $('[data-qty-step]', form);
    const getLimits = () => {
      const minValue = Number.parseInt(input.min || '1', 10);
      const min = Number.isFinite(minValue) ? minValue : 1;
      const maxValue = input.max === '' ? Infinity : Number.parseInt(input.max, 10);
      const max = Number.isFinite(maxValue) ? maxValue : Infinity;
      return { min, max, valid: max >= min };
    };
    const updateButtons = () => {
      const { min, max, valid } = getLimits();
      const current = Number.parseInt(input.value, 10);
      buttons.forEach(button => {
        const step = Number.parseInt(button.dataset.qtyStep || '0', 10);
        button.hidden = !valid || (step !== -1 && step !== 1);
        button.disabled = !valid || !Number.isFinite(current) ||
          (step < 0 && current <= min) || (step > 0 && current >= max);
      });
    };
    buttons.forEach(button => button.addEventListener('click', () => {
      const { min, max, valid } = getLimits();
      if (!valid) return;
      const step = Number.parseInt(button.dataset.qtyStep || '0', 10);
      if (step !== -1 && step !== 1) return;
      const current = Number.parseInt(input.value, 10);
      const safeCurrent = Number.isFinite(current) ? current : min;
      input.value = String(Math.min(max, Math.max(min, safeCurrent + step)));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      updateButtons();
    }));
    input.addEventListener('input', updateButtons);
    input.addEventListener('change', updateButtons);
    updateButtons();
  });

  // ۳. فیلترهای فروشگاه روی موبایل
  $$('[data-toggle]').forEach(btn => {
    const p = document.getElementById(btn.dataset.toggle); if (!p) return;
    btn.addEventListener('click', () => { const open = p.classList.toggle('open'); btn.setAttribute('aria-expanded', String(open)); if (open) p.querySelector('select,input,button')?.focus(); });
  });
  // انتخاب مرتب‌سازی بدون دکمه
  $$('select[name=sort]').forEach(s => s.addEventListener('change', () => s.form && s.form.requestSubmit()));

  // ۴. پس از ارسال ناموفق فرم، فوکوس روی اولین فیلد خطادار (Django خودش aria-invalid می‌گذارد)
  const bad = $('main [aria-invalid=true]');
  if (bad) { bad.focus({ preventScroll: true }); bad.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
  else { const summary = $('.tp-form-sum[role=alert]'); if (summary) { summary.focus({ preventScroll: true }); summary.scrollIntoView({ block: 'center' }); } }

  // ۴-ب. بارگذاری ویدئوی قسمت با نوار پیشرفت و لغو درخواست مرورگر.
  // اعتبارسنجی، ذخیره خصوصی و مجوز پخش همچنان سمت Django باقی می‌ماند.
  const episodeForm = $('form.tp-editor-form[data-video-upload-form]');
  const episodeVideoInput = episodeForm && $('input[type="file"][name="video_file"]', episodeForm);
  if (episodeForm && episodeVideoInput) {
    const progressBox = document.createElement('section');
    progressBox.className = 'tp-video-upload-progress';
    progressBox.hidden = true;
    progressBox.setAttribute('aria-live', 'polite');
    progressBox.setAttribute('aria-busy', 'false');

    const progressMessage = document.createElement('p');
    progressMessage.className = 'tp-video-upload-progress-message';
    const progressBar = document.createElement('progress');
    progressBar.max = 100;
    progressBar.value = 0;
    progressBar.setAttribute('aria-label', 'پیشرفت بارگذاری ویدئو');

    const progressMeta = document.createElement('span');
    progressMeta.className = 'tp-video-upload-progress-meta';

    const cancelUpload = document.createElement('button');
    cancelUpload.type = 'button';
    cancelUpload.className = 'btn o s tp-video-upload-cancel';
    cancelUpload.textContent = 'لغو بارگذاری';
    cancelUpload.hidden = true;

    progressBox.append(progressMessage, progressBar, progressMeta, cancelUpload);
    const editorActions = episodeForm.querySelector('.tp-editor-actions');
    if (editorActions) editorActions.insertAdjacentElement('beforebegin', progressBox);
    else episodeForm.append(progressBox);

    const submitControl = episodeForm.querySelector('button[type="submit"], input[type="submit"]');
    const submitInitiallyDisabled = submitControl ? submitControl.disabled : false;
    let uploadRequest = null;
    let uploadActive = false;

    const toFaUploadDigits = value => String(value).replace(/[0-9]/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
    const formatUploadSize = bytes => {
      const mb = Number(bytes) / (1024 * 1024);
      return mb.toLocaleString('fa-IR', { maximumFractionDigits: 1 }) + ' مگابایت';
    };

    const finishVideoUpload = message => {
      uploadActive = false;
      episodeForm.dataset.videoUploadActive = 'false';
      uploadRequest = null;
      progressBox.setAttribute('aria-busy', 'false');
      progressMessage.textContent = message;
      cancelUpload.hidden = true;
      cancelUpload.disabled = false;
      if (submitControl) {
        submitControl.disabled = submitInitiallyDisabled;
        submitControl.classList.remove('is-loading');
      }
    };

    cancelUpload.addEventListener('click', () => {
      if (uploadRequest && uploadRequest.readyState !== XMLHttpRequest.DONE) {
        cancelUpload.disabled = true;
        progressMessage.textContent = 'در حال متوقف کردن ارسال از مرورگر...';
        uploadRequest.abort();
      }
    });

    episodeForm.addEventListener('submit', event => {
      if (uploadActive) {
        event.preventDefault();
        return;
      }

      const file = episodeVideoInput.files && episodeVideoInput.files[0];
      if (!file) return; // ویرایش اطلاعات بدون جایگزینی ویدئو، فرم معمول Django را حفظ می‌کند.

      event.preventDefault();

      const maxBytes = Number(episodeForm.dataset.maxUploadBytes || 0);
      if (!/[.]mp4$/i.test(file.name)) {
        progressBox.hidden = false;
        finishVideoUpload('فقط فایل با پسوند MP4 مجاز است. فایل دیگری انتخاب کنید.');
        episodeVideoInput.focus();
        return;
      }
      if (Number.isFinite(maxBytes) && maxBytes > 0 && file.size > maxBytes) {
        progressBox.hidden = false;
        finishVideoUpload('حجم فایل از حد مجاز ' + formatUploadSize(maxBytes) + ' بیشتر است.');
        episodeVideoInput.focus();
        return;
      }

      uploadActive = true;
      episodeForm.dataset.videoUploadActive = 'true';
      progressBox.hidden = false;
      progressBox.setAttribute('aria-busy', 'true');
      progressMessage.textContent = 'در حال ارسال فایل «' + file.name + '»...';
      progressBar.value = 0;
      progressMeta.textContent = '۰٪ · ۰ مگابایت از ' + formatUploadSize(file.size);
      cancelUpload.hidden = false;
      cancelUpload.disabled = false;
      if (submitControl) {
        submitControl.disabled = true;
        submitControl.classList.add('is-loading');
      }

      const request = new XMLHttpRequest();
      uploadRequest = request;
      const csrfInput = episodeForm.querySelector('input[name="csrfmiddlewaretoken"]');

      request.open('POST', episodeForm.action || window.location.href, true);
      request.withCredentials = true;
      if (csrfInput && csrfInput.value) request.setRequestHeader('X-CSRFToken', csrfInput.value);

      request.upload.addEventListener('progress', uploadEvent => {
        if (!uploadEvent.lengthComputable || uploadEvent.total <= 0) {
          progressMessage.textContent = 'بارگذاری ویدئو در حال انجام است...';
          return;
        }
        const percent = Math.max(0, Math.min(100, Math.round((uploadEvent.loaded / uploadEvent.total) * 100)));
        progressBar.value = percent;
        progressMeta.textContent = toFaUploadDigits(percent) + '٪ · ' +
          formatUploadSize(uploadEvent.loaded) + ' از ' + formatUploadSize(uploadEvent.total);
        progressMessage.textContent = percent >= 100
          ? 'ارسال فایل انجام شد؛ در انتظار پاسخ سرور...'
          : 'بارگذاری ویدئو در حال انجام است...';
      });

      request.addEventListener('load', () => {
        if (request.status >= 200 && request.status < 400) {
          let finalUrl;
          try {
            finalUrl = new URL(request.responseURL || window.location.href, window.location.href);
          } catch {
            finishVideoUpload('پاسخ سرور قابل تشخیص نبود. صفحه را بررسی و دوباره تلاش کنید.');
            return;
          }

          if (finalUrl.origin !== window.location.origin) {
            finishVideoUpload('پاسخ سرور به نشانی غیرمجاز هدایت شد؛ برای امنیت، انتقال انجام نشد.');
            return;
          }
          if (finalUrl.href !== window.location.href) {
            window.location.assign(finalUrl.href);
            return;
          }

          const contentType = request.getResponseHeader('Content-Type') || '';
          if (request.responseText && contentType.toLowerCase().includes('text/html')) {
            document.open();
            document.write(request.responseText);
            document.close();
            return;
          }
          finishVideoUpload('پاسخ سرور دریافت شد، اما صفحه نتیجه قابل نمایش نبود. صفحه را تازه‌سازی و وضعیت قسمت را بررسی کنید.');
          return;
        }
        finishVideoUpload('سرور درخواست را نپذیرفت (HTTP ' + toFaUploadDigits(request.status) +
          '). پیام خطا را بررسی و دوباره تلاش کنید.');
      });

      request.addEventListener('error', () => {
        finishVideoUpload('ارتباط با سرور قطع شد. اتصال را بررسی کنید و دوباره تلاش کنید.');
      });

      request.addEventListener('abort', () => {
        finishVideoUpload('ارسال از مرورگر لغو شد. اگر سرور فایل را پیش از لغو کامل دریافت کرده باشد، ممکن است آن را ذخیره کرده باشد؛ وضعیت قسمت را بررسی کنید.');
      });

      request.send(new FormData(episodeForm));
    });
  }

  // ۵. جلوگیری از ارسال دوباره (دوبار کلیک)
  $$('form[method=post]').forEach(f => f.addEventListener('submit', event => {
    if (event.defaultPrevented) return;
    const s = f.querySelector('[type=submit]'); if (s) { setTimeout(() => { s.disabled = true; s.classList.add('is-loading'); }, 0); }
  }));

  // ۵-ب. قالب‌بندی مقادیر عددی با ارقام فارسی.
  $$('[data-fa-number]').forEach(node => {
    const raw = String(node.textContent || '').replace(/[٬,\s]/g, '');
    const value = Number(raw);
    if (Number.isFinite(value)) node.textContent = value.toLocaleString('fa-IR');
  });

  // ۶. پیام دریافت جم: تگ gem در Django messages به toast کوتاه منتقل می‌شود.
  const gemMessages = $$('.tp-msg.gem');
  if (gemMessages.length) {
    const toast = $('#ts');
    if (toast) {
      toast.textContent = gemMessages.map(m => m.textContent.trim()).filter(Boolean).join(' ');
      toast.classList.add('on', 'info');
      window.setTimeout(() => { toast.classList.remove('on', 'info'); toast.textContent = ''; }, 4500);
    }
  }

  // ۶. پیام‌ها خواندنی می‌مانند؛ فقط در نبود خطای فیلد روی پیام خطا فوکوس می‌شود.
  if (!bad) { const err = $('.tp-msg.error'); if (err) { err.tabIndex = -1; err.focus({ preventScroll: true }); } }
})();
