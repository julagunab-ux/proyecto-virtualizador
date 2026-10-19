import Link from "next/link";
import KickoffForm from "@/components/KickoffForm";

export default function NuevoCursoPage() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-6">
      <Link href="/" className="text-sm text-zinc-500">&larr; Cursos</Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1">Nuevo curso</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Cuestionario de inicio. Las respuestas quedan guardadas en la ficha del curso y en la bitácora.
      </p>
      <KickoffForm />
    </div>
  );
}
