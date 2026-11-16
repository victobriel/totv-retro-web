// Totv Retro Web - GPL-3.0-or-later
// Monta dist/: src/ + vendor/emulatorjs -> dist/data. Sem bundler: ES modules puros.
import { cpSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const ejs = JSON.parse(readFileSync(join(root, 'vendor/emulatorjs/version.json'), 'utf8'));

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const f of readdirSync(join(root, 'src'))) cpSync(join(root, 'src', f), join(dist, f));
cpSync(join(root, 'vendor/emulatorjs'), join(dist, 'data'), { recursive: true });
for (const f of ['LICENSE', 'THIRD_PARTY.md']) cpSync(join(root, f), join(dist, f));
cpSync(join(root, 'licenses'), join(dist, 'licenses'), { recursive: true });
writeFileSync(join(dist, 'version.txt'), `${pkg.version} (EmulatorJS ${ejs.version})\n`);
console.log(`dist/ pronto: totv-retro-web ${pkg.version} (EmulatorJS ${ejs.version})`);
