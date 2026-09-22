import { lazy, memo, Suspense, useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui";
import { parseChart, parsePlot } from "./specs";

// Les bibliothèques lourdes ne sont chargées que si une figure est demandée.
const PlotFigure = lazy(() => import("./PlotFigure"));
const ChartFigure = lazy(() => import("./ChartFigure"));

export type FigureKind = "svg" | "plot" | "chart" | "mermaid";

/** SVG produit par l'IA : nettoyé (aucun script, aucun lien, aucune image externe) puis contrôlé. */
export function sanitizeSvg(code: string): string | null {
  const clean = DOMPurify.sanitize(code, {
    USE_PROFILES: { svg: true },
    FORBID_TAGS: ["script", "foreignObject", "style", "image", "use", "a", "iframe"],
    FORBID_ATTR: ["style", "href", "xlink:href", "onload", "onclick", "onerror"],
  });
  if (!clean.trim().startsWith("<svg")) return null;
  const doc = new DOMParser().parseFromString(clean, "image/svg+xml");
  const root = doc.documentElement;
  if (root.nodeName !== "svg" || doc.querySelector("parsererror")) return null;
  if (!root.getAttribute("viewBox")) return null;
  root.removeAttribute("width");
  root.removeAttribute("height");
  root.setAttribute("role", "img");
  root.setAttribute("style", "width:100%;height:auto;color:inherit");
  return new XMLSerializer().serializeToString(root);
}

function SvgFigure({ svg }: { svg: string }) {
  const [zoom, setZoom] = useState(1);
  return (
    <div>
      <div className="overflow-auto rounded-lg">
        <div style={{ width: `${zoom * 100}%`, minWidth: "100%" }} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <div className="mt-2 flex items-center justify-end gap-1">
        <Button size="sm" variant="ghost" aria-label="Dézoomer" disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" aria-label="Zoomer" disabled={zoom >= 3} onClick={() => setZoom((z) => Math.min(3, z + 0.5))}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" aria-label="Taille d'origine" disabled={zoom === 1} onClick={() => setZoom(1)}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function MermaidFigure({ code }: { code: string }) {
  const { theme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: theme === "dark" ? "dark" : "default", flowchart: { htmlLabels: false } });
        const { svg: out } = await mermaid.render(`m${crypto.randomUUID().replace(/-/g, "")}`, code);
        if (!cancelled) setSvg(DOMPurify.sanitize(out, { USE_PROFILES: { svg: true } }));
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, theme]);

  if (failed) return <FigureError />;
  if (!svg) return <FigurePlaceholder />;
  return <div className="overflow-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function FigurePlaceholder() {
  return (
    <p role="status" className="py-8 text-center text-muted-fg">
      Figure en cours de tracé…
    </p>
  );
}

function FigureError() {
  return <p className="py-4 text-center text-sm font-semibold text-destructive">Cette figure n'a pas pu être tracée. Demande-moi de la refaire.</p>;
}

export const Figure = memo(function Figure({ kind, code, streaming }: { kind: FigureKind; code: string; streaming: boolean }) {
  const valid = useMemo(() => {
    if (kind === "svg") return sanitizeSvg(code);
    if (kind === "plot") return parsePlot(code) ? true : null;
    if (kind === "chart") return parseChart(code) ? true : null;
    return true; // mermaid : validé au rendu
  }, [kind, code]);

  let body;
  if (kind === "mermaid") body = streaming ? <FigurePlaceholder /> : <MermaidFigure code={code} />;
  else if (!valid) body = streaming ? <FigurePlaceholder /> : <FigureError />;
  else if (kind === "svg") body = <SvgFigure svg={valid as string} />;
  else
    body = (
      <Suspense fallback={<FigurePlaceholder />}>{kind === "plot" ? <PlotFigure code={code} /> : <ChartFigure code={code} />}</Suspense>
    );

  return <figure className="not-prose my-3 rounded-xl border border-border bg-card p-3 text-foreground">{body}</figure>;
});
