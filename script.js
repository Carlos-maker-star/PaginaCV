const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;

document.getElementById("year").textContent = new Date().getFullYear();

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
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

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
setTimeout(
  () => Object.entries(counts).forEach(([id, n]) => animateCounter(document.getElementById(id), n)),
  reduceMotion ? 0 : 450,
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
  setTimeout(typeRole, 2600);
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

      if (moving) {
        frame = requestAnimationFrame(tick);
        return;
      }
      frame = null;
      last = 0;
      if (target.lift === 0) {
        card.style.transform = "";
        card.classList.remove("is-tilting");
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
