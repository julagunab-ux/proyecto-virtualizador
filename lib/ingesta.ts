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
