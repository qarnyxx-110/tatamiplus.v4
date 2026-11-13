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
        const status = document.createElement('span'); status.className = 'tp-role-status'; status.textContent = 'در دست طراحی';
        club.append(icon, title, desc, status);
        club.addEventListener('click', () => {
          form.dataset.rolePreview = 'club';
          picker.querySelectorAll('[role=radio]').forEach(item => item.setAttribute('aria-checked', String(item === club)));
          club.classList.add('is-selected');
          const note = form.querySelector('.tp-club-preview');
          if (!note) {
            const panel = document.createElement('div');
            panel.className = 'tp-club-preview';
            panel.setAttribute('role', 'status');
            panel.setAttribute('aria-live', 'polite');
            panel.innerHTML = '<b>حساب باشگاه در حال طراحی است</b><p>ساختار اطلاعات باشگاه در رابط کاربری پیش‌بینی شده؛ ثبت‌نام و ذخیره واقعی پس از تحویل قرارداد بک‌اند فعال می‌شود.</p>';
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
      const nav = document.createElement('div'); nav.className = 'tp-auth-mobile-actions';
      const back = document.createElement('button'); back.type = 'button'; back.className = 'btn o'; back.dataset.authBack = ''; back.textContent = 'بازگشت';
      const next = document.createElement('button'); next.type = 'button'; next.className = 'btn'; next.dataset.authNext = ''; next.textContent = 'ادامه';
      const submit = form.querySelector('[type=submit]');
      nav.append(back, next);
      second.append(nav);
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

  // ۲-هـ. کنترل تعداد سبد؛ بدون JS، ورودی عددی و دکمهٔ به‌روزرسانی عادی باقی می‌مانند.
  $$('form[data-quantity-form]').forEach(form => {
    const input = form.querySelector('input[name=quantity]');
    if (!input) return;
    const buttons = $$('[data-qty-step]', form);
    const max = input.max === '' ? Infinity : Number(input.max);
    buttons.forEach(button => {
      if (Number.isFinite(max) && max < Number(input.min || 1)) return;
      button.hidden = false;
      button.addEventListener('click', () => {
        const step = Number(button.dataset.qtyStep || 0);
        const min = Number(input.min || 1);
        const upper = Number.isFinite(max) ? Math.max(min, max) : Infinity;
        const current = Number(input.value || min);
        const next = Math.min(upper, Math.max(min, current + step));
        if (next === current) return;
        input.value = String(next);
        input.dispatchEvent(new Event('change', { bubbles: true }));
        if (form.__tpQtyTimer) window.clearTimeout(form.__tpQtyTimer);
        form.__tpQtyTimer = window.setTimeout(() => {
          if (typeof form.requestSubmit === 'function') form.requestSubmit();
          else form.submit();
        }, 350);
      });
    });
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

  // ۵. جلوگیری از ارسال دوباره (دوبار کلیک)
  $$('form[method=post]').forEach(f => f.addEventListener('submit', () => {
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
