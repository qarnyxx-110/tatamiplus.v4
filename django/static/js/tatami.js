// تاتامی پلاس — بهبودهای کوچک سمت مرورگر برای تمپلیت‌های Django.
// همهٔ صفحه‌ها بدون این فایل هم کار می‌کنند (فرم‌ها، لینک‌ها و خطاها را Django رندر می‌کند).
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

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

  // ۵. جلوگیری از ارسال دوباره (دوبار کلیک)
  $$('form[method=post]').forEach(f => f.addEventListener('submit', () => {
    const s = f.querySelector('[type=submit]'); if (s) { setTimeout(() => { s.disabled = true; s.classList.add('is-loading'); }, 0); }
  }));

  // ۶. پیام‌ها: پس از چند ثانیه کم‌رنگ نمی‌شوند (خواندنی می‌مانند)؛ فقط فوکوس روی پیام خطا اگر فیلدی خطا ندارد
  if (!bad) { const err = $('.tp-msg.error'); if (err) { err.tabIndex = -1; err.focus({ preventScroll: true }); } }
})();
