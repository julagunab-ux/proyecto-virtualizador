const URL_OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";

export type MensajeIA = { role: "system" | "user" | "assistant"; content: string };

export type Intento = {
  modelo: string;
  llave: number; // 1, 2, 3... (nunca se expone la llave en sí)
  estado: number | "error";
  detalle?: string;
};

export type ResultadoIA = {
  texto: string;
  modelo: string; // el modelo que realmente respondió
  intentos: Intento[];
};

export class ErrorIA extends Error {
  intentos: Intento[];
  constructor(mensaje: string, intentos: Intento[]) {
    super(mensaje);
    this.name = "ErrorIA";
    this.intentos = intentos;
  }
}

function lista(valor: string | undefined) {
  return (valor ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function configIA() {
  return {
    llaves: lista(process.env.OPENROUTER_API_KEYS),
    modelos: lista(process.env.AI_MODELS),
  };
}

export async function llamarIA(
  mensajes: MensajeIA[],
  opciones: { temperatura?: number; maxTokens?: number; modelos?: string[] } = {}
): Promise<ResultadoIA> {
  const { llaves, modelos: modelosPorDefecto } = configIA();
  const modelos = opciones.modelos ?? modelosPorDefecto;

  if (llaves.length === 0) throw new Error("Falta OPENROUTER_API_KEYS en .env.local");
  if (modelos.length === 0) throw new Error("Falta AI_MODELS en .env.local");

  const intentos: Intento[] = [];

  for (const modelo of modelos) {
    for (let i = 0; i < llaves.length; i++) {
      const control = new AbortController();
      const temporizador = setTimeout(() => control.abort(), 90_000);

      try {
        const res = await fetch(URL_OPENROUTER, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${llaves[i]}`,
            "Content-Type": "application/json",
            "X-Title": "Virtualizacion Produccion",
          },
          body: JSON.stringify({
            model: modelo,
            messages: mensajes,
            temperature: opciones.temperatura ?? 0.4,
            max_tokens: opciones.maxTokens ?? 2000,
          }),
          signal: control.signal,
        });

        if (res.ok) {
          const data = await res.json();
          const texto = data?.choices?.[0]?.message?.content;
          if (typeof texto === "string" && texto.trim()) {
            intentos.push({ modelo, llave: i + 1, estado: res.status });
            return { texto, modelo: data.model ?? modelo, intentos };
          }
          intentos.push({ modelo, llave: i + 1, estado: res.status, detalle: "respuesta vacía" });
          break; // siguiente modelo
        }

        const detalle = (await res.text()).slice(0, 200);
        intentos.push({ modelo, llave: i + 1, estado: res.status, detalle });

        // Problema de la llave (sin crédito, inválida o con límite): probar la siguiente llave
        if (res.status === 401 || res.status === 402 || res.status === 429) continue;

        // Problema del modelo: pasar al siguiente modelo
        break;
      } catch (e) {
        intentos.push({
          modelo,
          llave: i + 1,
          estado: "error",
          detalle: e instanceof Error ? e.message : String(e),
        });
        break;
      } finally {
        clearTimeout(temporizador);
      }
    }
  }

  throw new ErrorIA("Ningún modelo respondió", intentos);
}
