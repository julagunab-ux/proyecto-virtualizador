"use client";

import { useState } from "react";
import type { RespuestaBusqueda } from "@/lib/busqueda";

export default function BusquedaFuentes({ cursoId }: { cursoId: string }) {
  const [consulta, setConsulta] = useState("");
  const [k, setK] = useState(6);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [respuesta, setRespuesta] = useState<RespuestaBusqueda | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!consulta.trim()) return;
    setCargando(true);
    setError("");
    setRespuesta(null);

    try {
      const res = await fetch("/api/busqueda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursoId, consulta, k }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Error en la búsqueda");
      else setRespuesta(data);
    } catch {
      setError("No se pudo conectar con el servidor");
    }
    setCargando(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={buscar} className="space-y-3">
        <textarea
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Escribe una pregunta o un tema, por ejemplo: ¿Cómo se registra una factura de venta?"
          className="border rounded px-3 py-2 text-sm w-full"
        />
        <div className="flex items-center gap-3">
          <label className="text-sm">
            Resultados:{" "}
            <select value={k} onChange={(e) => setK(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
              {[3, 6, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={cargando || !consulta.trim()}
            className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {cargando ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {respuesta?.aviso && <p className="text-sm text-amber-700">{respuesta.aviso}</p>}

      {respuesta && !respuesta.aviso && (
        <p className="text-xs text-zinc-500">
          Se consultaron {respuesta.fuentesConsultadas} fuente(s) aprobada(s). {respuesta.resultados.length} resultado(s).
        </p>
      )}

      <ul className="space-y-3">
        {respuesta?.resultados.map((r) => (
          <li key={r.id} className="border rounded p-3">
            <div className="flex justify-between gap-3 text-xs text-zinc-500 mb-1">
              <span>
                {r.titulo}
                {r.pagina !== undefined && ` — pág. ${r.pagina}`}
              </span>
              <span>similitud {r.puntaje.toFixed(2)}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{r.texto}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
