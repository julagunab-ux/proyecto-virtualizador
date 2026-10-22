import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { aplicaEjemplo, etiqueta, OPC_EJEMPLO, normalizarEjemplo } from "@/lib/kickoff";
import { esConsultable, verificarLeccion } from "@/lib/preparacion";
import EspecificacionesForm from "@/components/EspecificacionesForm";

export const dynamic = "force-dynamic";

export default async function EspecificacionesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const leccion = await prisma.leccion.findUnique({
    where: { id },
    include: {
      curso: { include: { fuentes: { orderBy: { createdAt: "asc" } } } },
      _count: { select: { diapositivas: true } },
    },
  });
  if (!leccion) notFound();

  const curso = leccion.curso;

  const estado = verificarLeccion(
    curso,
    {
      objetivo: leccion.objetivo,
      duracion: leccion.duracion,
      usaEjemplo: leccion.usaEjemplo,
      numDiapositivas: leccion.numDiapositivas,
      fuentesIds: leccion.fuentesIds,
      cantidadDiapositivasExistentes: leccion._count.diapositivas,
    },
    curso.fuentes
  );

  const fuentesVista = curso.fuentes.map((f) => ({
    id: f.id,
    titulo: f.titulo,
    consultable: esConsultable(f),
    motivo: !f.aprobada ? "sin aprobar" : f.estadoIndexado !== "indexada" ? `no indexada (${f.estadoIndexado})` : "",
  }));

  const llevaEjemplo = aplicaEjemplo(curso.ejemploIntegrador, leccion.usaEjemplo);

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <Link href={`/lecciones/${leccion.id}`} className="text-sm text-zinc-500">
        &larr; Lección {leccion.numero}: {leccion.titulo}
      </Link>

      <h1 className="text-2xl font-semibold mt-2 mb-1">Especificaciones de la lección</h1>
      <p className="text-sm text-zinc-600 mb-6">
        Lo que se usará al generar esta lección con IA. Nada se genera desde esta pantalla.
      </p>

      <div className="border rounded p-3 mb-6 text-sm space-y-1">
        <p><span className="font-medium">Objetivo:</span> {leccion.objetivo || "sin definir"}</p>
        <p><span className="font-medium">Duración estimada:</span> {leccion.duracion || "sin definir"}</p>
        <p>
          <span className="font-medium">Ejemplo integrador:</span>{" "}
          {llevaEjemplo
            ? `sí (${etiqueta(OPC_EJEMPLO, normalizarEjemplo(curso.ejemploIntegrador))})`
            : "no aplica a esta lección"}
        </p>
        <p className="text-xs text-zinc-500">
          Para cambiar objetivo, duración o ejemplo integrador, usa el botón Editar de la lección.
        </p>
      </div>

      <h2 className="text-sm font-semibold mb-2">
        Verificación de insumos —{" "}
        <span className={estado.listo ? "text-green-700" : "text-red-700"}>
          {estado.listo ? "lista para generar" : "faltan requisitos"}
        </span>
      </h2>
      <ul className="mb-8 space-y-1">
        {estado.verificaciones.map((v, i) => (
          <li key={i} className="text-sm flex gap-2">
            <span className={v.ok ? "text-green-700" : v.nivel === "bloqueo" ? "text-red-700" : "text-amber-700"}>
              {v.ok ? "✓" : v.nivel === "bloqueo" ? "✕" : "!"}
            </span>
            <span className={v.ok ? "text-zinc-600" : ""}>
              {v.texto}
              {!v.ok && <span className="text-xs text-zinc-500"> ({v.nivel === "bloqueo" ? "bloquea la generación" : "aviso"})</span>}
            </span>
          </li>
        ))}
      </ul>

      <EspecificacionesForm
        leccionId={leccion.id}
        numInicial={leccion.numDiapositivas}
        notasIniciales={leccion.notas}
        asignadasIniciales={leccion.fuentesIds}
        fuentes={fuentesVista}
      />
    </div>
  );
}
