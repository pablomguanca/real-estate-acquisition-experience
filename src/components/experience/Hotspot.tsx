import { useEffect, useRef, useState } from 'react';
import { Billboard, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

import type { Amenity } from '../../types/amenity';
import styles from './hotspot.module.scss';

/**
 * Marcador interactivo sobre un espacio del proyecto.
 *
 * Es puramente presentacional: recibe el dato y avisa cuando lo tocan. No
 * sabe qué amenity es, de dónde salió, ni qué pasa después. Eso mantiene el
 * componente estable cuando en fases futuras los datos se vuelvan unidades,
 * pisos o disponibilidad.
 *
 * El marcador es geometría 3D (se ocluye, se escala, vive en la escena) y la
 * etiqueta es DOM vía <Html>: texto nítido a cualquier zoom, estilable con
 * SCSS y legible en mobile, que con texturas de texto no se consigue.
 */

interface HotspotProps {
  amenity: Amenity;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const ACCENT = '#c9a227';

export function Hotspot({ amenity, isSelected, onSelect }: HotspotProps) {
  const [hovered, setHovered] = useState(false);
  const ringRef = useRef<Mesh>(null);

  const active = hovered || isSelected;

  // El cursor se restituye en la limpieza: si el componente se desmonta
  // mientras está en hover, el puntero quedaría en 'pointer' para siempre.
  useEffect(() => {
    if (!hovered) return;

    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  // La pulsación se escribe directo sobre la escala del objeto. Pasarla por
  // useState la convertiría en sesenta renders de React por segundo.
  useFrame((state) => {
    const ring = ringRef.current;
    if (!ring) return;

    const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.14;
    const scale = active ? pulse * 1.25 : pulse;
    ring.scale.setScalar(scale);
  });

  return (
    <group position={amenity.position}>
      <Billboard>
        {/* Anillo que late. Es el elemento que se ve de lejos. */}
        <mesh ref={ringRef}>
          <ringGeometry args={[0.78, 0.92, 48]} />
          <meshBasicMaterial
            color={ACCENT}
            transparent
            opacity={active ? 0.95 : 0.55}
            depthWrite={false}
          />
        </mesh>

        {/* Punto central, chico a propósito: el marcador tiene que señalar
            el espacio, no taparlo. */}
        <mesh>
          <circleGeometry args={[0.26, 24]} />
          <meshBasicMaterial
            color={ACCENT}
            transparent
            opacity={active ? 1 : 0.8}
            depthWrite={false}
          />
        </mesh>

        {/* Blanco de click invisible, bastante más grande que el marcador.
            Un disco de 1.6 se acierta con el dedo; un anillo de 0.9 no.
            La opacidad no afecta al raycast, así que sigue siendo clickeable. */}
        <mesh
          onPointerOver={(event) => {
            event.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(amenity.id);
          }}
        >
          <circleGeometry args={[1.6, 24]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </Billboard>

      <Html
        center
        // Por debajo de la capa de UI en DOM, para que el panel informativo
        // siempre quede por encima de las etiquetas.
        zIndexRange={[100, 0]}
        // El label no debe robarle el click al disco que tiene detrás.
        pointerEvents="none"
        position={[0, 3.1, 0]}
      >
        <span className={styles.label} data-active={active || undefined}>
          {amenity.name}
        </span>
      </Html>
    </group>
  );
}
