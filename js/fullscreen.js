(function () {
  function tryFullscreen() {
    const root = document.documentElement;
    if (root.requestFullscreen && !document.fullscreenElement) {
      root.requestFullscreen().catch(function () {});
    }
    window.scrollTo(0, 1);
  }
  window.addEventListener('touchend', tryFullscreen, { once: true, passive: true });
  window.addEventListener('click', tryFullscreen, { once: true });
})();
