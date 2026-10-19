import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const capa = await prisma.capa.findUnique({
    where: { id },
    include: { items: { orderBy: { orden: "asc" } } },
  });

  if (!capa) {
    return NextResponse.json({ error: "Capa no encontrada" }, { status: 404 });
  }

  return NextResponse.json(capa);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const camposPermitidos = [
    "numero",
    "estado",
    "explicacion",
    "visual",
    "interaccion",
    "audio",
    "duracion",
    "nombreArchivo",
    "triggers",
    "extra",
  ];

  const data: Record<string, unknown> = {};
  for (const campo of camposPermitidos) {
    if (campo in body) data[campo] = body[campo];
  }

  const capa = await prisma.capa.update({
    where: { id },
    data,
  });

  return NextResponse.json(capa);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.item.deleteMany({ where: { capaId: id } });
  await prisma.capa.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}