(function () {
  'use strict';

  if (window.location.protocol === 'file:') {
    var bar = document.createElement('div');
    bar.className = 'contacto-local-warning';
    bar.setAttribute('role', 'alert');
    bar.innerHTML =
      '<strong>No uses doble clic al HTML.</strong> Estás en <code>file://</code>: hCaptcha devuelve 403 y el captcha no puede validar el dominio (<code>host</code> vacío). ' +
      'En la carpeta del proyecto ejecutá en PowerShell: <code>npx --yes serve -l 5500</code> y abrí ' +
      '<code>http://127.0.0.1:5500/contacto.html</code> (el dominio debe coincidir con el que cargaste en hCaptcha).';
    if (document.body) {
      document.body.insertBefore(bar, document.body.firstChild);
    }
  }

  /**
   * CONFIG: Web3Forms, CAPTCHA (hCaptcha/reCAPTCHA), EmailJS (opcional).
   */
  var CONFIG = {
    web3formsAccessKey: 'b2a53d25-c83d-4ff9-8045-4539b14439e8',
    captchaProvider: 'hcaptcha', // 'hcaptcha' (free en Web3Forms) o 'recaptcha' (Pro)
    // Web3Forms (gratis): sitekey oficial para que el servidor pueda verificar el token.
    hcaptchaSiteKey: '50b2fe65-b00b-4b9e-ad62-3ba471098be2',
    recaptchaSiteKey: '6LeRq7AsAAAAAIzK_u0ck6mrbZ00J5X8yx-RaAE_',
    emailjsPublicKey: 'dtdiuOzLtdlArZIxG',
    emailjsServiceId: 'service_z96215f',
    emailjsThankYouTemplateId: 'template_a4xrdrf'
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

  function getCaptchaApi() {
    var provider = (CONFIG.captchaProvider || 'hcaptcha').trim().toLowerCase();
    if (provider === 'recaptcha') return typeof grecaptcha !== 'undefined' ? grecaptcha : null;
    return typeof hcaptcha !== 'undefined' ? hcaptcha : null;
  }

  function getCaptchaSiteKey() {
    var provider = (CONFIG.captchaProvider || 'hcaptcha').trim().toLowerCase();
    if (provider === 'recaptcha') return (CONFIG.recaptchaSiteKey || '').trim();
    return (CONFIG.hcaptchaSiteKey || '').trim();
  }

  function getCaptchaToken(id) {
    var api = getCaptchaApi();
    if (!api) return '';
    var wid = widgetIds[id];
    if (wid === undefined || wid === null) return '';
    return api.getResponse(wid) || '';
  }

  function resetCaptchaId(id) {
    var api = getCaptchaApi();
    var wid = widgetIds[id];
    if (api && wid !== undefined && wid !== null) {
      api.reset(wid);
    }
  }

  /** Paso final del wizard: id del div donde va hCaptcha (no renombrar: coincide con el HTML). */
  var VARIANT_CAPTCHA = {
    visita: 'recaptcha-visita',
    info_tecnica: 'recaptcha-info',
    videollamada: 'recaptcha-video',
    consulta: 'recaptcha-consulta'
  };

  /**
   * hCaptcha falla con "invalid-data" si se renderiza en un contenedor dentro de un panel oculto.
   * Solo montamos el widget cuando el paso 5 visible ya está en el DOM sin [hidden].
   */
  function mountCaptchaForContainer(containerId) {
    var key = getCaptchaSiteKey();
    var api = getCaptchaApi();
    if (!key || !api) return;
    if (widgetIds[containerId] != null) return;

    var el = document.getElementById(containerId);
    if (!el) return;
    var panel = el.closest('.wizard-panel');
    if (panel && panel.hidden) return;

    try {
      var wid = api.render(el, { sitekey: key });
      if (wid == null) return;
      widgetIds[containerId] = wid;
    } catch (e) {}
  }

  function mountCaptchaForVariant(variant) {
    if (!variant) return;
    var id = VARIANT_CAPTCHA[variant];
    if (!id) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        mountCaptchaForContainer(id);
      });
    });
  }

  window.contactoCaptchaInit = function () {
    var active = root.querySelector('.wizard-panel.is-active[data-step="5"]');
    if (active && !active.hidden) {
      mountCaptchaForVariant(active.getAttribute('data-variant'));
    }
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

  function getEmailjsClient() {
    if (typeof emailjs === 'undefined') return null;
    if (typeof emailjs.send === 'function') return emailjs;
    if (emailjs.default && typeof emailjs.default.send === 'function') return emailjs.default;
    return null;
  }

  function sendThankYouEmail(nombre, correo) {
    var pk = (CONFIG.emailjsPublicKey || '').trim();
    var sid = (CONFIG.emailjsServiceId || '').trim();
    var tid = (CONFIG.emailjsThankYouTemplateId || '').trim();
    if (!pk || !sid || !tid) return Promise.resolve(false);
    var client = getEmailjsClient();
    if (!client) return Promise.resolve(false);

    var n = String(nombre || '').trim();
    var c = String(correo || '').trim();
    if (!c) return Promise.resolve(false);

    if (!emailjsInited) {
      client.init({ publicKey: pk });
      emailjsInited = true;
    }

    var params = {
      user_name: n,
      user_email: c,
      name: n,
      email: c,
      reply_to: c,
      to_email: c,
      subject: 'Confirmación — AGH Dimensionadores'
    };

    return client
      .send(sid, tid, params, { publicKey: pk })
      .then(function () {
        return true;
      })
      .catch(function (err) {
        if (typeof console !== 'undefined' && console.error) {
          console.error('EmailJS:', err && (err.text || err.message || err));
        }
        return false;
      });
  }

  function submitToWeb3Forms(opts) {
    var accessKey = (CONFIG.web3formsAccessKey || '').trim();
    var siteKey = getCaptchaSiteKey();
    var provider = (CONFIG.captchaProvider || 'hcaptcha').trim().toLowerCase();
    if (!accessKey) {
      return Promise.reject(new Error('Falta configurar la clave de envío (Web3Forms) en contacto.js.'));
    }
    if (!siteKey) {
      return Promise.reject(new Error('Falta configurar la clave del CAPTCHA en contacto.js.'));
    }

    var token = getCaptchaToken(opts.recaptchaId);
    if (!token) {
      return Promise.reject(new Error('Completá el CAPTCHA antes de enviar.'));
    }

    var subject = opts.subject || 'Nuevo lead web — AGH';
    var body = wizardSummaryBlock() + '\n' + (opts.bodyExtra || '');

    var payload = {
      access_key: accessKey,
      subject: subject,
      name: opts.name,
      email: opts.email,
      replyto: opts.email,
      message: body
    };
    if (provider === 'recaptcha') {
      payload['g-recaptcha-response'] = token;
    } else {
      payload['h-captcha-response'] = token;
    }

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

    if (step === 5 && variant) {
      mountCaptchaForVariant(variant);
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
            resetCaptchaId('recaptcha-visita');
            showSuccess(sent);
          })
          .catch(function (err) {
            setError(errVi, err.message || 'Error al enviar.');
            resetCaptchaId('recaptcha-visita');
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
            resetCaptchaId('recaptcha-info');
            showSuccess(sent);
          })
          .catch(function (err) {
            setError(errInfo, err.message || 'Error al enviar.');
            resetCaptchaId('recaptcha-info');
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
            resetCaptchaId('recaptcha-video');
            showSuccess(sent);
          })
          .catch(function (err) {
            setError(errVideo, err.message || 'Error al enviar.');
            resetCaptchaId('recaptcha-video');
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
            resetCaptchaId('recaptcha-consulta');
            showSuccess(sent);
          })
          .catch(function (err) {
            setError(errCons, err.message || 'Error al enviar.');
            resetCaptchaId('recaptcha-consulta');
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
