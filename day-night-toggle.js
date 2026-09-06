// ===================== Day/Night Toggle: final scene =====================
// Shown after the flower-blossom loading screen finishes. Scoped entirely to
// its own #dayNightScene container so its button/checkbox selectors and
// dark-mode attribute can't collide with anything else on the page.

(function () {
  let started = false;

  window.startDayNightToggle = function () {
    if (started) return;
    started = true;

    const scene = document.getElementById('dayNightScene');
    const button = scene.querySelector('button');
    const sync = scene.querySelector('#sync');

    const toggle = () => {
      const isPressed = button.matches('[aria-pressed=true]');
      if (sync.checked) {
        scene.setAttribute('data-dark-mode', isPressed ? 'false' : 'true');
      }
      button.setAttribute('aria-pressed', isPressed ? 'false' : 'true');
    };

    button.addEventListener('click', toggle);

    scene.classList.add('is-visible');
  };
})();
