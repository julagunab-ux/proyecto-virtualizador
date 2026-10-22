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
    const lote = registros.slice(i, i + 96);
    // SDK v9: upsertRecords recibe { records }.
    await ns.upsertRecords({ records: lote } as never);
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
    // SDK v9: deleteMany recibe { ids } o { filter }.
    await ns.deleteMany({ ids: ids.slice(i, i + 1000) });
  }
}

/** Borra todo el namespace de un curso. No crea el índice si no existe. */
export async function borrarNamespace(cursoId: string) {
  const indice = await obtenerIndice(false);
  if (!indice) return;
  await indice.deleteNamespace(cursoId);
}
