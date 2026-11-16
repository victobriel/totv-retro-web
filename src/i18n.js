// Totv Retro Web - GPL-3.0-or-later
const STR = {
  'pt-BR': {
    waiting: 'Aguardando o Totv…',
    standalone: 'Esta página deve ser aberta pelo Totv.',
    loadingInfo: 'Carregando informações do jogo…',
    downloadingRom: 'Baixando o jogo…',
    startingCore: 'Iniciando o emulador…',
    unsupported: 'Plataforma não suportada no web: {p}.',
    noCore: 'Nenhum emulador disponível para a plataforma {p}.',
    noMedia: 'Este jogo não tem nenhuma versão para jogar.',
    errNet: 'Falha de rede: {m}',
    errAuth: 'Sessão expirada. Feche e abra o jogo novamente.',
    errHidden: 'Jogo indisponível agora (restrição de acesso ou horário).',
    errStart: 'Não foi possível iniciar o jogo.',
    back: 'Voltar',
    menu: 'Menu',
    resume: 'Continuar',
    save: 'Salvar estado',
    load: 'Carregar estado',
    reset: 'Reiniciar',
    ffOn: 'Avanço rápido: desligado',
    ffOff: 'Avanço rápido: ligado',
    rewindHint: 'Rebobinar: segure PageUp (mapeável em Controles)',
    exit: 'Sair do jogo',
    slot: 'Slot {n}',
    auto: 'Automático',
    empty: 'Vazio',
    saved: 'Estado salvo no slot {n}.',
    saveFail: 'Falha ao salvar o estado.',
    loaded: 'Estado carregado.',
    loadFail: 'Falha ao carregar o estado.',
    coreMismatch: 'Estado de outro emulador ({c}); ignorado.',
    stateMissing: 'Estado de retomada não encontrado; iniciando do começo.',
    noStates: 'Este emulador não suporta estados salvos.',
    saving: 'Salvando…',
    sessionStop: 'Fora do horário permitido. Encerrando.',
    resetDone: 'Jogo reiniciado.',
    sramLoaded: 'Save do jogo restaurado.',
  },
  en: {
    waiting: 'Waiting for Totv…',
    standalone: 'This page must be opened from Totv.',
    loadingInfo: 'Loading game information…',
    downloadingRom: 'Downloading game…',
    startingCore: 'Starting emulator…',
    unsupported: 'Platform not supported on the web: {p}.',
    noCore: 'No emulator available for platform {p}.',
    noMedia: 'This game has no playable version.',
    errNet: 'Network error: {m}',
    errAuth: 'Session expired. Close and reopen the game.',
    errHidden: 'Game unavailable right now (access restriction or schedule).',
    errStart: 'Could not start the game.',
    back: 'Back',
    menu: 'Menu',
    resume: 'Resume',
    save: 'Save state',
    load: 'Load state',
    reset: 'Reset',
    ffOn: 'Fast-forward: off',
    ffOff: 'Fast-forward: on',
    rewindHint: 'Rewind: hold PageUp (remappable in Controls)',
    exit: 'Exit game',
    slot: 'Slot {n}',
    auto: 'Auto',
    empty: 'Empty',
    saved: 'State saved to slot {n}.',
    saveFail: 'Failed to save state.',
    loaded: 'State loaded.',
    loadFail: 'Failed to load state.',
    coreMismatch: 'State from another emulator ({c}); ignored.',
    stateMissing: 'Resume state not found; starting from the beginning.',
    noStates: 'This emulator does not support save states.',
    saving: 'Saving…',
    sessionStop: 'Outside the allowed schedule. Closing.',
    resetDone: 'Game reset.',
    sramLoaded: 'Game save restored.',
  },
};

let cur = 'pt-BR';
export function setLang(lang) {
  cur = String(lang || '').toLowerCase().startsWith('pt') ? 'pt-BR' : (lang ? 'en' : 'pt-BR');
  document.documentElement.lang = cur === 'en' ? 'en' : 'pt-BR';
  return cur;
}
export const ejsLang = () => (cur === 'en' ? 'en-US' : 'pt-BR');
export function t(key, vars) {
  let s = (STR[cur] && STR[cur][key]) || STR['pt-BR'][key] || key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', String(vars[k]));
  return s;
}
