/**
 * Configuración de Firebase.
 *
 * Este módulo NO importa el SDK. Solo lee variables de entorno, y eso es
 * deliberado: lo importan el resolvedor de medios y el repositorio, que se
 * evalúan siempre. Si acá hubiera un import del SDK, los 130 kB comprimidos
 * de Firebase entrarían al bundle inicial aunque el desarrollo se lea del
 * repo local y nunca se toque la red.
 *
 * El SDK se carga dinámicamente y solo cuando hace falta (ver
 * data/commercial/firestore.ts).
 *
 * Estos valores no son secretos: viajan al cliente por diseño. Lo que protege
 * la base son las reglas de seguridad, no ocultar esta configuración.
 */

/**
 * Emuladores locales.
 *
 * Vive acá y no en admin/ porque lo necesitan dos módulos que no se conocen
 * entre sí: la conexión del panel y el resolvedor de medios. Cuando estaban
 * duplicados, el panel subía archivos al emulador y construía las URLs con el
 * bucket de producción — escribía en un lado y leía del otro.
 */
export const EMULATOR = {
  enabled: import.meta.env.VITE_USE_EMULATORS === '1',
  projectId: 'demo-atenea',
  bucket: 'demo-atenea.appspot.com',
  host: '127.0.0.1',
  authPort: 9099,
  firestorePort: 8080,
  storagePort: 9199,
};

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  appId?: string;
}

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Mínimo indispensable para leer documentos. */
export function isFirestoreConfigured(): boolean {
  // Con emuladores siempre hay a dónde ir, aunque .env.local esté vacío.
  return EMULATOR.enabled || Boolean(config.apiKey && config.projectId);
}

/**
 * Con qué proyecto habla la aplicación.
 *
 * La rama de emuladores está ACÁ y no en cada consumidor a propósito. Cuando
 * el panel decidía por su cuenta, terminó escribiendo en el emulador y
 * leyendo de producción. Un solo lugar decide, y todos —panel, experiencia
 * pública y resolvedor de medios— quedan obligados a coincidir.
 *
 * El prefijo demo- en el projectId le avisa al SDK que no intente hablar con
 * servicios reales, así que una credencial de mentira alcanza.
 */
export function getFirebaseConfig(): FirebaseConfig | null {
  if (EMULATOR.enabled) {
    return {
      apiKey: 'demo-key',
      projectId: EMULATOR.projectId,
      storageBucket: EMULATOR.bucket,
    };
  }

  if (!isFirestoreConfigured()) return null;

  return {
    apiKey: config.apiKey!,
    authDomain: config.authDomain,
    projectId: config.projectId!,
    storageBucket: config.storageBucket,
    appId: config.appId,
  };
}

export function getStorageBucket(): string | null {
  return config.storageBucket || null;
}
