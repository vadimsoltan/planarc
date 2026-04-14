import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

type TrendLine<T extends Record<string, unknown>> = {
  key: keyof T;
  label: string;
  color: string;
  formatter?: (value: number) => string;
};

type TrendChartCardProps<T extends Record<string, unknown>> = {
  title: string;
  description: string;
  data: T[];
  lines: TrendLine<T>[];
  emptyText: string;
};

function toDisplayDate(value: string) {
  return value.slice(5);
}

function toFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function TrendChartCard<T extends Record<string, unknown>>({
  title,
  description,
  data,
  lines,
  emptyText,
}: TrendChartCardProps<T>) {
  const width = 640;
  const height = 240;
  const padding = { top: 16, right: 20, bottom: 28, left: 20 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = data.flatMap((item) =>
    lines
      .map((line) => toFiniteNumber(item[line.key]))
      .filter((value): value is number => value !== null),
  );

  if (values.length === 0 || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-ink/65">{emptyText}</p>
        </CardContent>
      </Card>
    );
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const yMin = minValue - range * 0.1;
  const yMax = maxValue + range * 0.1;

  function getX(index: number) {
    if (data.length === 1) {
      return padding.left + plotWidth / 2;
    }
    return padding.left + (index / (data.length - 1)) * plotWidth;
  }

  function getY(value: number) {
    return padding.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;
  }

  function buildPath(line: TrendLine<T>) {
    let path = "";
    let started = false;
    data.forEach((item, index) => {
      const value = toFiniteNumber(item[line.key]);
      if (value == null) {
        started = false;
        return;
      }
      const x = getX(index);
      const y = getY(value);
      path += `${started ? " L" : "M"} ${x} ${y}`;
      started = true;
    });
    return path;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[24px] bg-canvas/80 p-4">
          <svg className="h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img">
            {[0, 1, 2, 3].map((tick) => {
              const y = padding.top + (tick / 3) * plotHeight;
              return <line key={tick} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(20,33,61,0.08)" />;
            })}
            {lines.map((line) => (
              <path
                key={String(line.key)}
                d={buildPath(line)}
                fill="none"
                stroke={line.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
              />
            ))}
          </svg>
        </div>

        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
          <span>{toDisplayDate(String(data[0]?.date ?? ""))}</span>
          <span>{toDisplayDate(String(data[data.length - 1]?.date ?? ""))}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {lines.map((line) => {
            const latest = [...data].reverse().find((item) => toFiniteNumber(item[line.key]) != null);
            const latestValue = latest ? toFiniteNumber(latest[line.key]) : null;
            return (
              <div className="rounded-2xl bg-white/75 px-4 py-3" key={String(line.key)}>
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: line.color }} />
                  {line.label}
                </div>
                <p className="mt-2 text-lg font-semibold text-ink">
                  {typeof latestValue === "number"
                    ? line.formatter?.(latestValue) ?? latestValue.toFixed(2)
                    : "--"}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
