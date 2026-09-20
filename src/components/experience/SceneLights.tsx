import { ContactShadows } from '@react-three/drei';

import { useProject } from '../../context/ProjectContext';

/**
 * Luces directas.
 *
 * El grueso de la iluminación ambiental ya no viene de acá sino del cubemap
 * del cielo (ver Atmosphere.tsx): eso permitió sacar el ambientLight y el rim
 * artificiales, que existían solo para compensar la falta de entorno.
 *
 * Queda el sol —única luz que proyecta sombra— y un relleno frío muy suave
 * para las caras que quedan completamente de espaldas.
 */

export function SceneLights() {
  const { scene } = useProject();

  return (
    <>
      {/* Sol. Comparte azimut con el cielo (ver SUN en config/scene.ts).
          El color es casi blanco: la calidez la aporta el entorno del cielo,
          y duplicarla acá es lo que viraba todo a naranja. */}
      <directionalLight
        position={scene.sunShadowPosition}
        intensity={1.15}
        color="#fff4ea"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        // Acotado a la zona útil alrededor del conjunto: lo que se corta
        // lejos queda disuelto por la niebla y no se percibe.
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={120}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={400}
      />

      {/* Relleno frío desde el lado en sombra. Levanta apenas la cara que no
          recibe sol para que no se cierre en negro, sin matar el contraste.
          No proyecta sombra: sale gratis. */}
      <directionalLight position={[-60, 30, 70]} intensity={0.5} color="#9db0c6" />

      {/* Sombra de contacto: asienta el edificio en el piso.
          Mucho más barata y suave que depender solo del shadow map. */}
      <ContactShadows
        position={[0, 0.45, 0]}
        scale={150}
        resolution={1024}
        blur={2.8}
        far={50}
        opacity={0.5}
        color="#000000"
      />
    </>
  );
}
