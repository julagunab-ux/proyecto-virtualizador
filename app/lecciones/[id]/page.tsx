import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CrearDiapositivaForm from "@/components/CrearDiapositivaForm";
import BotonEliminar from "@/components/BotonEliminar";
import BotonEditar from "@/components/BotonEditar";

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

      <div className="flex justify-between items-start mt-2 mb-2 gap-3">
        <h1 className="text-2xl font-semibold">
          Lección {leccion.numero}: {leccion.titulo}
        </h1>
        <div className="flex gap-3">
          <BotonEditar
            url={`/api/lecciones/${leccion.id}`}
            titulo="Editar lección"
            texto="Editar lección"
            campos={[
              { key: "numero", label: "Número", type: "number" },
              { key: "titulo", label: "Título" },
            ]}
            valores={{ numero: leccion.numero, titulo: leccion.titulo }}
          />
          <BotonEliminar
            url={`/api/lecciones/${leccion.id}`}
            mensaje={`¿Eliminar la lección "${leccion.titulo}"? Se borrarán también sus diapositivas y capas. Esta acción no se puede deshacer.`}
            redirigirA={`/cursos/${leccion.cursoId}`}
            texto="Eliminar lección"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href={`/lecciones/${leccion.id}/especificaciones`}
          className="text-xs border rounded px-3 py-1.5 hover:bg-zinc-50"
        >
          Especificaciones de generación
        </Link>
      </div>

      <CrearDiapositivaForm leccionId={leccion.id} siguienteNumero={leccion.diapositivas.length + 1} />

      <ul className="mt-8 space-y-3">
        {leccion.diapositivas.map((diapositiva) => (
          <li key={diapositiva.id} className="border rounded-lg p-4 hover:bg-zinc-50 flex justify-between items-start gap-3">
            <div>
              <Link href={`/diapositivas/${diapositiva.id}`} className="font-medium">
                Diapositiva {diapositiva.numero}: {diapositiva.titulo}
              </Link>
              <p className="text-sm text-zinc-500">{diapositiva.capas.length} capa(s)</p>
            </div>
            <div className="flex gap-3">
              <BotonEditar
                url={`/api/diapositivas/${diapositiva.id}`}
                titulo="Editar diapositiva"
                campos={[
                  { key: "numero", label: "Número", type: "number" },
                  { key: "titulo", label: "Título" },
                ]}
                valores={{ numero: diapositiva.numero, titulo: diapositiva.titulo }}
              />
              <BotonEliminar
                url={`/api/diapositivas/${diapositiva.id}`}
                mensaje={`¿Eliminar la diapositiva "${diapositiva.titulo}"? Se borrarán también sus capas. Esta acción no se puede deshacer.`}
              />
            </div>
          </li>
        ))}
        {leccion.diapositivas.length === 0 && (
          <p className="text-zinc-500">Aún no hay diapositivas en esta lección.</p>
        )}
      </ul>
    </div>
  );
}
