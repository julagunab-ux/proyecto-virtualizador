# Handoff para Claude Code — Función de borrado con confirmación (Fase A, cierre)

Este archivo agrega/reemplaza los archivos necesarios para poder borrar un curso, una lección, una diapositiva o una capa, cada uno con un diálogo de confirmación nativo del navegador (`window.confirm`) antes de ejecutar el borrado. Borrar un nivel borra en cascada todo lo que cuelga de él (ej. borrar una lección borra sus diapositivas, capas e ítems).

Instrucción para Claude Code: crea los archivos nuevos y reemplaza el contenido de los archivos existentes indicados. Si alguno ya tiene cambios que no están reflejados aquí (por ejemplo estilos que agregaste), muéstrame el diff antes de sobreescribir. Al final corre `npm run build` para confirmar que compila.

---

## `components/BotonEliminar.tsx` (nuevo)
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BotonEliminar({
  url,
  mensaje,
  redirigirA,
  texto = "Eliminar",
}: {
  url: string;
  mensaje: string;
  redirigirA?: string;
  texto?: string;
}) {
  const router = useRouter();
  const [eliminando, setEliminando] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(mensaje)) return;

    setEliminando(true);
    const res = await fetch(url, { method: "DELETE" });
    setEliminando(false);

    if (!res.ok) {
      window.alert("No se pudo eliminar. Intenta de nuevo.");
      return;
    }

    if (redirigirA) {
      router.push(redirigirA);
    } else {
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={eliminando}
      className="text-xs text-red-600 hover:underline disabled:opacity-50 whitespace-nowrap"
    >
      {eliminando ? "Eliminando..." : texto}
    </button>
  );
}
```

---

## `app/api/cursos/[id]/route.ts` (nuevo)
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

## `app/api/lecciones/[id]/route.ts` (nuevo)
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

## `app/api/diapositivas/[id]/route.ts` (nuevo)
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

*(`app/api/capas/[id]/route.ts` ya tiene su `DELETE` desde la fase anterior — no se toca.)*

---

## `app/page.tsx` (reemplazar completo)
```tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CrearCursoForm from "@/components/CrearCursoForm";
import BotonEliminar from "@/components/BotonEliminar";

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
            <BotonEliminar
              url={`/api/cursos/${curso.id}`}
              mensaje={`¿Eliminar el curso "${curso.titulo}"? Se borrarán también todas sus lecciones, diapositivas y capas. Esta acción no se puede deshacer.`}
            />
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

      <div className="flex justify-between items-start mt-2 mb-6">
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

## `app/lecciones/[id]/page.tsx` (reemplazar completo)
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CrearDiapositivaForm from "@/components/CrearDiapositivaForm";
import BotonEliminar from "@/components/BotonEliminar";

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

      <div className="flex justify-between items-start mt-2 mb-6">
        <h1 className="text-2xl font-semibold">
          Lección {leccion.numero}: {leccion.titulo}
        </h1>
        <BotonEliminar
          url={`/api/lecciones/${leccion.id}`}
          mensaje={`¿Eliminar la lección "${leccion.titulo}"? Se borrarán también sus diapositivas y capas. Esta acción no se puede deshacer.`}
          redirigirA={`/cursos/${leccion.cursoId}`}
          texto="Eliminar lección"
        />
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
            <BotonEliminar
              url={`/api/diapositivas/${diapositiva.id}`}
              mensaje={`¿Eliminar la diapositiva "${diapositiva.titulo}"? Se borrarán también sus capas. Esta acción no se puede deshacer.`}
            />
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

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <Link href={`/lecciones/${diapositiva.leccionId}`} className="text-sm text-zinc-500">
        &larr; {diapositiva.leccion.titulo}
      </Link>

      <div className="flex justify-between items-start mt-2 mb-6">
        <h1 className="text-2xl font-semibold">
          Diapositiva {diapositiva.numero}: {diapositiva.titulo}
        </h1>
        <BotonEliminar
          url={`/api/diapositivas/${diapositiva.id}`}
          mensaje={`¿Eliminar la diapositiva "${diapositiva.titulo}"? Se borrarán también sus capas. Esta acción no se puede deshacer.`}
          redirigirA={`/lecciones/${diapositiva.leccionId}`}
          texto="Eliminar diapositiva"
        />
      </div>

      <CrearCapaForm
        diapositivaId={diapositiva.id}
        siguienteNumero={`${diapositiva.numero}.${diapositiva.capas.length + 1}`}
        interacciones={interacciones.map((i) => i.nombre)}
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
            <BotonEliminar
              url={`/api/capas/${capa.id}`}
              mensaje={`¿Eliminar la capa ${capa.numero}? Esta acción no se puede deshacer.`}
            />
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

---

## `components/CapaEditor.tsx` (cambios — agregar botón "Eliminar capa")

Agrega este import junto a los demás:
```tsx
import BotonEliminar from "./BotonEliminar";
```

Y en el bloque final donde está el botón "Aprobar capa", agrega el botón de eliminar al lado:
```tsx
      <div className="flex items-center gap-3">
        <button
          onClick={aprobar}
          className="bg-black text-white rounded px-4 py-2 text-sm"
        >
          Aprobar capa
        </button>
        {guardando && <span className="text-xs text-zinc-400">Guardando...</span>}
        <div className="flex-1" />
        <BotonEliminar
          url={`/api/capas/${capa.id}`}
          mensaje={`¿Eliminar la capa ${capa.numero}? Esta acción no se puede deshacer.`}
          redirigirA={`/diapositivas/${capa.diapositivaId}`}
          texto="Eliminar capa"
        />
      </div>
```
(Reemplaza el `<div className="flex items-center gap-3">...</div>` final existente por este.)
