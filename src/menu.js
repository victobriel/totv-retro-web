// Totv Retro Web - GPL-3.0-or-later
// Menu sobreposto (teclado, mouse e controle). Todo texto vindo do servidor entra via textContent.
import { t } from './i18n.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createMenu(o) {
  const root = document.getElementById('menu');
  let view = 'main';          // 'main' | 'save' | 'load'
  let urls = [];              // object URLs das miniaturas
  let busy = false;
  let renderToken = 0;

  const buttons = () => Array.from(root.querySelectorAll('button:not([disabled])'));
  function focusFirst() { const b = buttons(); if (b[0]) b[0].focus(); }
  function revoke() { urls.forEach((u) => URL.revokeObjectURL(u)); urls = []; }

  function renderMain() {
    view = 'main';
    root.replaceChildren();
    const panel = el('div', 'panel');
    panel.appendChild(el('h2', null, o.title || t('menu')));
    const list = el('div', 'list');
    const item = (label, fn, disabled) => {
      const b = el('button', 'item', label);
      b.type = 'button';
      if (disabled) b.disabled = true;
      b.addEventListener('click', fn);
      list.appendChild(b);
      return b;
    };
    item(t('resume'), () => o.actions.resume());
    const states = o.canStates();
    item(t('save'), () => renderSlots('save'), !states);
    item(t('load'), () => renderSlots('load'), !states);
    item(t('reset'), () => o.actions.reset());
    const ff = item(o.isFF() ? t('ffOff') : t('ffOn'), () => { o.actions.toggleFF(); ff.textContent = o.isFF() ? t('ffOff') : t('ffOn'); });
    item(t('exit'), () => { if (!busy) { busy = true; o.actions.exit(); } });
    panel.appendChild(list);
    if (o.rewindHint()) panel.appendChild(el('p', 'hint', t('rewindHint')));
    root.appendChild(panel);
    focusFirst();
  }

  async function renderSlots(mode) {
    view = mode;
    const token = ++renderToken;
    root.replaceChildren();
    revoke();
    const panel = el('div', 'panel wide');
    panel.appendChild(el('h2', null, mode === 'save' ? t('save') : t('load')));
    const grid = el('div', 'grid');
    panel.appendChild(grid);
    const back = el('button', 'item back', t('back'));
    back.type = 'button';
    back.addEventListener('click', renderMain);
    panel.appendChild(back);
    root.appendChild(panel);

    let saves = { states: [] };
    try { saves = await o.getSaves(); } catch (e) { /* mostra slots vazios */ }
    if (token !== renderToken) return;
    const states = saves.states || [];
    const bySlot = new Map();
    for (const s of states) if (!s.auto && s.slot >= 1 && s.slot <= 9 && !bySlot.has(s.slot)) bySlot.set(s.slot, s);
    const autos = states.filter((s) => s.auto).slice(0, 3);

    const card = (title, st, onPick) => {
      const b = el('button', 'slot');
      b.type = 'button';
      const img = el('div', 'thumb');
      b.appendChild(img);
      b.appendChild(el('strong', null, title));
      b.appendChild(el('span', null, st ? new Date(st.createdAt).toLocaleString() : t('empty')));
      if (st && st.core && st.core !== o.core) b.classList.add('foreign');
      if (!st && mode === 'load') b.disabled = true;
      b.addEventListener('click', async () => {
        if (busy) return;
        busy = true; b.classList.add('busy');
        try { const ok = await onPick(); if (ok) o.actions.resume(); }
        finally { busy = false; b.classList.remove('busy'); }
      });
      if (st && st.thumbUrl) {
        o.thumb(st.thumbUrl).then((blob) => {
          if (!blob || token !== renderToken) return;
          const u = URL.createObjectURL(blob); urls.push(u);
          img.style.backgroundImage = `url("${u}")`;
        }).catch(() => {});
      }
      grid.appendChild(b);
    };

    if (mode === 'load') for (const a of autos) card(t('auto'), a, () => o.actions.load(a));
    for (let n = 1; n <= 9; n++) {
      const st = bySlot.get(n);
      card(t('slot', { n }), st, () => (mode === 'save' ? o.actions.save(n) : o.actions.load(st)));
    }
    focusFirst();
  }

  return {
    open() { root.hidden = false; renderMain(); },
    close() { root.hidden = true; renderToken++; revoke(); root.replaceChildren(); view = 'main'; },
    back() { if (view === 'main') return false; renderMain(); return true; },
    move(d) {
      const b = buttons(); if (!b.length) return;
      let i = b.indexOf(document.activeElement);
      i = i < 0 ? 0 : (i + d + b.length) % b.length;
      b[i].focus();
    },
    activate() { const a = document.activeElement; if (a && root.contains(a)) a.click(); },
    key(e) {
      // com o menu aberto o jogo não recebe teclas; Enter/espaço ficam com o clique nativo do botão
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { this.move(1); e.preventDefault(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { this.move(-1); e.preventDefault(); }
      e.stopImmediatePropagation();
    },
  };
}
