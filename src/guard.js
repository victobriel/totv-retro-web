// Totv Retro Web - GPL-3.0-or-later
// Bloqueia qualquer requisição de rede que não seja para a mesma origem, blob:/data: ou o
// servidor Totv informado no handshake (window.__totvAllowOrigin). Cobre também o que o
// EmulatorJS faria por conta própria (ex.: CDN de fallback, verificação de atualização).
(function () {
  'use strict';
  var allowed = new Set([location.origin]);
  window.__blockedRequests = [];
  window.__totvAllowOrigin = function (o) { allowed.add(o); };
  function ok(u) {
    try {
      var x = new URL(u, location.href);
      if (x.protocol === 'blob:' || x.protocol === 'data:') return true;
      return allowed.has(x.origin);
    } catch (e) { return false; }
  }
  function block(u) {
    // verificação de atualização embutida do EmulatorJS: descartada sem ruído
    if (/^https:\/\/cdn\.emulatorjs\.org\/stable\/data\/version\.json$/.test(String(u))) return;
    window.__blockedRequests.push(String(u));
    console.warn('[totv-retro] requisição bloqueada:', String(u));
  }
  var f = window.fetch;
  window.fetch = function (input, init) {
    var u = (typeof input === 'string' || input instanceof URL) ? String(input) : input.url;
    if (!ok(u)) { block(u); return Promise.reject(new TypeError('blocked: ' + u)); }
    return f.call(this, input, init);
  };
  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u) {
    if (!ok(u)) { block(u); throw new DOMException('blocked: ' + u, 'NetworkError'); }
    return open.apply(this, arguments);
  };
  var WS = window.WebSocket;
  window.WebSocket = function (u) { block(u); throw new DOMException('blocked', 'NetworkError'); };
  window.WebSocket.prototype = WS.prototype;
  if (navigator.sendBeacon) navigator.sendBeacon = function (u) { block(u); return false; };
})();
