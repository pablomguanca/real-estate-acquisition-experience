# Dar de alta un desarrollo

Dos archivos y un comando. Lo demás es calibración.

## 1. La planilla del cliente

`unidades.csv` — lo que la desarrolladora ya tiene. Una fila por unidad.

| Columna | ¿Obligatoria? | Notas |
|---|---|---|
| `piso` | sí | Número. También vale `nivel`, `floor` |
| `unidad` | sí | `A`, `B`, `C`… También vale `depto` |
| `cubierta` | sí | m² cubiertos |
| `ambientes` | sí | |
| `balcon` | no | Por defecto 0 |
| `banos` | no | Por defecto 1 |
| `estado` | no | `disponible` / `reservado` / `vendido`. Por defecto disponible |
| `precio` | no | Acepta `US$ 131.000`. Un guion significa sin precio publicado |
| `tipologia` | no | Qué footprint usa. Por defecto, la letra de la unidad |

Separador coma, punto y coma o tabulación — se detecta solo. Los acentos y las mayúsculas del encabezado no importan.

**Si algo está mal, no se genera nada.** El importador lista todos los problemas con el número de fila tal como lo ve la planilla. Un desarrollo cargado a medias es peor que uno no cargado.

## 2. La geometría de Atenea

`geometria.json` — los diez números que se miden una sola vez contra el modelo 3D.

```json
{
  "slug": "torre-del-sol",
  "name": "TORRE DEL SOL",
  "tagline": "Explorá el proyecto",
  "firstSlab": 6.7,
  "floorHeight": 3,
  "plan": [15, 13],
  "footprints": {
    "A": { "offset": [-3.95, 3.45], "size": [7.7, 6.7] }
  },
  "scene": {}
}
```

`slug` es el identificador en la URL y la carpeta de medios en Storage.

`footprints` es dónde cae cada tipología en la planta, en metros respecto del eje de la torre. **Lo que falte se reparte solo** sobre `plan` y queda marcado como pendiente de calibrar: sirve para ver algo el mismo día, no para publicar.

`scene` son los overrides de escena. Vacío usa los defaults de la plataforma.

## 3. Importar

```bash
npm run import -- ejemplos/unidades.csv ejemplos/geometria.json
```

Genera `src/data/projects/<slug>.ts` y lo registra en el repositorio. No toca Firestore ni la red, así que se puede correr las veces que haga falta. Para pisar un desarrollo ya generado, agregá `--force`.

## 4. Calibrar

```
npm run dev
```

Abrí `http://localhost:5173/?project=<slug>&calibrate=1`, encuadrá la cámara y copiá el bloque de overrides al `scene` de la geometría. Ajustá ahí también los footprints que el importador haya repartido solo.

Reimportá con `--force` cuando termines. **Los ajustes van siempre al archivo de geometría**, nunca al archivo generado: reimportar lo pisa entero.

## 5. Publicar

```bash
npm run seed -- <slug>
```

Sube precios, estados y textos a Firestore. A partir de acá los edita el cliente desde el panel, y el archivo del desarrollo deja de mandar sobre ellos.

Después, el acceso:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "$HOME\.secrets\atenea-service-account.json"
npm run grant -- ventas@desarrolladora.com editor <slug>
```

## Recorridos virtuales

Van en el archivo de geometría, **por tipología**:

```json
"tours": {
  "2R": [
    { "id": "living", "name": "Living comedor", "panorama": "projects/torre-del-sol/tours/2r/living.jpg" },
    { "id": "dorm-1", "name": "Dormitorio principal", "panorama": "projects/torre-del-sol/tours/2r/dorm-1.jpg" }
  ]
}
```

Por tipología y no por unidad: el 1603 y el 0803 son el mismo departamento a distinta altura. En una torre de 44 unidades con 4 tipologías, la diferencia es entre pedirle al estudio 24 panorámicas o 264.

Para que funcione, la columna `tipologia` de la planilla tiene que coincidir con la clave de acá. Si la planilla no trae esa columna, se usa la letra de la unidad.

**Formato**: JPEG equirectangular, proporción 2:1 (4096 × 2048 es lo habitual). Se piden al mismo estudio que hace los renders — es la misma escena con otra cámara.

### Saltos entre ambientes

Cada ambiente puede llevar a otros con marcadores anclados a un punto de la panorámica — tocar la puerta del dormitorio y entrar, en vez de volver al menú:

```json
{
  "id": "living",
  "name": "Living comedor",
  "panorama": "projects/torre-del-sol/tours/2r/living.jpg",
  "links": [{ "to": "dorm-1", "yaw": 42, "pitch": -8 }]
}
```

Los ángulos son grados desde donde mira la cámara al abrirse el recorrido: **yaw 0 es el frente**, positivo gira a la derecha; **pitch 0 es el horizonte**, negativo mira al piso.

**No los calcules a mano.** Abrí el recorrido con `?calibrate=1`, tocá la panorámica donde quieras el salto y el panel te da el fragmento listo, ya copiado al portapapeles. Solo queda completar el destino.

Los saltos son opcionales: sin ellos el recorrido funciona igual con la lista de ambientes de abajo.

El botón "Recorrer la unidad" aparece solo cuando hay panorámicas cargadas. Sin ellas no se muestra: ofrecer un recorrido que abre una pantalla vacía es peor que no ofrecerlo.

## Lo que NO sale de la planilla

- **Los espacios comunes.** Se anclan a un punto del espacio 3D, así que se agregan a mano después de calibrar.
- **El modelo 3D.** Se sube a Storage como admin y se apunta desde `scene.model`.
- **La orientación de cada unidad.** Se deriva del footprint. Una ficha que dice "noreste" sobre una unidad dibujada al suroeste destruye la credibilidad del resto.
