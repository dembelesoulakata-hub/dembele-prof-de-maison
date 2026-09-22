import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="faso-band" aria-hidden />
      <main className="grid flex-1 place-items-center px-6 text-center">
        <div className="max-w-sm space-y-4">
          <p className="font-display text-6xl font-bold text-primary">404</p>
          <h1 className="text-2xl font-bold">Cette page n'existe pas</h1>
          <p className="text-muted-fg">Le lien est peut-être ancien ou mal écrit. Reviens à l'accueil pour retrouver tes chapitres.</p>
          <Link to="/app" className="inline-flex h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-fg">
            Retour à l'accueil
          </Link>
        </div>
      </main>
      <footer className="px-4 py-5 text-center text-sm text-muted-fg">Application éducative gratuite - Contexte africain</footer>
    </div>
  );
}
