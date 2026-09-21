import { type FirebaseApp, initializeApp } from 'firebase/app';
import { type Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { type Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import {
  type FirebaseStorage,
  connectStorageEmulator,
  getStorage,
} from 'firebase/storage';

import { EMULATOR, getFirebaseConfig } from '../services/firebase';

/**
 * Conexión de Firebase para el panel.
 *
 * Separada de services/firebase.ts a propósito: ese módulo no importa el SDK
 * para no meterlo en el bundle público. Acá importarlo es esperable —el panel
 * no existe sin Firebase— y así cada app paga solo lo que usa. La
 * configuración sí se comparte, que es lo que tiene que estar sincronizado.
 *
 * Con VITE_USE_EMULATORS=1 apunta a los emuladores locales. Eso permite
 * probar autenticación, roles y escrituras contra las reglas reales sin tocar
 * datos de producción y sin necesitar credenciales.
 */

const USE_EMULATORS = EMULATOR.enabled;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function isAdminConfigured(): boolean {
  return getFirebaseConfig() !== null;
}

function getApp(): FirebaseApp {
  if (app) return app;

  // Incluida la rama de emuladores: la decide getFirebaseConfig, no acá.
  const config = getFirebaseConfig();

  if (!config) {
    throw new Error(
      'Falta la configuración de Firebase. Completá .env.local, o usá ' +
        'VITE_USE_EMULATORS=1 para trabajar contra los emuladores.',
    );
  }

  app = initializeApp(config);
  return app;
}

export function getAdminAuth(): Auth {
  if (!auth) {
    auth = getAuth(getApp());
    if (USE_EMULATORS) {
      connectAuthEmulator(auth, `http://${EMULATOR.host}:${EMULATOR.authPort}`, {
        disableWarnings: true,
      });
    }
  }

  return auth;
}

export function getAdminDb(): Firestore {
  if (!db) {
    db = getFirestore(getApp());
    if (USE_EMULATORS) {
      connectFirestoreEmulator(db, EMULATOR.host, EMULATOR.firestorePort);
    }
  }

  return db;
}

export function getAdminStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getApp());
    if (USE_EMULATORS) {
      connectStorageEmulator(storage, EMULATOR.host, EMULATOR.storagePort);
    }
  }

  return storage;
}

export function isUsingEmulators(): boolean {
  return USE_EMULATORS;
}
