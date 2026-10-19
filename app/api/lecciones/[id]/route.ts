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

  const data: {
    numero?: number;
    titulo?: string;
    objetivo?: string;
    duracion?: string;
    usaEjemplo?: boolean;
  } = {};
  if ("numero" in body) data.numero = Number(body.numero);
  if ("titulo" in body) data.titulo = String(body.titulo);
  if ("objetivo" in body) data.objetivo = String(body.objetivo);
  if ("duracion" in body) data.duracion = String(body.duracion);
  if ("usaEjemplo" in body) data.usaEjemplo = body.usaEjemplo === "si" || body.usaEjemplo === true;

  const leccion = await prisma.leccion.update({ where: { id }, data });
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
