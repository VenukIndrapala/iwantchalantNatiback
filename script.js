const canvas = document.getElementById('fireworksCanvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ---------- helpers ----------
function randColor() {
  const colors = [
    '#ff5e5e', '#ffb45e', '#ffe95e', '#9dff5e', '#5effa3',
    '#5ee8ff', '#5e8aff', '#c05eff', '#ff5ee0', '#ffffff'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// ---------- state ----------
let rockets = [];
let particles = [];

// ---------- launch a rocket from the ground ----------
function launchRocket() {
  const x = rand(canvas.width * 0.15, canvas.width * 0.85);
  const targetY = rand(canvas.height * 0.15, canvas.height * 0.55);
  rockets.push({
    x,
    y: canvas.height,
    targetY,
    vx: rand(-0.3, 0.3),
    vy: rand(-9.5, -7),
    color: randColor(),
    trail: []
  });
}

// ---------- explosion (this is your original code, kept intact ----------
// ---------- fireNumber/range are randomized per-burst for natural variety ----------
function makeFullCircleFirework(fire) {
  let color = randColor();
  let velocity = Math.random() * 8 + 8;
  let fireNumber = Math.floor(rand(10, 22));   // particle density varies per burst
  let range = rand(40, 90);                    // life/spread varies per burst
  let max = fireNumber * 3;

  for (let i = 0; i < max; i++) {
    let rad = (i * Math.PI * 2) / max;
    let firework = {
      x: fire.x, y: fire.y,
      size: Math.random() + 1.5,
      fill: color,
      vx: Math.cos(rad) * velocity + (Math.random() - 0.5) * 0.5,
      vy: Math.sin(rad) * velocity + (Math.random() - 0.5) * 0.5,
      ay: 0.06,
      alpha: 1,
      life: Math.round((Math.random() * range) / 2) + range / 1.5
    };
    particles.push(firework);
  }
}

// ---------- update ----------
function update() {
  // rockets rising
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.trail.push({ x: r.x, y: r.y });
    if (r.trail.length > 6) r.trail.shift();

    r.x += r.vx;
    r.y += r.vy;
    r.vy += 0.03; // gentle gravity so the rocket arcs and slows

    if (r.y <= r.targetY || r.vy >= 0) {
      makeFullCircleFirework({ x: r.x, y: r.y });
      rockets.splice(i, 1);
    }
  }

  // exploded particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.ay;
    p.vx *= 0.985; // air drag
    p.life--;
    p.alpha = Math.max(p.life / 40, 0);

    if (p.life <= 0 || p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}

// ---------- draw ----------
function draw() {
  // dark fade instead of a hard clear -> soft trails + glow
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(4, 6, 12, 0.25)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = 'lighter';

  // rocket trails
  rockets.forEach(r => {
    r.trail.forEach((t, idx) => {
      ctx.beginPath();
      ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = r.color;
      ctx.globalAlpha = idx / r.trail.length;
      ctx.fill();
    });
  });
  ctx.globalAlpha = 1;

  // burst particles
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.fill;
    ctx.globalAlpha = p.alpha;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ---------- main loop ----------
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();

// ---------- continuous auto-launch, like the video ----------
function scheduleLaunch() {
  const count = Math.floor(rand(1, 3)); // sometimes 1, sometimes 2 rockets close together
  for (let i = 0; i < count; i++) {
    setTimeout(launchRocket, rand(0, 400));
  }
  setTimeout(scheduleLaunch, rand(600, 1600));
}
scheduleLaunch();
