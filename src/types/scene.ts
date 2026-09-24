/**
 * Forma de la escena de un desarrollo.
 *
 * Todo lo que acá es un campo, antes era una constante en config/scene.ts.
 * Ese fue el hallazgo de esta fase: la calibración de la escena —sol, cámara,
 * encuadres, vuelo de apertura, altura del edificio— no es configuración de
 * la plataforma, es parte de la descripción del desarrollo. Mientras viviera
 * en el código, cada proyecto nuevo exigía editar archivos y desplegar.
 *
 * Los tipos viven separados de los valores a propósito: config/ tiene los
 * defaults de la plataforma, data/ tiene lo que cada desarrollo declara, y
 * ninguno de los dos depende del otro.
 */

export type Vec3 = [number, number, number];

/* -------------------------------------------------------------------------- */
/* Modelo 3D                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * 'placeholder' -> geometría primitiva generada en código
 * 'gltf'        -> carga el archivo indicado en modelPath
 *
 * En el futuro puede sumarse 'sprites' para el camino pre-renderizado, sin
 * tocar nada fuera de Building.tsx.
 */
export type BuildingSource = 'placeholder' | 'gltf';

export interface ModelSettings {
  source: BuildingSource;

  /**
   * Ruta del modelo dentro del almacenamiento de medios, NO una URL.
   *
   * Guardar URLs completas ata los datos al hosting: las download URL de
   * Firebase Storage llevan un token revocable, y mudar el bucket obligaría a
   * reescribir cada documento. Con una ruta, el resolvedor de medios decide
   * de dónde sale el archivo y los datos quedan portables.
   */
  path: string | null;

  position: Vec3;
  scale: number;
  rotationY: number;

  /** Altura total del edificio, en metros. Referencia para encuadre. */
  height: number;
}

/* -------------------------------------------------------------------------- */
/* Iluminación y atmósfera                                                    */
/* -------------------------------------------------------------------------- */

export interface SunSettings {
  /**
   * Elevación visual: la que dibuja el cielo. Es la perilla principal de
   * temperatura de color de toda la escena.
   */
  elevationDeg: number;

  /**
   * Elevación de la luz que proyecta sombra, normalmente más alta que la
   * visual para que la sombra no se estire fuera del shadow map. El azimut sí
   * se comparte: una sombra que cae hacia otro lado que el sol se delata.
   */
  shadowElevationDeg: number;

  azimuthDeg: number;
  distance: number;
}

export interface SkySettings {
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  /** Radio de la cúpula. Tiene que quedar dentro de camera.far. */
  distance: number;
}

export interface AtmosphereSettings {
  /** Debe aproximar el color del horizonte, o aparece una costura. */
  fogColor: string;
  fogNear: number;
  fogFar: number;
  /** Intensidad del entorno derivado del cielo, que alimenta los reflejos. */
  environmentIntensity: number;
}

export interface RenderSettings {
  /** Perilla global de brillo: escala sol y entorno por igual. */
  toneMappingExposure: number;
}

/**
 * Post-proceso: lo que separa "un modelo 3D" de "un render".
 *
 * Tres efectos y ninguno más. La tentación es sumar profundidad de campo,
 * aberración cromática y destellos, y ahí la pieza deja de parecer
 * arquitectura y empieza a parecer un videojuego. Cada uno de estos está
 * porque corrige algo que la escena cruda hace mal:
 *
 *   la oclusión ambiental asienta los volúmenes, que sin ella flotan;
 *   el brillo da materialidad al vidrio, que sin él se lee como plástico;
 *   el viñeteado lleva el ojo al edificio en vez de a las esquinas.
 *
 * Es parte de la escena y no una constante del código porque cada desarrollo
 * pide su dosis: una torre vidriada aguanta más brillo que una de hormigón.
 */
export interface PostFxSettings {
  enabled: boolean;
  /** Fuerza de las sombras de contacto. Por encima de 2 se ve sucio. */
  aoIntensity: number;
  /** Alcance en metros. Grande difumina, chico marca solo las juntas. */
  aoRadius: number;
  /** Intensidad del brillo en los reflejos. */
  bloomIntensity: number;
  /** Desde qué luminancia brilla. Bajarlo de 0.8 enciende toda la escena. */
  bloomThreshold: number;
  /** Oscurecimiento de los bordes del cuadro. */
  vignetteDarkness: number;
}

/* -------------------------------------------------------------------------- */
/* Terreno                                                                    */
/* -------------------------------------------------------------------------- */

export interface TerrainSettings {
  size: number;
  segments: number;
  amplitude: number;
  frequency: number;
  /** Dentro de este radio el lote está nivelado. */
  flatRadius: number;
  falloffRadius: number;
}

export interface ContextSettings {
  neighbourCount: number;
  treeCount: number;
}

/* -------------------------------------------------------------------------- */
/* Cámara                                                                     */
/* -------------------------------------------------------------------------- */

export interface CameraSettings {
  position: Vec3;
  target: Vec3;
  fov: number;
  near: number;
  far: number;
}

export interface ControlsSettings {
  dampingFactor: number;
  rotateSpeed: number;
  zoomSpeed: number;
  panSpeed: number;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  panBounds: {
    x: number;
    z: number;
    minY: number;
    maxY: number;
  };
}

export interface CameraPreset {
  id: string;
  label: string;
  position: Vec3;
  target: Vec3;
}

export interface CameraView {
  position: Vec3;
  target: Vec3;
}

export interface IntroFlightSettings {
  path: Vec3[];
  targetFrom: Vec3;
  targetTo: Vec3;
  durationSeconds: number;
}

/* -------------------------------------------------------------------------- */
/* Escena completa                                                            */
/* -------------------------------------------------------------------------- */

export interface SceneSettings {
  model: ModelSettings;
  sun: SunSettings;
  sky: SkySettings;
  atmosphere: AtmosphereSettings;
  render: RenderSettings;
  postFx: PostFxSettings;
  terrain: TerrainSettings;
  context: ContextSettings;
  camera: CameraSettings;
  controls: ControlsSettings;
  presets: CameraPreset[];
  floorsView: CameraView;
  introFlight: IntroFlightSettings;
  presetTransitionSeconds: number;
}

/**
 * Lo que un desarrollo puede declarar.
 *
 * Es parcial por sección: el proyecto solo escribe lo que difiere del default
 * de la plataforma. Un desarrollo nuevo debería resolverse en pocas líneas, no
 * copiando la escena entera.
 */
export type SceneOverrides = {
  [K in keyof SceneSettings]?: SceneSettings[K] extends object
    ? SceneSettings[K] extends unknown[]
      ? SceneSettings[K]
      : Partial<SceneSettings[K]>
    : SceneSettings[K];
};

/**
 * La escena lista para usar: los valores declarados más los derivados que
 * ningún documento debería guardar porque se calculan.
 */
export interface ResolvedScene extends SceneSettings {
  /** Dirección del sol para el cielo. */
  sunPosition: Vec3;
  /** Dirección de la luz key. Mismo azimut, elevación mayor. */
  sunShadowPosition: Vec3;
}
