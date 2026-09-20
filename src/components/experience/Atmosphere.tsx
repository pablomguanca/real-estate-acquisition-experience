import { useEffect } from 'react';
import { Sky } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { PMREMGenerator, Scene } from 'three';
import { Sky as SkyMesh } from 'three/examples/jsm/objects/Sky.js';

import { useProject } from '../../context/ProjectContext';

/**
 * Cielo visible + entorno de reflejos, derivados del mismo modelo atmosférico.
 *
 * Seguimos sin descargar ningún HDRI: el shader Sky de three calcula la
 * dispersión atmosférica de Preetham por código. La misma cúpula se renderiza
 * una vez a un cubemap (PMREM) que alimenta los reflejos, así el vidrio de la
 * torre refleja el cielo real que tiene encima y no un estudio inventado.
 */

/**
 * Entorno de iluminación por imagen, generado una sola vez desde el cielo.
 * No renderiza nada: solo escribe scene.environment.
 */
function SkyEnvironment() {
  const { scene: settings } = useProject();
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  // skySettings y no sky: adentro del efecto hay una instancia del shader que
  // también se llama sky, y la colisión pasaba silenciosamente por tipos.
  const { sky: skySettings, atmosphere, sunPosition } = settings;

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);

    // Una segunda instancia del cielo, aislada en su propia escena. El cube
    // camera del PMREM tiene que quedar adentro de la cúpula, por eso la
    // escala es chica: el shader depende de la dirección de vista, no del
    // tamaño, así que se ve idéntica.
    const sky = new SkyMesh();
    sky.scale.setScalar(60);

    const uniforms = sky.material.uniforms;
    uniforms.turbidity.value = skySettings.turbidity;
    uniforms.rayleigh.value = skySettings.rayleigh;
    uniforms.mieCoefficient.value = skySettings.mieCoefficient;
    uniforms.mieDirectionalG.value = skySettings.mieDirectionalG;
    uniforms.sunPosition.value.set(...sunPosition);

    const skyScene = new Scene();
    skyScene.add(sky);

    const target = pmrem.fromScene(skyScene, 0, 0.1, 200);

    scene.environment = target.texture;
    scene.environmentIntensity = atmosphere.environmentIntensity;

    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
      sky.geometry.dispose();
      sky.material.dispose();
    };
  }, [gl, scene, skySettings, atmosphere, sunPosition]);

  return null;
}

export function Atmosphere() {
  const { scene } = useProject();
  const { sky, atmosphere, sunPosition } = scene;

  return (
    <>
      <fog attach="fog" args={[atmosphere.fogColor, atmosphere.fogNear, atmosphere.fogFar]} />

      <Sky
        distance={sky.distance}
        sunPosition={sunPosition}
        turbidity={sky.turbidity}
        rayleigh={sky.rayleigh}
        mieCoefficient={sky.mieCoefficient}
        mieDirectionalG={sky.mieDirectionalG}
      />

      <SkyEnvironment />
    </>
  );
}
