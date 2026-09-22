import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileForm } from "@/components/ProfileForm";
import { AuthShell } from "./AuthShell";

export default function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  if (profile) return <Navigate to="/app" replace />;

  return (
    <AuthShell title="Dis-nous qui tu es" subtitle="Ton prof adapte ses explications à ton niveau exact. Ces informations ne pourront être modifiées qu'une fois par trimestre.">
      <ProfileForm
        userId={user.id}
        submitLabel="Entrer dans l'application"
        onSaved={async () => {
          await refreshProfile();
          navigate("/app", { replace: true });
        }}
      />
    </AuthShell>
  );
}
