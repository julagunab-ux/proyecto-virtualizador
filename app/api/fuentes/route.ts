import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cursoId = req.nextUrl.searchParams.get("cursoId");
  const fuentes = await prisma.fuente.findMany({
    where: cursoId ? { cursoId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(fuentes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { cursoId, titulo } = body;

  if (!cursoId || !titulo) {
    return NextResponse.json({ error: "cursoId y titulo son obligatorios" }, { status: 400 });
  }

  const origen = body.origen === "sugerida" ? "sugerida" : "usuario";

  const fuente = await prisma.fuente.create({
    data: {
      cursoId,
      titulo: String(titulo),
      tipo: String(body.tipo ?? "link"),
      url: String(body.url ?? ""),
      descripcion: String(body.descripcion ?? ""),
      origen,
      aprobada: origen !== "sugerida",
    },
  });

  return NextResponse.json(fuente, { status: 201 });
}
