# Handoff para Claude Code — Exportar a Excel y Word (Fase B)

Este archivo agrega la exportación de un curso completo a Excel (matriz, fuente de verdad) y a Word (documento legible para producción), según el formato definido en las instrucciones del proyecto: Times New Roman 12, todo el texto en negro, tablas con bordes simples negros sin color de fondo, interlineado doble, márgenes de 2.54 cm.

## Paso 0 — Instalar dependencias

Antes de crear los archivos, corre en la raíz del proyecto:
```
npm install exceljs docx
```

Instrucción para Claude Code: instala esas dos dependencias, luego crea los archivos nuevos y reemplaza el existente indicado. Si `app/cursos/[id]/page.tsx` ya tiene cambios no reflejados aquí, muéstrame el diff antes de sobreescribir. Al final corre `npm run build`.

---

## `lib/export.ts` (nuevo)
```ts
import { prisma } from "@/lib/prisma";

export async function obtenerCursoCompleto(cursoId: string) {
  return prisma.curso.findUnique({
    where: { id: cursoId },
    include: {
      lecciones: {
        orderBy: { numero: "asc" },
        include: {
          diapositivas: {
            orderBy: { numero: "asc" },
            include: {
              capas: {
                orderBy: { numero: "asc" },
                include: {
                  items: { orderBy: { orden: "asc" } },
                },
              },
            },
          },
        },
      },
    },
  });
}

export type CursoCompleto = NonNullable<Awaited<ReturnType<typeof obtenerCursoCompleto>>>;

export function formatearTriggers(triggers: unknown): string {
  if (!Array.isArray(triggers)) return "";
  return triggers
    .map((t) => {
      const trigger = t as { tipo?: string; detalle?: string };
      return `${trigger.tipo || ""}${trigger.detalle ? ": " + trigger.detalle : ""}`;
    })
    .join(" | ");
}

export function formatearDatosItem(datos: unknown): string {
  if (!datos || typeof datos !== "object") return "";
  return Object.entries(datos as Record<string, string>)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
}

export function nombreArchivoExport(curso: { linea: string; nivel: string; titulo: string; periodo: string }, extension: string) {
  return `VA_${curso.linea}_${curso.nivel}_${curso.titulo.replace(/\s+/g, "")}_${curso.periodo}_Guion.${extension}`;
}
```

---

## `app/api/export/[cursoId]/excel/route.ts` (nuevo)
```ts
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
```

---

## `app/api/export/[cursoId]/word/route.ts` (nuevo)
```ts
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

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
```

---

## `app/cursos/[id]/page.tsx` (reemplazar completo — agrega los botones de exportar)
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CrearLeccionForm from "@/components/CrearLeccionForm";
import BotonEliminar from "@/components/BotonEliminar";

export const dynamic = "force-dynamic";

export default async function CursoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const curso = await prisma.curso.findUnique({
    where: { id },
    include: { lecciones: { orderBy: { numero: "asc" }, include: { diapositivas: true } } },
  });

  if (!curso) notFound();

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <Link href="/" className="text-sm text-zinc-500">&larr; Cursos</Link>

      <div className="flex justify-between items-start mt-2 mb-2">
        <h1 className="text-2xl font-semibold">
          {curso.linea}_{curso.nivel}_{curso.titulo}_{curso.periodo}
        </h1>
        <BotonEliminar
          url={`/api/cursos/${curso.id}`}
          mensaje={`¿Eliminar el curso "${curso.titulo}"? Se borrarán también todas sus lecciones, diapositivas y capas. Esta acción no se puede deshacer.`}
          redirigirA="/"
          texto="Eliminar curso"
        />
      </div>

      <div className="flex gap-2 mb-6">
        <a
          href={`/api/export/${curso.id}/excel`}
          className="text-xs bg-emerald-600 text-white rounded px-3 py-1.5 hover:bg-emerald-700"
        >
          Exportar a Excel
        </a>
        <a
          href={`/api/export/${curso.id}/word`}
          className="text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700"
        >
          Exportar a Word
        </a>
      </div>

      <CrearLeccionForm cursoId={curso.id} siguienteNumero={curso.lecciones.length + 1} />

      <ul className="mt-8 space-y-3">
        {curso.lecciones.map((leccion) => (
          <li key={leccion.id} className="border rounded-lg p-4 hover:bg-zinc-50 flex justify-between items-start gap-3">
            <div>
              <Link href={`/lecciones/${leccion.id}`} className="font-medium">
                Lección {leccion.numero}: {leccion.titulo}
              </Link>
              <p className="text-sm text-zinc-500">{leccion.diapositivas.length} diapositiva(s)</p>
            </div>
            <BotonEliminar
              url={`/api/lecciones/${leccion.id}`}
              mensaje={`¿Eliminar la lección "${leccion.titulo}"? Se borrarán también sus diapositivas y capas. Esta acción no se puede deshacer.`}
            />
          </li>
        ))}
        {curso.lecciones.length === 0 && (
          <p className="text-zinc-500">Aún no hay lecciones en este curso.</p>
        )}
      </ul>
    </div>
  );
}
```

---

## Notas

- Ambas rutas descargan el archivo directamente al hacer clic en el link (no abren nada en el navegador, el `Content-Disposition: attachment` fuerza la descarga).
- El nombre del archivo ya sigue la nomenclatura del proyecto: `VA_<Línea>_<Nivel>_<Título>_<Periodo>_Guion.xlsx` / `.docx`.
- El Word no incluye estilos de encabezado de Word (`Heading 1`, etc.) a propósito — usa texto en negrita con tamaño mayor pero siempre en Times New Roman y negro, para evitar que la plantilla de Word le meta color por defecto a los títulos.
- Si luego quieres que el Word separe cada Lección en una página nueva, se puede agregar un salto de página (`PageBreak`) antes de cada lección — dime y lo agrego.
- Estos exports leen el curso completo directo de la base de datos (no dependen de nada que hayas guardado en el editor aparte de lo ya persistido), así que cualquier capa sin guardar no aparecerá hasta que el autosave la persista.
