// Totv Retro Web - GPL-3.0-or-later
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMock } from './mock-server.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const CHROME = process.env.CHROME || '/usr/bin/google-chrome-stable';

const mock = createMock(process.env.ROM_DIR || join(here, 'roms'));
const port = await mock.listen();
const base = `http://127.0.0.1:${port}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`); if (!ok) failures++; };

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
});

async function open(query) {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 720 });
  const external = [];
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(base) && !u.startsWith('blob:') && !u.startsWith('data:')) external.push(u); });
  page.on('pageerror', (e) => console.log('  pageerror:', e.message));
  await page.goto(`${base}/harness.html?${query}`);
  return { page, external };
}
const events = (page) => page.evaluate(() => window.__events);
async function waitFor(fn, ms = 60000, step = 250) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(step); }
  return null;
}
const frameOf = (page) => page.frames().find((f) => f.url().includes('/retro/index.html'));

// Fração de pixels diferentes do canto no screenshot do canvas (decodificado no navegador).
async function canvasNonBlank(page, frame) {
  const box = await (await frame.$('canvas')).boundingBox();
  const shot = await page.screenshot({ clip: box, encoding: 'base64' });
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const seen = new Set(); for (let i = 0; i < d.length; i += 4 * 7) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    return seen.size;
  }, shot);
}

async function playCase({ label, item, core, platform }) {
  console.log(`\n== ${label} ==`);
  mock.calls.length = 0;
  const { page, external } = await open(`item=${item}`);
  const ready = await waitFor(async () => (await events(page)).some((e) => e.type === 'totv-retro:ready'), 15000);
  check(`${label}: ready enviado ao pai`, !!ready);
  const frame = frameOf(page);
  const started = await waitFor(() => frame.evaluate(() => !!(window.EJS_emulator && window.EJS_emulator.started)), 90000);
  check(`${label}: emulador iniciou`, !!started);
  if (!started) { await page.close(); return; }
  await sleep(3000);
  const colors = await canvasNonBlank(page, frame);
  check(`${label}: canvas não vazio`, colors >= 3, `${colors} cores`);
  check(`${label}: sessão start`, mock.calls.some((c) => /session$/.test(c.path) && c.body.includes('"start"') && c.body.includes(`"core":"${core}"`)));
  await page.screenshot({ path: join(here, `shot-${label}.png`) });

  // SRAM: força uma mudança no arquivo de save do núcleo (ROMs de teste não têm bateria)
  await frame.evaluate(() => {
    const gm = window.EJS_emulator.gameManager; const p = gm.getSaveFilePath();
    const d = new Uint8Array(8192).map((_, i) => (i * 7 + 3) & 255);
    const parts = p.split('/'); let cp = '';
    for (let i = 0; i < parts.length - 1; i++) { if (!parts[i]) continue; cp += '/' + parts[i]; if (!gm.FS.analyzePath(cp).exists) gm.FS.mkdir(cp); }
    gm.FS.writeFile(p, d);
  });

  // menu: Esc abre; salva no slot 1; sai
  await page.keyboard.press('Escape');
  const menuOpen = await waitFor(() => frame.evaluate(() => !document.getElementById('menu').hidden), 5000);
  check(`${label}: menu abre com Esc`, !!menuOpen);
  const items = await frame.$$eval('#menu .item', (b) => b.map((x) => x.textContent));
  console.log('  itens do menu:', JSON.stringify(items));
  await (await frame.$$('#menu .item'))[1].click();                       // Salvar estado
  await waitFor(() => frame.$('#menu .slot'), 5000);
  await (await frame.$$('#menu .slot'))[0].click();                       // slot 1
  const savedState = await waitFor(() => mock.calls.find((c) => c.method === 'POST' && /states$/.test(c.path) && c.query.slot === '1' && c.query.auto === '0'), 8000);
  check(`${label}: POST state slot 1`, !!savedState && savedState.size > 1000, savedState ? `${savedState.size} bytes` : '');
  const thumb1 = await waitFor(() => mock.calls.find((c) => c.method === 'PUT' && /thumb$/.test(c.path)), 5000);
  check(`${label}: PUT thumb (slot 1)`, !!thumb1 && thumb1.size > 100, thumb1 ? `${thumb1.size} bytes` : '');
  await sleep(500);
  // reabre o menu e confere miniatura carregada via fetch (sem token em URL)
  await page.keyboard.press('Escape');
  await waitFor(() => frame.evaluate(() => !document.getElementById('menu').hidden), 3000);
  await (await frame.$$('#menu .item'))[2].click();                       // Carregar estado
  const thumbShown = await waitFor(() => frame.evaluate(() => [...document.querySelectorAll('#menu .thumb')].some((t) => t.style.backgroundImage.startsWith('url("blob:'))), 5000);
  check(`${label}: miniatura do slot exibida (blob)`, !!thumbShown);
  await page.keyboard.press('Escape');   // volta
  await page.keyboard.press('Escape');   // fecha
  await sleep(300);

  mock.calls.length = 0;
  await page.keyboard.press('Escape');
  await waitFor(() => frame.evaluate(() => !document.getElementById('menu').hidden), 3000);
  const exitItems = await frame.$$('#menu .item');
  await exitItems[exitItems.length - 1].click();                          // Sair
  const exit = await waitFor(async () => (await events(page)).find((e) => e.type === 'totv-retro:exit'), 30000);
  check(`${label}: mensagem totv-retro:exit`, !!exit && typeof exit.playedMs === 'number', exit ? `playedMs=${exit.playedMs}` : '');
  const auto = mock.calls.find((c) => c.method === 'POST' && /states$/.test(c.path) && c.query.auto === '1');
  check(`${label}: autosave (auto=1) na saída`, !!auto && auto.size > 1000);
  check(`${label}: miniatura do autosave`, mock.calls.some((c) => c.method === 'PUT' && /thumb$/.test(c.path)));
  const sram = mock.calls.find((c) => c.method === 'PUT' && /sram$/.test(c.path));
  check(`${label}: PUT sram`, !!sram && sram.size > 0 && sram.query.core === core && !!sram.query.mediaId, sram ? `${sram.size} bytes` : '');
  check(`${label}: sessão stop`, mock.calls.some((c) => /session$/.test(c.path) && c.body.includes('"stop"')));
  const allCalls = mock.calls;
  check(`${label}: token só no cabeçalho`, allCalls.every((c) => c.tokenOk && !c.tokenInUrl));
  check(`${label}: nenhuma requisição externa`, external.length === 0, external.join(', '));
  const blocked = await frame.evaluate(() => window.__blockedRequests);
  check(`${label}: guard não bloqueou nada`, blocked.length === 0, blocked.join(', '));
  await page.close();
  return true;
}

await playCase({ label: 'nes', item: 1, core: 'fceumm' });
await playCase({ label: 'gba', item: 2, core: 'mgba' });

// retomada: estado salvo (auto) é carregado e núcleo diferente é ignorado
{
  console.log('\n== retomada ==');
  const st = mock.db.states.filter((s) => s.itemId === 1 && s.auto).pop();
  check('retomada: há estado auto da sessão anterior', !!st);
  mock.calls.length = 0;
  const { page } = await open(`item=1&state=${st.id}`);
  const frame = await waitFor(() => frameOf(page), 5000);
  const started = await waitFor(() => frame.evaluate(() => !!(window.EJS_emulator && window.EJS_emulator.started)), 90000);
  check('retomada: iniciou', !!started);
  await waitFor(() => mock.calls.find((c) => c.method === 'GET' && c.path === `/api/games/states/${st.id}`), 8000);
  check('retomada: GET do estado e do sram', mock.calls.some((c) => c.path === `/api/games/states/${st.id}`) && mock.calls.some((c) => /\/sram$/.test(c.path) && c.method === 'GET'));
  // heartbeat (60 s) e upload periódico de SRAM só quando mudou
  await sleep(62000);
  const hb = mock.calls.filter((c) => /session$/.test(c.path) && c.body.includes('"heartbeat"'));
  check('sessão: heartbeat após 60 s', hb.length >= 1 && JSON.parse(hb[0].body).playedMs > 30000, hb[0] && hb[0].body);
  await page.close();
  // estado de outro núcleo: ignorado com aviso
  mock.db.states.push({ id: 999, itemId: 1, slot: 0, auto: true, core: 'nestopia', mediaId: 11, size: 3, data: Buffer.from('xyz'), createdAt: Date.now() + 1 });
  mock.calls.length = 0;
  const b = await open('item=1&state=999');
  const f2 = await waitFor(() => frameOf(b.page), 5000);
  await waitFor(() => f2.evaluate(() => !!(window.EJS_emulator && window.EJS_emulator.started)), 90000);
  await sleep(800);
  const toastTxt = await f2.evaluate(() => document.getElementById('toast').textContent);
  check('retomada: núcleo diferente ignorado com toast', /outro emulador/.test(toastTxt) && !mock.calls.some((c) => c.path === '/api/games/states/999'), toastTxt);
  await b.page.close();
}

// plataforma sem suporte
{
  console.log('\n== snes (não suportado) ==');
  const { page } = await open('item=3');
  const err = await waitFor(async () => (await events(page)).find((e) => e.type === 'totv-retro:error'), 15000);
  check('snes: totv-retro:error enviado', !!err, err && err.message);
  const frame = frameOf(page);
  check('snes: nenhum núcleo foi carregado', !(await frame.evaluate(() => !!window.EJS_emulator)));
  await page.close();
}

// mensagens de origem/remetente errados são ignoradas
{
  console.log('\n== segurança do handshake ==');
  mock.calls.length = 0;
  const page = await browser.newPage();
  await page.goto(`${base}/retro/index.html`);   // aberto fora de iframe
  await sleep(500);
  const txt = await page.$eval('#status-text', (e) => e.textContent);
  check('standalone: não inicia sem pai', /Totv/.test(txt) && mock.calls.length === 0, txt);
  await page.evaluate(() => postMessage({ type: 'totv-retro:init', server: location.origin, token: 'x', itemId: 1 }, '*'));
  await sleep(500);
  check('standalone: init de si mesmo ignorado', mock.calls.length === 0);
  await page.close();
}

await browser.close();
mock.close();
console.log(failures ? `\n${failures} falha(s)` : '\ntodos os testes passaram');
process.exit(failures ? 1 : 0);
