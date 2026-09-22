import { Outlet, useMatch } from "react-router-dom";
import { Header } from "./Header";

export function AppLayout() {
  const inChat = useMatch("/app/chat/*") !== null;
  return (
    <div className="flex h-dvh flex-col">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg">
        Aller au contenu
      </a>
      <Header />
      <main id="contenu" className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
        {!inChat && (
          <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted-fg">
            Application éducative gratuite - Contexte africain
          </footer>
        )}
      </main>
    </div>
  );
}
