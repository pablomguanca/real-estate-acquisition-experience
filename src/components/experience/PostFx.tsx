import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';

import { useProject } from '../../context/ProjectContext';
import { PostAmbientOcclusion } from './PostAmbientOcclusion';

/**
 * Post-proceso de la escena.
 *
 * Es lo que separa "un modelo 3D" de "un render". La escena cruda tiene todo
 * bien —geometría, materiales, cielo físico, sombras— y aun así se ve plana,
 * porque le faltan tres cosas que el ojo espera de una fotografía:
 *
 *   OCLUSIÓN AMBIENTAL: oscurece donde dos superficies se encuentran. Sin
 *   ella los volúmenes flotan; con ella el edificio se apoya en el suelo y
 *   los balcones tienen espesor.
 *
 *   BRILLO: los reflejos del sol sobre el vidrio sangran un poco. Es lo que
 *   distingue un vidrio de un plástico gris.
 *
 *   VIÑETEADO: oscurece las esquinas del cuadro. Es el gesto más viejo de la
 *   fotografía de arquitectura y lleva el ojo al edificio.
 *
 * Y nada más. Profundidad de campo, aberración cromática y destellos están
 * deliberadamente afuera: desenfocar lo que la gente vino a mirar es un error,
 * y los otros dos convierten una pieza de arquitectura en un videojuego.
 *
 * El orden importa: la oclusión trabaja sobre la escena sin tocar, el brillo
 * sobre el resultado iluminado, y el viñeteado al final sobre todo el cuadro.
 */

/**
 * Permite apagar el post-proceso desde la URL: /?postfx=0
 *
 * Existe para poder comparar con y sin efectos en la misma máquina y en el
 * mismo momento, que es la única forma honesta de juzgar si el costo en
 * cuadros por segundo vale lo que aporta en imagen. Mismo criterio que
 * ?calibrate=1: una herramienta de trabajo que no molesta a un visitante.
 */
function disabledByUrl(): boolean {
  return new URLSearchParams(window.location.search).get('postfx') === '0';
}

export function PostFx() {
  const { scene } = useProject();
  const { postFx } = scene;

  // La oclusión ambiental cuesta una pasada extra de normales y varias
  // muestras por píxel. En un teléfono eso es la diferencia entre 60 y 25
  // cuadros, y una experiencia que se traba impresiona menos que una plana.
  // El brillo y el viñeteado son baratos y se quedan en todos lados.
  const isSmallScreen = useThree((state) => state.size.width) < 900;

  // El composer se remonta entero si cambia esta lista, así que las opciones
  // que no cambian en vivo van memorizadas.
  const withAO = useMemo(
    () => postFx.enabled && !isSmallScreen && postFx.aoIntensity > 0,
    [postFx.enabled, postFx.aoIntensity, isSmallScreen],
  );

  if (!postFx.enabled || disabledByUrl()) return null;

  return (
    <EffectComposer
      /*
       * Multimuestreo en el composer.
       *
       * Sin esto los bordes del edificio quedan dentados, porque el antialias
       * del canvas no llega a la cadena de efectos. Dos muestras y no cuatro:
       * en geometría recta y vertical la diferencia entre 2x y 4x es difícil
       * de ver, y el ancho de banda que consume el buffer multimuestreado se
       * paga en cada cuadro.
       */
      multisampling={2}
      enableNormalPass={withAO}
    >
      {withAO ? (
        <PostAmbientOcclusion
          intensity={postFx.aoIntensity}
          radius={postFx.aoRadius}
        />
      ) : (
        <></>
      )}

      <Bloom
        intensity={postFx.bloomIntensity}
        luminanceThreshold={postFx.bloomThreshold}
        // Un borde duro de luminancia produce un halo con contorno visible.
        luminanceSmoothing={0.3}
        mipmapBlur
      />

      {/*
        El mapeo de tonos vuelve a la cadena porque la librería apaga el del
        renderer (gl.toneMapping = NoToneMapping) mientras el composer está
        montado. Sin este eslabón la escena sale en lineal: el cielo se lava,
        el contraste desaparece y se pierden las dos horas que costó calibrar
        la exposición. Es el efecto menos vistoso de los cuatro y el único
        imprescindible.
      */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />

      <Vignette
        offset={0.32}
        darkness={postFx.vignetteDarkness}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
