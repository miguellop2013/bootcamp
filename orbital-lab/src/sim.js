// Estado de la simulación y avance temporal.
// Todo lo visual (scene.js) lee de aquí; nada de aquí depende de Phaser.
import { R_PLANET, step, initialState, derived, orbitalElements, clasificar } from './physics.js';

export const sim = {
  s: initialState(7.67, 400, 90),
  t: 0,
  corriendo: false,
  velocidadTiempo: 1,
  fase: 'listo',      // listo | cuenta | vuelo | impacto
  cuenta: 0,          // segundos que faltan de la cuenta regresiva
  motor: 0,           // segundos de llama del motor que quedan
  traza: [],
  eventos: [],        // la escena los consume: 'lanzar', 'impacto'
  impacto: null,      // { t, v, altura }
  paso: null,         // { antes, despues } del modo paso a paso
  r0: R_PLANET + 400, // radio inicial, referencia para decidir "ya escapó"
  escape: false,      // ya se alejó lo suficiente como para cantar ESCAPE
};

// Etiquetas de estado que comparten la escena y el panel.
export const ESTADOS = {
  listo:    { chip: '⚪', texto: 'LISTA PARA LANZAR', color: '#8b98a8' },
  cuenta:   { chip: '⚪', texto: 'CUENTA REGRESIVA',  color: '#ffd479' },
  circular: { chip: '🟢', texto: 'ÓRBITA CIRCULAR',   color: '#4ade80' },
  eliptica: { chip: '🟡', texto: 'ÓRBITA ELÍPTICA',   color: '#ffd479' },
  escape:   { chip: '🔵', texto: 'TRAYECTORIA DE ESCAPE', color: '#6fd3ff' },
  escapado: { chip: '🔵', texto: 'ESCAPE',            color: '#6fd3ff' },
  impacto:  { chip: '🔴', texto: 'IMPACTO CON LA TIERRA', color: '#ff7a7a' },
};

export function estadoActual() {
  if (sim.fase === 'impacto') return 'impacto';
  if (sim.fase === 'listo') return 'listo';
  if (sim.fase === 'cuenta') return 'cuenta';
  const clase = clasificar(sim.s);
  if (clase === 'escape') return sim.escape ? 'escapado' : 'escape';
  return clase;
}

export function reiniciar({ v0, altura, angulo }, lanzar) {
  sim.s = initialState(v0, altura, angulo);
  sim.t = 0;
  sim.r0 = R_PLANET + altura;
  sim.traza = [{ x: sim.s.x, y: sim.s.y }];
  sim.impacto = null;
  sim.paso = null;
  sim.escape = false;
  sim.motor = 0;
  if (lanzar) {
    sim.fase = 'cuenta';
    sim.cuenta = 3;     // "3 · 2 · 1 · 🚀"
    sim.corriendo = false;
  } else {
    sim.fase = 'listo';
    sim.cuenta = 0;
    sim.corriendo = false;
  }
}

export function limpiarTraza() {
  sim.traza = [{ x: sim.s.x, y: sim.s.y }];
}

// Avanza la cuenta regresiva con el tiempo real del navegador.
export function avanzarCuenta(dtReal) {
  if (sim.fase !== 'cuenta') return;
  sim.cuenta -= dtReal;
  if (sim.cuenta <= 0) {
    sim.fase = 'vuelo';
    sim.corriendo = true;
    sim.motor = 1.5; // la llama del motor se ve un momento tras el despegue
    sim.eventos.push('lanzar');
  }
}

// Avanza la física dtSim segundos, en pasos pequeños para no perder precisión.
export function avanzar(dtSim) {
  if (sim.fase === 'impacto') return;
  const hMax = 2;
  let restante = Math.min(dtSim, 600);

  while (restante > 0) {
    const h = Math.min(hMax, restante);
    const previo = sim.s;
    sim.s = step(sim.s, h);
    sim.t += h;
    restante -= h;

    if (Math.hypot(sim.s.x, sim.s.y) <= R_PLANET) { registrarImpacto(previo, h); break; }
    apuntarTraza();
  }
  apuntarTraza();

  const r = Math.hypot(sim.s.x, sim.s.y);
  if (!sim.escape && r > Math.max(4 * sim.r0, 30000) && orbitalElements(sim.s).e >= 1) {
    sim.escape = true; // se aleja de verdad: ya podemos cantar ESCAPE, sin detenerla
  }
}

// El paso que cruza la superficie se afina por bisección para que el impacto
// quede justo sobre el suelo y la velocidad de impacto sea la real.
function registrarImpacto(previo, h) {
  let bajo = 0, alto = h;
  for (let i = 0; i < 40; i++) {
    const medio = (bajo + alto) / 2;
    const p = step(previo, medio);
    if (Math.hypot(p.x, p.y) > R_PLANET) bajo = medio; else alto = medio;
  }
  sim.s = step(previo, alto);
  sim.t += alto - h;
  const m = derived(sim.s);
  sim.impacto = { t: sim.t, v: m.v, altura: Math.max(0, m.h) };
  sim.fase = 'impacto';
  sim.corriendo = false;
  sim.motor = 0;
  apuntarTraza(true);
  sim.eventos.push('impacto');
}

function apuntarTraza(forzar) {
  const ult = sim.traza[sim.traza.length - 1];
  if (forzar || !ult || Math.hypot(sim.s.x - ult.x, sim.s.y - ult.y) > 15) {
    sim.traza.push({ x: sim.s.x, y: sim.s.y });
    if (sim.traza.length > 6000) sim.traza.shift();
  }
}

// Una foto del estado, para comparar ANTES y DESPUÉS en el modo paso a paso.
export function foto() {
  const m = derived(sim.s);
  return { t: sim.t, x: sim.s.x, y: sim.s.y, vx: sim.s.vx, vy: sim.s.vy, r: m.r, v: m.v, a: m.a, h: m.h };
}

export function darPaso(dt = 10) {
  if (sim.fase === 'impacto') return;
  if (sim.fase === 'cuenta') { sim.fase = 'vuelo'; }
  const antes = foto();
  sim.corriendo = false;
  avanzar(dt);
  sim.paso = { antes, despues: foto(), dt };
}
