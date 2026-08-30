// Panel derecho: números en vivo + las fórmulas con sus valores sustituidos.
import { MU, R_PLANET, derived } from './physics.js';

const $ = (id) => document.getElementById(id);
const n = (x, d = 3) => x.toFixed(d);

export function renderPanel(state, tiempo, estado) {
  const m = derived(state);
  const theta = (m.theta + 360) % 360;
  const vx = state.vx, vy = state.vy;

  $('outT').textContent = n(tiempo, 1);
  $('outStatus').textContent = estado;

  $('vars').innerHTML = [
    ['x', `${n(state.x)} km`],
    ['y', `${n(state.y)} km`],
    ['r', `${n(m.r)} km`],
    ['h', `${n(m.h)} km`],
    ['v', `${n(m.v, 4)} km/s`],
    ['a', `${m.a.toFixed(6)} km/s²  (${n(m.a * 1000, 3)} m/s²)`],
    ['Vx', `${n(vx, 4)} km/s`],
    ['Vy', `${n(vy, 4)} km/s`],
    ['θ', `${n(theta, 1)}°`],
    ['energía', `${n(m.energia, 3)} km²/s²  (${m.energia < 0 ? 'órbita ligada' : 'trayectoria de escape'})`],
  ].map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('');

  $('fGrav').innerHTML =
`a = μ / r²
a = ${MU} / ${n(m.r)}²
a ≈ <span class="hl">${m.a.toFixed(6)} km/s²</span>
  ≈ <span class="hl">${n(m.a * 1000, 3)} m/s²</span>

r = R + h = ${R_PLANET} + ${n(m.h)} = ${n(m.r)} km`;

  $('fVorb').innerHTML =
`v = √(μ / r)
v = √(${MU} / ${n(m.r)})
v ≈ <span class="hl">${n(m.vCirc, 4)} km/s</span>

velocidad actual: <span class="hl">${n(m.v, 4)} km/s</span>  →  ${comparar(m.v, m.vCirc, m.vEsc)}`;

  $('fVesc').innerHTML =
`v_esc = √(2μ / r)
v_esc = √(2 · ${MU} / ${n(m.r)})
v_esc ≈ <span class="hl">${n(m.vEsc, 4)} km/s</span>`;

  $('fTri').innerHTML =
`   Vy
   ↑
   |
   |\\
   |  \\  V
   |    \\
   | θ    \\
   +--------→
       Vx

V  = ${n(m.v, 4)} km/s      θ = ${n(theta, 1)}°
Vx = V cos(θ) = ${n(m.v, 4)} · cos(${n(theta, 1)}°) = <span class="hl">${n(vx, 4)} km/s</span>
Vy = V sin(θ) = ${n(m.v, 4)} · sin(${n(theta, 1)}°) = <span class="hl">${n(vy, 4)} km/s</span>`;
}

function comparar(v, vCirc, vEsc) {
  if (v >= vEsc) return 'escapa del planeta';
  if (Math.abs(v - vCirc) < 0.02) return 'órbita casi circular';
  return v < vCirc ? 'menor que la circular (elipse hacia adentro)'
                   : 'mayor que la circular (elipse hacia afuera)';
}
