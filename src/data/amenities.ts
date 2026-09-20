import type { Amenity } from '../types/amenity';

/**
 * Datos de los espacios señalados en la escena.
 *
 * Son datos puros a propósito: ningún componente los tiene hardcodeados.
 * Las posiciones están calibradas contra el placeholder; cuando llegue el GLB
 * real hay que reajustarlas, y es el único lugar donde hay que hacerlo.
 */
export const AMENITIES: Amenity[] = [
  {
    id: 'pool',
    name: 'Piscina',
    description:
      'Espejo de agua exterior orientado al poniente, con solárium seco y reposeras.',
    position: [-20.5, 3.4, -11],
  },
  {
    id: 'sum',
    name: 'SUM',
    description:
      'Salón de usos múltiples con cocina de apoyo, integrado a la terraza del ala baja.',
    position: [-20.5, 8.6, 3],
  },
  {
    id: 'gym',
    name: 'Gimnasio',
    description:
      'Sala de entrenamiento vidriada sobre la explanada, con equipamiento cardio y funcional.',
    position: [-13, 3.2, 12],
  },
  {
    id: 'rooftop',
    name: 'Rooftop',
    description:
      'Terraza de remate en el nivel superior, con vistas abiertas en los cuatro frentes.',
    position: [2, 47.4, -0.6],
  },
];
