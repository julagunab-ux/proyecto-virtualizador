"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Opcion = string | { valor: string; label: string };

export type CampoEditable = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "largo";
  opciones?: Opcion[];
  opcional?: boolean;
};

function valorOpcion(o: Opcion) {
  return typeof o === "string" ? o : o.valor;
}
function labelOpcion(o: Opcion) {
  return typeof o === "string" ? o : o.label;
}

export default function BotonEditar({
  url,
  titulo,
  campos,
  valores,
  ayuda,
  texto = "Editar",
}: {
  url: string;
  titulo: string;
  campos: CampoEditable[];
  valores: Record<string, string | number>;
  ayuda?: string;
  texto?: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<Record<string, string | number>>(valores);
  const [guardando, setGuardando] = useState(false);

  function abrir(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setForm(valores);
    setAbierto(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);

    const body: Record<string, string | number> = {};
    for (const c of campos) {
      const v = form[c.key];
      body[c.key] = c.type === "number" ? Number(v) : String(v ?? "");
    }

    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setGuardando(false);

    if (!res.ok) {
      window.alert("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    setAbierto(false);
    router.refresh();
  }

  const claseCampo = "border rounded px-2 py-1 text-sm";

  return (
    <>
      <button
        onClick={abrir}
        className="text-xs text-blue-600 hover:underline whitespace-nowrap"
      >
        {texto}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setAbierto(false)}
        >
          <form
            onSubmit={guardar}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg p-5 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3 shadow-lg"
          >
            <h2 className="text-lg font-semibold">{titulo}</h2>

            {campos.map((c) => (
              <div key={c.key} className="flex flex-col gap-1">
                <label className="text-sm font-medium">{c.label}</label>
                {c.type === "select" ? (
                  <select
                    value={String(form[c.key] ?? "")}
                    onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                    className={claseCampo}
                  >
                    {(c.opciones || []).map((op) => (
                      <option key={valorOpcion(op)} value={valorOpcion(op)}>
                        {labelOpcion(op)}
                      </option>
                    ))}
                  </select>
                ) : c.type === "largo" ? (
                  <textarea
                    value={String(form[c.key] ?? "")}
                    onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                    rows={5}
                    className={claseCampo}
                    required={!c.opcional}
                  />
                ) : (
                  <input
                    type={c.type === "number" ? "number" : "text"}
                    value={form[c.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                    className={claseCampo}
                    required={!c.opcional}
                  />
                )}
              </div>
            ))}

            {ayuda && <p className="text-xs text-zinc-500">{ayuda}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-sm border rounded px-3 py-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="text-sm bg-black text-white rounded px-3 py-1 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
