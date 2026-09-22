import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getBlockStatus } from "@/lib/api";
import type { BlockStatus } from "@/types/db";
import { Button, FullPageSpinner } from "./ui";
import BlockedScreen from "@/pages/BlockedPage";

/** Il faut être connecté ET avoir confirmé son email. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { user, loading, profileError, refreshProfile } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.email_confirmed_at) return <Navigate to="/verify-email" replace />;
  if (profileError) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <h1 className="text-2xl font-bold">Connexion impossible</h1>
          <p className="text-muted-fg">On n'arrive pas à charger ton profil. Vérifie ton réseau puis réessaie.</p>
          <Button onClick={() => void refreshProfile()}>Réessayer</Button>
        </div>
      </div>
    );
  }
  return <>{children ?? <Outlet />}</>;
}

/** Le profil est obligatoire avant d'entrer dans l'app. */
export function RequireProfile({ children }: { children?: ReactNode }) {
  const { profile } = useAuth();
  if (!profile) return <Navigate to="/onboarding" replace />;
  return <>{children ?? <Outlet />}</>;
}

/**
 * Blocage horaire (élèves uniquement). Vérifié à l'entrée, à CHAQUE navigation et toutes les minutes.
 * Les étudiants en Licence traversent cette porte sans aucun appel réseau.
 */
export function BlockGate({ children }: { children?: ReactNode }) {
  const { profile } = useAuth();
  const location = useLocation();
  const isEleve = profile?.statut === "Élève";
  const [status, setStatus] = useState<BlockStatus | null>(null);
  const [checked, setChecked] = useState(!isEleve);

  const check = useCallback(async () => {
    if (!isEleve) return;
    try {
      setStatus(await getBlockStatus());
    } catch {
      /* réseau coupé : on garde le dernier état connu (le serveur bloque de toute façon les appels IA) */
    } finally {
      setChecked(true);
    }
  }, [isEleve]);

  useEffect(() => {
    void check();
  }, [check, location.pathname]);

  useEffect(() => {
    if (!isEleve) return;
    const id = window.setInterval(() => void check(), 60_000);
    return () => window.clearInterval(id);
  }, [isEleve, check]);

  if (!checked) return <FullPageSpinner />;
  if (isEleve && status?.blocked) return <BlockedScreen untilHour={status.until_hour} />;
  return <>{children ?? <Outlet />}</>;
}
