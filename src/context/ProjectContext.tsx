import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { resolveScene } from '../config/scene';
import { getProjectRepository } from '../data/repository';
import type { Project } from '../types/project';
import type { ResolvedScene } from '../types/scene';

/**
 * El desarrollo cargado, disponible para todo el árbol.
 *
 * Es la primera vez que este proyecto usa un contexto y vale justificarlo: no
 * es una librería de estado ni estado compartido mutable. Es un dato inmutable
 * que se carga una vez y necesitan quince componentes a distinta profundidad,
 * dentro y fuera del Canvas. Pasarlo por props sería atravesar toda la
 * aplicación con un prop que nunca cambia.
 *
 * El proveedor solo renderiza a sus hijos con los datos listos. Así ningún
 * consumidor tiene que contemplar el caso "todavía no cargó", que de otro modo
 * ensuciaría cada componente de la escena.
 */

export interface ProjectContextValue {
  project: Project;
  /** La escena del proyecto mezclada sobre los defaults, con sus derivados. */
  scene: ResolvedScene;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProject(): ProjectContextValue {
  const value = useContext(ProjectContext);

  if (!value) {
    throw new Error('useProject se usó fuera de <ProjectGate>');
  }

  return value;
}

/**
 * Vuelve a proveer el contexto del lado de adentro del <Canvas>.
 *
 * React Three Fiber monta sus hijos en un reconciliador propio, así que los
 * proveedores del árbol de afuera NO son visibles adentro de la escena. Sin
 * este puente, cada componente 3D que llame a useProject explota.
 *
 * Es el mismo contexto, provisto dos veces: una por ProjectGate para la UI en
 * DOM, y otra acá adentro para la escena. Así useProject se usa igual de los
 * dos lados y ningún componente necesita saber de qué lado está.
 */
export function ProjectBridge({
  value,
  children,
}: {
  value: ProjectContextValue;
  children: ReactNode;
}) {
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; project: Project };

interface ProjectGateProps {
  slug: string;
  renderLoading: () => ReactNode;
  renderError: (message: string) => ReactNode;
  children: ReactNode;
}

export function ProjectGate({
  slug,
  renderLoading,
  renderError,
  children,
}: ProjectGateProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    setState({ status: 'loading' });

    getProjectRepository()
      .getProject(slug)
      .then((project) => {
        if (cancelled) return;

        if (!project) {
          setState({ status: 'error', message: `No se encontró el desarrollo "${slug}".` });
          return;
        }

        setState({ status: 'ready', project });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Error desconocido.';
        setState({ status: 'error', message });
      });

    // La bandera evita escribir estado si el slug cambia mientras había una
    // carga en vuelo: sin esto, la respuesta vieja puede pisar a la nueva.
    return () => {
      cancelled = true;
    };
  }, [slug]);

  /**
   * El título de la pestaña lleva el nombre del desarrollo.
   *
   * No es cosmética: la plataforma sirve a varios clientes desde el mismo
   * sitio, y este texto es lo que aparece en la pestaña, en el marcador y en
   * la vista previa de un link compartido por WhatsApp. Un título fijo hace
   * que el desarrollo de una inmobiliaria se anuncie con el nombre de otra.
   */
  useEffect(() => {
    if (state.status !== 'ready') return;
    document.title = state.project.name;
  }, [state]);

  const value = useMemo<ProjectContextValue | null>(() => {
    if (state.status !== 'ready') return null;

    return {
      project: state.project,
      scene: resolveScene(state.project.scene),
    };
  }, [state]);

  if (state.status === 'loading') return <>{renderLoading()}</>;
  if (state.status === 'error') return <>{renderError(state.message)}</>;
  if (!value) return null;

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
