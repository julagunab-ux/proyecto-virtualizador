import { NextResponse } from "next/server";
import { llamarIA, configIA, ErrorIA } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible en producción" }, { status: 404 });
  }

  const { llaves, modelos } = configIA();
  const mensajes = [
    { role: "user" as const, content: "Responde únicamente con la palabra: OK" },
  ];

  const porModelo = [];
  for (const modelo of modelos) {
    try {
      const r = await llamarIA(mensajes, { modelos: [modelo], maxTokens: 20 });
      porModelo.push({ modelo, ok: true, respondio: r.modelo, respuesta: r.texto.trim(), intentos: r.intentos });
    } catch (e) {
      porModelo.push({
        modelo,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        intentos: e instanceof ErrorIA ? e.intentos : [],
      });
    }
  }

  let cadena;
  try {
    const r = await llamarIA(mensajes, { maxTokens: 20 });
    cadena = { ok: true, respondio: r.modelo, respuesta: r.texto.trim(), intentos: r.intentos };
  } catch (e) {
    cadena = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      intentos: e instanceof ErrorIA ? e.intentos : [],
    };
  }

  return NextResponse.json({
    llavesConfiguradas: llaves.length,
    modelosConfigurados: modelos.length,
    porModelo,
    cadena,
  });
}
