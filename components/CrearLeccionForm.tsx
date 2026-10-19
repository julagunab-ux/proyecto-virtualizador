"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CrearLeccionForm({
  cursoId,
  siguienteNumero,
}: {
  cursoId: string;
  siguienteNumero: number;
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [numero, setNumero] = useState(siguienteNumero);
  const [objetivo, setObjetivo] = useState("");
  const [duracion, setDuracion] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/lecciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cursoId, numero: Number(numero), titulo, objetivo, duracion }),
    });
    setLoading(false);
    setTitulo("");
    setObjetivo("");
    setDuracion("");
    setNumero(numero + 1);
    router.refresh();
  }

  const campo = "border rounded px-2 py-1 text-sm";

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-zinc-50 space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          value={numero}
          onChange={(e) => setNumero(Number(e.target.value))}
          className={`${campo} w-20`}
        />
        <input
          placeholder="Título de la lección"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={`${campo} flex-1`}
          required
        />
        <input
          placeholder="Duración (ej. 2 h)"
          value={duracion}
          onChange={(e) => setDuracion(e.target.value)}
          className={`${campo} w-36`}
        />
      </div>
      <input
        placeholder="Objetivo de la lección"
        value={objetivo}
        onChange={(e) => setObjetivo(e.target.value)}
        className={`${campo} w-full`}
      />
      <button type="submit" disabled={loading} className="bg-black text-white rounded px-3 py-1 text-sm">
        {loading ? "Creando..." : "Agregar lección"}
      </button>
    </form>
  );
}
