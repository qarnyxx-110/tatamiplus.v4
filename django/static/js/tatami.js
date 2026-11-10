// تاتامی پلاس — بهبودهای کوچک سمت مرورگر برای تمپلیت‌های Django.
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ۰. قرارداد فیلدهای ورود/ثبت‌نام؛ نام‌ها و اعتبارسنجی همچنان متعلق به Django هستند.
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
