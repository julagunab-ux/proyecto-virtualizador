# Handoff para Claude Code — Fase C: inicio de curso, arquitectura, fuentes y bitácora

Qué agrega:
1. **Cuestionario de inicio** (`/cursos/nuevo`): las 7 preguntas de las instrucciones del proyecto + temario. Reemplaza el formulario corto de "crear curso".
2. **Ficha del curso** en la página del curso, editable. Cada cambio queda registrado solo en la bitácora.
3. **Arquitectura:** cada lección lleva objetivo y duración estimada, y el curso tiene un botón "Aprobar arquitectura".
4. **Fuentes** (`/cursos/[id]/fuentes`): links y descripciones con tipo, fecha de consulta y estado de aprobación. Las fuentes sugeridas quedan "pendientes de aprobación" hasta que las apruebes.
5. **Bitácora** (`/cursos/[id]/bitacora`): decisiones del kickoff, cambios y notas manuales.

Instrucción para Claude Code: lee este archivo y aplícalo en orden: (1) cambios de `schema.prisma` y migración, (2) archivos nuevos, (3) archivos que se reemplazan por completo, (4) cambios puntuales. Si algún archivo tiene cambios propios que no aparecen aquí, muéstrame el diff antes de sobreescribir. Al final corre `npx prisma generate` y `npm run build`.

---

## 1. `prisma/schema.prisma` — cambios

Todos los campos nuevos tienen valor por defecto, así que los cursos y lecciones existentes siguen funcionando.

En `model Curso`, agrega estos campos y las dos relaciones:
```prisma
  ejemploIntegrador    String   @default("no")          // "si" | "no"
  ejemploDesc          String   @default("")
  uifcito              String   @default("por_leccion") // "si" | "no" | "por_leccion"
  duracionObjetivo     String   @default("")
  fuentesEstado        String   @default("pendiente")   // "tengo" | "sugerir" | "pendiente"
  temario              String   @default("")
  arquitecturaAprobada Boolean  @default(false)

  fuentes    Fuente[]
  decisiones Decision[]
```

En `model Leccion`, agrega:
```prisma
  objetivo String @default("")
  duracion String @default("")
```

Modelos nuevos (al final del archivo):
```prisma
model Fuente {
  id            String   @id @default(cuid())
  tipo          String   @default("link")    // "link" | "documento" | "normativa" | "otro"
  titulo        String
  url           String   @default("")
  descripcion   String   @default("")
  origen        String   @default("usuario") // "usuario" | "sugerida"
  aprobada      Boolean  @default(true)
  fechaConsulta DateTime @default(now())
  createdAt     DateTime @default(now())
  cursoId       String
  curso         Curso    @relation(fields: [cursoId], references: [id])

  @@map("fuentes")
}

model Decision {
  id         String   @id @default(cuid())
  tipo       String   @default("nota") // "kickoff" | "cambio" | "nota"
  texto      String
  leccionRef String   @default("")     // texto libre, ej. "Lección 2: Facturación"
  createdAt  DateTime @default(now())
  cursoId    String
  curso      Curso    @relation(fields: [cursoId], references: [id])

  @@map("decisiones")
}
```

Migración: `npx prisma migrate dev --name fase_c_kickoff_fuentes_bitacora`. Si Neon rechaza la migración por permisos del shadow database, usa `npx prisma db push` como alternativa. Después corre `npx prisma generate`.

---

## 2. Archivos nuevos

### `lib/kickoff.ts`
```ts
export const LINEAS = [
  { codigo: "PRG", nombre: "Programación" },
  { codigo: "CON", nombre: "Contaduría" },
  { codigo: "ECO", nombre: "Economía" },
];

export const NIVELES = ["FUN", "INT", "AVA"];

export const OPC_EJEMPLO = [
  { valor: "no", label: "No" },
  { valor: "si", label: "Sí, hay ejemplo integrador" },
];

export const OPC_UIFCITO = [
  { valor: "por_leccion", label: "Decidir lección por lección" },
  { valor: "si", label: "Sí, protagonista del curso" },
  { valor: "no", label: "No" },
];

export const OPC_FUENTES = [
  { valor: "pendiente", label: "Aún no definido" },
  { valor: "tengo", label: "Ya tengo las fuentes (las cargo en Fuentes)" },
  { valor: "sugerir", label: "No las tengo: sugerir fuentes confiables (requieren mi aprobación)" },
];

export const TIPOS_FUENTE = [
  { valor: "link", label: "Link / página web" },
  { valor: "documento", label: "Documento (PDF, Word, etc.)" },
  { valor: "normativa", label: "Normativa oficial" },
  { valor: "otro", label: "Otro" },
];

export function etiqueta(opciones: { valor: string; label: string }[], valor: string) {
  return opciones.find((o) => o.valor === valor)?.label ?? valor;
}

export function resumenKickoff(c: {
  linea: string;
  titulo: string;
  nivel: string;
  periodo: string;
  ejemploIntegrador: string;
  ejemploDesc: string;
  uifcito: string;
  duracionObjetivo: string;
  fuentesEstado: string;
}) {
  return [
    `Kickoff del curso "${c.titulo}".`,
    `Línea: ${c.linea}. Nivel: ${c.nivel}. Periodo: ${c.periodo}.`,
    `Ejemplo integrador: ${etiqueta(OPC_EJEMPLO, c.ejemploIntegrador)}${c.ejemploDesc ? " (" + c.ejemploDesc + ")" : ""}.`,
    `Uifcito como protagonista: ${etiqueta(OPC_UIFCITO, c.uifcito)}.`,
    `Duración objetivo por lección: ${c.duracionObjetivo || "sin definir"}.`,
    `Fuentes: ${etiqueta(OPC_FUENTES, c.fuentesEstado)}.`,
  ].join(" ");
}
```

### `components/BotonAccion.tsx`
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BotonAccion({
  url,
  method = "PATCH",
  body,
  texto,
  confirmar,
  estilo = "link",
}: {
  url: string;
  method?: "PATCH" | "POST" | "DELETE";
  body?: Record<string, unknown>;
  texto: string;
  confirmar?: string;
  estilo?: "link" | "boton";
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);

  async function click(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (confirmar && !window.confirm(confirmar)) return;

    setOcupado(true);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setOcupado(false);

    if (!res.ok) {
      window.alert("No se pudo completar la acción. Intenta de nuevo.");
      return;
    }
    router.refresh();
  }

  const clase =
    estilo === "boton"
      ? "text-xs bg-black text-white rounded px-3 py-1.5 disabled:opacity-50 whitespace-nowrap"
      : "text-xs text-emerald-700 hover:underline disabled:opacity-50 whitespace-nowrap";

  return (
    <button onClick={click} disabled={ocupado} className={clase}>
      {ocupado ? "..." : texto}
    </button>
  );
}
```

### `components/KickoffForm.tsx`
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LINEAS,
  NIVELES,
  OPC_EJEMPLO,
  OPC_UIFCITO,
  OPC_FUENTES,
} from "@/lib/kickoff";

export default function KickoffForm() {
  const router = useRouter();
  const [lineaSel, setLineaSel] = useState(LINEAS[0].codigo);
  const [lineaOtra, setLineaOtra] = useState("");
  const [titulo, setTitulo] = useState("");
  const [nivel, setNivel] = useState("FUN");
  const [periodo, setPeriodo] = useState("2026-2");
  const [ejemploIntegrador, setEjemploIntegrador] = useState("no");
  const [ejemploDesc, setEjemploDesc] = useState("");
  const [uifcito, setUifcito] = useState("por_leccion");
  const [duracionObjetivo, setDuracionObjetivo] = useState("2 h de parte práctica");
  const [fuentesEstado, setFuentesEstado] = useState("pendiente");
  const [temario, setTemario] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);

    const linea = lineaSel === "OTRA" ? lineaOtra.trim().toUpperCase() : lineaSel;

    const res = await fetch("/api/cursos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        linea,
        titulo: titulo.trim(),
        nivel,
        periodo: periodo.trim(),
        ejemploIntegrador,
        ejemploDesc: ejemploIntegrador === "si" ? ejemploDesc : "",
        uifcito,
        duracionObjetivo,
        fuentesEstado,
        temario,
      }),
    });

    setEnviando(false);

    if (!res.ok) {
      window.alert("No se pudo crear el curso. Revisa los campos.");
      return;
    }

    const curso = await res.json();
    router.push(fuentesEstado === "pendiente" ? `/cursos/${curso.id}` : `/cursos/${curso.id}/fuentes`);
  }

  const campo = "border rounded px-3 py-2 text-sm w-full";
  const etiqueta = "text-sm font-medium";

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div className="space-y-1">
        <label className={etiqueta}>1. Línea del curso</label>
        <select value={lineaSel} onChange={(e) => setLineaSel(e.target.value)} className={campo}>
          {LINEAS.map((l) => (
            <option key={l.codigo} value={l.codigo}>
              {l.codigo} — {l.nombre}
            </option>
          ))}
          <option value="OTRA">Otra (definir código nuevo)</option>
        </select>
        {lineaSel === "OTRA" && (
          <input
            value={lineaOtra}
            onChange={(e) => setLineaOtra(e.target.value)}
            placeholder="Código corto de 3 letras, ej. ADM"
            maxLength={5}
            className={campo}
            required
          />
        )}
      </div>

      <div className="space-y-1">
        <label className={etiqueta}>2. Título del curso (se usa tal cual en la nomenclatura de archivos)</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className={etiqueta}>6. Nivel</label>
          <select value={nivel} onChange={(e) => setNivel(e.target.value)} className={campo}>
            {NIVELES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className={etiqueta}>7. Periodo / cohorte (Año-Semestre)</label>
          <input value={periodo} onChange={(e) => setPeriodo(e.target.value)} className={campo} required />
        </div>
      </div>

      <div className="space-y-1">
        <label className={etiqueta}>3. Fuentes del contenido</label>
        <select value={fuentesEstado} onChange={(e) => setFuentesEstado(e.target.value)} className={campo}>
          {OPC_FUENTES.map((o) => (
            <option key={o.valor} value={o.valor}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className={etiqueta}>4. ¿El curso tendrá un ejemplo integrador?</label>
        <select value={ejemploIntegrador} onChange={(e) => setEjemploIntegrador(e.target.value)} className={campo}>
          {OPC_EJEMPLO.map((o) => (
            <option key={o.valor} value={o.valor}>{o.label}</option>
          ))}
        </select>
        {ejemploIntegrador === "si" && (
          <textarea
            value={ejemploDesc}
            onChange={(e) => setEjemploDesc(e.target.value)}
            placeholder="Describe el caso (empresa, dataset, problema) que se desarrollará a lo largo del curso"
            rows={2}
            className={campo}
          />
        )}
      </div>

      <div className="space-y-1">
        <label className={etiqueta}>5. ¿Uifcito será protagonista de los ejemplos?</label>
        <select value={uifcito} onChange={(e) => setUifcito(e.target.value)} className={campo}>
          {OPC_UIFCITO.map((o) => (
            <option key={o.valor} value={o.valor}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className={etiqueta}>Duración objetivo por lección (se confirma aquí, no se asume)</label>
        <input value={duracionObjetivo} onChange={(e) => setDuracionObjetivo(e.target.value)} className={campo} />
      </div>

      <div className="space-y-1">
        <label className={etiqueta}>Temario (pégalo tal cual; es la base para proponer la arquitectura)</label>
        <textarea value={temario} onChange={(e) => setTemario(e.target.value)} rows={8} className={campo} />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
      >
        {enviando ? "Creando..." : "Crear curso"}
      </button>
    </form>
  );
}
```

### `components/FuenteForm.tsx`
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIPOS_FUENTE } from "@/lib/kickoff";

export default function FuenteForm({ cursoId }: { cursoId: string }) {
  const router = useRouter();
  const [tipo, setTipo] = useState("link");
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [origen, setOrigen] = useState("usuario");
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const res = await fetch("/api/fuentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cursoId, tipo, titulo, url, descripcion, origen }),
    });
    setGuardando(false);
    if (!res.ok) {
      window.alert("No se pudo guardar la fuente.");
      return;
    }
    setTitulo("");
    setUrl("");
    setDescripcion("");
    router.refresh();
  }

  const campo = "border rounded px-2 py-1 text-sm";

  return (
    <form onSubmit={enviar} className="border rounded-lg p-4 bg-zinc-50 space-y-2">
      <div className="flex flex-wrap gap-2">
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>
          {TIPOS_FUENTE.map((t) => (
            <option key={t.valor} value={t.valor}>{t.label}</option>
          ))}
        </select>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título de la fuente"
          className={`${campo} flex-1`}
          required
        />
        <select value={origen} onChange={(e) => setOrigen(e.target.value)} className={campo}>
          <option value="usuario">Aportada por mí</option>
          <option value="sugerida">Sugerida (pendiente de aprobación)</option>
        </select>
      </div>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="URL o ubicación (link, ruta en Drive, etc.)"
        className={`${campo} w-full`}
      />
      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Descripción: qué contiene y para qué lecciones sirve"
        rows={2}
        className={`${campo} w-full`}
      />
      <button type="submit" disabled={guardando} className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50">
        {guardando ? "Guardando..." : "Agregar fuente"}
      </button>
    </form>
  );
}
```

### `components/DecisionForm.tsx`
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DecisionForm({
  cursoId,
  lecciones,
}: {
  cursoId: string;
  lecciones: string[];
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [leccionRef, setLeccionRef] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const res = await fetch("/api/decisiones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cursoId, texto, leccionRef, tipo: "nota" }),
    });
    setGuardando(false);
    if (!res.ok) {
      window.alert("No se pudo guardar la nota.");
      return;
    }
    setTexto("");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="border rounded-lg p-4 bg-zinc-50 space-y-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Decisión o cambio de criterio (ej. En la Lección 3 Uifcito sí será protagonista)"
        rows={2}
        className="border rounded px-2 py-1 text-sm w-full"
        required
      />
      <div className="flex gap-2 items-center">
        <select
          value={leccionRef}
          onChange={(e) => setLeccionRef(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">Aplica a todo el curso</option>
          {lecciones.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <button type="submit" disabled={guardando} className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50">
          {guardando ? "Guardando..." : "Agregar a la bitácora"}
        </button>
      </div>
    </form>
  );
}
```

### `app/cursos/nuevo/page.tsx`
```tsx
import Link from "next/link";
import KickoffForm from "@/components/KickoffForm";

export default function NuevoCursoPage() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-6">
      <Link href="/" className="text-sm text-zinc-500">&larr; Cursos</Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1">Nuevo curso</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Cuestionario de inicio. Las respuestas quedan guardadas en la ficha del curso y en la bitácora.
      </p>
      <KickoffForm />
    </div>
  );
}
```

### `app/cursos/[id]/fuentes/page.tsx`
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FuenteForm from "@/components/FuenteForm";
import BotonEliminar from "@/components/BotonEliminar";
import BotonEditar from "@/components/BotonEditar";
import BotonAccion from "@/components/BotonAccion";
import { TIPOS_FUENTE, OPC_FUENTES, etiqueta } from "@/lib/kickoff";

export const dynamic = "force-dynamic";

export default async function FuentesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const curso = await prisma.curso.findUnique({
    where: { id },
    include: { fuentes: { orderBy: { createdAt: "desc" } } },
  });

  if (!curso) notFound();

  const pendientes = curso.fuentes.filter((f) => !f.aprobada).length;

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <Link href={`/cursos/${curso.id}`} className="text-sm text-zinc-500">
        &larr; {curso.titulo}
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1">Fuentes del curso</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Estado declarado en el inicio: {etiqueta(OPC_FUENTES, curso.fuentesEstado)}.
        {pendientes > 0 && ` Hay ${pendientes} fuente(s) sugerida(s) pendiente(s) de tu aprobación; no se guionizan con base en ellas hasta aprobarlas.`}
      </p>

      <FuenteForm cursoId={curso.id} />

      <ul className="mt-8 space-y-3">
        {curso.fuentes.map((f) => (
          <li key={f.id} className="border rounded-lg p-4 flex justify-between items-start gap-3">
            <div className="space-y-1">
              <p className="font-medium">
                {f.url.startsWith("http") ? (
                  <a href={f.url} target="_blank" rel="noreferrer" className="underline">
                    {f.titulo}
                  </a>
                ) : (
                  f.titulo
                )}
              </p>
              <p className="text-xs text-zinc-500">
                {etiqueta(TIPOS_FUENTE, f.tipo)} · {f.origen === "sugerida" ? "Sugerida" : "Aportada por ti"} ·{" "}
                {f.aprobada ? "Aprobada" : "Pendiente de aprobación"} · Consultada el{" "}
                {f.fechaConsulta.toLocaleDateString("es-CO")}
              </p>
              {f.url && !f.url.startsWith("http") && <p className="text-xs text-zinc-500">Ubicación: {f.url}</p>}
              {f.descripcion && <p className="text-sm">{f.descripcion}</p>}
            </div>
            <div className="flex flex-col items-end gap-1">
              {!f.aprobada && (
                <BotonAccion url={`/api/fuentes/${f.id}`} body={{ aprobada: true }} texto="Aprobar" />
              )}
              <BotonAccion
                url={`/api/fuentes/${f.id}`}
                body={{ marcarConsultada: true }}
                texto="Marcar consultada hoy"
              />
              <BotonEditar
                url={`/api/fuentes/${f.id}`}
                titulo="Editar fuente"
                campos={[
                  { key: "tipo", label: "Tipo", type: "select", opciones: TIPOS_FUENTE },
                  { key: "titulo", label: "Título" },
                  { key: "url", label: "URL o ubicación", opcional: true },
                  { key: "descripcion", label: "Descripción", type: "largo", opcional: true },
                ]}
                valores={{ tipo: f.tipo, titulo: f.titulo, url: f.url, descripcion: f.descripcion }}
              />
              <BotonEliminar
                url={`/api/fuentes/${f.id}`}
                mensaje={`¿Eliminar la fuente "${f.titulo}"?`}
              />
            </div>
          </li>
        ))}
        {curso.fuentes.length === 0 && (
          <p className="text-zinc-500">Aún no hay fuentes registradas.</p>
        )}
      </ul>
    </div>
  );
}
```

### `app/cursos/[id]/bitacora/page.tsx`
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DecisionForm from "@/components/DecisionForm";
import BotonEliminar from "@/components/BotonEliminar";

export const dynamic = "force-dynamic";

const ETIQUETA_TIPO: Record<string, string> = {
  kickoff: "Inicio de curso",
  cambio: "Cambio",
  nota: "Nota",
};

export default async function BitacoraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const curso = await prisma.curso.findUnique({
    where: { id },
    include: {
      decisiones: { orderBy: { createdAt: "desc" } },
      lecciones: { orderBy: { numero: "asc" } },
    },
  });

  if (!curso) notFound();

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <Link href={`/cursos/${curso.id}`} className="text-sm text-zinc-500">
        &larr; {curso.titulo}
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1">Bitácora de decisiones</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Lo decidido en el inicio y cualquier cambio de criterio, para no repreguntar en sesiones futuras.
      </p>

      <DecisionForm
        cursoId={curso.id}
        lecciones={curso.lecciones.map((l) => `Lección ${l.numero}: ${l.titulo}`)}
      />

      <ul className="mt-8 space-y-3">
        {curso.decisiones.map((d) => (
          <li key={d.id} className="border rounded-lg p-4 flex justify-between items-start gap-3">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">
                {ETIQUETA_TIPO[d.tipo] ?? d.tipo} · {d.createdAt.toLocaleString("es-CO")}
                {d.leccionRef && ` · ${d.leccionRef}`}
              </p>
              <p className="text-sm whitespace-pre-wrap">{d.texto}</p>
            </div>
            <BotonEliminar
              url={`/api/decisiones/${d.id}`}
              mensaje="¿Eliminar esta entrada de la bitácora?"
            />
          </li>
        ))}
        {curso.decisiones.length === 0 && (
          <p className="text-zinc-500">Aún no hay entradas en la bitácora.</p>
        )}
      </ul>
    </div>
  );
}
```

### `app/api/fuentes/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cursoId = req.nextUrl.searchParams.get("cursoId");
  const fuentes = await prisma.fuente.findMany({
    where: cursoId ? { cursoId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(fuentes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { cursoId, titulo } = body;

  if (!cursoId || !titulo) {
    return NextResponse.json({ error: "cursoId y titulo son obligatorios" }, { status: 400 });
  }

  const origen = body.origen === "sugerida" ? "sugerida" : "usuario";

  const fuente = await prisma.fuente.create({
    data: {
      cursoId,
      titulo: String(titulo),
      tipo: String(body.tipo ?? "link"),
      url: String(body.url ?? ""),
      descripcion: String(body.descripcion ?? ""),
      origen,
      aprobada: origen !== "sugerida",
    },
  });

  return NextResponse.json(fuente, { status: 201 });
}
```

### `app/api/fuentes/[id]/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, string | boolean | Date> = {};
  for (const campo of ["tipo", "titulo", "url", "descripcion"]) {
    if (campo in body) data[campo] = String(body[campo]);
  }
  if ("aprobada" in body) data.aprobada = Boolean(body.aprobada);
  if (body.marcarConsultada) data.fechaConsulta = new Date();

  const fuente = await prisma.fuente.update({ where: { id }, data });

  if ("aprobada" in body) {
    await prisma.decision.create({
      data: {
        cursoId: fuente.cursoId,
        tipo: "cambio",
        texto: `Fuente "${fuente.titulo}" ${fuente.aprobada ? "aprobada" : "marcada como no aprobada"}.`,
      },
    });
  }

  return NextResponse.json(fuente);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.fuente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

### `app/api/decisiones/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cursoId = req.nextUrl.searchParams.get("cursoId");
  const decisiones = await prisma.decision.findMany({
    where: cursoId ? { cursoId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(decisiones);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { cursoId, texto } = body;

  if (!cursoId || !texto) {
    return NextResponse.json({ error: "cursoId y texto son obligatorios" }, { status: 400 });
  }

  const decision = await prisma.decision.create({
    data: {
      cursoId,
      texto: String(texto),
      tipo: String(body.tipo ?? "nota"),
      leccionRef: String(body.leccionRef ?? ""),
    },
  });

  return NextResponse.json(decision, { status: 201 });
}
```

### `app/api/decisiones/[id]/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.decision.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

---

## 3. Archivos que se reemplazan por completo

### `components/BotonEditar.tsx`
Agrega el tipo `largo` (área de texto), campos opcionales y opciones con etiqueta distinta del valor. Sigue siendo compatible con los usos anteriores.
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Opcion = string | { valor: string; label: string };

export type CampoEditable = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "largo";
  opciones?: Opcion[];
  opcional?: boolean;
};

function valorOpcion(o: Opcion) {
  return typeof o === "string" ? o : o.valor;
}
function labelOpcion(o: Opcion) {
  return typeof o === "string" ? o : o.label;
}

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

  const claseCampo = "border rounded px-2 py-1 text-sm";

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
            className="bg-white rounded-lg p-5 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3 shadow-lg"
          >
            <h2 className="text-lg font-semibold">{titulo}</h2>

            {campos.map((c) => (
              <div key={c.key} className="flex flex-col gap-1">
                <label className="text-sm font-medium">{c.label}</label>
                {c.type === "select" ? (
                  <select
                    value={String(form[c.key] ?? "")}
                    onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                    className={claseCampo}
                  >
                    {(c.opciones || []).map((op) => (
                      <option key={valorOpcion(op)} value={valorOpcion(op)}>
                        {labelOpcion(op)}
                      </option>
                    ))}
                  </select>
                ) : c.type === "largo" ? (
                  <textarea
                    value={String(form[c.key] ?? "")}
                    onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                    rows={5}
                    className={claseCampo}
                    required={!c.opcional}
                  />
                ) : (
                  <input
                    type={c.type === "number" ? "number" : "text"}
                    value={form[c.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                    className={claseCampo}
                    required={!c.opcional}
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

### `components/CrearLeccionForm.tsx`
Agrega objetivo y duración estimada, que son parte de la propuesta de arquitectura.
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CrearLeccionForm({
  cursoId,
  siguienteNumero,
}: {
  cursoId: string;
  siguienteNumero: number;
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [numero, setNumero] = useState(siguienteNumero);
  const [objetivo, setObjetivo] = useState("");
  const [duracion, setDuracion] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/lecciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cursoId, numero: Number(numero), titulo, objetivo, duracion }),
    });
    setLoading(false);
    setTitulo("");
    setObjetivo("");
    setDuracion("");
    setNumero(numero + 1);
    router.refresh();
  }

  const campo = "border rounded px-2 py-1 text-sm";

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-zinc-50 space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          value={numero}
          onChange={(e) => setNumero(Number(e.target.value))}
          className={`${campo} w-20`}
        />
        <input
          placeholder="Título de la lección"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={`${campo} flex-1`}
          required
        />
        <input
          placeholder="Duración (ej. 2 h)"
          value={duracion}
          onChange={(e) => setDuracion(e.target.value)}
          className={`${campo} w-36`}
        />
      </div>
      <input
        placeholder="Objetivo de la lección"
        value={objetivo}
        onChange={(e) => setObjetivo(e.target.value)}
        className={`${campo} w-full`}
      />
      <button type="submit" disabled={loading} className="bg-black text-white rounded px-3 py-1 text-sm">
        {loading ? "Creando..." : "Agregar lección"}
      </button>
    </form>
  );
}
```

### `app/cursos/[id]/page.tsx`
Incluye ficha del curso, enlaces a Fuentes y Bitácora, aprobación de arquitectura, y objetivo y duración por lección. Mantiene editar, eliminar y exportar.
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CrearLeccionForm from "@/components/CrearLeccionForm";
import BotonEliminar from "@/components/BotonEliminar";
import BotonEditar from "@/components/BotonEditar";
import BotonAccion from "@/components/BotonAccion";
import {
  NIVELES,
  OPC_EJEMPLO,
  OPC_UIFCITO,
  OPC_FUENTES,
  etiqueta,
} from "@/lib/kickoff";

export const dynamic = "force-dynamic";

export default async function CursoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const curso = await prisma.curso.findUnique({
    where: { id },
    include: {
      lecciones: { orderBy: { numero: "asc" }, include: { diapositivas: true } },
      _count: { select: { fuentes: true, decisiones: true } },
    },
  });

  if (!curso) notFound();

  const campoFicha = "text-sm";

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
            titulo="Editar ficha del curso"
            texto="Editar ficha"
            campos={[
              { key: "linea", label: "Línea (ej. CON)" },
              { key: "titulo", label: "Título" },
              { key: "nivel", label: "Nivel", type: "select", opciones: NIVELES },
              { key: "periodo", label: "Periodo (ej. 2026-2)" },
              { key: "ejemploIntegrador", label: "Ejemplo integrador", type: "select", opciones: OPC_EJEMPLO },
              { key: "ejemploDesc", label: "Descripción del ejemplo integrador", type: "largo", opcional: true },
              { key: "uifcito", label: "Uifcito como protagonista", type: "select", opciones: OPC_UIFCITO },
              { key: "duracionObjetivo", label: "Duración objetivo por lección", opcional: true },
              { key: "fuentesEstado", label: "Estado de las fuentes", type: "select", opciones: OPC_FUENTES },
              { key: "temario", label: "Temario", type: "largo", opcional: true },
            ]}
            valores={{
              linea: curso.linea,
              titulo: curso.titulo,
              nivel: curso.nivel,
              periodo: curso.periodo,
              ejemploIntegrador: curso.ejemploIntegrador,
              ejemploDesc: curso.ejemploDesc,
              uifcito: curso.uifcito,
              duracionObjetivo: curso.duracionObjetivo,
              fuentesEstado: curso.fuentesEstado,
              temario: curso.temario,
            }}
          />
          <BotonEliminar
            url={`/api/cursos/${curso.id}`}
            mensaje={`¿Eliminar el curso "${curso.titulo}"? Se borrarán también sus lecciones, diapositivas, capas, fuentes y bitácora. Esta acción no se puede deshacer.`}
            redirigirA="/"
            texto="Eliminar curso"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
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
        <Link
          href={`/cursos/${curso.id}/fuentes`}
          className="text-xs border rounded px-3 py-1.5 hover:bg-zinc-50"
        >
          Fuentes ({curso._count.fuentes})
        </Link>
        <Link
          href={`/cursos/${curso.id}/bitacora`}
          className="text-xs border rounded px-3 py-1.5 hover:bg-zinc-50"
        >
          Bitácora ({curso._count.decisiones})
        </Link>
      </div>

      <div className="border rounded-lg p-4 mb-8 space-y-1">
        <h2 className="text-sm font-semibold mb-2">Ficha del curso</h2>
        <p className={campoFicha}>
          <span className="font-medium">Ejemplo integrador:</span>{" "}
          {etiqueta(OPC_EJEMPLO, curso.ejemploIntegrador)}
          {curso.ejemploDesc && ` — ${curso.ejemploDesc}`}
        </p>
        <p className={campoFicha}>
          <span className="font-medium">Uifcito protagonista:</span> {etiqueta(OPC_UIFCITO, curso.uifcito)}
        </p>
        <p className={campoFicha}>
          <span className="font-medium">Duración objetivo por lección:</span>{" "}
          {curso.duracionObjetivo || "sin definir"}
        </p>
        <p className={campoFicha}>
          <span className="font-medium">Fuentes:</span> {etiqueta(OPC_FUENTES, curso.fuentesEstado)}
        </p>
        {curso.temario && (
          <details className="pt-1">
            <summary className="text-sm font-medium cursor-pointer">Temario</summary>
            <p className="text-sm whitespace-pre-wrap mt-1">{curso.temario}</p>
          </details>
        )}
      </div>

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Arquitectura del curso</h2>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2 py-1 rounded ${
              curso.arquitecturaAprobada ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {curso.arquitecturaAprobada ? "Aprobada" : "Pendiente de aprobación"}
          </span>
          {curso.arquitecturaAprobada ? (
            <BotonAccion
              url={`/api/cursos/${curso.id}`}
              body={{ arquitecturaAprobada: false }}
              texto="Reabrir"
              confirmar="¿Reabrir la arquitectura para modificarla?"
            />
          ) : (
            <BotonAccion
              url={`/api/cursos/${curso.id}`}
              body={{ arquitecturaAprobada: true }}
              texto="Aprobar arquitectura"
              estilo="boton"
              confirmar="¿Aprobar la arquitectura? Después de aprobarla se guioniza lección por lección."
            />
          )}
        </div>
      </div>

      <CrearLeccionForm cursoId={curso.id} siguienteNumero={curso.lecciones.length + 1} />

      <ul className="mt-8 space-y-3">
        {curso.lecciones.map((leccion) => (
          <li key={leccion.id} className="border rounded-lg p-4 hover:bg-zinc-50 flex justify-between items-start gap-3">
            <div className="space-y-0.5">
              <Link href={`/lecciones/${leccion.id}`} className="font-medium">
                Lección {leccion.numero}: {leccion.titulo}
              </Link>
              {leccion.objetivo && <p className="text-sm">{leccion.objetivo}</p>}
              <p className="text-sm text-zinc-500">
                {leccion.diapositivas.length} diapositiva(s)
                {leccion.duracion && ` · Duración estimada: ${leccion.duracion}`}
              </p>
            </div>
            <div className="flex gap-3">
              <BotonEditar
                url={`/api/lecciones/${leccion.id}`}
                titulo="Editar lección"
                campos={[
                  { key: "numero", label: "Número", type: "number" },
                  { key: "titulo", label: "Título" },
                  { key: "objetivo", label: "Objetivo", type: "largo", opcional: true },
                  { key: "duracion", label: "Duración estimada", opcional: true },
                ]}
                valores={{
                  numero: leccion.numero,
                  titulo: leccion.titulo,
                  objetivo: leccion.objetivo,
                  duracion: leccion.duracion,
                }}
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

### `app/api/cursos/[id]/route.ts`
GET sin cambios; PATCH acepta la ficha y registra los cambios en la bitácora; DELETE también borra fuentes y bitácora.
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CAMPOS_TEXTO = [
  "linea",
  "titulo",
  "nivel",
  "periodo",
  "ejemploIntegrador",
  "ejemploDesc",
  "uifcito",
  "duracionObjetivo",
  "fuentesEstado",
  "temario",
] as const;

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

  const antes = await prisma.curso.findUnique({ where: { id } });
  if (!antes) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  const data: Record<string, string | boolean> = {};
  for (const campo of CAMPOS_TEXTO) {
    if (campo in body) data[campo] = String(body[campo]);
  }
  if ("arquitecturaAprobada" in body) {
    data.arquitecturaAprobada = Boolean(body.arquitecturaAprobada);
  }

  const curso = await prisma.curso.update({ where: { id }, data });

  const previo = antes as unknown as Record<string, unknown>;
  const cambios: string[] = [];
  for (const campo of CAMPOS_TEXTO) {
    if (campo in data && data[campo] !== previo[campo]) {
      cambios.push(campo === "temario" ? "temario actualizado" : `${campo}: "${previo[campo]}" → "${data[campo]}"`);
    }
  }
  if ("arquitecturaAprobada" in data && data.arquitecturaAprobada !== antes.arquitecturaAprobada) {
    cambios.push(data.arquitecturaAprobada ? "arquitectura aprobada" : "arquitectura reabierta para modificación");
  }

  if (cambios.length > 0) {
    await prisma.decision.create({
      data: { cursoId: id, tipo: "cambio", texto: `Cambios en la ficha: ${cambios.join("; ")}.` },
    });
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
    prisma.fuente.deleteMany({ where: { cursoId: id } }),
    prisma.decision.deleteMany({ where: { cursoId: id } }),
    prisma.curso.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
```

---

## 4. Cambios puntuales en archivos existentes

### `app/api/cursos/route.ts` — reemplaza solo la función `POST` (y agrega el import)
```ts
import { resumenKickoff } from "@/lib/kickoff";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { linea, titulo, nivel, periodo } = body;

  if (!linea || !titulo || !nivel || !periodo) {
    return NextResponse.json(
      { error: "linea, titulo, nivel y periodo son obligatorios" },
      { status: 400 }
    );
  }

  const curso = await prisma.curso.create({
    data: {
      linea,
      titulo,
      nivel,
      periodo,
      ejemploIntegrador: body.ejemploIntegrador === "si" ? "si" : "no",
      ejemploDesc: String(body.ejemploDesc ?? ""),
      uifcito: ["si", "no", "por_leccion"].includes(body.uifcito) ? body.uifcito : "por_leccion",
      duracionObjetivo: String(body.duracionObjetivo ?? ""),
      fuentesEstado: ["tengo", "sugerir", "pendiente"].includes(body.fuentesEstado)
        ? body.fuentesEstado
        : "pendiente",
      temario: String(body.temario ?? ""),
    },
  });

  await prisma.decision.create({
    data: { cursoId: curso.id, tipo: "kickoff", texto: resumenKickoff(curso) },
  });

  return NextResponse.json(curso, { status: 201 });
}
```

### `app/api/lecciones/route.ts` — en `POST`, agrega `objetivo` y `duracion`
En el `data` del `prisma.leccion.create`:
```ts
    data: {
      cursoId,
      numero: Number(numero),
      titulo,
      objetivo: String(body.objetivo ?? ""),
      duracion: String(body.duracion ?? ""),
    },
```

### `app/api/lecciones/[id]/route.ts` — en `PATCH`, reemplaza la construcción de `data`
```ts
  const data: { numero?: number; titulo?: string; objetivo?: string; duracion?: string } = {};
  if ("numero" in body) data.numero = Number(body.numero);
  if ("titulo" in body) data.titulo = String(body.titulo);
  if ("objetivo" in body) data.objetivo = String(body.objetivo);
  if ("duracion" in body) data.duracion = String(body.duracion);
```

### `app/page.tsx` — reemplaza el formulario corto por un enlace al cuestionario
1. Quita `import CrearCursoForm from "@/components/CrearCursoForm";`
2. Reemplaza `<CrearCursoForm />` por:
```tsx
      <Link
        href="/cursos/nuevo"
        className="inline-block bg-black text-white rounded px-4 py-2 text-sm"
      >
        + Nuevo curso (cuestionario de inicio)
      </Link>
```
3. `components/CrearCursoForm.tsx` queda sin uso; puedes borrarlo.

---

## Cómo probarlo
1. `/cursos/nuevo`: llena el cuestionario (prueba con "Otra" en la línea y con "Ejemplo integrador: Sí") → debe llevarte a Fuentes o al curso.
2. En el curso: revisa la ficha, edítala, y mira que aparezca una entrada nueva en Bitácora.
3. Agrega 2 lecciones con objetivo y duración, y aprueba la arquitectura (también debe quedar en la bitácora).
4. En Fuentes: agrega una fuente "Sugerida" → debe salir como pendiente; apruébala y confirma el registro en la bitácora.
5. Elimina el curso de prueba y verifica que no queden errores (borra también fuentes y bitácora).
