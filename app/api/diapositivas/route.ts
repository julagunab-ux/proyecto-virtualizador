import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const leccionId = req.nextUrl.searchParams.get("leccionId");

  const diapositivas = await prisma.diapositiva.findMany({
    where: leccionId ? { leccionId } : undefined,
    orderBy: { numero: "asc" },
  });

  return NextResponse.json(diapositivas);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { leccionId, numero, titulo } = body;

  if (!leccionId || numero === undefined || !titulo) {
    return NextResponse.json(
      { error: "leccionId, numero y titulo son obligatorios" },
      { status: 400 }
    );
  }

  const diapositiva = await prisma.diapositiva.create({
    data: { leccionId, numero: Number(numero), titulo },
  });

  return NextResponse.json(diapositiva, { status: 201 });
}
