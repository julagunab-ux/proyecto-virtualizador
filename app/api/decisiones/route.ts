import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cursoId = req.nextUrl.searchParams.get("cursoId");
  const decisiones = await prisma.decision.findMany({
    where: cursoId ? { cursoId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(decisiones);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { cursoId, texto } = body;

  if (!cursoId || !texto) {
    return NextResponse.json({ error: "cursoId y texto son obligatorios" }, { status: 400 });
  }

  const decision = await prisma.decision.create({
    data: {
      cursoId,
      texto: String(texto),
      tipo: String(body.tipo ?? "nota"),
      leccionRef: String(body.leccionRef ?? ""),
    },
  });

  return NextResponse.json(decision, { status: 201 });
}
