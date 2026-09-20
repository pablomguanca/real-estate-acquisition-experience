/**
 * Carga inicial de la capa comercial en Firestore.
 *
 * Lee la definición del desarrollo desde el repo y sube a Firestore SOLO lo
 * editable: estado, precio y galería por unidad; textos por amenity. Nada de
 * calibración, que se queda en el archivo.
 *
 * Uso (PowerShell):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "$HOME\.secrets\atenea-service-account.json"
 *   npm run seed -- project-01
 *
 * La clave de cuenta de servicio SÍ es un secreto, a diferencia de la
 * configuración web: da acceso de administrador y saltea todas las reglas.
 * Por eso vive FUERA del proyecto, no donde se copia, se comprime o se
 * versiona el código. Se descarga de Firebase Console > Configuración >
 * Cuentas de servicio.
 *
 * Es idempotente: correrlo dos veces deja el mismo resultado. Pero pisa lo
 * que haya en Firestore, así que una vez que el cliente empiece a editar
 * precios, correrlo vuelve a los valores del archivo. A partir de ese momento
 * es una herramienta de alta, no de mantenimiento.
 */
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { PROJECT_01 } from '../src/data/projects/project01';
import type { Project } from '../src/types/project';

const PROJECTS: Project[] = [PROJECT_01];

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error('Falta el slug del desarrollo. Ejemplo: npm run seed -- project-01');
    process.exit(1);
  }

  const project = PROJECTS.find((candidate) => candidate.slug === slug);

  if (!project) {
    console.error(`No existe el desarrollo "${slug}" en el repositorio local.`);
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      'Falta GOOGLE_APPLICATION_CREDENTIALS apuntando a la clave de cuenta de servicio.',
    );
    process.exit(1);
  }

  initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  const projectRef = db.collection('projects').doc(project.slug);
  const now = new Date().toISOString();

  await projectRef.set(
    { slug: project.slug, name: project.name, updatedAt: now },
    { merge: true },
  );

  // Un lote por colección. Firestore admite 500 operaciones por lote; con
  // torres de más de 500 unidades habría que partirlo.
  const unitsBatch = db.batch();
  let unitCount = 0;

  for (const floor of project.floors) {
    for (const unit of floor.units) {
      unitsBatch.set(
        projectRef.collection('units').doc(unit.id),
        {
          status: unit.status,
          price: unit.price,
          gallery: unit.gallery,
          // Denormalizado a propósito: el panel necesita listar y filtrar
          // unidades sin cargar además la definición del desarrollo.
          floorId: unit.floorId,
          label: unit.label,
          // Marca de autoría, igual que la que exigen las reglas a los
          // editores. Deja explícito en el historial qué vino de la carga
          // inicial y qué editó una persona.
          updatedAt: now,
          updatedBy: 'seed',
        },
        { merge: true },
      );
      unitCount += 1;
    }
  }

  await unitsBatch.commit();

  const amenitiesBatch = db.batch();

  for (const amenity of project.amenities) {
    amenitiesBatch.set(
      projectRef.collection('amenities').doc(amenity.id),
      {
        name: amenity.name,
        description: amenity.description,
        gallery: [],
        updatedAt: now,
        updatedBy: 'seed',
      },
      { merge: true },
    );
  }

  await amenitiesBatch.commit();

  console.log(
    `Cargado "${project.slug}": ${unitCount} unidades y ${project.amenities.length} amenities.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
