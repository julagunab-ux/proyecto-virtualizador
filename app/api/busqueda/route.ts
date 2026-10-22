import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarFuentes, MAX_CONSULTA } from "@/lib/busqueda";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const cursoId = String(body.cursoId ?? "");
  const consulta = String(body.consulta ?? "").trim();
  const k = Number(body.k ?? 6);

  if (!cursoId || !consulta) {
    return NextResponse.json({ error: "cursoId y consulta son obligatorios" }, { status: 400 });
  }
  if (consulta.length > MAX_CONSULTA) {
    return NextResponse.json({ error: `La consulta supera ${MAX_CONSULTA} caracteres` }, { status: 400 });
  }

  const curso = await prisma.curso.findUnique({ where: { id: cursoId }, select: { id: true } });
  if (!curso) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  try {
    const respuesta = await buscarFuentes(cursoId, consulta, Number.isFinite(k) ? k : 6);
    return NextResponse.json(respuesta);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo completar la búsqueda" },
      { status: 500 }
    );
  }
}
