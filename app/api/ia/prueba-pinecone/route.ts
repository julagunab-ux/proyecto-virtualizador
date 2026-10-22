import { NextResponse } from "next/server";
import { obtenerIndice, INDICE } from "@/lib/pinecone";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible en producción" }, { status: 404 });
  }

  const inicio = Date.now();

  try {
    const indice = await obtenerIndice(true);
    if (!indice) throw new Error("No se pudo preparar el índice");
    const ns = indice.namespace("prueba");

    await ns.upsertRecords({
      records: [
      {
        _id: "t1",
        chunk_text: "El impuesto sobre las ventas (IVA) se genera por la venta de bienes y la prestación de servicios.",
        tema: "iva",
      },
      {
        _id: "t2",
        chunk_text: "Una variable en Python es un nombre que referencia un valor almacenado en memoria.",
        tema: "python",
      },
      ],
    } as never);

    // Los registros tardan unos segundos en quedar disponibles para búsqueda
    await new Promise((r) => setTimeout(r, 8000));

    const respuesta = await ns.searchRecords({
      query: { topK: 2, inputs: { text: "¿Qué es una variable?" } },
      fields: ["chunk_text", "tema"],
    });

    await ns.deleteAll();

    return NextResponse.json({
      ok: true,
      indice: INDICE,
      segundos: Math.round((Date.now() - inicio) / 1000),
      esperado: "El primer resultado debe ser t2 (variable en Python). Si hits viene vacío, recarga la página.",
      hits: respuesta.result.hits,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
