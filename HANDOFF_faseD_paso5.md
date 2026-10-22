# Handoff para Claude Code — Fase D, Paso 5: especificaciones por lección y verificación de insumos

Qué hace: antes de generar una lección con IA (paso 6), cada lección tiene su propia ficha de especificaciones:

- **Número de diapositivas confirmado** (no se asume; se confirma aquí).
- **Fuentes asignadas** a esa lección (solo pueden asignarse las aprobadas e indexadas).
- **Notas** para esa lección (enfoque, qué enfatizar, qué evitar).

Y una **lista de verificación** que dice si la lección está lista para generarse: los bloqueos impiden generar; los avisos solo informan. Esta pantalla no llama a la IA ni gasta tokens.

Requisitos previos: Fase C (con su ajuste), Fase D pasos 2, 3 y 4 ya aplicados.

Instrucción para Claude Code: aplica en el orden de abajo. Si algún archivo tiene cambios propios que no aparecen aquí, muéstrame el diff antes de sobreescribir. NO escribas llaves reales ni toques `.env`. Al final corre `npx prisma generate` y `npm run build`.

---

## 1. `prisma/schema.prisma`

En `model Leccion` agrega:
```prisma
  numDiapositivas Int?                         // null = aún no confirmado
  fuentesIds      String[] @default([])        // IDs de Fuente asignadas a esta lección
  notas           String   @default("")
```

Migración: `npx prisma migrate dev --name leccion_especificaciones` (o `npx prisma db push`). Las lecciones existentes quedan con número sin confirmar, sin fuentes y sin notas. `fuentesIds` guarda IDs sin relación en la base de datos, por eso no hay que tocar los borrados: si una fuente se elimina, su ID queda huérfano y el código lo ignora al leer.

---

## 2. `lib/preparacion.ts` (nuevo)

```ts
import { aplicaEjemplo } from "@/lib/kickoff";

export type FuenteBasica = { id: string; aprobada: boolean; estadoIndexado: string };

export type Verificacion = {
  ok: boolean;
  nivel: "bloqueo" | "aviso";
  texto: string;
};

export type EstadoPreparacion = {
  listo: boolean; // true si no hay ningún bloqueo sin cumplir
  verificaciones: Verificacion[];
  fuentesEfectivas: string[]; // IDs asignados que hoy son consultables
};

export function esConsultable(f: FuenteBasica) {
  return f.aprobada && f.estadoIndexado === "indexada";
}

/** De las fuentes asignadas a la lección, las que hoy se pueden consultar. */
export function fuentesEfectivas(asignadas: string[], fuentesCurso: FuenteBasica[]) {
  return fuentesCurso.filter((f) => asignadas.includes(f.id) && esConsultable(f)).map((f) => f.id);
}

export function verificarLeccion(
  curso: {
    temario: string;
    arquitecturaAprobada: boolean;
    ejemploIntegrador: string;
    ejemploDesc: string;
  },
  leccion: {
    objetivo: string;
    duracion: string;
    usaEjemplo: boolean;
    numDiapositivas: number | null;
    fuentesIds: string[];
    cantidadDiapositivasExistentes: number;
  },
  fuentesCurso: FuenteBasica[]
): EstadoPreparacion {
  const efectivas = fuentesEfectivas(leccion.fuentesIds, fuentesCurso);
  const asignadasNoConsultables = leccion.fuentesIds.filter(
    (id) => fuentesCurso.some((f) => f.id === id) && !efectivas.includes(id)
  ).length;
  const llevaEjemplo = aplicaEjemplo(curso.ejemploIntegrador, leccion.usaEjemplo);

  const verificaciones: Verificacion[] = [
    {
      ok: leccion.objetivo.trim().length > 0,
      nivel: "bloqueo",
      texto: "La lección tiene objetivo definido",
    },
    {
      ok: leccion.duracion.trim().length > 0,
      nivel: "bloqueo",
      texto: "La lección tiene duración estimada",
    },
    {
      ok: leccion.numDiapositivas !== null,
      nivel: "bloqueo",
      texto: "El número de diapositivas está confirmado",
    },
    {
      ok: efectivas.length > 0,
      nivel: "bloqueo",
      texto: "Tiene al menos una fuente asignada, aprobada e indexada (sin fuentes, todo saldría como [SME])",
    },
    {
      ok: !llevaEjemplo || curso.ejemploDesc.trim().length > 0,
      nivel: "bloqueo",
      texto: "Si la lección lleva ejemplo integrador, el curso describe el caso",
    },
    {
      ok: asignadasNoConsultables === 0,
      nivel: "aviso",
      texto: `Hay ${asignadasNoConsultables} fuente(s) asignada(s) que ya no se pueden consultar (sin aprobar o sin indexar); se ignorarán`,
    },
    {
      ok: curso.temario.trim().length > 0,
      nivel: "aviso",
      texto: "El curso tiene temario cargado",
    },
    {
      ok: curso.arquitecturaAprobada,
      nivel: "aviso",
      texto: "La arquitectura del curso está aprobada",
    },
    {
      ok: leccion.cantidadDiapositivasExistentes === 0,
      nivel: "aviso",
      texto: `La lección ya tiene ${leccion.cantidadDiapositivasExistentes} diapositiva(s): generar de nuevo no debería pisarlas sin tu aprobación`,
    },
  ];

  return {
    listo: verificaciones.every((v) => v.ok || v.nivel === "aviso"),
    verificaciones,
    fuentesEfectivas: efectivas,
  };
}
```

---

## 3. `app/api/lecciones/[id]/route.ts` — reemplazar SOLO la función `PATCH`

(Deja `GET` y `DELETE` como están.) Esta versión conserva los campos que ya existían (`numero`, `titulo`, `objetivo`, `duracion`, `usaEjemplo`) y agrega los tres nuevos. Si tu archivo no tiene todavía alguno de los anteriores, añádelo siguiendo `HANDOFF_faseC_ajuste.md`.

```ts
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const antes = await prisma.leccion.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 });
  }

  const data: {
    numero?: number;
    titulo?: string;
    objetivo?: string;
    duracion?: string;
    usaEjemplo?: boolean;
    numDiapositivas?: number | null;
    fuentesIds?: string[];
    notas?: string;
  } = {};

  if ("numero" in body) data.numero = Number(body.numero);
  if ("titulo" in body) data.titulo = String(body.titulo);
  if ("objetivo" in body) data.objetivo = String(body.objetivo);
  if ("duracion" in body) data.duracion = String(body.duracion);
  if ("usaEjemplo" in body) data.usaEjemplo = body.usaEjemplo === "si" || body.usaEjemplo === true;
  if ("notas" in body) data.notas = String(body.notas).slice(0, 4000);

  if ("numDiapositivas" in body) {
    if (body.numDiapositivas === null || body.numDiapositivas === "") {
      data.numDiapositivas = null;
    } else {
      const n = Number(body.numDiapositivas);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        return NextResponse.json(
          { error: "El número de diapositivas debe ser un entero entre 1 y 100" },
          { status: 400 }
        );
      }
      data.numDiapositivas = n;
    }
  }

  if ("fuentesIds" in body) {
    if (!Array.isArray(body.fuentesIds)) {
      return NextResponse.json({ error: "fuentesIds debe ser una lista" }, { status: 400 });
    }
    // Solo se aceptan fuentes que pertenezcan al mismo curso.
    const delCurso = await prisma.fuente.findMany({
      where: { cursoId: antes.cursoId },
      select: { id: true },
    });
    const validas = new Set(delCurso.map((f) => f.id));
    data.fuentesIds = (body.fuentesIds as unknown[])
      .map(String)
      .filter((fid) => validas.has(fid));
  }

  const leccion = await prisma.leccion.update({ where: { id }, data });

  // Bitácora: solo cuando cambia la confirmación del número de diapositivas.
  if ("numDiapositivas" in data && data.numDiapositivas !== antes.numDiapositivas) {
    await prisma.decision.create({
      data: {
        cursoId: antes.cursoId,
        tipo: "cambio",
        leccionRef: `Lección ${leccion.numero}: ${leccion.titulo}`,
        texto:
          data.numDiapositivas === null
            ? "Se quitó la confirmación del número de diapositivas."
            : `Número de diapositivas confirmado en ${data.numDiapositivas}.`,
      },
    });
  }

  return NextResponse.json(leccion);
}
```

---

## 4. `components/EspecificacionesForm.tsx` (nuevo)

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FuenteVista = {
  id: string;
  titulo: string;
  consultable: boolean;
  motivo: string; // "" si es consultable
};

export default function EspecificacionesForm({
  leccionId,
  numInicial,
  notasIniciales,
  asignadasIniciales,
  fuentes,
}: {
  leccionId: string;
  numInicial: number | null;
  notasIniciales: string;
  asignadasIniciales: string[];
  fuentes: FuenteVista[];
}) {
  const router = useRouter();
  const [num, setNum] = useState(numInicial === null ? "" : String(numInicial));
  const [notas, setNotas] = useState(notasIniciales);
  const [sel, setSel] = useState<Set<string>>(new Set(asignadasIniciales));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  function alternar(id: string) {
    setSel((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  function asignarTodas() {
    setSel(new Set([...sel, ...fuentes.filter((f) => f.consultable).map((f) => f.id)]));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setMensaje("");

    const res = await fetch(`/api/lecciones/${leccionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numDiapositivas: num.trim() === "" ? null : Number(num),
        notas,
        fuentesIds: [...sel],
      }),
    });

    setGuardando(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMensaje(data.error ?? "No se pudo guardar");
      return;
    }

    setMensaje("Guardado");
    router.refresh();
  }

  const campo = "border rounded px-3 py-2 text-sm w-full";

  return (
    <form onSubmit={guardar} className="space-y-6">
      <div className="space-y-1">
        <label className="text-sm font-medium">Número de diapositivas (confirmado por ti)</label>
        <input
          type="number"
          min={1}
          max={100}
          value={num}
          onChange={(e) => setNum(e.target.value)}
          className={campo + " max-w-[10rem]"}
        />
        <p className="text-xs text-zinc-500">
          Déjalo vacío si todavía no lo defines. Si lo llenas, queda confirmado y se anota en la bitácora.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Fuentes de esta lección</label>
          <button type="button" onClick={asignarTodas} className="text-xs underline">
            Asignar todas las consultables
          </button>
        </div>
        {fuentes.length === 0 && (
          <p className="text-sm text-zinc-500">El curso aún no tiene fuentes. Agrégalas en la pantalla de Fuentes.</p>
        )}
        <ul className="space-y-1">
          {fuentes.map((f) => (
            <li key={f.id}>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sel.has(f.id)}
                  disabled={!f.consultable && !sel.has(f.id)}
                  onChange={() => alternar(f.id)}
                  className="mt-1"
                />
                <span>
                  {f.titulo}
                  {!f.consultable && <span className="text-xs text-amber-700"> — {f.motivo}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Notas para esta lección</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="Enfoque, qué enfatizar, qué evitar, nivel de detalle, ejemplos que sí o no deben usarse..."
          className={campo}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={guardando}
          className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar especificaciones"}
        </button>
        {mensaje && <span className="text-sm text-zinc-600">{mensaje}</span>}
      </div>
    </form>
  );
}
```

---

## 5. `app/lecciones/[id]/especificaciones/page.tsx` (nuevo)

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { aplicaEjemplo, etiqueta, OPC_EJEMPLO, normalizarEjemplo } from "@/lib/kickoff";
import { esConsultable, verificarLeccion } from "@/lib/preparacion";
import EspecificacionesForm from "@/components/EspecificacionesForm";

export const dynamic = "force-dynamic";

export default async function EspecificacionesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const leccion = await prisma.leccion.findUnique({
    where: { id },
    include: {
      curso: { include: { fuentes: { orderBy: { createdAt: "asc" } } } },
      _count: { select: { diapositivas: true } },
    },
  });
  if (!leccion) notFound();

  const curso = leccion.curso;

  const estado = verificarLeccion(
    curso,
    {
      objetivo: leccion.objetivo,
      duracion: leccion.duracion,
      usaEjemplo: leccion.usaEjemplo,
      numDiapositivas: leccion.numDiapositivas,
      fuentesIds: leccion.fuentesIds,
      cantidadDiapositivasExistentes: leccion._count.diapositivas,
    },
    curso.fuentes
  );

  const fuentesVista = curso.fuentes.map((f) => ({
    id: f.id,
    titulo: f.titulo,
    consultable: esConsultable(f),
    motivo: !f.aprobada ? "sin aprobar" : f.estadoIndexado !== "indexada" ? `no indexada (${f.estadoIndexado})` : "",
  }));

  const llevaEjemplo = aplicaEjemplo(curso.ejemploIntegrador, leccion.usaEjemplo);

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <Link href={`/lecciones/${leccion.id}`} className="text-sm text-zinc-500">
        &larr; Lección {leccion.numero}: {leccion.titulo}
      </Link>

      <h1 className="text-2xl font-semibold mt-2 mb-1">Especificaciones de la lección</h1>
      <p className="text-sm text-zinc-600 mb-6">
        Lo que se usará al generar esta lección con IA. Nada se genera desde esta pantalla.
      </p>

      <div className="border rounded p-3 mb-6 text-sm space-y-1">
        <p><span className="font-medium">Objetivo:</span> {leccion.objetivo || "sin definir"}</p>
        <p><span className="font-medium">Duración estimada:</span> {leccion.duracion || "sin definir"}</p>
        <p>
          <span className="font-medium">Ejemplo integrador:</span>{" "}
          {llevaEjemplo
            ? `sí (${etiqueta(OPC_EJEMPLO, normalizarEjemplo(curso.ejemploIntegrador))})`
            : "no aplica a esta lección"}
        </p>
        <p className="text-xs text-zinc-500">
          Para cambiar objetivo, duración o ejemplo integrador, usa el botón Editar de la lección.
        </p>
      </div>

      <h2 className="text-sm font-semibold mb-2">
        Verificación de insumos —{" "}
        <span className={estado.listo ? "text-green-700" : "text-red-700"}>
          {estado.listo ? "lista para generar" : "faltan requisitos"}
        </span>
      </h2>
      <ul className="mb-8 space-y-1">
        {estado.verificaciones.map((v, i) => (
          <li key={i} className="text-sm flex gap-2">
            <span className={v.ok ? "text-green-700" : v.nivel === "bloqueo" ? "text-red-700" : "text-amber-700"}>
              {v.ok ? "✓" : v.nivel === "bloqueo" ? "✕" : "!"}
            </span>
            <span className={v.ok ? "text-zinc-600" : ""}>
              {v.texto}
              {!v.ok && <span className="text-xs text-zinc-500"> ({v.nivel === "bloqueo" ? "bloquea la generación" : "aviso"})</span>}
            </span>
          </li>
        ))}
      </ul>

      <EspecificacionesForm
        leccionId={leccion.id}
        numInicial={leccion.numDiapositivas}
        notasIniciales={leccion.notas}
        asignadasIniciales={leccion.fuentesIds}
        fuentes={fuentesVista}
      />
    </div>
  );
}
```

---

## 6. Enlaces de acceso

- **`app/lecciones/[id]/page.tsx`**: junto al título (o a los botones Editar/Eliminar), agrega un enlace a `/lecciones/${leccion.id}/especificaciones` con el texto "Especificaciones de generación". Copia el estilo de los otros enlaces.
- **`app/cursos/[id]/page.tsx`** (opcional): en la lista de lecciones, debajo del título, un texto pequeño con el estado, calculado con `verificarLeccion`. Si resulta incómodo por las consultas adicionales, omítelo: no es necesario para el paso 6.

---

## Cómo probarlo
1. Abre `/lecciones/[id]/especificaciones` de una lección sin objetivo: debe mostrar "faltan requisitos" con ✕ en objetivo, duración, número de diapositivas y fuentes.
2. Completa objetivo y duración con el botón Editar de la lección; vuelve a la pantalla: esos dos pasan a ✓.
3. Escribe un número de diapositivas y guarda: pasa a ✓ y la Bitácora muestra "Número de diapositivas confirmado en N" con la referencia a la lección. Vacíalo y guarda: vuelve a ✕ y la bitácora anota que se quitó.
4. Asigna una fuente aprobada e indexada: la verificación de fuentes pasa a ✓. Una fuente sin aprobar o sin indexar debe aparecer deshabilitada con su motivo.
5. Desmarca la aprobación de una fuente ya asignada: la pantalla debe mostrar el aviso "ya no se pueden consultar" y `listo` debe volver a evaluarse según las demás.
6. Con el curso en modo "solo en lecciones específicas" y la lección marcada con ejemplo, sin descripción del caso en el curso: debe bloquear. Con descripción: pasa.
7. Intenta guardar `0` o `101` diapositivas: la API responde 400 y el formulario muestra el mensaje.
