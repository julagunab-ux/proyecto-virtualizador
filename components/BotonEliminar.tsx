"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BotonEliminar({
  url,
  mensaje,
  redirigirA,
  texto = "Eliminar",
}: {
  url: string;
  mensaje: string;
  redirigirA?: string;
  texto?: string;
}) {
  const router = useRouter();
  const [eliminando, setEliminando] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(mensaje)) return;

    setEliminando(true);
    const res = await fetch(url, { method: "DELETE" });
    setEliminando(false);

    if (!res.ok) {
      window.alert("No se pudo eliminar. Intenta de nuevo.");
      return;
    }

    if (redirigirA) {
      router.push(redirigirA);
    } else {
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={eliminando}
      className="text-xs text-red-600 hover:underline disabled:opacity-50 whitespace-nowrap"
    >
      {eliminando ? "Eliminando..." : texto}
    </button>
  );
}
