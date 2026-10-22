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
