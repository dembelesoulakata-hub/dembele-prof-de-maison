import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getSchedule, validateSchedule } from "@/lib/api";
import { SUBJECTS } from "@/lib/validation";
import { cn, friendlyError } from "@/lib/utils";
import type { ScheduleSlot } from "@/types/db";
import { Alert, Button, Dialog, Select, Spinner } from "@/components/ui";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;
const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // de 6h à 20h

export default function SchedulePage() {
  const { profile } = useAuth();
  const [locked, setLocked] = useState<ScheduleSlot[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(1);
  const [cells, setCells] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSchedule()
      .then((s) => setLocked(s.length ? s : null))
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);

  const chosen = useMemo(() => Object.entries(cells).filter(([, s]) => s), [cells]);

  // Les étudiants en Licence ne voient jamais cette page.
  if (profile && profile.statut !== "Élève") return <Navigate to="/app" replace />;
  if (loading) return <Spinner />;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const slots = chosen.map(([k, subject]) => {
        const [d, h] = k.split("-").map(Number);
        return { day: d!, start_hour: h!, subject };
      });
      await validateSchedule(slots);
      const fresh = await getSchedule();
      setLocked(fresh);
      setConfirmOpen(false);
      toast.success("Emploi du temps validé. Bon courage pour tes cours !");
    } catch (e) {
      setError(friendlyError(e));
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  // --- Emploi du temps déjà validé : lecture seule ---
  if (locked) {
    const bySlot = new Map(locked.map((s) => [`${s.day}-${s.start_hour}`, s.subject]));
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Mon emploi du temps</h1>
        <p className="mb-6 flex items-center gap-2 text-muted-fg">
          <Lock className="h-4 w-4" aria-hidden /> Validé et verrouillé. Pendant tes cours, l'application se met en pause.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[34rem] text-sm">
            <caption className="sr-only">Emploi du temps de la semaine</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="p-2 text-left">Heure</th>
                {DAYS.map((d) => (
                  <th key={d} scope="col" className="p-2 text-left">{d.slice(0, 3)}.</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((h) => (
                <tr key={h} className="border-b border-border last:border-0">
                  <th scope="row" className="p-2 text-left font-semibold">{h}h-{h + 1}h</th>
                  {DAYS.map((_, i) => {
                    const s = bySlot.get(`${i + 1}-${h}`);
                    return (
                      <td key={i} className={cn("p-2", s && "bg-primary/10 font-semibold")}>
                        {s ?? ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- Saisie ---
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Mon emploi du temps</h1>
      <p className="mb-6 text-muted-fg">
        Indique tes heures de cours, jour par jour. Pendant ces heures, l'application sera bloquée pour que tu restes concentré. Laisse vide les heures libres.
      </p>
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div role="tablist" aria-label="Jours de la semaine" className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {DAYS.map((d, i) => {
          const count = chosen.filter(([k]) => k.startsWith(`${i + 1}-`)).length;
          return (
            <button
              key={d}
              role="tab"
              aria-selected={day === i + 1}
              onClick={() => setDay(i + 1)}
              className={cn("shrink-0 rounded-xl border border-border px-3 py-2 font-semibold", day === i + 1 ? "bg-primary text-primary-fg" : "bg-card hover:bg-muted")}
            >
              {d.slice(0, 3)}.{count > 0 && <span className="ml-1 text-sm opacity-80">({count})</span>}
            </button>
          );
        })}
      </div>

      <ul className="space-y-2">
        {HOURS.map((h) => {
          const k = `${day}-${h}`;
          return (
            <li key={k} className="flex items-center gap-3">
              <span className="w-20 shrink-0 font-semibold">{h}h - {h + 1}h</span>
              <Select
                aria-label={`${DAYS[day - 1]} de ${h}h à ${h + 1}h`}
                value={cells[k] ?? ""}
                onChange={(e) => setCells((c) => ({ ...c, [k]: e.target.value }))}
              >
                <option value="">Libre</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 mt-6 bg-background/95 py-3">
        <Button size="lg" className="w-full" disabled={chosen.length === 0} onClick={() => { setUnderstood(false); setConfirmOpen(true); }}>
          Valider mon emploi du temps ({chosen.length} heure{chosen.length > 1 ? "s" : ""})
        </Button>
      </div>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Tu es sûr de toi ?">
        <p className="mb-4 text-muted-fg">
          Une fois validé, ton emploi du temps ne pourra <strong className="text-foreground">plus être modifié</strong>. Vérifie bien chaque jour avant de continuer.
        </p>
        <label className="mb-5 flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
          <span>Je comprends que je ne pourrai plus le changer.</span>
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Je vérifie encore
          </Button>
          <Button disabled={!understood} loading={busy} onClick={() => void confirm()}>
            Valider définitivement
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
