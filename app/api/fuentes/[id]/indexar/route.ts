import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { borrarFragmentos, guardarFragmentos } from "@/lib/pinecone";
import {
  dividir,
  extraerDePdf,
  extraerDeUrl,
  MAX_FRAGMENTOS,
  type Pagina,
} from "@/lib/ingesta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel limita el cuerpo de una petición a ~4.5 MB; por eso este tope.
const MAX_ARCHIVO_BYTES = 4 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const fuente = await prisma.fuente.findUnique({ where: { id } });
  if (!fuente) {
    return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
  }

  await prisma.fuente.update({
    where: { id },
    data: { estadoIndexado: "indexando", errorIndexado: "" },
  });

  try {
    const form = await req.formData();
    const archivo = form.get("archivo");
    const textoPegado = String(form.get("texto") ?? "").trim();

    let paginas: Pagina[];
    let desde: "link" | "archivo" | "texto";

    if (archivo instanceof File && archivo.size > 0) {
      if (archivo.size > MAX_ARCHIVO_BYTES) {
        throw new Error("El archivo supera los 4 MB. Divídelo por capítulos o pega el texto.");
      }
      const nombre = archivo.name.toLowerCase();
      const datos = new Uint8Array(await archivo.arrayBuffer());

      if (nombre.endsWith(".pdf")) {
        paginas = await extraerDePdf(datos);
      } else if (nombre.endsWith(".txt") || nombre.endsWith(".md")) {
        paginas = [{ texto: new TextDecoder("utf-8").decode(datos) }];
      } else {
        throw new Error("Formato no soportado. Usa PDF, TXT o MD, o pega el texto.");
      }
      desde = "archivo";
    } else if (textoPegado) {
      paginas = [{ texto: textoPegado }];
      desde = "texto";
    } else if (fuente.url.startsWith("http")) {
      paginas = await extraerDeUrl(fuente.url);
      desde = "link";
    } else {
      throw new Error("Esta fuente no tiene link: sube un archivo o pega el texto.");
    }

    const fragmentos = dividir(paginas);

    if (fragmentos.length === 0) {
      throw new Error(
        "No se encontró texto. Si es un PDF escaneado (solo imagen), copia el texto y pégalo; el OCR aún no está disponible."
      );
    }
    if (fragmentos.length > MAX_FRAGMENTOS) {
      throw new Error(
        `El contenido genera ${fragmentos.length} fragmentos (máximo ${MAX_FRAGMENTOS}). Divídelo por capítulos y cárgalos como fuentes separadas.`
      );
    }

    // Reindexar: primero se borran los fragmentos anteriores de esta fuente
    await borrarFragmentos(fuente.cursoId, fuente.id, fuente.fragmentos);
    await guardarFragmentos(fuente.cursoId, fuente.id, fuente.titulo, fragmentos);

    const caracteres = fragmentos.reduce((suma, f) => suma + f.texto.length, 0);

    await prisma.fuente.update({
      where: { id },
      data: {
        estadoIndexado: "indexada",
        fragmentos: fragmentos.length,
        textoChars: caracteres,
        indexadoDesde: desde,
        indexadoEn: new Date(),
        errorIndexado: "",
      },
    });

    await prisma.decision.create({
      data: {
        cursoId: fuente.cursoId,
        tipo: "cambio",
        texto: `Fuente "${fuente.titulo}" indexada desde ${desde}: ${fragmentos.length} fragmentos.`,
      },
    });

    return NextResponse.json({ fragmentos: fragmentos.length, caracteres });
  } catch (e) {
    const mensaje = (e instanceof Error ? e.message : "Error desconocido").slice(0, 300);
    await prisma.fuente.update({
      where: { id },
      data: { estadoIndexado: "error", errorIndexado: mensaje },
    });
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
