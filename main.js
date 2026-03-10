(function () {
  'use strict';

  // Volver desde vista máquina (ODC, etc.) al inicio
  const backLink = document.querySelector('[data-back]');
  if (backLink) {
    backLink.addEventListener('click', function (e) {
      e.preventDefault();
      history.replaceState(null, '', window.location.pathname + window.location.search);
    });
  }

  const header = document.querySelector('.header');
  const menuBtn = document.querySelector('.menu-btn');
  const nav = document.querySelector('.nav');

  // Header transparente desde el inicio hasta que FINALICE la sección del video; luego fondo negro
  var heroSection = document.querySelector('.video-section.hero') || document.querySelector('.hero');
  function setHeaderTransparent() {
    if (!header) return;
    header.style.setProperty('background', 'transparent', 'important');
    header.style.setProperty('backdrop-filter', 'none', 'important');
    header.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
    header.style.borderBottomColor = 'transparent';
  }
  function setHeaderSolid() {
    if (!header) return;
    header.style.setProperty('background', '#0a0a0a', 'important');
    header.style.setProperty('backdrop-filter', 'blur(12px)', 'important');
    header.style.setProperty('-webkit-backdrop-filter', 'blur(12px)', 'important');
    header.style.borderBottomColor = 'rgba(255,255,255,0.06)';
  }
  function updateHeaderBg() {
    if (!header) return;
    // Transparente mientras la sección del video siga visible (su borde inferior no haya salido del viewport)
    if (heroSection) {
      var rect = heroSection.getBoundingClientRect();
      var seccionTermino = rect.bottom;
      if (seccionTermino > 80) {
        setHeaderTransparent();
      } else {
        setHeaderSolid();
      }
    } else {
      setHeaderSolid();
    }
  }

  if (header) {
    setHeaderTransparent();
  }
  window.addEventListener('scroll', updateHeaderBg, { passive: true });
  window.addEventListener('load', updateHeaderBg);
  updateHeaderBg();

  // Menú móvil
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      const isOpen = nav.classList.toggle('is-open');
      menuBtn.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
      menuBtn.classList.toggle('is-open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        menuBtn.classList.remove('is-open');
        menuBtn.setAttribute('aria-label', 'Abrir menú');
        document.body.style.overflow = '';
      });
    });
  }

  // Título máquinas: animación tipo máquina de escribir al entrar en vista
  const machinesHeader = document.querySelector('.machines-header');
  if (machinesHeader) {
    const titleObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.2 }
    );
    titleObserver.observe(machinesHeader);
  }

  // CTA: imagen de fondo que se revela a medida que scrolleas (scroll-driven, estilo Freshman)
  const ctaSection = document.querySelector('.cta');
  if (ctaSection) {
    function updateCtaReveal() {
      const rect = ctaSection.getBoundingClientRect();
      const windowH = window.innerHeight;
      const sectionH = rect.height;
      const sectionTop = rect.top;
      const sectionBottom = rect.bottom;
      // Progreso 0 → 1: la imagen se revela a medida que la sección entra en vista
      // (cuando el usuario scrollea, más sección visible = más imagen)
      const visibleH = Math.min(sectionBottom, windowH) - Math.max(sectionTop, 0);
      const progress = Math.max(0, Math.min(1, visibleH / sectionH));
      ctaSection.style.setProperty('--cta-reveal', String(progress));
    }
    window.addEventListener('scroll', updateCtaReveal, { passive: true });
    window.addEventListener('resize', updateCtaReveal);
    updateCtaReveal();
  }

  // Reveal suave al hacer scroll (opcional)
  const reveal = document.querySelectorAll('.section-title, .feature-card, .benefit, .cta-box, .machine-card, .software-title, .software-window');
  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  reveal.forEach(function (el) {
    el.classList.add('reveal');
    observer.observe(el);
  });
})();
