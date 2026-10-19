# Handoff para Claude Code — Fase D, Paso 4 (búsqueda sobre fuentes aprobadas) + herramienta de destino (Storyline / Genially)

Este archivo tiene dos partes independientes:

- **Parte 1.** Campo "herramienta de destino" del curso (Storyline, Genially o ambas) y marca de herramienta en el catálogo de interacciones/triggers.
- **Parte 2.** Paso 4 de la Fase D: búsqueda por significado sobre las fuentes APROBADAS e INDEXADAS de un curso, con una pantalla de prueba.

Requisitos previos: Fase C (con su ajuste), Fase D paso 2 y Fase D paso 3 ya aplicadas. Si alguna falta, aplícala primero.

Instrucción para Claude Code: aplica en el orden de abajo. Si algún archivo tiene cambios propios que no aparecen aquí, muéstrame el diff antes de sobreescribir. NO escribas llaves reales en ningún archivo. Al final corre `npx prisma generate` y `npm run build`.

---

# PARTE 1 — Herramienta de destino

## 1.1 `prisma/schema.prisma`

En `model Curso` agrega:
```prisma
  herramienta String @default("storyline") // "storyline" | "genially" | "ambas"
```

En `model InteraccionCatalogo` agrega:
```prisma
  herramienta String @default("ambas") // "storyline" | "genially" | "ambas"
```

Migración: `npx prisma migrate dev --name herramienta_destino` (o `npx prisma db push`). Los cursos existentes quedan como "storyline" y todo el catálogo como "ambas", así que nada cambia hasta que se marque.

## 1.2 `lib/kickoff.ts` — agregar al final (no reemplazar el archivo)

```ts
export const OPC_HERRAMIENTA = [
  { valor: "storyline", label: "Articulate Storyline" },
  { valor: "genially", label: "Genially" },
  { valor: "ambas", label: "Ambas (una versión en cada herramienta)" },
];

// Filtro de Prisma para el catálogo según la herramienta del curso.
// Si el curso es "ambas" o no se conoce la herramienta, no se filtra.
export function filtroHerramienta(herramienta?: string | null) {
  if (!herramienta || herramienta === "ambas") return undefined;
  return { herramienta: { in: [herramienta, "ambas"] } };
}
```

Y en `resumenKickoff`, agrega `herramienta: string;` al tipo del parámetro y esta línea al arreglo, justo antes de la de Fuentes:
```ts
    `Herramienta de destino: ${etiqueta(OPC_HERRAMIENTA, c.herramienta)}.`,
```

## 1.3 `components/KickoffForm.tsx` — pregunta 7

a) Importa `OPC_HERRAMIENTA` junto a los demás de `@/lib/kickoff`.

b) Estado nuevo:
```tsx
  const [herramienta, setHerramienta] = useState("storyline");
```

c) En el `body` del `fetch`, agrega `herramienta,` (por ejemplo después de `periodo`).

d) Bloque nuevo, justo debajo del bloque de Nivel/Periodo:
```tsx
      <div className="space-y-1">
        <label className={etiqueta}>7. Herramienta de destino</label>
        <select value={herramienta} onChange={(e) => setHerramienta(e.target.value)} className={campo}>
          {OPC_HERRAMIENTA.map((o) => (
            <option key={o.valor} value={o.valor}>{o.label}</option>
          ))}
        </select>
      </div>
```

## 1.4 APIs

### `app/api/cursos/route.ts` — en `POST`, dentro de `data` de `prisma.curso.create`
```ts
      herramienta: ["storyline", "genially", "ambas"].includes(body.herramienta)
        ? body.herramienta
        : "storyline",
```
Y en la llamada a `resumenKickoff(...)` que arma el texto de la bitácora, pasa `herramienta: curso.herramienta`.

### `app/api/cursos/[id]/route.ts`
En `CAMPOS_TEXTO` agrega `"herramienta",`. Valida el valor en el PATCH: si viene `herramienta` y no es uno de los tres valores, responde 400. Como el PATCH ya registra los cambios en la bitácora, el cambio de herramienta quedará anotado solo.

### `app/api/interacciones/route.ts`
En `GET`, lee también `herramienta` y combina con el filtro de `tipo`:
```ts
import { filtroHerramienta } from "@/lib/kickoff";
// ...
  const tipo = req.nextUrl.searchParams.get("tipo");
  const herramienta = req.nextUrl.searchParams.get("herramienta");

  const interacciones = await prisma.interaccionCatalogo.findMany({
    where: {
      ...(tipo ? { tipo } : {}),
      ...(filtroHerramienta(herramienta) ?? {}),
    },
    orderBy: { nombre: "asc" },
  });
```
En `POST`, acepta `herramienta` opcional (por defecto `"ambas"`) y guárdala en `data`.

## 1.5 Ficha del curso (`app/cursos/[id]/page.tsx`)

a) Importa `OPC_HERRAMIENTA` de `@/lib/kickoff`.

b) En el bloque "Ficha del curso", agrega:
```tsx
        <p className={campoFicha}>
          <span className="font-medium">Herramienta de destino:</span>{" "}
          {etiqueta(OPC_HERRAMIENTA, curso.herramienta)}
        </p>
```

c) En el `BotonEditar` de la ficha, agrega a `campos`:
```tsx
              { key: "herramienta", label: "Herramienta de destino", type: "select", opciones: OPC_HERRAMIENTA },
```
y a `valores`: `herramienta: curso.herramienta,`.

## 1.6 Usar el filtro donde se eligen interacciones y triggers

La idea: al ELEGIR una interacción o un trigger se muestran solo los compatibles con la herramienta del curso, pero al ABRIR una capa que ya tiene una interacción guardada siempre se debe encontrar su definición (aunque quedara marcada para la otra herramienta), para no romper capas existentes.

- **`app/diapositivas/[id]/page.tsx`** (lista de interacciones del selector de "Nueva capa"): carga también el curso (`include: { leccion: { include: { curso: true } } }`) y filtra con
  ```ts
  where: { tipo: "interaccion", ...(filtroHerramienta(diapositiva.leccion.curso.herramienta) ?? {}) }
  ```
- **`components/CapaEditor.tsx`**: la búsqueda de la definición de la capa actual (`todas.find((c) => c.nombre === dataCapa.interaccion)`) debe seguir usando el catálogo SIN filtrar. Si el editor tiene un selector para cambiar la interacción o para elegir tipos de trigger, ahí sí aplica el filtro: obtén la herramienta del curso de la capa (Claude Code: revisa cómo se carga la capa y agrega el curso si hace falta) y llama a `/api/interacciones?herramienta=...`.
- Si en alguna pantalla no es evidente cómo llegar al curso, dímelo antes de improvisar.

## 1.7 Marcar el catálogo (manual, una sola vez)

Por ahora no hay pantalla para esto. Usa `npx prisma studio`, abre `InteraccionCatalogo` y cambia la columna `herramienta` de las entradas que solo sirvan en una herramienta (por ejemplo, los triggers por variable o condición son un concepto de Storyline → `storyline`). Las demás se quedan en `ambas`. No marques nada de Genially hasta tener la lista real de interacciones que se usan allí.

## 1.8 Cómo probarlo
1. `/cursos/nuevo`: aparece la pregunta 7; crea un curso con "Genially" y revisa la Bitácora: el kickoff menciona la herramienta.
2. En la ficha, editar la herramienta debe cambiar el valor y dejar una línea en la Bitácora.
3. En Prisma Studio marca un trigger de prueba como `storyline`. En un curso Genially no debe aparecer en los selectores; en uno Storyline o "ambas" sí.
4. Abre una capa vieja que use esa interacción dentro del curso Genially: debe abrir sin errores.

---

# PARTE 2 — Paso 4: búsqueda sobre fuentes aprobadas

Qué hace: dada una consulta, devuelve los fragmentos más parecidos por significado, pero SOLO de las fuentes del curso que están aprobadas y con `estadoIndexado = "indexada"`. Las fuentes sugeridas sin aprobar y las pendientes o con error nunca se consultan. Es la base de la generación (paso 6) y del futuro chatbot para Moodle.

## 2.1 `lib/busqueda.ts` (nuevo)
```ts
import { prisma } from "@/lib/prisma";
import { obtenerIndice } from "@/lib/pinecone";

export type Resultado = {
  id: string;
  puntaje: number;
  fuenteId: string;
  titulo: string;
  pagina?: number;
  texto: string;
};

export type RespuestaBusqueda = {
  resultados: Resultado[];
  fuentesConsultadas: number;
  aviso?: string;
};

export const MAX_CONSULTA = 500;

/** Busca en las fuentes APROBADAS e INDEXADAS del curso. */
export async function buscarFuentes(
  cursoId: string,
  consulta: string,
  k = 6
): Promise<RespuestaBusqueda> {
  const fuentes = await prisma.fuente.findMany({
    where: { cursoId, aprobada: true, estadoIndexado: "indexada" },
    select: { id: true },
  });

  if (fuentes.length === 0) {
    return {
      resultados: [],
      fuentesConsultadas: 0,
      aviso:
        "Este curso no tiene fuentes aprobadas e indexadas. Aprueba e indexa al menos una en la pantalla de Fuentes.",
    };
  }

  const indice = await obtenerIndice(false);
  if (!indice) {
    return {
      resultados: [],
      fuentesConsultadas: 0,
      aviso: "El índice de Pinecone todavía no existe. Indexa una fuente primero.",
    };
  }

  const respuesta = await indice.namespace(cursoId).searchRecords({
    query: {
      topK: Math.min(Math.max(k, 1), 10),
      inputs: { text: consulta },
      // Si el compilador se queja del tipo del filtro, ajustar solo el tipo (p. ej. "as never").
      filter: { fuenteId: { $in: fuentes.map((f) => f.id) } },
    },
    fields: ["chunk_text", "fuenteId", "titulo", "pagina"],
  });

  const resultados: Resultado[] = respuesta.result.hits.map((h) => {
    const campos = h.fields as Record<string, unknown>;
    return {
      id: h._id,
      puntaje: h._score,
      fuenteId: String(campos.fuenteId ?? ""),
      titulo: String(campos.titulo ?? ""),
      pagina: typeof campos.pagina === "number" ? campos.pagina : undefined,
      texto: String(campos.chunk_text ?? ""),
    };
  });

  return { resultados, fuentesConsultadas: fuentes.length };
}
```

## 2.2 `app/api/busqueda/route.ts` (nuevo)
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarFuentes, MAX_CONSULTA } from "@/lib/busqueda";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const cursoId = String(body.cursoId ?? "");
  const consulta = String(body.consulta ?? "").trim();
  const k = Number(body.k ?? 6);

  if (!cursoId || !consulta) {
    return NextResponse.json({ error: "cursoId y consulta son obligatorios" }, { status: 400 });
  }
  if (consulta.length > MAX_CONSULTA) {
    return NextResponse.json({ error: `La consulta supera ${MAX_CONSULTA} caracteres` }, { status: 400 });
  }

  const curso = await prisma.curso.findUnique({ where: { id: cursoId }, select: { id: true } });
  if (!curso) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  try {
    const respuesta = await buscarFuentes(cursoId, consulta, Number.isFinite(k) ? k : 6);
    return NextResponse.json(respuesta);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo completar la búsqueda" },
      { status: 500 }
    );
  }
}
```

## 2.3 `components/BusquedaFuentes.tsx` (nuevo)
```tsx
"use client";

import { useState } from "react";
import type { RespuestaBusqueda } from "@/lib/busqueda";

export default function BusquedaFuentes({ cursoId }: { cursoId: string }) {
  const [consulta, setConsulta] = useState("");
  const [k, setK] = useState(6);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [respuesta, setRespuesta] = useState<RespuestaBusqueda | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!consulta.trim()) return;
    setCargando(true);
    setError("");
    setRespuesta(null);

    try {
      const res = await fetch("/api/busqueda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursoId, consulta, k }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Error en la búsqueda");
      else setRespuesta(data);
    } catch {
      setError("No se pudo conectar con el servidor");
    }
    setCargando(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={buscar} className="space-y-3">
        <textarea
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Escribe una pregunta o un tema, por ejemplo: ¿Cómo se registra una factura de venta?"
          className="border rounded px-3 py-2 text-sm w-full"
        />
        <div className="flex items-center gap-3">
          <label className="text-sm">
            Resultados:{" "}
            <select value={k} onChange={(e) => setK(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
              {[3, 6, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={cargando || !consulta.trim()}
            className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {cargando ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {respuesta?.aviso && <p className="text-sm text-amber-700">{respuesta.aviso}</p>}

      {respuesta && !respuesta.aviso && (
        <p className="text-xs text-zinc-500">
          Se consultaron {respuesta.fuentesConsultadas} fuente(s) aprobada(s). {respuesta.resultados.length} resultado(s).
        </p>
      )}

      <ul className="space-y-3">
        {respuesta?.resultados.map((r) => (
          <li key={r.id} className="border rounded p-3">
            <div className="flex justify-between gap-3 text-xs text-zinc-500 mb-1">
              <span>
                {r.titulo}
                {r.pagina !== undefined && ` — pág. ${r.pagina}`}
              </span>
              <span>similitud {r.puntaje.toFixed(2)}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{r.texto}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## 2.4 `app/cursos/[id]/busqueda/page.tsx` (nuevo)
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BusquedaFuentes from "@/components/BusquedaFuentes";

export const dynamic = "force-dynamic";

export default async function BusquedaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const curso = await prisma.curso.findUnique({
    where: { id },
    include: { fuentes: { orderBy: { createdAt: "asc" } } },
  });
  if (!curso) notFound();

  const consultables = curso.fuentes.filter((f) => f.aprobada && f.estadoIndexado === "indexada");
  const noConsultables = curso.fuentes.filter((f) => !(f.aprobada && f.estadoIndexado === "indexada"));

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <Link href={`/cursos/${curso.id}`} className="text-sm text-zinc-500">
        &larr; {curso.titulo}
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1">Búsqueda en las fuentes</h1>
      <p className="text-sm text-zinc-600 mb-6">
        Prueba qué recupera el sistema antes de generar contenido. Solo se consultan las fuentes aprobadas e indexadas.
      </p>

      <div className="border rounded p-3 mb-6 text-sm space-y-1">
        <p>
          <span className="font-medium">Consultables ({consultables.length}):</span>{" "}
          {consultables.length ? consultables.map((f) => f.titulo).join("; ") : "ninguna"}
        </p>
        {noConsultables.length > 0 && (
          <p className="text-zinc-600">
            <span className="font-medium">Excluidas ({noConsultables.length}):</span>{" "}
            {noConsultables
              .map((f) => `${f.titulo} (${!f.aprobada ? "sin aprobar" : f.estadoIndexado})`)
              .join("; ")}
          </p>
        )}
        <p className="text-xs text-zinc-500">
          Una fuente recién indexada puede tardar unos segundos en aparecer en los resultados.
        </p>
      </div>

      <BusquedaFuentes cursoId={curso.id} />
    </div>
  );
}
```

## 2.5 Enlace de acceso
En `app/cursos/[id]/page.tsx`, junto a los enlaces existentes a "Fuentes" y "Bitácora", agrega un enlace a `/cursos/${curso.id}/busqueda` con el texto "Probar búsqueda". Copia el estilo de los otros enlaces.

## 2.6 Cómo probarlo
1. Con al menos una fuente indexada y aprobada, abre `/cursos/[id]/busqueda`: arriba debe listarla como "Consultable".
2. Escribe una pregunta que el documento SÍ responda: el primer resultado debe ser un fragmento relevante, con título y página (si es PDF).
3. Escribe una pregunta totalmente ajena: los resultados deben tener similitud claramente menor. Anota los puntajes de ambos casos: sirven para fijar más adelante un umbral mínimo de relevancia.
4. Desmarca la aprobación de la fuente (si tienes una sugerida): debe pasar a "Excluidas" y dejar de aparecer en los resultados.
5. Sin fuentes consultables, la pantalla muestra el aviso en lugar de resultados.
6. Si la consulta falla con un error de Pinecone, copia el mensaje exacto para ajustarlo.
