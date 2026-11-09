// اتصال قالب‌های Django به Neshan Leaflet Web SDK.
// کلید فقط Web Key محدودشده به دامنه است؛ Service Key نباید به مرورگر ارسال شود.
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RADII = [2, 5, 10, 25];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  const safeUrl = value => {
    const url = String(value || '').trim();
    return /^(https?:\/\/|\/(?!\/))/i.test(url) ? url : '';
  };

  const distanceKm = (a, b, c, d) => {
    const rad = x => x * Math.PI / 180;
    const earth = 6371;
    const dLat = rad(c - a), dLng = rad(d - b);
    const x = Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(dLng / 2) ** 2;
    return earth * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  };

  let leafletPromise;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;

    leafletPromise = new Promise((resolve, reject) => {
      if (!$('link[data-tp-neshan-leaflet]')) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://static.neshan.org/sdk/leaflet/1.4.0/leaflet.css';
        css.dataset.tpNeshanLeaflet = '1';
        document.head.appendChild(css);
      }

      const script = document.createElement('script');
      script.src = 'https://static.neshan.org/sdk/leaflet/1.4.0/leaflet.js';
      script.async = true;
      script.onload = () => window.L ? resolve(window.L) : reject(new Error('SDK نشان بارگذاری نشد.'));
      script.onerror = () => reject(new Error('دریافت SDK نشان ناموفق بود.'));
      document.head.appendChild(script);
    });
    return leafletPromise;
  }

  function popupHtml(club, distance) {
    const name = esc(club.name || club.title || 'باشگاه');
    const city = esc(club.city || '');
    const detailUrl = safeUrl(club.detail_url || club.url);
    const distanceText = Number.isFinite(distance)
      ? '<p class="tp-map-popup-distance">' + distance.toLocaleString('fa-IR', { maximumFractionDigits: 1 }) + ' کیلومتر</p>'
      : '';
    const detailLink = detailUrl
      ? '<a href="' + esc(detailUrl) + '">مشاهده جزئیات باشگاه</a>'
      : '';
    return '<div class="tp-map-popup"><b>' + name + '</b>' +
      (city ? '<p>' + city + '</p>' : '') + distanceText + detailLink + '</div>';
  }

  function setStatus(root, message) {
    const id = root.dataset.statusId;
    const target = id ? document.getElementById(id) : null;
    if (target) target.textContent = message;
  }

  async function initMap(root) {
    const key = root.dataset.mapKey || '';
    const single = root.dataset.single === 'true';
    const apiUrl = root.dataset.apiUrl || '';
    const lat = Number(root.dataset.singleLat);
    const lng = Number(root.dataset.singleLng);
    const hasSingleCoords = root.dataset.singleLat !== '' &&
      root.dataset.singleLng !== '' &&
      Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

    if (!key) {
      setStatus(root, 'برای بارگذاری نقشهٔ نشان، Web Key محدودشده به دامنه لازم است.');
      return;
    }
    if (single && !hasSingleCoords) {
      setStatus(root, 'مختصات واقعی این باشگاه هنوز در داده‌ها ثبت نشده است.');
      return;
    }

    try {
      const L = await loadLeaflet();
      const centerLat = single ? lat : Number(root.dataset.centerLat || 35.699739);
      const centerLng = single ? lng : Number(root.dataset.centerLng || 51.338097);
      const map = new L.Map(root.id, {
        key,
        maptype: 'dreamy',
        center: [centerLat, centerLng],
        zoom: single ? 15 : 12,
        traffic: false,
        poi: true
      });

      window.__tpDjangoClubMap = map;
      const placeholder = root.querySelector('.tp-map-placeholder');
      if (placeholder) placeholder.remove();

      if (single) {
        L.marker([lat, lng]).addTo(map)
          .bindPopup(popupHtml({
            name: root.dataset.clubName,
            city: root.dataset.clubCity
          }, NaN))
          .openPopup();
        setStatus(root, 'موقعیت باشگاه روی نقشه نشان داده شد.');
        return;
      }

      if (!apiUrl) {
        setStatus(root, 'نقشه آماده است؛ برای نمایش نشانک‌ها باید JSON endpoint باشگاه‌ها تنظیم شود.');
        return;
      }

      const form = document.getElementById('tp-club-filters');
      const endpoint = new URL(apiUrl, window.location.href);
      if (form) {
        const params = new URLSearchParams(new FormData(form));
        for (const [name, value] of params.entries()) {
          if (value !== '') endpoint.searchParams.set(name, value);
        }
      }

      const response = await fetch(endpoint.toString(), {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin'
      });
      if (!response.ok) throw new Error('دریافت فهرست مختصات باشگاه‌ها ناموفق بود.');

      const payload = await response.json();
      const clubs = Array.isArray(payload) ? payload :
        (Array.isArray(payload.results) ? payload.results : null);
      if (!clubs) throw new Error('ساختار پاسخ JSON باشگاه‌ها معتبر نیست.');

      const userLat = Number(form && form.elements.lat ? form.elements.lat.value : '');
      const userLng = Number(form && form.elements.lng ? form.elements.lng.value : '');
      const cardsById = new Map();
      $$('[data-club-card][data-club-id]').forEach(card => cardsById.set(String(card.dataset.clubId), card));

      const markers = new Map();
      const bounds = [];
      let count = 0;

      clubs.forEach(club => {
        const markerLat = Number(club.latitude ?? club.lat);
        const markerLng = Number(club.longitude ?? club.lng);
        if (!Number.isFinite(markerLat) || !Number.isFinite(markerLng) ||
            markerLat < -90 || markerLat > 90 || markerLng < -180 || markerLng > 180) return;

        const hasDistance = Number.isFinite(Number(club.distance_km));
        const distance = hasDistance ? Number(club.distance_km) :
          (Number.isFinite(userLat) && Number.isFinite(userLng)
            ? distanceKm(userLat, userLng, markerLat, markerLng) : NaN);

        const marker = L.marker([markerLat, markerLng]).addTo(map)
          .bindPopup(popupHtml(club, distance));
        const id = String(club.id ?? '');
        if (id) markers.set(id, { marker, lat: markerLat, lng: markerLng });
        bounds.push([markerLat, markerLng]);
        count += 1;
      });

      if (bounds.length > 1 && L.latLngBounds) map.fitBounds(L.latLngBounds(bounds).pad(0.16));
      else if (bounds.length === 1) map.setView(bounds[0], 14);

      cardsById.forEach((card, id) => {
        const entry = markers.get(id);
        if (!entry) return;
        const focusMarker = () => {
          map.panTo([entry.lat, entry.lng]);
          entry.marker.openPopup();
          card.classList.add('is-map-active');
        };
        const clear = () => card.classList.remove('is-map-active');
        card.addEventListener('mouseenter', focusMarker);
        card.addEventListener('mouseleave', clear);
        card.addEventListener('focusin', focusMarker);
        card.addEventListener('focusout', clear);
      });

      setStatus(root, count
        ? count.toLocaleString('fa-IR') + ' باشگاه روی نقشه نمایش داده شد.'
        : 'در این شعاع باشگاهی با مختصات معتبر پیدا نشد؛ شعاع را بیشتر کنید.');
    } catch (error) {
      setStatus(root, error && error.message ? error.message : 'نقشه بارگذاری نشد؛ اتصال اینترنت و Web Key را بررسی کنید.');
    }
  }

  function initRadiusControl() {
    const slider = $('[data-radius-control]');
    const hidden = $('#tp-club-radius-value');
    const label = $('#tp-club-radius-label');
    if (!slider || !hidden) return;
    const update = () => {
      const radius = RADII[Number(slider.value)] || 5;
      hidden.value = String(radius);
      if (label) label.textContent = radius.toLocaleString('fa-IR') + ' کیلومتر';
    };
    slider.addEventListener('input', update);
    update();
  }

  function initGeolocation() {
    const button = $('[data-geolocate]');
    if (!button) return;
    button.addEventListener('click', () => {
      const status = $('#tp-club-near-status');
      const form = $('#tp-club-filters');
      const lat = $('#tp-club-lat'), lng = $('#tp-club-lng');
      const city = $('#tp-club-city');
      const fail = () => {
        if (status) status.textContent = 'موقعیت دریافت نشد؛ شهر را از فهرست انتخاب کنید.';
        if (city) city.focus();
      };
      if (!navigator.geolocation) {
        if (status) status.textContent = 'مرورگر موقعیت‌یابی را پشتیبانی نمی‌کند.';
        fail();
        return;
      }
      if (status) status.textContent = 'در حال دریافت موقعیت…';
      navigator.geolocation.getCurrentPosition(position => {
        if (lat) lat.value = position.coords.latitude.toFixed(6);
        if (lng) lng.value = position.coords.longitude.toFixed(6);
        if (city) city.value = '';
        if (form) form.requestSubmit();
      }, fail, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    });
  }

  function initMobileTabs() {
    const root = $('.tp-clubs-layout');
    if (!root) return;
    $$('[data-club-tab]').forEach(button => {
      button.addEventListener('click', () => {
        root.dataset.mobileTab = button.dataset.clubTab;
        $$('[data-club-tab]').forEach(item =>
          item.setAttribute('aria-pressed', String(item === button)));
        if (button.dataset.clubTab === 'map' && window.__tpDjangoClubMap) {
          window.__tpDjangoClubMap.invalidateSize();
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initRadiusControl();
    initGeolocation();
    initMobileTabs();
    $$('.tp-neshan-map').forEach(initMap);
  });
})();
