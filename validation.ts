import { z } from "zod";

export const CLASSES = ["6e", "5e", "4e", "3e", "2nde", "1ère", "Terminale"] as const;
export const LYCEE = ["2nde", "1ère", "Terminale"] as const;
export const SERIES = ["A", "C", "D", "E", "F", "G"] as const;
export const NIVEAUX = ["L1", "L2", "L3"] as const;
export const STATUTS = ["Élève", "Étudiant en Licence"] as const;
export const SUBJECTS = ["Maths", "Physique", "Chimie", "SVT", "Français", "Anglais", "Histoire-Géo", "EPS", "Autre"] as const;

const nameField = z.string().trim().min(1, "Ce champ est obligatoire.").max(60, "60 caractères maximum.");

export const profileSchema = z
  .object({
    nom: nameField,
    prenom: nameField,
    statut: z.enum(STATUTS),
    pays: z.string().regex(/^[A-Z]{2}$/, "Choisis un pays."),
    classe: z.enum(CLASSES).nullable(),
    serie: z.enum(SERIES).nullable(),
    niveau: z.enum(NIVEAUX).nullable(),
    filiere: z.string().trim().max(80, "80 caractères maximum.").nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.statut === "Élève") {
      if (!v.classe) ctx.addIssue({ code: "custom", path: ["classe"], message: "Choisis ta classe." });
      else if ((LYCEE as readonly string[]).includes(v.classe) && !v.serie)
        ctx.addIssue({ code: "custom", path: ["serie"], message: "Choisis ta série." });
    } else {
      if (!v.niveau) ctx.addIssue({ code: "custom", path: ["niveau"], message: "Choisis ton niveau." });
      if (!v.filiere) ctx.addIssue({ code: "custom", path: ["filiere"], message: "Indique ta filière." });
    }
  });

export type ProfileInput = z.infer<typeof profileSchema>;

/** Remet à null les champs qui ne concernent pas le statut choisi. */
export function normalizeProfile(v: ProfileInput): ProfileInput {
  if (v.statut === "Élève") {
    const lycee = v.classe ? (LYCEE as readonly string[]).includes(v.classe) : false;
    return { ...v, niveau: null, filiere: null, serie: lycee ? v.serie : null };
  }
  return { ...v, classe: null, serie: null };
}

export const emailSchema = z.string().trim().toLowerCase().email("Adresse email invalide.").max(254);

// Supabase (bcrypt) ne lit que les 72 premiers octets du mot de passe.
export const passwordSchema = z
  .string()
  .min(10, "10 caractères minimum.")
  .max(72, "72 caractères maximum.")
  .regex(/[a-z]/, "Ajoute une minuscule.")
  .regex(/[A-Z]/, "Ajoute une majuscule.")
  .regex(/\d/, "Ajoute un chiffre.");

export const signupSchema = z
  .object({ email: emailSchema, password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Les mots de passe ne correspondent pas." });

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Saisis ton mot de passe.").max(72) });
