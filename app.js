/* ============================================================
   RIFA — Frontend 100% estático (robusto)
   ============================================================ */
(() => {
  'use strict';

  // ---------- Config ----------
  const CFG = window.RIFA_CONFIG || {};
  const NOME    = CFG.nome || 'Rifa';
  const TOTAL   = Math.max(1, Number(CFG.totalNumeros) || 250);
  const PRECO   = Math.max(0, Number(CFG.preco) || 5);
  const INSTA   = String(CFG.instagramOrganizador || '').replace(/^@+/, '').trim();

  const STORAGE_KEY = 'rifa_reservas_v1';

  // ---------- Estado inicial ----------
  const reservadosFixos = new Set(
    (Array.isArray(window.RIFA_RESERVADOS) ? window.RIFA_RESERVADOS : [])
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= TOTAL)
  );

  const reservasLocais = carregarReservasLocais();
  const reservadosLocais = new Set(
    reservasLocais
      .filter((r) => r && typeof r === 'object' && Array.isArray(r.numeros))
      .flatMap((r) => r.numeros)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= TOTAL)
  );

  const estado = { reservados: new Set([...reservadosFixos, ...reservadosLocais]) };
  const selecionados = new Set();

  // ---------- Refs ----------
  const $ = (s) => document.querySelector(s);
  const grade        = $('#grade');
  const cDisp        = $('#cDisp');
  const cRes         = $('#cRes');
  const cSel         = $('#cSel');
  const barra        = $('#barra');
  const progressoTxt = $('#progressoTxt');
  const chips        = $('#chips');
  const vazio        = $('#empty');
  const qtd          = $('#qtd');
  const total        = $('#total');
  const btnReservar  = $('#btnReservar');
  const btnLimpar    = $('#btnLimpar');
  const modal        = $('#modal');
  const modalOk      = $('#modalOk');
  const form         = $('#formReserva');
  const nomeInput    = $('#nome');
  const instaInput   = $('#instagram');
  const modalErro    = $('#modalErro');
  const resumoModal  = $('#resumoModal');
  const codigoOk     = $('#codigoOk');
  const numsOk       = $('#numsOk');
  const btnInstagram = $('#btnInstagram');
  const btnPerfil    = $('#btnPerfil');
  const perfilHandle = $('#perfilHandle');
  const btnCopiar    = $('#btnCopiar');
  const toast        = $('#toast');

  // ---------- Helpers ----------
  const pad    = (n) => String(n).padStart(3, '0');
  const fmtBRL = (v) => Number(v).toLocaleString('pt-BR',
    { style: 'currency', currency: 'BRL' });
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g,
    (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  let toastTimer;
  function mostrarToast(msg, ehErro = false) {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast show' + (ehErro ? ' erro' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
  }

  // Animação de contador com cancelamento (evita flicker)
  const animacoes = new WeakMap();
  function animarNumero(el, alvo, duracao = 400) {
    if (!el) return;
    const prev = animacoes.get(el);
    if (prev) cancelAnimationFrame(prev);

    const de = parseInt(el.textContent, 10) || 0;
    if (de === alvo) { el.textContent = alvo; animacoes.delete(el); return; }

    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / duracao);
      const v = Math.round(de + (alvo - de) * (1 - Math.pow(1 - p, 3)));
      el.textContent = v;
      if (p < 1) animacoes.set(el, requestAnimationFrame(step));
      else animacoes.delete(el);
    };
    animacoes.set(el, requestAnimationFrame(step));
  }

  function gerarCodigo() {
    const hex = 'ABCDEF0123456789';
    let s = 'R';
    for (let i = 0; i < 6; i++) s += hex[Math.floor(Math.random() * 16)];
    return s;
  }

  // ---------- localStorage (com validação) ----------
  function carregarReservasLocais() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr)
        ? arr.filter((r) => r && typeof r === 'object' && Array.isArray(r.numeros))
        : [];
    } catch (e) {
      console.warn('[RIFA] localStorage indisponível ou corrompido:', e);
      return [];
    }
  }

  function salvarReservaLocal(reserva) {
    try {
      const atuais = carregarReservasLocais();
      atuais.push(reserva);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(atuais));
      return true;
    } catch (e) {
      console.warn('[RIFA] Falha ao salvar no localStorage:', e);
      return false;
    }
  }

  // ---------- Imagem do prêmio ----------
  function setupImagemPremio() {
    const img = $('#prizeImg');
    const fb  = $('#prizeFallback');
    if (!img || !fb) return;
    const mostrarFallback = () => { img.style.display = 'none'; fb.hidden = false; };
    const mostrarImagem   = () => { img.style.display = '';     fb.hidden = true;  };
    img.addEventListener('load',  mostrarImagem);
    img.addEventListener('error', mostrarFallback);
    if (img.complete) {
      if (img.naturalWidth > 0) mostrarImagem();
      else mostrarFallback();
    }
  }

  // ---------- Aplicar config ----------
  function aplicarConfig() {
    document.title = `${NOME} — Escolha seu número`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = `Sorteio com ${TOTAL} números, ${fmtBRL(PRECO)} cada.`;

    $('#eyebrow').textContent    = `Sorteio oficial • ${TOTAL} números`;
    $('#titulo').textContent     = NOME;
    $('#footerNome').textContent = NOME;
    $('#anoAtual').textContent   = new Date().getFullYear();

    $('#statTotal').textContent = TOTAL;
    $('#statPreco').textContent = fmtBRL(PRECO);

    const campos = [
      ['Prêmio',          CFG.premio],
      ['Data do sorteio', CFG.dataSorteio],
      ['Encerramento',    CFG.encerramento],
      ['Apuração',        CFG.metodoApuracao],
    ];
    $('#info').innerHTML = campos.map(([r, v]) =>
      `<div><dt>${r}</dt><dd>${v ? escapeHtml(v) : 'A definir'}</dd></div>`
    ).join('');

    const aut = $('#autorizacaoP');
    if (CFG.autorizacao) {
      aut.textContent = 'Autorização: ' + CFG.autorizacao;
      aut.hidden = false;
    }
  }

  // ---------- Grade ----------
  let primeiraRenderizacao = true;

  function renderizarGrade() {
    if (!grade) return;
    const frag = document.createDocumentFragment();
    let idx = 0;

    for (let i = 1; i <= TOTAL; i++) {
      if (estado.reservados.has(i)) continue;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'num';
      btn.style.setProperty('--i', primeiraRenderizacao ? idx++ : 0);
      btn.dataset.n = i;
      btn.textContent = pad(i);

      if (selecionados.has(i)) btn.classList.add('sel');
      btn.setAttribute('aria-label',
        `Número ${pad(i)} ${selecionados.has(i) ? 'selecionado' : 'disponível'}`);
      btn.setAttribute('aria-pressed', selecionados.has(i) ? 'true' : 'false');

      frag.appendChild(btn);
    }

    grade.innerHTML = '';
    grade.appendChild(frag);
    if (!primeiraRenderizacao) grade.classList.add('re-render');
    primeiraRenderizacao = false;

    atualizarContadores();
    atualizarResumo();
  }

  function atualizarContadores() {
    const ocupados = estado.reservados.size;
    const disp     = Math.max(0, TOTAL - ocupados);

    animarNumero(cDisp, disp);
    animarNumero(cRes,  ocupados);
    animarNumero(cSel,  selecionados.size);

    const pct = TOTAL ? Math.round((ocupados / TOTAL) * 100) : 0;
    if (barra) barra.style.width = pct + '%';
    if (progressoTxt) {
      progressoTxt.textContent = `${ocupados} de ${TOTAL} números já reservados (${pct}%)`;
    }
  }

  function atualizarResumo() {
    const n = selecionados.size;
    if (qtd)   qtd.textContent   = n;
    if (total) total.textContent = fmtBRL(n * PRECO);
    if (vazio) vazio.hidden = n > 0;

    if (chips) {
      chips.innerHTML = '';
      [...selecionados].sort((a, b) => a - b).forEach((num) => {
        const c = document.createElement('span');
        c.className = 'chip';
        c.textContent = pad(num);
        chips.appendChild(c);
      });
    }

    if (btnReservar) btnReservar.disabled = n === 0;
    if (btnLimpar)   btnLimpar.disabled   = n === 0;
  }

  // ---------- Seleção (determinística) ----------
  if (grade) {
    grade.addEventListener('click', (e) => {
      const btn = e.target.closest('.num');
      if (!btn || btn.disabled) return;

      const n = Number(btn.dataset.n);
      if (!Number.isInteger(n) || n < 1 || n > TOTAL) return;
      if (estado.reservados.has(n)) return;

      if (selecionados.has(n)) selecionados.delete(n);
      else selecionados.add(n);

      if (selecionados.has(n)) {
        btn.classList.add('sel');
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('aria-label', `Número ${pad(n)} selecionado`);
      } else {
        btn.classList.remove('sel');
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', `Número ${pad(n)} disponível`);
      }

      atualizarContadores();
      atualizarResumo();
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      selecionados.clear();
      renderizarGrade();
    });
  }

  // ---------- Modal de reserva ----------
  if (btnReservar) {
    btnReservar.addEventListener('click', () => {
      if (selecionados.size === 0) return;
      const lista = [...selecionados].sort((a, b) => a - b).map(pad).join(', ');
      resumoModal.innerHTML =
        `<b>${selecionados.size} número${selecionados.size > 1 ? 's' : ''}</b><br>${lista}` +
        `<br><br>Total: <b>${fmtBRL(selecionados.size * PRECO)}</b>`;
      modalErro.hidden = true;
      form.reset();
      modal.showModal();
      setTimeout(() => nomeInput.focus(), 100);
    });
  }

  $('#btnCancelar')?.addEventListener('click', () => modal.close());
  $('#btnFecharOk')?.addEventListener('click', () => modalOk.close());

  // ---------- Submit ----------
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      modalErro.hidden = true;

      if (selecionados.size === 0)
        return erroModal('Selecione pelo menos um número.');

      const nome      = nomeInput.value.trim();
      const instagram = instaInput.value.trim().replace(/^@+/, '');

      if (nome.length < 2)
        return erroModal('Informe seu nome completo.');
      if (!/^[A-Za-z0-9._]{2,30}$/.test(instagram))
        return erroModal('Instagram inválido. Use letras, números, . ou _ (sem @).');

      const reserva = {
        id:        gerarCodigo(),
        numeros:   [...selecionados].sort((a, b) => a - b),
        nome,
        instagram,
        data:      new Date().toISOString(),
      };

      const salvou = salvarReservaLocal(reserva);
      reserva.numeros.forEach((n) => estado.reservados.add(n));

      sucesso(reserva, salvou);
    });
  }

  function erroModal(msg) {
    if (!modalErro) return;
    modalErro.textContent = msg;
    modalErro.hidden = false;
  }

  // ---------- Sucesso ----------
  function sucesso(reserva, salvou) {
    modal.close();
    codigoOk.textContent = reserva.id;
    numsOk.textContent   = 'Números: ' + reserva.numeros.map(pad).join(', ');

    const texto =
      `Olá! Fiz a reserva ${reserva.id}.\n` +
      `Números: ${reserva.numeros.map(pad).join(', ')}\n` +
      `Total: ${fmtBRL(reserva.numeros.length * PRECO)}\n` +
      `Nome: ${reserva.nome}\n` +
      `Instagram: @${reserva.instagram}`;

    btnCopiar.onclick = async () => {
      try { await navigator.clipboard.writeText(texto); }
      catch {
        const ta = document.createElement('textarea');
        ta.value = texto; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
      }
      btnCopiar.textContent = '✓ Copiado!';
      setTimeout(() => (btnCopiar.textContent = 'Copiar resumo'), 1800);
    };

    if (INSTA) {
      btnInstagram.href = `https://ig.me/m/${encodeURIComponent(INSTA)}`;
      btnInstagram.hidden = false;

      btnPerfil.href = `https://instagram.com/${encodeURIComponent(INSTA)}`;
      perfilHandle.textContent = INSTA;
      btnPerfil.hidden = false;
    } else {
      btnInstagram.hidden = true;
      btnPerfil.hidden = true;
    }

    modalOk.showModal();

    selecionados.clear();

    reserva.numeros.forEach((n) => {
      const el = grade.querySelector(`[data-n="${n}"]`);
      if (el) el.classList.add('removendo');
    });

    atualizarContadores();
    atualizarResumo();

    setTimeout(() => {
      renderizarGrade();
      mostrarToast(
        salvou
          ? 'Reserva registrada! Envie o comprovante no Direct.'
          : 'Reserva feita, mas não foi salva neste navegador. Guarde o código!',
        !salvou
      );
    }, 400);
  }

  // ---------- Init ----------
  (function init() {
    setupImagemPremio();
    aplicarConfig();
    renderizarGrade();

    if (!INSTA) {
      console.warn('[RIFA] Configure "instagramOrganizador" em js/config.js.');
    }
  })();
})();