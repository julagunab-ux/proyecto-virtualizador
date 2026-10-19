"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CrearDiapositivaForm({ leccionId, siguienteNumero }: { leccionId: string; siguienteNumero: number }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [numero, setNumero] = useState(siguienteNumero);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/diapositivas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leccionId, numero: Number(numero), titulo }),
    });
    setLoading(false);
    setTitulo("");
    setNumero(numero + 1);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 border rounded-lg p-4 bg-zinc-50">
      <input type="number" value={numero} onChange={(e) => setNumero(Number(e.target.value))} className="border rounded px-2 py-1 text-sm w-20" />
      <input placeholder="Título de la diapositiva" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" required />
      <button type="submit" disabled={loading} className="bg-black text-white rounded px-3 py-1 text-sm">
        {loading ? "Creando..." : "Agregar diapositiva"}
      </button>
    </form>
  );
}