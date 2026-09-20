import { type ComponentRef, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { MathUtils, Vector3 } from 'three';

import { framingDistanceFactor } from '../../config/scene';
import { useProject } from '../../context/ProjectContext';
import type { CameraView } from '../../types/scene';

/**
 * Cámara, controles orbitales y transiciones entre presets.
 *
 * Cámara y controles viven juntos porque están acoplados: quien mueve la
 * cámara por código tiene que desactivar los controles mientras dura el
 * movimiento, o los dos escriben sobre la misma posición y pelean.
 */

interface CameraRigProps {
  /**
   * Encuadre deseado. Cambiar el objeto dispara la transición.
   *
   * El rig no sabe de dónde sale: puede ser un preset elegido con las flechas
   * o la vista de pisos. Quien decide es App; acá solo se viaja hasta ahí.
   */
  view: CameraView;
  /** El vuelo de apertura toma el control: mientras corre, el rig no toca nada. */
  enabled: boolean;
}

/** easeInOutCubic: arranca y termina en reposo, sin tirones. */
function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function CameraRig({ view, enabled }: CameraRigProps) {
  const { scene } = useProject();
  const { camera, controls: controlSettings, presetTransitionSeconds } = scene;

  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const aspect = useThree((state) => state.viewport.aspect);

  // Estado de la transición. Vive en refs y no en useState a propósito: se
  // actualiza en cada frame y un setState acá re-renderizaría toda la escena
  // sesenta veces por segundo.
  const transition = useRef({
    active: false,
    elapsed: 0,
    fromPosition: new Vector3(),
    fromTarget: new Vector3(),
    toPosition: new Vector3(),
    toTarget: new Vector3(),
  });

  const previousView = useRef(view);

  /**
   * Aleja la cámara en pantallas angostas. Se aplica sobre el vector que va
   * del target a la cámara, así el encuadre se conserva y solo cambia cuánto
   * entra alrededor.
   */
  const applyFraming = (position: Vector3, target: Vector3) => {
    const factor = framingDistanceFactor(aspect);
    if (factor === 1) return position;

    return target.clone().add(position.clone().sub(target).multiplyScalar(factor));
  };

  // Arranque de la transición cuando cambia el encuadre pedido.
  useEffect(() => {
    if (previousView.current === view) return;

    const controls = controlsRef.current;
    // Importante: previousView se actualiza DESPUÉS de esta guarda. Si se
    // actualizara antes, un cambio de encuadre ocurrido con los controles
    // apagados (durante el vuelo de apertura) se daría por atendido y la
    // transición no se ejecutaría nunca.
    if (!controls || !enabled) return;

    previousView.current = view;

    const state = transition.current;
    const toTarget = new Vector3(...view.target);

    state.fromPosition.copy(controls.object.position);
    state.fromTarget.copy(controls.target);
    state.toTarget.copy(toTarget);
    state.toPosition.copy(applyFraming(new Vector3(...view.position), toTarget));
    state.elapsed = 0;
    state.active = true;

    controls.enabled = false;
  }, [view, enabled]);

  // Encuadre inicial: la misma corrección responsive, aplicada una vez.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const target = new Vector3(...camera.target);
    controls.object.position.copy(applyFraming(new Vector3(...camera.position), target));
    controls.target.copy(target);
    controls.update();
    // Solo al montar: después el usuario manda, y recolocar la cámara al
    // rotar el teléfono sería peor que dejar el encuadre como está.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const state = transition.current;

    if (state.active) {
      state.elapsed += delta;

      const t = Math.min(state.elapsed / presetTransitionSeconds, 1);
      const eased = ease(t);

      controls.object.position.lerpVectors(state.fromPosition, state.toPosition, eased);
      controls.target.lerpVectors(state.fromTarget, state.toTarget, eased);

      if (t >= 1) {
        state.active = false;
        controls.enabled = true;
      }

      controls.update();
      return;
    }

    if (!enabled) return;

    // OrbitControls no permite limitar el pan de fábrica: el usuario puede
    // arrastrar el target hasta perder el edificio de vista. Lo acotamos a
    // una caja. Es una operación trivial por frame, sin estado de React.
    const { x, z, minY, maxY } = controlSettings.panBounds;
    controls.target.x = MathUtils.clamp(controls.target.x, -x, x);
    controls.target.y = MathUtils.clamp(controls.target.y, minY, maxY);
    controls.target.z = MathUtils.clamp(controls.target.z, -z, z);
  });

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={camera.position}
        fov={camera.fov}
        near={camera.near}
        far={camera.far}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={camera.target}
        enabled={enabled}
        enableDamping
        dampingFactor={controlSettings.dampingFactor}
        rotateSpeed={controlSettings.rotateSpeed}
        zoomSpeed={controlSettings.zoomSpeed}
        panSpeed={controlSettings.panSpeed}
        minDistance={controlSettings.minDistance}
        maxDistance={controlSettings.maxDistance}
        minPolarAngle={controlSettings.minPolarAngle}
        maxPolarAngle={controlSettings.maxPolarAngle}
        // El pan sigue el plano del piso en lugar del plano de pantalla:
        // se siente como caminar alrededor, no como arrastrar una foto.
        screenSpacePanning={false}
      />
    </>
  );
}
