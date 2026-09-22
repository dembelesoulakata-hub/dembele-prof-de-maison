// Suggestions de chapitres par classe / niveau. À ajuster avec le programme officiel du pays.
export interface Suggestion {
  subject: "Maths" | "Physique" | "Chimie";
  title: string;
}

export const SUGGESTIONS: Record<string, Suggestion[]> = {
  "6e": [
    { subject: "Maths", title: "Les nombres décimaux et les fractions" },
    { subject: "Maths", title: "Les angles et la symétrie" },
    { subject: "Physique", title: "Les états de la matière" },
  ],
  "5e": [
    { subject: "Maths", title: "Les nombres relatifs" },
    { subject: "Maths", title: "Les triangles et leurs propriétés" },
    { subject: "Physique", title: "Les mélanges et leur séparation" },
  ],
  "4e": [
    { subject: "Maths", title: "Le théorème de Pythagore" },
    { subject: "Maths", title: "Le calcul littéral" },
    { subject: "Physique", title: "Le courant électrique et les circuits" },
  ],
  "3e": [
    { subject: "Maths", title: "Le théorème de Thalès" },
    { subject: "Maths", title: "Les systèmes d'équations" },
    { subject: "Physique", title: "La loi d'Ohm" },
  ],
  "2nde": [
    { subject: "Maths", title: "Les vecteurs du plan" },
    { subject: "Maths", title: "Les fonctions affines et les fonctions de référence" },
    { subject: "Chimie", title: "La mole et la concentration" },
  ],
  "1ère": [
    { subject: "Maths", title: "La dérivation" },
    { subject: "Maths", title: "Les suites numériques" },
    { subject: "Physique", title: "La cinématique du point" },
  ],
  Terminale: [
    { subject: "Maths", title: "Limites et continuité" },
    { subject: "Maths", title: "Le calcul intégral" },
    { subject: "Chimie", title: "Les acides et les bases" },
  ],
  L1: [
    { subject: "Maths", title: "Suites et séries numériques" },
    { subject: "Maths", title: "Algèbre linéaire : espaces vectoriels" },
    { subject: "Physique", title: "Mécanique du point matériel" },
  ],
  L2: [
    { subject: "Maths", title: "Intégrales multiples" },
    { subject: "Maths", title: "Réduction des endomorphismes" },
    { subject: "Physique", title: "Thermodynamique" },
  ],
  L3: [
    { subject: "Maths", title: "Équations différentielles" },
    { subject: "Maths", title: "Probabilités et statistiques" },
    { subject: "Chimie", title: "Cinétique chimique" },
  ],
};
