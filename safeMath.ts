// Évaluation SÛRE des expressions de fonctions écrites par l'IA (donc potentiellement
// influencées par un utilisateur malveillant). Trois barrières :
//  1) caractères autorisés en liste blanche, 2) identifiants en liste blanche,
//  3) fonctions dangereuses de mathjs neutralisées.
import { create, all, type EvalFunction } from "mathjs";

const math = create(all, {});

const ALLOWED_IDENTIFIERS = new Set([
  "x", "pi", "e",
  "sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh",
  "exp", "log", "log10", "log2", "sqrt", "cbrt", "abs", "floor", "ceil", "round", "sign", "pow", "min", "max",
]);

// On garde une référence à compile AVANT de neutraliser le reste (méthode recommandée par mathjs).
const compileExpr = math.compile;

// Neutralise ce qui permettrait d'aller plus loin qu'un simple calcul.
const blocked = () => {
  throw new Error("Fonction interdite");
};
math.import(
  { import: blocked, createUnit: blocked, evaluate: blocked, parse: blocked, simplify: blocked, derivative: blocked, resolve: blocked, reviver: blocked },
  { override: true },
);

export function compileFunction(expr: string): ((x: number) => number) | null {
  if (expr.length > 200) return null;
  if (!/^[\w\s+\-*/^().,]*$/.test(expr)) return null;
  const ids = expr.match(/[A-Za-z_]\w*/g) ?? [];
  if (ids.some((id) => !ALLOWED_IDENTIFIERS.has(id))) return null;
  let compiled: EvalFunction;
  try {
    compiled = compileExpr(expr);
  } catch {
    return null;
  }
  return (x: number) => {
    try {
      const v = compiled.evaluate({ x });
      return typeof v === "number" && Number.isFinite(v) ? v : Number.NaN;
    } catch {
      return Number.NaN;
    }
  };
}
