export const LINEAS = [
  { codigo: "PRG", nombre: "Programación" },
  { codigo: "CON", nombre: "Contaduría" },
  { codigo: "ECO", nombre: "Economía" },
];

export const NIVELES = ["FUN", "INT", "AVA"];

export const OPC_EJEMPLO = [
  { valor: "no", label: "No habrá ejemplo integrador" },
  { valor: "curso", label: "Sí, durante todo el curso" },
  { valor: "lecciones", label: "Sí, solo en lecciones específicas" },
];

export const OPC_FUENTES = [
  { valor: "pendiente", label: "Aún no definido" },
  { valor: "tengo", label: "Ya tengo las fuentes (las cargo en Fuentes)" },
  { valor: "sugerir", label: "No las tengo: sugerir fuentes confiables (requieren mi aprobación)" },
];

export const TIPOS_FUENTE = [
  { valor: "link", label: "Link / página web" },
  { valor: "documento", label: "Documento (PDF, Word, etc.)" },
  { valor: "normativa", label: "Normativa oficial" },
  { valor: "otro", label: "Otro" },
];

export function etiqueta(opciones: { valor: string; label: string }[], valor: string) {
  return opciones.find((o) => o.valor === valor)?.label ?? valor;
}

// Los cursos creados antes del ajuste guardaron "si": equivale a "todo el curso".
export function normalizarEjemplo(valor: string) {
  return valor === "si" ? "curso" : valor;
}

// ¿Esta lección lleva el ejemplo integrador?
export function aplicaEjemplo(modoCurso: string, usaEjemploLeccion: boolean) {
  const modo = normalizarEjemplo(modoCurso);
  return modo === "curso" || (modo === "lecciones" && usaEjemploLeccion);
}

export function resumenKickoff(c: {
  linea: string;
  titulo: string;
  nivel: string;
  periodo: string;
  ejemploIntegrador: string;
  ejemploDesc: string;
  duracionObjetivo: string;
  fuentesEstado: string;
  herramienta: string;
}) {
  return [
    `Kickoff del curso "${c.titulo}".`,
    `Línea: ${c.linea}. Nivel: ${c.nivel}. Periodo: ${c.periodo}.`,
    `Ejemplo integrador: ${etiqueta(OPC_EJEMPLO, normalizarEjemplo(c.ejemploIntegrador))}${c.ejemploDesc ? " (" + c.ejemploDesc + ")" : ""}.`,
    `Duración objetivo por lección: ${c.duracionObjetivo || "sin definir"}.`,
    `Herramienta de destino: ${etiqueta(OPC_HERRAMIENTA, c.herramienta)}.`,
    `Fuentes: ${etiqueta(OPC_FUENTES, c.fuentesEstado)}.`,
  ].join(" ");
}

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
