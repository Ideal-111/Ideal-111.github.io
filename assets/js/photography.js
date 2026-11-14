(function () {
  'use strict';

  document.querySelectorAll('.photography-carousel').forEach(function (carousel) {
    var track = carousel.querySelector('.photography-gallery');
    var cards = Array.from(track.querySelectorAll('.photography-card'));
    if (cards.length < 2) return;

    var controls = carousel.querySelector('.photography-controls');
    var toggle = carousel.querySelector('.photography-autoplay');
    var position = carousel.querySelector('.photography-position');
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var playing = !reducedMotion.matches;
    var hovering = false;
    var interacting = false;
    var visible = true;
    var perView = 1;
    var timer;
    var scrollTimer;

    function currentIndex() {
      var closest = 0;
      cards.forEach(function (card, index) {
        if (Math.abs(card.getBoundingClientRect().left - track.getBoundingClientRect().left) <
            Math.abs(cards[closest].getBoundingClientRect().left - track.getBoundingClientRect().left)) {
          closest = index;
        }
      });
      return Math.min(closest, cards.length - perView);
    }

    function updatePosition() {
      var first = currentIndex() + 1;
      var last = Math.min(first + perView - 1, cards.length);
      position.textContent = String(first).padStart(2, '0') +
        (perView > 1 ? '–' + String(last).padStart(2, '0') : '') +
        ' / ' + String(cards.length).padStart(2, '0');
    }

    function schedule() {
      window.clearTimeout(timer);
      if (cards.length <= perView || !playing || hovering || interacting || !visible || document.hidden || carousel.contains(document.activeElement)) return;
      timer = window.setTimeout(function () {
        // Keep the background still while a photo is open in the lightbox.
        if (!document.querySelector('.mfp-wrap')) move(1);
        schedule();
      }, 4000);
    }

    function move(direction) {
      var positions = cards.length - perView + 1;
      var index = (currentIndex() + direction + positions) % positions;
      var left = track.scrollLeft + cards[index].getBoundingClientRect().left - track.getBoundingClientRect().left;
      track.scrollTo({ left: left, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      schedule();
    }

    function updateToggle() {
      toggle.textContent = playing ? 'Pause' : 'Play';
      toggle.setAttribute('aria-pressed', String(playing));
      schedule();
    }

    function layout() {
      var index = currentIndex();
      var gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      // Use the gallery's available width, including layouts with a sidebar.
      perView = Math.max(1, Math.min(3, cards.length, Math.floor((track.clientWidth + gap) / (220 + gap))));
      track.style.setProperty('--photography-card-width',
        'calc(' + (100 / perView) + '% - ' + (gap * (perView - 1) / perView) + 'px)');
      index = Math.min(index, cards.length - perView);
      track.scrollTo({
        left: track.scrollLeft + cards[index].getBoundingClientRect().left - track.getBoundingClientRect().left,
        behavior: 'auto'
      });
      controls.hidden = cards.length <= perView;
      updatePosition();
      schedule();
    }

    carousel.querySelector('.photography-prev').addEventListener('click', function () { move(-1); });
    carousel.querySelector('.photography-next').addEventListener('click', function () { move(1); });
    toggle.addEventListener('click', function () {
      playing = !playing;
      updateToggle();
    });
    track.addEventListener('keydown', function (event) {
      if (event.target !== track) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        move(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    track.addEventListener('scroll', function () {
      window.clearTimeout(timer);
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(function () { updatePosition(); schedule(); }, 150);
    }, { passive: true });
    track.addEventListener('pointerdown', function () { interacting = true; schedule(); });
    window.addEventListener('pointerup', function () { interacting = false; schedule(); });
    window.addEventListener('pointercancel', function () { interacting = false; schedule(); });
    carousel.addEventListener('mouseenter', function () { hovering = true; schedule(); });
    carousel.addEventListener('mouseleave', function () { hovering = false; schedule(); });
    carousel.addEventListener('focusin', schedule);
    carousel.addEventListener('focusout', function () { window.setTimeout(schedule, 0); });
    document.addEventListener('visibilitychange', schedule);
    reducedMotion.addEventListener('change', function () {
      playing = !reducedMotion.matches;
      updateToggle();
    });
    if ('ResizeObserver' in window) {
      new ResizeObserver(layout).observe(track);
    } else {
      window.addEventListener('resize', layout);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        schedule();
      }, { threshold: 0.25 }).observe(carousel);
    }

    layout();
    updateToggle();
  });
}());
