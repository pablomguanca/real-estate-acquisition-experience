import { useEffect, useState } from 'react';

import { DEFAULT_SCENE } from '../config/scene';
import { useProject } from '../context/ProjectContext';
import type { ResolvedScene, SceneOverrides, SceneSettings, Vec3 } from '../types/scene';
import { type CameraReadout, useCalibration } from './CalibrationLayer';
import styles from './CalibrationPanel.module.scss';

/**
 * Panel de calibración.
 *
 * Cada control de acá reemplaza un ciclo de "editar un número, recargar,
 * mirar". La diferencia no es comodidad: es que calibrar mirando en tiempo
 * real converge en minutos donde el ciclo con recarga lleva horas.
 *
 * No escribe nada en ningún lado. Lo único que produce es texto para pegar en
 * el archivo del desarrollo, que sigue siendo la fuente de verdad.
 */

/** Cada cuánto el panel lee la ref de la sonda. A 10 Hz los números ya se leen fluidos. */
const READ_INTERVAL_MS = 100;

/**
 * Reduce la escena a lo que DIFIERE de los defaults.
 *
 * Es la pieza que hace corto el archivo de un desarrollo nuevo: en vez de
 * volcar las trescientas líneas de la escena, produce solo las que hay que
 * declarar. Todo lo que coincide con la plataforma se omite.
 */
function diffFromDefaults(scene: ResolvedScene): SceneOverrides {
  const overrides: Record<string, unknown> = {};
  const sections = Object.keys(DEFAULT_SCENE) as (keyof SceneSettings)[];

  for (const section of sections) {
    const current = scene[section];
    const fallback = DEFAULT_SCENE[section];

    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      if (JSON.stringify(current) !== JSON.stringify(fallback)) {
        overrides[section] = current;
      }
      continue;
    }

    // Las secciones son objetos planos de valores; el doble casteo es la
    // manera honesta de recorrerlas sin enumerar cada tipo a mano.
    const currentRecord = current as unknown as Record<string, unknown>;
    const fallbackRecord = fallback as unknown as Record<string, unknown>;

    const changed: Record<string, unknown> = {};
    for (const key of Object.keys(currentRecord)) {
      if (JSON.stringify(currentRecord[key]) !== JSON.stringify(fallbackRecord[key])) {
        changed[key] = currentRecord[key];
      }
    }

    if (Object.keys(changed).length > 0) overrides[section] = changed;
  }

  return overrides as SceneOverrides;
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      // El portapapeles falla sin https o sin permiso. El valor igual está en
      // pantalla, así que degradar a "seleccionar y copiar a mano" alcanza.
      setCopied('error');
      setTimeout(() => setCopied(null), 1400);
    }
  };

  return { copied, copy };
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step, suffix, onChange }: SliderProps) {
  return (
    <label className={styles.slider}>
      <span className={styles.sliderLabel}>
        {label}
        <b>
          {value}
          {suffix}
        </b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function CalibrationPanel() {
  const calibration = useCalibration();
  const { scene } = useProject();
  const { copied, copy } = useCopy();

  const [readout, setReadout] = useState<CameraReadout | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Lectura periódica de la ref, en vez de estado actualizado por frame.
  useEffect(() => {
    if (!calibration) return;

    const id = setInterval(() => {
      setReadout(calibration.probe.current.camera);
      const point = calibration.probe.current.pickedPoint;
      setPicked(point ? `[${point.join(', ')}]` : null);
    }, READ_INTERVAL_MS);

    return () => clearInterval(id);
  }, [calibration]);

  if (!calibration) return null;

  const { controls } = scene;
  const setSection = <K extends keyof SceneSettings>(
    section: K,
    patch: Partial<SceneSettings[K]>,
  ) =>
    calibration.setOverrides((previous) => ({
      ...previous,
      [section]: { ...(previous[section] as object), ...patch },
    }));

  // Validación contra los propios límites de los controles. Un preset fuera
  // de rango se ve bien al copiarlo y después pega un salto cuando
  // OrbitControls lo corrige: es un error que se descubre tarde.
  const distanceOk =
    readout && readout.distance >= controls.minDistance && readout.distance <= controls.maxDistance;
  const polarOk =
    readout && readout.polar >= controls.minPolarAngle && readout.polar <= controls.maxPolarAngle;
  const valid = Boolean(distanceOk && polarOk);

  /**
   * La posición canónica: la observada con el factor de encuadre dividido.
   *
   * Es la corrección que hace utilizable lo que se copia. La cámara está donde
   * está PORQUE el factor responsive la alejó; guardar ese valor haría que
   * CameraRig lo alejara de nuevo al aplicar el factor sobre él. Dividiéndolo
   * acá, lo que se pega es la coordenada de referencia y el encuadre se ve
   * igual en cualquier proporción de pantalla.
   */
  const canonicalPosition = (value: CameraReadout): Vec3 =>
    value.framingFactor === 1
      ? value.position
      : (value.position.map(
          (component, index) =>
            Math.round(
              (value.target[index]! + (component - value.target[index]!) / value.framingFactor) *
                100,
            ) / 100,
        ) as Vec3);

  const presetSnippet = readout
    ? `{ id: 'nuevo', label: 'Nuevo', position: [${canonicalPosition(readout).join(
        ', ',
      )}], target: [${readout.target.join(', ')}] }`
    : '';

  const exportSnippet = `scene: ${JSON.stringify(diffFromDefaults(scene), null, 2)},`;

  return (
    <aside className={styles.panel} data-collapsed={collapsed || undefined}>
      <header className={styles.header}>
        <span className={styles.title}>Calibración</span>
        <button type="button" onClick={() => setCollapsed((value) => !value)}>
          {collapsed ? 'Abrir' : 'Cerrar'}
        </button>
      </header>

      {!collapsed && (
        <div className={styles.body}>
          {/* ---------------- Cámara ---------------- */}
          <section className={styles.section}>
            <h3>Cámara</h3>

            {readout ? (
              <>
                <dl className={styles.readout}>
                  <div>
                    <dt>Posición</dt>
                    <dd>[{readout.position.join(', ')}]</dd>
                  </div>
                  <div>
                    <dt>Target</dt>
                    <dd>[{readout.target.join(', ')}]</dd>
                  </div>
                  <div>
                    <dt>Distancia</dt>
                    <dd data-invalid={!distanceOk || undefined}>
                      {readout.distance} <small>({controls.minDistance}–{controls.maxDistance})</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Polar</dt>
                    <dd data-invalid={!polarOk || undefined}>
                      {readout.polar} <small>({controls.minPolarAngle}–{controls.maxPolarAngle})</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Aspecto</dt>
                    <dd>
                      {readout.aspect} <small>factor {readout.framingFactor}</small>
                    </dd>
                  </div>
                </dl>

                {readout.framingFactor !== 1 && (
                  <p className={styles.hint}>
                    La ventana es angosta y el encuadre responsive alejó la cámara. Lo que
                    se copia ya viene con ese factor dividido, así que es correcto — pero
                    calibrar en una ventana ancha se parece más a lo que ve la mayoría.
                  </p>
                )}

                <p className={styles.verdict} data-valid={valid || undefined}>
                  {valid
                    ? 'Encuadre válido: dentro de los límites de los controles.'
                    : 'Fuera de límites. Al usarlo como preset, la cámara va a saltar.'}
                </p>

                <div className={styles.actions}>
                  <button type="button" onClick={() => copy('preset', presetSnippet)}>
                    {copied === 'preset' ? 'Copiado' : 'Copiar como preset'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      copy(
                        'camera',
                        `position: [${readout.position.join(', ')}],\ntarget: [${readout.target.join(', ')}],`,
                      )
                    }
                  >
                    {copied === 'camera' ? 'Copiado' : 'Copiar como encuadre inicial'}
                  </button>
                </div>
              </>
            ) : (
              <p className={styles.hint}>Esperando a la escena…</p>
            )}
          </section>

          {/* ---------------- Punto ---------------- */}
          <section className={styles.section}>
            <h3>Punto en la escena</h3>
            <p className={styles.hint}>
              Activalo y hacé click sobre el modelo para obtener coordenadas. Sirve para
              colocar amenities sin medir el edificio a mano.
            </p>

            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={calibration.pickMode}
                onChange={(event) => calibration.setPickMode(event.target.checked)}
              />
              Modo selección de punto
            </label>

            {calibration.pickMode && (
              <p className={styles.hint}>
                Mientras esté activo, el click también puede seleccionar un piso o una
                unidad. Es inofensivo durante la calibración.
              </p>
            )}

            {picked && (
              <div className={styles.actions}>
                <code className={styles.code}>{picked}</code>
                <button type="button" onClick={() => copy('point', picked)}>
                  {copied === 'point' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            )}
          </section>

          {/* ---------------- Sol ---------------- */}
          <section className={styles.section}>
            <h3>Sol y exposición</h3>

            <Slider
              label="Elevación"
              value={scene.sun.elevationDeg}
              min={2}
              max={70}
              step={1}
              suffix="°"
              onChange={(elevationDeg) => setSection('sun', { elevationDeg })}
            />
            <Slider
              label="Elevación de sombra"
              value={scene.sun.shadowElevationDeg}
              min={5}
              max={80}
              step={1}
              suffix="°"
              onChange={(shadowElevationDeg) => setSection('sun', { shadowElevationDeg })}
            />
            <Slider
              label="Azimut"
              value={scene.sun.azimuthDeg}
              min={0}
              max={359}
              step={1}
              suffix="°"
              onChange={(azimuthDeg) => setSection('sun', { azimuthDeg })}
            />
            <Slider
              label="Exposición"
              value={scene.render.toneMappingExposure}
              min={0.15}
              max={1.2}
              step={0.01}
              onChange={(toneMappingExposure) =>
                setSection('render', { toneMappingExposure })
              }
            />
            <Slider
              label="Entorno"
              value={scene.atmosphere.environmentIntensity}
              min={0}
              max={1.5}
              step={0.01}
              onChange={(environmentIntensity) =>
                setSection('atmosphere', { environmentIntensity })
              }
            />
          </section>

          {/* ---------------- Exportar ---------------- */}
          <section className={styles.section}>
            <h3>Exportar</h3>
            <p className={styles.hint}>
              Solo lo que difiere de los defaults de la plataforma. Es lo que va en el
              campo <code>scene</code> del archivo del desarrollo.
            </p>

            <pre className={styles.export}>{exportSnippet}</pre>

            <div className={styles.actions}>
              <button type="button" onClick={() => copy('export', exportSnippet)}>
                {copied === 'export' ? 'Copiado' : 'Copiar bloque'}
              </button>
              <button type="button" onClick={() => calibration.setOverrides({})}>
                Descartar cambios
              </button>
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
