import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CrearCapaForm from "@/components/CrearCapaForm";
import BotonEliminar from "@/components/BotonEliminar";
import BotonEditar from "@/components/BotonEditar";
import { filtroHerramienta } from "@/lib/kickoff";

export const dynamic = "force-dynamic";

export default async function DiapositivaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const diapositiva = await prisma.diapositiva.findUnique({
    where: { id },
    include: {
      leccion: { include: { curso: true } },
      capas: { orderBy: { numero: "asc" } },
    },
  });

  if (!diapositiva) notFound();

  const interacciones = await prisma.interaccionCatalogo.findMany({
    where: { tipo: "interaccion", ...(filtroHerramienta(diapositiva.leccion.curso.herramienta) ?? {}) },
    orderBy: { nombre: "asc" },
  });
  const nombresInteraccion = interacciones.map((i) => i.nombre);

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <Link href={`/lecciones/${diapositiva.leccionId}`} className="text-sm text-zinc-500">
        &larr; {diapositiva.leccion.titulo}
      </Link>

      <div className="flex justify-between items-start mt-2 mb-6 gap-3">
        <h1 className="text-2xl font-semibold">
          Diapositiva {diapositiva.numero}: {diapositiva.titulo}
        </h1>
        <div className="flex gap-3">
          <BotonEditar
            url={`/api/diapositivas/${diapositiva.id}`}
            titulo="Editar diapositiva"
            texto="Editar diapositiva"
            campos={[
              { key: "numero", label: "Número", type: "number" },
              { key: "titulo", label: "Título" },
            ]}
            valores={{ numero: diapositiva.numero, titulo: diapositiva.titulo }}
          />
          <BotonEliminar
            url={`/api/diapositivas/${diapositiva.id}`}
            mensaje={`¿Eliminar la diapositiva "${diapositiva.titulo}"? Se borrarán también sus capas. Esta acción no se puede deshacer.`}
            redirigirA={`/lecciones/${diapositiva.leccionId}`}
            texto="Eliminar diapositiva"
          />
        </div>
      </div>

      <CrearCapaForm
        diapositivaId={diapositiva.id}
        siguienteNumero={`${diapositiva.numero}.${diapositiva.capas.length + 1}`}
        interacciones={nombresInteraccion}
      />

      <ul className="mt-8 space-y-3">
        {diapositiva.capas.map((capa) => (
          <li key={capa.id} className="border rounded-lg p-4 hover:bg-zinc-50 flex justify-between items-start gap-3">
            <div>
              <Link href={`/capas/${capa.id}`} className="font-medium">
                Capa {capa.numero} — {capa.interaccion}
              </Link>
              <p className="text-sm text-zinc-500">Estado: {capa.estado}</p>
            </div>
            <div className="flex gap-3">
              <BotonEditar
                url={`/api/capas/${capa.id}`}
                titulo="Editar capa"
                campos={[
                  { key: "numero", label: "Número (ej. 3.2)" },
                  {
                    key: "interaccion",
                    label: "Interacción",
                    type: "select",
                    opciones: nombresInteraccion.includes(capa.interaccion)
                      ? nombresInteraccion
                      : [capa.interaccion, ...nombresInteraccion],
                  },
                ]}
                valores={{ numero: capa.numero, interaccion: capa.interaccion }}
                ayuda="Si cambias la interacción, los ítems ya creados no se borran, pero los de un tipo que la nueva interacción no use dejarán de mostrarse en el editor."
              />
              <BotonEliminar
                url={`/api/capas/${capa.id}`}
                mensaje={`¿Eliminar la capa ${capa.numero}? Esta acción no se puede deshacer.`}
              />
            </div>
          </li>
        ))}
        {diapositiva.capas.length === 0 && (
          <p className="text-zinc-500">Aún no hay capas en esta diapositiva.</p>
        )}
      </ul>
    </div>
  );
}
