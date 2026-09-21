import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  type Geometry,
  constantName,
  importProject,
  renderProjectFile,
} from './lib/importProject';

/**
 * Da de alta un desarrollo desde la planilla del cliente.
 *
 * Uso:
 *   npm run import -- <unidades.csv> <geometria.json>
 *   npm run import -- ejemplos/unidades.csv ejemplos/geometria.json --force
 *
 * Genera src/data/projects/<slug>.ts y lo registra en el repositorio, que son
 * los dos únicos lugares donde vivía el trabajo manual. Después queda:
 *
 *   1. calibrar la escena con ?calibrate=1 y pegar los overrides
 *   2. npm run seed -- <slug>   para subir precios y estados a Firestore
 *   3. dar acceso al cliente con npm run grant
 *
 * No toca Firestore ni la red: escribe archivos y nada más. Eso lo hace
 * seguro de correr las veces que haga falta mientras se ajusta la geometría.
 */

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const [csvPath, geometryPath] = args.filter((arg) => !arg.startsWith('--'));

  if (!csvPath || !geometryPath) {
    fail(
      'Uso: npm run import -- <unidades.csv> <geometria.json>\n' +
        '  Ejemplo: npm run import -- ejemplos/unidades.csv ejemplos/geometria.json',
    );
  }

  if (!existsSync(csvPath)) fail(`No existe la planilla "${csvPath}".`);
  if (!existsSync(geometryPath)) fail(`No existe la geometría "${geometryPath}".`);

  let geometry: Geometry;
  try {
    geometry = JSON.parse(readFileSync(geometryPath, 'utf8')) as Geometry;
  } catch (error) {
    fail(`La geometría no es JSON válido: ${(error as Error).message}`);
  }

  for (const field of ['slug', 'name', 'firstSlab', 'floorHeight'] as const) {
    if (geometry[field] === undefined) fail(`Falta "${field}" en la geometría.`);
  }

  const { project, errors, warnings } = importProject(readFileSync(csvPath, 'utf8'), geometry);

  if (errors.length > 0 || !project) {
    console.error(`\n✗ La planilla tiene ${errors.length} problema(s):\n`);
    // Todos juntos y no el primero: quien corrige la planilla quiere
    // arreglarlos de una pasada, no descubrirlos de a uno.
    for (const error of errors) console.error(`   ${error}`);
    console.error('\nNo se generó ningún archivo.\n');
    process.exit(1);
  }

  const target = resolve('src/data/projects', `${project.slug}.ts`);

  if (existsSync(target) && !force) {
    fail(
      `Ya existe ${project.slug}.ts. Si querés reemplazarlo, agregá --force.\n` +
        '  Ojo: se pisan los ajustes hechos a mano sobre ese archivo.',
    );
  }

  writeFileSync(target, renderProjectFile(project));

  const registered = register(project.slug);

  const units = project.floors.reduce((total, floor) => total + floor.units.length, 0);

  console.log(`\n✓ ${project.name}: ${project.floors.length} pisos, ${units} unidades.`);
  console.log(`  src/data/projects/${project.slug}.ts`);
  console.log(`  ${registered ? 'Registrado en' : 'Ya estaba registrado en'} data/repository.ts`);

  if (warnings.length > 0) {
    console.log(`\n  Revisá antes de publicar:`);
    for (const warning of warnings) console.log(`   · ${warning}`);
  }

  console.log(`\n  Siguiente: npm run dev y abrí /?project=${project.slug}&calibrate=1\n`);
}

/**
 * Suma el desarrollo a la lista que sirve la aplicación.
 *
 * Es el paso que convierte "generé un archivo" en "el desarrollo existe". Sin
 * esto el alta queda a medias y el error aparece recién al abrir la URL, que
 * es el peor momento para descubrirlo.
 */
function register(slug: string): boolean {
  const path = resolve('src/data/repository.ts');
  const source = readFileSync(path, 'utf8');
  const name = constantName(slug);

  if (source.includes(`projects/${slug}'`)) return false;

  const importLine = `import { ${name} } from './projects/${slug}';`;
  const anchor = `import { PROJECT_01 } from './projects/project01';`;

  if (!source.includes(anchor)) {
    throw new Error(
      'No encontré dónde registrar el desarrollo en data/repository.ts. ' +
        `Agregá a mano:\n  ${importLine}\n  y sumá ${name} al array PROJECTS.`,
    );
  }

  const updated = source
    .replace(anchor, `${anchor}\n${importLine}`)
    .replace(/const PROJECTS: Project\[\] = \[([^\]]*)\];/, (_, current: string) => {
      const entries = current
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

      return `const PROJECTS: Project[] = [${[...entries, name].join(', ')}];`;
    });

  writeFileSync(path, updated);
  return true;
}

main();
