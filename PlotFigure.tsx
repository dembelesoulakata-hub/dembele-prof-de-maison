import { useMemo } from "react";
import { Brush, CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { parsePlot } from "./specs";
import { usePalette } from "./palette";

const N = 300;
const round = (n: number) => Math.round(n * 1000) / 1000;

export default function PlotFigure({ code }: { code: string }) {
  const pal = usePalette();
  const spec = useMemo(() => parsePlot(code), [code]);

  const { data, domain } = useMemo(() => {
    if (!spec) return { data: [], domain: [-10, 10] as [number, number] };
    const rows: Record<string, number | null>[] = [];
    const ys: number[] = [];
    for (let i = 0; i <= N; i++) {
      const x = spec.xmin + ((spec.xmax - spec.xmin) * i) / N;
      const row: Record<string, number | null> = { x: round(x) };
      spec.fns.forEach((f, k) => {
        const y = f.fn!(x);
        // Valeurs indéfinies ou explosives (asymptotes) : on coupe la courbe.
        if (Number.isFinite(y) && Math.abs(y) < 1e5) {
          row[`f${k}`] = round(y);
          ys.push(y);
        } else row[`f${k}`] = null;
      });
      rows.push(row);
    }
    ys.sort((a, b) => a - b);
    let lo = spec.ymin ?? (ys.length ? ys[Math.floor(ys.length * 0.02)]! : -10);
    let hi = spec.ymax ?? (ys.length ? ys[Math.ceil(ys.length * 0.98) - 1]! : 10);
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.15;
    return { data: rows, domain: [spec.ymin ?? round(lo - pad), spec.ymax ?? round(hi + pad)] as [number, number] };
  }, [spec]);

  if (!spec) return null;

  return (
    <div>
      {spec.title && <p className="mb-2 text-center font-semibold">{spec.title}</p>}
      <div className="h-72 w-full" role="img" aria-label={spec.title ?? "Courbe de fonction"}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={pal.grid} strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} stroke={pal.text} tick={{ fill: pal.text, fontSize: 12 }} allowDataOverflow />
            <YAxis type="number" domain={domain} allowDataOverflow stroke={pal.text} tick={{ fill: pal.text, fontSize: 12 }} width={44} />
            <ReferenceLine x={0} stroke={pal.axis} />
            <ReferenceLine y={0} stroke={pal.axis} />
            <Tooltip
              contentStyle={{ background: "rgb(var(--card))", border: "1px solid rgb(var(--border))", borderRadius: 8, color: "rgb(var(--foreground))" }}
              labelFormatter={(x) => `x = ${x}`}
            />
            {spec.fns.map((f, k) => (
              <Line
                key={k}
                type="monotone"
                dataKey={`f${k}`}
                name={f.label ?? f.expr}
                stroke={pal.series[k % pal.series.length]}
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
            {spec.points.map((p, i) => (
              <ReferenceDot key={i} x={p.x} y={p.y} r={5} fill={pal.series[1]} stroke="none" label={{ value: p.label ?? `(${p.x} ; ${p.y})`, fill: pal.text, fontSize: 11, position: "top" }} />
            ))}
            <Brush dataKey="x" height={22} stroke={pal.text} travellerWidth={10} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-xs text-muted-fg">Survole la courbe pour lire les valeurs. Glisse la barre du bas pour zoomer.</p>
    </div>
  );
}
