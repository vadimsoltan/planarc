import type { ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";

import { TrendChartCard } from "../components/dashboard/trend-chart-card";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { analyticsApi } from "../lib/api";

function formatNumber(value: number | null, suffix = "", digits = 1) {
  if (value == null) {
    return "--";
  }
  return `${value.toFixed(digits)}${suffix}`;
}

function formatWhole(value: number | null, suffix = "") {
  if (value == null) {
    return "--";
  }
  return `${Math.round(value)}${suffix}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "--";
  }
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

function formatProteinRange(min: number | null, max: number | null) {
  if (min == null && max == null) {
    return "--";
  }
  if (min != null && max != null) {
    return `${min}-${max} g`;
  }
  return `${min ?? max} g`;
}

function formatAdjustment(value: number) {
  if (value === 0) {
    return "Hold";
  }
  return value > 0 ? `+${value} kcal` : `${value} kcal`;
}

function ProgressBar({ value }: { value: number | null }) {
  const clamped = Math.max(0, Math.min(value ?? 0, 100));
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-ink/10">
      <div className="h-full rounded-full bg-gradient-to-r from-moss via-ember to-ink" style={{ width: `${clamped}%` }} />
    </div>
  );
}

function paceBadgeClass(status: string) {
  switch (status) {
    case "ahead":
      return "bg-ember/15 text-ember";
    case "on_track":
      return "bg-moss/15 text-moss";
    case "behind":
      return "bg-ink/10 text-ink";
    default:
      return "bg-ink/10 text-ink";
  }
}

function StatTile({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-2xl bg-canvas p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-sm text-ink/60">{caption}</p>
    </div>
  );
}

function DisclosureCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <details className="rounded-[28px] border border-white/70 bg-white/75 shadow-panel backdrop-blur">
      <summary className="cursor-pointer list-none px-6 py-5 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold tracking-tight text-ink">{title}</p>
            <p className="mt-1 text-sm text-ink/65">{description}</p>
          </div>
          <span className="rounded-full bg-canvas px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/55">
            Show
          </span>
        </div>
      </summary>
      <div className="px-6 pb-6">{children}</div>
    </details>
  );
}

export function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: analyticsApi.getDashboard,
  });
  const projectionsQuery = useQuery({
    queryKey: ["analytics", "projections"],
    queryFn: analyticsApi.getProjections,
  });

  if (dashboardQuery.isLoading) {
    return <div className="text-sm font-medium text-ink/65">Loading plan projection...</div>;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <div className="text-sm font-medium text-ember">Unable to load the plan right now.</div>;
  }

  const { summary, weight_series } = dashboardQuery.data;
  const projections = projectionsQuery.data;
  const weightProjectionSeries = weight_series.map((point) => ({
    ...point,
    goal_weight_kg: summary.goal_weight_kg,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Plan</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">Current status and projection</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
            A single projection-first view of where you are now, where the phase is taking you, and what to do next.
          </p>
        </div>
        {summary.current_phase_name ? <Badge>Active phase: {summary.current_phase_name}</Badge> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <TrendChartCard
          title="Weight vs goal"
          description="Your recent scale trend, rolling average, and current goal weight in one graph."
          data={weightProjectionSeries}
          emptyText="Add daily logs with bodyweight values to populate the plan graph."
          lines={[
            { key: "weight_kg", label: "Daily weight", color: "#c86b3c", formatter: (value) => `${value.toFixed(1)} kg` },
            {
              key: "seven_day_avg_weight_kg",
              label: "7-log average",
              color: "#14213d",
              formatter: (value) => `${value.toFixed(1)} kg`,
            },
            {
              key: "goal_weight_kg",
              label: "Goal weight",
              color: "#7a8b5a",
              formatter: (value) => `${value.toFixed(1)} kg`,
            },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>Current status</CardTitle>
            <CardDescription>The simplest read on pace, target, and the next milestone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[24px] border border-ink/10 bg-white/75 p-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Pace assessment</p>
                  {projections ? <Badge className={paceBadgeClass(projections.pace_assessment)}>{projections.pace_assessment.replace("_", " ")}</Badge> : null}
                </div>
                <p className="text-base leading-7 text-ink">{projections?.primary_recommendation ?? "Projection guidance will appear once the engine loads."}</p>
              </div>
            </div>

            <div className="grid gap-4">
              <StatTile
                label="Current weight"
                value={formatNumber(summary.current_weight_kg, " kg", 1)}
                caption={`7-log average: ${formatNumber(summary.seven_day_avg_weight_kg, " kg", 1)}`}
              />
              <StatTile
                label="Projected goal date"
                value={formatDate(summary.projected_goal_date)}
                caption={summary.goal_weight_kg != null ? `Goal weight: ${summary.goal_weight_kg.toFixed(1)} kg` : "No goal weight set"}
              />
              <StatTile
                label="Current calorie target"
                value={summary.current_calorie_target_kcal != null ? `${summary.current_calorie_target_kcal} kcal` : "--"}
                caption={summary.current_calorie_target_context ?? "Waiting for a recent day type"}
              />
              <StatTile
                label="Protein target"
                value={formatProteinRange(summary.protein_target_min_g, summary.protein_target_max_g)}
                caption={`Current pace: ${formatNumber(summary.estimated_weekly_weight_loss_rate_kg, " kg / week", 2)}`}
              />
            </div>

            <div className="rounded-[24px] border border-ink/10 bg-white/75 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Next milestone</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{summary.next_milestone_label ?? "No target set"}</p>
                </div>
                <div className="text-right text-sm text-ink/60">
                  Remaining: {summary.remaining_to_next_milestone_kg != null ? `${summary.remaining_to_next_milestone_kg.toFixed(1)} kg` : "--"}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-ink/65">
                  <span>Progress toward current phase target</span>
                  <span>
                    {summary.progress_toward_next_milestone_pct != null
                      ? `${summary.progress_toward_next_milestone_pct.toFixed(1)}%`
                      : "--"}
                  </span>
                </div>
                <ProgressBar value={summary.progress_toward_next_milestone_pct} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DisclosureCard
        title="Projection details"
        description="Open the rule-based guidance only when you want the extra context."
      >
        {projectionsQuery.isLoading ? <p className="text-sm text-ink/65">Loading projection details...</p> : null}
        {projectionsQuery.isError || !projections ? (
          <p className="text-sm text-ember">Projection details are unavailable right now.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Suggested adjustment"
              value={formatAdjustment(projections.suggested_calorie_adjustment_kcal)}
              caption={`Training / rest: ${projections.suggested_training_day_calories_kcal ?? "--"} / ${projections.suggested_rest_day_calories_kcal ?? "--"} kcal`}
            />
            <StatTile
              label="Next 7-day weight band"
              value={
                projections.weekly_target_weight_min_kg != null && projections.weekly_target_weight_max_kg != null
                  ? `${projections.weekly_target_weight_min_kg.toFixed(1)}-${projections.weekly_target_weight_max_kg.toFixed(1)} kg`
                  : "--"
              }
              caption="Derived from the active phase loss target."
            />
            <StatTile
              label="Phase transition"
              value={formatDate(projections.suggested_phase_transition_date)}
              caption={`Projected goal date: ${formatDate(projections.projected_goal_date)}`}
            />
            <StatTile
              label="Next measurement milestone"
              value={projections.expected_next_measurement_milestone ?? "--"}
              caption={projections.warnings[0] ?? "No rule-based warnings right now."}
            />
          </div>
        )}
      </DisclosureCard>

      <DisclosureCard
        title="Supporting signals"
        description="Keep the secondary status markers nearby without putting them on the main surface."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Current waist"
            value={formatNumber(summary.current_waist_cm, " cm", 1)}
            caption="Latest waist-at-navel check-in."
          />
          <StatTile
            label="Estimated body fat"
            value={formatNumber(summary.current_estimated_body_fat_pct, "%", 1)}
            caption="Latest adjusted or computed estimate."
          />
          <StatTile
            label="Weekly calories"
            value={formatWhole(summary.weekly_avg_calories, " kcal")}
            caption="Average from the last seven logged days."
          />
          <StatTile
            label="Weekly steps"
            value={formatWhole(summary.weekly_avg_steps)}
            caption="Average against the default daily target."
          />
        </div>
      </DisclosureCard>
    </div>
  );
}
