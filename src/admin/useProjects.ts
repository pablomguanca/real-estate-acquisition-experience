import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';

import type { UserAccess } from '../types/access';
import { getAdminDb } from './firebase';

/**
 * Los desarrollos que esta persona puede editar.
 *
 * Un editor los tiene listados en su documento de acceso, así que no hace
 * falta consultar nada. Un admin llega a todos, y ahí sí hay que leer la
 * colección.
 *
 * Esto decide qué se MUESTRA. Quien decide qué se puede escribir son las
 * reglas: si alguien manipulara esta lista desde la consola del navegador,
 * vería un desarrollo ajeno pero el servidor rechazaría cada guardado.
 */
export function useProjects(access: UserAccess) {
  const [slugs, setSlugs] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (access.role !== 'admin') {
      setSlugs(access.projects);
      return;
    }

    getDocs(collection(getAdminDb(), 'projects'))
      .then((snapshot) => {
        if (cancelled) return;
        setSlugs(snapshot.docs.map((entry) => entry.id).sort());
      })
      .catch(() => {
        if (!cancelled) setSlugs([]);
      });

    return () => {
      cancelled = true;
    };
  }, [access]);

  return slugs;
}
