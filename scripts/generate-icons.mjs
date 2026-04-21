#!/usr/bin/env node
/**
 * Genera los iconos de la app (.icns para macOS, .png para Linux, .ico para Windows)
 * a partir de resources/icon.svg usando sharp + iconutil (nativo en macOS).
 *
 * Uso: node scripts/generate-icons.mjs
 */

import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, rm, writeFile, readFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const execFile = promisify(_execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const RES = resolve(ROOT, 'resources');
const SVG = resolve(RES, 'icon.svg');

const SIZES_MAC = [16, 32, 64, 128, 256, 512, 1024];
const SIZES_WIN = [16, 24, 32, 48, 64, 128, 256];

if (!existsSync(SVG)) {
  console.error(`No se encontró ${SVG}`);
  process.exit(1);
}

const svgBuffer = await readFile(SVG);

async function renderPng(size, outPath) {
  await sharp(svgBuffer, { density: 512 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
}

async function buildIconset() {
  const iconset = resolve(RES, 'icon.iconset');
  await rm(iconset, { recursive: true, force: true });
  await mkdir(iconset, { recursive: true });

  const specs = [
    ['icon_16x16.png', 16],
    ['icon_16x16@2x.png', 32],
    ['icon_32x32.png', 32],
    ['icon_32x32@2x.png', 64],
    ['icon_128x128.png', 128],
    ['icon_128x128@2x.png', 256],
    ['icon_256x256.png', 256],
    ['icon_256x256@2x.png', 512],
    ['icon_512x512.png', 512],
    ['icon_512x512@2x.png', 1024]
  ];

  for (const [name, size] of specs) {
    await renderPng(size, resolve(iconset, name));
  }

  const icns = resolve(RES, 'icon.icns');
  try {
    await execFile('iconutil', ['-c', 'icns', iconset, '-o', icns]);
    console.log(`icns generado: ${icns}`);
  } catch (err) {
    console.warn('iconutil no disponible (¿no estás en macOS?). Omitiendo .icns.');
    console.warn(err?.message);
  } finally {
    await rm(iconset, { recursive: true, force: true });
  }
}

async function buildWindowsIco() {
  const ico = resolve(RES, 'icon.ico');
  const tmpDir = resolve(RES, '.ico-tmp');
  await mkdir(tmpDir, { recursive: true });
  for (const size of SIZES_WIN) {
    await renderPng(size, resolve(tmpDir, `${size}.png`));
  }
  try {
    const { default: pngToIco } = await import('png-to-ico').catch(() => ({ default: null }));
    if (!pngToIco) {
      console.warn('Paquete "png-to-ico" no instalado; omitiendo .ico. (opcional)');
      return;
    }
    const buf = await pngToIco(SIZES_WIN.map((s) => resolve(tmpDir, `${s}.png`)));
    await writeFile(ico, buf);
    console.log(`ico generado: ${ico}`);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

async function buildLinuxPng() {
  const out = resolve(RES, 'icon.png');
  await renderPng(512, out);
  console.log(`png generado: ${out}`);
}

async function buildAppIconsDir() {
  const dir = resolve(RES, 'icons');
  await mkdir(dir, { recursive: true });
  for (const s of SIZES_MAC) {
    await renderPng(s, resolve(dir, `${s}x${s}.png`));
  }
  await copyFile(SVG, resolve(dir, 'source.svg'));
  console.log(`icons/ generado con tamaños ${SIZES_MAC.join(', ')}`);
}

console.log(`Generando iconos desde ${SVG}`);
await buildIconset();
await buildWindowsIco();
await buildLinuxPng();
await buildAppIconsDir();
console.log('Listo.');
