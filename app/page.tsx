import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BotonEliminar from "@/components/BotonEliminar";
import BotonEditar from "@/components/BotonEditar";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cursos = await prisma.curso.findMany({
    orderBy: { createdAt: "desc" },
    include: { lecciones: true },
  });

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <h1 className="text-2xl font-semibold mb-6">Cursos</h1>

      <Link
        href="/cursos/nuevo"
        className="inline-block bg-black text-white rounded px-4 py-2 text-sm"
      >
        + Nuevo curso (cuestionario de inicio)
      </Link>

      <ul className="mt-8 space-y-3">
        {cursos.map((curso) => (
          <li key={curso.id} className="border rounded-lg p-4 hover:bg-zinc-50 flex justify-between items-start gap-3">
            <div>
              <Link href={`/cursos/${curso.id}`} className="font-medium">
                {curso.linea}_{curso.nivel}_{curso.titulo}_{curso.periodo}
              </Link>
              <p className="text-sm text-zinc-500">
                {curso.lecciones.length} lección(es)
              </p>
            </div>
            <div className="flex gap-3">
              <BotonEditar
                url={`/api/cursos/${curso.id}`}
                titulo="Editar curso"
                campos={[
                  { key: "linea", label: "Línea (ej. CON)" },
                  { key: "titulo", label: "Título" },
                  { key: "nivel", label: "Nivel", type: "select", opciones: ["FUN", "INT", "AVA"] },
                  { key: "periodo", label: "Periodo (ej. 2026-2)" },
                ]}
                valores={{ linea: curso.linea, titulo: curso.titulo, nivel: curso.nivel, periodo: curso.periodo }}
              />
              <BotonEliminar
                url={`/api/cursos/${curso.id}`}
                mensaje={`¿Eliminar el curso "${curso.titulo}"? Se borrarán también todas sus lecciones, diapositivas y capas. Esta acción no se puede deshacer.`}
              />
            </div>
          </li>
        ))}
        {cursos.length === 0 && (
          <p className="text-zinc-500">Aún no hay cursos creados.</p>
        )}
      </ul>
    </div>
  );
}
