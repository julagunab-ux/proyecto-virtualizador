import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FuenteForm from "@/components/FuenteForm";
import BotonEliminar from "@/components/BotonEliminar";
import BotonEditar from "@/components/BotonEditar";
import BotonAccion from "@/components/BotonAccion";
import IndexarFuente from "@/components/IndexarFuente";
import { TIPOS_FUENTE, OPC_FUENTES, etiqueta } from "@/lib/kickoff";

export const dynamic = "force-dynamic";

export default async function FuentesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const curso = await prisma.curso.findUnique({
    where: { id },
    include: { fuentes: { orderBy: { createdAt: "desc" } } },
  });

  if (!curso) notFound();

  const pendientes = curso.fuentes.filter((f) => !f.aprobada).length;

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <Link href={`/cursos/${curso.id}`} className="text-sm text-zinc-500">
        &larr; {curso.titulo}
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1">Fuentes del curso</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Estado declarado en el inicio: {etiqueta(OPC_FUENTES, curso.fuentesEstado)}.
        {pendientes > 0 && ` Hay ${pendientes} fuente(s) sugerida(s) pendiente(s) de tu aprobación; no se guionizan con base en ellas hasta aprobarlas.`}
      </p>

      <FuenteForm cursoId={curso.id} />

      <ul className="mt-8 space-y-3">
        {curso.fuentes.map((f) => (
          <li key={f.id} className="border rounded-lg p-4 flex justify-between items-start gap-3">
            <div className="space-y-1">
              <p className="font-medium">
                {f.url.startsWith("http") ? (
                  <a href={f.url} target="_blank" rel="noreferrer" className="underline">
                    {f.titulo}
                  </a>
                ) : (
                  f.titulo
                )}
              </p>
              <p className="text-xs text-zinc-500">
                {etiqueta(TIPOS_FUENTE, f.tipo)} · {f.origen === "sugerida" ? "Sugerida" : "Aportada por ti"} ·{" "}
                {f.aprobada ? "Aprobada" : "Pendiente de aprobación"} · Consultada el{" "}
                {f.fechaConsulta.toLocaleDateString("es-CO")}
              </p>
              {f.url && !f.url.startsWith("http") && <p className="text-xs text-zinc-500">Ubicación: {f.url}</p>}
              {f.descripcion && <p className="text-sm">{f.descripcion}</p>}
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
            </div>
            <div className="flex flex-col items-end gap-1">
              {!f.aprobada && (
                <BotonAccion url={`/api/fuentes/${f.id}`} body={{ aprobada: true }} texto="Aprobar" />
              )}
              <BotonAccion
                url={`/api/fuentes/${f.id}`}
                body={{ marcarConsultada: true }}
                texto="Marcar consultada hoy"
              />
              <BotonEditar
                url={`/api/fuentes/${f.id}`}
                titulo="Editar fuente"
                campos={[
                  { key: "tipo", label: "Tipo", type: "select", opciones: TIPOS_FUENTE },
                  { key: "titulo", label: "Título" },
                  { key: "url", label: "URL o ubicación", opcional: true },
                  { key: "descripcion", label: "Descripción", type: "largo", opcional: true },
                ]}
                valores={{ tipo: f.tipo, titulo: f.titulo, url: f.url, descripcion: f.descripcion }}
              />
              <BotonEliminar
                url={`/api/fuentes/${f.id}`}
                mensaje={`¿Eliminar la fuente "${f.titulo}"?`}
              />
            </div>
          </li>
        ))}
        {curso.fuentes.length === 0 && (
          <p className="text-zinc-500">Aún no hay fuentes registradas.</p>
        )}
      </ul>
    </div>
  );
}
