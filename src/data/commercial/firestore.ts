import { getFirebaseConfig } from '../../services/firebase';
import type {
  AmenityCommercial,
  ProjectCommercial,
  UnitCommercial,
} from '../../types/commercial';

/**
 * Lectura de la capa comercial desde Firestore.
 *
 * Estructura:
 *   projects/{slug}                      metadatos del desarrollo
 *   projects/{slug}/units/{unitId}       estado comercial por unidad
 *   projects/{slug}/amenities/{id}       textos e imágenes por amenity
 *
 * Una unidad por documento y no un mapa gigante dentro del proyecto. Cuesta
 * una consulta más, pero es lo que va a necesitar el panel de Fase 6:
 * escrituras granulares, reglas de seguridad por unidad, e historial de quién
 * cambió qué. Un documento único además choca contra el límite de 1 MB
 * alrededor de las mil unidades.
 *
 * El SDK se importa DENTRO de la función, no arriba. Vite lo separa en su
 * propio chunk y solo se descarga si hay configuración de Firebase. Con el
 * import estático, los 130 kB comprimidos del SDK entraban al bundle inicial
 * de una experiencia que es, ante todo, una pieza de marketing que se abre
 * en celular.
 */

let dbPromise: Promise<unknown> | null = null;

async function getDb() {
  const config = getFirebaseConfig();
  if (!config) return null;

  if (!dbPromise) {
    dbPromise = (async () => {
      const [{ initializeApp }, { getFirestore }] = await Promise.all([
        import('firebase/app'),
        import('firebase/firestore'),
      ]);

      return getFirestore(initializeApp(config));
    })();
  }

  return dbPromise;
}

export async function fetchProjectCommercial(
  slug: string,
): Promise<ProjectCommercial | null> {
  const db = await getDb();
  if (!db) return null;

  const { collection, doc, getDoc, getDocs } = await import('firebase/firestore');

  // El tipo se pierde al pasar por la promesa cacheada; acá se recupera.
  const projectRef = doc(db as Parameters<typeof doc>[0], 'projects', slug);
  const projectSnapshot = await getDoc(projectRef);

  // Sin documento de proyecto no hay capa comercial cargada todavía. No es un
  // error: el desarrollo funciona con lo que declara su archivo.
  if (!projectSnapshot.exists()) return null;

  const [unitsSnapshot, amenitiesSnapshot] = await Promise.all([
    getDocs(collection(projectRef, 'units')),
    getDocs(collection(projectRef, 'amenities')),
  ]);

  const units: Record<string, UnitCommercial> = {};
  for (const entry of unitsSnapshot.docs) {
    units[entry.id] = entry.data() as UnitCommercial;
  }

  const amenities: Record<string, AmenityCommercial> = {};
  for (const entry of amenitiesSnapshot.docs) {
    amenities[entry.id] = entry.data() as AmenityCommercial;
  }

  return {
    slug,
    units,
    amenities,
    updatedAt: projectSnapshot.data()?.updatedAt as string | undefined,
  };
}
