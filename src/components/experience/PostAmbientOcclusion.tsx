import { forwardRef } from 'react';
import { SSAO } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

/**
 * Oclusión ambiental.
 *
 * Oscurece los lugares donde dos superficies se encuentran: el encuentro del
 * edificio con el suelo, el hueco bajo cada balcón, el canto de las losas.
 * Es el efecto que hace que los volúmenes se apoyen en vez de flotar.
 *
 * Vive en su propio archivo porque necesita una docena de parámetros que no
 * significan nada sin explicación, y mezclarlos con el resto de la cadena
 * haría ilegible el componente que decide qué efectos hay.
 *
 * Dos cosas para saber si alguna vez hay que tocarla:
 *
 *   Se ve SUCIA (manchas grises flotando) cuando el radio es grande o la
 *   intensidad pasa de 2. Corregir bajando la intensidad, no el radio.
 *
 *   NO SE VE cuando el umbral de distancia está mal para la escala de la
 *   escena. Acá el edificio mide decenas de metros, así que los umbrales
 *   están puestos para esa escala y no para un objeto de escritorio.
 */

interface PostAmbientOcclusionProps {
  intensity: number;
  radius: number;
}

export const PostAmbientOcclusion = forwardRef<unknown, PostAmbientOcclusionProps>(
  function PostAmbientOcclusion({ intensity, radius }, ref) {
    return (
      <SSAO
        // @ts-expect-error El tipo de ref del efecto no está exportado por la
        // librería, pero EffectComposer necesita reenviarlo para registrarlo.
        ref={ref}
        blendFunction={BlendFunction.MULTIPLY}
        /*
         * A media resolución.
         *
         * Es el ajuste que más rinde de todo el post-proceso: la oclusión es
         * una señal de baja frecuencia —manchas suaves, no detalle fino— así
         * que calcularla a la mitad de ancho y alto cuesta la cuarta parte y
         * casi no se nota. Es lo que hace cualquier motor que la use en
         * tiempo real.
         */
        resolutionScale={0.5}
        // Nueve muestras en tres anillos. A resolución completa hacían falta
        // dieciséis para que no aparecieran bandas; a media resolución el
        // propio remuestreo las disimula.
        samples={9}
        rings={3}
        intensity={intensity}
        radius={radius}
        // Sin sesgo, las superficies casi paralelas se auto-oscurecen y la
        // fachada aparece manchada.
        bias={0.03}
        // La oclusión se descarta donde el cielo es visible: oscurecer el
        // fondo contra el horizonte delataría el efecto.
        distanceThreshold={0.6}
        distanceFalloff={0.12}
        rangeThreshold={0.0015}
        rangeFalloff={0.01}
        // Sin influencia de luminancia, las zonas ya iluminadas por el sol se
        // ensucian. Con ella, el efecto se concentra donde hay sombra.
        luminanceInfluence={0.6}
      />
    );
  },
);
