import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  disabled?: boolean;
  onPick: (text: string) => void;
}

const chip = "shrink-0 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold hover:bg-muted disabled:opacity-50";

export function QuickActions({ disabled, onPick }: Props) {
  const [levels, setLevels] = useState(false);
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2" role="group" aria-label="Actions rapides">
      <button className={chip} disabled={disabled} onClick={() => onPick("Explique-moi le cours : ")}>
        Expliquer un cours
      </button>
      <button className={cn(chip, levels && "bg-muted")} disabled={disabled} aria-expanded={levels} onClick={() => setLevels((v) => !v)}>
        Générer des exercices
      </button>
      {levels &&
        (["facile", "moyen", "expert"] as const).map((lvl) => (
          <button
            key={lvl}
            className={chip}
            disabled={disabled}
            onClick={() => {
              onPick(`Génère-moi 3 exercices de niveau ${lvl} sur : `);
              setLevels(false);
            }}
          >
            {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
          </button>
        ))}
      <button className={chip} disabled={disabled} onClick={() => onPick("Corrige mon exercice point par point : ")}>
        Corriger mon exercice
      </button>
      <button className={chip} disabled={disabled} onClick={() => onPick("Trace une figure : ")}>
        📐 Tracer une figure
      </button>
    </div>
  );
}
