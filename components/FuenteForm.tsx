"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIPOS_FUENTE } from "@/lib/kickoff";

export default function FuenteForm({ cursoId }: { cursoId: string }) {
  const router = useRouter();
  const [tipo, setTipo] = useState("link");
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [origen, setOrigen] = useState("usuario");
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const res = await fetch("/api/fuentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cursoId, tipo, titulo, url, descripcion, origen }),
    });
    setGuardando(false);
    if (!res.ok) {
      window.alert("No se pudo guardar la fuente.");
      return;
    }
    setTitulo("");
    setUrl("");
    setDescripcion("");
    router.refresh();
  }

  const campo = "border rounded px-2 py-1 text-sm";

  return (
    <form onSubmit={enviar} className="border rounded-lg p-4 bg-zinc-50 space-y-2">
      <div className="flex flex-wrap gap-2">
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>
          {TIPOS_FUENTE.map((t) => (
            <option key={t.valor} value={t.valor}>{t.label}</option>
          ))}
        </select>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título de la fuente"
          className={`${campo} flex-1`}
          required
        />
        <select value={origen} onChange={(e) => setOrigen(e.target.value)} className={campo}>
          <option value="usuario">Aportada por mí</option>
          <option value="sugerida">Sugerida (pendiente de aprobación)</option>
        </select>
      </div>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="URL o ubicación (link, ruta en Drive, etc.)"
        className={`${campo} w-full`}
      />
      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Descripción: qué contiene y para qué lecciones sirve"
        rows={2}
        className={`${campo} w-full`}
      />
      <button type="submit" disabled={guardando} className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50">
        {guardando ? "Guardando..." : "Agregar fuente"}
      </button>
    </form>
  );
}
