// Laboratorio de mecánica orbital: Phaser 3 sólo dibuja;
// la posición y la velocidad se integran a mano en physics.js.
import Phaser from 'phaser';
import { MU, R_PLANET, accel, step, initialState, derived } from './physics.js';
import { renderPanel } from './panel.js';

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- estado
const sim = {
  s: initialState(7.67, 400, 90),
  t: 0,
  corriendo: false,
  velocidadTiempo: 1,
  estado: 'en pausa',
  traza: [],
  escala: 0.01, // px por km (se ajusta solo)
};

function leerControles() {
  return {
    v0: parseFloat($('inV').value),
    h: parseFloat($('inH').value),
    ang: parseFloat($('inA').value),
  };
}

function reiniciar(lanzar) {
  const c = leerControles();
  sim.s = initialState(c.v0, c.h, c.ang);
  sim.t = 0;
  sim.traza = [{ x: sim.s.x, y: sim.s.y }];
  sim.corriendo = !!lanzar;
  sim.estado = lanzar ? 'en vuelo' : 'en pausa';
  $('btnPause').textContent = 'PAUSA';
}

// Avanza la física dtSim segundos, en pasos pequeños para no perder precisión.
function avanzar(dtSim) {
  const hMax = 2; // segundos por paso de integración
  let restante = Math.min(dtSim, 400);
  while (restante > 0) {
    const h = Math.min(hMax, restante);
    sim.s = step(sim.s, h);
    sim.t += h;
    restante -= h;

    const r = Math.hypot(sim.s.x, sim.s.y);
    if (r <= R_PLANET) { sim.corriendo = false; sim.estado = 'IMPACTO contra el planeta'; break; }
    if (r > 400000) { sim.corriendo = false; sim.estado = 'ESCAPÓ del planeta'; break; }
    if (sim.corriendo) {
      const e = derived(sim.s).energia;
      sim.estado = e > 0 ? 'en vuelo (trayectoria de escape)' : 'en vuelo (órbita ligada)';
    }
  }
  const ult = sim.traza[sim.traza.length - 1];
  if (!ult || Math.hypot(sim.s.x - ult.x, sim.s.y - ult.y) > 20) {
    sim.traza.push({ x: sim.s.x, y: sim.s.y });
    if (sim.traza.length > 4000) sim.traza.shift();
  }
}

// ---------------------------------------------------------------- escena
class Lab extends Phaser.Scene {
  create() {
    this.g = this.add.graphics();
    this.etiquetas = [
      this.add.text(0, 0, 'X', { color: '#5b6b7f', fontSize: '12px' }),
      this.add.text(0, 0, 'Y', { color: '#5b6b7f', fontSize: '12px' }),
      this.add.text(0, 0, 'V', { color: '#4ade80', fontSize: '12px' }),
      this.add.text(0, 0, 'g', { color: '#ff7a7a', fontSize: '12px' }),
    ];
  }

  update(_, deltaMs) {
    if (sim.corriendo) avanzar((deltaMs / 1000) * sim.velocidadTiempo);
    this.dibujar();
    renderPanel(sim.s, sim.t, sim.estado);
  }

  dibujar() {
    const w = this.scale.width, h = this.scale.height;
    const cx = w / 2, cy = h / 2;
    const r = Math.hypot(sim.s.x, sim.s.y);

    // zoom automático suave: que quepan el planeta y la nave
    const objetivo = (Math.min(w, h) / 2) * 0.85 / Math.max(r * 1.1, R_PLANET * 1.5);
    sim.escala += (objetivo - sim.escala) * 0.05;
    const k = sim.escala;
    const px = (x) => cx + x * k;
    const py = (y) => cy - y * k;

    const g = this.g;
    g.clear();

    // ejes X / Y
    if ($('ckAxes').checked) {
      g.lineStyle(1, 0x3a4757, 1);
      g.beginPath(); g.moveTo(0, cy); g.lineTo(w, cy); g.strokePath();
      g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, h); g.strokePath();
      this.pon(0, w - 16, cy - 16);
      this.pon(1, cx + 8, 8);
    } else { this.pon(0, -50, -50); this.pon(1, -50, -50); }

    // planeta
    g.fillStyle(0x1b4a7a, 1);
    g.fillCircle(cx, cy, R_PLANET * k);
    g.lineStyle(1, 0x6fd3ff, 0.9);
    g.strokeCircle(cx, cy, R_PLANET * k);

    // trayectoria
    if (sim.traza.length > 1) {
      g.lineStyle(1, 0xffd479, 0.9);
      g.beginPath();
      g.moveTo(px(sim.traza[0].x), py(sim.traza[0].y));
      for (const p of sim.traza) g.lineTo(px(p.x), py(p.y));
      g.strokePath();
    }

    // nave
    const nx = px(sim.s.x), ny = py(sim.s.y);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(nx, ny, 4);

    // vector velocidad (verde) — hacia donde se mueve
    const v = Math.hypot(sim.s.vx, sim.s.vy);
    if ($('ckVel').checked && v > 0) {
      const L = Phaser.Math.Clamp(v * 10, 25, 140);
      const ex = nx + (sim.s.vx / v) * L, ey = ny - (sim.s.vy / v) * L;
      this.flecha(g, nx, ny, ex, ey, 0x4ade80);
      this.pon(2, ex + 6, ey - 6);
    } else this.pon(2, -50, -50);

    // vector gravedad (rojo) — siempre hacia el centro del planeta
    const { ax, ay } = accel(sim.s.x, sim.s.y);
    const a = Math.hypot(ax, ay);
    if ($('ckGrav').checked && a > 0) {
      const L = Phaser.Math.Clamp(a * 6000, 25, 120);
      const ex = nx + (ax / a) * L, ey = ny - (ay / a) * L;
      this.flecha(g, nx, ny, ex, ey, 0xff7a7a);
      this.pon(3, ex + 6, ey - 6);
    } else this.pon(3, -50, -50);
  }

  pon(i, x, y) { this.etiquetas[i].setPosition(x, y); }

  flecha(g, x1, y1, x2, y2, color) {
    g.lineStyle(2, color, 1);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const p = 9;
    g.beginPath();
    g.moveTo(x2, y2);
    g.lineTo(x2 - p * Math.cos(ang - 0.4), y2 - p * Math.sin(ang - 0.4));
    g.lineTo(x2 - p * Math.cos(ang + 0.4), y2 - p * Math.sin(ang + 0.4));
    g.closePath();
    g.fillStyle(color, 1);
    g.fillPath();
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0d1117',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: Lab,
});

// ---------------------------------------------------------------- controles
function sincronizarEtiquetas() {
  $('outV').textContent = parseFloat($('inV').value).toFixed(2);
  $('outH').textContent = $('inH').value;
  $('outA').textContent = $('inA').value;
}

for (const id of ['inV', 'inH', 'inA']) {
  $(id).addEventListener('input', () => { sincronizarEtiquetas(); reiniciar(false); });
}

$('btnLaunch').addEventListener('click', () => reiniciar(true));
$('btnReset').addEventListener('click', () => reiniciar(false));
$('btnPause').addEventListener('click', () => {
  sim.corriendo = !sim.corriendo;
  $('btnPause').textContent = sim.corriendo ? 'PAUSA' : 'CONTINUAR';
  sim.estado = sim.corriendo ? 'en vuelo' : 'en pausa';
});
$('btnStep').addEventListener('click', () => {
  sim.corriendo = false;
  $('btnPause').textContent = 'CONTINUAR';
  avanzar(10); // un intervalito fijo para ver cambiar los números
  sim.estado = 'paso de 10 s';
});

document.querySelectorAll('.speed').forEach((b) => {
  b.addEventListener('click', () => {
    sim.velocidadTiempo = parseFloat(b.dataset.speed);
    document.querySelectorAll('.speed').forEach((o) => o.classList.toggle('active', o === b));
  });
});
document.querySelector('.speed').classList.add('active');

document.querySelectorAll('.preset').forEach((b) => {
  b.addEventListener('click', () => {
    $('inV').value = b.dataset.v;
    $('inH').value = b.dataset.h;
    $('inA').value = b.dataset.a;
    sincronizarEtiquetas();
    reiniciar(true);
  });
});

sincronizarEtiquetas();
reiniciar(false);
