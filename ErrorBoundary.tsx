import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui";

interface State {
  hasError: boolean;
}

// Filet de sécurité : même si un composant plante, l'app affiche un message clair au lieu d'un écran blanc.
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error:", error.message, info.componentStack);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <h1 className="text-2xl font-bold">Oups, un souci est survenu</h1>
          <p className="text-muted-fg">Tes discussions sont en sécurité. Recharge la page pour continuer.</p>
          <Button onClick={() => window.location.reload()}>Recharger la page</Button>
        </div>
      </div>
    );
  }
}
