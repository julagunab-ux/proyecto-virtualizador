import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { borrarNamespace } from "@/lib/pinecone";

export const dynamic = "force-dynamic";

const CAMPOS_TEXTO = [
  "linea",
  "titulo",
  "nivel",
  "periodo",
  "ejemploIntegrador",
  "ejemploDesc",
  "duracionObjetivo",
  "fuentesEstado",
  "temario",
  "herramienta",
] as const;

const HERRAMIENTAS = ["storyline", "genially"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const curso = await prisma.curso.findUnique({
    where: { id },
    include: { lecciones: { include: { diapositivas: { include: { capas: true } } } } },
  });

  if (!curso) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  return NextResponse.json(curso);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if ("herramienta" in body && !HERRAMIENTAS.includes(body.herramienta)) {
    return NextResponse.json(
      { error: "herramienta debe ser storyline o genially" },
      { status: 400 }
    );
  }

  const antes = await prisma.curso.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  const data: Record<string, string | boolean> = {};
  for (const campo of CAMPOS_TEXTO) {
    if (campo in body) data[campo] = String(body[campo]);
  }
  if ("arquitecturaAprobada" in body) {
    data.arquitecturaAprobada = Boolean(body.arquitecturaAprobada);
  }

  const curso = await prisma.curso.update({ where: { id }, data });

  const previo = antes as unknown as Record<string, unknown>;
  const cambios: string[] = [];
  for (const campo of CAMPOS_TEXTO) {
    if (campo in data && data[campo] !== previo[campo]) {
      cambios.push(campo === "temario" ? "temario actualizado" : `${campo}: "${previo[campo]}" → "${data[campo]}"`);
    }
  }
  if ("arquitecturaAprobada" in data && data.arquitecturaAprobada !== antes.arquitecturaAprobada) {
    cambios.push(data.arquitecturaAprobada ? "arquitectura aprobada" : "arquitectura reabierta para modificación");
  }

  if (cambios.length > 0) {
    await prisma.decision.create({
      data: { cursoId: id, tipo: "cambio", texto: `Cambios en la ficha: ${cambios.join("; ")}.` },
    });
  }

  return NextResponse.json(curso);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const curso = await prisma.curso.findUnique({
    where: { id },
    include: { lecciones: { include: { diapositivas: { include: { capas: true } } } } },
  });

  if (!curso) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  const diapositivas = curso.lecciones.flatMap((l) => l.diapositivas);
  const capaIds = diapositivas.flatMap((d) => d.capas.map((c) => c.id));
  const diapositivaIds = diapositivas.map((d) => d.id);
  const leccionIds = curso.lecciones.map((l) => l.id);

  await prisma.$transaction([
    prisma.item.deleteMany({ where: { capaId: { in: capaIds } } }),
    prisma.capa.deleteMany({ where: { id: { in: capaIds } } }),
    prisma.diapositiva.deleteMany({ where: { id: { in: diapositivaIds } } }),
    prisma.leccion.deleteMany({ where: { id: { in: leccionIds } } }),
    prisma.fuente.deleteMany({ where: { cursoId: id } }),
    prisma.decision.deleteMany({ where: { cursoId: id } }),
    prisma.curso.delete({ where: { id } }),
  ]);

  try {
    await borrarNamespace(id);
  } catch (e) {
    console.error("No se pudo borrar el namespace de Pinecone", e);
  }

  return NextResponse.json({ ok: true });
}
