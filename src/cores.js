// Totv Retro Web - GPL-3.0-or-later
// Núcleos incluídos neste bundle (todos com licença GPL/MPL; nenhum "non-commercial").
// Veja THIRD_PARTY.md. Plataformas ausentes aqui (snes, md) não são suportadas no web.
export const SHIPPED_CORES = ['fceumm', 'gambatte', 'mgba', 'smsplus', 'mednafen_pce'];

// ids de núcleo (libretro) que o servidor pode listar -> núcleo equivalente que temos
export const CORE_ALIAS = { mednafen_pce_fast: 'mednafen_pce' };

export const PLATFORMS = {
  nes: { cores: ['fceumm'], ext: 'nes', rewind: true },
  gb: { cores: ['gambatte'], ext: 'gb', rewind: true },
  gbc: { cores: ['gambatte'], ext: 'gbc', rewind: true },
  gba: { cores: ['mgba'], ext: 'gba', rewind: false },
  sms: { cores: ['smsplus'], ext: 'sms', rewind: true },
  gg: { cores: ['smsplus'], ext: 'gg', rewind: true },
  pce: { cores: ['mednafen_pce'], ext: 'pce', rewind: true },
};

export function isSupported(platform) { return !!PLATFORMS[platform]; }

// Escolhe o núcleo: primeiro da lista web do servidor que nós temos e que serve à plataforma;
// senão o padrão do bundle.
export function pickCore(platform, serverWebCores) {
  const p = PLATFORMS[platform];
  if (!p) return null;
  for (const raw of serverWebCores || []) {
    const c = CORE_ALIAS[raw] || raw;
    if (p.cores.includes(c) && SHIPPED_CORES.includes(c)) return c;
  }
  return p.cores[0];
}
