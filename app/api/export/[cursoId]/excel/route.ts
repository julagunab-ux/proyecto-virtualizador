import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import {
  obtenerCursoCompleto,
  formatearTriggers,
  formatearDatosItem,
  nombreArchivoExport,
} from "@/lib/export";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cursoId: string }> }
) {
  const { cursoId } = await params;
  const curso = await obtenerCursoCompleto(cursoId);

  if (!curso) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  const workbook = new ExcelJS.Workbook();

  const guion = workbook.addWorksheet("Guion");
  guion.columns = [
    { header: "Lección", key: "leccion", width: 30 },
    { header: "Diapositiva", key: "diapositiva", width: 30 },
    { header: "Capa", key: "capa", width: 10 },
    { header: "Estado", key: "estado", width: 12 },
    { header: "Explicación general", key: "explicacion", width: 40 },
    { header: "Visual", key: "visual", width: 40 },
    { header: "Interacción", key: "interaccion", width: 25 },
    { header: "Trigger(s)", key: "triggers", width: 30 },
    { header: "Audio", key: "audio", width: 50 },
    { header: "Duración estimada", key: "duracion", width: 15 },
    { header: "Nombre de archivo", key: "nombreArchivo", width: 40 },
    { header: "Cantidad de ítems", key: "cantidadItems", width: 15 },
  ];
  guion.getRow(1).font = { bold: true };

  const items = workbook.addWorksheet("Ítems");
  items.columns = [
    { header: "Lección", key: "leccion", width: 30 },
    { header: "Diapositiva", key: "diapositiva", width: 30 },
    { header: "Capa", key: "capa", width: 10 },
    { header: "Tipo de ítem", key: "kind", width: 20 },
    { header: "Orden", key: "orden", width: 8 },
    { header: "Campos", key: "campos", width: 50 },
    { header: "Tiene imagen", key: "tieneImagen", width: 12 },
    { header: "Descripción imagen", key: "imagenDesc", width: 30 },
    { header: "Tiene audio", key: "tieneAudio", width: 12 },
    { header: "Audio del ítem", key: "audioTexto", width: 40 },
  ];
  items.getRow(1).font = { bold: true };

  for (const leccion of curso.lecciones) {
    const leccionLabel = `Lección ${leccion.numero}: ${leccion.titulo}`;
    for (const diapositiva of leccion.diapositivas) {
      const diapositivaLabel = `Diapositiva ${diapositiva.numero}: ${diapositiva.titulo}`;
      for (const capa of diapositiva.capas) {
        guion.addRow({
          leccion: leccionLabel,
          diapositiva: diapositivaLabel,
          capa: capa.numero,
          estado: capa.estado,
          explicacion: capa.explicacion,
          visual: capa.visual,
          interaccion: capa.interaccion,
          triggers: formatearTriggers(capa.triggers),
          audio: capa.audio,
          duracion: capa.duracion,
          nombreArchivo: capa.nombreArchivo,
          cantidadItems: capa.items.length,
        });

        for (const item of capa.items) {
          items.addRow({
            leccion: leccionLabel,
            diapositiva: diapositivaLabel,
            capa: capa.numero,
            kind: item.kind,
            orden: item.orden,
            campos: formatearDatosItem(item.datos),
            tieneImagen: item.tieneImagen ? "Sí" : "No",
            imagenDesc: item.imagenDesc,
            tieneAudio: item.tieneAudio ? "Sí" : "No",
            audioTexto: item.audioTexto,
          });
        }
      }
    }
  }

  for (const sheet of [guion, items]) {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { wrapText: true, vertical: "top" };
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const nombre = nombreArchivoExport(curso, "xlsx");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
