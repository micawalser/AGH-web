(function () {
  'use strict';

  /**
   * CONFIG: Web3Forms, reCAPTCHA, EmailJS (opcional).
   */
  var CONFIG = {
    web3formsAccessKey: '',
    recaptchaSiteKey: '',
    emailjsPublicKey: '',
    emailjsServiceId: '',
    emailjsThankYouTemplateId: ''
  };

  var STORAGE_KEY = 'agh_contacto_wizard_v3';

  var root = document.querySelector('[data-wizard-root]');
  if (!root) return;

  var layoutEl = document.querySelector('.contacto-layout');

  var state = {
    motivo: null,
    tipo_objeto: null,
    entorno: null,
    tech: [],
    volumen: null,
    accion: null
  };

  var widgetIds = {};
  var emailjsInited = false;

  var elSuccess = document.getElementById('contacto-success');
  var elSuccessEmailNote = document.getElementById('contacto-success-email-note');

  var MOTIVO_LABEL = {
    dimensionar: 'Quiero dimensionar productos',
    reunion: 'Quiero coordinar una reunión',
    mas_info: 'Quiero recibir más información'
  };

  var TIPO_LABEL = {
    pallets: 'Pallets',
    cajas: 'Cajas / paquetes',
    irregulares: 'Sueltos / irregulares',
    otro: 'Otro'
  };

  var ENTORNO_LABEL = {
    deposito: 'Depósito',
    xdocking: 'X-Docking',
    produccion: 'Producción',
    otro: 'Otro'
  };

  var VOL_LABEL = {
    bajo: 'Bajo (<500 paquetes/día)',
    medio: 'Medio (hasta 3500 paquetes/día)',
    alto: 'Alto (>3500 paquetes/día)'
  };

  var TECH_LABEL = {
    balanza: 'Balanza',
    wms_erp_tms: 'WMS / ERP / TMS',
    cinta: 'Cinta transportadora',
    otro: 'Otro',
    ninguno: 'Ninguno'
  };

  var ACCION_LABEL = {
    info_tecnica: 'Solicitar información técnica',
    videollamada: 'Coordinar una videollamada',
    visita: 'Organizar una visita',
    consulta: 'Consulta en particular'
  };

  function clearWizardStorage() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function setError(el, msg) {
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.hidden = false;
    } else {
      el.textContent = '';
      el.hidden = true;
    }
  }

  function getRecaptchaToken(id) {
    if (typeof grecaptcha === 'undefined') return '';
    var wid = widgetIds[id];
    if (wid === undefined || wid === null) return '';
    return grecaptcha.getResponse(wid) || '';
  }

  function resetRecaptchaId(id) {
    var wid = widgetIds[id];
    if (typeof grecaptcha !== 'undefined' && wid !== undefined && wid !== null) {
      grecaptcha.reset(wid);
    }
  }

  window.contactoRecaptchaInit = function () {
    var key = (CONFIG.recaptchaSiteKey || '').trim();
    if (!key || typeof grecaptcha === 'undefined') return;
    [
      'recaptcha-visita',
      'recaptcha-info',
      'recaptcha-video',
      'recaptcha-consulta'
    ].forEach(function (rid) {
      var el = document.getElementById(rid);
      if (!el) return;
      try {
        widgetIds[rid] = grecaptcha.render(el, { sitekey: key });
      } catch (e) {}
    });
  };

  function wizardSummaryBlock() {
    var techStr =
      (state.tech || [])
        .map(function (x) {
          return TECH_LABEL[x] || x;
        })
        .join(', ') || '—';
    return (
      '--- Wizard AGH ---\n' +
      'Motivo: ' +
      (MOTIVO_LABEL[state.motivo] || state.motivo || '—') +
      '\n' +
      'Tipo de objeto: ' +
      (TIPO_LABEL[state.tipo_objeto] || state.tipo_objeto || '—') +
      '\n' +
      'Entorno: ' +
      (ENTORNO_LABEL[state.entorno] || state.entorno || '—') +
      '\n' +
      'Elementos en planta: ' +
      techStr +
      '\n' +
      'Volumen: ' +
      (VOL_LABEL[state.volumen] || state.volumen || '—') +
      '\n' +
      'Cómo avanzar: ' +
      (ACCION_LABEL[state.accion] || state.accion || '—') +
      '\n' +
      '-------------------\n'
    );
  }

  function sendThankYouEmail(nombre, correo) {
    var pk = (CONFIG.emailjsPublicKey || '').trim();
    var sid = (CONFIG.emailjsServiceId || '').trim();
    var tid = (CONFIG.emailjsThankYouTemplateId || '').trim();
    if (!pk || !sid || !tid) return Promise.resolve(false);
    if (typeof emailjs === 'undefined') return Promise.resolve(false);
    if (!emailjsInited) {
      emailjs.init({ publicKey: pk });
      emailjsInited = true;
    }
    return emailjs
      .send(sid, tid, {
        user_name: nombre,
        user_email: correo
      })
      .then(function () {
        return true;
      })
      .catch(function () {
        return false;
      });
  }

  function submitToWeb3Forms(opts) {
    var accessKey = (CONFIG.web3formsAccessKey || '').trim();
    var siteKey = (CONFIG.recaptchaSiteKey || '').trim();
    if (!accessKey) {
      return Promise.reject(new Error('Falta configurar la clave de envío (Web3Forms) en contacto.js.'));
    }
    if (!siteKey) {
      return Promise.reject(new Error('Falta configurar la clave de reCAPTCHA en contacto.js.'));
    }

    var token = getRecaptchaToken(opts.recaptchaId);
    if (!token) {
      return Promise.reject(new Error('Marcá «No soy un robot» antes de enviar.'));
    }

    var subject = opts.subject || 'Nuevo lead web — AGH';
    var body = wizardSummaryBlock() + '\n' + (opts.bodyExtra || '');

    var payload = {
      access_key: accessKey,
      subject: subject,
      name: opts.name,
      email: opts.email,
      replyto: opts.email,
      message: body,
      'g-recaptcha-response': token
    };

    if (opts.attachments && opts.attachments.length) {
      payload.attachments = opts.attachments;
    }

    return fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'No se pudo enviar.');
        }
        return data;
      });
    });
  }

  function showSuccess(sentThankYou) {
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    if (elSuccessEmailNote) elSuccessEmailNote.hidden = !sentThankYou;
    if (elSuccess) elSuccess.hidden = false;
    clearWizardStorage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function getPanels() {
    return root.querySelectorAll('.wizard-panel');
  }

  /** Desktop: guarda la altura del bloque con el paso 1 visible para que los pasos 2–5 no achiquen la fila del grid. */
  function syncContactoShellRowLock() {
    if (!layoutEl) return;
    if (window.matchMedia('(max-width: 900px)').matches) {
      layoutEl.style.removeProperty('--contacto-shell-row');
      return;
    }
    var panel1 = root.querySelector('.wizard-panel[data-step="1"]');
    if (!panel1 || panel1.hidden) return;
    var wrap = document.querySelector('.contacto-form-wrap');
    if (!wrap) return;
    requestAnimationFrame(function () {
      var h = Math.ceil(wrap.getBoundingClientRect().height);
      if (h < 1) return;
      layoutEl.style.setProperty('--contacto-shell-row', h + 'px');
    });
  }

  function clearWizardStepErrors() {
    var e2 = document.getElementById('contacto-error-step2');
    var e3 = document.getElementById('contacto-error-step3');
    if (e2) setError(e2, '');
    if (e3) setError(e3, '');
  }

  function showStep(step, variant) {
    clearWizardStepErrors();
    getPanels().forEach(function (p) {
      var s = parseInt(p.getAttribute('data-step'), 10);
      var v = p.getAttribute('data-variant');
      var match = false;
      if (s === 5) {
        match = step === 5 && v === variant;
      } else {
        match = s === step;
      }
      p.hidden = !match;
      p.classList.toggle('is-active', match);
    });

    var fill = document.getElementById('wizard-progress-fill');
    var label = document.getElementById('wizard-progress-label');
    var pct = (step / 5) * 100;
    if (fill) fill.style.width = Math.min(100, pct) + '%';
    if (label) label.textContent = 'Paso ' + step + ' de 5';

    if (step === 1) {
      syncContactoShellRowLock();
    }
  }

  function goToStep(step, variant) {
    showStep(step, variant || null);
  }

  function readStep2() {
    var t = root.querySelector('input[name="tipo_objeto"]:checked');
    var e = root.querySelector('input[name="entorno"]:checked');
    if (!t || !e) return false;
    state.tipo_objeto = t.value;
    state.entorno = e.value;
    return true;
  }

  function readStep3() {
    var checks = root.querySelectorAll('input[name="tech"]:checked');
    state.tech = Array.prototype.map.call(checks, function (c) {
      return c.value;
    });
    var v = root.querySelector('input[name="volumen"]:checked');
    if (!v) return false;
    state.volumen = v.value;
    return true;
  }

  function bindNavigation() {
    root.querySelectorAll('[data-motivo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.motivo = btn.getAttribute('data-motivo');
        goToStep(2, null);
      });
    });

    root.querySelectorAll('.wizard-next').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var panel = btn.closest('.wizard-panel');
        if (!panel) return;
        var step = parseInt(panel.getAttribute('data-step'), 10);
        if (step === 2) {
          if (!readStep2()) {
            setError(
              document.getElementById('contacto-error-step2'),
              'Elegí tipo de objeto y entorno para continuar.'
            );
            return;
          }
          goToStep(3, null);
        } else if (step === 3) {
          if (!readStep3()) {
            setError(
              document.getElementById('contacto-error-step3'),
              'Indicá el volumen de operación para continuar.'
            );
            return;
          }
          goToStep(4, null);
        }
      });
    });

    root.querySelectorAll('[data-accion]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.accion = btn.getAttribute('data-accion');
        goToStep(5, state.accion);
      });
    });

    root.querySelectorAll('.wizard-back').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var panel = btn.closest('.wizard-panel');
        if (!panel) return;
        var step = parseInt(panel.getAttribute('data-step'), 10);
        var variant = panel.getAttribute('data-variant');
        if (step === 5 && variant) {
          goToStep(4, null);
        } else if (step === 4) {
          goToStep(3, null);
        } else if (step === 3) {
          goToStep(2, null);
        } else if (step === 2) {
          goToStep(1, null);
        }
      });
    });
  }

  function bindForms() {
    var formVi = document.getElementById('wizard-form-visita');
    var formInfo = document.getElementById('wizard-form-info');
    var formVideo = document.getElementById('wizard-form-video');
    var formCons = document.getElementById('wizard-form-consulta');
    var errVi = document.getElementById('contacto-error');
    var errInfo = document.getElementById('contacto-error-info');
    var errVideo = document.getElementById('contacto-error-video');
    var errCons = document.getElementById('contacto-error-cons');

    if (formVi) {
      formVi.addEventListener('submit', function (e) {
        e.preventDefault();
        setError(errVi, '');
        var nombre = document.getElementById('visita-nombre').value.trim();
        var empresa = document.getElementById('visita-empresa').value.trim();
        var direccion = document.getElementById('visita-direccion').value.trim();
        var telefono = document.getElementById('visita-telefono').value.trim();
        var email = document.getElementById('visita-email').value.trim();
        var disp = document.getElementById('visita-disponibilidad').value.trim();

        var sub = document.getElementById('contacto-submit-visita');
        if (sub) {
          sub.disabled = true;
          sub.textContent = 'Enviando…';
        }

        submitToWeb3Forms({
          recaptchaId: 'recaptcha-visita',
          name: nombre,
          email: email,
          subject: 'Solicitud visita técnica — ' + nombre,
          bodyExtra:
            'Empresa: ' +
            empresa +
            '\nTeléfono: ' +
            telefono +
            '\nDirección: ' +
            direccion +
            '\nDisponibilidad: ' +
            disp +
            '\n'
        })
          .then(function () {
            return sendThankYouEmail(nombre, email);
          })
          .then(function (sent) {
            resetRecaptchaId('recaptcha-visita');
            showSuccess(sent);
          })
          .catch(function (err) {
            setError(errVi, err.message || 'Error al enviar.');
            resetRecaptchaId('recaptcha-visita');
          })
          .finally(function () {
            if (sub) {
              sub.disabled = false;
              sub.textContent = 'Confirmar solicitud';
            }
          });
      });
    }

    if (formInfo) {
      formInfo.addEventListener('submit', function (e) {
        e.preventDefault();
        setError(errInfo, '');
        var nombre = document.getElementById('info-nombre').value.trim();
        var empresa = document.getElementById('info-empresa').value.trim();
        var email = document.getElementById('info-email').value.trim();
        var telefono = document.getElementById('info-telefono').value.trim();
        var desc = document.getElementById('info-desc').value.trim();

        var sub = document.getElementById('contacto-submit-info');
        if (sub) {
          sub.disabled = true;
          sub.textContent = 'Enviando…';
        }

        submitToWeb3Forms({
          recaptchaId: 'recaptcha-info',
          name: nombre,
          email: email,
          subject: 'Información técnica — ' + nombre,
          bodyExtra:
            'Empresa: ' +
            empresa +
            '\nTeléfono: ' +
            telefono +
            '\n\nQué información necesitás:\n' +
            desc +
            '\n'
        })
          .then(function () {
            return sendThankYouEmail(nombre, email);
          })
          .then(function (sent) {
            resetRecaptchaId('recaptcha-info');
            showSuccess(sent);
          })
          .catch(function (err) {
            setError(errInfo, err.message || 'Error al enviar.');
            resetRecaptchaId('recaptcha-info');
          })
          .finally(function () {
            if (sub) {
              sub.disabled = false;
              sub.textContent = 'Enviar solicitud';
            }
          });
      });
    }

    if (formVideo) {
      formVideo.addEventListener('submit', function (e) {
        e.preventDefault();
        setError(errVideo, '');
        var nombre = document.getElementById('video-nombre').value.trim();
        var empresa = document.getElementById('video-empresa').value.trim();
        var email = document.getElementById('video-email').value.trim();
        var telefono = document.getElementById('video-telefono').value.trim();
        var mensaje = document.getElementById('video-mensaje').value.trim();

        var sub = document.getElementById('contacto-submit-video');
        if (sub) {
          sub.disabled = true;
          sub.textContent = 'Enviando…';
        }

        submitToWeb3Forms({
          recaptchaId: 'recaptcha-video',
          name: nombre,
          email: email,
          subject: 'Videollamada — ' + nombre,
          bodyExtra:
            'Empresa: ' +
            empresa +
            '\nTeléfono: ' +
            telefono +
            '\n\nPreferencia / comentarios:\n' +
            mensaje +
            '\n'
        })
          .then(function () {
            return sendThankYouEmail(nombre, email);
          })
          .then(function (sent) {
            resetRecaptchaId('recaptcha-video');
            showSuccess(sent);
          })
          .catch(function (err) {
            setError(errVideo, err.message || 'Error al enviar.');
            resetRecaptchaId('recaptcha-video');
          })
          .finally(function () {
            if (sub) {
              sub.disabled = false;
              sub.textContent = 'Enviar';
            }
          });
      });
    }

    if (formCons) {
      formCons.addEventListener('submit', function (e) {
        e.preventDefault();
        setError(errCons, '');
        var nombre = document.getElementById('cons-nombre').value.trim();
        var empresa = document.getElementById('cons-empresa').value.trim();
        var email = document.getElementById('cons-email').value.trim();
        var telefono = document.getElementById('cons-telefono').value.trim();
        var mensaje = document.getElementById('cons-mensaje').value.trim();

        var sub = document.getElementById('contacto-submit-cons');
        if (sub) {
          sub.disabled = true;
          sub.textContent = 'Enviando…';
        }

        submitToWeb3Forms({
          recaptchaId: 'recaptcha-consulta',
          name: nombre,
          email: email,
          subject: 'Consulta particular — ' + nombre,
          bodyExtra:
            'Empresa: ' +
            empresa +
            '\nTeléfono: ' +
            telefono +
            '\n\nConsulta:\n' +
            mensaje +
            '\n'
        })
          .then(function () {
            return sendThankYouEmail(nombre, email);
          })
          .then(function (sent) {
            resetRecaptchaId('recaptcha-consulta');
            showSuccess(sent);
          })
          .catch(function (err) {
            setError(errCons, err.message || 'Error al enviar.');
            resetRecaptchaId('recaptcha-consulta');
          })
          .finally(function () {
            if (sub) {
              sub.disabled = false;
              sub.textContent = 'Enviar consulta';
            }
          });
      });
    }
  }

  bindNavigation();
  bindForms();

  var shellResizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(shellResizeTimer);
    shellResizeTimer = setTimeout(syncContactoShellRowLock, 120);
  });

  if (typeof document.fonts !== 'undefined' && document.fonts.ready) {
    document.fonts.ready.then(syncContactoShellRowLock);
  }

  goToStep(1, null);

  requestAnimationFrame(syncContactoShellRowLock);

  setTimeout(function () {
    if (state.tipo_objeto) {
      var r = root.querySelector('input[name="tipo_objeto"][value="' + state.tipo_objeto + '"]');
      if (r) r.checked = true;
    }
    if (state.entorno) {
      var r2 = root.querySelector('input[name="entorno"][value="' + state.entorno + '"]');
      if (r2) r2.checked = true;
    }
    if (state.volumen) {
      var r3 = root.querySelector('input[name="volumen"][value="' + state.volumen + '"]');
      if (r3) r3.checked = true;
    }
    (state.tech || []).forEach(function (val) {
      var c = root.querySelector('input[name="tech"][value="' + val + '"]');
      if (c) c.checked = true;
    });
  }, 0);
})();
