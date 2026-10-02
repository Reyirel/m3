// scripts/generate-precache.mjs
// Se ejecuta después de `expo export -p web` (ver "build:web" en package.json).
// Prepara el build para funcionar sin internet:
//   1. dist/precache-manifest.json — lista de archivos que el service worker guarda al instalarse
//   2. dist/sw.js — se le pone un identificador de build para que el navegador detecte la versión nueva

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const swFile = path.join(dist, 'sw.js');

if (!fs.existsSync(dist) || !fs.existsSync(swFile)) {
  console.error('❌ No existe dist/sw.js. Ejecuta primero: expo export -p web');
  process.exit(1);
}

// Carpetas con los archivos de la app (código, fuentes, imágenes) y archivos sueltos de la raíz
const PRECACHE_DIRS = ['_expo', 'assets'];
const PRECACHE_ROOT_FILES = ['manifest.json', 'favicon.ico', 'favicon.png', 'favicon.svg', 'icon-192.png', 'icon-512.png'];

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

const toUrl = (file) => '/' + path.relative(dist, file).split(path.sep).map(encodeURIComponent).join('/');

const files = [
  ...PRECACHE_DIRS.filter((dir) => fs.existsSync(path.join(dist, dir))).flatMap((dir) => walk(path.join(dist, dir))),
  ...PRECACHE_ROOT_FILES.map((name) => path.join(dist, name)).filter((file) => fs.existsSync(file)),
]
  // Los mapas de código no se usan en ejecución
  .filter((file) => !file.endsWith('.map'));

const urls = files.map(toUrl).sort();
fs.writeFileSync(path.join(dist, 'precache-manifest.json'), JSON.stringify(urls));

const buildId = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
const sw = fs.readFileSync(swFile, 'utf8');
if (!sw.includes('__BUILD_ID__')) {
  console.error('❌ dist/sw.js no contiene __BUILD_ID__');
  process.exit(1);
}
fs.writeFileSync(swFile, sw.replaceAll('__BUILD_ID__', buildId));

const totalMb = files.reduce((sum, file) => sum + fs.statSync(file).size, 0) / (1024 * 1024);
console.log(`✅ Offline listo: ${urls.length} archivos (${totalMb.toFixed(1)} MB), build ${buildId}`);
