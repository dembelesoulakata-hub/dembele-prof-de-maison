import { z } from "zod";

const schema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .url()
    .refine(
      (u) => u.startsWith("https://") || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(u),
      "L'URL Supabase doit être en https (http accepté seulement en local).",
    ),
  VITE_SUPABASE_ANON_KEY: z.string().min(20, "Clé anon manquante."),
});

const parsed = schema.safeParse(import.meta.env);
if (!parsed.success) {
  throw new Error("Configuration invalide : vérifie VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env");
}

export const env = {
  SUPABASE_URL: parsed.data.VITE_SUPABASE_URL.replace(/\/$/, ""),
  SUPABASE_ANON_KEY: parsed.data.VITE_SUPABASE_ANON_KEY,
};
