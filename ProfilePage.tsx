import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileForm } from "@/components/ProfileForm";
import { Alert } from "@/components/ui";
import { nextProfileChange } from "@/lib/utils";

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  if (!user || !profile) return null;

  const next = nextProfileChange(profile.identity_updated_at);
  const locked = next.getTime() > Date.now();

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Mon profil</h1>
      {locked ? (
        <div className="mb-6">
          <Alert tone="info">
            Tes informations sont verrouillées. Tu pourras les modifier à partir du{" "}
            {next.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.
          </Alert>
        </div>
      ) : (
        <p className="mb-6 text-muted-fg">Attention : après enregistrement, tu ne pourras plus modifier ces informations pendant 3 mois.</p>
      )}
      <ProfileForm
        userId={user.id}
        initial={profile}
        locked={locked}
        submitLabel="Enregistrer mes modifications"
        onSaved={async () => {
          await refreshProfile();
          toast.success("Profil mis à jour.");
        }}
      />
      <p className="mt-8 text-sm text-muted-fg">Connecté avec {user.email}</p>
    </div>
  );
}
