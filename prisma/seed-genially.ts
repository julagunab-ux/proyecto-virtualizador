import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Convenciones del catálogo (ver prisma/seed.tsx):
// - kind en plural para repeaters repetibles ("tarjetas", "nodos"...).
// - La clasificación usa los kinds "categorias" (key "nombre") y "elementos" (key "categoria"),
//   que son los que cruza validar() en CapaEditor.
// - El tipo "imagen" es para imágenes obligatorias; la imagen opcional ya la da la casilla
//   "Tiene imagen" de cada ítem.
// - Los triggers no llevan campos.

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
      rep("tarjetas", "Tarjeta", true, [
        f("frente", "Frente (término o pregunta)", "largo"),
        f("reverso", "Reverso (definición o respuesta)", "largo"),
      ], "Explica cómo girar las tarjetas y desarrolla el contenido de cada una"),
    ],
  },
  {
    nombre: "Mapa conceptual (hotspots y ventanas)",
    tipo: "interaccion",
    guia: "Mostrar cómo se relacionan varios conceptos. Se arma con elementos conectados, cada uno con una ventana emergente que amplía el concepto.",
    campos: [
      rep("nodos", "Concepto", true, [
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
      rep("puntos", "Punto interactivo", true, [
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
      ], "Explica el concepto que se abre en la ventana"),
    ],
  },
  {
    nombre: "Carrusel de imágenes",
    tipo: "interaccion",
    guia: "Mostrar una secuencia de imágenes con pie de foto: pasos de una pantalla, casos o ejemplos visuales. El widget oficial admite navegación, pies de imagen y reproducción automática.",
    campos: [
      rep("imagenes", "Imagen", true, [
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
      rep("tarjetas", "Tarjeta", true, [
        f("titulo", "Título visible"),
        f("contenido", "Contenido que se revela", "largo"),
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
      rep("bloques", "Bloque", true, [
        f("texto", "Texto del bloque", "largo"),
        f("comportamiento", "Cómo aparece", "lista", ["Siempre visible", "Al hacer clic", "Al pasar el cursor", "Con temporizador"]),
      ], "Relaciona cada bloque con la parte de la imagen que se explica"),
    ],
  },
  {
    nombre: "Cuadro comparativo",
    tipo: "interaccion",
    guia: "Comparar 2 o 3 elementos según criterios. En las páginas oficiales revisadas no aparece una tabla nativa como recurso, así que se arma con formas y textos; verificar en el editor antes de producir.",
    campos: [
      rep("filas", "Criterio", true, [
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
      rep("pasos", "Paso", true, [
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
      rep("eventos", "Evento", true, [
        f("fecha", "Fecha o etapa"),
        f("titulo", "Título"),
        f("descripcion", "Descripción", "largo"),
      ], "Recorre la línea de tiempo explicando cada evento y su relación con el siguiente"),
    ],
  },
  {
    nombre: "Acordeón o pestañas (revelar y ocultar)",
    tipo: "interaccion",
    guia: "Organizar secciones largas de un mismo tema para que el estudiante abra solo lo que necesita. Se apoya en la interacción oficial de revelar y ocultar al hacer clic.",
    campos: [
      rep("secciones", "Sección", true, [
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
      rep("categorias", "Categoría", true, [f("nombre", "Nombre de la categoría")], "Presenta las categorías y su criterio"),
      rep("elementos", "Elemento", true, [
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
      rep("terminos", "Término", true, [
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
      rep("opciones", "Opción del menú", true, [
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
      rep("imagenes", "Imagen", true, [
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
      rep("grafico", "Configuración", false, [
        f("tipoGrafico", "Tipo de gráfico", "lista", ["Barras", "Líneas", "Circular", "Radar", "Dispersión", "Medidor"]),
        f("titulo", "Título"),
        f("lectura", "Qué debe concluir el estudiante", "largo"),
      ], "Explica cómo leer el gráfico y qué conclusión se obtiene"),
      rep("datos", "Dato", true, [f("etiqueta", "Etiqueta"), f("valor", "Valor", "numero")], "Menciona los datos más relevantes"),
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
      rep("preguntas", "Pregunta", true, [
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
      rep("decisiones", "Decisión", true, [
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
      rep("pasos_simulador", "Paso", true, [
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
].map(([nombre, guia]) => ({ nombre, tipo: "trigger" as const, guia, campos: [] }));

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
        repeatable: e.campos[0]?.repeatable ?? false,
        campos: e.campos,
        audioCtx: "",
        herramienta: "genially",
        guia: e.guia,
      },
    });
    console.log(`Creada: ${e.nombre}`);
    creadas++;
  }

  // "Otro" es compartido. nombre es @unique, así que solo puede existir una fila "Otro"
  // (hoy es de tipo interacción); no se crea un trigger "Otro" aparte.
  const otro = await prisma.interaccionCatalogo.findUnique({ where: { nombre: "Otro" } });
  if (!otro) {
    await prisma.interaccionCatalogo.create({
      data: { nombre: "Otro", tipo: "interaccion", campos: [], herramienta: "ambas" },
    });
    console.log("Creada: Otro (ambas)");
  } else if (otro.herramienta !== "ambas") {
    console.log(`Aviso: "Otro" está marcada como "${otro.herramienta}"; debería ser "ambas".`);
  }

  console.log(`Listo. Creadas: ${creadas}. Omitidas: ${omitidas}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
