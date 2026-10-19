"use client";

import { Campo } from "@/lib/types";

export default function DynField({
  campo,
  value,
  onChange,
}: {
  campo: Campo;
  value: string;
  onChange: (value: string) => void;
}) {
  const label = (
    <label className="text-xs font-medium text-zinc-600">{campo.label}</label>
  );

  if (campo.type === "largo") {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>
    );
  }

  if (campo.type === "numero") {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>
    );
  }

  if (campo.type === "imagen") {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <input
          type="text"
          placeholder="[Insertar captura de pantalla real de: ...]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>
    );
  }

  if (campo.type === "lista") {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">Selecciona...</option>
          {(campo.opciones || []).map((op) => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
      </div>
    );
  }

  // "corto" por defecto
  return (
    <div className="flex flex-col gap-1">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      />
    </div>
  );
}