# Handoff para Claude Code — Fase D, Paso 4 (búsqueda sobre fuentes aprobadas) + herramienta de destino (Storyline / Genially) — versión 2

Este archivo tiene dos partes independientes:

- **Parte 1.** Campo "herramienta de destino" del curso (Storyline o Genially; un curso se produce en una sola herramienta), marca de herramienta en el catálogo de interacciones/triggers y catálogo inicial de Genially.
- **Parte 2.** Paso 4 de la Fase D: búsqueda por significado sobre las fuentes APROBADAS e INDEXADAS de un curso, con una pantalla de prueba.

Requisitos previos: Fase C (con su ajuste), Fase D paso 2 y Fase D paso 3 ya aplicadas. Si alguna falta, aplícala primero.

Instrucción para Claude Code: aplica en el orden de abajo. Si algún archivo tiene cambios propios que no aparecen aquí, muéstrame el diff antes de sobreescribir. NO escribas llaves reales en ningún archivo. Al final corre `npx prisma generate` y `npm run build`.

---

# PARTE 1 — Herramienta de destino

## 1.1 `prisma/schema.prisma`

En `model Curso` agrega:
```prisma
  herramienta String @default("storyline") // "storyline" | "genially"
```

En `model InteraccionCatalogo` agrega:
```prisma
  herramienta String @default("ambas") // "storyline" | "genially" | "ambas" (entradas compartidas, como "Otro")
  guia        String @default("")      // cuándo conviene usar este recurso (la IA lo usará en el paso 6 para elegir el más apropiado)
```

Migración: `npx prisma migrate dev --name herramienta_destino` (o `npx prisma db push`). Los cursos existentes quedan como "storyline" y todo el catálogo como "ambas", así que nada cambia hasta que se marque.

## 1.2 `lib/kickoff.ts` — agregar al final (no reemplazar el archivo)

```ts
export const OPC_HERRAMIENTA = [
  { valor: "storyline", label: "Articulate Storyline" },
  { valor: "genially", label: "Genially" },
];

// Filtro de Prisma para el catálogo según la herramienta del curso.
// Un curso usa una sola herramienta: se muestran las entradas de esa herramienta y las compartidas ("ambas").
// Si no se conoce la herramienta, no se filtra.
export function filtroHerramienta(herramienta?: string | null) {
  if (!herramienta) return undefined;
  return { herramienta: { in: [herramienta, "ambas"] } };
}
```

Y en `resumenKickoff`, agrega `herramienta: string;` al tipo del parámetro y esta línea al arreglo, justo antes de la de Fuentes:
```ts
    `Herramienta de destino: ${etiqueta(OPC_HERRAMIENTA, c.herramienta)}.`,
```

## 1.3 `components/KickoffForm.tsx` — pregunta 7

a) Importa `OPC_HERRAMIENTA` junto a los demás de `@/lib/kickoff`.

b) Estado nuevo:
```tsx
  const [herramienta, setHerramienta] = useState("storyline");
```

c) En el `body` del `fetch`, agrega `herramienta,` (por ejemplo después de `periodo`).

d) Bloque nuevo, justo debajo del bloque de Nivel/Periodo:
```tsx
      <div className="space-y-1">
        <label className={etiqueta}>7. Herramienta de destino</label>
        <select value={herramienta} onChange={(e) => setHerramienta(e.target.value)} className={campo}>
          {OPC_HERRAMIENTA.map((o) => (
            <option key={o.valor} value={o.valor}>{o.label}</option>
          ))}
        </select>
      </div>
```

## 1.4 APIs

### `app/api/cursos/route.ts` — en `POST`, dentro de `data` de `prisma.curso.create`
```ts
      herramienta: ["storyline", "genially"].includes(body.herramienta)
        ? body.herramienta
        : "storyline",
```
Y en la llamada a `resumenKickoff(...)` que arma el texto de la bitácora, pasa `herramienta: curso.herramienta`.

### `app/api/cursos/[id]/route.ts`
En `CAMPOS_TEXTO` agrega `"herramienta",`. Valida el valor en el PATCH: si viene `herramienta` y no es `storyline` ni `genially`, responde 400. Como el PATCH ya registra los cambios en la bitácora, el cambio de herramienta quedará anotado solo.

### `app/api/interacciones/route.ts`
En `GET`, lee también `herramienta` y combina con el filtro de `tipo`:
```ts
import { filtroHerramienta } from "@/lib/kickoff";
// ...
  const tipo = req.nextUrl.searchParams.get("tipo");
  const herramienta = req.nextUrl.searchParams.get("herramienta");

  const interacciones = await prisma.interaccionCatalogo.findMany({
    where: {
      ...(tipo ? { tipo } : {}),
      ...(filtroHerramienta(herramienta) ?? {}),
    },
    orderBy: { nombre: "asc" },
  });
```
En `POST`, acepta `herramienta` opcional (por defecto `"ambas"`) y `guia` opcional, y guárdalas en `data`.

## 1.5 Ficha del curso (`app/cursos/[id]/page.tsx`)

a) Importa `OPC_HERRAMIENTA` de `@/lib/kickoff`.

b) En el bloque "Ficha del curso", agrega:
```tsx
        <p className={campoFicha}>
          <span className="font-medium">Herramienta de destino:</span>{" "}
          {etiqueta(OPC_HERRAMIENTA, curso.herramienta)}
        </p>
```

c) En el `BotonEditar` de la ficha, agrega a `campos`:
```tsx
              { key: "herramienta", label: "Herramienta de destino", type: "select", opciones: OPC_HERRAMIENTA },
```
y a `valores`: `herramienta: curso.herramienta,`.

## 1.6 Usar el filtro donde se eligen interacciones y triggers

La idea: al ELEGIR una interacción o un trigger se muestran solo los compatibles con la herramienta del curso, pero al ABRIR una capa que ya tiene una interacción guardada siempre se debe encontrar su definición (aunque quedara marcada para la otra herramienta), para no romper capas existentes.

- **`app/diapositivas/[id]/page.tsx`** (lista de interacciones del selector de "Nueva capa"): carga también el curso (`include: { leccion: { include: { curso: true } } }`) y filtra con
  ```ts
  where: { tipo: "interaccion", ...(filtroHerramienta(diapositiva.leccion.curso.herramienta) ?? {}) }
  ```
- **`components/CapaEditor.tsx`**: la búsqueda de la definición de la capa actual (`todas.find((c) => c.nombre === dataCapa.interaccion)`) debe seguir usando el catálogo SIN filtrar. Si el editor tiene un selector para cambiar la interacción o para elegir tipos de trigger, ahí sí aplica el filtro: obtén la herramienta del curso de la capa (Claude Code: revisa cómo se carga la capa y agrega el curso si hace falta) y llama a `/api/interacciones?herramienta=...`.
- Si en alguna pantalla no es evidente cómo llegar al curso, dímelo antes de improvisar.

## 1.7 Catálogo inicial de Genially (`prisma/seed-genially.ts`, nuevo) y marcado del catálogo existente

Base: los recursos oficiales de Genially (interacciones: hotspots, tooltips, ventanas emergentes, clic y hover, revelar y ocultar, arrastrar y soltar, enlaces tipo web, ancla, audio al clic, programar contenido; biblioteca de widgets: flashcards, comparador de imágenes, carruseles, mosaico, menús, gráficos; y los tipos de creación: línea de tiempo, diagrama de flujo, tarjeta interactiva, imagen interactiva) más la lista de recursos que usa el equipo (flashcards, mapas conceptuales, ventanas, carruseles, tarjetas interactivas, comparaciones con imagen, composiciones de imagen y texto, cuadros, diagramas). Cada entrada lleva un campo `guia` con cuándo conviene usarla: en el paso 6 la IA lo usará para elegir el recurso más apropiado para cada contenido.

**Antes de crear el archivo, Claude Code debe:**
1. Leer una entrada existente del catálogo (por ejemplo, la de tarjetas y la de clasificación) y copiar sus convenciones: cómo se nombran los `kind`, qué significa el tipo de campo `imagen` y qué `key` espera `validar()` en `CapaEditor` para la clasificación (categorías y elementos). Si algo del seed de abajo no coincide con esas convenciones, ajustarlo para que coincida, no al revés.
2. Imprimir TODAS las entradas actuales del catálogo (`nombre`, `tipo`, `herramienta`) y mostrármelas, junto con una propuesta de cuáles marcar como `storyline` (por ejemplo, los triggers por variable o condición, los estados y la línea de tiempo de Storyline). No marques nada hasta que yo confirme la lista.

**Reglas del seed:** solo crea; si ya existe una entrada con el mismo `nombre`, la omite y lo informa (nunca sobrescribe). Asegura además que exista la entrada "Otro" de interacción y la de trigger, con `herramienta: "ambas"`.

Se ejecuta con `npx tsx --env-file=.env prisma/seed-genially.ts` (si `tsx` no está instalado, que Claude Code use la alternativa que prefiera, sin agregar dependencias de producción).

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Tipo = "corto" | "largo" | "numero" | "imagen" | "lista";
const f = (key: string, label: string, type: Tipo = "corto", opciones?: string[]) => ({
  key,
  label,
  type,
  ...(opciones ? { opciones } : {}),
});
const rep = (
  kind: string,
  itemLabel: string,
  repeatable: boolean,
  fields: ReturnType<typeof f>[],
  audioCtx: string
) => ({ kind, itemLabel, repeatable, fields, audioCtx });

type Entrada = {
  nombre: string;
  tipo: "interaccion" | "trigger";
  guia: string;
  campos: ReturnType<typeof rep>[];
};

const INTERACCIONES: Entrada[] = [
  {
    nombre: "Flashcards (tarjetas giratorias)",
    tipo: "interaccion",
    guia: "Memorizar términos, definiciones o pares pregunta-respuesta. El widget oficial admite mazos de hasta 24 tarjetas, de una o dos caras.",
    campos: [
      rep("tarjeta", "Tarjeta", true, [
        f("frente", "Frente (término o pregunta)", "largo"),
        f("reverso", "Reverso (definición o respuesta)", "largo"),
        f("imagen", "Imagen (descripción, opcional)", "imagen"),
      ], "Explica cómo girar las tarjetas y desarrolla el contenido de cada una"),
    ],
  },
  {
    nombre: "Mapa conceptual (hotspots y ventanas)",
    tipo: "interaccion",
    guia: "Mostrar cómo se relacionan varios conceptos. Se arma con elementos conectados, cada uno con una ventana emergente que amplía el concepto.",
    campos: [
      rep("nodo", "Concepto", true, [
        f("concepto", "Concepto"),
        f("relacion", "Relación con el concepto padre"),
        f("contenido", "Contenido de la ventana emergente", "largo"),
      ], "Recorre el mapa de lo general a lo particular explicando cada relación"),
    ],
  },
  {
    nombre: "Imagen interactiva (hotspots)",
    tipo: "interaccion",
    guia: "Explorar una imagen, diagrama, mapa o interfaz por zonas. Cada zona abre una ventana o etiqueta con texto, audio, imagen, video o enlace.",
    campos: [
      rep("punto", "Punto interactivo", true, [
        f("etiqueta", "Etiqueta del punto"),
        f("ubicacion", "Dónde se ubica en la imagen"),
        f("tipoContenido", "Tipo de contenido", "lista", ["Texto", "Imagen", "Audio", "Video", "Enlace"]),
        f("contenido", "Contenido que muestra", "largo"),
      ], "Presenta la imagen completa y luego explica cada punto en el orden recomendado"),
    ],
  },
  {
    nombre: "Ventana emergente",
    tipo: "interaccion",
    guia: "Ampliar un solo concepto sin cambiar de página: ejemplo, nota, advertencia o detalle técnico.",
    campos: [
      rep("ventana", "Ventana", false, [
        f("titulo", "Título"),
        f("contenido", "Contenido", "largo"),
        f("imagen", "Imagen (descripción, opcional)", "imagen"),
      ], "Explica el concepto que se abre en la ventana"),
    ],
  },
  {
    nombre: "Carrusel de imágenes",
    tipo: "interaccion",
    guia: "Mostrar una secuencia de imágenes con pie de foto: pasos de una pantalla, casos o ejemplos visuales. El widget oficial admite navegación, pies de imagen y reproducción automática.",
    campos: [
      rep("imagen", "Imagen", true, [
        f("descripcion", "Descripción de la imagen", "imagen"),
        f("pie", "Pie de imagen"),
      ], "Narra cada imagen en orden e indica qué debe observar el estudiante"),
    ],
  },
  {
    nombre: "Tarjetas interactivas (clic para revelar)",
    tipo: "interaccion",
    guia: "Presentar 3 a 6 ideas independientes del mismo nivel. Cada tarjeta revela su contenido al hacer clic.",
    campos: [
      rep("tarjeta", "Tarjeta", true, [
        f("titulo", "Título visible"),
        f("contenido", "Contenido que se revela", "largo"),
        f("imagen", "Imagen (descripción, opcional)", "imagen"),
      ], "Presenta cada tarjeta y explica su contenido con un ejemplo"),
    ],
  },
  {
    nombre: "Comparación con imagen (deslizador)",
    tipo: "interaccion",
    guia: "Comparar dos estados de la misma imagen: antes y después, correcto e incorrecto, o dos versiones. El comparador oficial es un deslizador arrastrable, vertical u horizontal.",
    campos: [
      rep("comparacion", "Comparación", false, [
        f("etiquetaA", "Etiqueta de la imagen A"),
        f("imagenA", "Imagen A (descripción)", "imagen"),
        f("etiquetaB", "Etiqueta de la imagen B"),
        f("imagenB", "Imagen B (descripción)", "imagen"),
        f("observacion", "Qué debe notar el estudiante", "largo"),
      ], "Guía la comparación indicando qué cambia al mover el deslizador"),
    ],
  },
  {
    nombre: "Composición interactiva de imagen y texto",
    tipo: "interaccion",
    guia: "Combinar una imagen principal con bloques de texto que aparecen al hacer clic, al pasar el cursor o con temporizador, para guiar la lectura.",
    campos: [
      rep("bloque", "Bloque", true, [
        f("texto", "Texto del bloque", "largo"),
        f("imagen", "Imagen (descripción, opcional)", "imagen"),
        f("comportamiento", "Cómo aparece", "lista", ["Siempre visible", "Al hacer clic", "Al pasar el cursor", "Con temporizador"]),
      ], "Relaciona cada bloque con la parte de la imagen que se explica"),
    ],
  },
  {
    nombre: "Cuadro comparativo",
    tipo: "interaccion",
    guia: "Comparar 2 o 3 elementos según criterios. En las páginas oficiales revisadas no aparece una tabla nativa como recurso, así que se arma con formas y textos; verificar en el editor antes de producir.",
    campos: [
      rep("fila", "Criterio", true, [
        f("criterio", "Criterio de comparación"),
        f("columna1", "Elemento 1", "largo"),
        f("columna2", "Elemento 2", "largo"),
        f("columna3", "Elemento 3 (opcional)", "largo"),
      ], "Compara los elementos criterio por criterio y cierra con la diferencia clave"),
    ],
  },
  {
    nombre: "Diagrama de flujo o proceso",
    tipo: "interaccion",
    guia: "Mostrar un proceso con pasos, decisiones y orden. Genially lista el diagrama de flujo entre sus tipos de creación.",
    campos: [
      rep("paso", "Paso", true, [
        f("titulo", "Título del paso"),
        f("descripcion", "Qué ocurre", "largo"),
        f("siguiente", "Paso siguiente o decisión"),
      ], "Recorre el diagrama paso a paso e indica dónde hay decisiones"),
    ],
  },
  {
    nombre: "Línea de tiempo interactiva",
    tipo: "interaccion",
    guia: "Mostrar eventos o etapas en orden cronológico. Genially incluye la línea de tiempo entre sus tipos de creación y las líneas desplazables entre sus componentes de IA.",
    campos: [
      rep("evento", "Evento", true, [
        f("fecha", "Fecha o etapa"),
        f("titulo", "Título"),
        f("descripcion", "Descripción", "largo"),
        f("imagen", "Imagen (descripción, opcional)", "imagen"),
      ], "Recorre la línea de tiempo explicando cada evento y su relación con el siguiente"),
    ],
  },
  {
    nombre: "Acordeón o pestañas (revelar y ocultar)",
    tipo: "interaccion",
    guia: "Organizar secciones largas de un mismo tema para que el estudiante abra solo lo que necesita. Se apoya en la interacción oficial de revelar y ocultar al hacer clic.",
    campos: [
      rep("seccion", "Sección", true, [
        f("titulo", "Título de la sección"),
        f("contenido", "Contenido", "largo"),
      ], "Explica cada sección en el orden en que se despliega"),
    ],
  },
  {
    nombre: "Clasificación (arrastrar y soltar)",
    tipo: "interaccion",
    guia: "Practicar la categorización: el estudiante arrastra cada elemento a su categoría. Usa la interacción oficial de arrastrar y soltar. Es práctica formativa, no evaluación sumativa.",
    campos: [
      rep("categoria", "Categoría", true, [f("nombre", "Nombre de la categoría")], "Presenta las categorías y su criterio"),
      rep("elemento", "Elemento", true, [
        f("texto", "Elemento a clasificar"),
        f("categoria", "Categoría correcta"),
        f("retro", "Retroalimentación", "largo"),
      ], "Explica por qué cada elemento pertenece a su categoría"),
    ],
  },
  {
    nombre: "Glosario con tooltips",
    tipo: "interaccion",
    guia: "Definir términos técnicos sin interrumpir la lectura. Los tooltips oficiales muestran la definición al pasar el cursor o al hacer clic.",
    campos: [
      rep("termino", "Término", true, [
        f("termino", "Término"),
        f("definicion", "Definición", "largo"),
      ], "Lee cada término con su definición"),
    ],
  },
  {
    nombre: "Menú de navegación",
    tipo: "interaccion",
    guia: "Dar acceso a las secciones de una lección. El widget oficial de menú puede mostrarse de forma automática en todas las páginas.",
    campos: [
      rep("opcion", "Opción del menú", true, [
        f("etiqueta", "Etiqueta"),
        f("destino", "Página o ancla de destino"),
      ], "Explica cómo está organizado el contenido y cómo moverse"),
    ],
  },
  {
    nombre: "Galería mosaico (zoom)",
    tipo: "interaccion",
    guia: "Mostrar varias imágenes a la vez para que el estudiante amplíe la que le interese. El widget oficial amplía cada imagen al hacer clic.",
    campos: [
      rep("imagen", "Imagen", true, [
        f("descripcion", "Descripción de la imagen", "imagen"),
        f("pie", "Pie de imagen"),
      ], "Presenta el conjunto y señala qué observar en cada imagen"),
    ],
  },
  {
    nombre: "Gráfico interactivo",
    tipo: "interaccion",
    guia: "Mostrar datos con gráficos. La biblioteca oficial ofrece más de 25 tipos, con información al pasar el cursor.",
    campos: [
      rep("config", "Configuración", false, [
        f("tipoGrafico", "Tipo de gráfico", "lista", ["Barras", "Líneas", "Circular", "Radar", "Dispersión", "Medidor"]),
        f("titulo", "Título"),
        f("lectura", "Qué debe concluir el estudiante", "largo"),
      ], "Explica cómo leer el gráfico y qué conclusión se obtiene"),
      rep("dato", "Dato", true, [f("etiqueta", "Etiqueta"), f("valor", "Valor", "numero")], "Menciona los datos más relevantes"),
    ],
  },
  {
    nombre: "Video o audio incrustado",
    tipo: "interaccion",
    guia: "Mostrar un flujo en movimiento o escuchar una explicación. Genially permite audio al hacer clic y contenido multimedia incrustado.",
    campos: [
      rep("medio", "Recurso", false, [
        f("tipo", "Tipo", "lista", ["Video", "Audio"]),
        f("descripcion", "Qué muestra o dice", "largo"),
        f("duracion", "Duración estimada"),
      ], "Introduce el recurso e indica qué debe observar o escuchar el estudiante"),
    ],
  },
  {
    nombre: "Pregunta de práctica (formativa)",
    tipo: "interaccion",
    guia: "Verificar comprensión durante la lección con retroalimentación inmediata. Genially tiene un constructor de preguntas y cuestionarios. No se usa como evaluación sumativa salvo petición expresa.",
    campos: [
      rep("pregunta", "Pregunta", true, [
        f("enunciado", "Enunciado", "largo"),
        f("opciones", "Opciones de respuesta (una por línea)", "largo"),
        f("correcta", "Respuesta correcta"),
        f("retro", "Retroalimentación", "largo"),
      ], "Lee la pregunta y, al final, explica la respuesta correcta"),
    ],
  },
  {
    nombre: "Escenario ramificado (enlaces entre páginas)",
    tipo: "interaccion",
    guia: "Practicar decisiones: cada opción lleva a una página con su consecuencia. Se apoya en los enlaces entre páginas; no aparece como plantilla en las páginas oficiales revisadas, así que verificar en el editor.",
    campos: [
      rep("decision", "Decisión", true, [
        f("situacion", "Situación"),
        f("opcion", "Opción"),
        f("consecuencia", "Consecuencia", "largo"),
        f("destino", "Página de destino"),
      ], "Plantea la situación y explica la consecuencia de cada opción"),
    ],
  },
  {
    nombre: "Simulador de pantalla (hotspots en secuencia)",
    tipo: "interaccion",
    guia: "Practicar un flujo de software: el estudiante hace clic en la zona correcta de una captura y avanza a la siguiente. Se apoya en hotspots y enlaces entre páginas; verificar en el editor.",
    campos: [
      rep("paso", "Paso", true, [
        f("captura", "Captura de pantalla (descripción)", "imagen"),
        f("zona", "Zona donde se hace clic"),
        f("instruccion", "Instrucción al estudiante"),
        f("resultado", "Qué ocurre al hacer clic", "largo"),
      ], "Guía el paso e indica la zona correcta"),
    ],
  },
];

const TRIGGERS: Entrada[] = [
  ["Al hacer clic en el elemento", "Clic: abre una ventana, revela contenido, cambia de página o reproduce audio."],
  ["Al pasar el cursor (hover)", "Hover: muestra un tooltip o resalta un elemento. No funciona igual en pantallas táctiles; no debe ser la única vía a contenido esencial."],
  ["Animación temporizada", "El elemento entra, sale o se anima tras un tiempo definido."],
  ["Programar contenido (aparece o desaparece por tiempo)", "Contenido que se muestra u oculta en momentos definidos."],
  ["Enlace a otra página o ancla", "Lleva a otra página de la Genially o a un punto de la misma página."],
  ["Reproducir audio al hacer clic", "Un elemento reproduce un audio al recibir un clic."],
  ["Revelar u ocultar al hacer clic", "Muestra u oculta un elemento con un clic."],
  ["Arrastrar y soltar", "El estudiante arrastra un elemento a una zona."],
  ["Pantalla completa", "Abre un elemento en pantalla completa."],
].map(([nombre, guia]) => ({
  nombre,
  tipo: "trigger" as const,
  guia,
  campos: [
    rep("disparador", "Disparador", false, [
      f("origen", "Elemento que lo activa"),
      f("accion", "Qué ocurre", "largo"),
      f("destino", "Destino (ventana, página o ancla)"),
    ], ""),
  ],
}));

async function main() {
  let creadas = 0;
  let omitidas = 0;

  for (const e of [...INTERACCIONES, ...TRIGGERS]) {
    const existe = await prisma.interaccionCatalogo.findUnique({ where: { nombre: e.nombre } });
    if (existe) {
      console.log(`Omitida (ya existe): ${e.nombre}`);
      omitidas++;
      continue;
    }
    await prisma.interaccionCatalogo.create({
      data: {
        nombre: e.nombre,
        tipo: e.tipo,
        itemLabel: e.campos[0]?.itemLabel ?? "",
        repeatable: e.campos[0]?.repeatable ?? true,
        campos: e.campos,
        audioCtx: e.campos[0]?.audioCtx ?? "",
        herramienta: "genially",
        guia: e.guia,
      },
    });
    console.log(`Creada: ${e.nombre}`);
    creadas++;
  }

  console.log(`Listo. Creadas: ${creadas}. Omitidas: ${omitidas}.`);
}

main().finally(() => prisma.$disconnect());
```

**Después del seed**, y solo tras mi confirmación de la lista del punto 2 de arriba, marcar como `storyline` las entradas del catálogo anterior que dependan de esa herramienta (por Prisma Studio o con un script de una sola vez).

## 1.8 Cómo probarlo
1. `/cursos/nuevo`: aparece la pregunta 7 con dos opciones; crea un curso con "Genially" y revisa la Bitácora: el kickoff menciona la herramienta.
2. En la ficha, editar la herramienta debe cambiar el valor y dejar una línea en la Bitácora.
3. Corre el seed de la sección 1.7. En un curso Genially, los selectores muestran las entradas de Genially y las compartidas, pero no las marcadas `storyline`; en un curso Storyline, al revés.
4. Abre una capa vieja que use esa interacción dentro del curso Genially: debe abrir sin errores.

---

# PARTE 2 — Paso 4: búsqueda sobre fuentes aprobadas

Qué hace: dada una consulta, devuelve los fragmentos más parecidos por significado, pero SOLO de las fuentes del curso que están aprobadas y con `estadoIndexado = "indexada"`. Las fuentes sugeridas sin aprobar y las pendientes o con error nunca se consultan. Es la base de la generación (paso 6) y del futuro chatbot para Moodle.

## 2.1 `lib/busqueda.ts` (nuevo)
```ts
import { prisma } from "@/lib/prisma";
import { obtenerIndice } from "@/lib/pinecone";

export type Resultado = {
  id: string;
  puntaje: number;
  fuenteId: string;
  titulo: string;
  pagina?: number;
  texto: string;
};

export type RespuestaBusqueda = {
  resultados: Resultado[];
  fuentesConsultadas: number;
  aviso?: string;
};

export const MAX_CONSULTA = 500;

/** Busca en las fuentes APROBADAS e INDEXADAS del curso. */
export async function buscarFuentes(
  cursoId: string,
  consulta: string,
  k = 6
): Promise<RespuestaBusqueda> {
  const fuentes = await prisma.fuente.findMany({
    where: { cursoId, aprobada: true, estadoIndexado: "indexada" },
    select: { id: true },
  });

  if (fuentes.length === 0) {
    return {
      resultados: [],
      fuentesConsultadas: 0,
      aviso:
        "Este curso no tiene fuentes aprobadas e indexadas. Aprueba e indexa al menos una en la pantalla de Fuentes.",
    };
  }

  const indice = await obtenerIndice(false);
  if (!indice) {
    return {
      resultados: [],
      fuentesConsultadas: 0,
      aviso: "El índice de Pinecone todavía no existe. Indexa una fuente primero.",
    };
  }

  const respuesta = await indice.namespace(cursoId).searchRecords({
    query: {
      topK: Math.min(Math.max(k, 1), 10),
      inputs: { text: consulta },
      // Si el compilador se queja del tipo del filtro, ajustar solo el tipo (p. ej. "as never").
      filter: { fuenteId: { $in: fuentes.map((f) => f.id) } },
    },
    fields: ["chunk_text", "fuenteId", "titulo", "pagina"],
  });

  const resultados: Resultado[] = respuesta.result.hits.map((h) => {
    const campos = h.fields as Record<string, unknown>;
    return {
      id: h._id,
      puntaje: h._score,
      fuenteId: String(campos.fuenteId ?? ""),
      titulo: String(campos.titulo ?? ""),
      pagina: typeof campos.pagina === "number" ? campos.pagina : undefined,
      texto: String(campos.chunk_text ?? ""),
    };
  });

  return { resultados, fuentesConsultadas: fuentes.length };
}
```

## 2.2 `app/api/busqueda/route.ts` (nuevo)
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarFuentes, MAX_CONSULTA } from "@/lib/busqueda";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const cursoId = String(body.cursoId ?? "");
  const consulta = String(body.consulta ?? "").trim();
  const k = Number(body.k ?? 6);

  if (!cursoId || !consulta) {
    return NextResponse.json({ error: "cursoId y consulta son obligatorios" }, { status: 400 });
  }
  if (consulta.length > MAX_CONSULTA) {
    return NextResponse.json({ error: `La consulta supera ${MAX_CONSULTA} caracteres` }, { status: 400 });
  }

  const curso = await prisma.curso.findUnique({ where: { id: cursoId }, select: { id: true } });
  if (!curso) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  try {
    const respuesta = await buscarFuentes(cursoId, consulta, Number.isFinite(k) ? k : 6);
    return NextResponse.json(respuesta);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo completar la búsqueda" },
      { status: 500 }
    );
  }
}
```

## 2.3 `components/BusquedaFuentes.tsx` (nuevo)
```tsx
"use client";

import { useState } from "react";
import type { RespuestaBusqueda } from "@/lib/busqueda";

export default function BusquedaFuentes({ cursoId }: { cursoId: string }) {
  const [consulta, setConsulta] = useState("");
  const [k, setK] = useState(6);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [respuesta, setRespuesta] = useState<RespuestaBusqueda | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!consulta.trim()) return;
    setCargando(true);
    setError("");
    setRespuesta(null);

    try {
      const res = await fetch("/api/busqueda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursoId, consulta, k }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Error en la búsqueda");
      else setRespuesta(data);
    } catch {
      setError("No se pudo conectar con el servidor");
    }
    setCargando(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={buscar} className="space-y-3">
        <textarea
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Escribe una pregunta o un tema, por ejemplo: ¿Cómo se registra una factura de venta?"
          className="border rounded px-3 py-2 text-sm w-full"
        />
        <div className="flex items-center gap-3">
          <label className="text-sm">
            Resultados:{" "}
            <select value={k} onChange={(e) => setK(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
              {[3, 6, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={cargando || !consulta.trim()}
            className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {cargando ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {respuesta?.aviso && <p className="text-sm text-amber-700">{respuesta.aviso}</p>}

      {respuesta && !respuesta.aviso && (
        <p className="text-xs text-zinc-500">
          Se consultaron {respuesta.fuentesConsultadas} fuente(s) aprobada(s). {respuesta.resultados.length} resultado(s).
        </p>
      )}

      <ul className="space-y-3">
        {respuesta?.resultados.map((r) => (
          <li key={r.id} className="border rounded p-3">
            <div className="flex justify-between gap-3 text-xs text-zinc-500 mb-1">
              <span>
                {r.titulo}
                {r.pagina !== undefined && ` — pág. ${r.pagina}`}
              </span>
              <span>similitud {r.puntaje.toFixed(2)}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{r.texto}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## 2.4 `app/cursos/[id]/busqueda/page.tsx` (nuevo)
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BusquedaFuentes from "@/components/BusquedaFuentes";

export const dynamic = "force-dynamic";

export default async function BusquedaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const curso = await prisma.curso.findUnique({
    where: { id },
    include: { fuentes: { orderBy: { createdAt: "asc" } } },
  });
  if (!curso) notFound();

  const consultables = curso.fuentes.filter((f) => f.aprobada && f.estadoIndexado === "indexada");
  const noConsultables = curso.fuentes.filter((f) => !(f.aprobada && f.estadoIndexado === "indexada"));

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <Link href={`/cursos/${curso.id}`} className="text-sm text-zinc-500">
        &larr; {curso.titulo}
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1">Búsqueda en las fuentes</h1>
      <p className="text-sm text-zinc-600 mb-6">
        Prueba qué recupera el sistema antes de generar contenido. Solo se consultan las fuentes aprobadas e indexadas.
      </p>

      <div className="border rounded p-3 mb-6 text-sm space-y-1">
        <p>
          <span className="font-medium">Consultables ({consultables.length}):</span>{" "}
          {consultables.length ? consultables.map((f) => f.titulo).join("; ") : "ninguna"}
        </p>
        {noConsultables.length > 0 && (
          <p className="text-zinc-600">
            <span className="font-medium">Excluidas ({noConsultables.length}):</span>{" "}
            {noConsultables
              .map((f) => `${f.titulo} (${!f.aprobada ? "sin aprobar" : f.estadoIndexado})`)
              .join("; ")}
          </p>
        )}
        <p className="text-xs text-zinc-500">
          Una fuente recién indexada puede tardar unos segundos en aparecer en los resultados.
        </p>
      </div>

      <BusquedaFuentes cursoId={curso.id} />
    </div>
  );
}
```

## 2.5 Enlace de acceso
En `app/cursos/[id]/page.tsx`, junto a los enlaces existentes a "Fuentes" y "Bitácora", agrega un enlace a `/cursos/${curso.id}/busqueda` con el texto "Probar búsqueda". Copia el estilo de los otros enlaces.

## 2.6 Cómo probarlo
1. Con al menos una fuente indexada y aprobada, abre `/cursos/[id]/busqueda`: arriba debe listarla como "Consultable".
2. Escribe una pregunta que el documento SÍ responda: el primer resultado debe ser un fragmento relevante, con título y página (si es PDF).
3. Escribe una pregunta totalmente ajena: los resultados deben tener similitud claramente menor. Anota los puntajes de ambos casos: sirven para fijar más adelante un umbral mínimo de relevancia.
4. Desmarca la aprobación de la fuente (si tienes una sugerida): debe pasar a "Excluidas" y dejar de aparecer en los resultados.
5. Sin fuentes consultables, la pantalla muestra el aviso en lugar de resultados.
6. Si la consulta falla con un error de Pinecone, copia el mensaje exacto para ajustarlo.
