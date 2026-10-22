import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { filtroHerramienta } from "@/lib/kickoff";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tipo = req.nextUrl.searchParams.get("tipo");
  const herramienta = req.nextUrl.searchParams.get("herramienta");

  const interacciones = await prisma.interaccionCatalogo.findMany({
    where: {
      ...(tipo ? { tipo } : {}),
      ...(filtroHerramienta(herramienta) ?? {}),
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(interacciones);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    nombre,
    tipo,
    itemLabel = "",
    repeatable = true,
    campos = [],
    audioCtx = "",
    herramienta = "ambas",
    guia = "",
  } = body;

  if (!nombre || !tipo) {
    return NextResponse.json(
      { error: "nombre y tipo son obligatorios" },
      { status: 400 }
    );
  }

  const interaccion = await prisma.interaccionCatalogo.create({
    data: { nombre, tipo, itemLabel, repeatable, campos, audioCtx, herramienta, guia },
  });

  return NextResponse.json(interaccion, { status: 201 });
}
