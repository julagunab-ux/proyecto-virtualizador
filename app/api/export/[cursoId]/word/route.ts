import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import { obtenerCursoCompleto, formatearTriggers, nombreArchivoExport } from "@/lib/export";

export const dynamic = "force-dynamic";

const FUENTE = "Times New Roman";
const TAMANO = 24; // 12pt en half-points
const INTERLINEADO_DOBLE = 480;
const MARGEN = 1440; // 1 pulgada = 2.54 cm

function run(texto: string, opciones: { bold?: boolean; italics?: boolean; size?: number } = {}) {
  return new TextRun({
    text: texto,
    font: FUENTE,
    size: opciones.size ?? TAMANO,
    color: "000000",
    bold: opciones.bold,
    italics: opciones.italics,
  });
}

function parrafo(texto: string, opciones: { bold?: boolean; italics?: boolean; size?: number; before?: number; after?: number } = {}) {
  return new Paragraph({
    children: [run(texto, opciones)],
    spacing: { line: INTERLINEADO_DOBLE, lineRule: "auto", before: opciones.before, after: opciones.after },
  });
}

function celda(texto: string, anchoPorcentaje: number) {
  return new TableCell({
    width: { size: anchoPorcentaje, type: WidthType.PERCENTAGE },
    shading: { fill: "FFFFFF" },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
    },
    children: [
      new Paragraph({
        children: [run(texto)],
        spacing: { line: INTERLINEADO_DOBLE, lineRule: "auto" },
      }),
    ],
  });
}

function filaCampo(etiqueta: string, valor: string) {
  return new TableRow({
    children: [celda(etiqueta, 20), celda(valor || "—", 80)],
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cursoId: string }> }
) {
  const { cursoId } = await params;
  const curso = await obtenerCursoCompleto(cursoId);

  if (!curso) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  const children: (Paragraph | Table)[] = [];

  children.push(parrafo(`${curso.linea}_${curso.nivel}_${curso.titulo}_${curso.periodo}`, { bold: true, size: 32, after: 300 }));

  for (const leccion of curso.lecciones) {
    children.push(parrafo(`Lección ${leccion.numero}: ${leccion.titulo}`, { bold: true, size: 28, before: 400, after: 150 }));

    for (const diapositiva of leccion.diapositivas) {
      children.push(parrafo(`Diapositiva ${diapositiva.numero}: ${diapositiva.titulo}`, { bold: true, size: 26, before: 250, after: 100 }));

      for (const capa of diapositiva.capas) {
        children.push(parrafo(`Capa ${capa.numero} — ${capa.interaccion} (${capa.estado})`, { bold: true, before: 150, after: 80 }));

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              filaCampo("Explicación general", capa.explicacion),
              filaCampo("Visual", capa.visual),
              filaCampo("Interacción", capa.interaccion),
              filaCampo("Trigger(s)", formatearTriggers(capa.triggers)),
              filaCampo("Audio", capa.audio),
              filaCampo("Duración estimada", capa.duracion),
              filaCampo("Nombre de archivo", capa.nombreArchivo),
            ],
          })
        );

        if (capa.items.length > 0) {
          children.push(parrafo("Ítems:", { italics: true, before: 150, after: 50 }));

          for (const item of capa.items) {
            const campos = Object.entries((item.datos as Record<string, string>) || {})
              .map(([k, v]) => `${k}: ${v}`)
              .join("; ");
            const extra = [
              item.tieneImagen ? `Imagen: ${item.imagenDesc}` : "",
              item.tieneAudio ? `Audio: ${item.audioTexto}` : "",
            ]
              .filter(Boolean)
              .join(" | ");
            children.push(parrafo(`- [${item.kind}] ${campos}${extra ? " | " + extra : ""}`));
          }
        }

        children.push(parrafo("", { after: 100 }));
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: MARGEN, bottom: MARGEN, left: MARGEN, right: MARGEN } },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const nombre = nombreArchivoExport(curso, "docx");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
