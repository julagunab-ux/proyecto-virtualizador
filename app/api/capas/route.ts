import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const diapositivaId = req.nextUrl.searchParams.get("diapositivaId");

  const capas = await prisma.capa.findMany({
    where: diapositivaId ? { diapositivaId } : undefined,
    orderBy: { numero: "asc" },
  });

  return NextResponse.json(capas);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { diapositivaId, numero, interaccion } = body;

  if (!diapositivaId || !numero || !interaccion) {
    return NextResponse.json(
      { error: "diapositivaId, numero e interaccion son obligatorios" },
      { status: 400 }
    );
  }

  const capa = await prisma.capa.create({
    data: {
      diapositivaId,
      numero,
      interaccion,
      estado: "borrador",
      explicacion: "",
      visual: "",
      audio: "",
      duracion: "",
      nombreArchivo: "",
      triggers: [],
      extra: {},
    },
  });

  return NextResponse.json(capa, { status: 201 });
}