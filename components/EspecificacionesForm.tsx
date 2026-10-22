"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FuenteVista = {
  id: string;
  titulo: string;
  consultable: boolean;
  motivo: string; // "" si es consultable
};

export default function EspecificacionesForm({
  leccionId,
  numInicial,
  notasIniciales,
  asignadasIniciales,
  fuentes,
}: {
  leccionId: string;
  numInicial: number | null;
  notasIniciales: string;
  asignadasIniciales: string[];
  fuentes: FuenteVista[];
}) {
  const router = useRouter();
  const [num, setNum] = useState(numInicial === null ? "" : String(numInicial));
  const [notas, setNotas] = useState(notasIniciales);
  const [sel, setSel] = useState<Set<string>>(new Set(asignadasIniciales));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  function alternar(id: string) {
    setSel((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  function asignarTodas() {
    setSel(new Set([...sel, ...fuentes.filter((f) => f.consultable).map((f) => f.id)]));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setMensaje("");

    const res = await fetch(`/api/lecciones/${leccionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numDiapositivas: num.trim() === "" ? null : Number(num),
        notas,
        fuentesIds: [...sel],
      }),
    });

    setGuardando(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMensaje(data.error ?? "No se pudo guardar");
      return;
    }

    setMensaje("Guardado");
    router.refresh();
  }

  const campo = "border rounded px-3 py-2 text-sm w-full";

  return (
    <form onSubmit={guardar} className="space-y-6">
      <div className="space-y-1">
        <label className="text-sm font-medium">Número de diapositivas (confirmado por ti)</label>
        <input
          type="number"
          min={1}
          max={100}
          value={num}
          onChange={(e) => setNum(e.target.value)}
          className={campo + " max-w-[10rem]"}
        />
        <p className="text-xs text-zinc-500">
          Déjalo vacío si todavía no lo defines. Si lo llenas, queda confirmado y se anota en la bitácora.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Fuentes de esta lección</label>
          <button type="button" onClick={asignarTodas} className="text-xs underline">
            Asignar todas las consultables
          </button>
        </div>
        {fuentes.length === 0 && (
          <p className="text-sm text-zinc-500">El curso aún no tiene fuentes. Agrégalas en la pantalla de Fuentes.</p>
        )}
        <ul className="space-y-1">
          {fuentes.map((f) => (
            <li key={f.id}>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sel.has(f.id)}
                  disabled={!f.consultable && !sel.has(f.id)}
                  onChange={() => alternar(f.id)}
                  className="mt-1"
                />
                <span>
                  {f.titulo}
                  {!f.consultable && <span className="text-xs text-amber-700"> — {f.motivo}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Notas para esta lección</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="Enfoque, qué enfatizar, qué evitar, nivel de detalle, ejemplos que sí o no deben usarse..."
          className={campo}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={guardando}
          className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar especificaciones"}
        </button>
        {mensaje && <span className="text-sm text-zinc-600">{mensaje}</span>}
      </div>
    </form>
  );
}
