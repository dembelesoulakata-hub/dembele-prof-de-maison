import { env } from "./env";
import { supabase } from "./supabase";
import { sleep } from "./utils";

export type ChatErrorCode = "auth" | "blocked" | "rate_limited" | "ai_unavailable" | "interrupted" | "network" | "aborted";

export class ChatError extends Error {
  constructor(
    public code: ChatErrorCode,
    public detail?: number,
  ) {
    super(code);
  }
}

interface Params {
  chatId: string;
  message: string;
  imagePath?: string | null;
  onToken: (t: string) => void;
  signal: AbortSignal;
}

/** Appelle l'Edge Function et lit la réponse en streaming (SSE). Retourne l'id du message enregistré. */
export async function streamChat({ chatId, message, imagePath, onToken, signal }: Params): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ChatError("auth");

  let res: Response | null = null;
  // File d'attente côté client : si le serveur est saturé (503), on patiente puis on réessaie.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch(`${env.SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY },
        body: JSON.stringify({ chat_id: chatId, message, ...(imagePath ? { image_path: imagePath } : {}) }),
      });
    } catch (e) {
      if (signal.aborted) throw new ChatError("aborted");
      throw new ChatError("network");
    }
    if (res.status !== 503) break;
    await sleep(1500 * (attempt + 1));
  }
  if (!res) throw new ChatError("network");

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      const body = (await res.json().catch(() => ({}))) as { error?: string; until_hour?: number };
      if (body.error === "blocked") throw new ChatError("blocked", body.until_hour);
      throw new ChatError("auth");
    }
    if (res.status === 429) throw new ChatError("rate_limited", Number(res.headers.get("retry-after") ?? 30));
    throw new ChatError("ai_unavailable");
  }
  if (!res.body) throw new ChatError("ai_unavailable");

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  let messageId: string | null = null;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      let idx: number;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const block = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        if (!block.startsWith("data: ")) continue;
        try {
          const ev = JSON.parse(block.slice(6)) as { t?: string; done?: boolean; message_id?: string | null; error?: string };
          if (ev.error) throw new ChatError("interrupted");
          if (ev.t) onToken(ev.t);
          if (ev.done) messageId = ev.message_id ?? null;
        } catch (e) {
          if (e instanceof ChatError) throw e;
        }
      }
    }
  } catch (e) {
    if (e instanceof ChatError) throw e;
    if (signal.aborted) throw new ChatError("aborted");
    throw new ChatError("interrupted");
  }
  return messageId;
}

export function chatErrorMessage(e: unknown): string {
  if (!(e instanceof ChatError)) return "Quelque chose s'est mal passé. Tu peux réessayer.";
  switch (e.code) {
    case "blocked":
      return e.detail ? `Tu es en cours jusqu'à ${e.detail}h. Reviens après !` : "Tu es en cours. Reviens après !";
    case "rate_limited":
      return `Tu vas un peu vite ! Attends ${e.detail ?? 30} secondes, puis réessaie.`;
    case "auth":
      return "Ta session a expiré. Reconnecte-toi pour continuer.";
    case "network":
      return "Pas de connexion. Vérifie ton réseau et réessaie.";
    case "interrupted":
      return "La réponse s'est interrompue en route. Réessaie.";
    default:
      return "Le professeur est momentanément indisponible. Réessaie dans un instant.";
  }
}
