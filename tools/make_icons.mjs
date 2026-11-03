// Builds icons/icon.svg from the mascot art. Run from the repo root: node tools/make_icons.mjs
import { writeFileSync } from 'node:fs';
import { mascotSvg } from '../js/art.js';

const inner = mascotSvg('happy').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
let stripes = '';
for (let i = 0; i < 8; i++) {
  const fill = i % 2 ? '#FFFDF8' : '#B8232F';
  stripes += `<rect x="${i * 64}" y="0" width="64" height="92" fill="${fill}"/><path d="M${i * 64} 89 a32 32 0 0 0 64 0z" fill="${fill}" stroke="#1D2340" stroke-width="6" stroke-linejoin="round"/>`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="0" fill="#FFF7EA"/>
  ${stripes}
  <rect x="0" y="86" width="512" height="6" fill="#1D2340"/>
  <g transform="translate(64 158) scale(3.2)">${inner}</g>
</svg>`;
writeFileSync('icons/icon.svg', svg);
writeFileSync('icons/render.html', `<!doctype html><html><body style="margin:0;background:#FFF7EA">${svg.replace('<svg ', '<svg width="100%" height="100%" style="display:block;width:100vw;height:100vh" ')}</body></html>`);
console.log('ok');
