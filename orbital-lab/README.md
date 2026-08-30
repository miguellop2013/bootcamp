# Laboratorio de Mecánica Orbital (Vite + Phaser 3)

Herramienta visual de una sola página para ver qué significan las fórmulas de
mecánica orbital: una nave alrededor de la Tierra, su trayectoria, sus vectores
y los números en vivo.

## Uso

```bash
npm install
npm run dev
```

Abrir la URL que imprime Vite (http://localhost:5173).

## Cómo funciona

- `src/physics.js` — dos cuerpos, gravedad newtoniana `a = -μ/r³ · r_vector`,
  integrado con Runge-Kutta 4. Unidades: km y segundos (μ = 398600 km³/s²,
  R = 6371 km). No se usa ningún motor de física.
- `src/main.js` — escena de Phaser 3 (sólo dibujo) y los controles.
- `src/panel.js` — panel derecho: variables y fórmulas con los números sustituidos.

## Experimentos (botones de la esquina inferior)

| Caso | v0 | altura | resultado |
|---|---|---|---|
| 1 · velocidad insuficiente | 5.00 km/s | 400 km | cae al planeta |
| 2 · velocidad orbital | 7.67 km/s | 400 km | órbita casi circular |
| 3 · velocidad distinta | 9.20 km/s | 400 km | elipse |
| 4 · escape | 11.50 km/s | 400 km | se va del planeta |
