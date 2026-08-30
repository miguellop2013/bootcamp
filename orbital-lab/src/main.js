// Arranque de la aplicación: crea el juego de Phaser y conecta los controles.
import Phaser from 'phaser';
import { Lab, vista } from './scene.js';
import { sim, reiniciar, limpiarTraza, darPaso } from './sim.js';
import { ocultarImpacto } from './panel.js';
import { $ } from './util.js';


new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#05070d',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: Lab,
});

const controles = () => ({
  v0: parseFloat($('inV').value),
  altura: parseFloat($('inH').value),
  angulo: parseFloat($('inA').value),
});

// Flecha que muestra hacia dónde apunta el ángulo elegido (0° = →, 90° = ↑).
const BRUJULA = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'];

function sincronizar() {
  $('outV').textContent = parseFloat($('inV').value).toFixed(2);
  $('outH').textContent = $('inH').value;
  $('outA').textContent = $('inA').value;
  const i = Math.round((parseFloat($('inA').value) % 360) / 45) % 8;
  $('brujula').textContent = BRUJULA[i];
}

function preparar(lanzar) {
  reiniciar(controles(), lanzar);
  vista.reencuadrar = true;
  ocultarImpacto();
  $('btnPause').textContent = 'PAUSA';
}

for (const id of ['inV', 'inH', 'inA']) {
  $(id).addEventListener('input', () => { sincronizar(); preparar(false); });
}

$('btnLaunch').addEventListener('click', () => preparar(true));
$('btnReset').addEventListener('click', () => preparar(false));
$('btnRetry').addEventListener('click', () => preparar(true));
$('btnClear').addEventListener('click', limpiarTraza);

$('btnPause').addEventListener('click', () => {
  if (sim.fase === 'impacto' || sim.fase === 'listo') return;
  sim.corriendo = !sim.corriendo;
  $('btnPause').textContent = sim.corriendo ? 'PAUSA' : 'CONTINUAR';
});

$('btnStep').addEventListener('click', () => {
  darPaso(10);
  $('btnPause').textContent = 'CONTINUAR';
});

document.querySelectorAll('.speed').forEach((b) => {
  b.addEventListener('click', () => {
    sim.velocidadTiempo = parseFloat(b.dataset.speed);
    document.querySelectorAll('.speed').forEach((o) => o.classList.toggle('active', o === b));
  });
});
document.querySelector('.speed').classList.add('active');

// Cada experimento deja los valores a la vista y lanza.
document.querySelectorAll('.preset').forEach((b) => {
  b.addEventListener('click', () => {
    $('inV').value = b.dataset.v;
    $('inH').value = b.dataset.h;
    $('inA').value = b.dataset.a;
    sincronizar();
    preparar(true);
  });
});

sincronizar();
preparar(false);
