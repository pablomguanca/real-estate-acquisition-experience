import { describe, expect, it } from 'vitest';

import {
  MARKER_RADIUS,
  anglesToPosition,
  positionToAngles,
} from '../src/components/ui/tourAngles';

/**
 * De esto depende que el modo calibración sirva de algo.
 *
 * Quien ancla un salto hace click sobre una puerta, copia los números que le
 * devuelve el panel y los pega en los datos. Si las dos conversiones se
 * desincronizaran, cada marcador quedaría corrido unos grados respecto del
 * lugar donde se lo puso, y nadie tendría forma de darse cuenta de por qué.
 */

describe('anglesToPosition', () => {
  it('yaw y pitch en cero apuntan al frente', () => {
    // -Z es la dirección en la que mira la cámara al abrirse el recorrido.
    const [x, y, z] = anglesToPosition(0, 0);

    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(-MARKER_RADIUS);
  });

  it('yaw positivo gira a la derecha', () => {
    const [x, , z] = anglesToPosition(90, 0);

    expect(x).toBeCloseTo(MARKER_RADIUS);
    expect(z).toBeCloseTo(0);
  });

  it('pitch positivo sube', () => {
    const [, y] = anglesToPosition(0, 90);
    expect(y).toBeCloseTo(MARKER_RADIUS);
  });

  it('pitch negativo mira al piso', () => {
    const [, y] = anglesToPosition(0, -35);
    expect(y).toBeLessThan(0);
  });

  it('mantiene el radio en cualquier dirección', () => {
    for (const [yaw, pitch] of [
      [0, 0],
      [45, 20],
      [-120, -40],
      [179, 60],
    ]) {
      const [x, y, z] = anglesToPosition(yaw!, pitch!);
      expect(Math.sqrt(x * x + y * y + z * z)).toBeCloseTo(MARKER_RADIUS);
    }
  });
});

describe('positionToAngles', () => {
  it('es la inversa exacta de anglesToPosition', () => {
    // La propiedad que sostiene toda la herramienta de calibración.
    for (const yaw of [-170, -90, -33, 0, 45, 120, 179]) {
      for (const pitch of [-70, -25, 0, 15, 60]) {
        const [x, y, z] = anglesToPosition(yaw, pitch);
        expect(positionToAngles(x, y, z)).toEqual({ yaw, pitch });
      }
    }
  });

  it('no depende de la distancia al centro', () => {
    // El click cae sobre la esfera de la panorámica, que tiene otro radio que
    // la de los marcadores. Los ángulos tienen que ser los mismos igual.
    const cerca = anglesToPosition(37, -12, 5);
    const lejos = anglesToPosition(37, -12, 500);

    expect(positionToAngles(...cerca)).toEqual(positionToAngles(...lejos));
  });

  it('devuelve grados enteros', () => {
    const { yaw, pitch } = positionToAngles(...anglesToPosition(12.7, 3.4));

    expect(Number.isInteger(yaw)).toBe(true);
    expect(Number.isInteger(pitch)).toBe(true);
  });

  it('no se rompe en el centro exacto', () => {
    // Un click degenerado no debe producir NaN y dejar el marcador en la nada.
    const { yaw, pitch } = positionToAngles(0, 0, 0);

    expect(Number.isNaN(yaw)).toBe(false);
    expect(Number.isNaN(pitch)).toBe(false);
  });
});
