# Handoff para Claude Code — Ajuste a la Fase C: el ejemplo integrador reemplaza la pregunta de Uifcito

Cambio de criterio: ya no se pregunta si Uifcito es protagonista. En su lugar, la pregunta 4 del cuestionario pasa a definir el alcance del ejemplo integrador:
- **No habrá ejemplo integrador.**
- **Sí, durante todo el curso.**
- **Sí, solo en lecciones específicas.** En ese caso cada lección se marca con "Ejemplo integrador en esta lección: Sí/No" desde su botón Editar.

Este archivo es un PARCHE sobre `HANDOFF_faseC.md`. Si la Fase C todavía no está aplicada, aplícala primero y después este parche. Si ya está aplicada y hay cursos creados con el valor anterior `"si"`, el código los trata como "todo el curso" (ver `normalizarEjemplo`).

Instrucción para Claude Code: aplica los cambios en el orden de abajo. Si algún archivo tiene cambios propios que no aparecen aquí, muéstrame el diff antes de sobreescribir. Al final corre `npx prisma generate` y `npm run build`.

---

## 1. `prisma/schema.prisma`

En `model Curso`: **elimina** la línea `uifcito`.
```prisma
  uifcito              String   @default("por_leccion") // ELIMINAR esta línea
```
Y deja el comentario del campo de ejemplo así:
```prisma
  ejemploIntegrador    String   @default("no")          // "no" | "curso" | "lecciones"
```

En `model Leccion`: **agrega**
```prisma
  usaEjemplo Boolean @default(false) // solo se usa cuando el curso tiene ejemploIntegrador = "lecciones"
```

Migración: `npx prisma migrate dev --name ajuste_ejemplo_integrador` (o `npx prisma db push`). Prisma avisará que elimina la columna `uifcito`; es esperado y se acepta.

---

## 2. `lib/kickoff.ts` (reemplazar completo)
```ts
export const LINEAS = [
  { codigo: "PRG", nombre: "Programación" },
  { codigo: "CON", nombre: "Contaduría" },
  { codigo: "ECO", nombre: "Economía" },
];

export const NIVELES = ["FUN", "INT", "AVA"];

export const OPC_EJEMPLO = [
  { valor: "no", label: "No habrá ejemplo integrador" },
  { valor: "curso", label: "Sí, durante todo el curso" },
  { valor: "lecciones", label: "Sí, solo en lecciones específicas" },
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

// Los cursos creados antes del ajuste guardaron "si": equivale a "todo el curso".
export function normalizarEjemplo(valor: string) {
  return valor === "si" ? "curso" : valor;
}

// ¿Esta lección lleva el ejemplo integrador?
export function aplicaEjemplo(modoCurso: string, usaEjemploLeccion: boolean) {
  const modo = normalizarEjemplo(modoCurso);
  return modo === "curso" || (modo === "lecciones" && usaEjemploLeccion);
}

export function resumenKickoff(c: {
  linea: string;
  titulo: string;
  nivel: string;
  periodo: string;
  ejemploIntegrador: string;
  ejemploDesc: string;
  duracionObjetivo: string;
  fuentesEstado: string;
}) {
  return [
    `Kickoff del curso "${c.titulo}".`,
    `Línea: ${c.linea}. Nivel: ${c.nivel}. Periodo: ${c.periodo}.`,
    `Ejemplo integrador: ${etiqueta(OPC_EJEMPLO, normalizarEjemplo(c.ejemploIntegrador))}${c.ejemploDesc ? " (" + c.ejemploDesc + ")" : ""}.`,
    `Duración objetivo por lección: ${c.duracionObjetivo || "sin definir"}.`,
    `Fuentes: ${etiqueta(OPC_FUENTES, c.fuentesEstado)}.`,
  ].join(" ");
}
```

---

## 3. `components/KickoffForm.tsx` (reemplazar completo)
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LINEAS, NIVELES, OPC_EJEMPLO, OPC_FUENTES } from "@/lib/kickoff";

export default function KickoffForm() {
  const router = useRouter();
  const [lineaSel, setLineaSel] = useState(LINEAS[0].codigo);
  const [lineaOtra, setLineaOtra] = useState("");
  const [titulo, setTitulo] = useState("");
  const [nivel, setNivel] = useState("FUN");
  const [periodo, setPeriodo] = useState("2026-2");
  const [ejemploIntegrador, setEjemploIntegrador] = useState("no");
  const [ejemploDesc, setEjemploDesc] = useState("");
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
        ejemploDesc: ejemploIntegrador === "no" ? "" : ejemploDesc,
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
        {ejemploIntegrador !== "no" && (
          <textarea
            value={ejemploDesc}
            onChange={(e) => setEjemploDesc(e.target.value)}
            placeholder={
              ejemploIntegrador === "curso"
                ? "Describe el caso (empresa, dataset, problema) que se desarrollará a lo largo del curso"
                : "Describe el caso. Las lecciones donde aparece se marcan después, en el botón Editar de cada lección"
            }
            rows={2}
            className={campo}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className={etiqueta}>5. Nivel</label>
          <select value={nivel} onChange={(e) => setNivel(e.target.value)} className={campo}>
            {NIVELES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className={etiqueta}>6. Periodo / cohorte (Año-Semestre)</label>
          <input value={periodo} onChange={(e) => setPeriodo(e.target.value)} className={campo} required />
        </div>
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

---

## 4. `app/cursos/[id]/page.tsx` — cuatro cambios puntuales

**a) Imports.** Reemplaza el bloque de importación de `@/lib/kickoff` por:
```tsx
import {
  NIVELES,
  OPC_EJEMPLO,
  OPC_FUENTES,
  etiqueta,
  normalizarEjemplo,
  aplicaEjemplo,
} from "@/lib/kickoff";
```

**b) Botón "Editar ficha".** En `campos`, elimina la línea de `uifcito` y deja la de ejemplo así:
```tsx
              { key: "ejemploIntegrador", label: "Ejemplo integrador", type: "select", opciones: OPC_EJEMPLO },
```
En `valores`, elimina `uifcito` y cambia el ejemplo por:
```tsx
              ejemploIntegrador: normalizarEjemplo(curso.ejemploIntegrador),
```

**c) Bloque "Ficha del curso".** Reemplaza el párrafo del ejemplo integrador por:
```tsx
        <p className={campoFicha}>
          <span className="font-medium">Ejemplo integrador:</span>{" "}
          {etiqueta(OPC_EJEMPLO, normalizarEjemplo(curso.ejemploIntegrador))}
          {curso.ejemploDesc && ` — ${curso.ejemploDesc}`}
        </p>
```
y **elimina** el párrafo "Uifcito protagonista".

**d) Lista de lecciones.** Justo antes del `return`, agrega:
```tsx
  const modoEjemplo = normalizarEjemplo(curso.ejemploIntegrador);
```
Dentro de cada lección, debajo del título (link) agrega la etiqueta:
```tsx
              {aplicaEjemplo(curso.ejemploIntegrador, leccion.usaEjemplo) && (
                <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5">
                  Ejemplo integrador
                </span>
              )}
```
Y en el `BotonEditar` de la lección, reemplaza `campos` y `valores` por:
```tsx
                campos={[
                  { key: "numero", label: "Número", type: "number" },
                  { key: "titulo", label: "Título" },
                  { key: "objetivo", label: "Objetivo", type: "largo", opcional: true },
                  { key: "duracion", label: "Duración estimada", opcional: true },
                  ...(modoEjemplo === "lecciones"
                    ? [
                        {
                          key: "usaEjemplo",
                          label: "Ejemplo integrador en esta lección",
                          type: "select" as const,
                          opciones: [
                            { valor: "no", label: "No" },
                            { valor: "si", label: "Sí" },
                          ],
                        },
                      ]
                    : []),
                ]}
                valores={{
                  numero: leccion.numero,
                  titulo: leccion.titulo,
                  objetivo: leccion.objetivo,
                  duracion: leccion.duracion,
                  usaEjemplo: leccion.usaEjemplo ? "si" : "no",
                }}
```

---

## 5. APIs — cambios puntuales

### `app/api/cursos/route.ts` — en `POST`, dentro de `data` de `prisma.curso.create`
Reemplaza la línea de `ejemploIntegrador` y **elimina** la de `uifcito`:
```ts
      ejemploIntegrador: ["curso", "lecciones"].includes(body.ejemploIntegrador)
        ? body.ejemploIntegrador
        : "no",
```

### `app/api/cursos/[id]/route.ts`
En `CAMPOS_TEXTO`, **elimina** `"uifcito",`.

### `app/api/lecciones/[id]/route.ts` — en `PATCH`
Cambia el tipo de `data` y agrega la línea de `usaEjemplo`:
```ts
  const data: {
    numero?: number;
    titulo?: string;
    objetivo?: string;
    duracion?: string;
    usaEjemplo?: boolean;
  } = {};
  if ("numero" in body) data.numero = Number(body.numero);
  if ("titulo" in body) data.titulo = String(body.titulo);
  if ("objetivo" in body) data.objetivo = String(body.objetivo);
  if ("duracion" in body) data.duracion = String(body.duracion);
  if ("usaEjemplo" in body) data.usaEjemplo = body.usaEjemplo === "si" || body.usaEjemplo === true;
```

---

## Cómo probarlo
1. `/cursos/nuevo`: la pregunta 4 ofrece las 3 opciones; ya no aparece Uifcito y la numeración llega hasta 6.
2. Crea un curso con "solo en lecciones específicas", agrega 2 lecciones y edita una: debe aparecer el campo "Ejemplo integrador en esta lección" y, al marcarlo en Sí, la etiqueta azul en la lista.
3. Con "durante todo el curso", todas las lecciones muestran la etiqueta y el campo no aparece al editar.
4. En un curso con "No", no aparece ni la etiqueta ni el campo.
5. Revisa la Bitácora: el kickoff y los cambios de la ficha ya no mencionan Uifcito.
