import type {
  ResolvedScene,
  SceneOverrides,
  SceneSettings,
  Vec3,
} from '../types/scene';

export type { CameraPreset, CameraView, Vec3 } from '../types/scene';

/**
 * Defaults de la plataforma.
 *
 * Antes este archivo era la calibración de PROJECT 01. Ahora es el punto de
 * partida de cualquier desarrollo: valores que funcionan para una torre
 * urbana de altura media, que cada proyecto ajusta solo donde difiere.
 *
 * Esa es la diferencia entre una experiencia y un sistema: acá viven las
 * decisiones que valen para todos los desarrollos, y en data/projects las que
 * valen para uno.
 */
const DEG = Math.PI / 180;

export const DEFAULT_SCENE: SceneSettings = {
  model: {
    source: 'placeholder',
    path: null,
    position: [0, 0, 0],
    scale: 1,
    rotationY: 0,
    height: 46,
  },

  sun: {
    elevationDeg: 15,
    shadowElevationDeg: 27,
    azimuthDeg: 100,
    distance: 150,
  },

  sky: {
    turbidity: 3,
    rayleigh: 2.6,
    mieCoefficient: 0.004,
    mieDirectionalG: 0.82,
    distance: 450,
  },

  atmosphere: {
    fogColor: '#4b535d',
    fogNear: 150,
    fogFar: 460,
    environmentIntensity: 0.32,
  },

  render: {
    toneMappingExposure: 0.5,
  },

  terrain: {
    size: 700,
    segments: 140,
    amplitude: 17,
    frequency: 0.0055,
    flatRadius: 46,
    falloffRadius: 130,
  },

  context: {
    neighbourCount: 48,
    treeCount: 96,
  },

  camera: {
    position: [66, 39, 80],
    target: [0, 18, 0],
    fov: 35,
    near: 0.5,
    far: 900,
  },

  controls: {
    dampingFactor: 0.05,
    rotateSpeed: 0.45,
    zoomSpeed: 0.6,
    panSpeed: 0.5,
    minDistance: 55,
    maxDistance: 165,
    minPolarAngle: 0.35,
    maxPolarAngle: 1.45,
    panBounds: { x: 30, z: 30, minY: 5, maxY: 40 },
  },

  presets: [
    { id: 'overview', label: 'General', position: [66, 39, 80], target: [0, 18, 0] },
    { id: 'entrance', label: 'Acceso', position: [10, 20, 76], target: [0, 8, 0] },
    { id: 'amenities', label: 'Amenities', position: [-52, 26, 52], target: [-14, 6, 0] },
    { id: 'aerial', label: 'Aérea', position: [40, 62, 46], target: [0, 26, 0] },
  ],

  floorsView: {
    position: [50, 39, 60],
    target: [0, 25, 0],
  },

  introFlight: {
    path: [
      [152, 96, 34],
      [126, 62, 92],
      [84, 42, 92],
      [66, 39, 80],
    ],
    targetFrom: [0, 27, 0],
    targetTo: [0, 18, 0],
    durationSeconds: 7,
  },

  presetTransitionSeconds: 1.6,
};

function sunToCartesian(elevationDeg: number, azimuthDeg: number, distance: number): Vec3 {
  const elevation = elevationDeg * DEG;
  const azimuth = azimuthDeg * DEG;
  const horizontal = Math.cos(elevation) * distance;

  return [
    horizontal * Math.sin(azimuth),
    Math.sin(elevation) * distance,
    horizontal * Math.cos(azimuth),
  ];
}

/**
 * Mezcla lo que declara el proyecto sobre los defaults, sección por sección.
 *
 * La mezcla es por sección y no recursiva a propósito: es predecible. Un
 * proyecto que toca `camera` hereda el resto intacto, pero si toca `presets`
 * los reemplaza enteros, porque una lista de encuadres a medias no significa
 * nada.
 */
export function resolveScene(overrides: SceneOverrides = {}): ResolvedScene {
  const scene: SceneSettings = {
    model: { ...DEFAULT_SCENE.model, ...overrides.model },
    sun: { ...DEFAULT_SCENE.sun, ...overrides.sun },
    sky: { ...DEFAULT_SCENE.sky, ...overrides.sky },
    atmosphere: { ...DEFAULT_SCENE.atmosphere, ...overrides.atmosphere },
    render: { ...DEFAULT_SCENE.render, ...overrides.render },
    terrain: { ...DEFAULT_SCENE.terrain, ...overrides.terrain },
    context: { ...DEFAULT_SCENE.context, ...overrides.context },
    camera: { ...DEFAULT_SCENE.camera, ...overrides.camera },
    controls: {
      ...DEFAULT_SCENE.controls,
      ...overrides.controls,
      panBounds: {
        ...DEFAULT_SCENE.controls.panBounds,
        ...overrides.controls?.panBounds,
      },
    },
    presets: overrides.presets ?? DEFAULT_SCENE.presets,
    floorsView: { ...DEFAULT_SCENE.floorsView, ...overrides.floorsView },
    introFlight: { ...DEFAULT_SCENE.introFlight, ...overrides.introFlight },
    presetTransitionSeconds:
      overrides.presetTransitionSeconds ?? DEFAULT_SCENE.presetTransitionSeconds,
  };

  return {
    ...scene,
    // Derivados: se calculan, no se guardan. Un documento que trajera la
    // posición del sol podría contradecir sus propios ángulos.
    sunPosition: sunToCartesian(
      scene.sun.elevationDeg,
      scene.sun.azimuthDeg,
      scene.sun.distance,
    ),
    sunShadowPosition: sunToCartesian(
      scene.sun.shadowElevationDeg,
      scene.sun.azimuthDeg,
      scene.sun.distance,
    ),
  };
}

/**
 * Multiplicador de distancia según la proporción del viewport.
 *
 * El fov de three es vertical: en una pantalla vertical el alto entra igual
 * pero el ancho se recorta mucho y el edificio se siente encima. Alejar la
 * cámara lo compensa sin tocar el fov, que es lo que distorsionaría la
 * perspectiva arquitectónica.
 *
 * Es de la plataforma y no del proyecto: depende del dispositivo, no del
 * desarrollo.
 */
export function framingDistanceFactor(aspect: number): number {
  if (aspect < 0.75) return 1.42;
  if (aspect < 1.1) return 1.2;
  if (aspect < 1.5) return 1.06;
  return 1;
}
