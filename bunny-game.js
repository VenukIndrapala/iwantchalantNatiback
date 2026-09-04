// ===================== Sad Bunnies: Hug Game =====================
// Player walks around a scrollable world; walking close enough to a
// sad bunny automatically starts a hug (progress bar fills), turning
// it happy. Game ends once every sad bunny has been hugged.

(function () {
  const WORLD_WIDTH = 3000;
  const WORLD_HEIGHT = 3000;
  const PLAYER_SPEED = 2.2;     // px per frame
  const HUG_RADIUS = 26;        // px distance that auto-triggers a hug
  const HUG_DURATION = 1400;    // ms for the hug progress bar to fill
  const HUG_OVERLAP_OFFSET = 12;    // px from bunny's center while embracing (side-by-side, overlapping)
  const HUG_APART_OFFSET = 26;      // px from bunny's center once the hug finishes (standing apart)
  const TOTAL_BUNNIES = 10;
  const TOTAL_TREES = 60;
  const ARRIVE_THRESHOLD = 4;   // px considered "arrived" at controlPos

  let settings = null;
  let rafId = null;
  let started = false;

  function distanceBetween(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Same shape as the reference snippet: filter sad bunnies, compute
  // distance to the player, sort nearest-first, cap the list at 5.
  function findSadBunnies() {
    settings.sadBunnies = settings.bunnies.filter(el => el.sad).map(el => {
      return { el, distance: distanceBetween(el, settings.player) };
    }).sort((a, b) => a.distance - b.distance);
    if (settings.sadBunnies.length > 5) settings.sadBunnies.length = 5;
  }

  function stopSprite(entity) {
    entity.walking = false;
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createWorldElements() {
    const { world } = settings;

    // Decorative trees (don't block movement)
    for (let i = 0; i < TOTAL_TREES; i++) {
      const x = rand(40, WORLD_WIDTH - 40);
      const y = rand(40, WORLD_HEIGHT - 40);
      const node = document.createElement('div');
      node.className = 'bunny-game-tree';
      node.style.left = x + 'px';
      node.style.top = y + 'px';
      world.appendChild(node);
    }

    // Sad bunnies scattered around the world
    for (let i = 0; i < TOTAL_BUNNIES; i++) {
      const x = rand(40, WORLD_WIDTH - 40);
      const y = rand(40, WORLD_HEIGHT - 40);
      const node = document.createElement('div');
      node.className = 'bunny-game-bunny';
      node.style.left = x + 'px';
      node.style.top = y + 'px';
      node.style.backgroundImage = "url('bunny-sad.png')";
      world.appendChild(node);
      settings.bunnies.push({ x, y, sad: true, node });
    }

    // Player
    const playerNode = document.createElement('div');
    playerNode.className = 'bunny-game-player';
    world.appendChild(playerNode);
    settings.player = {
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2,
      node: playerNode,
      walking: false,
      facing: 1
    };
  }

  function createHudElements() {
    const counter = document.createElement('div');
    counter.className = 'bunny-game-counter';

    const mainLine = document.createElement('div');
    mainLine.className = 'bunny-game-counter-main';
    counter.appendChild(mainLine);
    settings.counterMainEl = mainLine;

    const subLine = document.createElement('div');
    subLine.className = 'bunny-game-counter-sub';
    subLine.textContent = "I couldn't make them hug but that is what they are doing";
    counter.appendChild(subLine);

    settings.container.appendChild(counter);
    settings.counterEl = counter;
    updateCounterDisplay();

    const progressContainer = document.createElement('div');
    progressContainer.className = 'bunny-hug-progress-container';
    const progressBar = document.createElement('div');
    progressBar.className = 'bunny-hug-progress-bar';
    progressContainer.appendChild(progressBar);
    settings.world.appendChild(progressContainer);
    settings.hugProgressContainerEl = progressContainer;
    settings.hugProgressBarEl = progressBar;
  }

  function updateCounterDisplay() {
    settings.counterMainEl.textContent = 'Sad Bunnies Left: ' + settings.sadBunniesRemaining;
  }

  function handleWalk() {
    settings.player.walking = true;
  }

  function updateCamera() {
    const vw = settings.viewport.clientWidth;
    const vh = settings.viewport.clientHeight;
    let camX = settings.player.x - vw / 2;
    let camY = settings.player.y - vh / 2;
    camX = Math.max(0, Math.min(WORLD_WIDTH - vw, camX));
    camY = Math.max(0, Math.min(WORLD_HEIGHT - vh, camY));
    settings.world.style.transform = `translate(${-camX}px, ${-camY}px)`;
  }

  function updatePlayerPosition() {
    const p = settings.player;
    p.node.style.left = p.x + 'px';
    p.node.style.top = p.y + 'px';
    p.node.style.transform = `translate(-50%, -50%) scaleX(${p.facing})`;
  }

  function spawnHugHearts(x, y) {
    for (let i = 0; i < 3; i++) {
      const heart = document.createElement('div');
      heart.className = 'bunny-hug-heart';
      heart.textContent = '\u2764\ufe0f';
      heart.style.left = (x + rand(-8, 8)) + 'px';
      heart.style.top = (y - 20 + rand(-4, 4)) + 'px';
      heart.style.animationDelay = (i * 150) + 'ms';
      settings.world.appendChild(heart);
      setTimeout(() => heart.remove(), 900 + i * 150 + 50);
    }
  }

  function startHug(bunny) {
    stopSprite(settings.player);
    settings.controlPos = null; // cancel any pending walk target
    settings.currentHug = bunny;

    // Stand shoulder-to-shoulder with the bunny, overlapping slightly, on
    // whichever side the player approached from (facing 1 = came from the
    // left, so the player ends up on the bunny's left, and vice versa).
    const side = settings.player.facing >= 0 ? -1 : 1;
    settings.player.x = bunny.x + side * HUG_OVERLAP_OFFSET;
    settings.player.y = bunny.y;
    settings.player.node.classList.add('hugging');
    bunny.node.classList.add('hugging');
    spawnHugHearts(bunny.x, bunny.y);

    const bar = settings.hugProgressBarEl;
    const container = settings.hugProgressContainerEl;
    bar.style.width = '0%';
    container.style.display = 'block';
    container.style.left = bunny.x + 'px';
    container.style.top = bunny.y + 'px';

    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / HUG_DURATION) * 100);
      bar.style.width = pct + '%';
      if (pct < 100) {
        settings.hugTick = requestAnimationFrame(tick);
      } else {
        finishHug(bunny, side);
      }
    }
    settings.hugTick = requestAnimationFrame(tick);
  }

  function finishHug(bunny, side) {
    bunny.sad = false;
    bunny.node.style.backgroundImage = "url('bunny-happy.png')";
    settings.hugProgressContainerEl.style.display = 'none';

    // Step apart to stand normally next to the (now happy) bunny, still on the same side
    settings.player.x = bunny.x + side * HUG_APART_OFFSET;
    settings.player.y = bunny.y;

    settings.sadBunniesRemaining--;
    updateCounterDisplay();

    setTimeout(() => {
      bunny.node.classList.remove('hugging');
      settings.player.node.classList.remove('hugging');
      settings.currentHug = null;
    }, 250); // matches the CSS position-transition duration

    if (settings.sadBunniesRemaining <= 0) {
      endGame();
    }
  }

  function endGame() {
    cancelAnimationFrame(rafId);
    const msg = document.createElement('div');
    msg.className = 'bunny-game-end-message';
    msg.innerHTML = '<span>All Bunnies Are Happy!</span><small>Great job \u2764\ufe0f</small>';
    settings.container.appendChild(msg);
  }

  function loop() {
    const p = settings.player;

    if (!settings.currentHug && p.walking && settings.controlPos) {
      const dx = settings.controlPos.x - p.x;
      const dy = settings.controlPos.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ARRIVE_THRESHOLD) {
        stopSprite(p);
        settings.controlPos = null;
      } else {
        p.x += (dx / dist) * PLAYER_SPEED;
        p.y += (dy / dist) * PLAYER_SPEED;
        p.facing = dx < 0 ? -1 : 1;
        p.x = Math.max(0, Math.min(WORLD_WIDTH, p.x));
        p.y = Math.max(0, Math.min(WORLD_HEIGHT, p.y));
      }
    }

    updatePlayerPosition();
    updateCamera();

    // Automatic hug: find the nearest sad bunny, hug it if close enough
    if (!settings.currentHug) {
      findSadBunnies();
      if (settings.sadBunnies.length && settings.sadBunnies[0].distance <= HUG_RADIUS) {
        startHug(settings.sadBunnies[0].el);
      }
    }

    rafId = requestAnimationFrame(loop);
  }

  function attachControls() {
    settings.viewport.addEventListener('click', e => {
      stopSprite(settings.player);
      const { left, top } = settings.viewport.getBoundingClientRect();
      let clickX, clickY;
      if (e.targetTouches) {
        clickX = e.targetTouches[0].clientX - left;
        clickY = e.targetTouches[0].clientY - top;
      } else {
        clickX = e.clientX - left;
        clickY = e.clientY - top;
      }

      // Convert viewport-relative click into world coordinates using the current camera offset
      const vw = settings.viewport.clientWidth;
      const vh = settings.viewport.clientHeight;
      let camX = settings.player.x - vw / 2;
      let camY = settings.player.y - vh / 2;
      camX = Math.max(0, Math.min(WORLD_WIDTH - vw, camX));
      camY = Math.max(0, Math.min(WORLD_HEIGHT - vh, camY));

      settings.controlPos = { x: clickX + camX, y: clickY + camY };
      handleWalk();
    });
  }

  // Called by game.js once the matrix loading screen finishes
  window.startBunnyGame = function () {
    if (started) return;
    started = true;

    const container = document.getElementById('nextGamePlaceholder');
    container.innerHTML = '';

    const viewport = document.createElement('div');
    viewport.className = 'bunny-game-viewport';
    const world = document.createElement('div');
    world.className = 'bunny-game-world';
    world.style.width = WORLD_WIDTH + 'px';
    world.style.height = WORLD_HEIGHT + 'px';
    viewport.appendChild(world);
    container.appendChild(viewport);

    settings = {
      container,
      viewport,
      world,
      bunnies: [],
      sadBunnies: [],
      sadBunniesRemaining: TOTAL_BUNNIES,
      controlPos: null,
      currentHug: null
    };

    createWorldElements();
    createHudElements();
    attachControls();
    updatePlayerPosition();
    updateCamera();

    rafId = requestAnimationFrame(loop);
  };
})();
