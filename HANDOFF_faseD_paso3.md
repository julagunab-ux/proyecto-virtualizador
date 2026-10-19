# Handoff para Claude Code — Fase D, Paso 3: ingesta de fuentes a Pinecone

Qué hace: cada fuente del curso (página `/cursos/[id]/fuentes`) se puede **indexar** desde un link, un archivo (PDF, TXT, MD) o texto pegado. La plataforma extrae el texto, lo divide en fragmentos de ~1000 caracteres con solape, y los guarda en Pinecone. Pinecone genera los vectores con su modelo `multilingual-e5-large` (embeddings integrados, no hace falta OpenAI). Hay un solo índice y un **namespace por curso**, así que las fuentes de un curso nunca se mezclan con las de otro.

Decisiones de diseño:
- Los PDF se leen **por página**, para poder citar "p. 12" más adelante.
- Las fuentes no aprobadas SÍ se indexan, pero en el paso 4 (búsqueda) solo se consultarán las aprobadas.
- Los links se descargan desde el servidor con protección contra direcciones internas (localhost, redes privadas).
- Reindexar una fuente borra primero sus fragmentos anteriores. Borrar una fuente borra sus fragmentos; borrar un curso borra su namespace.
- PDFs escaneados (solo imagen) no tienen texto extraíble: se avisa con un error claro. El OCR queda fuera por ahora.

Instrucción para Claude Code: aplica en orden: (1) dependencias, (2) cambios de `schema.prisma` y migración, (3) archivos nuevos, (4) cambios puntuales. Si algún archivo tiene cambios propios que no aparecen aquí, muéstrame el diff antes de sobreescribir. Si el compilador de TypeScript se queja de los tipos de `upsertRecords` en `lib/pinecone.ts`, ajusta solo los tipos sin cambiar la lógica. Al final corre `npx prisma generate` y `npm run build`.

---

## 1. Dependencias
```
npm install @pinecone-database/pinecone unpdf cheerio
```

Variables de entorno (la persona las agrega a mano en `.env.local`; `PINECONE_API_KEY` ya debería estar del paso 1):
```
PINECONE_API_KEY=tu-llave-de-pinecone
PINECONE_INDEX=virtualizacion-fuentes
```
`PINECONE_INDEX` es opcional; si no existe se usa `virtualizacion-fuentes`. El nombre solo admite minúsculas, números y guiones.

---

## 2. `prisma/schema.prisma`

En `model Fuente`, agrega estos campos:
```prisma
  estadoIndexado String    @default("pendiente") // "pendiente" | "indexando" | "indexada" | "error"
  fragmentos     Int       @default(0)
  textoChars     Int       @default(0)
  indexadoDesde  String    @default("")          // "link" | "archivo" | "texto"
  indexadoEn     DateTime?
  errorIndexado  String    @default("")
```

Migración: `npx prisma migrate dev --name fuentes_indexado` (o `npx prisma db push`). Los campos nuevos tienen valor por defecto, así que las fuentes existentes quedan como "pendiente".

---

## 3. Archivos nuevos

### `lib/pinecone.ts`
```ts
import { Pinecone } from "@pinecone-database/pinecone";

export const INDICE = process.env.PINECONE_INDEX || "virtualizacion-fuentes";

let cliente: Pinecone | null = null;
let hostEnCache: string | null = null;

function obtenerCliente() {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("Falta PINECONE_API_KEY en .env.local");
  }
  if (!cliente) cliente = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  return cliente;
}

/**
 * Devuelve el índice de Pinecone. Si no existe y crear = true, lo crea con
 * embeddings integrados (multilingual-e5-large). Si no existe y crear = false,
 * devuelve null (se usa en las limpiezas, para no crear el índice sin querer).
 */
export async function obtenerIndice(crear = true) {
  const pc = obtenerCliente();

  if (!hostEnCache) {
    try {
      const descripcion = await pc.describeIndex(INDICE);
      hostEnCache = descripcion.host;
    } catch {
      if (!crear) return null;

      await pc.createIndexForModel({
        name: INDICE,
        cloud: "aws",
        region: "us-east-1",
        embed: {
          model: "multilingual-e5-large",
          fieldMap: { text: "chunk_text" },
        },
        waitUntilReady: true,
      });

      const descripcion = await pc.describeIndex(INDICE);
      hostEnCache = descripcion.host;
    }
  }

  return pc.index(INDICE, hostEnCache);
}

export type Fragmento = { pagina?: number; texto: string };

export function idFragmento(fuenteId: string, orden: number) {
  return `${fuenteId}#${orden}`;
}

/** Sube los fragmentos de una fuente (lotes de 96, el máximo para texto con embeddings integrados). */
export async function guardarFragmentos(
  cursoId: string,
  fuenteId: string,
  titulo: string,
  fragmentos: Fragmento[]
) {
  const indice = await obtenerIndice(true);
  if (!indice) throw new Error("No se pudo preparar el índice de Pinecone");
  const ns = indice.namespace(cursoId);

  const registros = fragmentos.map((f, i) => {
    const registro: Record<string, string | number> = {
      _id: idFragmento(fuenteId, i),
      chunk_text: f.texto,
      cursoId,
      fuenteId,
      titulo,
      orden: i,
    };
    if (f.pagina !== undefined) registro.pagina = f.pagina;
    return registro;
  });

  for (let i = 0; i < registros.length; i += 96) {
    // Si el compilador se queja del tipo, ajustar solo el tipo (p. ej. "as never").
    await ns.upsertRecords(registros.slice(i, i + 96) as never);
  }
}

/** Borra los fragmentos de una fuente (por ID, en lotes de 1000). No crea el índice si no existe. */
export async function borrarFragmentos(cursoId: string, fuenteId: string, cantidad: number) {
  if (cantidad <= 0) return;
  const indice = await obtenerIndice(false);
  if (!indice) return;
  const ns = indice.namespace(cursoId);

  const ids = Array.from({ length: cantidad }, (_, i) => idFragmento(fuenteId, i));
  for (let i = 0; i < ids.length; i += 1000) {
    await ns.deleteMany(ids.slice(i, i + 1000));
  }
}

/** Borra todo el namespace de un curso. No crea el índice si no existe. */
export async function borrarNamespace(cursoId: string) {
  const indice = await obtenerIndice(false);
  if (!indice) return;
  await indice.deleteNamespace(cursoId);
}
```

### `lib/ingesta.ts`
```ts
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";
import { extractText, getDocumentProxy } from "unpdf";
import type { Fragmento } from "@/lib/pinecone";

export type Pagina = { pagina?: number; texto: string };

export const MAX_BYTES_DESCARGA = 15 * 1024 * 1024;
export const MAX_PAGINAS_PDF = 400;
export const MAX_FRAGMENTOS = 800;
const TAM_FRAGMENTO = 1000; // caracteres (~250-300 tokens en español)
const SOLAPE = 150;
const MIN_FRAGMENTO = 40;

/* ---------- Protección contra links internos (SSRF) ---------- */

function esDireccionPrivada(ip: string): boolean {
  if (ip.includes(":")) {
    const l = ip.toLowerCase();
    return (
      l === "::1" ||
      l === "::" ||
      l.startsWith("fc") ||
      l.startsWith("fd") ||
      l.startsWith("fe80") ||
      l.startsWith("::ffff:")
    );
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

export async function validarUrlPublica(texto: string) {
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    throw new Error("El link no es válido.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Solo se aceptan links http o https.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("El link apunta a una dirección interna.");
  }

  const direcciones = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (direcciones.some((d) => esDireccionPrivada(d.address))) {
    throw new Error("El link apunta a una dirección privada o interna.");
  }
}

/* ---------- Descarga ---------- */

async function descargar(urlInicial: string): Promise<{ tipo: string; datos: Uint8Array }> {
  let url = urlInicial;

  for (let salto = 0; salto < 4; salto++) {
    await validarUrlPublica(url);

    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), 25_000);

    try {
      const res = await fetch(url, {
        redirect: "manual",
        signal: control.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; VirtualizacionBot/1.0)",
          Accept: "text/html,application/pdf,text/plain;q=0.9,*/*;q=0.5",
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const destino = res.headers.get("location");
        if (!destino) throw new Error("El sitio devolvió una redirección sin destino.");
        url = new URL(destino, url).toString();
        continue;
      }

      if (!res.ok) throw new Error(`El sitio respondió con el código ${res.status}.`);

      const declarado = Number(res.headers.get("content-length") ?? 0);
      if (declarado > MAX_BYTES_DESCARGA) throw new Error("El contenido del link es demasiado grande.");

      const datos = new Uint8Array(await res.arrayBuffer());
      if (datos.byteLength > MAX_BYTES_DESCARGA) throw new Error("El contenido del link es demasiado grande.");

      return { tipo: (res.headers.get("content-type") ?? "").toLowerCase(), datos };
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error("El sitio tardó demasiado en responder.");
      }
      throw e;
    } finally {
      clearTimeout(temporizador);
    }
  }

  throw new Error("El link tiene demasiadas redirecciones.");
}

/* ---------- Extracción de texto ---------- */

export function textoDeHtml(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, nav, footer, header, aside, form, iframe").remove();

  const raiz = $("main").length ? $("main").first() : $("article").length ? $("article").first() : $("body");

  const selector = "h1,h2,h3,h4,h5,h6,p,li,pre,blockquote,td,th";
  const bloques: string[] = [];

  raiz
    .find(selector)
    .filter((_, el) => $(el).find(selector).length === 0) // evita duplicar texto anidado
    .each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t) bloques.push(t);
    });

  return bloques.length > 0 ? bloques.join("\n\n") : raiz.text().replace(/[ \t]+/g, " ").trim();
}

export async function extraerDePdf(datos: Uint8Array): Promise<Pagina[]> {
  const pdf = await getDocumentProxy(datos);
  if (pdf.numPages > MAX_PAGINAS_PDF) {
    throw new Error(
      `El PDF tiene ${pdf.numPages} páginas (máximo ${MAX_PAGINAS_PDF}). Divídelo por capítulos y cárgalos como fuentes separadas.`
    );
  }

  const { text } = await extractText(pdf, { mergePages: false });
  const paginas = Array.isArray(text) ? text : [text];

  return paginas
    .map((t, i) => ({ pagina: i + 1, texto: t }))
    .filter((p) => p.texto.trim().length > 0);
}

function decodificar(datos: Uint8Array, tipo: string): string {
  const charset = /charset=([\w-]+)/.exec(tipo)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(datos);
  } catch {
    return new TextDecoder("utf-8").decode(datos);
  }
}

export async function extraerDeUrl(url: string): Promise<Pagina[]> {
  const { tipo, datos } = await descargar(url);

  if (tipo.includes("pdf") || url.toLowerCase().split("?")[0].endsWith(".pdf")) {
    return extraerDePdf(datos);
  }

  const texto = decodificar(datos, tipo);
  if (tipo.includes("html") || /^\s*<(!doctype|html)/i.test(texto)) {
    return [{ texto: textoDeHtml(texto) }];
  }
  return [{ texto }];
}

/* ---------- División en fragmentos ---------- */

function partirLargo(parrafo: string): string[] {
  const oraciones = parrafo.split(/(?<=[.!?;:])\s+/);
  const piezas: string[] = [];

  for (const oracion of oraciones) {
    if (oracion.length <= TAM_FRAGMENTO) {
      piezas.push(oracion);
      continue;
    }
    // Oración sin puntuación: corte duro en el último espacio antes del límite
    let resto = oracion;
    while (resto.length > TAM_FRAGMENTO) {
      let corte = resto.lastIndexOf(" ", TAM_FRAGMENTO);
      if (corte < TAM_FRAGMENTO / 2) corte = TAM_FRAGMENTO;
      piezas.push(resto.slice(0, corte));
      resto = resto.slice(corte).trim();
    }
    if (resto) piezas.push(resto);
  }
  return piezas;
}

function trocear(texto: string): string[] {
  const limpio = texto
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!limpio) return [];

  const trozos: string[] = [];
  let actual = "";

  const cerrar = () => {
    if (actual.trim().length >= MIN_FRAGMENTO) trozos.push(actual.trim());
  };

  for (const parrafo of limpio.split(/\n+/)) {
    const piezas = parrafo.length > TAM_FRAGMENTO ? partirLargo(parrafo) : [parrafo];

    for (const pieza of piezas) {
      if (actual && actual.length + 1 + pieza.length > TAM_FRAGMENTO) {
        cerrar();
        // Solape: la cola del fragmento anterior, empezando en una palabra completa
        const cola = actual.slice(-SOLAPE);
        const espacio = cola.indexOf(" ");
        const solape = espacio >= 0 ? cola.slice(espacio + 1) : "";
        actual = solape ? `${solape} ${pieza}` : pieza;
      } else {
        actual = actual ? `${actual}\n${pieza}` : pieza;
      }
    }
  }
  cerrar();

  return trozos;
}

export function dividir(paginas: Pagina[]): Fragmento[] {
  const fragmentos: Fragmento[] = [];
  for (const p of paginas) {
    for (const texto of trocear(p.texto)) {
      fragmentos.push(p.pagina !== undefined ? { pagina: p.pagina, texto } : { texto });
    }
  }
  return fragmentos;
}
```

### `app/api/fuentes/[id]/indexar/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { borrarFragmentos, guardarFragmentos } from "@/lib/pinecone";
import {
  dividir,
  extraerDePdf,
  extraerDeUrl,
  MAX_FRAGMENTOS,
  type Pagina,
} from "@/lib/ingesta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel limita el cuerpo de una petición a ~4.5 MB; por eso este tope.
const MAX_ARCHIVO_BYTES = 4 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const fuente = await prisma.fuente.findUnique({ where: { id } });
  if (!fuente) {
    return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
  }

  await prisma.fuente.update({
    where: { id },
    data: { estadoIndexado: "indexando", errorIndexado: "" },
  });

  try {
    const form = await req.formData();
    const archivo = form.get("archivo");
    const textoPegado = String(form.get("texto") ?? "").trim();

    let paginas: Pagina[];
    let desde: "link" | "archivo" | "texto";

    if (archivo instanceof File && archivo.size > 0) {
      if (archivo.size > MAX_ARCHIVO_BYTES) {
        throw new Error("El archivo supera los 4 MB. Divídelo por capítulos o pega el texto.");
      }
      const nombre = archivo.name.toLowerCase();
      const datos = new Uint8Array(await archivo.arrayBuffer());

      if (nombre.endsWith(".pdf")) {
        paginas = await extraerDePdf(datos);
      } else if (nombre.endsWith(".txt") || nombre.endsWith(".md")) {
        paginas = [{ texto: new TextDecoder("utf-8").decode(datos) }];
      } else {
        throw new Error("Formato no soportado. Usa PDF, TXT o MD, o pega el texto.");
      }
      desde = "archivo";
    } else if (textoPegado) {
      paginas = [{ texto: textoPegado }];
      desde = "texto";
    } else if (fuente.url.startsWith("http")) {
      paginas = await extraerDeUrl(fuente.url);
      desde = "link";
    } else {
      throw new Error("Esta fuente no tiene link: sube un archivo o pega el texto.");
    }

    const fragmentos = dividir(paginas);

    if (fragmentos.length === 0) {
      throw new Error(
        "No se encontró texto. Si es un PDF escaneado (solo imagen), copia el texto y pégalo; el OCR aún no está disponible."
      );
    }
    if (fragmentos.length > MAX_FRAGMENTOS) {
      throw new Error(
        `El contenido genera ${fragmentos.length} fragmentos (máximo ${MAX_FRAGMENTOS}). Divídelo por capítulos y cárgalos como fuentes separadas.`
      );
    }

    // Reindexar: primero se borran los fragmentos anteriores de esta fuente
    await borrarFragmentos(fuente.cursoId, fuente.id, fuente.fragmentos);
    await guardarFragmentos(fuente.cursoId, fuente.id, fuente.titulo, fragmentos);

    const caracteres = fragmentos.reduce((suma, f) => suma + f.texto.length, 0);

    await prisma.fuente.update({
      where: { id },
      data: {
        estadoIndexado: "indexada",
        fragmentos: fragmentos.length,
        textoChars: caracteres,
        indexadoDesde: desde,
        indexadoEn: new Date(),
        errorIndexado: "",
      },
    });

    await prisma.decision.create({
      data: {
        cursoId: fuente.cursoId,
        tipo: "cambio",
        texto: `Fuente "${fuente.titulo}" indexada desde ${desde}: ${fragmentos.length} fragmentos.`,
      },
    });

    return NextResponse.json({ fragmentos: fragmentos.length, caracteres });
  } catch (e) {
    const mensaje = (e instanceof Error ? e.message : "Error desconocido").slice(0, 300);
    await prisma.fuente.update({
      where: { id },
      data: { estadoIndexado: "error", errorIndexado: mensaje },
    });
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
```

### `components/IndexarFuente.tsx`
```tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Sin indexar",
  indexando: "Indexando...",
  indexada: "Indexada",
  error: "Error al indexar",
};

export default function IndexarFuente({
  fuenteId,
  tieneLink,
  estado,
  fragmentos,
  textoChars,
  indexadoDesde,
  indexadoEn,
  errorIndexado,
}: {
  fuenteId: string;
  tieneLink: boolean;
  estado: string;
  fragmentos: number;
  textoChars: number;
  indexadoDesde: string;
  indexadoEn: string;
  errorIndexado: string;
}) {
  const router = useRouter();
  const archivoRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  async function enviar(datos: FormData) {
    setOcupado(true);
    setMensaje(null);
    try {
      const res = await fetch(`/api/fuentes/${fuenteId}/indexar`, { method: "POST", body: datos });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMensaje({ ok: false, texto: json.error ?? "No se pudo indexar." });
      } else {
        setMensaje({ ok: true, texto: `Listo: ${json.fragmentos} fragmentos indexados.` });
        setTexto("");
        if (archivoRef.current) archivoRef.current.value = "";
      }
    } catch {
      setMensaje({ ok: false, texto: "Error de conexión. Intenta de nuevo." });
    } finally {
      setOcupado(false);
      router.refresh();
    }
  }

  function desdeLink() {
    enviar(new FormData());
  }

  function desdeArchivo() {
    const archivo = archivoRef.current?.files?.[0];
    if (!archivo) {
      setMensaje({ ok: false, texto: "Elige un archivo primero." });
      return;
    }
    const datos = new FormData();
    datos.append("archivo", archivo);
    enviar(datos);
  }

  function desdeTexto() {
    if (!texto.trim()) {
      setMensaje({ ok: false, texto: "Pega el texto primero." });
      return;
    }
    const datos = new FormData();
    datos.append("texto", texto);
    enviar(datos);
  }

  const boton = "text-xs bg-black text-white rounded px-3 py-1 disabled:opacity-50 whitespace-nowrap";

  return (
    <div className="mt-2 text-xs space-y-1">
      <p className={estado === "error" ? "text-red-600" : "text-zinc-600"}>
        {ETIQUETA_ESTADO[estado] ?? estado}
        {estado === "indexada" &&
          ` — ${fragmentos} fragmentos, ${textoChars.toLocaleString("es-CO")} caracteres (desde ${indexadoDesde}${
            indexadoEn ? `, ${indexadoEn}` : ""
          })`}
        {estado === "error" && errorIndexado && `: ${errorIndexado}`}
      </p>

      <details>
        <summary className="cursor-pointer text-blue-600">
          {estado === "indexada" ? "Reindexar" : "Indexar contenido"}
        </summary>

        <div className="mt-2 space-y-3 border rounded p-3 bg-zinc-50">
          {tieneLink && (
            <div>
              <button onClick={desdeLink} disabled={ocupado} className={boton}>
                Indexar desde el link
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input ref={archivoRef} type="file" accept=".pdf,.txt,.md" className="text-xs" />
            <button onClick={desdeArchivo} disabled={ocupado} className={boton}>
              Indexar archivo
            </button>
          </div>
          <p className="text-zinc-500">PDF, TXT o MD de hasta 4 MB. Los PDF escaneados (solo imagen) no tienen texto.</p>

          <div className="space-y-1">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O pega aquí el texto de la fuente"
              rows={4}
              className="border rounded px-2 py-1 w-full text-xs"
            />
            <button onClick={desdeTexto} disabled={ocupado} className={boton}>
              Indexar texto pegado
            </button>
          </div>

          {ocupado && <p className="text-zinc-600">Indexando... puede tardar hasta un minuto.</p>}
          {mensaje && <p className={mensaje.ok ? "text-green-700" : "text-red-600"}>{mensaje.texto}</p>}
        </div>
      </details>
    </div>
  );
}
```

### `app/api/ia/prueba-pinecone/route.ts`

Ruta solo para desarrollo: prepara el índice (la primera vez puede tardar un minuto), sube 2 registros en español en un namespace temporal, busca por significado y limpia.

```ts
import { NextResponse } from "next/server";
import { obtenerIndice, INDICE } from "@/lib/pinecone";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible en producción" }, { status: 404 });
  }

  const inicio = Date.now();

  try {
    const indice = await obtenerIndice(true);
    if (!indice) throw new Error("No se pudo preparar el índice");
    const ns = indice.namespace("prueba");

    await ns.upsertRecords([
      {
        _id: "t1",
        chunk_text: "El impuesto sobre las ventas (IVA) se genera por la venta de bienes y la prestación de servicios.",
        tema: "iva",
      },
      {
        _id: "t2",
        chunk_text: "Una variable en Python es un nombre que referencia un valor almacenado en memoria.",
        tema: "python",
      },
    ] as never);

    // Los registros tardan unos segundos en quedar disponibles para búsqueda
    await new Promise((r) => setTimeout(r, 8000));

    const respuesta = await ns.searchRecords({
      query: { topK: 2, inputs: { text: "¿Qué es una variable?" } },
      fields: ["chunk_text", "tema"],
    });

    await ns.deleteAll();

    return NextResponse.json({
      ok: true,
      indice: INDICE,
      segundos: Math.round((Date.now() - inicio) / 1000),
      esperado: "El primer resultado debe ser t2 (variable en Python). Si hits viene vacío, recarga la página.",
      hits: respuesta.result.hits,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
```

---

## 4. Cambios puntuales en archivos existentes

### `app/cursos/[id]/fuentes/page.tsx`
Agrega el import:
```tsx
import IndexarFuente from "@/components/IndexarFuente";
```
Y dentro de cada fuente, justo después de la línea que muestra la descripción (`{f.descripcion && <p className="text-sm">{f.descripcion}</p>}`), agrega:
```tsx
              <IndexarFuente
                fuenteId={f.id}
                tieneLink={f.url.startsWith("http")}
                estado={f.estadoIndexado}
                fragmentos={f.fragmentos}
                textoChars={f.textoChars}
                indexadoDesde={f.indexadoDesde}
                indexadoEn={f.indexadoEn ? f.indexadoEn.toLocaleDateString("es-CO") : ""}
                errorIndexado={f.errorIndexado}
              />
```

### `app/api/fuentes/[id]/route.ts` — reemplaza solo la función `DELETE`
Agrega el import `import { borrarFragmentos } from "@/lib/pinecone";` y usa:
```ts
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const fuente = await prisma.fuente.findUnique({ where: { id } });

  if (fuente && fuente.fragmentos > 0) {
    try {
      await borrarFragmentos(fuente.cursoId, fuente.id, fuente.fragmentos);
    } catch (e) {
      console.error("No se pudieron borrar los fragmentos de Pinecone", e);
    }
  }

  await prisma.fuente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

### `app/api/cursos/[id]/route.ts` — en `DELETE`
Agrega el import `import { borrarNamespace } from "@/lib/pinecone";` y, justo después del `await prisma.$transaction([...])` y antes del `return`, agrega:
```ts
  try {
    await borrarNamespace(id);
  } catch (e) {
    console.error("No se pudo borrar el namespace de Pinecone", e);
  }
```

---

## Cómo probarlo
1. Reinicia `npm run dev` y abre `http://localhost:3000/api/ia/prueba-pinecone`. La primera vez crea el índice y puede tardar hasta un minuto. Debe responder `ok: true` y el primer `hit` debe ser `t2`.
2. En un curso, entra a Fuentes y crea una fuente de tipo link con una página pública (por ejemplo un artículo). Abre "Indexar contenido" → "Indexar desde el link". Debe quedar "Indexada — N fragmentos".
3. Crea otra fuente de tipo documento y sube un PDF pequeño con texto. Verifica que indexe y que la bitácora registre el evento.
4. Prueba un caso de error: sube un PDF escaneado o un archivo `.docx`; debe mostrar un mensaje claro y estado "Error al indexar".
5. Prueba "Reindexar" con la misma fuente y comprueba que el número de fragmentos se mantiene (no se duplican).
6. En la consola de Pinecone, abre el índice: debe haber un namespace con el ID del curso. Al eliminar el curso, el namespace desaparece.
