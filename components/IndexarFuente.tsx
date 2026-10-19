"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Sin indexar",
  indexando: "Indexando...",
  indexada: "Indexada",
  error: "Error al indexar",
};

export default function IndexarFuente({
  fuenteId,
  tieneLink,
  estado,
  fragmentos,
  textoChars,
  indexadoDesde,
  indexadoEn,
  errorIndexado,
}: {
  fuenteId: string;
  tieneLink: boolean;
  estado: string;
  fragmentos: number;
  textoChars: number;
  indexadoDesde: string;
  indexadoEn: string;
  errorIndexado: string;
}) {
  const router = useRouter();
  const archivoRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  async function enviar(datos: FormData) {
    setOcupado(true);
    setMensaje(null);
    try {
      const res = await fetch(`/api/fuentes/${fuenteId}/indexar`, { method: "POST", body: datos });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMensaje({ ok: false, texto: json.error ?? "No se pudo indexar." });
      } else {
        setMensaje({ ok: true, texto: `Listo: ${json.fragmentos} fragmentos indexados.` });
        setTexto("");
        if (archivoRef.current) archivoRef.current.value = "";
      }
    } catch {
      setMensaje({ ok: false, texto: "Error de conexión. Intenta de nuevo." });
    } finally {
      setOcupado(false);
      router.refresh();
    }
  }

  function desdeLink() {
    enviar(new FormData());
  }

  function desdeArchivo() {
    const archivo = archivoRef.current?.files?.[0];
    if (!archivo) {
      setMensaje({ ok: false, texto: "Elige un archivo primero." });
      return;
    }
    const datos = new FormData();
    datos.append("archivo", archivo);
    enviar(datos);
  }

  function desdeTexto() {
    if (!texto.trim()) {
      setMensaje({ ok: false, texto: "Pega el texto primero." });
      return;
    }
    const datos = new FormData();
    datos.append("texto", texto);
    enviar(datos);
  }

  const boton = "text-xs bg-black text-white rounded px-3 py-1 disabled:opacity-50 whitespace-nowrap";

  return (
    <div className="mt-2 text-xs space-y-1">
      <p className={estado === "error" ? "text-red-600" : "text-zinc-600"}>
        {ETIQUETA_ESTADO[estado] ?? estado}
        {estado === "indexada" &&
          ` — ${fragmentos} fragmentos, ${textoChars.toLocaleString("es-CO")} caracteres (desde ${indexadoDesde}${
            indexadoEn ? `, ${indexadoEn}` : ""
          })`}
        {estado === "error" && errorIndexado && `: ${errorIndexado}`}
      </p>

      <details>
        <summary className="cursor-pointer text-blue-600">
          {estado === "indexada" ? "Reindexar" : "Indexar contenido"}
        </summary>

        <div className="mt-2 space-y-3 border rounded p-3 bg-zinc-50">
          {tieneLink && (
            <div>
              <button onClick={desdeLink} disabled={ocupado} className={boton}>
                Indexar desde el link
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input ref={archivoRef} type="file" accept=".pdf,.txt,.md" className="text-xs" />
            <button onClick={desdeArchivo} disabled={ocupado} className={boton}>
              Indexar archivo
            </button>
          </div>
          <p className="text-zinc-500">PDF, TXT o MD de hasta 4 MB. Los PDF escaneados (solo imagen) no tienen texto.</p>

          <div className="space-y-1">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O pega aquí el texto de la fuente"
              rows={4}
              className="border rounded px-2 py-1 w-full text-xs"
            />
            <button onClick={desdeTexto} disabled={ocupado} className={boton}>
              Indexar texto pegado
            </button>
          </div>

          {ocupado && <p className="text-zinc-600">Indexando... puede tardar hasta un minuto.</p>}
          {mensaje && <p className={mensaje.ok ? "text-green-700" : "text-red-600"}>{mensaje.texto}</p>}
        </div>
      </details>
    </div>
  );
}
