# Handoff para Claude Code — Proyecto Virtualización Producción

Este archivo consolida todo el código acordado en la sesión de Claude.ai del 30 de septiembre de 2026. Instrucción para Claude Code: crea o reemplaza cada archivo con la ruta indicada, usando exactamente el contenido de su bloque de código. Si un archivo ya existe con contenido distinto, muéstrame el diff antes de sobreescribir.

Contexto del proyecto: Next.js 16 + Prisma + Neon (PostgreSQL). Next.js 16 requiere que `params` en páginas dinámicas y route handlers sea tratado como `Promise<{ id: string }>`. El schema de Prisma ya existe en `prisma/schema.prisma` con los modelos Curso, Leccion, Diapositiva, Capa, InteraccionCatalogo e Item — no lo modifiques, solo verifica que `lib/prisma.ts` exporte un cliente singleton llamado `prisma`.

---

## `lib/prisma.ts`
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

## `lib/types.ts`
```ts
export type TipoCampo = "corto" | "largo" | "numero" | "imagen" | "lista";

export interface Campo {
  key: string;
  label: string;
  type: TipoCampo;
  opciones?: string[];
}

export interface RepeaterConfig {
  kind: string;
  itemLabel: string;
  repeatable: boolean;
  fields: Campo[];
  audioCtx: string;
}

export interface ItemData {
  id: string;
  kind: string;
  orden: number;
  datos: Record<string, string>;
  tieneImagen: boolean;
  imagenDesc: string;
  tieneAudio: boolean;
  audioTexto: string;
}

export interface TriggerData {
  tipo: string;
  detalle: string;
}

export interface CapaData {
  id: string;
  numero: string;
  estado: string;
  explicacion: string;
  visual: string;
  interaccion: string;
  audio: string;
  duracion: string;
  nombreArchivo: string;
  diapositivaId: string;
  triggers: TriggerData[];
  extra: Record<string, unknown>;
  items: ItemData[];
}

export interface InteraccionCatalogoData {
  id: string;
  nombre: string;
  tipo: string;
  itemLabel: string;
  repeatable: boolean;
  campos: RepeaterConfig[];
  audioCtx: string;
}
```

---

## `components/DynField.tsx`
```tsx
"use client";

import { Campo } from "@/lib/types";

export default function DynField({
  campo,
  value,
  onChange,
}: {
  campo: Campo;
  value: string;
  onChange: (value: string) => void;
}) {
  const label = (
    <label className="text-xs font-medium text-zinc-600">{campo.label}</label>
  );

  if (campo.type === "largo") {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>
    );
  }

  if (campo.type === "numero") {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>
    );
  }

  if (campo.type === "imagen") {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <input
          type="text"
          placeholder="[Insertar captura de pantalla real de: ...]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>
    );
  }

  if (campo.type === "lista") {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">Selecciona...</option>
          {(campo.opciones || []).map((op) => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      />
    </div>
  );
}
```

## `components/ItemCard.tsx`
```tsx
"use client";

import { ItemData, RepeaterConfig } from "@/lib/types";
import DynField from "./DynField";

export default function ItemCard({
  item,
  config,
  onChange,
  onDelete,
}: {
  item: ItemData;
  config: RepeaterConfig;
  onChange: (item: ItemData) => void;
  onDelete: () => void;
}) {
  function setDato(key: string, value: string) {
    onChange({ ...item, datos: { ...item.datos, [key]: value } });
  }

  return (
    <div className="border rounded-lg p-3 bg-white space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-zinc-500">
          {config.itemLabel} #{item.orden}
        </span>
        <button onClick={onDelete} className="text-xs text-red-600 hover:underline">
          Eliminar
        </button>
      </div>

      {config.fields.map((campo) => (
        <DynField
          key={campo.key}
          campo={campo}
          value={item.datos[campo.key] || ""}
          onChange={(v) => setDato(campo.key, v)}
        />
      ))}

      <div className="flex items-center gap-2 pt-1">
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={item.tieneImagen}
            onChange={(e) => onChange({ ...item, tieneImagen: e.target.checked })}
          />
          Tiene imagen
        </label>
        {item.tieneImagen && (
          <input
            type="text"
            placeholder="Descripción de la imagen"
            value={item.imagenDesc}
            onChange={(e) => onChange({ ...item, imagenDesc: e.target.value })}
            className="border rounded px-2 py-1 text-xs flex-1"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={item.tieneAudio}
            onChange={(e) => onChange({ ...item, tieneAudio: e.target.checked })}
          />
          Tiene audio
        </label>
        {item.tieneAudio && (
          <input
            type="text"
            placeholder={config.audioCtx || "Guion de audio para este ítem"}
            value={item.audioTexto}
            onChange={(e) => onChange({ ...item, audioTexto: e.target.value })}
            className="border rounded px-2 py-1 text-xs flex-1"
          />
        )}
      </div>
    </div>
  );
}
```

## `components/Repeater.tsx`
```tsx
"use client";

import { ItemData, RepeaterConfig } from "@/lib/types";
import ItemCard from "./ItemCard";

export default function Repeater({
  config,
  items,
  onAdd,
  onChangeItem,
  onDeleteItem,
}: {
  config: RepeaterConfig;
  items: ItemData[];
  onAdd: () => void;
  onChangeItem: (item: ItemData) => void;
  onDeleteItem: (id: string) => void;
}) {
  const propios = items
    .filter((i) => i.kind === config.kind)
    .sort((a, b) => a.orden - b.orden);

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-zinc-50">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">{config.itemLabel}s</h3>
        {config.repeatable && (
          <button onClick={onAdd} className="text-xs bg-black text-white rounded px-2 py-1">
            + Agregar {config.itemLabel.toLowerCase()}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {propios.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            config={config}
            onChange={onChangeItem}
            onDelete={() => onDeleteItem(item.id)}
          />
        ))}
        {propios.length === 0 && (
          <p className="text-xs text-zinc-400">Sin {config.itemLabel.toLowerCase()}s aún.</p>
        )}
      </div>
    </div>
  );
}
```

## `components/CapaEditor.tsx`
```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CapaData, InteraccionCatalogoData, ItemData } from "@/lib/types";
import Repeater from "./Repeater";

export default function CapaEditor({ id }: { id: string }) {
  const router = useRouter();
  const [capa, setCapa] = useState<CapaData | null>(null);
  const [catalogo, setCatalogo] = useState<InteraccionCatalogoData | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function cargar() {
      const resCapa = await fetch(`/api/capas/${id}`);
      const dataCapa: CapaData = await resCapa.json();
      setCapa(dataCapa);

      const resCat = await fetch(`/api/interacciones`);
      const todas: InteraccionCatalogoData[] = await resCat.json();
      const encontrada = todas.find((c) => c.nombre === dataCapa.interaccion) || null;
      setCatalogo(encontrada);
    }
    cargar();
  }, [id]);

  const guardarCapa = useCallback(
    async (cambios: Partial<CapaData>) => {
      setGuardando(true);
      await fetch(`/api/capas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      setGuardando(false);
    },
    [id]
  );

  function actualizarCampo<K extends keyof CapaData>(campo: K, valor: CapaData[K]) {
    if (!capa) return;
    const actualizada = { ...capa, [campo]: valor };
    setCapa(actualizada);
    setTimeout(() => guardarCapa({ [campo]: valor }), 600);
  }

  async function agregarItem(kind: string) {
    if (!capa) return;
    const orden = capa.items.filter((i) => i.kind === kind).length + 1;

    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        capaId: capa.id,
        kind,
        orden,
        datos: {},
        tieneImagen: false,
        imagenDesc: "",
        tieneAudio: false,
        audioTexto: "",
      }),
    });
    const nuevo: ItemData = await res.json();
    setCapa({ ...capa, items: [...capa.items, nuevo] });
  }

  async function actualizarItem(item: ItemData) {
    if (!capa) return;
    setCapa({
      ...capa,
      items: capa.items.map((i) => (i.id === item.id ? item : i)),
    });
    await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
  }

  async function eliminarItem(itemId: string) {
    if (!capa) return;
    setCapa({ ...capa, items: capa.items.filter((i) => i.id !== itemId) });
    await fetch(`/api/items/${itemId}`, { method: "DELETE" });
  }

  function validar(): string[] {
    if (!capa || !catalogo) return ["Cargando..."];
    const problemas: string[] = [];

    if (!capa.explicacion.trim()) problemas.push("Falta la explicación general.");
    if (!capa.visual.trim()) problemas.push("Falta el campo Visual.");
    if (!capa.audio.trim()) problemas.push("Falta el guion de Audio.");

    for (const config of catalogo.campos) {
      const propios = capa.items.filter((i) => i.kind === config.kind);
      if (config.repeatable && propios.length === 0) {
        problemas.push(`Debes agregar al menos un(a) ${config.itemLabel.toLowerCase()}.`);
      }
    }

    const kinds = catalogo.campos.map((c) => c.kind);
    if (kinds.includes("elementos") && kinds.includes("categorias")) {
      const categorias = capa.items
        .filter((i) => i.kind === "categorias")
        .map((i) => i.datos["nombre"] || i.datos["texto"] || "");
      const elementos = capa.items.filter((i) => i.kind === "elementos");
      for (const el of elementos) {
        const categoriaAsignada = el.datos["categoria"];
        if (!categoriaAsignada) {
          problemas.push(`El elemento #${el.orden} no tiene categoría asignada.`);
        } else if (!categorias.includes(categoriaAsignada)) {
          problemas.push(
            `El elemento #${el.orden} está asignado a una categoría que no existe: "${categoriaAsignada}".`
          );
        }
      }
    }

    return problemas;
  }

  async function aprobar() {
    const problemas = validar();
    setErrores(problemas);
    if (problemas.length > 0) return;

    await guardarCapa({ estado: "aprobada" });
    setCapa((prev) => (prev ? { ...prev, estado: "aprobada" } : prev));
  }

  if (!capa || !catalogo) {
    return <div className="max-w-3xl mx-auto py-16 px-6">Cargando capa...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-16 px-6 space-y-6">
      <button onClick={() => router.back()} className="text-sm text-zinc-500">
        &larr; Volver
      </button>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          Capa {capa.numero} — {capa.interaccion}
        </h1>
        <span
          className={`text-xs px-2 py-1 rounded ${
            capa.estado === "aprobada" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {capa.estado}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Explicación general</label>
          <textarea
            value={capa.explicacion}
            onChange={(e) => actualizarCampo("explicacion", e.target.value)}
            rows={3}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Visual</label>
          <textarea
            value={capa.visual}
            onChange={(e) => actualizarCampo("visual", e.target.value)}
            rows={3}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Audio (guion de locución)</label>
          <textarea
            value={capa.audio}
            onChange={(e) => actualizarCampo("audio", e.target.value)}
            rows={4}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Duración estimada</label>
            <input
              type="text"
              value={capa.duracion}
              onChange={(e) => actualizarCampo("duracion", e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium">Nombre de archivo de audio</label>
            <input
              type="text"
              value={capa.nombreArchivo}
              onChange={(e) => actualizarCampo("nombreArchivo", e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {catalogo.campos.map((config) => (
        <Repeater
          key={config.kind || "default"}
          config={config}
          items={capa.items}
          onAdd={() => agregarItem(config.kind)}
          onChangeItem={actualizarItem}
          onDeleteItem={eliminarItem}
        />
      ))}

      {errores.length > 0 && (
        <div className="border border-red-300 bg-red-50 rounded-lg p-3">
          <p className="text-sm font-semibold text-red-700 mb-1">Falta completar:</p>
          <ul className="list-disc list-inside text-sm text-red-700">
            {errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={aprobar}
          className="bg-black text-white rounded px-4 py-2 text-sm"
        >
          Aprobar capa
        </button>
        {guardando && <span className="text-xs text-zinc-400">Guardando...</span>}
      </div>
    </div>
  );
}
```

## `components/CrearCursoForm.tsx`
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CrearCursoForm() {
  const router = useRouter();
  const [linea, setLinea] = useState("");
  const [titulo, setTitulo] = useState("");
  const [nivel, setNivel] = useState("FUN");
  const [periodo, setPeriodo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/cursos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linea, titulo, nivel, periodo }),
    });
    setLoading(false);
    setLinea(""); setTitulo(""); setPeriodo("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 border rounded-lg p-4 bg-zinc-50">
      <input placeholder="Línea (ej. CON)" value={linea} onChange={(e) => setLinea(e.target.value)} className="border rounded px-2 py-1 text-sm" required />
      <input placeholder="Título del curso" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" required />
      <select value={nivel} onChange={(e) => setNivel(e.target.value)} className="border rounded px-2 py-1 text-sm">
        <option value="FUN">FUN</option>
        <option value="INT">INT</option>
        <option value="AVA">AVA</option>
      </select>
      <input placeholder="Periodo (ej. 2026-2)" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="border rounded px-2 py-1 text-sm" required />
      <button type="submit" disabled={loading} className="bg-black text-white rounded px-3 py-1 text-sm">
        {loading ? "Creando..." : "Crear curso"}
      </button>
    </form>
  );
}
```

## `components/CrearLeccionForm.tsx`
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CrearLeccionForm({ cursoId, siguienteNumero }: { cursoId: string; siguienteNumero: number }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [numero, setNumero] = useState(siguienteNumero);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/lecciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cursoId, numero: Number(numero), titulo }),
    });
    setLoading(false);
    setTitulo("");
    setNumero(numero + 1);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 border rounded-lg p-4 bg-zinc-50">
      <input type="number" value={numero} onChange={(e) => setNumero(Number(e.target.value))} className="border rounded px-2 py-1 text-sm w-20" />
      <input placeholder="Título de la lección" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" required />
      <button type="submit" disabled={loading} className="bg-black text-white rounded px-3 py-1 text-sm">
        {loading ? "Creando..." : "Agregar lección"}
      </button>
    </form>
  );
}
```

## `components/CrearDiapositivaForm.tsx`
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CrearDiapositivaForm({ leccionId, siguienteNumero }: { leccionId: string; siguienteNumero: number }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [numero, setNumero] = useState(siguienteNumero);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/diapositivas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leccionId, numero: Number(numero), titulo }),
    });
    setLoading(false);
    setTitulo("");
    setNumero(numero + 1);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 border rounded-lg p-4 bg-zinc-50">
      <input type="number" value={numero} onChange={(e) => setNumero(Number(e.target.value))} className="border rounded px-2 py-1 text-sm w-20" />
      <input placeholder="Título de la diapositiva" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" required />
      <button type="submit" disabled={loading} className="bg-black text-white rounded px-3 py-1 text-sm">
        {loading ? "Creando..." : "Agregar diapositiva"}
      </button>
    </form>
  );
}
```

## `components/CrearCapaForm.tsx`
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CrearCapaForm({
  diapositivaId,
  siguienteNumero,
  interacciones,
}: {
  diapositivaId: string;
  siguienteNumero: string;
  interacciones: string[];
}) {
  const router = useRouter();
  const [numero, setNumero] = useState(siguienteNumero);
  const [interaccion, setInteraccion] = useState(interacciones[0] || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/capas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diapositivaId, numero, interaccion }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 border rounded-lg p-4 bg-zinc-50">
      <input value={numero} onChange={(e) => setNumero(e.target.value)} className="border rounded px-2 py-1 text-sm w-20" />
      <select value={interaccion} onChange={(e) => setInteraccion(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1">
        {interacciones.map((nombre) => (
          <option key={nombre} value={nombre}>{nombre}</option>
        ))}
      </select>
      <button type="submit" disabled={loading} className="bg-black text-white rounded px-3 py-1 text-sm">
        {loading ? "Creando..." : "Agregar capa"}
      </button>
    </form>
  );
}
```

---

## `app/page.tsx`
```tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CrearCursoForm from "@/components/CrearCursoForm";

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
          <li key={curso.id} className="border rounded-lg p-4 hover:bg-zinc-50">
            <Link href={`/cursos/${curso.id}`} className="font-medium">
              {curso.linea}_{curso.nivel}_{curso.titulo}_{curso.periodo}
            </Link>
            <p className="text-sm text-zinc-500">
              {curso.lecciones.length} lección(es)
            </p>
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

## `app/cursos/[id]/page.tsx`
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CrearLeccionForm from "@/components/CrearLeccionForm";

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
      <h1 className="text-2xl font-semibold mt-2 mb-6">
        {curso.linea}_{curso.nivel}_{curso.titulo}_{curso.periodo}
      </h1>

      <CrearLeccionForm cursoId={curso.id} siguienteNumero={curso.lecciones.length + 1} />

      <ul className="mt-8 space-y-3">
        {curso.lecciones.map((leccion) => (
          <li key={leccion.id} className="border rounded-lg p-4 hover:bg-zinc-50">
            <Link href={`/lecciones/${leccion.id}`} className="font-medium">
              Lección {leccion.numero}: {leccion.titulo}
            </Link>
            <p className="text-sm text-zinc-500">{leccion.diapositivas.length} diapositiva(s)</p>
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

## `app/lecciones/[id]/page.tsx`
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CrearDiapositivaForm from "@/components/CrearDiapositivaForm";

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
      <h1 className="text-2xl font-semibold mt-2 mb-6">
        Lección {leccion.numero}: {leccion.titulo}
      </h1>

      <CrearDiapositivaForm leccionId={leccion.id} siguienteNumero={leccion.diapositivas.length + 1} />

      <ul className="mt-8 space-y-3">
        {leccion.diapositivas.map((diapositiva) => (
          <li key={diapositiva.id} className="border rounded-lg p-4 hover:bg-zinc-50">
            <Link href={`/diapositivas/${diapositiva.id}`} className="font-medium">
              Diapositiva {diapositiva.numero}: {diapositiva.titulo}
            </Link>
            <p className="text-sm text-zinc-500">{diapositiva.capas.length} capa(s)</p>
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

## `app/diapositivas/[id]/page.tsx`
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CrearCapaForm from "@/components/CrearCapaForm";

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
      <h1 className="text-2xl font-semibold mt-2 mb-6">
        Diapositiva {diapositiva.numero}: {diapositiva.titulo}
      </h1>

      <CrearCapaForm
        diapositivaId={diapositiva.id}
        siguienteNumero={`${diapositiva.numero}.${diapositiva.capas.length + 1}`}
        interacciones={interacciones.map((i) => i.nombre)}
      />

      <ul className="mt-8 space-y-3">
        {diapositiva.capas.map((capa) => (
          <li key={capa.id} className="border rounded-lg p-4 hover:bg-zinc-50">
            <Link href={`/capas/${capa.id}`} className="font-medium">
              Capa {capa.numero} — {capa.interaccion}
            </Link>
            <p className="text-sm text-zinc-500">Estado: {capa.estado}</p>
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

## `app/capas/[id]/page.tsx`
```tsx
import CapaEditor from "@/components/CapaEditor";

export const dynamic = "force-dynamic";

export default async function CapaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CapaEditor id={id} />;
}
```

---

## `app/api/cursos/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const cursos = await prisma.curso.findMany({
    orderBy: { createdAt: "desc" },
    include: { lecciones: true },
  });
  return NextResponse.json(cursos);
}

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
    data: { linea, titulo, nivel, periodo },
  });

  return NextResponse.json(curso, { status: 201 });
}
```

## `app/api/lecciones/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cursoId = req.nextUrl.searchParams.get("cursoId");

  const lecciones = await prisma.leccion.findMany({
    where: cursoId ? { cursoId } : undefined,
    orderBy: { numero: "asc" },
  });

  return NextResponse.json(lecciones);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { cursoId, numero, titulo } = body;

  if (!cursoId || numero === undefined || !titulo) {
    return NextResponse.json(
      { error: "cursoId, numero y titulo son obligatorios" },
      { status: 400 }
    );
  }

  const leccion = await prisma.leccion.create({
    data: { cursoId, numero: Number(numero), titulo },
  });

  return NextResponse.json(leccion, { status: 201 });
}
```

## `app/api/diapositivas/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const leccionId = req.nextUrl.searchParams.get("leccionId");

  const diapositivas = await prisma.diapositiva.findMany({
    where: leccionId ? { leccionId } : undefined,
    orderBy: { numero: "asc" },
  });

  return NextResponse.json(diapositivas);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { leccionId, numero, titulo } = body;

  if (!leccionId || numero === undefined || !titulo) {
    return NextResponse.json(
      { error: "leccionId, numero y titulo son obligatorios" },
      { status: 400 }
    );
  }

  const diapositiva = await prisma.diapositiva.create({
    data: { leccionId, numero: Number(numero), titulo },
  });

  return NextResponse.json(diapositiva, { status: 201 });
}
```

## `app/api/capas/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const diapositivaId = req.nextUrl.searchParams.get("diapositivaId");

  const capas = await prisma.capa.findMany({
    where: diapositivaId ? { diapositivaId } : undefined,
    orderBy: { numero: "asc" },
  });

  return NextResponse.json(capas);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { diapositivaId, numero, interaccion } = body;

  if (!diapositivaId || !numero || !interaccion) {
    return NextResponse.json(
      { error: "diapositivaId, numero e interaccion son obligatorios" },
      { status: 400 }
    );
  }

  const capa = await prisma.capa.create({
    data: {
      diapositivaId,
      numero,
      interaccion,
      estado: "borrador",
      explicacion: "",
      visual: "",
      audio: "",
      duracion: "",
      nombreArchivo: "",
      triggers: [],
      extra: {},
    },
  });

  return NextResponse.json(capa, { status: 201 });
}
```

## `app/api/capas/[id]/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const capa = await prisma.capa.findUnique({
    where: { id },
    include: { items: { orderBy: { orden: "asc" } } },
  });

  if (!capa) {
    return NextResponse.json({ error: "Capa no encontrada" }, { status: 404 });
  }

  return NextResponse.json(capa);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const camposPermitidos = [
    "numero",
    "estado",
    "explicacion",
    "visual",
    "interaccion",
    "audio",
    "duracion",
    "nombreArchivo",
    "triggers",
    "extra",
  ];

  const data: Record<string, unknown> = {};
  for (const campo of camposPermitidos) {
    if (campo in body) data[campo] = body[campo];
  }

  const capa = await prisma.capa.update({
    where: { id },
    data,
  });

  return NextResponse.json(capa);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.item.deleteMany({ where: { capaId: id } });
  await prisma.capa.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
```

## `app/api/items/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const capaId = req.nextUrl.searchParams.get("capaId");

  const items = await prisma.item.findMany({
    where: capaId ? { capaId } : undefined,
    orderBy: { orden: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    capaId,
    kind = "",
    orden,
    datos = {},
    tieneImagen = false,
    imagenDesc = "",
    tieneAudio = false,
    audioTexto = "",
  } = body;

  if (!capaId || orden === undefined) {
    return NextResponse.json(
      { error: "capaId y orden son obligatorios" },
      { status: 400 }
    );
  }

  const item = await prisma.item.create({
    data: {
      capaId,
      kind,
      orden,
      datos,
      tieneImagen,
      imagenDesc,
      tieneAudio,
      audioTexto,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
```

## `app/api/items/[id]/route.ts`
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

  const camposPermitidos = [
    "kind",
    "orden",
    "datos",
    "tieneImagen",
    "imagenDesc",
    "tieneAudio",
    "audioTexto",
  ];

  const data: Record<string, unknown> = {};
  for (const campo of camposPermitidos) {
    if (campo in body) data[campo] = body[campo];
  }

  const item = await prisma.item.update({
    where: { id },
    data,
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.item.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

## `app/api/interacciones/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tipo = req.nextUrl.searchParams.get("tipo");

  const interacciones = await prisma.interaccionCatalogo.findMany({
    where: tipo ? { tipo } : undefined,
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(interacciones);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    nombre,
    tipo,
    itemLabel = "",
    repeatable = true,
    campos = [],
    audioCtx = "",
  } = body;

  if (!nombre || !tipo) {
    return NextResponse.json(
      { error: "nombre y tipo son obligatorios" },
      { status: 400 }
    );
  }

  const interaccion = await prisma.interaccionCatalogo.create({
    data: { nombre, tipo, itemLabel, repeatable, campos, audioCtx },
  });

  return NextResponse.json(interaccion, { status: 201 });
}
```
