import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { borrarFragmentos } from "@/lib/pinecone";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, string | boolean | Date> = {};
  for (const campo of ["tipo", "titulo", "url", "descripcion"]) {
    if (campo in body) data[campo] = String(body[campo]);
  }
  if ("aprobada" in body) data.aprobada = Boolean(body.aprobada);
  if (body.marcarConsultada) data.fechaConsulta = new Date();

  const fuente = await prisma.fuente.update({ where: { id }, data });

  if ("aprobada" in body) {
    await prisma.decision.create({
      data: {
        cursoId: fuente.cursoId,
        tipo: "cambio",
        texto: `Fuente "${fuente.titulo}" ${fuente.aprobada ? "aprobada" : "marcada como no aprobada"}.`,
      },
    });
  }

  return NextResponse.json(fuente);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const fuente = await prisma.fuente.findUnique({ where: { id } });

  if (fuente && fuente.fragmentos > 0) {
    try {
      await borrarFragmentos(fuente.cursoId, fuente.id, fuente.fragmentos);
    } catch (e) {
      console.error("No se pudieron borrar los fragmentos de Pinecone", e);
    }
  }

  await prisma.fuente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
