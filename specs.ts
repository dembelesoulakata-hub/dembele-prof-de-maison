// Schémas et validation des figures : séparés des composants pour ne pas charger recharts trop tôt.
import { z } from "zod";
import { compileFunction } from "@/lib/safeMath";

const PlotSchema = z
  .object({
    title: z.string().max(120).optional(),
    fns: z.array(z.object({ expr: z.string().max(200), label: z.string().max(30).optional() })).min(1).max(4),
    xmin: z.number().finite().default(-10),
    xmax: z.number().finite().default(10),
    ymin: z.number().finite().optional(),
    ymax: z.number().finite().optional(),
    points: z.array(z.object({ x: z.number().finite(), y: z.number().finite(), label: z.string().max(40).optional() })).max(12).default([]),
  })
  .refine((v) => v.xmax > v.xmin && v.xmax - v.xmin <= 10_000, "domaine invalide");

export function parsePlot(code: string) {
  try {
    const parsed = PlotSchema.safeParse(JSON.parse(code));
    if (!parsed.success) return null;
    const fns = parsed.data.fns.map((f) => ({ ...f, fn: compileFunction(f.expr) }));
    if (fns.some((f) => !f.fn)) return null;
    return { ...parsed.data, fns };
  } catch {
    return null;
  }
}

const Labeled = z.object({ title: z.string().max(120).optional(), labels: z.array(z.string().max(40)).min(1).max(40), values: z.array(z.number().finite()).min(1).max(40) });

const ChartSchema = z.discriminatedUnion("kind", [
  Labeled.extend({ kind: z.literal("bar") }),
  Labeled.extend({ kind: z.literal("pie") }),
  z.object({
    kind: z.literal("scatter"),
    title: z.string().max(120).optional(),
    points: z.array(z.object({ x: z.number().finite(), y: z.number().finite() })).min(1).max(200),
  }),
]);

export function parseChart(code: string) {
  try {
    const r = ChartSchema.safeParse(JSON.parse(code));
    if (!r.success) return null;
    if (r.data.kind !== "scatter" && r.data.labels.length !== r.data.values.length) return null;
    return r.data;
  } catch {
    return null;
  }
}

