// Panel derecho: qué está pasando, las variables y las fórmulas paso a paso.
import { MU, R_PLANET, derived, orbitalElements } from './physics.js';
import { sim, ESTADOS, estadoActual } from './sim.js';
import { $ } from './util.js';

// el 0 negativo (p. ej. una altura de -1e-9 al tocar el suelo) se muestra como 0
const n = (x, d = 3) => (Number.isFinite(x) ? (Math.abs(x) < 5e-4 ? (0).toFixed(d) : x.toFixed(d)) : '—');

// Una o dos frases sobre lo que la nave está haciendo ahora mismo.
const RELATO = {
  listo:    'Elegí velocidad, altura y ángulo. La flecha verde punteada muestra hacia dónde saldría la nave.',
  cuenta:   'Motores encendidos. En un instante la nave queda sola con su velocidad y con la gravedad.',
  circular: 'Tu nave tiene suficiente velocidad lateral para que, mientras cae hacia la Tierra, la superficie se curve alejándose de ella. Cae siempre, pero nunca llega.',
  eliptica: 'La energía orbital es distinta a la de la órbita circular: la nave se acerca y se aleja de la Tierra. Va más rápido cerca y más lento lejos.',
  escape:   'La energía orbital es suficiente para que la trayectoria no quede ligada a la Tierra: la gravedad la frena, pero nunca llega a detenerla.',
  escapado: 'La nave ya está lejos y sigue alejándose. La gravedad se debilita con el cuadrado de la distancia, así que nunca la traerá de vuelta.',
  impacto:  'La velocidad inicial no fue suficiente para mantener una trayectoria que evite la superficie terrestre.',
};

export function renderPanel() {
  const s = sim.s;
  const m = derived(s);
  const el = orbitalElements(s);
  const theta = (m.theta + 360) % 360;
  const clave = estadoActual();
  const e = ESTADOS[clave];

  // --- ¿qué está pasando?
  const chip = $('estado');
  chip.textContent = `${e.chip}  ${e.texto}`;
  chip.style.color = e.color;
  chip.style.borderColor = e.color + '66';
  $('relato').textContent = RELATO[clave];
  $('outT').textContent = n(sim.t, 1);
  $('outRitmo').textContent = '×' + sim.velocidadTiempo;

  // --- coordenadas
  $('gPos').innerHTML = filas([
    ['x', `${n(s.x)} km`],
    ['y', `${n(s.y)} km`],
    ['z', '0 km', 'z'],
  ]);
  $('fPos').innerHTML = bloque(
    'r = √(x² + y²)',
    `r = √(${n(s.x, 1)}² + ${n(s.y, 1)}²)`,
    `r = ${n(m.r)} km`,
    `altura = r − R = ${n(m.r)} − ${R_PLANET} = ${n(m.h)} km`);

  // --- velocidad
  $('gVel').innerHTML = filas([
    ['vx', `${n(s.vx, 4)} km/s`],
    ['vy', `${n(s.vy, 4)} km/s`],
    ['vz', '0 km/s', 'z'],
  ]);
  $('fVel').innerHTML = bloque(
    '|v| = √(vx² + vy²)',
    `|v| = √(${n(s.vx, 3)}² + ${n(s.vy, 3)}²)`,
    `|v| = ${n(m.v, 4)} km/s`);

  // --- gravedad
  $('fGrav').innerHTML = bloque(
    'a = μ / r²',
    `a = ${MU} / ${n(m.r)}²`,
    `a = ${m.a.toFixed(6)} km/s²`,
    `a = ${n(m.a * 1000, 3)} m/s²`);

  // --- velocidad orbital circular y de escape
  $('fVorb').innerHTML = bloque(
    'v = √(μ / r)',
    `v = √(${MU} / ${n(m.r)})`,
    `v = ${n(m.vCirc, 4)} km/s`,
    `la nave va a ${n(m.v, 4)} km/s → ${comparar(m.v, m.vCirc, m.vEsc)}`);

  $('fVesc').innerHTML = bloque(
    'v_esc = √(2μ / r)',
    `v_esc = √(2 · ${MU} / ${n(m.r)})`,
    `v_esc = ${n(m.vEsc, 4)} km/s`);

  $('fEner').innerHTML = bloque(
    'E = v² / 2 − μ / r',
    `E = ${n(m.v, 4)}² / 2 − ${MU} / ${n(m.r)}`,
    `E = ${n(m.energia, 3)} km²/s²`,
    m.energia < 0 ? 'E < 0 → la órbita es cerrada' : 'E ≥ 0 → la trayectoria es abierta: escapa');

  // --- seno y coseno, dibujados con la velocidad real de la nave
  $('triangulo').innerHTML = triangulo(m.v, theta, s.vx, s.vy);
  $('fTri').innerHTML = bloque(
    'Vx = V cos(θ)   ·   Vy = V sin(θ)',
    `Vx = ${n(m.v, 3)} · cos(${n(theta, 1)}°)     Vy = ${n(m.v, 3)} · sin(${n(theta, 1)}°)`,
    `Vx = ${n(s.vx, 4)} km/s     Vy = ${n(s.vy, 4)} km/s`,
    'θ se mide desde el eje X, girando hacia el eje Y');

  renderPaso();
}

// Bloque de fórmula en cuatro renglones: fórmula, sustitución, resultado y una
// lectura en otras unidades o una conclusión.
function bloque(formula, sustitucion, resultado, extra) {
  return `<div class="paso-formula"><span class="etq-paso">fórmula</span><code>${formula}</code></div>
<div class="paso-formula"><span class="etq-paso">sustitución</span><code>${sustitucion}</code></div>
<div class="paso-formula"><span class="etq-paso">resultado</span><code class="hl">${resultado}</code></div>` +
  (extra ? `<div class="paso-formula"><span class="etq-paso"></span><code class="extra">${extra}</code></div>` : '');
}

// Triángulo rectángulo de la velocidad: cateto Vx, cateto Vy, hipotenusa V.
// El origen va en el centro para que los cuatro cuadrantes se vean igual de bien.
function triangulo(v, theta, vx, vy) {
  const W = 280, H = 170, ox = W / 2, oy = H / 2, L = 58;
  const rad = (theta * Math.PI) / 180;
  const ex = ox + Math.cos(rad) * L;   // punta de V
  const ey = oy - Math.sin(rad) * L;   // en pantalla el eje Y crece hacia abajo
  const largo = theta > 180 ? 1 : 0;   // arco mayor cuando pasa media vuelta
  const arcoX = ox + Math.cos(rad) * 20, arcoY = oy - Math.sin(rad) * 20;
  const derecha = Math.cos(rad) >= 0, arriba = Math.sin(rad) >= 0;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img"
    aria-label="Triángulo de la velocidad: Vx ${vx.toFixed(2)}, Vy ${vy.toFixed(2)}, ángulo ${theta.toFixed(0)} grados">
    <line x1="8" y1="${oy}" x2="${W - 8}" y2="${oy}" stroke="#2f3b4c"/>
    <line x1="${ox}" y1="8" x2="${ox}" y2="${H - 8}" stroke="#2f3b4c"/>
    <text x="${W - 14}" y="${oy - 6}" fill="#5b6b7f" font-size="10">X</text>
    <text x="${ox + 6}" y="14" fill="#5b6b7f" font-size="10">Y</text>

    <path d="M ${ox + 20} ${oy} A 20 20 0 ${largo} 0 ${arcoX} ${arcoY}"
          fill="none" stroke="#ffd479" stroke-width="1.5"/>
    <text x="${ox + Math.cos(rad / 2) * 34}" y="${oy - Math.sin(rad / 2) * 34 + 4}" fill="#ffd479"
          font-size="11" text-anchor="middle">θ ${theta.toFixed(0)}°</text>

    <line x1="${ox}" y1="${oy}" x2="${ex}" y2="${oy}" stroke="#6fd3ff" stroke-width="2.5"/>
    <line x1="${ex}" y1="${oy}" x2="${ex}" y2="${ey}" stroke="#4ade80" stroke-width="2.5" stroke-dasharray="4 3"/>
    <line x1="${ox}" y1="${oy}" x2="${ex}" y2="${ey}" stroke="#ffffff" stroke-width="2.5"/>
    <circle cx="${ex}" cy="${ey}" r="4" fill="#ffffff"/>

    <text x="${(ox + ex) / 2}" y="${oy + (arriba ? 15 : -7)}" fill="#6fd3ff" font-size="11"
          text-anchor="middle">Vx ${vx.toFixed(2)}</text>
    <text x="${ex + (derecha ? 8 : -8)}" y="${(oy + ey) / 2 + 4}" fill="#4ade80" font-size="11"
          text-anchor="${derecha ? 'start' : 'end'}">Vy ${vy.toFixed(2)}</text>
    <text x="${ox + Math.cos(rad) * (L + 16)}" y="${oy - Math.sin(rad) * (L + 16) + 4}" fill="#ffffff"
          font-size="11" text-anchor="middle">V ${v.toFixed(2)}</text>
  </svg>`;
}

// Modo paso a paso: qué había antes del paso y qué hay después.
function renderPaso() {
  const caja = $('paso');
  if (!sim.paso) {
    caja.innerHTML = '<p class="nota">Pausá la simulación y pulsá PASO: acá vas a ver qué cambió en ese intervalo.</p>';
    return;
  }
  const { antes, despues, dt } = sim.paso;
  const fila = (etq, a, b, u, d = 4) =>
    `<tr><td>${etq}</td><td>${n(a, d)}</td><td>→</td><td class="hl">${n(b, d)}</td><td>${u}</td>
     <td class="delta">${(b - a >= 0 ? '+' : '') + n(b - a, d)}</td></tr>`;
  caja.innerHTML =
    `<p class="nota">Un paso de <b>${dt} s</b>: con la aceleración se corrige la velocidad, y con la velocidad se mueve la posición.</p>
     <table class="paso">
       <tr><th></th><th>antes</th><th></th><th>después</th><th></th><th>Δ</th></tr>
       ${fila('x', antes.x, despues.x, 'km', 2)}
       ${fila('y', antes.y, despues.y, 'km', 2)}
       ${fila('r', antes.r, despues.r, 'km', 2)}
       ${fila('vx', antes.vx, despues.vx, 'km/s')}
       ${fila('vy', antes.vy, despues.vy, 'km/s')}
       ${fila('|v|', antes.v, despues.v, 'km/s')}
       ${fila('a', antes.a * 1000, despues.a * 1000, 'm/s²', 4)}
     </table>`;
}

function filas(pares) {
  return pares.map(([k, v, clase]) =>
    `<div class="k">${k}</div><div class="v ${clase || ''}">${v}</div>`).join('');
}

function comparar(v, vCirc, vEsc) {
  if (v >= vEsc) return 'supera la de escape';
  if (Math.abs(v - vCirc) < 0.02) return 'casi exactamente la circular';
  return v < vCirc ? 'menos que la circular: cae hacia adentro' : 'más que la circular: se estira hacia afuera';
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
