import type { Project } from '../../types/project';
import { AMENITIES } from '../amenities';
import { FLOORS } from '../floors';

/**
 * PROJECT 01 — el desarrollo de referencia.
 *
 * Fijate lo corto que es: solo declara lo que difiere de los defaults de la
 * plataforma, que hoy están calibrados justamente contra este proyecto. Un
 * desarrollo real va a declarar más —otra altura, otro encuadre, otro sol—
 * pero nunca la escena entera.
 *
 * Cuando exista Firestore, este archivo es lo que el script de carga sube, y
 * también el ejemplo de qué forma tiene que tener un desarrollo nuevo.
 */
export const PROJECT_01: Project = {
  id: 'project-01',
  slug: 'project-01',
  name: 'PROJECT 01',
  tagline: 'Explorá el proyecto',

  // Vacío a propósito: este desarrollo usa los defaults tal cual. Es la
  // prueba de que la mezcla funciona.
  scene: {},

  amenities: AMENITIES,
  floors: FLOORS,
};
