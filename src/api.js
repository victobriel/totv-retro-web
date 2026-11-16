// Totv Retro Web - GPL-3.0-or-later
// Cliente HTTP mínimo para a "Games API" do Totv (docs/games-api.md do servidor).
// O token (de player, com escopo) só trafega no cabeçalho X-Totv-Token, nunca em URL.
export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export class Api {
  constructor(server, token, itemId) {
    const u = new URL(server || '.', location.href);
    this.origin = u.origin;
    this.base = u.href.replace(/[?#].*$/, '').replace(/\/+$/, '');
    this.token = token;
    this.itemId = itemId;
    window.__totvAllowOrigin(this.origin);
  }

  async raw(path, { method = 'GET', body, headers = {}, keepalive = false, absolute = false } = {}) {
    const url = absolute ? new URL(path, this.origin).href : this.base + path;
    let res;
    try {
      res = await fetch(url, {
        method, body, keepalive,
        headers: { 'X-Totv-Token': this.token, ...headers },
        credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      });
    } catch (e) {
      throw new ApiError(0, e && e.message ? e.message : String(e));
    }
    return res;
  }

  async ok(path, opts) {
    const res = await this.raw(path, opts);
    if (!res.ok && res.status !== 404) throw new ApiError(res.status, 'HTTP ' + res.status);
    return res;
  }

  async json(path, opts) {
    const res = await this.raw(path, opts);
    if (!res.ok) throw new ApiError(res.status, 'HTTP ' + res.status);
    return res.json();
  }

  platforms() { return this.json('/api/games/platforms'); }
  item() { return this.json('/api/items/' + this.itemId); }
  saves() { return this.json(`/api/games/${this.itemId}/saves`); }

  async rom(mediaId, onProgress) {
    const res = await this.raw('/api/games/rom/' + encodeURIComponent(mediaId));
    if (!res.ok) throw new ApiError(res.status, 'HTTP ' + res.status);
    let name = res.headers.get('X-Totv-Rom-Name') || '';
    if (res.headers.get('X-Totv-Rom-Name-Encoding') === 'uri') {
      try { name = decodeURIComponent(name); } catch (e) { /* mantém */ }
    }
    const total = Number(res.headers.get('Content-Length')) || 0;
    const chunks = []; let got = 0;
    const reader = res.body && res.body.getReader ? res.body.getReader() : null;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); got += value.length;
        if (onProgress && total) onProgress(got / total);
      }
    } else {
      const b = new Uint8Array(await res.arrayBuffer());
      chunks.push(b); got = b.length;
    }
    return { name, data: new Blob(chunks) };
  }

  async bios(platform, file) {
    const res = await this.raw(`/api/games/bios/${encodeURIComponent(platform)}/${encodeURIComponent(file)}`);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  }

  async getSram(core) {
    const res = await this.raw(`/api/games/${this.itemId}/sram?core=${encodeURIComponent(core)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new ApiError(res.status, 'HTTP ' + res.status);
    return new Uint8Array(await res.arrayBuffer());
  }

  async putSram(core, mediaId, data, keepalive = false) {
    const res = await this.raw(`/api/games/${this.itemId}/sram?core=${encodeURIComponent(core)}&mediaId=${encodeURIComponent(mediaId)}`,
      { method: 'PUT', body: data, keepalive, headers: { 'Content-Type': 'application/octet-stream' } });
    if (!res.ok) throw new ApiError(res.status, 'HTTP ' + res.status);
  }

  async postState({ core, mediaId, slot, auto, data }) {
    const q = `core=${encodeURIComponent(core)}&mediaId=${encodeURIComponent(mediaId)}&slot=${auto ? 0 : slot}&auto=${auto ? 1 : 0}`;
    const res = await this.raw(`/api/games/${this.itemId}/states?${q}`,
      { method: 'POST', body: data, headers: { 'Content-Type': 'application/octet-stream' } });
    if (!res.ok) throw new ApiError(res.status, 'HTTP ' + res.status);
    return (await res.json()).id;
  }

  async putThumb(stateId, blob) {
    const res = await this.raw(`/api/games/states/${stateId}/thumb`,
      { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type || 'image/png' } });
    if (!res.ok) throw new ApiError(res.status, 'HTTP ' + res.status);
  }

  async getState(id) {
    const res = await this.raw(`/api/games/states/${id}`);
    if (!res.ok) throw new ApiError(res.status, 'HTTP ' + res.status);
    return new Uint8Array(await res.arrayBuffer());
  }

  // thumbUrl é relativo ao servidor (já com o prefixo de base path, se houver)
  async thumbBlob(thumbUrl) {
    const res = await this.raw(thumbUrl, { absolute: true });
    if (!res.ok) return null;
    return res.blob();
  }

  async session(state, { mediaId, core, playedMs }, keepalive = false) {
    const res = await this.raw(`/api/games/${this.itemId}/session`, {
      method: 'POST', keepalive,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, mediaId, core, playedMs: Math.max(0, Math.round(playedMs)) }),
    });
    if (!res.ok) throw new ApiError(res.status, 'HTTP ' + res.status);
    return res.json().catch(() => ({}));
  }
}
