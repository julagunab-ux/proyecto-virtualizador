import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const camposPermitidos = [
    "kind",
    "orden",
    "datos",
    "tieneImagen",
    "imagenDesc",
    "tieneAudio",
    "audioTexto",
  ];

  const data: Record<string, unknown> = {};
  for (const campo of camposPermitidos) {
    if (campo in body) data[campo] = body[campo];
  }

  const item = await prisma.item.update({
    where: { id },
    data,
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.item.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
