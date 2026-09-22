const API = "https://api.anthropic.com/v1/messages";

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export interface Turn {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

export class AiError extends Error {
  constructor(public status: number) {
    super(`ai_error_${status}`);
  }
}

const headers = () => ({
  "content-type": "application/json",
  "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
  "anthropic-version": "2023-06-01",
});

/** Diffuse la réponse token par token. */
export async function* streamClaude(p: {
  system: string;
  messages: Turn[];
  signal: AbortSignal;
}): AsyncGenerator<string> {
  const res = await fetch(API, {
    method: "POST",
    headers: headers(),
    signal: p.signal,
    body: JSON.stringify({
      model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5",
      max_tokens: 3500,
      stream: true,
      system: p.system,
      messages: p.messages,
    }),
  });
  if (!res.ok || !res.body) throw new AiError(res.status);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of block.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        let ev: { type?: string; delta?: { type?: string; text?: string } };
        try {
          ev = JSON.parse(line.slice(6));
        } catch {
          continue;
        }
        if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) {
          yield ev.delta.text;
        } else if (ev.type === "error") {
          throw new AiError(500);
        }
      }
    }
  }
}

/** Appel simple (sans streaming), utilisé pour la mise à jour de la mémoire. */
export async function completeClaude(system: string, user: string, maxTokens = 800): Promise<string> {
  const res = await fetch(API, {
    method: "POST",
    headers: headers(),
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model: Deno.env.get("ANTHROPIC_MEMORY_MODEL") ?? "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new AiError(res.status);
  const data = await res.json();
  return (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
}
