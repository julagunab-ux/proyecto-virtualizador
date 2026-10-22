import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const leccion = await prisma.leccion.findUnique({
    where: { id },
    include: { diapositivas: { include: { capas: true } } },
  });

  if (!leccion) {
    return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 });
  }

  return NextResponse.json(leccion);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const antes = await prisma.leccion.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 });
  }

  const data: {
    numero?: number;
    titulo?: string;
    objetivo?: string;
    duracion?: string;
    usaEjemplo?: boolean;
    numDiapositivas?: number | null;
    fuentesIds?: string[];
    notas?: string;
  } = {};

  if ("numero" in body) data.numero = Number(body.numero);
  if ("titulo" in body) data.titulo = String(body.titulo);
  if ("objetivo" in body) data.objetivo = String(body.objetivo);
  if ("duracion" in body) data.duracion = String(body.duracion);
  if ("usaEjemplo" in body) data.usaEjemplo = body.usaEjemplo === "si" || body.usaEjemplo === true;
  if ("notas" in body) data.notas = String(body.notas).slice(0, 4000);

  if ("numDiapositivas" in body) {
    if (body.numDiapositivas === null || body.numDiapositivas === "") {
      data.numDiapositivas = null;
    } else {
      const n = Number(body.numDiapositivas);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        return NextResponse.json(
          { error: "El número de diapositivas debe ser un entero entre 1 y 100" },
          { status: 400 }
        );
      }
      data.numDiapositivas = n;
    }
  }

  if ("fuentesIds" in body) {
    if (!Array.isArray(body.fuentesIds)) {
      return NextResponse.json({ error: "fuentesIds debe ser una lista" }, { status: 400 });
    }
    // Solo se aceptan fuentes que pertenezcan al mismo curso.
    const delCurso = await prisma.fuente.findMany({
      where: { cursoId: antes.cursoId },
      select: { id: true },
    });
    const validas = new Set(delCurso.map((f) => f.id));
    data.fuentesIds = (body.fuentesIds as unknown[])
      .map(String)
      .filter((fid) => validas.has(fid));
  }

  const leccion = await prisma.leccion.update({ where: { id }, data });

  // Bitácora: solo cuando cambia la confirmación del número de diapositivas.
  if ("numDiapositivas" in data && data.numDiapositivas !== antes.numDiapositivas) {
    await prisma.decision.create({
      data: {
        cursoId: antes.cursoId,
        tipo: "cambio",
        leccionRef: `Lección ${leccion.numero}: ${leccion.titulo}`,
        texto:
          data.numDiapositivas === null
            ? "Se quitó la confirmación del número de diapositivas."
            : `Número de diapositivas confirmado en ${data.numDiapositivas}.`,
      },
    });
  }

  return NextResponse.json(leccion);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const leccion = await prisma.leccion.findUnique({
    where: { id },
    include: { diapositivas: { include: { capas: true } } },
  });

  if (!leccion) {
    return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 });
  }

  const capaIds = leccion.diapositivas.flatMap((d) => d.capas.map((c) => c.id));
  const diapositivaIds = leccion.diapositivas.map((d) => d.id);

  await prisma.$transaction([
    prisma.item.deleteMany({ where: { capaId: { in: capaIds } } }),
    prisma.capa.deleteMany({ where: { id: { in: capaIds } } }),
    prisma.diapositiva.deleteMany({ where: { id: { in: diapositivaIds } } }),
    prisma.leccion.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
