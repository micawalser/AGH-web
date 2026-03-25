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

  // Header transparente mientras el hero (fondoval) está visible
  // Usamos la sección de video como referencia
  var heroSection = document.querySelector('.video-section.hero') || document.querySelector('.hero');
  function setHeaderTransparent() {
    if (!header) return;
    // En el hero queremos que la barra superior tenga fondo negro.
    // Mantenemos la lógica existente para cuándo se llama esta función,
    // pero ahora aplicamos el mismo look "solid".
    header.style.setProperty('background', '#0a0a0a', 'important');
    header.style.setProperty('backdrop-filter', 'blur(12px)', 'important');
    header.style.setProperty('-webkit-backdrop-filter', 'blur(12px)', 'important');
    header.style.borderBottomColor = 'rgba(255,255,255,0.06)';
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

    // Mientras el hero siga ocupando espacio por debajo del header, mantenemos el header transparente.
    if (heroSection) {
      var rect = heroSection.getBoundingClientRect();
      var headerH = header.offsetHeight || 72;
      var heroSigueDetrasDelHeader = rect.bottom > headerH + 10;
      if (heroSigueDetrasDelHeader) {
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
        // En móvil, si el enlace pertenece al dropdown de Productos,
        // no cerramos el menú automáticamente (dejamos que solo se abra/cierre el submenú)
        if (window.innerWidth <= 900 && link.closest('.nav-dropdown')) {
          return;
        }
        nav.classList.remove('is-open');
        menuBtn.classList.remove('is-open');
        menuBtn.setAttribute('aria-label', 'Abrir menú');
        document.body.style.overflow = '';
      });
    });
  }

  // Título máquinas: animación tipo máquina de escribir al entrar en vista
  const machinesHeaderAnim = document.querySelector('.machines-header');
  if (machinesHeaderAnim) {
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
    titleObserver.observe(machinesHeaderAnim);
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
      // En pantallas muy grandes, evitamos recortes dejando la imagen al 100%
      const finalProgress = window.innerWidth >= 1400 ? 1 : progress;
      ctaSection.style.setProperty('--cta-reveal', String(finalProgress));
    }
    window.addEventListener('scroll', updateCtaReveal, { passive: true });
    window.addEventListener('resize', updateCtaReveal);
    updateCtaReveal();
  }

  // CTA: efecto máquina de escribir en el título "¿Listo para dimensionar mejor?"
  const ctaTitle = document.querySelector('.cta .cta-title');
  if (ctaTitle) {
    const fullText = (ctaTitle.textContent || '').trim();
    let hasTyped = false;

    // Prepara el título vacío para que no parpadee el texto completo antes de la animación
    ctaTitle.textContent = '';

    function startTypewriter() {
      if (hasTyped || !fullText) return;
      hasTyped = true;

      let index = 0;
      const speed = 90; // ms por carácter (ritmo pausado)

      function step() {
        if (index <= fullText.length) {
          ctaTitle.textContent = fullText.slice(0, index);
          index += 1;
          setTimeout(step, speed);
        }
      }

      step();
    }

    // Dispara la animación cuando el título entra en vista (junto con el resto de la CTA)
    const ctaTitleObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            startTypewriter();
          }
        });
      },
      { threshold: 0.4 }
    );

    ctaTitleObserver.observe(ctaTitle);
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

  // Navegación móvil: desplegar submenú de Productos solo al tocar "Productos"
  const productsDropdown = document.querySelector('.nav-dropdown');
  const productsTrigger = productsDropdown ? productsDropdown.querySelector('.nav-dropdown-trigger') : null;
  if (productsDropdown && productsTrigger) {
    productsTrigger.addEventListener('click', function (e) {
      // En móvil/tablet usamos el tap para abrir/cerrar submenú
      if (window.innerWidth <= 900) {
        e.preventDefault();
        productsDropdown.classList.toggle('is-open');
      }
    });
  }
})();
