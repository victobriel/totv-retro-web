// Totv Retro Web - GPL-3.0-or-later
// Player de jogos do Totv sobre o EmulatorJS. Contrato: docs/games-api.md (servidor Totv).
import { Api, ApiError } from './api.js';
import { PLATFORMS, isSupported, pickCore } from './cores.js';
import { setLang, ejsLang, t } from './i18n.js';
import { createMenu } from './menu.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

const SRAM_INTERVAL = 60_000;
const HEARTBEAT_INTERVAL = 60_000;
const AUTOSAVE_INTERVAL = 5 * 60_000;
const SRAM_MAX = 2 * 1024 * 1024;

let api = null;
let ctx = null;          // { itemId, mediaId, platform, core, title }
let ejs = null;          // window.EJS_emulator
let gm = null;           // ejs.gameManager
let started = false;
let exiting = false;
let playedMs = 0;
let lastTick = 0;
let menuOpen = false;
let sramHash = null;
let ffOn = false;
let canStates = false;
let rewindOn = false;
let menu = null;
let pendingToast = '';
const timers = [];

// ---------- UI básica ----------
function status(text, progress, action) {
  const el = $('status');
  el.hidden = false;
  $('status-text').textContent = text;
  const bar = $('status-bar');
  bar.hidden = progress == null;
  if (progress != null) bar.firstElementChild.style.width = Math.round(Math.max(0, Math.min(1, progress)) * 100) + '%';
  const btn = $('status-action');
  btn.hidden = !action;
  if (action) { btn.textContent = action.label; btn.onclick = action.run; btn.focus(); }
}
const hideStatus = () => { $('status').hidden = true; };

let toastTimer = 0;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

function post(msg) {
  if (window.parent && window.parent !== window) window.parent.postMessage(msg, location.origin);
}

function fatal(message) {
  post({ type: 'totv-retro:error', message });
  status(message, null, { label: t('back'), run: () => post({ type: 'totv-retro:exit', playedMs: Math.round(playedMs) }) });
}

function errMsg(e) {
  if (e instanceof ApiError) {
    if (e.status === 401) return t('errAuth');
    if (e.status === 403 || e.status === 404) return t('errHidden');
    return t('errNet', { m: e.message });
  }
  return t('errNet', { m: e && e.message ? e.message : String(e) });
}

// ---------- handshake ----------
function boot() {
  setLang(navigator.language);
  if (window.parent === window) { status(t('standalone')); return; }
  status(t('waiting'));
  let done = false;
  window.addEventListener('message', (ev) => {
    // aceita apenas o pai direto, da mesma origem
    if (ev.source !== window.parent || ev.origin !== location.origin) return;
    const d = ev.data;
    if (!d || d.type !== 'totv-retro:init' || done) return;
    done = true;
    init(d).catch((e) => { console.error(e); fatal(errMsg(e)); });
  });
  post({ type: 'totv-retro:ready' });
}

async function init(m) {
  setLang(m.lang);
  if (typeof m.token !== 'string' || !m.token || !Number(m.itemId)) throw new Error('init inválido');
  api = new Api(m.server, m.token, Number(m.itemId));
  status(t('loadingInfo'));

  const [platforms, item] = await Promise.all([api.platforms(), api.item()]);
  const platform = String(m.platform || item.platform || '');
  if (!isSupported(platform)) {
    // inclui snes e md: o EmulatorJS só traz núcleos não-comerciais para elas
    return fatal(t('unsupported', { p: platform || '?' }));
  }
  const pInfo = (platforms || []).find((p) => p.id === platform) || {};
  const core = pickCore(platform, pInfo.cores && pInfo.cores.web);
  if (!core) return fatal(t('noCore', { p: platform }));

  const media = Array.isArray(item.media) ? item.media : [];
  const mediaId = Number(m.mediaId) || (media[0] && Number(media[0].id));
  if (!mediaId) return fatal(t('noMedia'));
  ctx = { itemId: api.itemId, mediaId, platform, core, title: String(m.title || item.title || '') };

  let saves = { sram: null, states: [] };
  try { saves = await api.saves(); } catch (e) { if (e.status === 401) throw e; }

  status(t('downloadingRom'), 0);
  const rom = await api.rom(mediaId, (p) => status(t('downloadingRom'), p));
  const romName = (rom.name && /\.[A-Za-z0-9]{1,5}$/.test(rom.name)) ? rom.name : `game.${PLATFORMS[platform].ext}`;
  const romFile = new File([rom.data], romName.replace(/[\\/]/g, '_'), { type: 'application/octet-stream' });

  const bios = [];
  for (const b of (pInfo.bios || []).filter((x) => x.present)) {
    const data = await api.bios(platform, b.file).catch(() => null);
    if (data) bios.push({ file: b.file, data });
  }

  let sram = null;
  try { sram = await api.getSram(core); } catch (e) { if (e.status === 401) throw e; }

  let resume = null;
  if (m.stateId) {
    const st = (saves.states || []).find((s) => String(s.id) === String(m.stateId));
    if (!st) pendingToast = t('stateMissing');
    else if (!sameCore(st.core, core)) pendingToast = t('coreMismatch', { c: st.core });
    else resume = st;
  }

  status(t('startingCore'));
  rewindOn = PLATFORMS[platform].rewind;
  startEmulator({ romFile, bios, sram, resume });
}

function sameCore(a, b) { return String(a || '').replace(/_fast$/, '') === String(b || '').replace(/_fast$/, ''); }

// ---------- EmulatorJS ----------
function startEmulator({ romFile, bios, sram, resume }) {
  const base = new URL('data/', location.href).pathname;
  const w = window;
  w.EJS_player = '#game';
  w.EJS_pathtodata = base;
  w.EJS_core = ctx.core;
  w.EJS_gameUrl = romFile;
  w.EJS_gameName = 'game';
  w.EJS_language = ejsLang();
  w.EJS_startOnLoaded = true;
  w.EJS_disableDatabases = true;     // sem cache de ROM no navegador
  w.EJS_color = '#7c5cff';
  w.EJS_defaultOptions = rewindOn ? { rewindEnabled: 'enabled' } : {};
  w.EJS_Buttons = {
    playPause: false, play: false, pause: false, restart: false, saveState: false, loadState: false,
    screenRecord: false, cheat: false, saveSavFiles: false, loadSavFiles: false, quickSave: false,
    quickLoad: false, screenshot: false, cacheManager: false, exitEmulation: false, netplay: false,
    diskButton: false, rightClick: false,
  };
  w.EJS_ready = () => {
    // BIOS: grava direto no FS do núcleo, antes de a ROM ser carregada
    if (bios.length && w.EJS_emulator) {
      w.EJS_emulator.on('saveDatabaseLoaded', (FS) => {
        for (const b of bios) { try { FS.writeFile('/' + b.file, b.data); } catch (e) { console.warn('bios', e); } }
      });
    }
  };
  w.EJS_onGameStart = () => onStarted({ sram, resume }).catch((e) => { console.error(e); toast(errMsg(e)); });

  const s = document.createElement('script');
  s.src = base + 'loader.js';
  s.onerror = () => fatal(t('errStart'));
  document.head.appendChild(s);

  setTimeout(() => { if (!started && !exiting) fatal(t('errStart')); }, 90_000);
}

async function onStarted({ sram, resume }) {
  ejs = window.EJS_emulator;
  gm = ejs.gameManager;
  started = true;
  hideStatus();
  canStates = gm.supportsStates();
  lastTick = Date.now();

  if (sram && sram.length) {
    try {
      const path = gm.getSaveFilePath();
      const parts = path.split('/'); let cp = '';
      for (let i = 0; i < parts.length - 1; i++) {
        if (!parts[i]) continue;
        cp += '/' + parts[i];
        if (!gm.FS.analyzePath(cp).exists) gm.FS.mkdir(cp);
      }
      if (gm.FS.analyzePath(path).exists) gm.FS.unlink(path);
      gm.FS.writeFile(path, sram);
      gm.loadSaveFiles();
      sramHash = hash(sram);
      toast(t('sramLoaded'));
    } catch (e) { console.warn('sram', e); }
  }

  if (resume) {
    try {
      const data = await api.getState(resume.id);
      await sleep(400);
      gm.loadState(data);
    } catch (e) { toast(t('loadFail')); }
  }
  if (pendingToast) toast(pendingToast);

  menu = createMenu({
    getSaves: () => api.saves(),
    thumb: (url) => api.thumbBlob(url),
    canStates: () => canStates,
    rewindHint: () => rewindOn,
    isFF: () => ffOn,
    core: ctx.core,
    title: ctx.title,
    actions: { resume: closeMenu, save: saveSlot, load: loadState, reset: () => { resetGame(); closeMenu(); }, toggleFF, exit: exitPlayer },
  });
  $('menu-btn').hidden = false;
  $('menu-btn').title = t('menu');
  $('menu-btn').onclick = () => openMenu();
  installInput();

  try {
    const r = await api.session('start', sessionBody());
    if (r && r.stop) { toast(t('sessionStop')); exitPlayer(); return; }
  } catch (e) { console.warn('session start', e); }
  every(HEARTBEAT_INTERVAL, heartbeat);
  every(SRAM_INTERVAL, () => uploadSram());
  every(AUTOSAVE_INTERVAL, autosave);
  every(1000, tick);
  window.addEventListener('pagehide', onPageHide);
}

function every(ms, fn) {
  timers.push(setInterval(() => { if (!exiting) Promise.resolve().then(fn).catch(() => {}); }, ms));
}

function tick() {
  const now = Date.now();
  if (!menuOpen && document.visibilityState === 'visible' && started) playedMs += now - lastTick;
  lastTick = now;
}
function sessionBody() { return { mediaId: ctx.mediaId, core: ctx.core, playedMs }; }

async function heartbeat() {
  try {
    const r = await api.session('heartbeat', sessionBody());
    if (r && r.stop) { toast(t('sessionStop')); exitPlayer(); }
  } catch (e) { console.warn('heartbeat', e); }
}

function hash(u8) { // FNV-1a 32 + tamanho: suficiente para saber se mudou
  let h = 0x811c9dc5;
  for (let i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 0x01000193); }
  return (h >>> 0) + ':' + u8.length;
}

async function uploadSram(keepalive = false) {
  if (!gm) return;
  let data;
  try { data = gm.getSaveFile(true); } catch (e) { return; }
  if (!data || !data.length || data.length > SRAM_MAX) return;
  const h = hash(data);
  if (h === sramHash) return;
  try {
    await api.putSram(ctx.core, ctx.mediaId, new Uint8Array(data), keepalive && data.length < 60_000);
    sramHash = h;
  } catch (e) { console.warn('sram upload', e); }
}

async function snapshotPng() {
  try {
    const r = await withTimeout(ejs.takeScreenshot('canvas', 'png', 1), 4000);
    if (r && r.blob && r.blob.size > 0 && r.blob.size <= 1024 * 1024) return r.blob;
  } catch (e) { /* sem miniatura */ }
  return null;
}

async function uploadState({ slot, auto }) {
  if (!canStates) throw new Error('no states');
  const data = gm.getState();
  const thumb = await snapshotPng();
  const id = await api.postState({ core: ctx.core, mediaId: ctx.mediaId, slot, auto, data });
  if (thumb) { try { await api.putThumb(id, thumb); } catch (e) { console.warn('thumb', e); } }
  return id;
}

async function autosave() {
  if (!canStates || menuOpen) return;
  try { await uploadState({ auto: true }); } catch (e) { console.warn('autosave', e); }
}

// ---------- ações do menu ----------
async function saveSlot(n) {
  if (!canStates) { toast(t('noStates')); return false; }
  try { await uploadState({ slot: n, auto: false }); toast(t('saved', { n })); return true; }
  catch (e) { console.warn(e); toast(t('saveFail')); return false; }
}

async function loadState(st) {
  if (!canStates) { toast(t('noStates')); return false; }
  if (!sameCore(st.core, ctx.core)) { toast(t('coreMismatch', { c: st.core })); return false; }
  try {
    const data = await api.getState(st.id);
    gm.loadState(data);
    toast(t('loaded'));
    return true;
  } catch (e) { toast(t('loadFail')); return false; }
}

function resetGame() { gm.restart(); toast(t('resetDone')); }

function toggleFF() {
  ffOn = !ffOn;
  gm.setFastForwardRatio(3);
  gm.toggleFastForward(ffOn ? 1 : 0);
  return ffOn;
}

function openMenu() {
  if (!started || menuOpen || exiting) return;
  menuOpen = true;
  try { ejs.pause(true); } catch (e) { /* ignore */ }
  menu.open();
}
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  menu.close();
  try { ejs.play(true); } catch (e) { /* ignore */ }
  try { ejs.elements.parent.focus(); } catch (e) { /* ignore */ }
}

// ---------- entrada: teclado e controle ----------
function installInput() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!e.repeat) { if (menuOpen) { if (!menu.back()) closeMenu(); } else openMenu(); }
      e.preventDefault(); e.stopImmediatePropagation();
      return;
    }
    if (menuOpen) menu.key(e);
  }, true);
  window.addEventListener('keyup', (e) => { if (menuOpen) e.stopImmediatePropagation(); }, true);

  // Select+Start (qualquer controle) abre o menu; com o menu aberto, D-pad/A/B navegam.
  const prev = {};
  let chordHeld = false;
  const poll = () => {
    const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
    for (const gp of pads) {
      if (!gp) continue;
      const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
      const cur = { u: b(12) || gp.axes[1] < -0.6, d: b(13) || gp.axes[1] > 0.6, l: b(14) || gp.axes[0] < -0.6,
        r: b(15) || gp.axes[0] > 0.6, a: b(0), bk: b(1), chord: b(8) && b(9) };
      const p = prev[gp.index] || {};
      if (cur.chord && !chordHeld && !menuOpen) { openMenu(); chordHeld = true; }
      if (!cur.chord) chordHeld = false;
      if (menuOpen) {
        if (cur.u && !p.u) menu.move(-1);
        if (cur.d && !p.d) menu.move(1);
        if (cur.l && !p.l) menu.move(-1);
        if (cur.r && !p.r) menu.move(1);
        if (cur.a && !p.a) menu.activate();
        if (cur.bk && !p.bk) { if (!menu.back()) closeMenu(); }
      }
      prev[gp.index] = cur;
    }
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);

  // Segurar PageDown = avanço rápido, PageUp = rebobinar (entradas 27/28 do EmulatorJS)
  const hold = (code, idx) => {
    window.addEventListener('keydown', (e) => { if (e.code === code && !e.repeat && !menuOpen) gm.simulateInput(0, idx, 1); });
    window.addEventListener('keyup', (e) => { if (e.code === code) gm.simulateInput(0, idx, 0); });
  };
  hold('PageDown', 27);
  if (rewindOn) hold('PageUp', 28);
}

// ---------- saída ----------
let exitPromise = null;
function exitPlayer() {
  if (exitPromise) return exitPromise;
  exiting = true;
  exitPromise = (async () => {
    timers.forEach(clearInterval);
    tick();
    if (menu) menu.close();
    menuOpen = false;
    if (started) {
      status(t('saving'));
      try { ejs.pause(true); } catch (e) { /* ignore */ }
      if (canStates) await withTimeout(uploadState({ auto: true }), 15_000).catch((e) => console.warn('final autosave', e));
      await withTimeout(uploadSram(), 8_000).catch(() => {});
      await withTimeout(api.session('stop', sessionBody()), 6_000).catch(() => {});
    }
    post({ type: 'totv-retro:exit', playedMs: Math.round(playedMs) });
  })();
  return exitPromise;
}

// Fechamento abrupto pelo pai: melhor esforço (keepalive não comporta estados grandes).
function onPageHide() {
  if (exitPromise || !started) return;
  uploadSram(true);
  api.session('stop', sessionBody(), true).catch(() => {});
}

boot();
