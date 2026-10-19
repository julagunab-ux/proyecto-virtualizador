import { prisma } from "@/lib/prisma";

export async function obtenerCursoCompleto(cursoId: string) {
  return prisma.curso.findUnique({
    where: { id: cursoId },
    include: {
      lecciones: {
        orderBy: { numero: "asc" },
        include: {
          diapositivas: {
            orderBy: { numero: "asc" },
            include: {
              capas: {
                orderBy: { numero: "asc" },
                include: {
                  items: { orderBy: { orden: "asc" } },
                },
              },
            },
          },
        },
      },
    },
  });
}

export type CursoCompleto = NonNullable<Awaited<ReturnType<typeof obtenerCursoCompleto>>>;

export function formatearTriggers(triggers: unknown): string {
  if (!Array.isArray(triggers)) return "";
  return triggers
    .map((t) => {
      const trigger = t as { tipo?: string; detalle?: string };
      return `${trigger.tipo || ""}${trigger.detalle ? ": " + trigger.detalle : ""}`;
    })
    .join(" | ");
}

export function formatearDatosItem(datos: unknown): string {
  if (!datos || typeof datos !== "object") return "";
  return Object.entries(datos as Record<string, string>)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
}

export function nombreArchivoExport(curso: { linea: string; nivel: string; titulo: string; periodo: string }, extension: string) {
  return `VA_${curso.linea}_${curso.nivel}_${curso.titulo.replace(/\s+/g, "")}_${curso.periodo}_Guion.${extension}`;
}
