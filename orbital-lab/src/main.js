// Arranque de la aplicación: crea el juego de Phaser y conecta los controles.
import Phaser from 'phaser';
import { Lab, vista } from './scene.js';
import { sim, reiniciar, limpiarTraza, darPaso, ritmoParaUnaOrbita } from './sim.js';
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

// Ver una vuelta completa en unos 8 segundos: sólo cambia el ritmo de
// reproducción, la física es exactamente la misma.
$('btnOrbita').addEventListener('click', () => {
  if (sim.fase === 'listo' || sim.fase === 'impacto') preparar(true);
  const r = ritmoParaUnaOrbita(8);
  if (!r) { avisar('Esta trayectoria no es cerrada: no hay una órbita que completar.'); return; }
  ponerRitmo(redondearRitmo(r.ritmo));
  limpiarTraza();
  sim.corriendo = true;
  $('btnPause').textContent = 'PAUSA';
  avisar(`Una vuelta dura ${Math.round(r.periodo)} s (${(r.periodo / 60).toFixed(0)} min). Reproduciendo a ×${sim.velocidadTiempo}.`);
});

// se usa el ×N disponible más cercano, para que el botón de velocidad coincida
function redondearRitmo(ritmo) {
  const opciones = [...document.querySelectorAll('.speed')].map((b) => parseFloat(b.dataset.speed));
  return opciones.reduce((a, b) => (Math.abs(b - ritmo) < Math.abs(a - ritmo) ? b : a));
}

function ponerRitmo(valor) {
  sim.velocidadTiempo = valor;
  document.querySelectorAll('.speed').forEach((b) =>
    b.classList.toggle('active', parseFloat(b.dataset.speed) === valor));
}

let avisoId;
function avisar(texto) {
  const a = $('aviso');
  a.textContent = texto;
  a.classList.add('visible');
  clearTimeout(avisoId);
  avisoId = setTimeout(() => a.classList.remove('visible'), 4500);
}

document.querySelectorAll('.speed').forEach((b) => {
  b.addEventListener('click', () => ponerRitmo(parseFloat(b.dataset.speed)));
});
ponerRitmo(1);

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
