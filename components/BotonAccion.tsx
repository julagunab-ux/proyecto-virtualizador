"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BotonAccion({
  url,
  method = "PATCH",
  body,
  texto,
  confirmar,
  estilo = "link",
}: {
  url: string;
  method?: "PATCH" | "POST" | "DELETE";
  body?: Record<string, unknown>;
  texto: string;
  confirmar?: string;
  estilo?: "link" | "boton";
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);

  async function click(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (confirmar && !window.confirm(confirmar)) return;

    setOcupado(true);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setOcupado(false);

    if (!res.ok) {
      window.alert("No se pudo completar la acción. Intenta de nuevo.");
      return;
    }
    router.refresh();
  }

  const clase =
    estilo === "boton"
      ? "text-xs bg-black text-white rounded px-3 py-1.5 disabled:opacity-50 whitespace-nowrap"
      : "text-xs text-emerald-700 hover:underline disabled:opacity-50 whitespace-nowrap";

  return (
    <button onClick={click} disabled={ocupado} className={clase}>
      {ocupado ? "..." : texto}
    </button>
  );
}
