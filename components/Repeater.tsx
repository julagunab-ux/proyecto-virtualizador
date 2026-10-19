"use client";

import { ItemData, RepeaterConfig } from "@/lib/types";
import ItemCard from "./ItemCard";

export default function Repeater({
  config,
  items,
  onAdd,
  onChangeItem,
  onDeleteItem,
}: {
  config: RepeaterConfig;
  items: ItemData[];
  onAdd: () => void;
  onChangeItem: (item: ItemData) => void;
  onDeleteItem: (id: string) => void;
}) {
  const propios = items
    .filter((i) => i.kind === config.kind)
    .sort((a, b) => a.orden - b.orden);

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-zinc-50">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">{config.itemLabel}s</h3>
        {config.repeatable && (
          <button onClick={onAdd} className="text-xs bg-black text-white rounded px-2 py-1">
            + Agregar {config.itemLabel.toLowerCase()}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {propios.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            config={config}
            onChange={onChangeItem}
            onDelete={() => onDeleteItem(item.id)}
          />
        ))}
        {propios.length === 0 && (
          <p className="text-xs text-zinc-400">Sin {config.itemLabel.toLowerCase()}s aún.</p>
        )}
      </div>
    </div>
  );
}