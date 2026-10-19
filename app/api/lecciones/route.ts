import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cursoId = req.nextUrl.searchParams.get("cursoId");

  const lecciones = await prisma.leccion.findMany({
    where: cursoId ? { cursoId } : undefined,
    orderBy: { numero: "asc" },
  });

  return NextResponse.json(lecciones);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { cursoId, numero, titulo } = body;

  if (!cursoId || numero === undefined || !titulo) {
    return NextResponse.json(
      { error: "cursoId, numero y titulo son obligatorios" },
      { status: 400 }
    );
  }

  const leccion = await prisma.leccion.create({
    data: {
      cursoId,
      numero: Number(numero),
      titulo,
      objetivo: String(body.objetivo ?? ""),
      duracion: String(body.duracion ?? ""),
    },
  });

  return NextResponse.json(leccion, { status: 201 });
}
