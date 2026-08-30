# Laboratorio Orbital (Vite + Phaser 3)

Simulador educativo de mecánica orbital: una nave alrededor de la Tierra, con la
trayectoria, los vectores y las fórmulas actualizándose en vivo.

## Uso

```bash
npm install
npm run dev            # http://localhost:5173
node build-docs.mjs    # regenera ../docs/index.html (la página publicable)
```

## Estructura

| archivo | qué hace |
|---|---|
| `src/physics.js` | dos cuerpos, `a = -μ/r³·r_vector`, integrado con Runge-Kutta 4, y los elementos de la órbita (excentricidad, ápsides). Sin motor de física. |
| `src/sim.js` | estado de la simulación: avance temporal, cuenta regresiva, detección de impacto y de escape, modo paso a paso. |
| `src/scene.js` | escena de Phaser: estrellas, Tierra, nave, trayectoria, vectores y carteles. Sólo dibuja lo que calcula la física. |
| `src/panel.js` | panel derecho: variables agrupadas, estado y fórmulas con los valores sustituidos. |
| `src/main.js` | arranque y controles. |
| `build-docs.mjs` | junta todo en `docs/index.html`, en un solo archivo y sin CDN. |

Unidades: kilómetros y segundos (Tierra: R = 6371 km, μ = 398600 km³/s²).
La escala de dibujo es aparte: la cámara se aleja sola y muestra el zoom en pantalla.

## Experimentos

| botón | v0 | altura | resultado |
|---|---|---|---|
| 1 · velocidad insuficiente | 5.00 km/s | 400 km | cae: impacto a los 397 s, a 5.69 km/s |
| 2 · circular | 7.67 km/s | 400 km | órbita casi circular (e ≈ 0.0007, período 5554 s) |
| 3 · elíptica | 9.20 km/s | 400 km | elipse entre 400 y 10944 km de altura |
| 4 · escape | 11.50 km/s | 400 km | e ≈ 1.25, energía positiva: se aleja y no vuelve |
