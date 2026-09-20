/**
 * Datos de prueba para los emuladores.
 *
 * Crea cuentas, permisos y un desarrollo mínimo en los emuladores locales,
 * para poder trabajar en el panel sin credenciales y sin tocar producción.
 *
 * Uso (con los emuladores corriendo):
 *   npm run seed:emulator
 *
 * No requiere cuenta de servicio: el SDK de administración, cuando ve las
 * variables de emulador, no pide credenciales. Por eso este script es seguro
 * de correr y de compartir — y por eso jamás debe apuntar a producción, cosa
 * que se verifica abajo antes de escribir nada.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'demo-atenea';

const ACCOUNTS = [
  {
    email: 'ana@demo.test',
    password: 'demo1234',
    role: 'editor' as const,
    projects: ['project-01'],
  },
  {
    email: 'atenea@demo.test',
    password: 'demo1234',
    role: 'admin' as const,
    projects: [],
  },
];

async function main() {
  // Guarda dura: sin estas variables, el SDK hablaría con el proyecto real.
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    console.error(
      'Este script solo corre contra emuladores. Levantalos primero con:\n' +
        '  npm run emulators',
    );
    process.exit(1);
  }

  initializeApp({ projectId: PROJECT_ID });

  const auth = getAuth();
  const db = getFirestore();
  const now = new Date().toISOString();

  for (const account of ACCOUNTS) {
    const user = await auth
      .getUserByEmail(account.email)
      .catch(() =>
        auth.createUser({ email: account.email, password: account.password }),
      );

    await db.collection('users').doc(user.uid).set({
      role: account.role,
      projects: account.projects,
      email: account.email,
      updatedAt: now,
    });

    console.log(`  ${account.email} (${account.role}) -> ${user.uid}`);
  }

  // Un desarrollo mínimo para tener algo que editar.
  for (const slug of ['project-01', 'project-02']) {
    const project = db.collection('projects').doc(slug);
    await project.set({ slug, name: slug.toUpperCase(), updatedAt: now });

    for (const unit of [
      { id: 'floor-08-c', floorId: 'floor-08', label: 'C', price: 194500 },
      { id: 'floor-08-a', floorId: 'floor-08', label: 'A', price: 148000 },
      { id: 'floor-01-b', floorId: 'floor-01', label: 'B', price: 121000 },
    ]) {
      await project.collection('units').doc(unit.id).set({
        status: 'disponible',
        price: unit.price,
        gallery: [],
        floorId: unit.floorId,
        label: unit.label,
        updatedAt: now,
        updatedBy: 'seed',
      });
    }

    for (const amenity of [
      { id: 'pool', name: 'Piscina', description: 'Espejo de agua exterior.' },
      { id: 'gym', name: 'Gimnasio', description: 'Sala de entrenamiento vidriada.' },
    ]) {
      await project.collection('amenities').doc(amenity.id).set({
        name: amenity.name,
        description: amenity.description,
        gallery: [],
        updatedAt: now,
        updatedBy: 'seed',
      });
    }
  }

  console.log('Emuladores sembrados. Contraseña de ambas cuentas: demo1234');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
