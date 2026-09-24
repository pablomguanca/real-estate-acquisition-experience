import { useEffect, useRef, useState } from 'react';
import { Billboard, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

import type { TourLink as TourLinkData } from '../../types/tour';
import { anglesToPosition } from './tourAngles';
import styles from './UnitTour.module.scss';

/**
 * Marcador de salto dentro de una panorámica.
 *
 * Mismo lenguaje que los hotspots de la torre —anillo que late, punto al
 * centro, etiqueta en DOM— porque son la misma idea: un punto del espacio que
 * lleva a otro lado. Que se parezcan no es coherencia decorativa; es que
 * quien aprendió a tocar uno ya sabe tocar el otro.
 */

const ACCENT = '#c9a227';

interface TourLinkProps {
  link: TourLinkData;
  /** Nombre del ambiente destino, para cuando el salto no trae etiqueta. */
  destination: string;
  onFollow: (to: string) => void;
}

export function TourLink({ link, destination, onFollow }: TourLinkProps) {
  const [hovered, setHovered] = useState(false);
  const ringRef = useRef<Mesh>(null);

  // Se restituye en la limpieza: si el marcador se desmonta con el puntero
  // encima —al saltar de ambiente, justamente— el cursor quedaría en 'pointer'.
  useEffect(() => {
    if (!hovered) return;

    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  // Escrito directo sobre el objeto: pasarlo por estado serían sesenta
  // renders de React por segundo para una animación que React no necesita ver.
  useFrame((state) => {
    const ring = ringRef.current;
    if (!ring) return;

    const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.14;
    ring.scale.setScalar(hovered ? pulse * 1.25 : pulse);
  });

  return (
    <group position={anglesToPosition(link.yaw, link.pitch)}>
      <Billboard>
        <mesh ref={ringRef}>
          <ringGeometry args={[1.75, 2.05, 48]} />
          <meshBasicMaterial
            color={ACCENT}
            transparent
            opacity={hovered ? 0.95 : 0.55}
            depthWrite={false}
          />
        </mesh>

        <mesh>
          <circleGeometry args={[0.6, 24]} />
          <meshBasicMaterial
            color={ACCENT}
            transparent
            opacity={hovered ? 1 : 0.8}
            depthWrite={false}
          />
        </mesh>

        {/* Blanco de click invisible y bastante más grande que el marcador:
            un disco de cuatro unidades se acierta con el dedo, un anillo de
            dos no. La opacidad no afecta al raycast. */}
        <mesh
          onPointerOver={(event) => {
            event.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(event) => {
            // Sin esto el click llega también a la esfera de la panorámica,
            // que en modo calibración lo interpretaría como una medición.
            event.stopPropagation();
            onFollow(link.to);
          }}
        >
          <circleGeometry args={[4, 24]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </Billboard>

      <Html center pointerEvents="none" position={[0, 4.4, 0]} zIndexRange={[100, 0]}>
        <span className={styles.marker} data-active={hovered || undefined}>
          {link.label ?? destination}
        </span>
      </Html>
    </group>
  );
}
