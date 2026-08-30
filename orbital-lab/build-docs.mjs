// Genera docs/index.html: la misma aplicación en un solo archivo, sin build ni
// CDN, lista para publicar con GitHub Pages. La fuente sigue siendo src/.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';

const raiz = new URL('./', import.meta.url);
const leer = (ruta) => readFileSync(new URL(ruta, raiz), 'utf8');

// Orden de dependencias: cada módulo sólo usa lo que ya está definido arriba.
const MODULOS = ['src/util.js', 'src/physics.js', 'src/sim.js', 'src/panel.js', 'src/scene.js', 'src/main.js'];

const codigo = MODULOS.map((m) => {
  const cuerpo = leer(m)
    .replace(/^import[\s\S]*?from\s+'[^']+';\n/gm, '')  // los import sobran: todo queda en un mismo ámbito
    .replace(/^export\s+/gm, '')                        // y los export también
    .trim();
  return `// ===================== ${m} =====================\n${cuerpo}`;
}).join('\n\n');

const html = leer('index.html')
  .replace('<link rel="stylesheet" href="./src/style.css" />', `<style>\n${leer('src/style.css').trim()}\n  </style>`)
  .replace('<script type="module" src="./src/main.js"></script>',
    `<!-- Phaser 3 vive en el repositorio: la página no depende de ningún CDN -->
  <script src="./phaser.min.js"></script>
  <script>\n${codigo}\n  </script>`);

// la página publicable vive en docs/ en la raíz del repositorio
writeFileSync(new URL('../docs/index.html', raiz), html);
copyFileSync(new URL('node_modules/phaser/dist/phaser.min.js', raiz), new URL('../docs/phaser.min.js', raiz));
console.log('docs/index.html generado —', (html.length / 1024).toFixed(0), 'KB');
