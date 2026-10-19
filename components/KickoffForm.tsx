"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LINEAS, NIVELES, OPC_EJEMPLO, OPC_FUENTES } from "@/lib/kickoff";

export default function KickoffForm() {
  const router = useRouter();
  const [lineaSel, setLineaSel] = useState(LINEAS[0].codigo);
  const [lineaOtra, setLineaOtra] = useState("");
  const [titulo, setTitulo] = useState("");
  const [nivel, setNivel] = useState("FUN");
  const [periodo, setPeriodo] = useState("2026-2");
  const [ejemploIntegrador, setEjemploIntegrador] = useState("no");
  const [ejemploDesc, setEjemploDesc] = useState("");
  const [duracionObjetivo, setDuracionObjetivo] = useState("2 h de parte práctica");
  const [fuentesEstado, setFuentesEstado] = useState("pendiente");
  const [temario, setTemario] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);

    const linea = lineaSel === "OTRA" ? lineaOtra.trim().toUpperCase() : lineaSel;

    const res = await fetch("/api/cursos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        linea,
        titulo: titulo.trim(),
        nivel,
        periodo: periodo.trim(),
        ejemploIntegrador,
        ejemploDesc: ejemploIntegrador === "no" ? "" : ejemploDesc,
        duracionObjetivo,
        fuentesEstado,
        temario,
      }),
    });

    setEnviando(false);

    if (!res.ok) {
      window.alert("No se pudo crear el curso. Revisa los campos.");
      return;
    }

    const curso = await res.json();
    router.push(fuentesEstado === "pendiente" ? `/cursos/${curso.id}` : `/cursos/${curso.id}/fuentes`);
  }

  const campo = "border rounded px-3 py-2 text-sm w-full";
  const etiqueta = "text-sm font-medium";

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div className="space-y-1">
        <label className={etiqueta}>1. Línea del curso</label>
        <select value={lineaSel} onChange={(e) => setLineaSel(e.target.value)} className={campo}>
          {LINEAS.map((l) => (
            <option key={l.codigo} value={l.codigo}>
              {l.codigo} — {l.nombre}
            </option>
          ))}
          <option value="OTRA">Otra (definir código nuevo)</option>
        </select>
        {lineaSel === "OTRA" && (
          <input
            value={lineaOtra}
            onChange={(e) => setLineaOtra(e.target.value)}
            placeholder="Código corto de 3 letras, ej. ADM"
            maxLength={5}
            className={campo}
            required
          />
        )}
      </div>

      <div className="space-y-1">
        <label className={etiqueta}>2. Título del curso (se usa tal cual en la nomenclatura de archivos)</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} required />
      </div>

      <div className="space-y-1">
        <label className={etiqueta}>3. Fuentes del contenido</label>
        <select value={fuentesEstado} onChange={(e) => setFuentesEstado(e.target.value)} className={campo}>
          {OPC_FUENTES.map((o) => (
            <option key={o.valor} value={o.valor}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className={etiqueta}>4. ¿El curso tendrá un ejemplo integrador?</label>
        <select value={ejemploIntegrador} onChange={(e) => setEjemploIntegrador(e.target.value)} className={campo}>
          {OPC_EJEMPLO.map((o) => (
            <option key={o.valor} value={o.valor}>{o.label}</option>
          ))}
        </select>
        {ejemploIntegrador !== "no" && (
          <textarea
            value={ejemploDesc}
            onChange={(e) => setEjemploDesc(e.target.value)}
            placeholder={
              ejemploIntegrador === "curso"
                ? "Describe el caso (empresa, dataset, problema) que se desarrollará a lo largo del curso"
                : "Describe el caso. Las lecciones donde aparece se marcan después, en el botón Editar de cada lección"
            }
            rows={2}
            className={campo}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className={etiqueta}>5. Nivel</label>
          <select value={nivel} onChange={(e) => setNivel(e.target.value)} className={campo}>
            {NIVELES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className={etiqueta}>6. Periodo / cohorte (Año-Semestre)</label>
          <input value={periodo} onChange={(e) => setPeriodo(e.target.value)} className={campo} required />
        </div>
      </div>

      <div className="space-y-1">
        <label className={etiqueta}>Duración objetivo por lección (se confirma aquí, no se asume)</label>
        <input value={duracionObjetivo} onChange={(e) => setDuracionObjetivo(e.target.value)} className={campo} />
      </div>

      <div className="space-y-1">
        <label className={etiqueta}>Temario (pégalo tal cual; es la base para proponer la arquitectura)</label>
        <textarea value={temario} onChange={(e) => setTemario(e.target.value)} rows={8} className={campo} />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
      >
        {enviando ? "Creando..." : "Crear curso"}
      </button>
    </form>
  );
}
