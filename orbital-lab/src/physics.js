// Modelo simple de dos cuerpos: planeta fijo en el origen + nave puntual.
// Unidades: kilómetros y segundos.

export const MU = 398600;   // km^3/s^2  (parámetro gravitacional de la Tierra)
export const R_PLANET = 6371; // km      (radio de la Tierra)

// Aceleración newtoniana:  a = -mu / r^3 * r_vector
export function accel(x, y) {
  const r = Math.hypot(x, y);
  const k = -MU / (r * r * r);
  return { ax: k * x, ay: k * y };
}

// Un paso de Runge-Kutta 4 sobre el estado {x, y, vx, vy}.
export function step(s, h) {
  const d = (st) => {
    const { ax, ay } = accel(st.x, st.y);
    return { x: st.vx, y: st.vy, vx: ax, vy: ay };
  };
  const add = (st, k, f) => ({
    x: st.x + k.x * f, y: st.y + k.y * f,
    vx: st.vx + k.vx * f, vy: st.vy + k.vy * f,
  });

  const k1 = d(s);
  const k2 = d(add(s, k1, h / 2));
  const k3 = d(add(s, k2, h / 2));
  const k4 = d(add(s, k3, h));

  return {
    x:  s.x  + (h / 6) * (k1.x  + 2 * k2.x  + 2 * k3.x  + k4.x),
    y:  s.y  + (h / 6) * (k1.y  + 2 * k2.y  + 2 * k3.y  + k4.y),
    vx: s.vx + (h / 6) * (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx),
    vy: s.vy + (h / 6) * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy),
  };
}

// Estado inicial: la nave arranca a la derecha del planeta, a la altura pedida,
// con velocidad v0 formando un ángulo theta (grados) con el eje X.
export function initialState(v0, altura, anguloGrados) {
  const r = R_PLANET + altura;
  const th = (anguloGrados * Math.PI) / 180;
  return { x: r, y: 0, vx: v0 * Math.cos(th), vy: v0 * Math.sin(th) };
}

// Magnitudes derivadas que se muestran en el panel de la derecha.
export function derived(s) {
  const r = Math.hypot(s.x, s.y);
  const v = Math.hypot(s.vx, s.vy);
  return {
    r,
    v,
    h: r - R_PLANET,             // altura sobre la superficie
    a: MU / (r * r),             // aceleración gravitacional (km/s^2)
    vCirc: Math.sqrt(MU / r),    // velocidad de órbita circular a esa r
    vEsc: Math.sqrt(2 * MU / r), // velocidad de escape a esa r
    energia: (v * v) / 2 - MU / r, // energía específica: <0 ligado, >0 escapa
    theta: (Math.atan2(s.vy, s.vx) * 180) / Math.PI, // dirección de la velocidad
  };
}
