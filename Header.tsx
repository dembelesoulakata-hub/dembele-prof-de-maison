import { Link, NavLink } from "react-router-dom";
import { CalendarDays, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "./ui";
import { cn } from "@/lib/utils";

export function Header() {
  const { profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const isEleve = profile?.statut === "Élève";

  const link = ({ isActive }: { isActive: boolean }) =>
    cn("rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted", isActive && "bg-muted");

  return (
    <header className="shrink-0 border-b border-border bg-card">
      <div className="faso-band" aria-hidden />
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3">
        <Link to="/app" className="mr-auto font-display text-lg font-bold leading-none">
          DEMBELE <span className="hidden text-muted-fg sm:inline">· Prof de Maison</span>
        </Link>

        <nav aria-label="Navigation principale" className="flex items-center gap-1">
          <NavLink to="/app/chat" className={link}>
            Chapitres
          </NavLink>
          {isEleve && (
            <NavLink to="/app/emploi-du-temps" className={link} aria-label="Mon emploi du temps">
              <CalendarDays className="h-5 w-5 sm:hidden" aria-hidden />
              <span className="hidden sm:inline">Emploi du temps</span>
            </NavLink>
          )}
          <NavLink to="/app/profil" className={link} aria-label="Mon profil">
            <UserRound className="h-5 w-5 sm:hidden" aria-hidden />
            <span className="hidden sm:inline">{profile ? `${profile.prenom} ${profile.nom}` : "Profil"}</span>
          </NavLink>
        </nav>

        <Button variant="ghost" size="icon" onClick={toggle} aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}>
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Se déconnecter">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
