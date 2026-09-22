import { useEffect, useState, type FormEvent } from "react";
import { getCountries } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { CLASSES, LYCEE, NIVEAUX, SERIES, STATUTS, normalizeProfile, profileSchema, type ProfileInput } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";
import type { Country, Profile } from "@/types/db";
import { Alert, Button, Field, Input, Select } from "./ui";

interface Props {
  userId: string;
  initial?: Profile | null;
  locked?: boolean;
  submitLabel: string;
  onSaved: () => void | Promise<void>;
}

export function ProfileForm({ userId, initial, locked = false, submitLabel, onSaved }: Props) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [v, setV] = useState<ProfileInput>({
    nom: initial?.nom ?? "",
    prenom: initial?.prenom ?? "",
    statut: initial?.statut ?? "Élève",
    pays: initial?.pays ?? "BF",
    classe: (initial?.classe as ProfileInput["classe"]) ?? null,
    serie: (initial?.serie as ProfileInput["serie"]) ?? null,
    niveau: (initial?.niveau as ProfileInput["niveau"]) ?? null,
    filiere: initial?.filiere ?? null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCountries()
      .then(setCountries)
      .catch(() => setCountries([{ code: "BF", name_fr: "Burkina Faso", timezone: "Africa/Ouagadougou" }]));
  }, []);

  const set = <K extends keyof ProfileInput>(k: K, value: ProfileInput[K]) => setV((p) => ({ ...p, [k]: value }));
  const isLycee = v.statut === "Élève" && v.classe !== null && (LYCEE as readonly string[]).includes(v.classe);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = profileSchema.safeParse(v);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const data = normalizeProfile(parsed.data);
      const { error } = initial
        ? await supabase.from("profiles").update(data).eq("user_id", userId)
        : await supabase.from("profiles").insert({ ...data, user_id: userId });
      if (error) throw error;
      await onSaved();
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {formError && <Alert>{formError}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Prénom" error={errors.prenom}>
          {(id) => <Input id={id} autoComplete="given-name" value={v.prenom} disabled={locked} onChange={(e) => set("prenom", e.target.value)} />}
        </Field>
        <Field label="Nom" error={errors.nom}>
          {(id) => <Input id={id} autoComplete="family-name" value={v.nom} disabled={locked} onChange={(e) => set("nom", e.target.value)} />}
        </Field>
      </div>

      <Field label="Tu es" error={errors.statut}>
        {(id) => (
          <Select id={id} value={v.statut} disabled={locked} onChange={(e) => set("statut", e.target.value as ProfileInput["statut"])}>
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {v.statut === "Élève" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Classe" error={errors.classe}>
            {(id) => (
              <Select id={id} value={v.classe ?? ""} disabled={locked} onChange={(e) => set("classe", (e.target.value || null) as ProfileInput["classe"])}>
                <option value="">Choisir…</option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {isLycee && (
            <Field label="Série" error={errors.serie}>
              {(id) => (
                <Select id={id} value={v.serie ?? ""} disabled={locked} onChange={(e) => set("serie", (e.target.value || null) as ProfileInput["serie"])}>
                  <option value="">Choisir…</option>
                  {SERIES.map((s) => (
                    <option key={s} value={s}>
                      Série {s}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Niveau" error={errors.niveau}>
            {(id) => (
              <Select id={id} value={v.niveau ?? ""} disabled={locked} onChange={(e) => set("niveau", (e.target.value || null) as ProfileInput["niveau"])}>
                <option value="">Choisir…</option>
                {NIVEAUX.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Filière" error={errors.filiere}>
            {(id) => (
              <Input id={id} value={v.filiere ?? ""} disabled={locked} placeholder="Ex. Mathématiques-Physique" onChange={(e) => set("filiere", e.target.value)} />
            )}
          </Field>
        </div>
      )}

      <Field label="Pays" hint="Il sert à régler l'heure de ton emploi du temps." error={errors.pays}>
        {(id) => (
          <Select id={id} value={v.pays} disabled={locked} onChange={(e) => set("pays", e.target.value)}>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name_fr}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {!locked && (
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          {submitLabel}
        </Button>
      )}
    </form>
  );
}
