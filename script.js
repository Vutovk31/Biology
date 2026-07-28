(() => {
  const menuButton = document.querySelector(".menu-button");
  const menu = document.querySelector("#menu");
  if (menuButton && menu) {
    menuButton.addEventListener("click", () => {
      const opened = menu.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(opened));
    });
    menu.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
      menu.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    }));
  }

  const modal = document.querySelector("#image-modal");
  const modalImage = document.querySelector("#modal-image");
  const closeModalButton = document.querySelector(".modal-close");
  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    modalImage.removeAttribute("src");
    document.body.style.overflow = "";
  };

  document.querySelectorAll("[data-modal-image]").forEach(trigger => {
    trigger.addEventListener("click", () => {
      modalImage.src = trigger.dataset.modalImage;
      modal.hidden = false;
      document.body.style.overflow = "hidden";
    });
  });
  closeModalButton?.addEventListener("click", closeModal);
  modal?.addEventListener("click", event => { if (event.target === modal) closeModal(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && modal && !modal.hidden) closeModal(); });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(element => observer.observe(element));

  const form = document.querySelector("#lead-form");
  const status = document.querySelector("#form-status");
  form?.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    const drafts = JSON.parse(localStorage.getItem("knyazevaBioLeads") || "[]");
    drafts.push({ ...data, createdAt: new Date().toISOString() });
    localStorage.setItem("knyazevaBioLeads", JSON.stringify(drafts.slice(-50)));
    form.reset();
    status.textContent = "Демо-заявка сохранена на устройстве. Перед публикацией подключим реальную доставку.";
  });

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", () => {
      localStorage.setItem("lastCta", JSON.stringify({ href: link.getAttribute("href"), time: Date.now() }));
    });
  });
})();