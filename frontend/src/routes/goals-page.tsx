import { useQuery } from "@tanstack/react-query";

import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { analyticsApi, goalsApi, phaseApi } from "../lib/api";
import type { GoalStatus, Phase } from "../lib/types";

function statusBadgeClass(status: GoalStatus["status"]) {
  switch (status) {
    case "ahead":
      return "bg-ember/15 text-ember";
    case "on_track":
      return "bg-moss/15 text-moss";
    case "caution":
      return "bg-sand/50 text-ink";
    case "off_track":
      return "bg-ink/10 text-ink";
  }
}

function formatNumber(value: number | null, suffix = "", digits = 1) {
  if (value == null) {
    return "--";
  }
  return `${value.toFixed(digits)}${suffix}`;
}

function phaseTimeProgress(phase: Phase | null) {
  if (!phase || !phase.end_date) {
    return null;
  }
  const start = new Date(`${phase.start_date}T00:00:00Z`).getTime();
  const end = new Date(`${phase.end_date}T00:00:00Z`).getTime();
  const now = Date.now();
  if (end <= start) {
    return null;
  }
  const progress = ((now - start) / (end - start)) * 100;
  return Math.max(0, Math.min(progress, 100));
}

function ProgressBar({ value }: { value: number | null }) {
  const clamped = Math.max(0, Math.min(value ?? 0, 100));
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-ink/10">
      <div className="h-full rounded-full bg-gradient-to-r from-moss via-ember to-ink" style={{ width: `${clamped}%` }} />
    </div>
  );
}

function GoalCard({ goal }: { goal: GoalStatus }) {
  return (
    <div className="rounded-[24px] border border-ink/10 bg-white/80 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">{goal.period_type}</p>
          <p className="mt-2 text-xl font-semibold text-ink">{goal.metric_name}</p>
          <p className="mt-1 text-sm text-ink/60">
            Target: {goal.target_display} • Window: {goal.start_date} to {goal.end_date}
          </p>
        </div>

        <Badge className={statusBadgeClass(goal.status)}>{goal.status.replace("_", " ")}</Badge>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Actual</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{formatNumber(goal.actual_value, ` ${goal.unit}`, 2)}</p>
        </div>
        <div className="rounded-2xl bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Progress</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{goal.progress_pct != null ? `${goal.progress_pct.toFixed(1)}%` : "--"}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm text-ink/65">
          <span>Status versus target</span>
          <span>{goal.progress_pct != null ? `${goal.progress_pct.toFixed(1)}%` : "--"}</span>
        </div>
        <ProgressBar value={goal.progress_pct} />
      </div>

      <p className="mt-4 text-sm leading-6 text-ink/65">{goal.status_reason ?? "No additional guidance available."}</p>
    </div>
  );
}

export function GoalsPage() {
  const goalsQuery = useQuery({
    queryKey: ["goals"],
    queryFn: goalsApi.getGoals,
  });
  const phasesQuery = useQuery({
    queryKey: ["phases"],
    queryFn: phaseApi.getPhases,
  });
  const dashboardQuery = useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: analyticsApi.getDashboard,
  });

  if (goalsQuery.isLoading || phasesQuery.isLoading || dashboardQuery.isLoading) {
    return <div className="text-sm font-medium text-ink/65">Loading goals and phase progress...</div>;
  }

  if (goalsQuery.isError || phasesQuery.isError || dashboardQuery.isError || !goalsQuery.data || !phasesQuery.data || !dashboardQuery.data) {
    return <div className="text-sm font-medium text-ember">Unable to load goal tracking right now.</div>;
  }

  const groupedGoals = goalsQuery.data.reduce<Record<string, GoalStatus[]>>((groups, goal) => {
    groups[goal.period_type] = [...(groups[goal.period_type] ?? []), goal];
    return groups;
  }, {});
  const activePhase = phasesQuery.data.find((phase) => phase.is_active) ?? phasesQuery.data[0] ?? null;
  const timeProgress = phaseTimeProgress(activePhase);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Targets and pacing</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink">Goals and phase status</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/68">
          Keep the current phase, milestone pacing, and rolling goal checks in one easier-to-scan view.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Active phase progress</CardTitle>
            <CardDescription>Date progress and weight-target progress for the current phase.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Phase</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{activePhase?.name ?? "No active phase"}</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">{activePhase?.description ?? "No description available."}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-canvas p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Time progress</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{timeProgress != null ? `${timeProgress.toFixed(1)}%` : "--"}</p>
                <p className="mt-1 text-sm text-ink/60">
                  {activePhase?.start_date ?? "--"} to {activePhase?.end_date ?? "Open-ended"}
                </p>
              </div>

              <div className="rounded-2xl bg-canvas p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Weight target progress</p>
                <p className="mt-2 text-2xl font-semibold text-ink">
                  {dashboardQuery.data.summary.progress_toward_next_milestone_pct != null
                    ? `${dashboardQuery.data.summary.progress_toward_next_milestone_pct.toFixed(1)}%`
                    : "--"}
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  Remaining: {formatNumber(dashboardQuery.data.summary.remaining_to_next_milestone_kg, " kg")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-ink/65">
                <span>Phase time progress</span>
                <span>{timeProgress != null ? `${timeProgress.toFixed(1)}%` : "--"}</span>
              </div>
              <ProgressBar value={timeProgress} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-ink/65">
                <span>Phase weight-target progress</span>
                <span>
                  {dashboardQuery.data.summary.progress_toward_next_milestone_pct != null
                    ? `${dashboardQuery.data.summary.progress_toward_next_milestone_pct.toFixed(1)}%`
                    : "--"}
                </span>
              </div>
              <ProgressBar value={dashboardQuery.data.summary.progress_toward_next_milestone_pct} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goal snapshot</CardTitle>
            <CardDescription>Quick status across each planning horizon.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {Object.entries(groupedGoals).map(([period, goals]) => (
              <div className="rounded-[24px] bg-canvas/75 p-4" key={period}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">{period}</p>
                    <p className="mt-2 text-lg font-semibold text-ink">{goals.length} active goals</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {goals.map((goal) => (
                      <Badge className={statusBadgeClass(goal.status)} key={goal.id}>
                        {goal.status.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {(["biweekly", "monthly", "quarterly"] as const).map((period) => {
          const goals = groupedGoals[period] ?? [];
          if (goals.length === 0) {
            return null;
          }
          return (
            <section className="space-y-4" key={period}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/45">{period}</p>
                <h3 className="mt-2 text-2xl font-semibold text-ink">{period[0].toUpperCase() + period.slice(1)} goals</h3>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {goals.map((goal) => (
                  <GoalCard goal={goal} key={goal.id} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
