import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, Button, FullPageSpinner } from "@/components/ui";
import { AuthShell } from "./AuthShell";

export default function VerifyEmailPage() {
  const { user, loading, signOut } = useAuth();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.email_confirmed_at) return <Navigate to="/app" replace />;

  async function resend() {
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: user!.email ?? "" });
    setMsg(error ? "Envoi impossible pour le moment. Réessaie dans une minute." : "Email renvoyé. Regarde aussi dans tes spams.");
    setBusy(false);
  }

  async function check() {
    const { data } = await supabase.auth.refreshSession();
    if (!data.session?.user.email_confirmed_at) setMsg("Ton email n'est pas encore confirmé.");
  }

  return (
    <AuthShell title="Confirme ton email" subtitle="Pour protéger ton compte, on a besoin de vérifier ton adresse avant de continuer.">
      <div className="space-y-4">
        {msg && <Alert tone="info">{msg}</Alert>}
        <Button className="w-full" onClick={() => void check()}>
          J'ai cliqué sur le lien
        </Button>
        <Button variant="outline" className="w-full" loading={busy} onClick={() => void resend()}>
          Renvoyer l'email
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => void signOut()}>
          Utiliser une autre adresse
        </Button>
      </div>
    </AuthShell>
  );
}
