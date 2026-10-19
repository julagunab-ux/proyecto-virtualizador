# Handoff para Claude Code — Fase D, Paso 2: cliente de IA con respaldo de modelos y llaves

Qué hace: una función `llamarIA()` que envía un chat a OpenRouter probando los modelos en orden (`AI_MODELS`). Si una llave falla por crédito o límite (401, 402, 429), prueba la siguiente llave. Si un modelo falla por otra causa (5xx, 404, respuesta vacía, timeout), pasa al siguiente modelo. Devuelve el texto, el modelo que realmente respondió y el registro de intentos.

Instrucción para Claude Code: crea los dos archivos de abajo. NO crees ni escribas llaves reales: yo las pongo a mano en `.env.local`. Verifica que `.env.local` esté ignorado por git (debe aparecer cubierto por `.gitignore`, normalmente `.env*`). Al final corre `npm run build`.

---

## Variables de entorno (las agrega la persona a mano en `.env.local`, en la raíz del proyecto)

```
OPENROUTER_API_KEYS=sk-or-v1-LLAVE1,sk-or-v1-LLAVE2,sk-or-v1-LLAVE3
AI_MODELS=anthropic/claude-sonnet-5.5,~openai/gpt-astra-latest,~openai/gpt-sol-latest,apodex/apodex-1.1-mini:free
```

- Las llaves van separadas por comas, sin espacios, en el orden en que se quieren probar.
- Los modelos van en el orden de respaldo. Los IDs se pueden cambiar sin tocar código.
- Nunca usar el prefijo `NEXT_PUBLIC_` en estas variables: quedarían expuestas en el navegador.

---

## `lib/ai.ts` (nuevo)
```ts
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
```

---

## `app/api/ia/prueba/route.ts` (nuevo)

Ruta solo para desarrollo: prueba cada modelo por separado con un mensaje mínimo, y luego la cadena completa de respaldo. Gasta tokens (muy pocos) y no existe en producción.

```ts
import { NextResponse } from "next/server";
import { llamarIA, configIA, ErrorIA } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible en producción" }, { status: 404 });
  }

  const { llaves, modelos } = configIA();
  const mensajes = [
    { role: "user" as const, content: "Responde únicamente con la palabra: OK" },
  ];

  const porModelo = [];
  for (const modelo of modelos) {
    try {
      const r = await llamarIA(mensajes, { modelos: [modelo], maxTokens: 20 });
      porModelo.push({ modelo, ok: true, respondio: r.modelo, respuesta: r.texto.trim(), intentos: r.intentos });
    } catch (e) {
      porModelo.push({
        modelo,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        intentos: e instanceof ErrorIA ? e.intentos : [],
      });
    }
  }

  let cadena;
  try {
    const r = await llamarIA(mensajes, { maxTokens: 20 });
    cadena = { ok: true, respondio: r.modelo, respuesta: r.texto.trim(), intentos: r.intentos };
  } catch (e) {
    cadena = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      intentos: e instanceof ErrorIA ? e.intentos : [],
    };
  }

  return NextResponse.json({
    llavesConfiguradas: llaves.length,
    modelosConfigurados: modelos.length,
    porModelo,
    cadena,
  });
}
```

---

## Cómo probarlo
1. Reinicia `npm run dev` (Next.js solo lee `.env.local` al arrancar).
2. Abre `http://localhost:3000/api/ia/prueba`.
3. Debes ver `llavesConfiguradas` y `modelosConfigurados` con los números correctos, `ok: true` en los modelos, y `cadena.ok: true`.
4. Si un modelo sale con `ok: false`, revisa su `intentos[].estado` y `detalle` (404 = el ID del modelo no existe; 402 = sin crédito en esa llave; 401 = llave inválida).
