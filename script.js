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
      { duration: 650, easing: "cubic-bezier(.22,1,.36,1)", pseudoElement: "::view-transition-new(root)" },
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
    el.style.setProperty("--delay", (i % 3) * 110 + "ms");
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
  reduceMotion ? 0 : 900,
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
    projectCards.forEach((card, i) => {
      const tags = card.dataset.tags.split(" ");
      const show = filter === "all" || tags.includes(filter);
      card.classList.toggle("is-hidden", !show);
      if (show) {
        card.classList.add("is-visible");
        card.classList.remove("pop");
        void card.offsetWidth; // reinicia la animación
        card.style.animationDelay = i * 40 + "ms";
        card.classList.add("pop");
      }
    });
  });
});

/* ---- Tilt 3D + luz que sigue al cursor en las tarjetas ---- */
if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
  projectCards.forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mx", x + "px");
      card.style.setProperty("--my", y + "px");
      const rotateX = (y / rect.height - 0.5) * -5;
      const rotateY = (x / rect.width - 0.5) * 5;
      card.style.transform = `perspective(900px) translateY(-6px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });

  /* ---- Botones magnéticos ---- */
  document.querySelectorAll(".magnetic").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${x * 0.18}px, ${y * 0.3}px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
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
