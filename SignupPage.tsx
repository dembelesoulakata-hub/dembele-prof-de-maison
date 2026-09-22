import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { signupSchema } from "@/lib/validation";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, Button, Field, Input } from "@/components/ui";
import { AuthShell } from "./AuthShell";

export default function SignupPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/app" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = signupSchema.safeParse({ email, password, confirm });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (error && !/already/i.test(error.message)) {
        setFormError(/password/i.test(error.message) ? "Ce mot de passe est trop faible. Choisis-en un autre." : "Inscription impossible pour le moment. Réessaie.");
        return;
      }
      // Même message que l'email existe déjà ou non : on ne révèle pas qui a un compte.
      setSent(true);
    } catch {
      setFormError("Connexion impossible. Vérifie ton réseau et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthShell title="Vérifie ta boîte mail" subtitle={`Si l'adresse ${email.trim()} est valide, tu vas recevoir un lien de confirmation.`}>
        <p className="mb-6 text-muted-fg">Clique sur ce lien pour activer ton compte, puis connecte-toi. Pense à regarder dans les spams.</p>
        <Link to="/login" className="font-semibold text-primary underline">
          Aller à la connexion
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Crée ton compte" subtitle="Maths, physique, chimie : ton prof particulier t'attend.">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {formError && <Alert>{formError}</Alert>}
        <Field label="Adresse email" error={errors.email}>
          {(id) => <Input id={id} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
        </Field>
        <Field label="Mot de passe" hint="10 caractères minimum, avec une majuscule, une minuscule et un chiffre." error={errors.password}>
          {(id) => <Input id={id} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
        </Field>
        <Field label="Confirme le mot de passe" error={errors.confirm}>
          {(id) => <Input id={id} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Créer mon compte
        </Button>
        <p className="text-center text-muted-fg">
          Déjà inscrit ?{" "}
          <Link to="/login" className="font-semibold text-primary underline">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
