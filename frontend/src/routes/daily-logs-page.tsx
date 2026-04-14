import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { ApiError, dailyLogApi } from "../lib/api";
import type { DailyLog, DailyLogPayload } from "../lib/types";

const dailyLogSchema = z.object({
  date: z.string().min(1, "Date is required"),
  weight_kg: z.number().min(0).max(500).nullable(),
  calories: z.number().int().min(0).max(10000).nullable(),
  protein_g: z.number().min(0).max(1000).nullable(),
  carbs_g: z.number().min(0).max(1000).nullable(),
  fat_g: z.number().min(0).max(500).nullable(),
  steps: z.number().int().min(0).max(100000).nullable(),
  cardio_minutes: z.number().int().min(0).max(1440).nullable(),
  cardio_type: z.string().max(120).nullable(),
  sleep_hours: z.number().min(0).max(24).nullable(),
  is_training_day: z.boolean(),
  notes: z.string().max(4000).nullable(),
});

type DailyLogFormValues = z.infer<typeof dailyLogSchema>;

const todayString = new Date().toISOString().slice(0, 10);

const defaultValues: DailyLogFormValues = {
  date: todayString,
  weight_kg: null,
  calories: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  steps: null,
  cardio_minutes: null,
  cardio_type: null,
  sleep_hours: null,
  is_training_day: false,
  notes: null,
};

const optionalNumber = {
  setValueAs: (value: string) => (value === "" ? null : Number(value)),
};

function toFormValues(log: DailyLog): DailyLogFormValues {
  return {
    date: log.date,
    weight_kg: log.weight_kg,
    calories: log.calories,
    protein_g: log.protein_g,
    carbs_g: log.carbs_g,
    fat_g: log.fat_g,
    steps: log.steps,
    cardio_minutes: log.cardio_minutes,
    cardio_type: log.cardio_type,
    sleep_hours: log.sleep_hours,
    is_training_day: log.is_training_day,
    notes: log.notes,
  };
}

function formatValue(value: number | string | null, suffix = "") {
  if (value == null || value === "") {
    return "--";
  }
  return `${value}${suffix}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

export function DailyLogsPage() {
  const queryClient = useQueryClient();
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const dailyLogsQuery = useQuery({
    queryKey: ["daily-logs"],
    queryFn: () => dailyLogApi.list(),
  });
  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: DailyLogPayload }) =>
      id == null ? dailyLogApi.create(payload) : dailyLogApi.update(id, payload),
    onSuccess: async () => {
      setStatusMessage(editingLog ? "Daily log updated." : "Daily log created.");
      setEditingLog(null);
      form.reset(defaultValues);
      await queryClient.invalidateQueries({ queryKey: ["daily-logs"] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => dailyLogApi.remove(id),
    onSuccess: async () => {
      setStatusMessage("Daily log deleted.");
      if (editingLog) {
        setEditingLog(null);
        form.reset(defaultValues);
      }
      await queryClient.invalidateQueries({ queryKey: ["daily-logs"] });
    },
  });
  const form = useForm<DailyLogFormValues>({
    resolver: zodResolver(dailyLogSchema),
    defaultValues,
  });

  useEffect(() => {
    if (editingLog) {
      form.reset(toFormValues(editingLog));
    }
  }, [editingLog, form]);

  async function onSubmit(values: DailyLogFormValues) {
    setStatusMessage(null);
    await saveMutation.mutateAsync({ id: editingLog?.id ?? null, payload: values });
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this daily log?")) {
      return;
    }
    setStatusMessage(null);
    await deleteMutation.mutateAsync(id);
  }

  function handleCancelEdit() {
    setEditingLog(null);
    form.reset(defaultValues);
    setStatusMessage(null);
  }

  const logs = dailyLogsQuery.data ?? [];
  const logsWithWeight = logs.filter((log) => log.weight_kg != null);
  const latestWeight = logsWithWeight[0]?.weight_kg ?? null;
  const lastSevenWeights = logsWithWeight.slice(0, 7);
  const sevenDayAverage =
    lastSevenWeights.length > 0
      ? Number((lastSevenWeights.reduce((sum, log) => sum + (log.weight_kg ?? 0), 0) / lastSevenWeights.length).toFixed(2))
      : null;
  const averageCaloriesEntries = logs.filter((log) => log.calories != null).slice(0, 7);
  const averageCalories =
    averageCaloriesEntries.length > 0
      ? Math.round(averageCaloriesEntries.reduce((sum, log) => sum + (log.calories ?? 0), 0) / averageCaloriesEntries.length)
      : null;
  const mutationError =
    saveMutation.error instanceof ApiError
      ? saveMutation.error.message
      : deleteMutation.error instanceof ApiError
        ? deleteMutation.error.message
        : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Daily check-ins</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink">Daily logs</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/68">
          Save your essentials in one place: weight, food, steps, cardio, sleep, and a quick training flag.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Latest weight</CardTitle>
            <CardDescription>Most recent logged morning bodyweight.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-ink">{formatValue(latestWeight, " kg")}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>7-log average</CardTitle>
            <CardDescription>Computed from the most recent entries with weight.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-ink">{formatValue(sevenDayAverage, " kg")}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent calories</CardTitle>
            <CardDescription>Average across the latest seven calorie entries.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-ink">{formatValue(averageCalories, " kcal")}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{editingLog ? "Edit log" : "Add log"}</CardTitle>
            <CardDescription>One entry per date. Keep fields blank when you do not have the number.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="daily-date">Date</Label>
                <Input id="daily-date" type="date" {...form.register("date")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="daily-weight">Morning weight (kg)</Label>
                <Input id="daily-weight" type="number" step="0.1" {...form.register("weight_kg", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="daily-calories">Calories</Label>
                <Input id="daily-calories" type="number" {...form.register("calories", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="daily-protein">Protein (g)</Label>
                <Input id="daily-protein" type="number" step="0.1" {...form.register("protein_g", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="daily-carbs">Carbs (g)</Label>
                <Input id="daily-carbs" type="number" step="0.1" {...form.register("carbs_g", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="daily-fat">Fat (g)</Label>
                <Input id="daily-fat" type="number" step="0.1" {...form.register("fat_g", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="daily-steps">Steps</Label>
                <Input id="daily-steps" type="number" {...form.register("steps", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="daily-cardio-minutes">Cardio minutes</Label>
                <Input id="daily-cardio-minutes" type="number" {...form.register("cardio_minutes", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="daily-cardio-type">Cardio type</Label>
                <Input
                  id="daily-cardio-type"
                  placeholder="Incline walk, bike, etc."
                  {...form.register("cardio_type", { setValueAs: (value) => (value === "" ? null : value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="daily-sleep">Sleep hours</Label>
                <Input id="daily-sleep" type="number" step="0.1" {...form.register("sleep_hours", optionalNumber)} />
              </div>

              <div className="sm:col-span-2 flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3">
                <input id="daily-training-day" className="h-4 w-4 accent-ember" type="checkbox" {...form.register("is_training_day")} />
                <Label htmlFor="daily-training-day" className="cursor-pointer">
                  Training day
                </Label>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="daily-notes">Notes</Label>
                <Textarea
                  id="daily-notes"
                  placeholder="Energy, hunger, recovery, or anything notable."
                  {...form.register("notes", { setValueAs: (value) => (value === "" ? null : value) })}
                />
              </div>

              <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-ink/65">
                  {mutationError ? <span className="text-ember">{mutationError}</span> : statusMessage ?? "Logs save directly to SQLite."}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {editingLog ? (
                    <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  ) : null}
                  <Button className="w-full sm:w-auto" disabled={saveMutation.isPending} type="submit">
                    {saveMutation.isPending ? "Saving..." : editingLog ? "Update log" : "Save log"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent daily logs</CardTitle>
            <CardDescription>Newest first, with quick edit and delete actions.</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyLogsQuery.isLoading ? <p className="text-sm text-ink/65">Loading logs...</p> : null}
            {!dailyLogsQuery.isLoading && logs.length === 0 ? (
              <p className="text-sm leading-6 text-ink/65">No daily logs yet. Add your first entry to start building weight and calorie history.</p>
            ) : null}
            {logs.length > 0 ? (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div className="rounded-[24px] border border-ink/10 bg-white/80 p-4 sm:p-5" key={log.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">{log.is_training_day ? "Training day" : "Rest day"}</p>
                        <p className="mt-2 text-xl font-semibold text-ink">{formatDate(log.date)}</p>
                        <p className="mt-1 text-sm text-ink/60">
                          Cardio: {formatValue(log.cardio_minutes, " min")} {log.cardio_type ? `• ${log.cardio_type}` : ""}
                        </p>
                      </div>
                      <div className="rounded-full bg-canvas px-3 py-2 text-sm font-semibold text-ink">
                        Weight {formatValue(log.weight_kg, " kg")}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MetricCard label="Calories" value={formatValue(log.calories)} />
                      <MetricCard label="Protein" value={formatValue(log.protein_g, " g")} />
                      <MetricCard label="Steps" value={formatValue(log.steps)} />
                      <MetricCard label="Sleep" value={formatValue(log.sleep_hours, " h")} />
                    </div>

                    {log.notes ? <p className="mt-4 text-sm leading-6 text-ink/65">{log.notes}</p> : null}

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={() => setEditingLog(log)}>
                        Edit
                      </Button>
                      <Button
                        className="w-full sm:w-auto"
                        type="button"
                        variant="ghost"
                        onClick={() => handleDelete(log.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-canvas px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">{label}</p>
      <p className="mt-2 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
