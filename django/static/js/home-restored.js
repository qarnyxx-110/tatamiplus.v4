// Homepage-only progressive enhancement: scroll-led technique story.
(() => {
  'use strict';
  const story = document.querySelector('[data-home-cine]');
  if (!story) return;

  const slides = [...story.querySelectorAll('.tp-home-scene')];
  const bar = story.querySelector('.tp-home-cine-progress span');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!slides.length) return;

  let frame = 0;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function update() {
    frame = 0;
    if (reducedMotion.matches) {
      slides.forEach((slide) => {
        slide.style.opacity = '1';
        slide.style.transform = 'none';
        slide.style.pointerEvents = 'auto';
      });
      if (bar) bar.style.width = '100%';
      return;
    }

    const rect = story.getBoundingClientRect();
    const travel = Math.max(1, story.offsetHeight - window.innerHeight);
    const progress = clamp((-rect.top / travel) * slides.length, 0, slides.length);

    slides.forEach((slide, index) => {
      const distance = progress - (index + 0.5);
      const opacity = Math.max(0, 1 - Math.abs(distance) * 1.7);
      slide.style.opacity = String(opacity);
      slide.style.transform = `translateY(${distance * -50}px) scale(${0.92 + opacity * 0.08})`;
      slide.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
    });

    if (bar) bar.style.width = `${(progress / slides.length) * 100}%`;
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  reducedMotion.addEventListener?.('change', schedule);
  update();
})();
