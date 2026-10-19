# Handoff para Claude Code — Editar cada nivel (curso, lección, diapositiva, capa)

Agrega un botón "Editar" que abre una ventana con los campos del nivel, guarda con PATCH y refresca la página. Se puede editar desde la lista (cada fila) y desde el encabezado de cada página de detalle.

Instrucción para Claude Code: crea el componente nuevo, reemplaza las 3 rutas API y las 4 páginas indicadas. Estas páginas ya incluyen los botones de borrado y de exportar de los handoffs anteriores (`HANDOFF_borrado.md` y `HANDOFF_export.md`), así que esta versión es la final y los reemplaza. Si algún archivo tiene cambios propios que no aparecen aquí, muéstrame el diff antes de sobreescribir. Al final corre `npm run build`.

Nota: la capa se edita (número e interacción) desde la lista de capas de su diapositiva. Si se cambia la interacción, los ítems ya creados no se borran, pero los de un tipo que la nueva interacción no use dejarán de mostrarse en el editor.

---

## `components/BotonEditar.tsx` (nuevo)
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type CampoEditable = {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  opciones?: string[];
};

export default function BotonEditar({
  url,
  titulo,
  campos,
  valores,
  ayuda,
  texto = "Editar",
}: {
  url: string;
  titulo: string;
  campos: CampoEditable[];
  valores: Record<string, string | number>;
  ayuda?: string;
  texto?: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<Record<string, string | number>>(valores);
  const [guardando, setGuardando] = useState(false);

  function abrir(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setForm(valores);
    setAbierto(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);

    const body: Record<string, string | number> = {};
    for (const c of campos) {
      const v = form[c.key];
      body[c.key] = c.type === "number" ? Number(v) : String(v ?? "");
    }

    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setGuardando(false);

    if (!res.ok) {
      window.alert("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    setAbierto(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={abrir}
        className="text-xs text-blue-600 hover:underline whitespace-nowrap"
      >
        {texto}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setAbierto(false)}
        >
          <form
            onSubmit={guardar}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg p-5 w-full max-w-md space-y-3 shadow-lg"
          >
            <h2 className="text-lg font-semibold">{titulo}</h2>

            {campos.map((c) => (
              <div key={c.key} className="flex flex-col gap-1">
                <label className="text-sm font-medium">{c.label}</label>
                {c.type === "select" ? (
                  <select
                    value={String(form[c.key] ?? "")}
                    onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {(c.opciones || []).map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={c.type === "number" ? "number" : "text"}
                    value={form[c.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                    className="border rounded px-2 py-1 text-sm"
                    required
                  />
                )}
              </div>
            ))}

            {ayuda && <p className="text-xs text-zinc-500">{ayuda}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-sm border rounded px-3 py-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="text-sm bg-black text-white rounded px-3 py-1 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
```

---

## `app/api/cursos/[id]/route.ts` (reemplazar completo)
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const curso = await prisma.curso.findUnique({
    where: { id },
    include: { lecciones: { include: { diapositivas: { include: { capas: true } } } } },
  });

  if (!curso) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  return NextResponse.json(curso);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, string> = {};
  for (const campo of ["linea", "titulo", "nivel", "periodo"]) {
    if (campo in body) data[campo] = String(body[campo]);
  }

  const curso = await prisma.curso.update({ where: { id }, data });
  return NextResponse.json(curso);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const curso = await prisma.curso.findUnique({
    where: { id },
    include: { lecciones: { include: { diapositivas: { include: { capas: true } } } } },
  });

  if (!curso) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  const diapositivas = curso.lecciones.flatMap((l) => l.diapositivas);
  const capaIds = diapositivas.flatMap((d) => d.capas.map((c) => c.id));
  const diapositivaIds = diapositivas.map((d) => d.id);
  const leccionIds = curso.lecciones.map((l) => l.id);

  await prisma.$transaction([
    prisma.item.deleteMany({ where: { capaId: { in: capaIds } } }),
    prisma.capa.deleteMany({ where: { id: { in: capaIds } } }),
    prisma.diapositiva.deleteMany({ where: { id: { in: diapositivaIds } } }),
    prisma.leccion.deleteMany({ where: { id: { in: leccionIds } } }),
    prisma.curso.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
```

## `app/api/lecciones/[id]/route.ts` (reemplazar completo)
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const leccion = await prisma.leccion.findUnique({
    where: { id },
    include: { diapositivas: { include: { capas: true } } },
  });

  if (!leccion) {
    return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 });
  }

  return NextResponse.json(leccion);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data: { numero?: number; titulo?: string } = {};
  if ("numero" in body) data.numero = Number(body.numero);
  if ("titulo" in body) data.titulo = String(body.titulo);

  const leccion = await prisma.leccion.update({ where: { id }, data });
  return NextResponse.json(leccion);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const leccion = await prisma.leccion.findUnique({
    where: { id },
    include: { diapositivas: { include: { capas: true } } },
  });

  if (!leccion) {
    return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 });
  }

  const capaIds = leccion.diapositivas.flatMap((d) => d.capas.map((c) => c.id));
  const diapositivaIds = leccion.diapositivas.map((d) => d.id);

  await prisma.$transaction([
    prisma.item.deleteMany({ where: { capaId: { in: capaIds } } }),
    prisma.capa.deleteMany({ where: { id: { in: capaIds } } }),
    prisma.diapositiva.deleteMany({ where: { id: { in: diapositivaIds } } }),
    prisma.leccion.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
```

## `app/api/diapositivas/[id]/route.ts` (reemplazar completo)
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const diapositiva = await prisma.diapositiva.findUnique({
    where: { id },
    include: { capas: true },
  });

  if (!diapositiva) {
    return NextResponse.json({ error: "Diapositiva no encontrada" }, { status: 404 });
  }

  return NextResponse.json(diapositiva);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data: { numero?: number; titulo?: string } = {};
  if ("numero" in body) data.numero = Number(body.numero);
  if ("titulo" in body) data.titulo = String(body.titulo);

  const diapositiva = await prisma.diapositiva.update({ where: { id }, data });
  return NextResponse.json(diapositiva);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const diapositiva = await prisma.diapositiva.findUnique({
    where: { id },
    include: { capas: true },
  });

  if (!diapositiva) {
    return NextResponse.json({ error: "Diapositiva no encontrada" }, { status: 404 });
  }

  const capaIds = diapositiva.capas.map((c) => c.id);

  await prisma.$transaction([
    prisma.item.deleteMany({ where: { capaId: { in: capaIds } } }),
    prisma.capa.deleteMany({ where: { id: { in: capaIds } } }),
    prisma.diapositiva.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
```

*(`app/api/capas/[id]/route.ts` ya acepta PATCH de `numero` e `interaccion`; no se toca.)*

---

## `app/page.tsx` (reemplazar completo)
```tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CrearCursoForm from "@/components/CrearCursoForm";
import BotonEliminar from "@/components/BotonEliminar";
import BotonEditar from "@/components/BotonEditar";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cursos = await prisma.curso.findMany({
    orderBy: { createdAt: "desc" },
    include: { lecciones: true },
  });

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <h1 className="text-2xl font-semibold mb-6">Cursos</h1>

      <CrearCursoForm />

      <ul className="mt-8 space-y-3">
        {cursos.map((curso) => (
          <li key={curso.id} className="border rounded-lg p-4 hover:bg-zinc-50 flex justify-between items-start gap-3">
            <div>
              <Link href={`/cursos/${curso.id}`} className="font-medium">
                {curso.linea}_{curso.nivel}_{curso.titulo}_{curso.periodo}
              </Link>
              <p className="text-sm text-zinc-500">
                {curso.lecciones.length} lección(es)
              </p>
            </div>
            <div className="flex gap-3">
              <BotonEditar
                url={`/api/cursos/${curso.id}`}
                titulo="Editar curso"
                campos={[
                  { key: "linea", label: "Línea (ej. CON)" },
                  { key: "titulo", label: "Título" },
                  { key: "nivel", label: "Nivel", type: "select", opciones: ["FUN", "INT", "AVA"] },
                  { key: "periodo", label: "Periodo (ej. 2026-2)" },
                ]}
                valores={{ linea: curso.linea, titulo: curso.titulo, nivel: curso.nivel, periodo: curso.periodo }}
              />
              <BotonEliminar
                url={`/api/cursos/${curso.id}`}
                mensaje={`¿Eliminar el curso "${curso.titulo}"? Se borrarán también todas sus lecciones, diapositivas y capas. Esta acción no se puede deshacer.`}
              />
            </div>
          </li>
        ))}
        {cursos.length === 0 && (
          <p className="text-zinc-500">Aún no hay cursos creados.</p>
        )}
      </ul>
    </div>
  );
}
```

## `app/cursos/[id]/page.tsx` (reemplazar completo)
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CrearLeccionForm from "@/components/CrearLeccionForm";
import BotonEliminar from "@/components/BotonEliminar";
import BotonEditar from "@/components/BotonEditar";

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

      <div className="flex justify-between items-start mt-2 mb-2 gap-3">
        <h1 className="text-2xl font-semibold">
          {curso.linea}_{curso.nivel}_{curso.titulo}_{curso.periodo}
        </h1>
        <div className="flex gap-3">
          <BotonEditar
            url={`/api/cursos/${curso.id}`}
            titulo="Editar curso"
            texto="Editar curso"
            campos={[
              { key: "linea", label: "Línea (ej. CON)" },
              { key: "titulo", label: "Título" },
              { key: "nivel", label: "Nivel", type: "select", opciones: ["FUN", "INT", "AVA"] },
              { key: "periodo", label: "Periodo (ej. 2026-2)" },
            ]}
            valores={{ linea: curso.linea, titulo: curso.titulo, nivel: curso.nivel, periodo: curso.periodo }}
          />
          <BotonEliminar
            url={`/api/cursos/${curso.id}`}
            mensaje={`¿Eliminar el curso "${curso.titulo}"? Se borrarán también todas sus lecciones, diapositivas y capas. Esta acción no se puede deshacer.`}
            redirigirA="/"
            texto="Eliminar curso"
          />
        </div>
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
            <div className="flex gap-3">
              <BotonEditar
                url={`/api/lecciones/${leccion.id}`}
                titulo="Editar lección"
                campos={[
                  { key: "numero", label: "Número", type: "number" },
                  { key: "titulo", label: "Título" },
                ]}
                valores={{ numero: leccion.numero, titulo: leccion.titulo }}
              />
              <BotonEliminar
                url={`/api/lecciones/${leccion.id}`}
                mensaje={`¿Eliminar la lección "${leccion.titulo}"? Se borrarán también sus diapositivas y capas. Esta acción no se puede deshacer.`}
              />
            </div>
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

## `app/lecciones/[id]/page.tsx` (reemplazar completo)
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CrearDiapositivaForm from "@/components/CrearDiapositivaForm";
import BotonEliminar from "@/components/BotonEliminar";
import BotonEditar from "@/components/BotonEditar";

export const dynamic = "force-dynamic";

export default async function LeccionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const leccion = await prisma.leccion.findUnique({
    where: { id },
    include: {
      curso: true,
      diapositivas: { orderBy: { numero: "asc" }, include: { capas: true } },
    },
  });

  if (!leccion) notFound();

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <Link href={`/cursos/${leccion.cursoId}`} className="text-sm text-zinc-500">
        &larr; {leccion.curso.titulo}
      </Link>

      <div className="flex justify-between items-start mt-2 mb-6 gap-3">
        <h1 className="text-2xl font-semibold">
          Lección {leccion.numero}: {leccion.titulo}
        </h1>
        <div className="flex gap-3">
          <BotonEditar
            url={`/api/lecciones/${leccion.id}`}
            titulo="Editar lección"
            texto="Editar lección"
            campos={[
              { key: "numero", label: "Número", type: "number" },
              { key: "titulo", label: "Título" },
            ]}
            valores={{ numero: leccion.numero, titulo: leccion.titulo }}
          />
          <BotonEliminar
            url={`/api/lecciones/${leccion.id}`}
            mensaje={`¿Eliminar la lección "${leccion.titulo}"? Se borrarán también sus diapositivas y capas. Esta acción no se puede deshacer.`}
            redirigirA={`/cursos/${leccion.cursoId}`}
            texto="Eliminar lección"
          />
        </div>
      </div>

      <CrearDiapositivaForm leccionId={leccion.id} siguienteNumero={leccion.diapositivas.length + 1} />

      <ul className="mt-8 space-y-3">
        {leccion.diapositivas.map((diapositiva) => (
          <li key={diapositiva.id} className="border rounded-lg p-4 hover:bg-zinc-50 flex justify-between items-start gap-3">
            <div>
              <Link href={`/diapositivas/${diapositiva.id}`} className="font-medium">
                Diapositiva {diapositiva.numero}: {diapositiva.titulo}
              </Link>
              <p className="text-sm text-zinc-500">{diapositiva.capas.length} capa(s)</p>
            </div>
            <div className="flex gap-3">
              <BotonEditar
                url={`/api/diapositivas/${diapositiva.id}`}
                titulo="Editar diapositiva"
                campos={[
                  { key: "numero", label: "Número", type: "number" },
                  { key: "titulo", label: "Título" },
                ]}
                valores={{ numero: diapositiva.numero, titulo: diapositiva.titulo }}
              />
              <BotonEliminar
                url={`/api/diapositivas/${diapositiva.id}`}
                mensaje={`¿Eliminar la diapositiva "${diapositiva.titulo}"? Se borrarán también sus capas. Esta acción no se puede deshacer.`}
              />
            </div>
          </li>
        ))}
        {leccion.diapositivas.length === 0 && (
          <p className="text-zinc-500">Aún no hay diapositivas en esta lección.</p>
        )}
      </ul>
    </div>
  );
}
```

## `app/diapositivas/[id]/page.tsx` (reemplazar completo)
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CrearCapaForm from "@/components/CrearCapaForm";
import BotonEliminar from "@/components/BotonEliminar";
import BotonEditar from "@/components/BotonEditar";

export const dynamic = "force-dynamic";

export default async function DiapositivaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const diapositiva = await prisma.diapositiva.findUnique({
    where: { id },
    include: {
      leccion: true,
      capas: { orderBy: { numero: "asc" } },
    },
  });

  if (!diapositiva) notFound();

  const interacciones = await prisma.interaccionCatalogo.findMany({
    where: { tipo: "interaccion" },
    orderBy: { nombre: "asc" },
  });
  const nombresInteraccion = interacciones.map((i) => i.nombre);

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <Link href={`/lecciones/${diapositiva.leccionId}`} className="text-sm text-zinc-500">
        &larr; {diapositiva.leccion.titulo}
      </Link>

      <div className="flex justify-between items-start mt-2 mb-6 gap-3">
        <h1 className="text-2xl font-semibold">
          Diapositiva {diapositiva.numero}: {diapositiva.titulo}
        </h1>
        <div className="flex gap-3">
          <BotonEditar
            url={`/api/diapositivas/${diapositiva.id}`}
            titulo="Editar diapositiva"
            texto="Editar diapositiva"
            campos={[
              { key: "numero", label: "Número", type: "number" },
              { key: "titulo", label: "Título" },
            ]}
            valores={{ numero: diapositiva.numero, titulo: diapositiva.titulo }}
          />
          <BotonEliminar
            url={`/api/diapositivas/${diapositiva.id}`}
            mensaje={`¿Eliminar la diapositiva "${diapositiva.titulo}"? Se borrarán también sus capas. Esta acción no se puede deshacer.`}
            redirigirA={`/lecciones/${diapositiva.leccionId}`}
            texto="Eliminar diapositiva"
          />
        </div>
      </div>

      <CrearCapaForm
        diapositivaId={diapositiva.id}
        siguienteNumero={`${diapositiva.numero}.${diapositiva.capas.length + 1}`}
        interacciones={nombresInteraccion}
      />

      <ul className="mt-8 space-y-3">
        {diapositiva.capas.map((capa) => (
          <li key={capa.id} className="border rounded-lg p-4 hover:bg-zinc-50 flex justify-between items-start gap-3">
            <div>
              <Link href={`/capas/${capa.id}`} className="font-medium">
                Capa {capa.numero} — {capa.interaccion}
              </Link>
              <p className="text-sm text-zinc-500">Estado: {capa.estado}</p>
            </div>
            <div className="flex gap-3">
              <BotonEditar
                url={`/api/capas/${capa.id}`}
                titulo="Editar capa"
                campos={[
                  { key: "numero", label: "Número (ej. 3.2)" },
                  {
                    key: "interaccion",
                    label: "Interacción",
                    type: "select",
                    opciones: nombresInteraccion.includes(capa.interaccion)
                      ? nombresInteraccion
                      : [capa.interaccion, ...nombresInteraccion],
                  },
                ]}
                valores={{ numero: capa.numero, interaccion: capa.interaccion }}
                ayuda="Si cambias la interacción, los ítems ya creados no se borran, pero los de un tipo que la nueva interacción no use dejarán de mostrarse en el editor."
              />
              <BotonEliminar
                url={`/api/capas/${capa.id}`}
                mensaje={`¿Eliminar la capa ${capa.numero}? Esta acción no se puede deshacer.`}
              />
            </div>
          </li>
        ))}
        {diapositiva.capas.length === 0 && (
          <p className="text-zinc-500">Aún no hay capas en esta diapositiva.</p>
        )}
      </ul>
    </div>
  );
}
```
