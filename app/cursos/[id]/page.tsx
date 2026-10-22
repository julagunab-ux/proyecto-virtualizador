import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CrearLeccionForm from "@/components/CrearLeccionForm";
import BotonEliminar from "@/components/BotonEliminar";
import BotonEditar from "@/components/BotonEditar";
import BotonAccion from "@/components/BotonAccion";
import {
  NIVELES,
  OPC_EJEMPLO,
  OPC_FUENTES,
  OPC_HERRAMIENTA,
  etiqueta,
  normalizarEjemplo,
  aplicaEjemplo,
} from "@/lib/kickoff";
import { verificarLeccion } from "@/lib/preparacion";

export const dynamic = "force-dynamic";

export default async function CursoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const curso = await prisma.curso.findUnique({
    where: { id },
    include: {
      lecciones: { orderBy: { numero: "asc" }, include: { diapositivas: true } },
      fuentes: { select: { id: true, aprobada: true, estadoIndexado: true } },
      _count: { select: { fuentes: true, decisiones: true } },
    },
  });

  if (!curso) notFound();

  const campoFicha = "text-sm";
  const modoEjemplo = normalizarEjemplo(curso.ejemploIntegrador);

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <Link href="/" className="text-sm text-zinc-500">&larr; Cursos</Link>

      <div className="flex justify-between items-start mt-2 mb-2 gap-3">
        <h1 className="text-2xl font-semibold">
          {curso.linea}_{curso.nivel}_{curso.titulo}_{curso.periodo}
        </h1>
        <div className="flex gap-3">
          <BotonEditar
            url={`/api/cursos/${curso.id}`}
            titulo="Editar ficha del curso"
            texto="Editar ficha"
            campos={[
              { key: "linea", label: "Línea (ej. CON)" },
              { key: "titulo", label: "Título" },
              { key: "nivel", label: "Nivel", type: "select", opciones: NIVELES },
              { key: "periodo", label: "Periodo (ej. 2026-2)" },
              { key: "ejemploIntegrador", label: "Ejemplo integrador", type: "select", opciones: OPC_EJEMPLO },
              { key: "ejemploDesc", label: "Descripción del ejemplo integrador", type: "largo", opcional: true },
              { key: "duracionObjetivo", label: "Duración objetivo por lección", opcional: true },
              { key: "fuentesEstado", label: "Estado de las fuentes", type: "select", opciones: OPC_FUENTES },
              { key: "herramienta", label: "Herramienta de destino", type: "select", opciones: OPC_HERRAMIENTA },
              { key: "temario", label: "Temario", type: "largo", opcional: true },
            ]}
            valores={{
              linea: curso.linea,
              titulo: curso.titulo,
              nivel: curso.nivel,
              periodo: curso.periodo,
              ejemploIntegrador: normalizarEjemplo(curso.ejemploIntegrador),
              ejemploDesc: curso.ejemploDesc,
              duracionObjetivo: curso.duracionObjetivo,
              fuentesEstado: curso.fuentesEstado,
              herramienta: curso.herramienta,
              temario: curso.temario,
            }}
          />
          <BotonEliminar
            url={`/api/cursos/${curso.id}`}
            mensaje={`¿Eliminar el curso "${curso.titulo}"? Se borrarán también sus lecciones, diapositivas, capas, fuentes y bitácora. Esta acción no se puede deshacer.`}
            redirigirA="/"
            texto="Eliminar curso"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <a
          href={`/api/export/${curso.id}/excel`}
          className="text-xs bg-emerald-600 text-white rounded px-3 py-1.5 hover:bg-emerald-700"
        >
          Exportar a Excel
        </a>
        <a
          href={`/api/export/${curso.id}/word`}
          className="text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700"
        >
          Exportar a Word
        </a>
        <Link
          href={`/cursos/${curso.id}/fuentes`}
          className="text-xs border rounded px-3 py-1.5 hover:bg-zinc-50"
        >
          Fuentes ({curso._count.fuentes})
        </Link>
        <Link
          href={`/cursos/${curso.id}/bitacora`}
          className="text-xs border rounded px-3 py-1.5 hover:bg-zinc-50"
        >
          Bitácora ({curso._count.decisiones})
        </Link>
        <Link
          href={`/cursos/${curso.id}/busqueda`}
          className="text-xs border rounded px-3 py-1.5 hover:bg-zinc-50"
        >
          Probar búsqueda
        </Link>
      </div>

      <div className="border rounded-lg p-4 mb-8 space-y-1">
        <h2 className="text-sm font-semibold mb-2">Ficha del curso</h2>
        <p className={campoFicha}>
          <span className="font-medium">Ejemplo integrador:</span>{" "}
          {etiqueta(OPC_EJEMPLO, normalizarEjemplo(curso.ejemploIntegrador))}
          {curso.ejemploDesc && ` — ${curso.ejemploDesc}`}
        </p>
        <p className={campoFicha}>
          <span className="font-medium">Duración objetivo por lección:</span>{" "}
          {curso.duracionObjetivo || "sin definir"}
        </p>
        <p className={campoFicha}>
          <span className="font-medium">Fuentes:</span> {etiqueta(OPC_FUENTES, curso.fuentesEstado)}
        </p>
        <p className={campoFicha}>
          <span className="font-medium">Herramienta de destino:</span>{" "}
          {etiqueta(OPC_HERRAMIENTA, curso.herramienta)}
        </p>
        {curso.temario && (
          <details className="pt-1">
            <summary className="text-sm font-medium cursor-pointer">Temario</summary>
            <p className="text-sm whitespace-pre-wrap mt-1">{curso.temario}</p>
          </details>
        )}
      </div>

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Arquitectura del curso</h2>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2 py-1 rounded ${
              curso.arquitecturaAprobada ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {curso.arquitecturaAprobada ? "Aprobada" : "Pendiente de aprobación"}
          </span>
          {curso.arquitecturaAprobada ? (
            <BotonAccion
              url={`/api/cursos/${curso.id}`}
              body={{ arquitecturaAprobada: false }}
              texto="Reabrir"
              confirmar="¿Reabrir la arquitectura para modificarla?"
            />
          ) : (
            <BotonAccion
              url={`/api/cursos/${curso.id}`}
              body={{ arquitecturaAprobada: true }}
              texto="Aprobar arquitectura"
              estilo="boton"
              confirmar="¿Aprobar la arquitectura? Después de aprobarla se guioniza lección por lección."
            />
          )}
        </div>
      </div>

      <CrearLeccionForm cursoId={curso.id} siguienteNumero={curso.lecciones.length + 1} />

      <ul className="mt-8 space-y-3">
        {curso.lecciones.map((leccion) => (
          <li key={leccion.id} className="border rounded-lg p-4 hover:bg-zinc-50 flex justify-between items-start gap-3">
            <div className="space-y-0.5">
              <Link href={`/lecciones/${leccion.id}`} className="font-medium">
                Lección {leccion.numero}: {leccion.titulo}
              </Link>
              {aplicaEjemplo(curso.ejemploIntegrador, leccion.usaEjemplo) && (
                <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5">
                  Ejemplo integrador
                </span>
              )}
              {leccion.objetivo && <p className="text-sm">{leccion.objetivo}</p>}
              <p className="text-sm text-zinc-500">
                {leccion.diapositivas.length} diapositiva(s)
                {leccion.duracion && ` · Duración estimada: ${leccion.duracion}`}
              </p>
              {(() => {
                const estado = verificarLeccion(
                  curso,
                  { ...leccion, cantidadDiapositivasExistentes: leccion.diapositivas.length },
                  curso.fuentes
                );
                return (
                  <Link
                    href={`/lecciones/${leccion.id}/especificaciones`}
                    className={`text-xs ${estado.listo ? "text-green-700" : "text-amber-700"}`}
                  >
                    {estado.listo ? "Lista para generar" : "Faltan requisitos para generar"}
                  </Link>
                );
              })()}
            </div>
            <div className="flex gap-3">
              <BotonEditar
                url={`/api/lecciones/${leccion.id}`}
                titulo="Editar lección"
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
              />
              <BotonEliminar
                url={`/api/lecciones/${leccion.id}`}
                mensaje={`¿Eliminar la lección "${leccion.titulo}"? Se borrarán también sus diapositivas y capas. Esta acción no se puede deshacer.`}
              />
            </div>
          </li>
        ))}
        {curso.lecciones.length === 0 && (
          <p className="text-zinc-500">Aún no hay lecciones en este curso.</p>
        )}
      </ul>
    </div>
  );
}
