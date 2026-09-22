import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Chat } from "@/types/db";
import { cn } from "@/lib/utils";
import { Button } from "../ui";

interface Props {
  chats: Chat[];
  activeId: string | undefined;
  disabled: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function ChatSidebar({ chats, activeId, disabled, onSelect, onNew, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function commit(id: string) {
    const t = draft.trim();
    if (t) onRename(id, t);
    setEditing(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button variant="accent" className="w-full" disabled={disabled} onClick={onNew}>
          <Plus className="h-4 w-4" aria-hidden /> Nouveau chapitre
        </Button>
      </div>
      <nav aria-label="Tes chapitres" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {chats.length === 0 && <p className="px-3 py-4 text-sm text-muted-fg">Aucun chapitre pour l'instant. Crée le premier !</p>}
        <ul className="space-y-1">
          {chats.map((c) => (
            <li key={c.id}>
              {editing === c.id ? (
                <div className="flex items-center gap-1 rounded-xl bg-muted p-1.5">
                  <input
                    autoFocus
                    value={draft}
                    maxLength={120}
                    aria-label="Titre du chapitre"
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commit(c.id);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2 py-1"
                  />
                  <button aria-label="Enregistrer le titre" onClick={() => commit(c.id)} className="rounded-lg p-1.5 hover:bg-card">
                    <Check className="h-4 w-4" />
                  </button>
                  <button aria-label="Annuler" onClick={() => setEditing(null)} className="rounded-lg p-1.5 hover:bg-card">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className={cn("group flex items-center rounded-xl", c.id === activeId ? "bg-muted" : "hover:bg-muted/60")}>
                  <button disabled={disabled} onClick={() => onSelect(c.id)} aria-current={c.id === activeId ? "page" : undefined} className="min-w-0 flex-1 px-3 py-2.5 text-left">
                    <span className="block text-xs font-semibold text-muted-fg">Chapitre {c.chapter_number}</span>
                    <span className="block truncate font-semibold">{c.title}</span>
                  </button>
                  <button
                    aria-label={`Renommer le chapitre ${c.chapter_number}`}
                    disabled={disabled}
                    onClick={() => {
                      setDraft(c.title);
                      setEditing(c.id);
                    }}
                    className="rounded-lg p-2 text-muted-fg hover:text-foreground disabled:opacity-40"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={`Supprimer le chapitre ${c.chapter_number}`}
                    disabled={disabled}
                    onClick={() => onDelete(c.id)}
                    className="mr-1 rounded-lg p-2 text-muted-fg hover:text-destructive disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
