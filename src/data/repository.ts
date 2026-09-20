import { isFirestoreConfigured } from '../services/firebase';
import type { Project, ProjectIdentity, ProjectRepository } from '../types/project';
import { applyCommercial } from './commercial/apply';
import { fetchProjectCommercial } from './commercial/firestore';
import { PROJECT_01 } from './projects/project01';

/**
 * De dónde salen los desarrollos.
 *
 * Hay dos fuentes y se usan a la vez, no en lugar una de la otra:
 *
 *   - la DEFINICIÓN (escena, pisos, footprints, posiciones) vive en el repo,
 *     porque es calibración: se mide una vez contra el modelo y se itera
 *     mirando, que contra una consola de base de datos es insufrible;
 *
 *   - el ESTADO COMERCIAL (precio, disponibilidad, textos, galerías) vive en
 *     Firestore, porque cambia todas las semanas y no puede exigir un deploy.
 */

const PROJECTS: Project[] = [PROJECT_01];

/**
 * Solo el repo. Es el camino de desarrollo y demo permanente: sin red, sin
 * credenciales y sin cuota. También es el que queda en pie si Firestore falla.
 *
 * Es async aunque lea de memoria, a propósito: si la interfaz fuera síncrona,
 * la aplicación se escribiría asumiendo datos inmediatos.
 */
export const localProjectRepository: ProjectRepository = {
  async getProject(slug) {
    return PROJECTS.find((project) => project.slug === slug) ?? null;
  },

  async listProjects(): Promise<ProjectIdentity[]> {
    return PROJECTS.map(({ id, slug, name, tagline }) => ({ id, slug, name, tagline }));
  },
};

/**
 * Definición del repo con el estado comercial de Firestore encima.
 *
 * Si Firestore falla, no hay documento todavía, o la red se cae, devuelve la
 * definición tal cual. El visitante ve precios viejos en vez de una pantalla
 * rota, que es el comportamiento correcto para una pieza comercial: una
 * experiencia caída cuesta más que un precio desactualizado.
 */
export const compositeProjectRepository: ProjectRepository = {
  async getProject(slug) {
    const definition = await localProjectRepository.getProject(slug);
    if (!definition) return null;

    try {
      const commercial = await fetchProjectCommercial(slug);
      if (!commercial) return definition;

      return applyCommercial(definition, commercial);
    } catch (error) {
      // Se avisa pero no se propaga: la degradación es intencional.
      console.warn(
        `[repository] No se pudo leer la capa comercial de "${slug}". ` +
          'Se usan los valores del archivo del desarrollo.',
        error,
      );
      return definition;
    }
  },

  listProjects: localProjectRepository.listProjects,
};

/**
 * Qué fuente usa la aplicación. Único lugar donde se decide.
 *
 * Sin configuración de Firebase cae al repositorio local sin romperse: eso
 * permite clonar el proyecto y verlo andar sin credenciales.
 */
export function getProjectRepository(): ProjectRepository {
  return isFirestoreConfigured() ? compositeProjectRepository : localProjectRepository;
}
