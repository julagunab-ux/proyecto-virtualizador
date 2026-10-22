import { aplicaEjemplo } from "@/lib/kickoff";

export type FuenteBasica = { id: string; aprobada: boolean; estadoIndexado: string };

export type Verificacion = {
  ok: boolean;
  nivel: "bloqueo" | "aviso";
  texto: string;
};

export type EstadoPreparacion = {
  listo: boolean; // true si no hay ningún bloqueo sin cumplir
  verificaciones: Verificacion[];
  fuentesEfectivas: string[]; // IDs asignados que hoy son consultables
};

export function esConsultable(f: FuenteBasica) {
  return f.aprobada && f.estadoIndexado === "indexada";
}

/** De las fuentes asignadas a la lección, las que hoy se pueden consultar. */
export function fuentesEfectivas(asignadas: string[], fuentesCurso: FuenteBasica[]) {
  return fuentesCurso.filter((f) => asignadas.includes(f.id) && esConsultable(f)).map((f) => f.id);
}

export function verificarLeccion(
  curso: {
    temario: string;
    arquitecturaAprobada: boolean;
    ejemploIntegrador: string;
    ejemploDesc: string;
  },
  leccion: {
    objetivo: string;
    duracion: string;
    usaEjemplo: boolean;
    numDiapositivas: number | null;
    fuentesIds: string[];
    cantidadDiapositivasExistentes: number;
  },
  fuentesCurso: FuenteBasica[]
): EstadoPreparacion {
  const efectivas = fuentesEfectivas(leccion.fuentesIds, fuentesCurso);
  const asignadasNoConsultables = leccion.fuentesIds.filter(
    (id) => fuentesCurso.some((f) => f.id === id) && !efectivas.includes(id)
  ).length;
  const llevaEjemplo = aplicaEjemplo(curso.ejemploIntegrador, leccion.usaEjemplo);

  const verificaciones: Verificacion[] = [
    {
      ok: leccion.objetivo.trim().length > 0,
      nivel: "bloqueo",
      texto: "La lección tiene objetivo definido",
    },
    {
      ok: leccion.duracion.trim().length > 0,
      nivel: "bloqueo",
      texto: "La lección tiene duración estimada",
    },
    {
      ok: leccion.numDiapositivas !== null,
      nivel: "bloqueo",
      texto: "El número de diapositivas está confirmado",
    },
    {
      ok: efectivas.length > 0,
      nivel: "bloqueo",
      texto: "Tiene al menos una fuente asignada, aprobada e indexada (sin fuentes, todo saldría como [SME])",
    },
    {
      ok: !llevaEjemplo || curso.ejemploDesc.trim().length > 0,
      nivel: "bloqueo",
      texto: "Si la lección lleva ejemplo integrador, el curso describe el caso",
    },
    {
      ok: asignadasNoConsultables === 0,
      nivel: "aviso",
      texto: `Hay ${asignadasNoConsultables} fuente(s) asignada(s) que ya no se pueden consultar (sin aprobar o sin indexar); se ignorarán`,
    },
    {
      ok: curso.temario.trim().length > 0,
      nivel: "aviso",
      texto: "El curso tiene temario cargado",
    },
    {
      ok: curso.arquitecturaAprobada,
      nivel: "aviso",
      texto: "La arquitectura del curso está aprobada",
    },
    {
      ok: leccion.cantidadDiapositivasExistentes === 0,
      nivel: "aviso",
      texto: `La lección ya tiene ${leccion.cantidadDiapositivasExistentes} diapositiva(s): generar de nuevo no debería pisarlas sin tu aprobación`,
    },
  ];

  return {
    listo: verificaciones.every((v) => v.ok || v.nivel === "aviso"),
    verificaciones,
    fuentesEfectivas: efectivas,
  };
}
