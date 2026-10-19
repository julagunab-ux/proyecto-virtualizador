import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const capaId = req.nextUrl.searchParams.get("capaId");
  if (!capaId) {
    return NextResponse.json({ error: "capaId requerido" }, { status: 400 });
  }

  const items = await prisma.item.findMany({
    where: { capaId },
    orderBy: { orden: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    capaId,
    kind = "",
    orden,
    datos = {},
    tieneImagen = false,
    imagenDesc = "",
    tieneAudio = false,
    audioTexto = "",
  } = body;

  if (!capaId || orden === undefined) {
    return NextResponse.json(
      { error: "capaId y orden son obligatorios" },
      { status: 400 }
    );
  }

  const item = await prisma.item.create({
    data: {
      capaId,
      kind,
      orden,
      datos,
      tieneImagen,
      imagenDesc,
      tieneAudio,
      audioTexto,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
