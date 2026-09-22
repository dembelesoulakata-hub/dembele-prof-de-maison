import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="faso-band" aria-hidden />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <p className="mb-8 font-display text-xl font-bold">DEMBELE, mon Prof de Maison</p>
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-2 text-muted-fg">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </main>
      <footer className="px-4 py-5 text-center text-sm text-muted-fg">Application éducative gratuite - Contexte africain</footer>
    </div>
  );
}
