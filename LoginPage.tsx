import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { loginSchema } from "@/lib/validation";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, Button, Field, Input } from "@/components/ui";
import { AuthShell } from "./AuthShell";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/app" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNeedsConfirm(false);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) {
        if (/not confirmed/i.test(error.message)) setNeedsConfirm(true);
        // Message volontairement identique pour un email inconnu et un mauvais mot de passe.
        else setFormError("Email ou mot de passe incorrect.");
        return;
      }
      navigate("/app", { replace: true });
    } catch {
      setFormError("Connexion impossible. Vérifie ton réseau et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase() });
    setFormError("Email de confirmation renvoyé. Regarde aussi dans tes spams.");
    setNeedsConfirm(false);
  }

  return (
    <AuthShell title="Content de te revoir" subtitle="Connecte-toi pour reprendre tes chapitres.">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {formError && <Alert tone={formError.startsWith("Email de confirmation") ? "success" : "error"}>{formError}</Alert>}
        {needsConfirm && (
          <Alert tone="info">
            Ton email n'est pas encore confirmé. Ouvre le lien reçu par mail, ou{" "}
            <button type="button" onClick={() => void resend()} className="underline">
              renvoie-le
            </button>
            .
          </Alert>
        )}
        <Field label="Adresse email" error={errors.email}>
          {(id) => <Input id={id} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
        </Field>
        <Field label="Mot de passe" error={errors.password}>
          {(id) => (
            <Input id={id} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          )}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Se connecter
        </Button>
        <p className="text-center text-muted-fg">
          Pas encore de compte ?{" "}
          <Link to="/signup" className="font-semibold text-primary underline">
            Créer mon compte
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
