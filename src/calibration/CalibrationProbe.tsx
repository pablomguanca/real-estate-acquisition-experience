import { useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Raycaster, Vector2, Vector3 } from 'three';

import { framingDistanceFactor } from '../config/scene';
import { useCalibration } from './CalibrationLayer';
import type { Vec3 } from '../types/scene';

/**
 * Sonda de calibración dentro de la escena.
 *
 * Hace dos cosas que hoy se hacen midiendo el modelo a mano:
 *
 *  1. Reporta la posición y el target de la cámara en cada frame, para que
 *     encuadrar sea mover la cámara hasta que se vea bien y copiar el
 *     resultado, en vez de adivinar coordenadas.
 *
 *  2. Devuelve el punto del mundo donde se hizo click. Es lo que convierte
 *     colocar un amenity en "click sobre la pileta" en lugar de estimar la
 *     posición contra las dimensiones del edificio.
 *
 * El raycast se hace a mano sobre la escena entera, con un oyente propio en el
 * canvas. Así la sonda no obliga a tocar ningún componente existente: se monta
 * y se desmonta sin dejar rastro.
 */

const raycaster = new Raycaster();
const pointer = new Vector2();
const worldTarget = new Vector3();

/** Lo mínimo que necesitamos de OrbitControls, sin importar su tipo real. */
interface ControlsLike {
  target: Vector3;
}

function toVec3(vector: Vector3): Vec3 {
  return [
    Math.round(vector.x * 100) / 100,
    Math.round(vector.y * 100) / 100,
    Math.round(vector.z * 100) / 100,
  ];
}

export function CalibrationProbe() {
  const calibration = useCalibration();

  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const controls = useThree((state) => state.controls) as ControlsLike | null;
  // Misma fuente que usa CameraRig: si los dos no leyeran lo mismo, la
  // corrección al copiar sería incorrecta.
  const aspect = useThree((state) => state.viewport.aspect);

  const [marker, setMarker] = useState<Vec3 | null>(null);

  // Muestreo de cámara. Escribe en una ref, nunca en estado: a 60 fps, un
  // setState acá re-renderizaría la aplicación entera sin parar.
  useFrame(() => {
    if (!calibration) return;

    const target = controls?.target ?? worldTarget.set(0, 0, 0);

    calibration.probe.current.camera = {
      position: toVec3(camera.position),
      target: toVec3(target),
      distance: Math.round(camera.position.distanceTo(target) * 10) / 10,
      polar:
        Math.round(
          Math.acos((camera.position.y - target.y) / camera.position.distanceTo(target)) *
            1000,
        ) / 1000,
      aspect: Math.round(aspect * 100) / 100,
      framingFactor: framingDistanceFactor(aspect),
    };
  });

  const pickMode = calibration?.pickMode ?? false;

  useEffect(() => {
    if (!calibration || !pickMode) return;

    const element = gl.domElement;

    const handle = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);

      // El primer impacto visible. Los volúmenes invisibles de selección
      // también aparecen acá, pero están donde está la geometría, así que el
      // punto sigue siendo correcto.
      const hit = hits[0];
      if (!hit) return;

      const point = toVec3(hit.point);
      calibration.probe.current.pickedPoint = point;
      setMarker(point);
    };

    element.addEventListener('pointerdown', handle);
    return () => element.removeEventListener('pointerdown', handle);
  }, [calibration, pickMode, gl, camera, scene]);

  if (!marker) return null;

  return (
    <group position={marker}>
      {/* Cruz de tres ejes: una esfera sola no deja ver en qué plano está. */}
      <mesh>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshBasicMaterial color="#ff4d4d" depthTest={false} />
      </mesh>
      {([
        [4, 0.12, 0.12],
        [0.12, 4, 0.12],
        [0.12, 0.12, 4],
      ] as const).map((size, index) => (
        <mesh key={index}>
          <boxGeometry args={size} />
          <meshBasicMaterial color="#ff4d4d" depthTest={false} transparent opacity={0.75} />
        </mesh>
      ))}
    </group>
  );
}
