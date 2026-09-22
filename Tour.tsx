import { useState } from "react";
import { Button, Dialog } from "./ui";

const KEY = "dembele-tour-done"; // volontairement sans préfixe "dembele:" : ce n'est pas une donnée personnelle

const STEPS = [
  { title: "Un chapitre = un sujet", text: "Crée un chapitre pour chaque leçon. Ton prof se souvient de tout ce que tu as vu, même d'un chapitre à l'autre." },
  { title: "Pose ta question comme tu veux", text: "Tape ton exercice ou prends-le en photo. Tu peux aussi demander une figure : « Trace un triangle ABC rectangle en A »." },
  { title: "Apprends à ton rythme", text: "Chaque explication se termine par un résumé, les points à retenir et un exercice pour t'entraîner." },
];

export function Tour() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== "1";
    } catch {
      return false;
    }
  });
  const [i, setI] = useState(0);

  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const step = STEPS[i]!;
  const last = i === STEPS.length - 1;
  return (
    <Dialog open={open} onClose={close} title={step.title}>
      <p className="mb-6 text-muted-fg">{step.text}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-fg">
          {i + 1} sur {STEPS.length}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={close}>
            Passer
          </Button>
          <Button onClick={() => (last ? close() : setI(i + 1))}>{last ? "C'est parti" : "Suivant"}</Button>
        </div>
      </div>
    </Dialog>
  );
}
