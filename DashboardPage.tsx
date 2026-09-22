import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, BookOpen, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createChat, listChats } from "@/lib/api";
import { SUGGESTIONS } from "@/lib/curriculum";
import { cacheGet, cacheSet } from "@/lib/offlineCache";
import { friendlyError } from "@/lib/utils";
import type { Chat } from "@/types/db";
import { Button, Card } from "@/components/ui";
import { Tour } from "@/components/Tour";

export default function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[] | null>(() => cacheGet<Chat[]>("chats"));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listChats()
      .then((c) => {
        setChats(c);
        cacheSet("chats", c);
      })
      .catch(() => setChats((prev) => prev ?? []));
  }, []);

  if (!profile) return null;
  const key = profile.statut === "Élève" ? profile.classe : profile.niveau;
  const suggestions = key ? (SUGGESTIONS[key] ?? []) : [];
  const last = chats?.[0];

  async function start(prefill?: string) {
    setBusy(true);
    try {
      const chat = await createChat();
      navigate(`/app/chat/${chat.id}`, { state: prefill ? { prefill } : undefined });
    } catch (e) {
      toast.error(friendlyError(e));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <Tour />
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">Bonjour {profile.prenom} !</h1>
        <p className="mt-2 text-muted-fg">Qu'est-ce qu'on travaille aujourd'hui ?</p>
      </div>

      {last ? (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted-fg">Reprendre où tu t'es arrêté</p>
            <p className="truncate text-lg font-semibold">
              Chapitre {last.chapter_number} : {last.title}
            </p>
          </div>
          <Button onClick={() => navigate(`/app/chat/${last.id}`)}>
            Continuer le chapitre {last.chapter_number} <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </Card>
      ) : (
        <Card className="space-y-3">
          <p className="text-lg font-semibold">Ton premier chapitre t'attend.</p>
          <p className="text-muted-fg">Choisis un sujet ci-dessous ou pose directement ta question.</p>
          <Button variant="accent" loading={busy} onClick={() => void start()}>
            <Plus className="h-4 w-4" aria-hidden /> Nouveau chapitre
          </Button>
        </Card>
      )}

      {suggestions.length > 0 && (
        <section aria-labelledby="sugg">
          <h2 id="sugg" className="mb-3 text-xl font-bold">
            Pour {key}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {suggestions.map((s) => (
              <li key={s.title}>
                <button
                  disabled={busy}
                  onClick={() => void start(`Explique-moi le cours : ${s.title}`)}
                  className="flex h-full w-full flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left hover:bg-muted disabled:opacity-60"
                >
                  <BookOpen className="h-5 w-5 text-primary" aria-hidden />
                  <span className="font-semibold">{s.title}</span>
                  <span className="text-sm text-muted-fg">{s.subject}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
