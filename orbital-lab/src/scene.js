// Escena de Phaser: dibuja el espacio, la Tierra, la nave y la trayectoria.
// Aquí no hay física: todo lo que se ve sale de la posición que calcula sim.js.
import Phaser from 'phaser';
import { R_PLANET, accel, derived, orbitalElements } from './physics.js';
import { sim, ESTADOS, estadoActual, avanzar, avanzarCuenta } from './sim.js';
import { renderPanel, mostrarImpacto, ocultarImpacto } from './panel.js';
import { $ } from './util.js';


// Estado de cámara: km -> píxeles. La física siempre va en km.
export const vista = { escala: 0.01, escalaRef: 0.01, reencuadrar: true };

// ---------------------------------------------------------------- texturas
// Todo se dibuja a mano en un canvas: ninguna imagen externa que cargar.
function texturaTierra(scene) {
  const S = 512, R = 250, c = S / 2;
  const ctx = scene.textures.createCanvas('tierra', S, S).getContext();

  ctx.save();
  ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.clip();

  // océano
  const mar = ctx.createRadialGradient(c - 70, c - 80, 30, c, c, R);
  mar.addColorStop(0, '#3d9ade');
  mar.addColorStop(0.55, '#1f6bb0');
  mar.addColorStop(1, '#0e3f75');
  ctx.fillStyle = mar;
  ctx.fillRect(0, 0, S, S);

  // Continentes: manchas irregulares alrededor del polo, porque estamos
  // mirando la Tierra desde el eje de rotación (el plano de la órbita).
  // Cada una se dibuja con curvas suaves para que no parezcan polígonos.
  const continentes = [
    { ang: -1.35, rad: 0.50, w: 0.40, h: 0.30, giro: 0.3 },
    { ang: -0.75, rad: 0.72, w: 0.22, h: 0.18, giro: 0.9 },
    { ang: -0.10, rad: 0.58, w: 0.34, h: 0.26, giro: -0.4 },
    { ang:  0.55, rad: 0.75, w: 0.26, h: 0.20, giro: 0.2 },
    { ang:  1.25, rad: 0.52, w: 0.36, h: 0.28, giro: 0.7 },
    { ang:  2.05, rad: 0.70, w: 0.24, h: 0.17, giro: -0.6 },
    { ang:  2.75, rad: 0.46, w: 0.30, h: 0.24, giro: 0.1 },
    { ang: -2.35, rad: 0.66, w: 0.28, h: 0.22, giro: 0.5 },
    { ang: -1.95, rad: 0.30, w: 0.22, h: 0.18, giro: -0.2 },
  ];

  const verde = ctx.createRadialGradient(c - 60, c - 70, 20, c, c, R);
  verde.addColorStop(0, '#79b56a');
  verde.addColorStop(0.6, '#4f9150');
  verde.addColorStop(1, '#3c6f45');

  for (const t of continentes) {
    const cxx = c + Math.cos(t.ang) * R * t.rad;
    const cyy = c + Math.sin(t.ang) * R * t.rad;
    ctx.save();
    ctx.translate(cxx, cyy);
    ctx.rotate(t.giro);
    ctx.beginPath();
    // contorno ondulado: un círculo deformado con varios armónicos
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const ondas = 1 + 0.24 * Math.sin(a * 3 + t.ang * 4) + 0.14 * Math.sin(a * 5 - t.giro * 3);
      const x = Math.cos(a) * R * t.w * ondas;
      const y = Math.sin(a) * R * t.h * ondas;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = verde;
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,225,180,0.20)';  // orilla
    ctx.lineWidth = 2;
    ctx.stroke();
    // desierto en algunas
    if (t.w > 0.3) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#b9a86d';
      ctx.beginPath();
      ctx.ellipse(R * t.w * 0.18, -R * t.h * 0.18, R * t.w * 0.42, R * t.h * 0.32, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // casquete polar en el centro (miramos desde el eje de rotación)
  const hielo = ctx.createRadialGradient(c, c, 2, c, c, R * 0.20);
  hielo.addColorStop(0, 'rgba(248,252,255,0.95)');
  hielo.addColorStop(0.6, 'rgba(230,245,255,0.55)');
  hielo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hielo;
  ctx.beginPath(); ctx.arc(c, c, R * 0.20, 0, Math.PI * 2); ctx.fill();

  // nubes: espirales suaves, muy tenues
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  for (let i = 0; i < 30; i++) {
    const ang = i * 1.9;
    const rad = R * (0.18 + 0.78 * ((i * 41) % 100) / 100);
    ctx.beginPath();
    ctx.ellipse(c + Math.cos(ang) * rad, c + Math.sin(ang) * rad,
                R * 0.22, R * 0.055, ang + 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  scene.textures.get('tierra').refresh();
}

function texturaSombra(scene) {
  const S = 512, R = 250, c = S / 2;
  const ctx = scene.textures.createCanvas('sombra', S, S).getContext();
  ctx.save();
  ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.clip();

  // lado iluminado (el Sol queda arriba a la izquierda)
  const luz = ctx.createRadialGradient(c - R * 0.45, c - R * 0.45, 10, c - R * 0.3, c - R * 0.3, R * 1.5);
  luz.addColorStop(0, 'rgba(255,248,220,0.30)');
  luz.addColorStop(0.45, 'rgba(255,255,255,0.04)');
  luz.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = luz; ctx.fillRect(0, 0, S, S);

  // noche del lado opuesto
  const noche = ctx.createRadialGradient(c + R * 0.5, c + R * 0.5, R * 0.15, c + R * 0.35, c + R * 0.35, R * 1.35);
  noche.addColorStop(0, 'rgba(2,6,14,0.66)');
  noche.addColorStop(0.55, 'rgba(2,6,14,0.35)');
  noche.addColorStop(1, 'rgba(2,6,14,0)');
  ctx.fillStyle = noche; ctx.fillRect(0, 0, S, S);

  // oscurecimiento del borde, para que el disco se lea como esfera
  const borde = ctx.createRadialGradient(c, c, R * 0.72, c, c, R);
  borde.addColorStop(0, 'rgba(0,0,0,0)');
  borde.addColorStop(1, 'rgba(0,10,25,0.42)');
  ctx.fillStyle = borde; ctx.fillRect(0, 0, S, S);

  ctx.restore();
  scene.textures.get('sombra').refresh();
}

function texturaAtmosfera(scene) {
  // El disco del planeta ocupa R dentro de la textura y el halo llega a R*1.24;
  // el canvas es bastante más grande que eso, si no el degradado se corta contra
  // el borde y el blend aditivo dibuja un rectángulo en vez de un halo.
  const S = 640, c = S / 2, R = 200;
  const ctx = scene.textures.createCanvas('atmosfera', S, S).getContext();
  const halo = ctx.createRadialGradient(c, c, R * 0.90, c, c, R * 1.24);
  halo.addColorStop(0, 'rgba(110,200,255,0.00)');
  halo.addColorStop(0.35, 'rgba(110,200,255,0.42)');
  halo.addColorStop(0.7, 'rgba(70,150,255,0.16)');
  halo.addColorStop(1, 'rgba(70,150,255,0)');
  ctx.save();
  ctx.beginPath(); ctx.arc(c, c, R * 1.24, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = halo; ctx.fillRect(0, 0, S, S);
  ctx.restore();
  scene.textures.get('atmosfera').refresh();
}

// cuánto mide la textura de atmósfera respecto del diámetro del planeta
const FACTOR_ATMOSFERA = 640 / (2 * 200);

function texturaEstrellas(scene, key, cantidad, brillo) {
  const S = 512;
  const ctx = scene.textures.createCanvas(key, S, S).getContext();
  let semilla = cantidad * 7919;
  const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
  for (let i = 0; i < cantidad; i++) {
    const x = azar() * S, y = azar() * S;
    const r = 0.4 + azar() * brillo;
    const a = 0.25 + azar() * 0.75;
    ctx.fillStyle = azar() > 0.88 ? `rgba(180,215,255,${a})` : `rgba(255,255,255,${a})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  scene.textures.get(key).refresh();
}

function texturaNave(scene) {
  const ctx = scene.textures.createCanvas('nave', 64, 64).getContext();
  // apunta hacia +x; la escena la rota según la velocidad
  ctx.fillStyle = '#c9d6e4';                      // aletas
  ctx.beginPath(); ctx.moveTo(20, 24); ctx.lineTo(10, 12); ctx.lineTo(24, 22); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(20, 40); ctx.lineTo(10, 52); ctx.lineTo(24, 42); ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#5c6b7d';                      // tobera
  ctx.fillRect(8, 27, 10, 10);

  const cuerpo = ctx.createLinearGradient(0, 22, 0, 42);  // cuerpo
  cuerpo.addColorStop(0, '#ffffff');
  cuerpo.addColorStop(0.5, '#e6edf5');
  cuerpo.addColorStop(1, '#9fb0c2');
  ctx.fillStyle = cuerpo;
  ctx.beginPath();
  ctx.moveTo(16, 22); ctx.lineTo(44, 22);
  ctx.quadraticCurveTo(56, 32, 44, 42);
  ctx.lineTo(16, 42);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#ff7a7a';                      // punta
  ctx.beginPath(); ctx.moveTo(44, 22); ctx.quadraticCurveTo(60, 32, 44, 42); ctx.quadraticCurveTo(48, 32, 44, 22); ctx.fill();

  ctx.fillStyle = '#6fd3ff';                      // ventanas
  ctx.beginPath(); ctx.arc(35, 32, 4.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b6c93';
  ctx.beginPath(); ctx.arc(35, 32, 2.0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(111,211,255,0.85)';
  ctx.beginPath(); ctx.arc(25, 32, 2.6, 0, Math.PI * 2); ctx.fill();
  scene.textures.get('nave').refresh();
}

function texturaLlama(scene) {
  const S = 48, ctx = scene.textures.createCanvas('llama', S, S).getContext();
  const g = ctx.createLinearGradient(S, S / 2, 0, S / 2);
  g.addColorStop(0, 'rgba(255,240,180,0.95)');
  g.addColorStop(0.35, 'rgba(255,170,60,0.85)');
  g.addColorStop(1, 'rgba(255,80,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(S, S / 2 - 8); ctx.quadraticCurveTo(S * 0.4, S / 2 - 10, 2, S / 2);
  ctx.quadraticCurveTo(S * 0.4, S / 2 + 10, S, S / 2 + 8);
  ctx.closePath(); ctx.fill();
  scene.textures.get('llama').refresh();
}

function texturaChispa(scene) {
  const S = 16, c = 8, ctx = scene.textures.createCanvas('chispa', S, S).getContext();
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, 'rgba(255,240,190,1)');
  g.addColorStop(0.4, 'rgba(255,160,60,0.9)');
  g.addColorStop(1, 'rgba(255,90,40,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, c, 0, Math.PI * 2); ctx.fill();
  scene.textures.get('chispa').refresh();
}

// ---------------------------------------------------------------- escena
export class Lab extends Phaser.Scene {
  create() {
    texturaTierra(this); texturaSombra(this); texturaAtmosfera(this);
    texturaEstrellas(this, 'estrellas1', 220, 0.7);
    texturaEstrellas(this, 'estrellas2', 120, 1.1);
    texturaEstrellas(this, 'estrellas3', 45, 1.7);
    texturaNave(this); texturaLlama(this); texturaChispa(this);

    const { width: w, height: h } = this.scale;

    // fondo: tres capas de estrellas con velocidades distintas (paralaje)
    this.capas = ['estrellas1', 'estrellas2', 'estrellas3'].map((k, i) =>
      this.add.tileSprite(0, 0, w, h, k).setOrigin(0).setDepth(-40 + i).setScrollFactor(0)
        .setAlpha(0.55 + i * 0.2));

    this.atmosfera = this.add.image(0, 0, 'atmosfera').setDepth(-30).setBlendMode(Phaser.BlendModes.ADD);
    this.superficie = this.add.image(0, 0, 'tierra').setDepth(-29);
    this.sombra = this.add.image(0, 0, 'sombra').setDepth(-28);

    this.g = this.add.graphics().setDepth(-10);      // trayectoria, ejes, vectores
    this.llama = this.add.image(0, 0, 'llama').setDepth(4).setVisible(false);
    this.nave = this.add.image(0, 0, 'nave').setDepth(5);

    const fuente = { fontFamily: '"JetBrains Mono", monospace', fontSize: '13px' };

    // HUD: los datos que hay que mirar sin apartar la vista de la nave
    this.gHud = this.add.graphics().setDepth(18);
    this.hudEtiquetas = this.add.text(0, 0, '', { ...fuente, color: '#8b98a8', lineSpacing: 5 }).setDepth(19);
    this.hudValores = this.add.text(0, 0, '', { ...fuente, color: '#dce5ef', lineSpacing: 5 }).setDepth(19).setOrigin(1, 0);
    this.txtEstado = this.add.text(0, 0, '', { ...fuente, fontSize: '14px', color: '#d7e0ea' }).setDepth(19);

    // gizmo de ejes: X, Y y la Z que en este modelo 2D vale siempre 0
    this.gGizmo = this.add.graphics().setDepth(18);
    this.gzX = this.add.text(0, 0, 'X', { ...fuente, fontSize: '12px', color: '#8b98a8' }).setDepth(19).setOrigin(0, 0.5);
    this.gzY = this.add.text(0, 0, 'Y', { ...fuente, fontSize: '12px', color: '#8b98a8' }).setDepth(19).setOrigin(0.5, 1);
    this.gzZ = this.add.text(0, 0, 'Z = 0', { ...fuente, fontSize: '11px', color: '#6fd3ff' }).setDepth(19).setOrigin(0, 0.5);
    // junto a cada flecha va sólo su nombre; los números están en el HUD
    this.txtPos = this.add.text(0, 0, 'r', { ...fuente, fontSize: '15px', color: '#b78bff' })
      .setDepth(20).setOrigin(0.5).setFontStyle('bold');
    this.txtZoom = this.add.text(0, 12, '', { ...fuente, color: '#8b98a8' }).setDepth(20).setOrigin(1, 0);
    this.txtEscala = this.add.text(0, 30, '', { ...fuente, color: '#8b98a8' }).setDepth(20).setOrigin(1, 0);
    this.txtAyuda = this.add.text(14, 0, '', { ...fuente, color: '#8b98a8', lineSpacing: 3 }).setDepth(20).setOrigin(0, 1);
    this.txtCuenta = this.add.text(0, 0, '', { ...fuente, fontSize: '96px', color: '#ffd479' }).setDepth(30).setOrigin(0.5);
    this.txtPeri = this.add.text(0, 0, 'PERIAPSIS', { ...fuente, fontSize: '11px', color: '#ffb26f' }).setDepth(20).setOrigin(0.5).setVisible(false);
    this.txtApo = this.add.text(0, 0, 'APOAPSIS', { ...fuente, fontSize: '11px', color: '#6fd3ff' }).setDepth(20).setOrigin(0.5).setVisible(false);
    this.txtVel = this.add.text(0, 0, 'v', { ...fuente, fontSize: '15px', color: '#4ade80' })
      .setDepth(20).setOrigin(0.5).setFontStyle('bold');
    this.txtGrav = this.add.text(0, 0, 'a', { ...fuente, fontSize: '15px', color: '#ff7a7a' })
      .setDepth(20).setOrigin(0.5).setFontStyle('bold');
    this.txtEjeX = this.add.text(0, 0, 'X', { ...fuente, fontSize: '12px', color: '#5b6b7f' }).setDepth(20);
    this.txtEjeY = this.add.text(0, 0, 'Y', { ...fuente, fontSize: '12px', color: '#5b6b7f' }).setDepth(20);

    this.tiempoVida = 0;
  }

  update(_, deltaMs) {
    const dtReal = Math.min(deltaMs, 100) / 1000;
    this.tiempoVida += dtReal;

    avanzarCuenta(dtReal);
    if (sim.corriendo) {
      avanzar(dtReal * sim.velocidadTiempo);
      if (sim.motor > 0) sim.motor -= dtReal;
    }
    while (sim.eventos.length) this.atender(sim.eventos.shift());

    this.dibujar(dtReal);
    renderPanel();
  }

  atender(evento) {
    if (evento === 'lanzar') {
      this.cameras.main.shake(320, 0.004);
      ocultarImpacto();
    }
    if (evento === 'impacto') {
      const { x, y } = this.aPantalla(sim.s.x, sim.s.y);
      this.cameras.main.shake(420, 0.012);
      this.add.particles(x, y, 'chispa', {
        speed: { min: 40, max: 260 }, lifespan: { min: 300, max: 900 },
        scale: { start: 1.1, end: 0 }, alpha: { start: 1, end: 0 },
        blendMode: 'ADD', emitting: false,
      }).setDepth(15).explode(38);
      const onda = this.add.circle(x, y, 10, 0xffa040, 0.55).setDepth(14);
      this.tweens.add({ targets: onda, scale: 7, alpha: 0, duration: 800, onComplete: () => onda.destroy() });
      mostrarImpacto();
    }
  }

  aPantalla(xKm, yKm) {
    return { x: this.scale.width / 2 + xKm * vista.escala,
             y: this.scale.height / 2 - yKm * vista.escala };
  }

  dibujar(dtReal) {
    const w = this.scale.width, h = this.scale.height;
    const cx = w / 2, cy = h / 2;
    const r = Math.hypot(sim.s.x, sim.s.y);

    // --- cámara: la Tierra siempre visible; se aleja sola si la nave se va
    vista.escalaRef = (Math.min(w, h) / 2) * 0.86 / ((R_PLANET + 400) * 1.35);
    const objetivo = (Math.min(w, h) / 2) * 0.86 / Math.max(r * 1.35, R_PLANET * 2.05);
    vista.escala = vista.reencuadrar ? objetivo : vista.escala + (objetivo - vista.escala) * 0.045;
    vista.reencuadrar = false;
    const k = vista.escala;
    const px = (x) => cx + x * k, py = (y) => cy - y * k;

    // --- estrellas con paralaje: cada capa se mueve un poco distinto
    this.capas.forEach((capa, i) => {
      capa.setSize(w, h);
      const f = 0.4 + i * 0.55;
      capa.tilePositionX = this.tiempoVida * 1.6 * f - (sim.s.x * k) * 0.012 * f;
      capa.tilePositionY = this.tiempoVida * 0.6 * f + (sim.s.y * k) * 0.012 * f;
      capa.setAlpha((0.5 + i * 0.2) * (0.9 + 0.1 * Math.sin(this.tiempoVida * (0.7 + i * 0.3))));
    });

    // --- Tierra: rotación muy lenta y tamaño según el zoom
    const dPlaneta = R_PLANET * 2 * k;
    this.superficie.setPosition(cx, cy).setDisplaySize(dPlaneta, dPlaneta)
      .setRotation(this.tiempoVida * 0.012);
    this.sombra.setPosition(cx, cy).setDisplaySize(dPlaneta, dPlaneta);
    this.atmosfera.setPosition(cx, cy)
      .setDisplaySize(dPlaneta * FACTOR_ATMOSFERA, dPlaneta * FACTOR_ATMOSFERA);

    const g = this.g;
    g.clear();

    // --- ejes
    if ($('ckAxes').checked) {
      g.lineStyle(1, 0x2f3b4c, 1);
      g.beginPath(); g.moveTo(0, cy); g.lineTo(w, cy); g.strokePath();
      g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, h); g.strokePath();
      this.txtEjeX.setPosition(w - 18, cy - 18).setVisible(true);
      this.txtEjeY.setPosition(cx + 8, 8).setVisible(true);
    } else { this.txtEjeX.setVisible(false); this.txtEjeY.setVisible(false); }

    // --- trayectoria: el recorrido entero tenue y el tramo reciente brillante
    const tz = sim.traza;
    if (tz.length > 1) {
      // con la traza muy larga se dibuja uno de cada N puntos: la línea es la
      // misma a simple vista y el navegador no se ahoga
      const salto = Math.max(1, Math.ceil(tz.length / 900));
      g.lineStyle(1.5, 0xffd479, 0.35);
      g.beginPath(); g.moveTo(px(tz[0].x), py(tz[0].y));
      for (let i = salto; i < tz.length; i += salto) g.lineTo(px(tz[i].x), py(tz[i].y));
      g.lineTo(px(tz[tz.length - 1].x), py(tz[tz.length - 1].y));
      g.strokePath();

      const desde = Math.max(0, tz.length - 140);
      g.lineStyle(2, 0xffe6a8, 0.95);
      g.beginPath(); g.moveTo(px(tz[desde].x), py(tz[desde].y));
      for (let i = desde; i < tz.length; i++) g.lineTo(px(tz[i].x), py(tz[i].y));
      g.strokePath();
    }

    // --- ápsides de la elipse (sólo si la órbita es realmente elíptica)
    const el = orbitalElements(sim.s);
    const mostrarApsides = sim.fase === 'vuelo' && el.e >= 0.02 && el.e < 1;
    if (mostrarApsides) {
      const marcar = (rad, ang, color, txt) => {
        const X = px(rad * Math.cos(ang)), Y = py(rad * Math.sin(ang));
        g.lineStyle(1.5, color, 0.9);
        g.strokeCircle(X, Y, 6);
        g.beginPath(); g.moveTo(X - 9, Y); g.lineTo(X + 9, Y); g.strokePath();
        g.beginPath(); g.moveTo(X, Y - 9); g.lineTo(X, Y + 9); g.strokePath();
        txt.setPosition(X, Y - 18).setVisible(true);
      };
      marcar(el.rPeri, el.anguloPeriapsis, 0xffb26f, this.txtPeri);
      marcar(el.rApo, el.anguloPeriapsis + Math.PI, 0x6fd3ff, this.txtApo);
      this.txtPeri.setText(`PERIAPSIS ${Math.round(el.rPeri - R_PLANET)} km`);
      this.txtApo.setText(`APOAPSIS ${Math.round(el.rApo - R_PLANET)} km`);
    } else { this.txtPeri.setVisible(false); this.txtApo.setVisible(false); }

    // --- vector posición: del centro de la Tierra a la nave
    const nx = px(sim.s.x), ny = py(sim.s.y);
    if ($('ckPos').checked && sim.fase !== 'impacto') {
      this.flecha(g, cx, cy, nx, ny, 0xb78bff, false);
      // r y a caen sobre la misma recta, así que se rotulan a lados opuestos:
      // r cerca de la Tierra y por un lado, a junto a la nave y por el otro
      const dx = nx - cx, dy = ny - cy, largo = Math.hypot(dx, dy) || 1;
      this.txtPos.setVisible(true)
        .setPosition(cx + dx * 0.35 - (dy / largo) * 16, cy + dy * 0.35 + (dx / largo) * 16);
    } else this.txtPos.setVisible(false);

    // --- nave: posición y rumbo salen directo de la física
    const v = Math.hypot(sim.s.vx, sim.s.vy);
    const rumbo = Math.atan2(-sim.s.vy, sim.s.vx);
    const visible = sim.fase !== 'impacto';
    this.nave.setVisible(visible).setPosition(nx, ny).setRotation(rumbo).setDisplaySize(38, 38);

    // llama del motor durante el lanzamiento
    const motorEncendido = sim.motor > 0 && sim.fase === 'vuelo';
    this.llama.setVisible(motorEncendido);
    if (motorEncendido) {
      const pulso = 0.85 + 0.25 * Math.sin(this.tiempoVida * 30);
      this.llama.setPosition(nx - Math.cos(rumbo) * 22, ny - Math.sin(rumbo) * 22)
        .setRotation(rumbo).setDisplaySize(34 * pulso, 20 * pulso)
        .setAlpha(0.9 * Math.min(1, sim.motor));
    }

    // --- vectores
    if ($('ckVel').checked && v > 0 && visible) {
      const L = Phaser.Math.Clamp(v * 11, 30, 150);
      const ex = nx + (sim.s.vx / v) * L, ey = ny - (sim.s.vy / v) * L;
      this.flecha(g, nx, ny, ex, ey, 0x4ade80, sim.fase === 'listo');
      this.txtVel.setPosition(ex + (sim.s.vx >= 0 ? 12 : -12), ey - 12).setVisible(true);
    } else this.txtVel.setVisible(false);

    const { ax, ay } = accel(sim.s.x, sim.s.y);
    const a = Math.hypot(ax, ay);
    if ($('ckGrav').checked && a > 0 && visible) {
      const L = Phaser.Math.Clamp(a * 7000, 28, 130);
      const ex = nx + (ax / a) * L, ey = ny - (ay / a) * L;
      this.flecha(g, nx, ny, ex, ey, 0xff7a7a, false);
      const px2 = -(ey - ny) / L, py2 = (ex - nx) / L;   // perpendicular unitaria
      this.txtGrav.setPosition(ex - px2 * 15, ey - py2 * 15).setVisible(true);
    } else this.txtGrav.setVisible(false);

    // --- carteles
    const clave = estadoActual();
    const e = ESTADOS[clave];
    this.dibujarHud(clave, e, derived(sim.s));

    const zoom = k / vista.escalaRef;
    this.txtZoom.setPosition(w - 14, 12).setText(`ZOOM ×${zoom >= 1 ? zoom.toFixed(1) : zoom.toFixed(2)}`);
    const kmBarra = Math.round(120 / k / 500) * 500 || 500;
    this.txtEscala.setPosition(w - 14, 32).setText(`▬ ${kmBarra.toLocaleString('es')} km`);
    g.lineStyle(2, 0x5b6b7f, 1);
    const bx = w - 14 - kmBarra * k;
    g.beginPath(); g.moveTo(bx, 50); g.lineTo(w - 14, 50); g.strokePath();

    if ($('ckAyuda').checked) {
      const cierre = {
        circular: '= TRAYECTORIA CURVA ↘  cae, pero nunca llega: órbita',
        eliptica: '= TRAYECTORIA CURVA ↘  cae de más y sube de más: elipse',
        escape:   '= TRAYECTORIA CURVA ↘  la gravedad ya no alcanza a frenarla',
        escapado: '= TRAYECTORIA CURVA ↘  la gravedad ya no alcanza a frenarla',
        impacto:  '= TRAYECTORIA CURVA ↘  faltó velocidad de costado: cayó',
      }[clave] || '= TRAYECTORIA CURVA ↘  la suma de las dos flechas';
      this.txtAyuda.setPosition(14, h - 14).setVisible(true).setText(
        'VELOCIDAD →   la nave avanza de costado\n' +
        '+ GRAVEDAD ↓  la Tierra tira de ella\n' + cierre);
    } else this.txtAyuda.setVisible(false);

    this.dibujarGizmo(w, h);

    this.txtCuenta.setPosition(cx, cy - Math.min(w, h) * 0.28);
    if (sim.fase === 'cuenta') {
      const n = Math.ceil(sim.cuenta);
      this.txtCuenta.setText(n > 0 ? String(n) : '🚀').setVisible(true).setAlpha(1 - (Math.ceil(sim.cuenta) - sim.cuenta));
    } else this.txtCuenta.setVisible(false);
  }

  // Panel de datos dentro de la escena, para no tener que mirar a la derecha.
  dibujarHud(clave, estado, m) {
    const filas = [
      ['DISTANCIA r', `${m.r.toFixed(1)} km`],
      ['ALTURA', `${m.h.toFixed(1)} km`],
      ['VELOCIDAD', `${m.v.toFixed(3)} km/s`],
      ['GRAVEDAD', `${(m.a * 1000).toFixed(3)} m/s²`],
      ['TIEMPO FÍSICO', `${sim.t.toFixed(1)} s`],
      ['REPRODUCCIÓN', `×${sim.velocidadTiempo}`],
    ];
    const x = 14, y = 12, ancho = 250, alto = 26 + filas.length * 19 + 24;

    this.gHud.clear();
    this.gHud.fillStyle(0x0a1018, 0.82).fillRoundedRect(x, y, ancho, alto, 6);
    this.gHud.lineStyle(1, 0x24334a, 1).strokeRoundedRect(x, y, ancho, alto, 6);

    this.hudEtiquetas.setPosition(x + 12, y + 12).setText(filas.map((f) => f[0]).join('\n'));
    this.hudValores.setPosition(x + ancho - 12, y + 12).setText(filas.map((f) => f[1]).join('\n'));

    const yEstado = y + 12 + filas.length * 19 + 6;
    this.gHud.lineStyle(1, 0x24334a, 1);
    this.gHud.beginPath();
    this.gHud.moveTo(x + 12, yEstado - 2); this.gHud.lineTo(x + ancho - 12, yEstado - 2);
    this.gHud.strokePath();
    this.txtEstado.setPosition(x + 12, yEstado + 4).setText(`${estado.chip} ${estado.texto}`).setColor(estado.color);
  }

  // X, Y y el recordatorio de que la tercera coordenada existe y aquí vale 0.
  dibujarGizmo(w, h) {
    const x = w - 100, y = h - 70, L = 46;
    const g = this.gGizmo;
    g.clear();
    g.lineStyle(2, 0x8b98a8, 1);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y); g.strokePath();          // X
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - L); g.strokePath();          // Y
    for (const [dx, dy] of [[L, 0], [0, -L]]) {                                 // puntas
      const ang = Math.atan2(dy, dx);
      g.beginPath();
      g.moveTo(x + dx, y + dy);
      g.lineTo(x + dx - 8 * Math.cos(ang - 0.4), y + dy - 8 * Math.sin(ang - 0.4));
      g.lineTo(x + dx - 8 * Math.cos(ang + 0.4), y + dy - 8 * Math.sin(ang + 0.4));
      g.closePath(); g.fillStyle(0x8b98a8, 1); g.fillPath();
    }
    // Z sale de la pantalla hacia quien mira: se dibuja como ⊙
    g.lineStyle(1.5, 0x6fd3ff, 1);
    g.strokeCircle(x, y, 6);
    g.fillStyle(0x6fd3ff, 1).fillCircle(x, y, 2);
    this.gzX.setPosition(x + L + 6, y);
    this.gzY.setPosition(x, y - L - 6);
    this.gzZ.setPosition(x + 12, y + 14);
  }

  flecha(g, x1, y1, x2, y2, color, punteada) {
    g.lineStyle(2.5, color, 1);
    if (punteada) {
      const largo = Math.hypot(x2 - x1, y2 - y1), pasos = Math.max(2, Math.floor(largo / 10));
      for (let i = 0; i < pasos; i += 2) {
        const t1 = i / pasos, t2 = Math.min(1, (i + 1) / pasos);
        g.beginPath();
        g.moveTo(x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1);
        g.lineTo(x1 + (x2 - x1) * t2, y1 + (y2 - y1) * t2);
        g.strokePath();
      }
    } else {
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
    }
    const ang = Math.atan2(y2 - y1, x2 - x1), p = 11;
    g.beginPath();
    g.moveTo(x2, y2);
    g.lineTo(x2 - p * Math.cos(ang - 0.4), y2 - p * Math.sin(ang - 0.4));
    g.lineTo(x2 - p * Math.cos(ang + 0.4), y2 - p * Math.sin(ang + 0.4));
    g.closePath(); g.fillStyle(color, 1); g.fillPath();
  }
}
