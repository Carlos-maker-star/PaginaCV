const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;

document.getElementById("year").textContent = new Date().getFullYear();

/* ---- Intro: arranque de servidor + contador gigante ----
   El script de <head> decide si se muestra (una vez por sesión). `bootReady`
   avisa al resto de la página cuándo terminó, para arrancar contadores y
   el texto que se escribe solo. */
const bootEl = document.getElementById("boot");
let bootResolve;
const bootReady = new Promise((r) => (bootResolve = r));

function endBoot() {
  root.classList.remove("booting");
  bootEl?.remove();
  try { sessionStorage.setItem("boot-seen", "1"); } catch (e) {}
  bootResolve();
}

if (bootEl && root.classList.contains("booting")) {
  const logEl = document.getElementById("bootLog");
  const numEl = document.getElementById("bootNum");
  const barEl = document.getElementById("bootBar");
  const skipBtn = document.getElementById("bootSkip");
  let finished = false;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };

  // Nombre: cada letra sube desde una máscara, con retraso escalonado
  let letterIndex = 0;
  document.querySelectorAll("#bootName .bn-line").forEach((line) => {
    line.innerHTML = [...line.dataset.t]
      .map((ch) => `<span class="li" style="--i:${letterIndex++}">${ch}</span>`)
      .join("");
  });

  // El log aparece línea por línea según el porcentaje alcanzado
  const lines = [
    { at: 0,  cls: "cmd", text: "boot --portfolio carlos" },
    { at: 8,  cls: "ok",  text: "[ OK ] Entorno Java 21 cargado" },
    { at: 24, cls: "ok",  text: "[ OK ] Spring Boot iniciado" },
    { at: 44, cls: "ok",  text: "[ OK ] API REST en línea" },
    { at: 62, cls: "ok",  text: "[ OK ] Base de datos conectada" },
    { at: 80, cls: "ok",  text: "[ OK ] Angular compilado" },
    { at: 96, cls: "ok",  text: "[ OK ] Portafolio listo" },
  ];
  const lineEls = lines.map((l) => {
    const el = document.createElement("span");
    el.className = "ln " + l.cls;
    el.textContent = l.text;
    logEl.appendChild(el);
    return el;
  });

  // Carga con ritmo irregular, como una carga real: [ms, %]
  const curve = [[0, 0], [350, 14], [700, 38], [950, 44], [1350, 72], [1600, 86], [1950, 100]];
  const percentAt = (ms) => {
    for (let i = 1; i < curve.length; i++) {
      if (ms <= curve[i][0]) {
        const [t0, p0] = curve[i - 1], [t1, p1] = curve[i];
        return p0 + ((ms - t0) / (t1 - t0)) * (p1 - p0);
      }
    }
    return 100;
  };

  function finish(fast) {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    document.removeEventListener("keydown", onKey);
    bootEl.classList.add("stage-name", "is-open");
    if (fast) bootEl.classList.add("is-fast");
    setTimeout(endBoot, fast ? 420 : 900); // la cortina sube y revela el hero
  }
  function onKey(e) {
    if (["Shift", "Control", "Alt", "Meta", "Tab"].includes(e.key)) return;
    finish(true);
  }
  document.addEventListener("keydown", onKey);
  skipBtn.addEventListener("click", (e) => { e.stopPropagation(); finish(true); });
  bootEl.addEventListener("click", () => finish(true));
  skipBtn.focus({ preventScroll: true });

  const startedAt = performance.now();
  let shown = 0;
  (function tick() {
    if (finished) return;
    const elapsed = performance.now() - startedAt;
    const pct = percentAt(elapsed);
    const whole = Math.floor(pct);
    numEl.textContent = String(whole).padStart(3, "0");
    barEl.style.transform = `scaleX(${pct / 100})`;
    while (shown < lines.length && whole >= lines[shown].at) lineEls[shown++].classList.add("on");

    if (pct >= 100) {
      bootEl.classList.add("stage-name");     // aparece el nombre gigante
      later(() => finish(false), 1250);        // pausa para leerlo y sube la cortina
      return;
    }
    later(tick, 16);
  })();
} else {
  bootEl?.remove();
  bootResolve();
}



/* ---- Tema claro / oscuro ---- */
const themeToggle = document.getElementById("themeToggle");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme) {
  root.dataset.theme = theme;
  themeColorMeta.setAttribute("content", theme === "light" ? "#F5F4EF" : "#151918");
  themeToggle.setAttribute(
    "aria-label",
    theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro",
  );
  try {
    localStorage.setItem("theme", theme);
  } catch (e) {}
}
applyTheme(root.dataset.theme);

themeToggle.addEventListener("click", (e) => {
  const next = root.dataset.theme === "light" ? "dark" : "light";

  // Círculo que se expande desde el botón (si el navegador lo soporta)
  if (!document.startViewTransition || reduceMotion) {
    applyTheme(next);
    return;
  }
  const rect = themeToggle.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  document.startViewTransition(() => applyTheme(next)).ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 400, easing: "cubic-bezier(0.23, 1, 0.32, 1)", pseudoElement: "::view-transition-new(root)" },
    );
  });
});

// Si el usuario nunca eligió tema, seguir el del sistema
window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
  let saved = null;
  try {
    saved = localStorage.getItem("theme");
  } catch (err) {}
  if (!saved) root.dataset.theme = e.matches ? "light" : "dark";
});

/* ---- Menú móvil ---- */
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
function closeMenu() {
  navLinks.classList.remove("open");
  navToggle.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
}
navToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  navToggle.classList.toggle("open", isOpen);
  navToggle.setAttribute("aria-expanded", isOpen);
});
navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());

/* ---- Riel de progreso: línea SVG que se dibuja con el scroll ---- */
const rail = document.getElementById("rail");
const railFill = document.getElementById("railFill");
const railDots = [...document.querySelectorAll(".nav-links a[data-section]")]
  .map((a) => ({ section: document.getElementById(a.dataset.section), label: a.textContent.trim() }))
  .filter((d) => d.section)
  .map((d) => {
    const dot = document.createElement("a");
    dot.href = "#" + d.section.id;
    dot.dataset.label = d.label;
    dot.setAttribute("aria-label", d.label);
    rail.appendChild(dot);
    return { ...d, dot, top: 0 };
  });

function layoutRail() {
  const max = document.documentElement.scrollHeight - innerHeight;
  railDots.forEach((d) => {
    d.top = Math.min(Math.max(d.section.offsetTop, 0), max);
    d.dot.style.top = (max > 0 ? (d.top / max) * 100 : 0) + "%";
  });
}
function updateRail(y, max) {
  const p = max > 0 ? Math.min(Math.max(y / max, 0), 1) : 0;
  railFill.style.clipPath = `inset(0 0 ${(1 - p) * 100}% 0)`;
  let current = 0;
  railDots.forEach((d, i) => {
    const reached = y >= d.top - innerHeight * 0.4;
    d.dot.classList.toggle("passed", reached);
    if (reached) current = i;
  });
  railDots.forEach((d, i) => d.dot.classList.toggle("current", i === current));
}
layoutRail();
new ResizeObserver(layoutRail).observe(document.body);
window.addEventListener("load", layoutRail);

/* ---- Header, barra de progreso y botón "arriba" ---- */
const header = document.querySelector(".site-header");
const progressBar = document.getElementById("scrollProgress");
const backToTop = document.getElementById("backToTop");
let scrollTicking = false;
function onScroll() {
  const y = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - innerHeight;
  header.classList.toggle("scrolled", y > 10);
  progressBar.style.transform = `scaleX(${docHeight > 0 ? y / docHeight : 0})`;
  backToTop.classList.toggle("show", y > innerHeight * 0.8);
  updateRail(y, docHeight);
  scrollTicking = false;
}
window.addEventListener(
  "scroll",
  () => {
    if (!scrollTicking) {
      requestAnimationFrame(onScroll);
      scrollTicking = true;
    }
  },
  { passive: true },
);
onScroll();
backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));

/* ---- Glow que sigue al cursor ---- */
const cursorGlow = document.getElementById("cursorGlow");
if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
  window.addEventListener("pointermove", (e) => {
    cursorGlow.classList.add("is-on");
    cursorGlow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  });
  document.addEventListener("pointerleave", () => cursorGlow.classList.remove("is-on"));
}

/* ---- Cinta de tecnologías (se arma desde la sección Stack) ---- */
const techNames = [...document.querySelectorAll(".stack-pill")].map((p) => p.textContent.trim());
const marqueeTrack = document.getElementById("marqueeTrack");
// Se duplica la lista para que el bucle sea continuo
[...techNames, ...techNames].forEach((name) => {
  const span = document.createElement("span");
  span.textContent = name;
  marqueeTrack.appendChild(span);
});

/* ---- Calendario de la vista previa de HotelDesk ---- */
document.querySelectorAll(".pv-cal").forEach((cal) => {
  const rooms = cal.dataset.rooms.split(",");
  const rows = cal.dataset.pattern.split("|");
  rows.forEach((pattern, r) => {
    const row = document.createElement("div");
    row.className = "pv-cal-row";
    row.innerHTML = `<b>${rooms[r]}</b>`;
    [...pattern].forEach((state, c) => {
      const cell = document.createElement("i");
      if (state !== "l") cell.className = state;
      cell.style.transitionDelay = 300 + (r * 7 + c) * 25 + "ms";
      row.appendChild(cell);
    });
    cal.appendChild(row);
  });
});

/* ---- Títulos que se revelan palabra por palabra ---- */
document.querySelectorAll(".split-title").forEach((el) => {
  const text = el.textContent.trim();
  el.setAttribute("aria-label", text);
  el.innerHTML = text
    .split(" ")
    .map((w, i) => `<span class="w" aria-hidden="true"><span class="wi" style="--i:${i}">${w}</span></span>`)
    .join(" ");
});

/* ---- Aparición al hacer scroll, con stagger por grupo ---- */
document.querySelectorAll(".projects-grid, .stack-grid").forEach((group) => {
  group.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.setProperty("--delay", (i % 3) * 50 + "ms");
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
);
document.querySelectorAll(".reveal, .split-title").forEach((el) => revealObserver.observe(el));

/* ---- Contadores del hero (calculados desde el contenido real) ---- */
const counts = {
  statProjects: document.querySelectorAll(".project-card:not(.is-upcoming)").length,
  statDemos: document.querySelectorAll(".project-card a[data-demo]").length,
  statTech: techNames.length,
};
function animateCounter(el, target) {
  if (reduceMotion) {
    el.textContent = target;
    return;
  }
  const duration = 1400;
  const start = performance.now();
  (function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * eased);
    if (t < 1) requestAnimationFrame(tick);
  })(start);
}
bootReady.then(() =>
  setTimeout(
    () => Object.entries(counts).forEach(([id, n]) => animateCounter(document.getElementById(id), n)),
    reduceMotion ? 0 : 450,
  ),
);

/* ---- Rol que se escribe y borra en el hero ---- */
const typedRole = document.getElementById("typedRole");
const roles = ["Backend Developer", "APIs REST con Spring Boot", "Frontend con Angular", "Bases de datos SQL"];
if (!reduceMotion) {
  let roleIndex = 0;
  let charIndex = roles[0].length;
  let deleting = true;
  function typeRole() {
    const word = roles[roleIndex];
    if (deleting) {
      charIndex--;
      if (charIndex === 0) {
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
      }
    } else {
      charIndex++;
      if (charIndex === roles[roleIndex].length) {
        deleting = true;
        typedRole.textContent = roles[roleIndex];
        return setTimeout(typeRole, 2200);
      }
    }
    typedRole.textContent = (deleting ? word : roles[roleIndex]).slice(0, charIndex);
    setTimeout(typeRole, deleting ? 35 : 70);
  }
  bootReady.then(() => setTimeout(typeRole, 2600));
}

/* ---- Efecto de escritura en la terminal ---- */
const terminalWrap = document.getElementById("terminalBody");
const terminalCode = document.getElementById("terminalCode");
const terminalCursor = document.getElementById("terminalCursor");
const fullCode = terminalWrap.dataset.code;

function typeCode() {
  if (reduceMotion) {
    terminalCode.textContent = fullCode;
    terminalCursor.classList.add("blink");
    return;
  }
  let i = 0;
  (function step() {
    if (i <= fullCode.length) {
      terminalCode.textContent = fullCode.slice(0, i);
      i++;
      setTimeout(step, 18);
    } else {
      terminalCursor.classList.add("blink");
    }
  })();
}
const terminalObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        typeCode();
        terminalObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.4 },
);
terminalObserver.observe(terminalWrap);

/* ---- Filtro de proyectos ---- */
const filterButtons = document.querySelectorAll(".filter");
const projectCards = document.querySelectorAll(".project-card");
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const filter = btn.dataset.filter;
    filterButtons.forEach((b) => {
      const active = b === btn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", active);
    });
    projectCards.forEach((card) => {
      const tags = card.dataset.tags.split(" ");
      const show = filter === "all" || tags.includes(filter);
      card.classList.toggle("is-hidden", !show);
      if (show) {
        // Transición (no keyframes): si se pulsa otro filtro a mitad, continúa desde donde está
        card.classList.add("is-visible", "is-filtering", "is-entering");
        void card.offsetWidth;
        card.classList.remove("is-entering");
      }
    });
  });
});

/* ---- Cubo 3D de tecnologías: se arrastra y gira con inercia ----
   Solo anima mientras está en pantalla. */
const cubeWrap = document.getElementById("cubeWrap");
const cube = document.getElementById("techCube");
if (cubeWrap && cube) {
  const AUTO = 0.35; // grados por frame (a 60 Hz) de giro automático
  let rx = -22, ry = 32, vx = 0, vy = AUTO;
  let dragging = false, lastX = 0, lastY = 0, rafId = null, lastT = 0;

  const paint = () => (cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`);
  paint();

  function frame(now) {
    const k = lastT ? Math.min((now - lastT) / 16.7, 4) : 1;
    lastT = now;
    if (!dragging) {
      // la inercia del arrastre se apaga y el giro vuelve al automático
      vy += (AUTO - vy) * 0.04 * k;
      vx += (0 - vx) * 0.04 * k;
      ry += vy * k;
      rx += vx * k;
      rx += (-22 - rx) * 0.01 * k; // vuelve despacio a una inclinación agradable
    }
    paint();
    rafId = requestAnimationFrame(frame);
  }
  const start = () => { if (!rafId && !reduceMotion) { lastT = 0; rafId = requestAnimationFrame(frame); } };
  const stop = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } };

  new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0.1 })
    .observe(cubeWrap);

  cubeWrap.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX; lastY = e.clientY;
    cubeWrap.setPointerCapture(e.pointerId);
    cubeWrap.classList.add("dragging");
  });
  cubeWrap.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    vy = dx * 0.5; vx = -dy * 0.5;
    ry += vy; rx += vx;
    if (reduceMotion) paint();
  });
  const release = () => { dragging = false; cubeWrap.classList.remove("dragging"); };
  cubeWrap.addEventListener("pointerup", release);
  cubeWrap.addEventListener("pointercancel", release);
}

/* ---- Panel de detalle de proyectos ----
   Cada tarjeta guarda su detalle en .project-details (oculto); al abrirla se
   copia al <dialog>. data-slug da un link directo: portafolio/#hoteldesk */
const dialog = document.getElementById("projectDialog");
const dialogPreview = document.getElementById("dialogPreview");
const dialogIcon = document.getElementById("dialogIcon");
const dialogTitle = document.getElementById("dialogTitle");
const dialogKind = document.getElementById("dialogKind");
const dialogContent = document.getElementById("dialogContent");
const dialogCount = document.getElementById("dialogCount");
const openableCards = [...document.querySelectorAll(".project-card[data-slug]")];
let currentIndex = -1;

// Se navega solo entre los proyectos que deja ver el filtro activo
const visibleProjects = () => openableCards.filter((c) => !c.classList.contains("is-hidden"));

function sectionHeading(text) {
  const h = document.createElement("h4");
  h.textContent = text;
  return h;
}

function renderProject(card, animatePreview) {
  const list = visibleProjects();
  currentIndex = list.indexOf(card);
  dialogCount.textContent = `${currentIndex + 1} / ${list.length}`;
  dialogTitle.textContent = card.querySelector(".project-footer h3").textContent;
  dialogIcon.innerHTML = card.querySelector(".project-footer .project-icon").innerHTML;

  const details = card.querySelector(".project-details").cloneNode(true);
  const kind = details.querySelector(".project-kind");
  dialogKind.textContent = kind.textContent;
  kind.remove();
  details.querySelector(".project-features")?.before(sectionHeading("Lo que hace"));
  details.querySelector(".project-tags")?.before(sectionHeading("Stack"));
  dialogContent.replaceChildren(...details.childNodes);

  // La vista previa se anima solo al abrir; al pasar de proyecto el cambio es
  // instantáneo, porque se hace muchas veces seguidas (y también con el teclado).
  dialogPreview.classList.toggle("is-visible", !animatePreview);
  dialogPreview.replaceChildren(card.querySelector(".project-preview").cloneNode(true));
  if (animatePreview) setTimeout(() => dialogPreview.classList.add("is-visible"), 60);

  history.replaceState(null, "", "#" + card.dataset.slug);
}

let dialogCleanedUp = true;

function openProject(card) {
  renderProject(card, !reduceMotion);
  if (!dialog.open) dialog.showModal();
  dialogCleanedUp = false;
}

// Se llama al cerrar con el botón o el fondo, y también desde el evento
// "close" (Escape). La bandera evita ejecutarlo dos veces.
function onDialogClosed() {
  if (dialogCleanedUp) return;
  dialogCleanedUp = true;
  history.replaceState(null, "", location.pathname + location.search);
  // Devuelve el foco a la tarjeta del proyecto que se estaba viendo
  visibleProjects()[currentIndex]?.querySelector(".project-open").focus();
}

function closeProject() {
  dialog.close();
  onDialogClosed();
}

function stepProject(dir) {
  const list = visibleProjects();
  renderProject(list[(currentIndex + dir + list.length) % list.length], false);
  dialog.scrollTop = 0;
}

openableCards.forEach((card) => {
  card.querySelector(".project-open").addEventListener("click", () => openProject(card));
});
document.getElementById("dialogPrev").addEventListener("click", () => stepProject(-1));
document.getElementById("dialogNext").addEventListener("click", () => stepProject(1));
document.getElementById("dialogClose").addEventListener("click", closeProject);

// Clic fuera del panel (en el fondo oscuro) lo cierra
dialog.addEventListener("click", (e) => {
  const r = dialog.getBoundingClientRect();
  const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (!inside) closeProject();
});
dialog.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") stepProject(-1);
  if (e.key === "ArrowRight") stepProject(1);
});
dialog.addEventListener("close", onDialogClosed);

// Link directo: si la URL trae #slug de un proyecto, se abre al cargar
const linkedCard = openableCards.find((c) => c.dataset.slug === location.hash.slice(1));
if (linkedCard) {
  document.getElementById("proyectos").scrollIntoView();
  openProject(linkedCard);
}

/* ---- Tilt 3D con inercia + luz que sigue al cursor en las tarjetas ----
   En vez de copiar la posición del mouse al instante, en cada frame los valores
   se acercan una fracción a su objetivo (lerp): el movimiento gana peso y se
   detiene suave. El loop solo corre mientras hay algo moviéndose. */
if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  const MAX_TILT = 5; // grados
  const LIFT = -6; // px
  const TILT_FOLLOW = 0.12; // fracción por frame a 60 Hz: más bajo = más inercia
  const SPOT_FOLLOW = 0.3;

  projectCards.forEach((card) => {
    const spot = document.createElement("span");
    spot.className = "card-spot";
    spot.setAttribute("aria-hidden", "true");
    card.prepend(spot);

    const layerBack = card.querySelector(".project-preview");
    const layerFront = card.querySelector(".project-footer");
    const cur = { rx: 0, ry: 0, lift: 0, sx: 0, sy: 0 };
    const target = { rx: 0, ry: 0, lift: 0, sx: 0, sy: 0 };
    let frame = null;
    let last = 0;

    function tick(now) {
      // Corrige por el tiempo real del frame: se siente igual a 60 Hz que a 120 Hz
      const dt = last ? Math.min(now - last, 64) : 16.7;
      last = now;
      const kTilt = 1 - Math.pow(1 - TILT_FOLLOW, dt / 16.7);
      const kSpot = 1 - Math.pow(1 - SPOT_FOLLOW, dt / 16.7);

      let moving = false;
      for (const key of ["rx", "ry", "lift"]) {
        cur[key] += (target[key] - cur[key]) * kTilt;
        if (Math.abs(target[key] - cur[key]) > 0.01) moving = true;
      }
      for (const key of ["sx", "sy"]) {
        cur[key] += (target[key] - cur[key]) * kSpot;
        if (Math.abs(target[key] - cur[key]) > 0.5) moving = true;
      }

      // transform directo sobre cada elemento: no recalcula los estilos de toda la tarjeta
      spot.style.transform = `translate(${cur.sx}px, ${cur.sy}px)`;
      card.style.transform = `perspective(900px) translateY(${cur.lift}px) rotateX(${cur.rx}deg) rotateY(${cur.ry}deg)`;
      // Capas a distinta profundidad: la vista previa y el título se desplazan
      // distinto entre sí (usa `translate`, que no choca con el scale del hover)
      layerBack.style.translate = `${cur.ry * 1.6}px ${-cur.rx * 1.6}px`;
      layerFront.style.translate = `${cur.ry * 0.7}px ${-cur.rx * 0.7}px`;

      if (moving) {
        frame = requestAnimationFrame(tick);
        return;
      }
      frame = null;
      last = 0;
      if (target.lift === 0) {
        card.style.transform = "";
        card.classList.remove("is-tilting");
        layerBack.style.translate = "";
        layerFront.style.translate = "";
      }
    }
    const start = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    card.addEventListener("pointerenter", (e) => {
      const rect = card.getBoundingClientRect();
      // La luz aparece bajo el cursor, sin viajar desde donde quedó la última vez
      cur.sx = target.sx = e.clientX - rect.left;
      cur.sy = target.sy = e.clientY - rect.top;
      spot.style.transform = `translate(${cur.sx}px, ${cur.sy}px)`;
      card.classList.add("is-tilting");
    });
    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      target.sx = x;
      target.sy = y;
      target.rx = (y / rect.height - 0.5) * -MAX_TILT;
      target.ry = (x / rect.width - 0.5) * MAX_TILT;
      target.lift = LIFT;
      card.classList.add("is-tilting");
      start();
    });
    card.addEventListener("pointerleave", () => {
      target.rx = target.ry = target.lift = 0;
      start();
    });
  });
}

/* ---- Copiar correo ---- */
const toast = document.getElementById("toast");
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}
document.getElementById("copyEmail").addEventListener("click", async (e) => {
  const email = e.currentTarget.dataset.email;
  try {
    await navigator.clipboard.writeText(email);
    showToast("Correo copiado ✓");
  } catch (err) {
    showToast(email);
  }
});

/* ---- Crossfade automático entre varias fotos ---- */
const photoSlides = document.querySelectorAll("#photoStack .photo-slide");
if (photoSlides.length > 1) {
  let currentPhoto = 0;
  setInterval(() => {
    photoSlides[currentPhoto].classList.remove("is-active");
    currentPhoto = (currentPhoto + 1) % photoSlides.length;
    photoSlides[currentPhoto].classList.add("is-active");
  }, 4500);
}

/* ---- Resaltar link activo del nav según sección visible ---- */
const navAnchors = document.querySelectorAll(".nav-links a[data-section]");
const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navAnchors.forEach((a) => a.classList.toggle("active", a.dataset.section === entry.target.id));
      }
    });
  },
  { rootMargin: "-45% 0px -50% 0px" },
);
document.querySelectorAll("main section[id]").forEach((s) => navObserver.observe(s));
