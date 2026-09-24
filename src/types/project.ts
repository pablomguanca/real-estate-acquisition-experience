import type { Amenity } from './amenity';
import type { Floor } from './floor';
import type { ProjectTours } from './tour';
import type { SceneOverrides } from './scene';

/**
 * Un desarrollo inmobiliario, completo.
 *
 * Este documento es el contrato del Sistema de Adquisición: cargar un
 * desarrollo nuevo es producir uno de estos, más una carpeta de medios. Nada
 * más. Si algo de un desarrollo no cabe acá, es que todavía quedó código
 * donde debería haber datos.
 *
 * `scene` es parcial a propósito: solo lo que difiere de los defaults de la
 * plataforma. Un proyecto mínimo son treinta líneas.
 */

export interface ProjectIdentity {
  id: string;
  /** Identificador legible, usado también como carpeta de medios. */
  slug: string;
  /** Lo que se muestra en la barra superior y el overlay de entrada. */
  name: string;
  /** Línea secundaria, opcional. */
  tagline?: string;
}

export interface Project extends ProjectIdentity {
  scene: SceneOverrides;
  amenities: Amenity[];
  floors: Floor[];
  /**
   * Recorridos virtuales, uno por tipología.
   *
   * Vacío mientras no existan: la ficha esconde el botón sola en vez de
   * ofrecer un recorrido que no va a abrir nada.
   */
  tours: ProjectTours;
}

/**
 * Fuente de desarrollos.
 *
 * La experiencia lee de esta interfaz y no sabe si detrás hay un archivo en el
 * repo, Firestore o un backend propio. Es lo que permite que cambiar de fuente
 * sea implementar una interfaz en vez de tocar la aplicación.
 */
export interface ProjectRepository {
  /** Devuelve el desarrollo pedido, o null si no existe. */
  getProject(slug: string): Promise<Project | null>;
  /** Lista los desarrollos disponibles. Lo usará el selector multi-proyecto. */
  listProjects(): Promise<ProjectIdentity[]>;
}
