import { useMemo } from "react";
import { parseChart } from "./specs";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { usePalette } from "./palette";

const tooltipStyle = { background: "rgb(var(--card))", border: "1px solid rgb(var(--border))", borderRadius: 8, color: "rgb(var(--foreground))" };

export default function ChartFigure({ code }: { code: string }) {
  const pal = usePalette();
  const spec = useMemo(() => parseChart(code), [code]);
  if (!spec) return null;

  const rows = spec.kind === "scatter" ? [] : spec.labels.map((name, i) => ({ name, value: spec.values[i]! }));

  return (
    <div>
      {spec.title && <p className="mb-2 text-center font-semibold">{spec.title}</p>}
      <div className="h-72 w-full" role="img" aria-label={spec.title ?? "Graphique"}>
        <ResponsiveContainer>
          {spec.kind === "bar" ? (
            <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={pal.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={pal.text} tick={{ fill: pal.text, fontSize: 12 }} />
              <YAxis stroke={pal.text} tick={{ fill: pal.text, fontSize: 12 }} width={40} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: pal.grid, opacity: 0.4 }} />
              <Bar dataKey="value" name="Effectif" fill={pal.series[0]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          ) : spec.kind === "pie" ? (
            <PieChart>
              <Pie data={rows} dataKey="value" nameKey="name" outerRadius="80%" label isAnimationActive={false}>
                {rows.map((_, i) => (
                  <Cell key={i} fill={pal.series[i % pal.series.length]} fillOpacity={1 - Math.floor(i / pal.series.length) * 0.25} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          ) : (
            <ScatterChart margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={pal.grid} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="x" stroke={pal.text} tick={{ fill: pal.text, fontSize: 12 }} />
              <YAxis type="number" dataKey="y" name="y" stroke={pal.text} tick={{ fill: pal.text, fontSize: 12 }} width={40} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={spec.points} fill={pal.series[0]} isAnimationActive={false} />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
