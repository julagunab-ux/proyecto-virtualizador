"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DecisionForm({
  cursoId,
  lecciones,
}: {
  cursoId: string;
  lecciones: string[];
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [leccionRef, setLeccionRef] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const res = await fetch("/api/decisiones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cursoId, texto, leccionRef, tipo: "nota" }),
    });
    setGuardando(false);
    if (!res.ok) {
      window.alert("No se pudo guardar la nota.");
      return;
    }
    setTexto("");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="border rounded-lg p-4 bg-zinc-50 space-y-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Decisión o cambio de criterio (ej. En la Lección 3 Uifcito sí será protagonista)"
        rows={2}
        className="border rounded px-2 py-1 text-sm w-full"
        required
      />
      <div className="flex gap-2 items-center">
        <select
          value={leccionRef}
          onChange={(e) => setLeccionRef(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">Aplica a todo el curso</option>
          {lecciones.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <button type="submit" disabled={guardando} className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50">
          {guardando ? "Guardando..." : "Agregar a la bitácora"}
        </button>
      </div>
    </form>
  );
}
