// Panel derecho: estado físico, variables agrupadas y fórmulas con sus números.
import { MU, R_PLANET, derived, orbitalElements } from './physics.js';
import { sim, ESTADOS, estadoActual } from './sim.js';
import { $ } from './util.js';

// el 0 negativo (p. ej. una altura de -1e-9 al tocar el suelo) se muestra como 0
const n = (x, d = 3) => (Number.isFinite(x) ? (Math.abs(x) < 5e-4 ? (0).toFixed(d) : x.toFixed(d)) : '—');

export function renderPanel() {
  const s = sim.s;
  const m = derived(s);
  const el = orbitalElements(s);
  const theta = (m.theta + 360) % 360;
  const clave = estadoActual();
  const e = ESTADOS[clave];

  // --- estado (lo primero que se lee)
  const chip = $('estado');
  chip.textContent = `${e.chip}  ${e.texto}`;
  chip.style.color = e.color;
  chip.style.borderColor = e.color + '66';
  $('outT').textContent = n(sim.t, 1);

  $('detalleEstado').textContent =
    clave === 'impacto' ? `la nave tocó la superficie a ${n(sim.impacto.v, 3)} km/s`
    : clave === 'circular' ? `e = ${n(el.e, 4)} · la distancia casi no cambia`
    : clave === 'eliptica' ? `e = ${n(el.e, 3)} · entre ${Math.round(el.rPeri - R_PLANET)} y ${Math.round(el.rApo - R_PLANET)} km de altura`
    : clave === 'escape' || clave === 'escapado' ? `e = ${n(el.e, 3)} ≥ 1 · energía positiva, no vuelve`
    : 'elegí velocidad, altura y ángulo, y pulsá LANZAR';

  // --- variables por grupos
  $('gPos').innerHTML = filas([
    ['x', `${n(s.x)} km`], ['y', `${n(s.y)} km`],
    ['r', `${n(m.r)} km`], ['altura', `${n(m.h)} km`],
  ]);
  $('gVel').innerHTML = filas([
    ['vx', `${n(s.vx, 4)} km/s`], ['vy', `${n(s.vy, 4)} km/s`],
    ['|v|', `${n(m.v, 4)} km/s`], ['θ', `${n(theta, 1)}°`],
  ]);
  $('gGrav').innerHTML = filas([
    ['a', `${m.a.toFixed(6)} km/s²`], ['', `${n(m.a * 1000, 3)} m/s²`],
  ]);
  $('gEner').innerHTML = filas([
    ['E', `${n(m.energia, 3)} km²/s²`],
    ['', m.energia < 0 ? 'E < 0 → órbita ligada' : 'E ≥ 0 → escapa'],
  ]);

  // --- fórmulas con los valores sustituidos
  $('fGrav').innerHTML =
`a = μ / r²
a = ${MU} / ${n(m.r)}²
a ≈ <span class="hl">${m.a.toFixed(6)} km/s²</span>  ≈  <span class="hl">${n(m.a * 1000, 3)} m/s²</span>`;

  $('fVorb').innerHTML =
`v = √(μ / r)
v = √(${MU} / ${n(m.r)})
v ≈ <span class="hl">${n(m.vCirc, 4)} km/s</span>   (circular a esta altura)

v_esc = √(2μ / r) ≈ <span class="hl">${n(m.vEsc, 4)} km/s</span>
velocidad actual: <span class="hl">${n(m.v, 4)} km/s</span> → ${comparar(m.v, m.vCirc, m.vEsc)}`;

  $('fEner').innerHTML =
`E = v² / 2 − μ / r
E = ${n(m.v, 4)}² / 2 − ${MU} / ${n(m.r)}
E ≈ <span class="hl">${n(m.energia, 3)} km²/s²</span>`;

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
Vx = V cos(θ) = ${n(m.v, 4)} · cos(${n(theta, 1)}°) = <span class="hl">${n(s.vx, 4)} km/s</span>
Vy = V sin(θ) = ${n(m.v, 4)} · sin(${n(theta, 1)}°) = <span class="hl">${n(s.vy, 4)} km/s</span>`;

  renderPaso();
}

// Modo paso a paso: qué había antes del paso y qué hay después.
function renderPaso() {
  const caja = $('paso');
  if (!sim.paso) { caja.innerHTML = '<p class="nota">Pausá la simulación y pulsá PASO: acá vas a ver qué cambió en ese intervalo.</p>'; return; }
  const { antes, despues, dt } = sim.paso;
  const fila = (etq, a, b, u, d = 4) =>
    `<tr><td>${etq}</td><td>${n(a, d)}</td><td>→</td><td class="hl">${n(b, d)}</td><td>${u}</td>
     <td class="delta">${(b - a >= 0 ? '+' : '') + n(b - a, d)}</td></tr>`;
  caja.innerHTML =
    `<p class="nota">Un paso de <b>${dt} s</b>: la computadora usó la aceleración para corregir la velocidad, y la velocidad para mover la posición.</p>
     <table class="paso">
       <tr><th></th><th>antes</th><th></th><th>después</th><th></th><th>Δ</th></tr>
       ${fila('x', antes.x, despues.x, 'km', 2)}
       ${fila('y', antes.y, despues.y, 'km', 2)}
       ${fila('vx', antes.vx, despues.vx, 'km/s')}
       ${fila('vy', antes.vy, despues.vy, 'km/s')}
       ${fila('r', antes.r, despues.r, 'km', 2)}
       ${fila('|v|', antes.v, despues.v, 'km/s')}
       ${fila('a', antes.a * 1000, despues.a * 1000, 'm/s²', 4)}
     </table>`;
}

function filas(pares) {
  return pares.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('');
}

function comparar(v, vCirc, vEsc) {
  if (v >= vEsc) return 'supera la de escape';
  if (Math.abs(v - vCirc) < 0.02) return 'casi exactamente la circular';
  return v < vCirc ? 'menor que la circular (cae hacia adentro)' : 'mayor que la circular (se estira hacia afuera)';
}

// --- cartel de impacto sobre la escena
export function mostrarImpacto() {
  const i = sim.impacto;
  $('impactoDatos').innerHTML =
    `<div><span>tiempo de vuelo</span><b>${n(i.t, 1)} s</b></div>
     <div><span>velocidad de impacto</span><b>${n(i.v, 3)} km/s</b></div>
     <div><span>altura</span><b>${n(i.altura, 1)} km</b></div>`;
  $('overlay').hidden = false;
}

export function ocultarImpacto() { $('overlay').hidden = true; }
