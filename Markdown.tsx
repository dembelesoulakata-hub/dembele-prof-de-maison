import { memo, useMemo, type ComponentProps, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Figure, type FigureKind } from "./figures/Figure";

const FIGURE_LANGS = new Set<string>(["svg", "plot", "chart", "mermaid"]);

function textOf(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

/**
 * Rendu du markdown de l'IA. Par sécurité :
 *  - pas de HTML brut (rehype-raw n'est pas activé),
 *  - les images markdown sont supprimées (elles pourraient servir à exfiltrer des données),
 *  - les liens s'ouvrent dans un nouvel onglet, uniquement en http(s).
 */
export const Markdown = memo(function Markdown({ content, streaming = false }: { content: string; streaming?: boolean }) {
  const components = useMemo<Components>(
    () => ({
      img: () => null,
      a: ({ href, children }: ComponentProps<"a">) =>
        href && /^https?:\/\//i.test(href) ? (
          <a href={href} target="_blank" rel="noopener noreferrer nofollow">
            {children}
          </a>
        ) : (
          <span>{children}</span>
        ),
      pre: ({ children }: ComponentProps<"pre">) => <>{children}</>,
      code: ({ className, children, ...rest }: ComponentProps<"code">) => {
        const lang = /language-(\w+)/.exec(className ?? "")?.[1];
        if (lang && FIGURE_LANGS.has(lang)) {
          return <Figure kind={lang as FigureKind} code={textOf(children).replace(/\n$/, "")} streaming={streaming} />;
        }
        const block = Boolean(lang) || textOf(children).includes("\n");
        return block ? (
          <pre>
            <code className={className} {...rest}>
              {children}
            </code>
          </pre>
        ) : (
          <code className={className} {...rest}>
            {children}
          </code>
        );
      },
    }),
    [streaming],
  );

  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, trust: false }]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
