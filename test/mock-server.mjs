// Totv Retro Web - GPL-3.0-or-later
// Servidor de teste: serve dist/ em /retro/, harness.html e uma API Totv falsa (só o que o player usa).
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');
export const TOKEN = 'scoped-player-token';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.txt': 'text/plain', '.md': 'text/plain', '.data': 'application/octet-stream' };

const PLATFORMS = [
  { id: 'nes', name: 'NES', extensions: ['.nes'], cores: { android: ['fceumm'], web: ['fceumm', 'nestopia'] }, bios: [] },
  { id: 'gba', name: 'GBA', extensions: ['.gba'], cores: { android: ['mgba'], web: ['mgba'] }, bios: [] },
  { id: 'snes', name: 'SNES', extensions: ['.sfc'], cores: { android: ['mednafen_supafaust'], web: ['snes9x'] }, bios: [] },
];
const ITEMS = {
  1: { id: 1, title: 'nestest (teste)', platform: 'nes', media: [{ id: 11, label: 'nestest' }], rom: 'nestest.nes' },
  2: { id: 2, title: 'GBA Tests ARM (teste)', platform: 'gba', media: [{ id: 21, label: 'arm' }], rom: 'arm.gba' },
  3: { id: 3, title: 'SNES (sem suporte)', platform: 'snes', media: [{ id: 31 }], rom: 'nestest.nes' },
};

export function createMock(romDir) {
  const calls = [];                // { method, path, query, status, size }
  const db = { sram: new Map(), states: [], nextId: 100, thumbs: new Map() };
  const srv = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    const send = (code, body, type = 'application/json', extra = {}) => {
      res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
      res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    };
    if (u.pathname.startsWith('/api/')) {
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks);
      const entry = { method: req.method, path: u.pathname, query: Object.fromEntries(u.searchParams), size: body.length,
        tokenInUrl: u.search.includes('token'), tokenOk: req.headers['x-totv-token'] === TOKEN, body: u.pathname.endsWith('/session') ? body.toString() : undefined };
      calls.push(entry);
      if (!entry.tokenOk) return send(401, { error: 'unauthorized' });
      const p = u.pathname;
      let m;
      if (p === '/api/games/platforms') return send(200, PLATFORMS);
      if ((m = p.match(/^\/api\/items\/(\d+)$/))) { const it = ITEMS[m[1]]; return it ? send(200, { ...it, rom: undefined, resumeStateId: null }) : send(404, {}); }
      if ((m = p.match(/^\/api\/games\/rom\/(\d+)$/))) {
        const it = Object.values(ITEMS).find((i) => i.media.some((x) => x.id === +m[1]));
        const f = join(romDir, it.rom);
        if (!it || !existsSync(f)) return send(404, {});
        return send(200, readFileSync(f), 'application/octet-stream', { 'X-Totv-Rom-Name': it.rom, 'Access-Control-Expose-Headers': 'X-Totv-Rom-Name' });
      }
      if ((m = p.match(/^\/api\/games\/(\d+)\/saves$/))) {
        const id = +m[1]; const s = db.sram.get(id);
        return send(200, { sram: s ? { core: s.core, size: s.data.length, updatedAt: Date.now() } : null,
          states: db.states.filter((x) => x.itemId === id).map((x) => ({ id: x.id, slot: x.slot, auto: x.auto, core: x.core, mediaId: x.mediaId,
            size: x.size, createdAt: x.createdAt, thumbUrl: `/api/games/states/${x.id}/thumb`, label: x.auto ? 'Auto' : 'Slot ' + x.slot })).reverse() });
      }
      if ((m = p.match(/^\/api\/games\/(\d+)\/sram$/))) {
        const id = +m[1];
        if (req.method === 'PUT') { db.sram.set(id, { core: u.searchParams.get('core'), data: body }); return send(200, { ok: true }); }
        const s = db.sram.get(id); return s ? send(200, s.data, 'application/octet-stream', { 'X-Totv-Core': s.core }) : send(404, {});
      }
      if ((m = p.match(/^\/api\/games\/(\d+)\/states$/)) && req.method === 'POST') {
        const q = u.searchParams; const auto = q.get('auto') === '1';
        if (!auto && !(+q.get('slot') >= 1 && +q.get('slot') <= 9)) return send(400, {});
        const st = { id: db.nextId++, itemId: +m[1], slot: auto ? 0 : +q.get('slot'), auto, core: q.get('core'), mediaId: +q.get('mediaId'), size: body.length, data: body, createdAt: Date.now() };
        if (!auto) db.states = db.states.filter((x) => !(x.itemId === st.itemId && !x.auto && x.slot === st.slot));
        db.states.push(st); return send(200, { id: st.id });
      }
      if ((m = p.match(/^\/api\/games\/states\/(\d+)\/thumb$/))) {
        if (req.method === 'PUT') { if (!/^image\/(png|jpeg)$/.test(req.headers['content-type'] || '')) return send(415, {}); db.thumbs.set(+m[1], body); return send(200, { ok: true }); }
        const t = db.thumbs.get(+m[1]); return t ? send(200, t, 'image/png') : send(404, {});
      }
      if ((m = p.match(/^\/api\/games\/states\/(\d+)$/))) { const s = db.states.find((x) => x.id === +m[1]); return s ? send(200, s.data, 'application/octet-stream') : send(404, {}); }
      if (/^\/api\/games\/\d+\/session$/.test(p)) return send(200, { ok: true, plays: 1, totalMs: 0 });
      return send(403, {});
    }
    let file = null;
    if (u.pathname === '/harness.html') file = join(here, 'harness.html');
    else if (u.pathname.startsWith('/retro/')) file = join(dist, decodeURIComponent(u.pathname.slice(7)) || 'index.html');
    if (!file || !existsSync(file) || !statSync(file).isFile()) return send(404, 'not found', 'text/plain');
    send(200, readFileSync(file), MIME[extname(file)] || 'application/octet-stream');
  });
  return { srv, calls, db, listen: () => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv.address().port))), close: () => srv.close() };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const m = createMock(process.env.ROM_DIR || join(here, 'roms'));
  m.listen().then((p) => console.log(`harness: http://127.0.0.1:${p}/harness.html?item=1`));
}
