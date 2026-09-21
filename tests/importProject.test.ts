import { describe, expect, it } from 'vitest';

import {
  type Geometry,
  constantName,
  importProject,
  renderProjectFile,
} from '../scripts/lib/importProject';

/**
 * El importador es la pieza que decide si dar de alta un desarrollo es un
 * trabajo de una tarde o de una semana. Estos casos vienen de lo que
 * realmente sale de un Excel de una desarrolladora: separadores distintos,
 * acentos en los encabezados, moneda en los precios y errores de tipeo.
 *
 * Lo que más importa: que una planilla con un problema NO genere un archivo a
 * medias. Un desarrollo cargado con cuatro unidades faltantes es peor que uno
 * que no se cargó.
 */

const GEOMETRY: Geometry = {
  slug: 'torre-x',
  name: 'TORRE X',
  firstSlab: 6.7,
  floorHeight: 3,
  footprints: {
    A: { offset: [-3.95, 3.45], size: [7.7, 6.7] },
    B: { offset: [3.95, 3.45], size: [7.7, 6.7] },
  },
};

const CSV = [
  'Piso;Unidad;Cubierta;Balcón;Ambientes;Baños;Estado;Precio',
  '1;A;42;6;2;1;Disponible;US$ 131.000',
  '1;B;58;9;3;2;Vendido;-',
  '2;A;42;6;2;1;Disponible;US$ 133.500',
  '2;B;58;9;3;2;Reservado;US$ 178.000',
].join('\n');

describe('importProject', () => {
  it('arma pisos y unidades desde la planilla', () => {
    const { project, errors } = importProject(CSV, GEOMETRY);

    expect(errors).toEqual([]);
    expect(project!.floors).toHaveLength(2);
    expect(project!.floors[0]!.units).toHaveLength(2);
    expect(project!.slug).toBe('torre-x');
  });

  it('usa los identificadores que espera el resto del sistema', () => {
    const { project } = importProject(CSV, GEOMETRY);
    const unit = project!.floors[0]!.units[0]!;

    // El panel, las reglas y el seed se apoyan en esta forma exacta.
    expect(unit.id).toBe('floor-01-a');
    expect(unit.floorId).toBe('floor-01');
    expect(project!.floors[0]!.label).toBe('01');
  });

  it('calcula la superficie total y respeta la cubierta declarada', () => {
    const { project } = importProject(CSV, GEOMETRY);
    const unit = project!.floors[0]!.units[0]!;

    expect(unit.coveredArea).toBe(42);
    expect(unit.balconyArea).toBe(6);
    expect(unit.area).toBe(48);
  });

  it('entiende precios con formato de planilla en español', () => {
    const { project } = importProject(CSV, GEOMETRY);
    expect(project!.floors[0]!.units[0]!.price).toBe(131000);
  });

  it('una unidad vendida no publica precio', () => {
    const { project } = importProject(CSV, GEOMETRY);
    expect(project!.floors[0]!.units[1]!.price).toBeNull();
  });

  it('deriva la orientación del footprint, no de la planilla', () => {
    const { project } = importProject(CSV, GEOMETRY);
    const [a, b] = project!.floors[0]!.units;

    expect(a!.orientation).toBe('Noroeste');
    expect(b!.orientation).toBe('Noreste');
  });

  it('apila los pisos por posición y no por número comercial', () => {
    // Un edificio sin piso 13 no debe dejar un hueco de tres metros.
    const csv = [
      'piso,unidad,cubierta,ambientes',
      '12,A,42,2',
      '14,A,42,2',
    ].join('\n');

    const { project } = importProject(csv, GEOMETRY);

    expect(project!.floors.map((floor) => floor.elevation)).toEqual([6.7, 9.7]);
    expect(project!.floors.map((floor) => floor.label)).toEqual(['12', '14']);
  });

  it('acepta coma, punto y coma o tabulación sin que se lo digan', () => {
    const conComas = 'piso,unidad,cubierta,ambientes\n1,A,42,2';
    const conTabs = 'piso\tunidad\tcubierta\tambientes\n1\tA\t42\t2';

    for (const csv of [conComas, conTabs]) {
      const { project, errors } = importProject(csv, GEOMETRY);
      expect(errors).toEqual([]);
      expect(project!.floors[0]!.units[0]!.coveredArea).toBe(42);
    }
  });

  it('tolera encabezados con acentos, mayúsculas y sinónimos', () => {
    const csv = ['NIVEL;DEPTO;Superficie cubierta;Amb.', '1;A;42;2'].join('\n');
    const { project, errors } = importProject(csv, { ...GEOMETRY });

    // "Amb." no está en la lista de alias, así que esto tiene que fallar por
    // ambientes y no silenciosamente poner un valor inventado.
    expect(errors.join(' ')).toContain('ambientes');
    expect(project).toBeNull();
  });

  it('respeta las comillas de Excel', () => {
    const csv = [
      'piso,unidad,cubierta,ambientes,estado',
      '1,"A",42,2,"Disponible"',
    ].join('\n');

    const { project, errors } = importProject(csv, GEOMETRY);
    expect(errors).toEqual([]);
    expect(project!.floors[0]!.units[0]!.label).toBe('A');
  });

  it('completa los valores opcionales con defaults sensatos', () => {
    const csv = 'piso,unidad,cubierta,ambientes\n1,A,42,2';
    const { project } = importProject(csv, GEOMETRY);
    const unit = project!.floors[0]!.units[0]!;

    expect(unit.balconyArea).toBe(0);
    expect(unit.bathrooms).toBe(1);
    expect(unit.status).toBe('disponible');
    expect(unit.gallery).toEqual([]);
  });

  describe('cuando la planilla tiene problemas', () => {
    it('no genera nada si faltan columnas obligatorias', () => {
      const { project, errors } = importProject('piso;unidad\n1;A', GEOMETRY);

      expect(project).toBeNull();
      expect(errors[0]).toContain('cubierta');
    });

    it('reporta la fila tal como la ve la persona en su planilla', () => {
      const csv = [
        'piso,unidad,cubierta,ambientes',
        '1,A,42,2',
        '1,B,cuarenta,3',
      ].join('\n');

      const { project, errors } = importProject(csv, GEOMETRY);

      expect(project).toBeNull();
      expect(errors[0]).toContain('fila 3');
    });

    it('junta todos los errores en vez de frenar en el primero', () => {
      const csv = [
        'piso,unidad,cubierta,ambientes',
        'planta baja,A,42,2',
        '1,B,cuarenta,3',
        '2,C,50,cero',
      ].join('\n');

      const { errors } = importProject(csv, GEOMETRY);
      expect(errors).toHaveLength(3);
    });

    it('detecta una unidad repetida en el mismo piso', () => {
      const csv = [
        'piso,unidad,cubierta,ambientes',
        '1,A,42,2',
        '1,A,44,2',
      ].join('\n');

      const { errors } = importProject(csv, GEOMETRY);
      expect(errors[0]).toContain('repetida');
    });

    it('rechaza un estado que no existe', () => {
      const csv = 'piso,unidad,cubierta,ambientes,estado\n1,A,42,2,regalada';
      const { errors } = importProject(csv, GEOMETRY);
      expect(errors[0]).toContain('estado desconocido');
    });
  });

  describe('footprints', () => {
    it('avisa cuáles repartió solo', () => {
      const csv = [
        'piso,unidad,cubierta,ambientes',
        '1,A,42,2',
        '1,Z,50,3',
      ].join('\n');

      const { project, warnings } = importProject(csv, GEOMETRY);

      // A estaba medida en la geometría; Z no.
      expect(project!.floors[0]!.units[0]!.footprint.offset).toEqual([-3.95, 3.45]);
      expect(warnings.join(' ')).toContain('Z');
      expect(warnings.join(' ')).toContain('calibración');
    });

    it('no reparte dos tipologías en el mismo lugar', () => {
      const csv = [
        'piso,unidad,cubierta,ambientes',
        '1,A,42,2',
        '1,B,42,2',
        '1,C,42,2',
        '1,D,42,2',
      ].join('\n');

      const { project } = importProject(csv, { ...GEOMETRY, footprints: {} });
      const offsets = project!.floors[0]!.units.map((unit) =>
        unit.footprint.offset.join(','),
      );

      expect(new Set(offsets).size).toBe(4);
    });
  });

  describe('advertencias', () => {
    it('marca los pisos con distinta cantidad de unidades', () => {
      const csv = [
        'piso,unidad,cubierta,ambientes',
        '1,A,42,2',
        '1,B,42,2',
        '2,A,42,2',
      ].join('\n');

      const { warnings } = importProject(csv, GEOMETRY);
      expect(warnings.join(' ')).toContain('misma cantidad');
    });

    it('avisa cuando falta calibrar la escena', () => {
      const { warnings } = importProject(CSV, GEOMETRY);
      expect(warnings.join(' ')).toContain('defaults de la plataforma');
    });
  });
});

describe('renderProjectFile', () => {
  it('genera un módulo con el nombre de constante correcto', () => {
    const { project } = importProject(CSV, GEOMETRY);
    const source = renderProjectFile(project!);

    expect(source).toContain('export const TORRE_X: Project =');
    expect(source).toContain(`import type { Project } from '../../types/project';`);
  });

  it('deja escrito de dónde salió y qué lo pisa', () => {
    const { project } = importProject(CSV, GEOMETRY);
    const source = renderProjectFile(project!);

    // Quien abra el archivo dentro de seis meses tiene que entender que
    // reimportar borra lo que ajustó a mano.
    expect(source).toContain('npm run import');
    expect(source).toContain('pisa');
  });
});

describe('constantName', () => {
  it('convierte el slug en un identificador válido', () => {
    expect(constantName('project-01')).toBe('PROJECT_01');
    expect(constantName('torre-del-sol')).toBe('TORRE_DEL_SOL');
  });
});
