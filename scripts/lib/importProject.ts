import { orientationOf } from '../../src/data/queries';
import {
  detectDelimiter,
  fold,
  normalizeNumber,
  normalizePrice,
  normalizeStatus,
  splitCells,
} from '../../src/data/spreadsheet';
import type { Floor, Unit, UnitFootprint, UnitStatus } from '../../src/types/floor';
import type { Project } from '../../src/types/project';
import type { SceneOverrides } from '../../src/types/scene';

/**
 * Alta de un desarrollo desde la planilla del cliente.
 *
 * Hasta acá, sumar un desarrollo significaba escribir TypeScript a mano: once
 * pisos, cuarenta y cuatro unidades, superficies, ambientes y footprints. Eso
 * convertía cada alta en trabajo de programador, y era lo único que impedía
 * que esto fuera un producto en vez de una maqueta muy buena.
 *
 * La división que lo hace posible:
 *
 *   LA PLANILLA la tiene el cliente. Es su lista de precios: piso, unidad,
 *   superficie, ambientes, baños, estado, precio. Son cientos de filas y
 *   cambian de un día para otro.
 *
 *   LA GEOMETRÍA la mide Atenea contra el modelo 3D. Son diez números —altura
 *   de la primera losa, separación entre pisos, y dónde cae cada tipología en
 *   la planta— y se miden una sola vez.
 *
 * Multiplicadas dan el desarrollo entero. El cliente nunca toca geometría y
 * Atenea nunca transcribe una lista de precios.
 *
 * El resultado es un ARCHIVO, no una escritura en la base. La definición es
 * calibración y vive en el repositorio: así queda en el historial de git, se
 * revisa en un diff y se ajusta a mano donde el importador no acertó.
 */

export interface Geometry {
  slug: string;
  name: string;
  tagline?: string;
  /** Altura de la primera losa, en metros. */
  firstSlab: number;
  /** Separación entre losas. */
  floorHeight: number;
  /**
   * Altura del volumen de selección. Por defecto algo menos que la separación
   * entre losas, para que los volúmenes de pisos contiguos no se toquen y el
   * raycast no dude cuál eligió el usuario.
   */
  unitHeight?: number;
  /** Ancho y profundidad de la planta, para repartir las unidades. */
  plan?: [number, number];
  /** Footprints medidos. Lo que falte se reparte solo y queda marcado. */
  footprints?: Record<string, { offset: [number, number]; size: [number, number] }>;
  /** Overrides de escena, si el desarrollo ya se calibró. */
  scene?: SceneOverrides;
}

export interface ImportResult {
  project: Project | null;
  /** Impiden generar el archivo. */
  errors: string[];
  /** No lo impiden, pero hay que mirarlos antes de publicar. */
  warnings: string[];
}

/** Cómo puede llamarse cada columna en una planilla real. */
const COLUMNS = {
  floor: ['piso', 'nivel', 'floor', 'level'],
  label: ['unidad', 'depto', 'departamento', 'unit', 'ud'],
  typology: ['tipologia', 'tipo', 'typology'],
  covered: ['cubierta', 'cubiertos', 'm2 cubiertos', 'superficie cubierta', 'sup cubierta'],
  balcony: ['balcon', 'balcones', 'descubierta', 'semicubierta', 'm2 balcon'],
  rooms: ['ambientes', 'amb', 'rooms'],
  bathrooms: ['banos', 'bano', 'toilettes', 'bathrooms'],
  status: ['estado', 'status', 'disponibilidad'],
  price: ['precio', 'valor', 'price', 'lista'],
} as const;

type Column = keyof typeof COLUMNS;

const REQUIRED: Column[] = ['floor', 'label', 'covered', 'rooms'];

const DEFAULT_PLAN: [number, number] = [15, 13];

/**
 * Los volúmenes sobresalen un poco de la planta.
 *
 * Una caja ajustada al cuadrante queda enterrada dentro del núcleo opaco de
 * la torre y no se ve desde afuera. Un par de decímetros por fuera y la cara
 * exterior queda a la vista, leyéndose como una banda sobre la fachada.
 */
const OVERHANG = 0.2;

function mapHeaders(cells: string[]): Partial<Record<Column, number>> {
  const found: Partial<Record<Column, number>> = {};

  cells.forEach((cell, index) => {
    const name = fold(cell);
    for (const [column, aliases] of Object.entries(COLUMNS)) {
      if ((aliases as readonly string[]).includes(name)) {
        found[column as Column] = index;
      }
    }
  });

  return found;
}

/**
 * Reparte las tipologías que no tienen footprint medido.
 *
 * Recorre el perímetro como se numeran las unidades en un plano: la fila del
 * frente de izquierda a derecha, la del contrafrente de derecha a izquierda.
 * No pretende ser exacto —es una aproximación para poder ver algo en pantalla
 * el mismo día— y por eso siempre viaja con una advertencia.
 */
function autoPlace(index: number, total: number, plan: [number, number]): UnitFootprint {
  const [width, depth] = plan;
  const rows = total >= 4 ? 2 : 1;
  const cols = Math.ceil(total / rows);

  const row = Math.floor(index / cols);
  const rawCol = index % cols;
  // La segunda fila se recorre al revés, para cerrar el perímetro.
  const col = row % 2 === 1 ? cols - 1 - rawCol : rawCol;

  const cell: [number, number] = [width / cols, depth / rows];

  return {
    offset: [-width / 2 + cell[0] * (col + 0.5), depth / 2 - cell[1] * (row + 0.5)],
    size: [cell[0] + OVERHANG, cell[1] + OVERHANG],
  };
}

interface RawUnit {
  floorLevel: number;
  label: string;
  typology: string;
  covered: number;
  balcony: number;
  rooms: number;
  bathrooms: number;
  status: UnitStatus;
  price: number | null;
}

export function importProject(csv: string, geometry: Geometry): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');

  if (lines.length < 2) {
    return { project: null, errors: ['El archivo no tiene filas de datos.'], warnings };
  }

  const delimiter = detectDelimiter(lines[0]!);
  const headers = mapHeaders(splitCells(lines[0]!, delimiter));

  const missing = REQUIRED.filter((column) => headers[column] === undefined);
  if (missing.length > 0) {
    return {
      project: null,
      errors: [
        `Faltan columnas obligatorias: ${missing
          .map((column) => COLUMNS[column][0])
          .join(', ')}. Encabezado leído: ${lines[0]}`,
      ],
      warnings,
    };
  }

  const cell = (cells: string[], column: Column): string => {
    const index = headers[column];
    return index === undefined ? '' : (cells[index] ?? '');
  };

  const raw: RawUnit[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    // Número de línea del archivo original, que es lo que la persona ve en su
    // planilla. Reportar "fila 3" cuando el Excel dice 17 no ayuda a nadie.
    const at = `fila ${i + 1}`;
    const cells = splitCells(lines[i]!, delimiter);

    const floorLevel = normalizeNumber(cell(cells, 'floor'));
    const label = cell(cells, 'label').toUpperCase();
    const covered = normalizeNumber(cell(cells, 'covered'));
    const rooms = normalizeNumber(cell(cells, 'rooms'));

    if (floorLevel === undefined || !Number.isInteger(floorLevel)) {
      errors.push(`${at}: piso inválido ("${cell(cells, 'floor')}").`);
      continue;
    }
    if (label === '') {
      errors.push(`${at}: falta la unidad.`);
      continue;
    }
    if (covered === undefined || covered <= 0) {
      errors.push(`${at}: superficie cubierta inválida ("${cell(cells, 'covered')}").`);
      continue;
    }
    if (rooms === undefined || rooms <= 0) {
      errors.push(`${at}: ambientes inválidos ("${cell(cells, 'rooms')}").`);
      continue;
    }

    const key = `${floorLevel}-${label}`;
    if (seen.has(key)) {
      errors.push(`${at}: la unidad ${label} del piso ${floorLevel} está repetida.`);
      continue;
    }
    seen.add(key);

    const statusText = cell(cells, 'status');
    const status = statusText === '' ? 'disponible' : normalizeStatus(statusText);
    if (status === null) {
      errors.push(`${at}: estado desconocido ("${statusText}").`);
      continue;
    }

    const priceText = cell(cells, 'price');
    const price = priceText === '' ? null : normalizePrice(priceText);
    if (price === undefined) {
      errors.push(`${at}: precio ilegible ("${priceText}").`);
      continue;
    }

    raw.push({
      floorLevel,
      label,
      typology: (cell(cells, 'typology') || label).toUpperCase(),
      covered,
      balcony: normalizeNumber(cell(cells, 'balcony')) ?? 0,
      rooms,
      bathrooms: normalizeNumber(cell(cells, 'bathrooms')) ?? 1,
      status,
      price,
    });
  }

  if (errors.length > 0) return { project: null, errors, warnings };
  if (raw.length === 0) {
    return { project: null, errors: ['No quedó ninguna unidad válida.'], warnings };
  }

  // Las tipologías se numeran en el orden en que aparecen: en una planilla
  // ordenada eso es el orden del plano, que es lo que queremos repartir.
  const typologies = [...new Set(raw.map((unit) => unit.typology))];
  const plan = geometry.plan ?? DEFAULT_PLAN;
  const measured = geometry.footprints ?? {};

  const footprints = new Map<string, UnitFootprint>();
  const guessed: string[] = [];

  typologies.forEach((typology, index) => {
    const known = measured[typology];
    if (known) {
      footprints.set(typology, { offset: known.offset, size: known.size });
    } else {
      footprints.set(typology, autoPlace(index, typologies.length, plan));
      guessed.push(typology);
    }
  });

  if (guessed.length > 0) {
    warnings.push(
      `Sin footprint medido: ${guessed.join(', ')}. Se repartieron sobre una planta de ` +
        `${plan[0]} × ${plan[1]} m. Hay que ajustarlos con el modo calibración antes de publicar.`,
    );
  }

  const levels = [...new Set(raw.map((unit) => unit.floorLevel))].sort((a, b) => a - b);
  const unitHeight = geometry.unitHeight ?? geometry.floorHeight - 0.2;

  const floors: Floor[] = levels.map((level, index) => {
    const id = `floor-${String(level).padStart(2, '0')}`;

    const units: Unit[] = raw
      .filter((unit) => unit.floorLevel === level)
      .map((unit) => {
        const footprint = footprints.get(unit.typology)!;

        return {
          id: `${id}-${unit.label.toLowerCase()}`,
          floorId: id,
          label: unit.label,
          status: unit.status,
          footprint,
          area: unit.covered + unit.balcony,
          coveredArea: unit.covered,
          balconyArea: unit.balcony,
          rooms: unit.rooms,
          bathrooms: unit.bathrooms,
          orientation: orientationOf(footprint),
          // Una unidad vendida no publica precio: no es información útil y
          // ensucia la ficha.
          price: unit.status === 'vendido' ? null : unit.price,
          gallery: [],
        };
      });

    return {
      id,
      level,
      label: String(level).padStart(2, '0'),
      // La altura sale de la POSICIÓN en la lista, no del número comercial:
      // un edificio sin piso 13 no debe dejar un hueco de tres metros.
      elevation: geometry.firstSlab + index * geometry.floorHeight,
      height: unitHeight,
      units,
    };
  });

  const counts = new Set(floors.map((floor) => floor.units.length));
  if (counts.size > 1) {
    warnings.push(
      `Los pisos no tienen la misma cantidad de unidades (${[...counts].join(', ')}). ` +
        'Es legal, pero conviene confirmar que no falte una fila en la planilla.',
    );
  }

  const withoutPrice = raw.filter(
    (unit) => unit.price === null && unit.status !== 'vendido',
  ).length;
  if (withoutPrice > 0) {
    warnings.push(
      `${withoutPrice} unidad(es) sin precio y sin vender. Se publican como ` +
        '"precio no disponible".',
    );
  }

  if (!geometry.scene || Object.keys(geometry.scene).length === 0) {
    warnings.push(
      'Sin overrides de escena: el desarrollo usa los defaults de la plataforma. ' +
        'Hay que encuadrar la cámara y el modelo con el modo calibración.',
    );
  }

  return {
    project: {
      id: geometry.slug,
      slug: geometry.slug,
      name: geometry.name,
      ...(geometry.tagline ? { tagline: geometry.tagline } : {}),
      scene: geometry.scene ?? {},
      // Los espacios comunes se anclan a un punto del espacio 3D, así que no
      // salen de una planilla. Se agregan a mano después de calibrar.
      amenities: [],
      floors,
    },
    errors,
    warnings,
  };
}

/** PROJECT_01 a partir de project-01: nombre de constante para el archivo. */
export function constantName(slug: string): string {
  return slug.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * Genera el archivo del desarrollo.
 *
 * Sale explícito y no generado por bucles como PROJECT 01. Ahí las unidades
 * eran regulares y un generador se leía mejor; acá cada unidad trae datos
 * reales de una planilla, y esconderlos detrás de código haría imposible
 * corregir una superficie a mano o revisar un diff.
 */
export function renderProjectFile(project: Project): string {
  const name = constantName(project.slug);
  const json = JSON.stringify(project, null, 2)
    // Las tuplas quedan más legibles en una línea: [-3.95, 3.45].
    .replace(/\[\n\s+(-?[\d.]+),\n\s+(-?[\d.]+)\n\s+\]/g, '[$1, $2]');

  return [
    `import type { Project } from '../../types/project';`,
    '',
    '/**',
    ` * ${project.name} — generado desde planilla con \`npm run import\`.`,
    ' *',
    ' * Se puede editar a mano: a partir de acá es un archivo más del',
    ' * repositorio. Volver a importar lo pisa entero, así que si ajustaste',
    ' * footprints o escena con el modo calibración, copiá esos valores al',
    ' * archivo de geometría antes de reimportar.',
    ' *',
    ' * Lo comercial (precio, estado, galerías) se sube a Firestore con',
    ` * \`npm run seed -- ${project.slug}\` y desde ahí lo edita el cliente.`,
    ' */',
    `export const ${name}: Project = ${json};`,
    '',
  ].join('\n');
}
