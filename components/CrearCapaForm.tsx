"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CrearCapaForm({
  diapositivaId,
  siguienteNumero,
  interacciones,
}: {
  diapositivaId: string;
  siguienteNumero: string;
  interacciones: string[];
}) {
  const router = useRouter();
  const [numero, setNumero] = useState(siguienteNumero);
  const [interaccion, setInteraccion] = useState(interacciones[0] || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/capas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diapositivaId, numero, interaccion }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 border rounded-lg p-4 bg-zinc-50">
      <input value={numero} onChange={(e) => setNumero(e.target.value)} className="border rounded px-2 py-1 text-sm w-20" />
      <select value={interaccion} onChange={(e) => setInteraccion(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1">
        {interacciones.map((nombre) => (
          <option key={nombre} value={nombre}>{nombre}</option>
        ))}
      </select>
      <button type="submit" disabled={loading} className="bg-black text-white rounded px-3 py-1 text-sm">
        {loading ? "Creando..." : "Agregar capa"}
      </button>
    </form>
  );
}