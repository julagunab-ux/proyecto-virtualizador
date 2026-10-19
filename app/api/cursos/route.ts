import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resumenKickoff } from "@/lib/kickoff";

export const dynamic = "force-dynamic";

export async function GET() {
  const cursos = await prisma.curso.findMany({
    orderBy: { createdAt: "desc" },
    include: { lecciones: true },
  });
  return NextResponse.json(cursos);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { linea, titulo, nivel, periodo } = body;

  if (!linea || !titulo || !nivel || !periodo) {
    return NextResponse.json(
      { error: "linea, titulo, nivel y periodo son obligatorios" },
      { status: 400 }
    );
  }

  const curso = await prisma.curso.create({
    data: {
      linea,
      titulo,
      nivel,
      periodo,
      ejemploIntegrador: ["curso", "lecciones"].includes(body.ejemploIntegrador)
        ? body.ejemploIntegrador
        : "no",
      ejemploDesc: String(body.ejemploDesc ?? ""),
      duracionObjetivo: String(body.duracionObjetivo ?? ""),
      fuentesEstado: ["tengo", "sugerir", "pendiente"].includes(body.fuentesEstado)
        ? body.fuentesEstado
        : "pendiente",
      temario: String(body.temario ?? ""),
    },
  });

  await prisma.decision.create({
    data: { cursoId: curso.id, tipo: "kickoff", texto: resumenKickoff(curso) },
  });

  return NextResponse.json(curso, { status: 201 });
}
