import { Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui";

export default function BlockedScreen({ untilHour }: { untilHour: number | null }) {
  const { signOut } = useAuth();
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="faso-band" aria-hidden />
      <main className="grid flex-1 place-items-center px-6 text-center">
        <div className="max-w-sm space-y-5">
          <Clock className="mx-auto h-12 w-12 text-primary" aria-hidden />
          <h1 className="text-3xl font-bold">⏰ Tu es en cours{untilHour ? ` jusqu'à ${untilHour}h` : ""}. Reviens après !</h1>
          <p className="text-muted-fg">Concentre-toi sur ton cours, ton prof t'attend juste après. Cette page se débloque toute seule.</p>
          <Button variant="outline" onClick={() => void signOut()}>
            Me déconnecter
          </Button>
        </div>
      </main>
    </div>
  );
}
