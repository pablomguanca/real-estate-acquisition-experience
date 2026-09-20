import { useEffect, useState } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import type { UserAccess } from '../types/access';
import { getAdminAuth, getAdminDb } from './firebase';

/**
 * Quién está usando el panel y qué puede tocar.
 *
 * Combina dos cosas que Firebase mantiene separadas: la identidad (Auth) y el
 * permiso (el documento en users/). Estar autenticado no alcanza —un usuario
 * sin documento de acceso no puede editar nada— y esa distinción es
 * deliberada: dar de alta una cuenta y darle permiso son dos decisiones.
 *
 * Importante: esto decide qué MOSTRAR, no qué se puede hacer. Quien decide lo
 * segundo son las reglas de Firestore. Si alguien manipulara este estado desde
 * la consola del navegador, vería botones que el servidor igual va a rechazar.
 */

export type Session =
  | { status: 'loading' }
  | { status: 'signed-out' }
  /** Autenticado pero sin documento de acceso: cuenta creada, permiso no. */
  | { status: 'no-access'; user: User }
  | { status: 'ready'; user: User; access: UserAccess };

export function useSession(): Session {
  const [session, setSession] = useState<Session>({ status: 'loading' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAdminAuth(), async (user) => {
      if (!user) {
        setSession({ status: 'signed-out' });
        return;
      }

      try {
        const snapshot = await getDoc(doc(getAdminDb(), 'users', user.uid));

        if (!snapshot.exists()) {
          setSession({ status: 'no-access', user });
          return;
        }

        setSession({ status: 'ready', user, access: snapshot.data() as UserAccess });
      } catch {
        // Las reglas permiten leer el documento propio, así que un fallo acá
        // es de red o de configuración. Se trata como falta de acceso: es el
        // estado seguro.
        setSession({ status: 'no-access', user });
      }
    });

    return unsubscribe;
  }, []);

  return session;
}

/** Los desarrollos que esta persona puede editar. */
export function editableProjects(access: UserAccess, allSlugs: string[]): string[] {
  return access.role === 'admin' ? allSlugs : access.projects;
}
