import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const diapositiva = await prisma.diapositiva.findUnique({
    where: { id },
    include: { capas: true },
  });

  if (!diapositiva) {
    return NextResponse.json({ error: "Diapositiva no encontrada" }, { status: 404 });
  }

  return NextResponse.json(diapositiva);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data: { numero?: number; titulo?: string } = {};
  if ("numero" in body) data.numero = Number(body.numero);
  if ("titulo" in body) data.titulo = String(body.titulo);

  const diapositiva = await prisma.diapositiva.update({ where: { id }, data });
  return NextResponse.json(diapositiva);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const diapositiva = await prisma.diapositiva.findUnique({
    where: { id },
    include: { capas: true },
  });

  if (!diapositiva) {
    return NextResponse.json({ error: "Diapositiva no encontrada" }, { status: 404 });
  }

  const capaIds = diapositiva.capas.map((c) => c.id);

  await prisma.$transaction([
    prisma.item.deleteMany({ where: { capaId: { in: capaIds } } }),
    prisma.capa.deleteMany({ where: { id: { in: capaIds } } }),
    prisma.diapositiva.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
