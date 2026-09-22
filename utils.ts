import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const formatHour = (h: number) => `${h}h`;

/** Date à partir de laquelle le profil pourra être modifié à nouveau (3 mois après la dernière modification). */
export function nextProfileChange(identityUpdatedAt: string): Date {
  const d = new Date(identityUpdatedAt);
  d.setMonth(d.getMonth() + 3);
  return d;
}

/** Transforme une erreur technique en message bienveillant. Aucun détail interne n'est affiché. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "";
  if (msg.includes("profil_verrouille")) return "Ton profil a déjà été modifié ce trimestre. Tu pourras le changer plus tard.";
  if (msg.includes("deja_valide")) return "Ton emploi du temps est déjà validé.";
  if (msg.includes("reserve_aux_eleves")) return "Cette fonction est réservée aux élèves.";
  if (msg.includes("trop_de_chapitres")) return "Tu as atteint la limite de chapitres. Supprime-en un ancien pour continuer.";
  if (/network|fetch|failed to fetch/i.test(msg)) return "Connexion impossible. Vérifie ton réseau et réessaie.";
  return "Quelque chose s'est mal passé. Réessaie dans un instant.";
}
