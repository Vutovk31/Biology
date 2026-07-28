(() => {
  ["premium-overrides.css", "premium.css"].forEach(href => {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = href;
    document.head.appendChild(stylesheet);
  });

  const storage = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch { /* localStorage can be blocked in private mode */ }
    }
  };

  const track = (eventName, payload = {}) => {
    const events = storage.get("knyazevaBioEvents", []);
    events.push({ eventName, payload, createdAt: new Date().toISOString() });
    storage.set("knyazevaBioEvents", events.slice(-120));
  };

  const menuButton = document.querySelector(".menu-button");
  const menu = document.querySelector("#menu");
  const navLinks = Array.from(document.querySelectorAll('#menu a[href^="#"]'));

  const closeMenu = () => {
    if (!menu || !menuButton) return;
    menu.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  };

  if (menuButton && menu) {
    menuButton.addEventListener("click", event => {
      event.stopPropagation();
      const opened = menu.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(opened));
      track(opened ? "menu_open" : "menu_close");
    });

    navLinks.forEach(link => link.addEventListener("click", () => {
      closeMenu();
      track("nav_click", { href: link.getAttribute("href"), label: link.textContent.trim() });
    }));

    document.addEventListener("click", event => {
      if (!menu.classList.contains("open")) return;
      const target = event.target;
      if (!menu.contains(target) && !menuButton.contains(target)) closeMenu();
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeMenu();
    });
  }

  const modal = document.querySelector("#image-modal");
  const modalImage = document.querySelector("#modal-image");
  const closeModalButton = document.querySelector(".modal-close");
  let lastFocusedElement = null;

  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])'
  ].join(",");

  const openModal = trigger => {
    if (!modal || !modalImage || !trigger.dataset.modalImage) return;
    lastFocusedElement = trigger;
    modalImage.src = trigger.dataset.modalImage;
    modalImage.alt = trigger.getAttribute("aria-label") || trigger.textContent.trim() || "Подтверждающий документ";
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    closeModalButton?.focus({ preventScroll: true });
    track("evidence_open", { image: trigger.dataset.modalImage });
  };

  const closeModal = () => {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    modalImage?.removeAttribute("src");
    document.body.style.overflow = "";
    if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus({ preventScroll: true });
    lastFocusedElement = null;
    track("evidence_close");
  };

  document.querySelectorAll("[data-modal-image]").forEach(trigger => {
    trigger.addEventListener("click", () => openModal(trigger));
  });

  closeModalButton?.addEventListener("click", closeModal);
  modal?.addEventListener("click", event => { if (event.target === modal) closeModal(); });

  document.addEventListener("keydown", event => {
    if (!modal || modal.hidden) return;
    if (event.key === "Escape") closeModal();
    if (event.key !== "Tab") return;

    const focusable = Array.from(modal.querySelectorAll(focusableSelector));
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealElements = document.querySelectorAll(".reveal");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach(element => element.classList.add("visible"));
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -70px" });

    revealElements.forEach(element => revealObserver.observe(element));
  }

  const sections = navLinks
    .map(link => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;
      const id = `#${visible.target.id}`;
      navLinks.forEach(link => link.classList.toggle("is-active", link.getAttribute("href") === id));
    }, { threshold: [0.25, 0.4, 0.65], rootMargin: "-90px 0px -45%" });

    sections.forEach(section => sectionObserver.observe(section));
  }

  const header = document.querySelector(".header");
  const syncHeaderState = () => header?.classList.toggle("scrolled", window.scrollY > 18);
  syncHeaderState();
  window.addEventListener("scroll", syncHeaderState, { passive: true });

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", () => {
      const href = link.getAttribute("href");
      storage.set("lastCta", { href, label: link.textContent.trim(), time: Date.now() });
      track("cta_click", { href, label: link.textContent.trim() });
    });
  });

  const form = document.querySelector("#lead-form");
  const status = document.querySelector("#form-status");

  form?.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      track("lead_invalid");
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const drafts = storage.get("knyazevaBioLeads", []);
    drafts.push({ ...data, createdAt: new Date().toISOString() });
    storage.set("knyazevaBioLeads", drafts.slice(-50));
    form.reset();

    if (status) {
      status.textContent = "Демо-заявка сохранена на устройстве. Перед публикацией подключим реальную доставку.";
      status.setAttribute("role", "status");
    }

    track("lead_demo_saved", { goal: data.goal || "unknown" });
  });
})();