import { Suspense, useEffect, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { BackSide, NoToneMapping, SRGBColorSpace } from 'three';

import { isCalibrationEnabled } from '../../calibration/CalibrationLayer';
import { resolveMedia } from '../../services/media';
import type { TourRoom } from '../../types/tour';
import { TourLink } from './TourLink';
import { positionToAngles } from './tourAngles';
import styles from './UnitTour.module.scss';

/**
 * Recorrido virtual de una unidad.
 *
 * Una panorámica equirectangular por ambiente, mapeada sobre la CARA INTERNA
 * de una esfera con la cámara en el centro. Girar la cámara es girar la
 * cabeza; no hay geometría, no hay iluminación y no hay nada que calcular.
 *
 * Esa simplicidad es la ventaja, no una limitación: la imagen viene de un
 * render offline calculado durante horas, así que se ve mejor que cualquier
 * interior en tiempo real, pesa una fracción y anda en un teléfono viejo.
 *
 * Vive en su propio Canvas, aparte del de la experiencia. Son dos escenas sin
 * nada en común —otra cámara, otros controles, otro mapeo de tonos— y
 * meterlas en el mismo lienzo obligaría a que cada componente de la torre
 * supiera que existe un recorrido.
 *
 * Se monta solo cuando se abre, así que las panorámicas —uno o dos megas cada
 * una— no pesan en la carga inicial de la experiencia.
 */

/** Radio grande y arbitrario: sin geometría cerca, la escala no significa nada. */
const SPHERE_RADIUS = 50;

function Panorama({
  path,
  onPick,
}: {
  path: string;
  onPick?: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const texture = useTexture(resolveMedia(path) ?? '');

  /*
   * Sin esto los colores salen apagados.
   *
   * Un JPEG de render viene en sRGB, pero el cargador de texturas no lo
   * asume: marcarlo es lo que hace que three lo convierta a lineal antes de
   * iluminar y de vuelta al mostrarlo.
   */
  texture.colorSpace = SRGBColorSpace;

  return (
    <mesh onClick={onPick}>
      <sphereGeometry args={[SPHERE_RADIUS, 64, 40]} />
      {/*
        BackSide porque la cámara está ADENTRO de la esfera: sin esto se
        renderiza la cara externa y no se ve nada.

        Material básico y no uno físico: la panorámica ya trae la iluminación
        cocida de fábrica. Volver a iluminarla la oscurecería.
      */}
      <meshBasicMaterial map={texture} side={BackSide} toneMapped={false} />
    </mesh>
  );
}

interface UnitTourProps {
  rooms: TourRoom[];
  /** Para el título: "Unidad 08C". */
  title: string;
  onClose: () => void;
}

export function UnitTour({ rooms, title, onClose }: UnitTourProps) {
  const [current, setCurrent] = useState(0);
  const [measured, setMeasured] = useState<{ yaw: number; pitch: number } | null>(null);

  const calibrating = isCalibrationEnabled();
  const room = rooms[current];

  // Escape cierra el recorrido. Mientras está abierto, la ficha de la unidad
  // deja de escuchar la tecla: si no, una sola pulsación cerraría las dos
  // capas y el usuario volvería a la torre sin haberlo pedido.
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  if (!room) return null;

  const go = (id: string) => {
    const index = rooms.findIndex((item) => item.id === id);
    // Un salto a un ambiente inexistente se ignora en vez de romper el
    // recorrido: un id mal escrito en los datos no debe dejar la pantalla en
    // negro delante de un comprador.
    if (index >= 0) setCurrent(index);
  };

  /** Mide dónde se hizo click, para poder anclar un salto ahí. */
  const measure = (event: ThreeEvent<MouseEvent>) => {
    const { x, y, z } = event.point;
    const angles = positionToAngles(x, y, z);

    setMeasured(angles);
    void navigator.clipboard
      ?.writeText(`"yaw": ${angles.yaw}, "pitch": ${angles.pitch}`)
      .catch(() => {
        // El portapapeles falla sin permiso o fuera de un gesto del usuario.
        // Los números quedan en pantalla igual, que es lo que importa.
      });
  };

  return (
    <div className={styles.tour} role="dialog" aria-label={`Recorrido de ${title}`}>
      <Canvas
        camera={{ position: [0, 0, 0.1], fov: 72 }}
        /*
         * Sin mapeo de tonos, a diferencia de la escena principal.
         *
         * La panorámica ya es una imagen terminada: aplicarle una curva
         * fotográfica encima es revelar dos veces el mismo negativo.
         */
        gl={{ toneMapping: NoToneMapping, antialias: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          {/* La clave fuerza a rehacer la esfera al cambiar de ambiente, para
              que el Suspense vuelva a suspender mientras carga la siguiente. */}
          <Panorama
            key={room.id}
            path={room.panorama}
            onPick={calibrating ? measure : undefined}
          />
        </Suspense>

        {room.links?.map((link) => (
          <TourLink
            key={`${room.id}-${link.to}`}
            link={link}
            destination={rooms.find((item) => item.id === link.to)?.name ?? link.to}
            onFollow={go}
          />
        ))}

        <OrbitControls
          // La cámara no se mueve, solo gira sobre sí misma.
          enablePan={false}
          enableZoom={false}
          // Invertida: arrastrar hacia la derecha tiene que mover la escena
          // hacia la derecha, como si uno empujara la imagen con el dedo.
          rotateSpeed={-0.28}
          // Sin esto, seguir arrastrando hacia arriba da vuelta el mundo.
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI - 0.15}
        />
      </Canvas>

      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Recorrido</p>
          <h2 className={styles.title}>{title}</h2>
        </div>

        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <p className={styles.hint}>{room.name} · arrastrá para mirar alrededor</p>

      {calibrating && (
        <div className={styles.calibrate}>
          <p>
            Modo calibración · ambiente <b>{room.id}</b>
          </p>
          {measured ? (
            <>
              <code>
                {`{ "to": "…", "yaw": ${measured.yaw}, "pitch": ${measured.pitch} }`}
              </code>
              <small>Copiado. Pegalo en links del ambiente y completá el destino.</small>
            </>
          ) : (
            <small>Tocá la panorámica donde quieras anclar un salto.</small>
          )}
        </div>
      )}

      {rooms.length > 1 && (
        <nav className={styles.rooms} aria-label="Ambientes">
          {rooms.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={styles.room}
              data-active={index === current || undefined}
              onClick={() => setCurrent(index)}
            >
              <img src={resolveMedia(item.panorama) ?? undefined} alt="" loading="lazy" />
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
