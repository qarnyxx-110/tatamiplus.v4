// مربی آنلاین: پیش‌نمایش محلی دوربین و آماده‌سازی رابط شمارش؛ پردازش/ربات هنوز متصل نیست.
let tpOcStream = null;
let tpOcFacing = 'environment';
let tpOcCameraBusy = false;

Object.assign(views, {
  'online-coach': () => {
    PT = {
      t: 'مربی آنلاین',
      d: 'محیط تمرین اوچی‌کومی با پیش‌نمایش زنده دوربین و آماده اتصال به شمارشگر هوشمند.'
    };
    return `
      <div class="w tp-oc">
        <section class="tp-oc-hero" aria-labelledby="tp-oc-title">
          <div class="tp-oc-hero-copy">
            <span class="tag">تمرین هوشمند جودو</span>
            <h1 id="tp-oc-title">مربی آنلاین</h1>
            <p>دوربین را روشن کن و تمرین اوچی‌کومی را در کادر قرار بده. پس از اتصال پردازشگر ربات، تکرارها به‌صورت خودکار شمرده می‌شوند.</p>
            <div class="tp-oc-status-row">
              <span class="tp-oc-status"><i class="tp-oc-dot is-idle" aria-hidden="true"></i><span id="tp-oc-camera-state">دوربین خاموش</span></span>
              <span class="tp-oc-status"><i class="tp-oc-dot is-offline" aria-hidden="true"></i>ربات هنوز متصل نشده است</span>
            </div>
          </div>
          <aside class="tp-oc-hero-note">
            <span class="tp-oc-note-icon" aria-hidden="true">◎</span>
            <b>بدون بارگذاری فایل</b>
            <p>تصویر از دوربین به‌صورت زنده دریافت می‌شود؛ در این نسخه فقط پیش‌نمایش محلی فعال است و تصویر به سرور ارسال نمی‌شود.</p>
          </aside>
        </section>

        <section class="tp-oc-workspace" aria-label="محیط تمرین اوچی‌کومی">
          <div class="tp-oc-camera-card">
            <div class="tp-oc-card-head">
              <div>
                <h2>دوربین تمرین</h2>
                <p class="mu sm">کادر دوربین خود را تنظیم کن</p>
              </div>
              <span class="tag m">پیش‌نمایش محلی</span>
            </div>
            <div class="tp-oc-stage">
              <video id="tp-oc-video" class="tp-oc-video" autoplay muted playsinline hidden aria-label="پیش‌نمایش زنده دوربین"></video>
              <div id="tp-oc-placeholder" class="tp-oc-placeholder">
                <span class="tp-oc-camera-symbol" aria-hidden="true">
                  <svg viewBox="0 0 48 48" fill="none"><rect x="5" y="12" width="27" height="24" rx="4" stroke="currentColor" stroke-width="2.5"/><path d="m32 20 11-6v20l-11-6" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><circle cx="18.5" cy="24" r="6" stroke="currentColor" stroke-width="2.5"/></svg>
                </span>
                <b>تصویر دوربین هنوز فعال نشده است</b>
                <span>برای شروع، اجازه دسترسی دوربین را در مرورگر تأیید کن.</span>
              </div>
              <span class="tp-oc-live-label"><i aria-hidden="true"></i>نمای زنده دوربین</span>
            </div>

            <div class="tp-oc-camera-tools">
              <div class="tp-oc-facing" role="group" aria-label="انتخاب دوربین">
                <button type="button" class="chip" id="tp-oc-back-camera" aria-pressed="true" onclick="setOnlineCoachCameraFacing('environment')">دوربین پشت</button>
                <button type="button" class="chip" id="tp-oc-front-camera" aria-pressed="false" onclick="setOnlineCoachCameraFacing('user')">دوربین جلو</button>
              </div>
              <div class="tp-oc-camera-actions">
                <button type="button" class="btn" id="tp-oc-camera-start" onclick="startOnlineCoachCamera()">روشن کردن دوربین</button>
                <button type="button" class="btn o" id="tp-oc-camera-stop" onclick="stopOnlineCoachCamera()" disabled>خاموش کردن دوربین</button>
              </div>
            </div>
            <p id="tp-oc-camera-message" class="tp-oc-camera-message" role="status" aria-live="polite">با انتخاب «روشن کردن دوربین»، مرورگر برای دسترسی به دوربین از تو اجازه می‌گیرد.</p>
          </div>

          <aside class="tp-oc-results" aria-label="وضعیت شمارش اوچی‌کومی">
            <article class="tp-oc-counter-card">
              <span class="tp-oc-eyebrow">شمارش این جلسه</span>
              <h2>تعداد اوچی‌کومی</h2>
              <output id="tp-oc-count" class="tp-oc-count" aria-live="polite">—</output>
              <p>شمارش واقعی بعد از اتصال پردازشگر ربات فعال می‌شود.</p>
              <button type="button" class="btn tp-oc-count-button" id="tp-oc-count-start" disabled title="این قابلیت پس از اتصال ربات فعال می‌شود">شروع شمارش</button>
              <span class="tp-oc-disabled-note">در انتظار اتصال ربات شمارشگر</span>
            </article>
            <article class="tp-oc-connection-card">
              <div class="tp-oc-connection-icon" aria-hidden="true">⌁</div>
              <div>
                <b>وضعیت پردازشگر</b>
                <p id="tp-oc-bot-state" class="mu sm">ربات هنوز متصل نشده است</p>
              </div>
              <span class="tp-oc-connection-indicator" aria-hidden="true"></span>
            </article>
            <article class="tp-oc-privacy-card">
              <b>حریم خصوصی تصویر</b>
              <p>در نسخه فعلی، تصویر فقط روی همین دستگاه نمایش داده می‌شود؛ نه ضبط می‌شود و نه به جایی ارسال می‌شود.</p>
            </article>
          </aside>
        </section>

        <section class="tp-oc-lower">
          <div class="tp-oc-guidance">
            <div class="tp-oc-section-title">
              <h2>قبل از شروع تمرین</h2>
              <span class="mu sm">برای آماده‌سازی کادر</span>
            </div>
            <div class="tp-oc-guide-grid">
              <article><span aria-hidden="true">۱</span><b>تمام بدن در کادر باشد</b><p>فضای حرکت پاها و بالاتنه از دوربین خارج نشود.</p></article>
              <article><span aria-hidden="true">۲</span><b>نور کافی داشته باش</b><p>نور محیط کمک می‌کند تصویر واضح‌تر باشد.</p></article>
              <article><span aria-hidden="true">۳</span><b>گوشی را ثابت قرار بده</b><p>برای پیش‌نمایش پایدار، گوشی را روی سطح محکم بگذار.</p></article>
            </div>
          </div>
          <div class="tp-oc-history">
            <div class="tp-oc-section-title"><h2>گزارش تمرین‌ها</h2></div>
            <div class="tp-state">
              <b>هنوز گزارشی ثبت نشده است</b>
              <p>پس از اتصال ربات، تعداد اوچی‌کومی و سوابق جلسات در این قسمت نمایش داده می‌شود.</p>
            </div>
          </div>
        </section>
        <p class="tp-oc-demo-note">وضعیت فعلی: رابط کاربری و پیش‌نمایش دوربین آماده‌اند؛ تشخیص حرکت، شمارش خودکار و ارتباط با ربات هنوز پیاده‌سازی یا متصل نشده‌اند.</p>
      </div>`;
  }
});

function tpOcSetMessage(message, kind = 'info') {
  const el = document.getElementById('tp-oc-camera-message');
  if (el) {
    el.textContent = message;
    el.dataset.state = kind;
  }
}

function tpOcSyncCameraUi(active) {
  const state = document.getElementById('tp-oc-camera-state');
  const start = document.getElementById('tp-oc-camera-start');
  const stop = document.getElementById('tp-oc-camera-stop');
  const video = document.getElementById('tp-oc-video');
  const placeholder = document.getElementById('tp-oc-placeholder');
  if (state) state.textContent = active ? 'دوربین روشن است' : 'دوربین خاموش';
  if (start) start.disabled = active || tpOcCameraBusy;
  if (stop) stop.disabled = !active || tpOcCameraBusy;
  if (video) video.hidden = !active;
  if (placeholder) placeholder.hidden = active;
  const stage = document.querySelector('.tp-oc-stage');
  if (stage) stage.dataset.cameraActive = active ? 'true' : 'false';
  const dot = document.querySelector('.tp-oc-status .tp-oc-dot');
  if (dot) dot.classList.toggle('is-active', active);
}

async function startOnlineCoachCamera() {
  if (tpOcStream || tpOcCameraBusy) return;
  const start = document.getElementById('tp-oc-camera-start');
  if (!document.getElementById('tp-oc-video')) return;
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    tpOcSetMessage('دسترسی به دوربین در این مرورگر در دسترس نیست. صفحه را با HTTPS و یک مرورگر به‌روز باز کن.', 'error');
    return;
  }
  tpOcCameraBusy = true;
  if (start) start.disabled = true;
  tpOcSetMessage('در حال درخواست اجازه دسترسی به دوربین…');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: tpOcFacing },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
    const video = document.getElementById('tp-oc-video');
    if (!video) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    tpOcStream = stream;
    video.srcObject = stream;
    await video.play();
    tpOcSyncCameraUi(true);
    tpOcSetMessage('دوربین فعال است. این تصویر فقط به‌صورت محلی در همین صفحه نمایش داده می‌شود و هنوز به ربات ارسال نمی‌شود.', 'success');
  } catch (error) {
    const message = error && error.name === 'NotAllowedError'
      ? 'اجازه دسترسی به دوربین داده نشد. مجوز دوربین را از تنظیمات مرورگر فعال کن.'
      : error && error.name === 'NotFoundError'
        ? 'دوربینی روی این دستگاه پیدا نشد.'
        : 'فعال‌کردن دوربین ممکن نشد. اتصال امن HTTPS و مجوز مرورگر را بررسی کن.';
    tpOcSetMessage(message, 'error');
    tpOcSyncCameraUi(false);
  } finally {
    tpOcCameraBusy = false;
    if (start) start.disabled = !!tpOcStream;
    const stop = document.getElementById('tp-oc-camera-stop');
    if (stop) stop.disabled = !tpOcStream;
  }
}

function stopOnlineCoachCamera(announce = true) {
  if (tpOcStream) {
    tpOcStream.getTracks().forEach(track => {
      try { track.stop(); } catch {}
    });
    tpOcStream = null;
  }
  const video = document.getElementById('tp-oc-video');
  if (video) {
    try { video.pause(); } catch {}
    video.srcObject = null;
  }
  tpOcSyncCameraUi(false);
  if (announce && document.getElementById('tp-oc-camera-message')) {
    tpOcSetMessage('دوربین خاموش شد و دسترسی تصویر این صفحه متوقف شد.');
  }
}

async function setOnlineCoachCameraFacing(mode) {
  if (mode !== 'user' && mode !== 'environment') return;
  tpOcFacing = mode;
  const back = document.getElementById('tp-oc-back-camera');
  const front = document.getElementById('tp-oc-front-camera');
  if (back) back.setAttribute('aria-pressed', String(mode === 'environment'));
  if (front) front.setAttribute('aria-pressed', String(mode === 'user'));
  if (tpOcStream) {
    stopOnlineCoachCamera(false);
    await startOnlineCoachCamera();
  }
}

addEventListener('pagehide', () => stopOnlineCoachCamera(false));
