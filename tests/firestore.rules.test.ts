import { readFileSync } from 'node:fs';
import {
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, deleteDoc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

/**
 * Tests de las reglas de seguridad.
 *
 * Existen porque unas reglas revisadas a ojo no son reglas verificadas, y
 * este es el único lugar del sistema donde equivocarse significa que una
 * desarrolladora edite los precios de otra.
 *
 * Corren contra el emulador de Firestore, sin tocar el proyecto real:
 *   npm run test:rules
 */

const PROJECT_ID = 'demo-atenea';

let testEnv: RulesTestEnvironment;

/** Fija quién es el autor: las reglas exigen que coincida con el uid. */
function stamp(uid: string) {
  return { updatedBy: uid, updatedAt: new Date().toISOString() };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Datos de partida, escritos salteando las reglas: representan lo que deja
  // el script de carga con cuenta de servicio.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, 'users/ana'), {
      role: 'editor',
      projects: ['project-01'],
      email: 'ana@desarrolladora.com',
    });

    await setDoc(doc(db, 'users/atenea'), {
      role: 'admin',
      projects: [],
      email: 'equipo@atenea.com',
    });

    for (const slug of ['project-01', 'project-02']) {
      await setDoc(doc(db, `projects/${slug}`), { slug, name: slug });
      await setDoc(doc(db, `projects/${slug}/units/floor-08-c`), {
        status: 'disponible',
        price: 194500,
        gallery: [],
        floorId: 'floor-08',
        label: 'C',
        ...stamp('seed'),
      });
      await setDoc(doc(db, `projects/${slug}/amenities/pool`), {
        name: 'Piscina',
        description: 'Espejo de agua exterior.',
        gallery: [],
        ...stamp('seed'),
      });
    }
  });
});

describe('lectura pública', () => {
  it('cualquiera lee una unidad sin autenticarse', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'projects/project-01/units/floor-08-c')));
  });

  it('nadie lee el documento de acceso de otro', async () => {
    const db = testEnv.authenticatedContext('ana').firestore();
    await assertFails(getDoc(doc(db, 'users/atenea')));
  });

  it('cada uno lee el suyo', async () => {
    const db = testEnv.authenticatedContext('ana').firestore();
    await assertSucceeds(getDoc(doc(db, 'users/ana')));
  });
});

describe('quién puede escribir', () => {
  it('sin autenticar, no', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(db, 'projects/project-01/units/floor-08-c'), {
        status: 'vendido',
        ...stamp('anon'),
      }),
    );
  });

  it('autenticado pero sin documento de acceso, no', async () => {
    const db = testEnv.authenticatedContext('intruso').firestore();
    await assertFails(
      updateDoc(doc(db, 'projects/project-01/units/floor-08-c'), {
        status: 'vendido',
        ...stamp('intruso'),
      }),
    );
  });

  it('un editor edita el desarrollo que tiene asignado', async () => {
    const db = testEnv.authenticatedContext('ana').firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'projects/project-01/units/floor-08-c'), {
        status: 'vendido',
        price: null,
        ...stamp('ana'),
      }),
    );
  });

  /**
   * El test que justifica todo el archivo: el aislamiento entre clientes.
   * Si esto pasara, una desarrolladora editaría los precios de otra.
   */
  it('un editor NO toca un desarrollo ajeno', async () => {
    const db = testEnv.authenticatedContext('ana').firestore();
    await assertFails(
      updateDoc(doc(db, 'projects/project-02/units/floor-08-c'), {
        status: 'vendido',
        ...stamp('ana'),
      }),
    );
  });

  it('un admin edita cualquier desarrollo', async () => {
    const db = testEnv.authenticatedContext('atenea').firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'projects/project-02/units/floor-08-c'), {
        status: 'reservado',
        ...stamp('atenea'),
      }),
    );
  });
});

describe('escalación de privilegios', () => {
  it('un editor NO puede modificar su propio acceso', async () => {
    const db = testEnv.authenticatedContext('ana').firestore();
    await assertFails(
      updateDoc(doc(db, 'users/ana'), { projects: ['project-01', 'project-02'] }),
    );
  });

  it('un editor NO puede darse el rol de admin', async () => {
    const db = testEnv.authenticatedContext('ana').firestore();
    await assertFails(updateDoc(doc(db, 'users/ana'), { role: 'admin' }));
  });

  it('nadie crea un documento de acceso desde el cliente', async () => {
    const db = testEnv.authenticatedContext('intruso').firestore();
    await assertFails(
      setDoc(doc(db, 'users/intruso'), {
        role: 'admin',
        projects: [],
        email: 'x@x.com',
      }),
    );
  });
});

describe('qué se puede cambiar', () => {
  it('no se tocan campos de estructura', async () => {
    const db = testEnv.authenticatedContext('ana').firestore();
    await assertFails(
      updateDoc(doc(db, 'projects/project-01/units/floor-08-c'), {
        label: 'Z',
        ...stamp('ana'),
      }),
    );
  });

  it('no se falsifica el autor', async () => {
    const db = testEnv.authenticatedContext('ana').firestore();
    await assertFails(
      updateDoc(doc(db, 'projects/project-01/units/floor-08-c'), {
        status: 'vendido',
        updatedBy: 'atenea',
        updatedAt: new Date().toISOString(),
      }),
    );
  });

  it('el estado tiene que ser uno de los tres válidos', async () => {
    const db = testEnv.authenticatedContext('ana').firestore();
    await assertFails(
      updateDoc(doc(db, 'projects/project-01/units/floor-08-c'), {
        status: 'regalada',
        ...stamp('ana'),
      }),
    );
  });

  it('el precio no puede ser negativo', async () => {
    const db = testEnv.authenticatedContext('ana').firestore();
    await assertFails(
      updateDoc(doc(db, 'projects/project-01/units/floor-08-c'), {
        price: -1,
        ...stamp('ana'),
      }),
    );
  });

  it('el precio puede ser null: unidad sin precio publicado', async () => {
    const db = testEnv.authenticatedContext('ana').firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'projects/project-01/units/floor-08-c'), {
        price: null,
        ...stamp('ana'),
      }),
    );
  });

  it('no se crean ni se borran unidades desde el cliente', async () => {
    const db = testEnv.authenticatedContext('ana').firestore();

    await assertFails(
      setDoc(doc(db, 'projects/project-01/units/inventada'), {
        status: 'disponible',
        price: 1,
        gallery: [],
        ...stamp('ana'),
      }),
    );

    await assertFails(deleteDoc(doc(db, 'projects/project-01/units/floor-08-c')));
  });

  it('un amenity acepta texto pero no campos nuevos', async () => {
    const db = testEnv.authenticatedContext('ana').firestore();

    await assertSucceeds(
      updateDoc(doc(db, 'projects/project-01/amenities/pool'), {
        description: 'Piscina climatizada con solárium.',
        ...stamp('ana'),
      }),
    );

    await assertFails(
      updateDoc(doc(db, 'projects/project-01/amenities/pool'), {
        position: [1, 2, 3],
        ...stamp('ana'),
      }),
    );
  });
});

describe('metadatos del desarrollo', () => {
  it('ni un admin los edita desde el cliente', async () => {
    const db = testEnv.authenticatedContext('atenea').firestore();
    await assertFails(updateDoc(doc(db, 'projects/project-01'), { name: 'Otro' }));
  });

  it('una colección no contemplada está cerrada', async () => {
    const db = testEnv.authenticatedContext('atenea').firestore();
    await assertFails(getDoc(doc(db, 'secretos/cualquiera')));
  });
});

describe('historial de cambios', () => {
  /**
   * El historial solo vale como respaldo si cumple dos cosas: que el autor no
   * se pueda falsificar y que lo escrito no se pueda tocar. Todo lo demás del
   * registro es comodidad; esto es lo que lo hace evidencia.
   */

  // El correo va en el token: las reglas lo comparan contra el de la anotación.
  const asAna = () =>
    testEnv
      .authenticatedContext('ana', { email: 'ana@desarrolladora.com' })
      .firestore();

  const asAtenea = () =>
    testEnv.authenticatedContext('atenea', { email: 'equipo@atenea.com' }).firestore();

  const entry = (overrides: Record<string, unknown> = {}) => ({
    at: '2026-09-20T18:00:00.000Z',
    by: 'ana',
    byEmail: 'ana@desarrolladora.com',
    entity: 'unit',
    entityId: 'floor-08-c',
    label: '08C',
    field: 'price',
    from: '194500',
    to: '250000',
    ...overrides,
  });

  it('un editor anota un cambio en su desarrollo', async () => {
    await assertSucceeds(
      setDoc(doc(asAna(), 'projects/project-01/history/e1'), entry()),
    );
  });

  it('un editor NO anota en un desarrollo ajeno', async () => {
    await assertFails(
      setDoc(doc(asAna(), 'projects/project-02/history/e1'), entry()),
    );
  });

  it('nadie firma una anotación con otro uid', async () => {
    await assertFails(
      setDoc(doc(asAna(), 'projects/project-01/history/e1'), entry({ by: 'atenea' })),
    );
  });

  it('nadie firma una anotación con otro correo', async () => {
    // Sin esto, el correo mostrado en pantalla sería una declaración del
    // cliente y no un dato del token: cualquiera podría atribuirle un cambio
    // a otra persona.
    await assertFails(
      setDoc(
        doc(asAna(), 'projects/project-01/history/e1'),
        entry({ byEmail: 'equipo@atenea.com' }),
      ),
    );
  });

  it('rechaza un campo que no existe en el modelo', async () => {
    await assertFails(
      setDoc(doc(asAna(), 'projects/project-01/history/e1'), entry({ field: 'position' })),
    );
  });

  it('rechaza una anotación con campos de más', async () => {
    await assertFails(
      setDoc(doc(asAna(), 'projects/project-01/history/e1'), entry({ nota: 'cualquiera' })),
    );
  });

  it('rechaza una anotación incompleta', async () => {
    const { from, ...sinFrom } = entry();
    await assertFails(setDoc(doc(asAna(), 'projects/project-01/history/e1'), sinFrom));
  });

  describe('append-only', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'projects/project-01/history/existente'),
          entry(),
        );
      });
    });

    it('ni el autor corrige lo que escribió', async () => {
      await assertFails(
        updateDoc(doc(asAna(), 'projects/project-01/history/existente'), { to: '999' }),
      );
    });

    it('ni un admin edita una anotación', async () => {
      await assertFails(
        updateDoc(doc(asAtenea(), 'projects/project-01/history/existente'), { to: '999' }),
      );
    });

    it('ni un admin borra una anotación', async () => {
      // Es la regla que sostiene todo lo demás: un historial que el
      // responsable puede limpiar no respalda nada.
      await assertFails(
        deleteDoc(doc(asAtenea(), 'projects/project-01/history/existente')),
      );
    });

    it('tampoco se pisa escribiendo encima con el mismo id', async () => {
      await assertFails(
        setDoc(doc(asAna(), 'projects/project-01/history/existente'), entry({ to: '999' })),
      );
    });

    it('el editor lee el historial de su desarrollo', async () => {
      await assertSucceeds(
        getDoc(doc(asAna(), 'projects/project-01/history/existente')),
      );
    });

    it('el público NO lee el historial', async () => {
      // Los precios son públicos; quién los cambió y cuándo es interno.
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'projects/project-01/history/existente')));
    });
  });
});

it('el archivo de reglas es el que está en el repo', () => {
  // Guarda contra el error de probar unas reglas y desplegar otras.
  expect(readFileSync('firestore.rules', 'utf8')).toContain('canEditProject');
});
