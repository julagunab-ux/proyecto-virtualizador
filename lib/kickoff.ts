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
}) {
  return [
    `Kickoff del curso "${c.titulo}".`,
    `Línea: ${c.linea}. Nivel: ${c.nivel}. Periodo: ${c.periodo}.`,
    `Ejemplo integrador: ${etiqueta(OPC_EJEMPLO, normalizarEjemplo(c.ejemploIntegrador))}${c.ejemploDesc ? " (" + c.ejemploDesc + ")" : ""}.`,
    `Duración objetivo por lección: ${c.duracionObjetivo || "sin definir"}.`,
    `Fuentes: ${etiqueta(OPC_FUENTES, c.fuentesEstado)}.`,
  ].join(" ");
}
