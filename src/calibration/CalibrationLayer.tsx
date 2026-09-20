import {
  type ReactNode,
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { resolveScene } from '../config/scene';
import { ProjectBridge, useProject } from '../context/ProjectContext';
import type { SceneOverrides, Vec3 } from '../types/scene';

/**
 * Modo calibración.
 *
 * Existe por una razón medida: dar de alta un desarrollo lleva unas horas de
 * trabajo mecánico y un día entero de calibrar mirando —ajustar un número,
 * recargar, mirar, corregir. Esa asimetría es el verdadero costo por proyecto,
 * y no se arregla con una base de datos sino con herramientas.
 *
 * Cómo funciona: toma el contexto ya cargado, le superpone sus propios
 * ajustes, y vuelve a proveerlo. Toda la escena y la UI leen el contexto
 * parcheado sin enterarse. Mover un control cambia la escena en el acto,
 * porque no hay recarga de por medio.
 *
 * Se activa con ?calibrate=1 y es de solo lectura sobre los datos: nunca
 * escribe nada. Lo que produce es texto para pegar en el archivo del
 * desarrollo.
 */

export interface CameraReadout {
  position: Vec3;
  target: Vec3;
  distance: number;
  /** Ángulo polar en radianes: 0 es cenital, PI/2 es horizontal. */
  polar: number;

  aspect: number;

  /**
   * Factor de encuadre responsive vigente.
   *
   * Importa para calibrar: la posición de arriba YA lo tiene aplicado. Si se
   * copiara tal cual a un preset, CameraRig se lo volvería a aplicar y el
   * encuadre saldría más lejos de lo que se vio al calibrarlo. Por eso el
   * panel lo divide antes de copiar.
   */
  framingFactor: number;
}

/**
 * Lo que la escena reporta hacia el panel.
 *
 * Vive en una ref y no en estado de React a propósito: la cámara se muestrea
 * en cada frame, y pasar eso por setState re-renderizaría toda la aplicación
 * sesenta veces por segundo. El panel lee esta ref a 10 Hz, que para leer
 * números en pantalla es de sobra.
 */
export interface CalibrationProbeState {
  camera: CameraReadout | null;
  pickedPoint: Vec3 | null;
}

interface CalibrationContextValue {
  overrides: SceneOverrides;
  setOverrides: React.Dispatch<React.SetStateAction<SceneOverrides>>;
  probe: React.MutableRefObject<CalibrationProbeState>;
  pickMode: boolean;
  setPickMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const CalibrationContext = createContext<CalibrationContextValue | null>(null);

export function useCalibration(): CalibrationContextValue | null {
  return useContext(CalibrationContext);
}

/** Verdadero si la URL pide el modo calibración. */
export function isCalibrationEnabled(): boolean {
  return new URLSearchParams(window.location.search).get('calibrate') === '1';
}

/**
 * Mezcla dos conjuntos de ajustes, sección por sección.
 *
 * Misma regla que resolveScene: las secciones se combinan, las listas se
 * reemplazan enteras. Lo que declara la calibración pisa lo que declara el
 * proyecto, y lo que ninguno declara cae al default.
 */
function mergeOverrides(base: SceneOverrides, patch: SceneOverrides): SceneOverrides {
  const merged: SceneOverrides = { ...base };

  for (const key of Object.keys(patch) as (keyof SceneOverrides)[]) {
    const patchValue = patch[key];
    const baseValue = base[key];

    const isPlainSection =
      patchValue !== null &&
      typeof patchValue === 'object' &&
      !Array.isArray(patchValue) &&
      baseValue !== null &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue);

    if (isPlainSection) {
      Object.assign(merged, {
        [key]: { ...(baseValue as object), ...(patchValue as object) },
      });
    } else {
      Object.assign(merged, { [key]: patchValue });
    }
  }

  return merged;
}

export function CalibrationLayer({ children }: { children: ReactNode }) {
  const base = useProject();

  const [overrides, setOverrides] = useState<SceneOverrides>({});
  const [pickMode, setPickMode] = useState(false);
  const probe = useRef<CalibrationProbeState>({ camera: null, pickedPoint: null });

  // El proyecto con la calibración encima, listo para que lo consuma todo el
  // árbol como si viniera del archivo.
  const patched = useMemo(() => {
    const scene = resolveScene(mergeOverrides(base.project.scene, overrides));
    return { project: base.project, scene };
  }, [base.project, overrides]);

  const calibration = useMemo<CalibrationContextValue>(
    () => ({ overrides, setOverrides, probe, pickMode, setPickMode }),
    [overrides, pickMode],
  );

  return (
    <CalibrationContext.Provider value={calibration}>
      <ProjectBridge value={patched}>{children}</ProjectBridge>
    </CalibrationContext.Provider>
  );
}
