// scripts/generateIcon.mjs
// Genera todos los iconos a partir de los SVG de assets/. Para cambiar el icono:
// editar assets/icon.svg (icono completo), assets/adaptive-icon.svg (Android) y
// assets/logo-mark.svg (figura sola), y ejecutar `node scripts/generateIcon.mjs`.
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = (name) => readFileSync(join(root, 'assets', name));
const png = (source, size, target) =>
  sharp(source, { density: 300 }).resize(size, size).png().toFile(join(root, target));

const BRAND = { r: 159, g: 34, b: 65, alpha: 1 }; // #9F2241

async function generateIcons() {
  const icon = svg('icon.svg');
  const mark = svg('logo-mark.svg');

  await png(icon, 1024, 'assets/icon.png');
  await png(icon, 64, 'assets/favicon.png');
  await png(svg('adaptive-icon.svg'), 1024, 'assets/adaptive-icon.png');
  // Figura sola para la pantalla de inicio animada (components/AnimatedSplash.js)
  await png(mark, 512, 'assets/logo-mark.png');

  // Web (PWA)
  await png(icon, 1024, 'public/icon.png');
  await png(icon, 512, 'public/icon-512.png');
  await png(icon, 192, 'public/icon-192.png');
  await png(icon, 64, 'public/favicon.png');
  // Icono "maskable" (el que recorta Android al instalar la app web): fondo guinda hasta
  // el borde, sin esquinas redondeadas; la figura ya queda dentro de la zona segura
  const maskable = Buffer.from(icon.toString('utf8').replace('rx="224"', 'rx="0"'));
  await png(maskable, 512, 'public/icon-maskable-512.png');
  await png(maskable, 192, 'public/icon-maskable-192.png');

  // Pantalla de inicio nativa: fondo guinda con la figura al centro
  const markForSplash = await sharp(mark, { density: 300 }).resize(420, 420).png().toBuffer();
  await sharp({ create: { width: 1284, height: 2778, channels: 4, background: BRAND } })
    .composite([{ input: markForSplash, gravity: 'center' }])
    .png()
    .toFile(join(root, 'assets/splash.png'));

  console.log('Iconos generados en assets/ y public/');
}

generateIcons().catch((error) => {
  console.error(error);
  process.exit(1);
});
