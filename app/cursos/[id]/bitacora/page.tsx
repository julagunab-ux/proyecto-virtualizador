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
