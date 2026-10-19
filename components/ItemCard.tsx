"use client";

import { ItemData, RepeaterConfig } from "@/lib/types";
import DynField from "./DynField";

export default function ItemCard({
  item,
  config,
  onChange,
  onDelete,
}: {
  item: ItemData;
  config: RepeaterConfig;
  onChange: (item: ItemData) => void;
  onDelete: () => void;
}) {
  function setDato(key: string, value: string) {
    onChange({ ...item, datos: { ...item.datos, [key]: value } });
  }

  return (
    <div className="border rounded-lg p-3 bg-white space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-zinc-500">
          {config.itemLabel} #{item.orden}
        </span>
        <button onClick={onDelete} className="text-xs text-red-600 hover:underline">
          Eliminar
        </button>
      </div>

      {config.fields.map((campo) => (
        <DynField
          key={campo.key}
          campo={campo}
          value={item.datos[campo.key] || ""}
          onChange={(v) => setDato(campo.key, v)}
        />
      ))}

      <div className="flex items-center gap-2 pt-1">
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={item.tieneImagen}
            onChange={(e) => onChange({ ...item, tieneImagen: e.target.checked })}
          />
          Tiene imagen
        </label>
        {item.tieneImagen && (
          <input
            type="text"
            placeholder="Descripción de la imagen"
            value={item.imagenDesc}
            onChange={(e) => onChange({ ...item, imagenDesc: e.target.value })}
            className="border rounded px-2 py-1 text-xs flex-1"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={item.tieneAudio}
            onChange={(e) => onChange({ ...item, tieneAudio: e.target.checked })}
          />
          Tiene audio
        </label>
        {item.tieneAudio && (
          <input
            type="text"
            placeholder={config.audioCtx || "Guion de audio para este ítem"}
            value={item.audioTexto}
            onChange={(e) => onChange({ ...item, audioTexto: e.target.value })}
            className="border rounded px-2 py-1 text-xs flex-1"
          />
        )}
      </div>
    </div>
  );
}