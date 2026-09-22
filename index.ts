// Edge Function « chat » : SEUL point d'entrée vers l'IA.
// La clé API ne quitte jamais le serveur. Chaque appel est authentifié, validé,
// limité en débit, contrôlé (emploi du temps) puis diffusé en streaming.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { z } from "npm:zod@3.23.8";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { corsHeaders } from "../_shared/cors.ts";
import { AiError, streamClaude, type ContentBlock, type Turn } from "./anthropic.ts";
import { memoryFromRows, updateMemory } from "./memory.ts";
import { buildSystemPrompt } from "./prompt.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_BODY_BYTES = 16_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/webp"];
const MAX_ACTIVE = 40; // contre-pression : au-delà, le client patiente et réessaie
let active = 0;

const Body = z.object({
  chat_id: z.string().uuid(),
  message: z.string().trim().min(1, "empty").max(4000),
  image_path: z.string().max(200).optional(),
});

const encoder = new TextEncoder();
const sse = (c: ReadableStreamDefaultController<Uint8Array>, o: unknown) =>
  c.enqueue(encoder.encode(`data: ${JSON.stringify(o)}\n\n`));

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"));
  const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, ...extra, "content-type": "application/json", "cache-control": "no-store" },
    });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  // 1. Authentification + email vérifié
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });
  const userClient = createClient(URL_, ANON, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json(401, { error: "unauthorized" });
  if (!user.email_confirmed_at) return json(403, { error: "email_not_verified" });

  // 2. Validation stricte de l'entrée (taille, forme, chemin d'image)
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: "payload_too_large" });
  let parsedBody: z.infer<typeof Body>;
  try {
    const r = Body.safeParse(JSON.parse(raw));
    if (!r.success) return json(400, { error: "invalid_request" });
    parsedBody = r.data;
  } catch {
    return json(400, { error: "invalid_request" });
  }
  const { chat_id, message, image_path } = parsedBody;
  if (image_path && !new RegExp(`^${user.id}/[A-Za-z0-9._-]{1,120}$`).test(image_path)) {
    return json(400, { error: "invalid_image" });
  }

  const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // 3. Blocage horaire appliqué AUSSI côté serveur (contourner l'écran ne sert à rien)
  const { data: block } = await userClient.rpc("get_block_status");
  const status = Array.isArray(block) ? block[0] : block;
  if (status?.blocked) return json(403, { error: "blocked", until_hour: status.until_hour });

  // 4. Limitation de débit par utilisateur
  for (const [bucket, limit, windowSec] of [
    ["chat_min", 6, 60],
    ["chat_day", 200, 86_400],
  ] as const) {
    const { data: rl } = await admin.rpc("check_rate_limit", {
      p_user: user.id,
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSec,
    });
    const row = Array.isArray(rl) ? rl[0] : rl;
    if (row && !row.allowed) {
      return json(429, { error: "rate_limited", retry_after: row.retry_after }, {
        "retry-after": String(row.retry_after),
      });
    }
  }

  // 5. Contre-pression simple (file d'attente côté client)
  if (active >= MAX_ACTIVE) return json(503, { error: "busy" }, { "retry-after": "3" });

  // 6. Le chat appartient bien à l'utilisateur (la RLS filtre, on vérifie)
  const { data: chat } = await userClient.from("chats").select("id,title").eq("id", chat_id).maybeSingle();
  if (!chat) return json(404, { error: "chat_not_found" });

  const [{ data: profile }, { data: memRows }, { data: history }] = await Promise.all([
    userClient.from("profiles").select("prenom,statut,classe,serie,niveau,filiere,pays").maybeSingle(),
    userClient.from("memory").select("key,value"),
    userClient
      .from("messages")
      .select("role,content")
      .eq("chat_id", chat_id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (!profile) return json(403, { error: "profile_required" });
  const memory = memoryFromRows(memRows);

  // 7. Image éventuelle : lue depuis le stockage privé (la RLS Storage protège l'accès)
  const userBlocks: ContentBlock[] = [];
  if (image_path) {
    const { data: file } = await userClient.storage.from("exercises").download(image_path);
    if (!file || file.size > MAX_IMAGE_BYTES || !ALLOWED_IMAGES.includes(file.type)) {
      return json(400, { error: "invalid_image" });
    }
    userBlocks.push({
      type: "image",
      source: { type: "base64", media_type: file.type, data: encodeBase64(new Uint8Array(await file.arrayBuffer())) },
    });
  }
  userBlocks.push({ type: "text", text: message });

  const turns: Turn[] = [
    ...(history ?? []).reverse().map((m): Turn => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: userBlocks },
  ];
  const system = buildSystemPrompt(profile, memory);

  // 8. Appel du modèle : on lit le premier morceau AVANT de répondre,
  //    pour pouvoir renvoyer une vraie erreur (avec « Réessayer ») si l'API IA est en panne.
  const startedAt = new Date();
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 120_000);
  active++;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    clearTimeout(timer);
    active = Math.max(0, active - 1);
  };

  const iterator = streamClaude({ system, messages: turns, signal: abort.signal })[Symbol.asyncIterator]();
  let first: IteratorResult<string>;
  try {
    first = await iterator.next();
  } catch (e) {
    release();
    console.error("ai_start_failed", e instanceof AiError ? e.status : "unknown");
    return json(502, { error: "ai_unavailable" });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        if (!first.done) {
          full += first.value;
          sse(controller, { t: first.value });
          while (true) {
            const n = await iterator.next();
            if (n.done) break;
            full += n.value;
            sse(controller, { t: n.value });
          }
        }
      } catch {
        release();
        sse(controller, { error: "ai_interrupted" });
        controller.close();
        return;
      }
      release();

      if (!full.trim()) {
        sse(controller, { error: "ai_empty" });
        controller.close();
        return;
      }

      // Sauvegarde du message de l'élève ET de la réponse (jamais de doublon en cas de « Réessayer »)
      const { data: saved, error: saveErr } = await admin
        .from("messages")
        .insert([
          { chat_id, user_id: user.id, role: "user", content: message, image_path: image_path ?? null, created_at: startedAt.toISOString() },
          { chat_id, user_id: user.id, role: "assistant", content: full },
        ])
        .select("id,role");
      if (saveErr) console.error("save_failed", saveErr.code);
      const assistantId = saved?.find((m) => m.role === "assistant")?.id ?? null;

      if (chat.title === "Nouveau chapitre") {
        await admin.from("chats").update({ title: message.slice(0, 60) }).eq("id", chat_id);
      }
      sse(controller, { done: true, message_id: assistantId });
      controller.close();

      // Mise à jour de la mémoire globale en arrière-plan
      EdgeRuntime.waitUntil(updateMemory(admin, user.id, memory, message, full));
    },
    cancel() {
      abort.abort();
      release();
    },
  });

  return new Response(stream, {
    headers: {
      ...cors,
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
});
