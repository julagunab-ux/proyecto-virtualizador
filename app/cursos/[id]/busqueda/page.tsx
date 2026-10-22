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
