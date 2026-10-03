/* =========================================================
   Red de nodos 3D del hero (Canvas 2D con proyección en perspectiva)
   - Nodos en el espacio que giran despacio y reaccionan al mouse y al scroll.
   - Líneas entre nodos cercanos, con más o menos opacidad según la profundidad.
   - "Paquetes" de luz que viajan por las conexiones (como peticiones a una API).
   - Solo se anima mientras el hero está en pantalla y la pestaña visible.
   - Con "movimiento reducido" se dibuja un solo cuadro estático.
   Sin librerías: ~0 KB extra (para ~100 nodos no hace falta WebGL).
   ========================================================= */
(function () {
  const net = document.getElementById("net");
  const canvas = document.getElementById("netCanvas");
  if (!net || !canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const root = document.documentElement;
  const hero = net.parentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = window.matchMedia("(max-width: 720px)").matches;

  const N = small ? 52 : 112;       // cantidad de nodos
  const LINK = small ? 0.82 : 0.7;  // distancia máxima para conectar (unidades del mundo)
  const PACKETS = small ? 3 : 6;
  const CAM = 3.2;                  // distancia de la cámara

  /* ---- Nodos: posición base aleatoria + deriva suave ---- */
  const rand = (a, b) => a + Math.random() * (b - a);
  const nodes = Array.from({ length: N }, () => ({
    x: rand(-1.9, 1.9), y: rand(-1.05, 1.05), z: rand(-1, 1),
    ph: rand(0, Math.PI * 2), tone: Math.random() < 0.22 ? 1 : 0, r: rand(1.4, 2.6),
  }));
  const pos = nodes.map(() => ({ x: 0, y: 0, z: 0, sx: 0, sy: 0, s: 1 }));

  /* ---- Colores del tema actual ---- */
  let colA = [143, 227, 197], colB = [255, 155, 133];
  function hexToRgb(hex) {
    const h = hex.trim().replace("#", "");
    if (h.length !== 6) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function readColors() {
    const cs = getComputedStyle(root);
    colA = hexToRgb(cs.getPropertyValue("--accent")) || colA;
    colB = hexToRgb(cs.getPropertyValue("--accent-2")) || colB;
  }
  readColors();
  new MutationObserver(() => { readColors(); if (reduce) draw(0); })
    .observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---- Tamaño ---- */
  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = net.clientWidth;
    H = net.clientHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    if (reduce || !running) draw(performance.now() / 1000);
  }
  new ResizeObserver(resize).observe(net);

  /* ---- Entrada: mouse (con suavizado) y scroll ---- */
  let mx = 0, my = 0, tx = 0, ty = 0;
  window.addEventListener("pointermove", (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  /* ---- Paquetes que viajan por las conexiones ---- */
  const packets = Array.from({ length: PACKETS }, () => ({ a: -1, b: -1, t: 1, speed: 0 }));
  let edges = [];
  function respawn(p) {
    if (!edges.length) { p.t = 1; return; }
    const e = edges[(Math.random() * edges.length) | 0];
    const flip = Math.random() < 0.5;
    p.a = flip ? e[1] : e[0];
    p.b = flip ? e[0] : e[1];
    p.t = 0;
    p.speed = rand(0.35, 0.8);
  }

  /* ---- Dibujo ---- */
  let last = 0;
  function draw(time) {
    const dt = last ? Math.min(time - last, 0.05) : 0.016;
    last = time;

    mx += (tx - mx) * 0.04;
    my += (ty - my) * 0.04;
    const scrollP = Math.min(Math.max(window.scrollY / Math.max(window.innerHeight, 1), 0), 1.4);
    const ang = time * 0.05 + mx * 0.35 + scrollP * 1.1;
    const tilt = 0.18 + my * 0.16;
    const zoom = 1 + scrollP * 0.55;
    const ca = Math.cos(ang), sa = Math.sin(ang), cb = Math.cos(tilt), sb = Math.sin(tilt);
    const scale = Math.min(H * 0.52, W * 0.36) * zoom;
    const cx = W * 0.5, cy = H * 0.5;

    // Proyección en perspectiva de cada nodo
    for (let i = 0; i < N; i++) {
      const n = nodes[i];
      const x = n.x + Math.sin(time * 0.35 + n.ph) * 0.05;
      const y = n.y + Math.cos(time * 0.3 + n.ph) * 0.05;
      const z = n.z + Math.sin(time * 0.25 + n.ph * 2) * 0.05;
      const x1 = x * ca + z * sa;
      const z1 = -x * sa + z * ca;
      const y1 = y * cb - z1 * sb;
      const z2 = y * sb + z1 * cb;
      const s = CAM / (CAM - z2);
      const p = pos[i];
      p.x = x; p.y = y; p.z = z2;
      p.sx = cx + x1 * scale * s;
      p.sy = cy + y1 * scale * s;
      p.s = s;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";

    // Conexiones
    edges = [];
    const baseAlpha = small ? 0.45 : 0.7;
    for (let i = 0; i < N; i++) {
      const a = pos[i];
      for (let j = i + 1; j < N; j++) {
        const b = pos[j];
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dz = nodes[i].z - nodes[j].z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > LINK) continue;
        edges.push([i, j]);
        const depth = ((a.z + b.z) * 0.5 + 1) / 2; // 0 lejos … 1 cerca
        const alpha = (1 - d / LINK) * (0.25 + depth * 0.75) * baseAlpha;
        ctx.strokeStyle = `rgba(${colA[0]},${colA[1]},${colA[2]},${alpha.toFixed(3)})`;
        ctx.lineWidth = 0.7 + depth * 0.9;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }
    }

    // Nodos
    for (let i = 0; i < N; i++) {
      const n = nodes[i], p = pos[i];
      const depth = (p.z + 1) / 2;
      const c = n.tone ? colB : colA;
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(0.25 + depth * 0.65).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, n.r * p.s * (0.7 + depth * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }

    // Paquetes de luz (solo con animación)
    if (!reduce) {
      for (const pk of packets) {
        if (pk.t >= 1) { respawn(pk); if (pk.t >= 1) continue; }
        pk.t = Math.min(pk.t + pk.speed * dt, 1);
        const a = pos[pk.a], b = pos[pk.b];
        const x = a.sx + (b.sx - a.sx) * pk.t;
        const y = a.sy + (b.sy - a.sy) * pk.t;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 9);
        grad.addColorStop(0, `rgba(${colB[0]},${colB[1]},${colB[2]},0.9)`);
        grad.addColorStop(1, `rgba(${colB[0]},${colB[1]},${colB[2]},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // La red se desvanece a medida que el hero sale de la pantalla
    canvas.style.opacity = String(Math.max(0, 1 - scrollP * 0.95));
  }

  /* ---- Bucle: solo mientras el hero se ve ---- */
  let running = false, rafId = null, heroVisible = true;
  function loop(now) {
    draw(now / 1000);
    rafId = running ? requestAnimationFrame(loop) : null;
  }
  function sync() {
    const should = !reduce && heroVisible && !document.hidden;
    if (should && !running) { running = true; last = 0; rafId = requestAnimationFrame(loop); }
    if (!should && running) { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }
  }
  new IntersectionObserver((entries) => { heroVisible = entries[0].isIntersecting; sync(); }, { threshold: 0 }).observe(hero);
  document.addEventListener("visibilitychange", sync);

  resize();
  sync();

  // Aparece con un fundido cuando termina la intro
  const reveal = () => net.classList.add("on");
  if (typeof bootReady !== "undefined") bootReady.then(reveal); else reveal();
})();
