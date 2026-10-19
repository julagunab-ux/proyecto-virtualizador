"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CrearCursoForm() {
  const router = useRouter();
  const [linea, setLinea] = useState("");
  const [titulo, setTitulo] = useState("");
  const [nivel, setNivel] = useState("FUN");
  const [periodo, setPeriodo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/cursos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linea, titulo, nivel, periodo }),
    });
    setLoading(false);
    setLinea(""); setTitulo(""); setPeriodo("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 border rounded-lg p-4 bg-zinc-50">
      <input placeholder="Línea (ej. CON)" value={linea} onChange={(e) => setLinea(e.target.value)} className="border rounded px-2 py-1 text-sm" required />
      <input placeholder="Título del curso" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" required />
      <select value={nivel} onChange={(e) => setNivel(e.target.value)} className="border rounded px-2 py-1 text-sm">
        <option value="FUN">FUN</option>
        <option value="INT">INT</option>
        <option value="AVA">AVA</option>
      </select>
      <input placeholder="Periodo (ej. 2026-2)" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="border rounded px-2 py-1 text-sm" required />
      <button type="submit" disabled={loading} className="bg-black text-white rounded px-3 py-1 text-sm">
        {loading ? "Creando..." : "Crear curso"}
      </button>
    </form>
  );
}