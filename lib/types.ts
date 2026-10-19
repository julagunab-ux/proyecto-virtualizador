export type TipoCampo = "corto" | "largo" | "numero" | "imagen" | "lista";

export interface Campo {
  key: string;
  label: string;
  type: TipoCampo;
  opciones?: string[]; // solo para type "lista"
}

export interface RepeaterConfig {
  kind: string;        // "" si la interacción solo tiene un repeater
  itemLabel: string;   // ej. "Tarjeta", "Elemento", "Categoría"
  repeatable: boolean;
  fields: Campo[];
  audioCtx: string;    // texto guía para el audio de cada ítem
}

export interface ItemData {
  id: string;
  kind: string;
  orden: number;
  datos: Record<string, string>;
  tieneImagen: boolean;
  imagenDesc: string;
  tieneAudio: boolean;
  audioTexto: string;
}

export interface TriggerData {
  tipo: string;
  detalle: string;
}

export interface CapaData {
  id: string;
  numero: string;
  estado: string;
  explicacion: string;
  visual: string;
  interaccion: string;
  audio: string;
  duracion: string;
  nombreArchivo: string;
  diapositivaId: string;
  triggers: TriggerData[];
  extra: Record<string, unknown>;
  items: ItemData[];
}

export interface InteraccionCatalogoData {
  id: string;
  nombre: string;
  tipo: string;
  itemLabel: string;
  repeatable: boolean;
  campos: RepeaterConfig[];
  audioCtx: string;
}