import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CatmullRomCurve3, Vector3 } from 'three';

import { framingDistanceFactor } from '../../config/scene';
import { useProject } from '../../context/ProjectContext';

/**
 * Vuelo de apertura.
 *
 * No renderiza nada: toma la cámara, la recorre por una curva y se apaga.
 * Está separado de CameraRig para que borrarlo, si el recorrido no convence,
 * sea borrar un archivo y una línea.
 *
 * Tres cosas que separan un vuelo cinematográfico de uno que marea:
 *
 *  1. Desacelera, no corta. El último tramo llega casi detenido, así el
 *     traspaso a los controles no se percibe.
 *  2. Es interrumpible. Al primer toque entrega el control. Nadie debería
 *     sentirse rehén de una animación.
 *  3. Continuidad de target. Los controles arrancan mirando exactamente
 *     adonde terminó mirando el vuelo; si no, la cámara pega un salto al
 *     activarse. Es el error más común de este patrón.
 */

/** Lo mínimo que necesitamos de OrbitControls, sin importar su tipo real. */
interface ControlsLike {
  enabled: boolean;
  target: Vector3;
  update: () => void;
}

interface IntroFlightProps {
  onComplete: () => void;
}

/** easeOutCubic: velocidad alta al principio, llegada en reposo. */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function IntroFlight({ onComplete }: IntroFlightProps) {
  const { scene } = useProject();
  const flight = scene.introFlight;

  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const controls = useThree((state) => state.controls) as ControlsLike | null;
  const aspect = useThree((state) => state.viewport.aspect);

  const elapsed = useRef(0);
  const finished = useRef(false);

  // La curva se construye una sola vez. El factor responsive se aplica a
  // todos los puntos, para que el vuelo termine en el mismo encuadre que
  // CameraRig hubiera elegido por su cuenta.
  const curve = useMemo(() => {
    const factor = framingDistanceFactor(aspect);
    const targetEnd = new Vector3(...flight.targetTo);

    const points = flight.path.map((point) => {
      const position = new Vector3(...point);
      if (factor === 1) return position;
      return targetEnd.clone().add(position.sub(targetEnd).multiplyScalar(factor));
    });

    return new CatmullRomCurve3(points);
  }, [aspect, flight]);

  const targetFrom = useMemo(() => new Vector3(...flight.targetFrom), [flight]);
  const targetTo = useMemo(() => new Vector3(...flight.targetTo), [flight]);

  const finish = useRef(() => {});
  finish.current = () => {
    if (finished.current) return;
    finished.current = true;

    if (controls) {
      // El target queda donde el vuelo lo dejó: sin esto, los controles
      // recentran de golpe al activarse.
      controls.enabled = true;
      controls.update();
    }

    onComplete();
  };

  // Interrupción por gesto del usuario.
  useEffect(() => {
    const element = gl.domElement;
    const handle = () => finish.current();

    element.addEventListener('pointerdown', handle, { once: true });
    element.addEventListener('wheel', handle, { once: true, passive: true });

    return () => {
      element.removeEventListener('pointerdown', handle);
      element.removeEventListener('wheel', handle);
    };
  }, [gl]);

  // Los controles quedan apagados mientras dura el vuelo.
  useEffect(() => {
    if (!controls) return;
    controls.enabled = false;
  }, [controls]);

  useFrame((_, delta) => {
    if (finished.current || !controls) return;

    elapsed.current += delta;

    const t = Math.min(elapsed.current / flight.durationSeconds, 1);
    const eased = easeOut(t);

    curve.getPointAt(eased, camera.position);
    controls.target.lerpVectors(targetFrom, targetTo, eased);
    camera.lookAt(controls.target);

    if (t >= 1) finish.current();
  });

  return null;
}
