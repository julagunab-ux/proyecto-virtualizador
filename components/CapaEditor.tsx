"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CapaData, InteraccionCatalogoData, ItemData } from "@/lib/types";
import Repeater from "./Repeater";
import BotonEliminar from "./BotonEliminar";

export default function CapaEditor({ id }: { id: string }) {
  const router = useRouter();
  const [capa, setCapa] = useState<CapaData | null>(null);
  const [catalogo, setCatalogo] = useState<InteraccionCatalogoData | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Carga inicial: la capa (con items) + su definición de interacción
  useEffect(() => {
    async function cargar() {
      const resCapa = await fetch(`/api/capas/${id}`);
      const dataCapa: CapaData = await resCapa.json();
      setCapa(dataCapa);

      const resCat = await fetch(`/api/interacciones`);
      const todas: InteraccionCatalogoData[] = await resCat.json();
      const encontrada = todas.find((c) => c.nombre === dataCapa.interaccion) || null;
      setCatalogo(encontrada);
    }
    cargar();
  }, [id]);

  // Autosave con debounce de los campos simples de la capa
  const guardarCapa = useCallback(
    async (cambios: Partial<CapaData>) => {
      setGuardando(true);
      await fetch(`/api/capas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      setGuardando(false);
    },
    [id]
  );

  function actualizarCampo<K extends keyof CapaData>(campo: K, valor: CapaData[K]) {
    if (!capa) return;
    const actualizada = { ...capa, [campo]: valor };
    setCapa(actualizada);

    // debounce simple de 600ms por campo
    const timeoutId = setTimeout(() => guardarCapa({ [campo]: valor }), 600);
    return () => clearTimeout(timeoutId);
  }

  async function agregarItem(kind: string) {
    if (!capa) return;
    const orden = capa.items.filter((i) => i.kind === kind).length + 1;

    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        capaId: capa.id,
        kind,
        orden,
        datos: {},
        tieneImagen: false,
        imagenDesc: "",
        tieneAudio: false,
        audioTexto: "",
      }),
    });
    const nuevo: ItemData = await res.json();
    setCapa({ ...capa, items: [...capa.items, nuevo] });
  }

  async function actualizarItem(item: ItemData) {
    if (!capa) return;
    setCapa({
      ...capa,
      items: capa.items.map((i) => (i.id === item.id ? item : i)),
    });
    await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
  }

  async function eliminarItem(itemId: string) {
    if (!capa) return;
    setCapa({ ...capa, items: capa.items.filter((i) => i.id !== itemId) });
    await fetch(`/api/items/${itemId}`, { method: "DELETE" });
  }

  function validar(): string[] {
    if (!capa || !catalogo) return ["Cargando..."];
    const problemas: string[] = [];

    if (!capa.explicacion.trim()) problemas.push("Falta la explicación general.");
    if (!capa.visual.trim()) problemas.push("Falta el campo Visual.");
    if (!capa.audio.trim()) problemas.push("Falta el guion de Audio.");

    for (const config of catalogo.campos) {
      const propios = capa.items.filter((i) => i.kind === config.kind);
      if (config.repeatable && propios.length === 0) {
        problemas.push(`Debes agregar al menos un(a) ${config.itemLabel.toLowerCase()}.`);
      }
    }

    // Cruce elementos ↔ categorías (clasificación / matriz comparativa)
    const kinds = catalogo.campos.map((c) => c.kind);
    if (kinds.includes("elementos") && kinds.includes("categorias")) {
      const categorias = capa.items
        .filter((i) => i.kind === "categorias")
        .map((i) => i.datos["nombre"] || i.datos["texto"] || "");
      const elementos = capa.items.filter((i) => i.kind === "elementos");
      for (const el of elementos) {
        const categoriaAsignada = el.datos["categoria"];
        if (!categoriaAsignada) {
          problemas.push(`El elemento #${el.orden} no tiene categoría asignada.`);
        } else if (!categorias.includes(categoriaAsignada)) {
          problemas.push(
            `El elemento #${el.orden} está asignado a una categoría que no existe: "${categoriaAsignada}".`
          );
        }
      }
    }

    return problemas;
  }

  async function aprobar() {
    const problemas = validar();
    setErrores(problemas);
    if (problemas.length > 0) return;

    await guardarCapa({ estado: "aprobada" });
    setCapa((prev) => (prev ? { ...prev, estado: "aprobada" } : prev));
  }

  if (!capa || !catalogo) {
    return <div className="max-w-3xl mx-auto py-16 px-6">Cargando capa...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-16 px-6 space-y-6">
      <button onClick={() => router.back()} className="text-sm text-zinc-500">
        &larr; Volver
      </button>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          Capa {capa.numero} — {capa.interaccion}
        </h1>
        <span
          className={`text-xs px-2 py-1 rounded ${
            capa.estado === "aprobada" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {capa.estado}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Explicación general</label>
          <textarea
            value={capa.explicacion}
            onChange={(e) => actualizarCampo("explicacion", e.target.value)}
            rows={3}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Visual</label>
          <textarea
            value={capa.visual}
            onChange={(e) => actualizarCampo("visual", e.target.value)}
            rows={3}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Audio (guion de locución)</label>
          <textarea
            value={capa.audio}
            onChange={(e) => actualizarCampo("audio", e.target.value)}
            rows={4}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Duración estimada</label>
            <input
              type="text"
              value={capa.duracion}
              onChange={(e) => actualizarCampo("duracion", e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium">Nombre de archivo de audio</label>
            <input
              type="text"
              value={capa.nombreArchivo}
              onChange={(e) => actualizarCampo("nombreArchivo", e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {catalogo.campos.map((config) => (
        <Repeater
          key={config.kind || "default"}
          config={config}
          items={capa.items}
          onAdd={() => agregarItem(config.kind)}
          onChangeItem={actualizarItem}
          onDeleteItem={eliminarItem}
        />
      ))}

      {errores.length > 0 && (
        <div className="border border-red-300 bg-red-50 rounded-lg p-3">
          <p className="text-sm font-semibold text-red-700 mb-1">Falta completar:</p>
          <ul className="list-disc list-inside text-sm text-red-700">
            {errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={aprobar}
          className="bg-black text-white rounded px-4 py-2 text-sm"
        >
          Aprobar capa
        </button>
        {guardando && <span className="text-xs text-zinc-400">Guardando...</span>}
        <div className="flex-1" />
        <BotonEliminar
          url={`/api/capas/${capa.id}`}
          mensaje={`¿Eliminar la capa ${capa.numero}? Esta acción no se puede deshacer.`}
          redirigirA={`/diapositivas/${capa.diapositivaId}`}
          texto="Eliminar capa"
        />
      </div>
    </div>
  );
}