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
import { ApiError, measurementApi } from "../lib/api";
import type { Measurement, MeasurementPayload } from "../lib/types";

const measurementSchema = z.object({
  date: z.string().min(1, "Date is required"),
  neck_cm: z.number().min(20).max(60).nullable(),
  waist_navel_cm: z.number().min(40).max(200).nullable(),
  waist_narrow_cm: z.number().min(40).max(200).nullable(),
  chest_cm: z.number().min(40).max(200).nullable(),
  hips_cm: z.number().min(40).max(200).nullable(),
  glutes_cm: z.number().min(40).max(200).nullable(),
  arm_relaxed_cm: z.number().min(15).max(70).nullable(),
  arm_flexed_cm: z.number().min(15).max(70).nullable(),
  thigh_mid_cm: z.number().min(20).max(100).nullable(),
  thigh_upper_cm: z.number().min(20).max(100).nullable(),
  calf_cm: z.number().min(20).max(70).nullable(),
  adjusted_body_fat_pct: z.number().min(0).max(100).nullable(),
  notes: z.string().max(4000).nullable(),
});

type MeasurementFormValues = z.infer<typeof measurementSchema>;

const todayString = new Date().toISOString().slice(0, 10);

const defaultValues: MeasurementFormValues = {
  date: todayString,
  neck_cm: null,
  waist_navel_cm: null,
  waist_narrow_cm: null,
  chest_cm: null,
  hips_cm: null,
  glutes_cm: null,
  arm_relaxed_cm: null,
  arm_flexed_cm: null,
  thigh_mid_cm: null,
  thigh_upper_cm: null,
  calf_cm: null,
  adjusted_body_fat_pct: null,
  notes: null,
};

const optionalNumber = {
  setValueAs: (value: string) => (value === "" ? null : Number(value)),
};

function toFormValues(measurement: Measurement): MeasurementFormValues {
  return {
    date: measurement.date,
    neck_cm: measurement.neck_cm,
    waist_navel_cm: measurement.waist_navel_cm,
    waist_narrow_cm: measurement.waist_narrow_cm,
    chest_cm: measurement.chest_cm,
    hips_cm: measurement.hips_cm,
    glutes_cm: measurement.glutes_cm,
    arm_relaxed_cm: measurement.arm_relaxed_cm,
    arm_flexed_cm: measurement.arm_flexed_cm,
    thigh_mid_cm: measurement.thigh_mid_cm,
    thigh_upper_cm: measurement.thigh_upper_cm,
    calf_cm: measurement.calf_cm,
    adjusted_body_fat_pct: measurement.adjusted_body_fat_pct,
    notes: measurement.notes,
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

export function MeasurementsPage() {
  const queryClient = useQueryClient();
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const measurementsQuery = useQuery({
    queryKey: ["measurements"],
    queryFn: () => measurementApi.list(),
  });
  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: MeasurementPayload }) =>
      id == null ? measurementApi.create(payload) : measurementApi.update(id, payload),
    onSuccess: async () => {
      setStatusMessage(editingMeasurement ? "Measurement updated." : "Measurement saved.");
      setEditingMeasurement(null);
      form.reset(defaultValues);
      await queryClient.invalidateQueries({ queryKey: ["measurements"] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => measurementApi.remove(id),
    onSuccess: async () => {
      setStatusMessage("Measurement deleted.");
      if (editingMeasurement) {
        setEditingMeasurement(null);
        form.reset(defaultValues);
      }
      await queryClient.invalidateQueries({ queryKey: ["measurements"] });
    },
  });
  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementSchema),
    defaultValues,
  });

  useEffect(() => {
    if (editingMeasurement) {
      form.reset(toFormValues(editingMeasurement));
    }
  }, [editingMeasurement, form]);

  async function onSubmit(values: MeasurementFormValues) {
    setStatusMessage(null);
    await saveMutation.mutateAsync({ id: editingMeasurement?.id ?? null, payload: values });
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this measurement entry?")) {
      return;
    }
    setStatusMessage(null);
    await deleteMutation.mutateAsync(id);
  }

  function handleCancelEdit() {
    setEditingMeasurement(null);
    form.reset(defaultValues);
    setStatusMessage(null);
  }

  const measurements = measurementsQuery.data ?? [];
  const latestMeasurement = measurements[0] ?? null;
  const mutationError =
    saveMutation.error instanceof ApiError
      ? saveMutation.error.message
      : deleteMutation.error instanceof ApiError
        ? deleteMutation.error.message
        : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Measurement check-ins</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink">Measurements</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/68">
          Capture the measurements you care about and let the app fill in the useful derived fields automatically.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Latest adjusted body fat</CardTitle>
            <CardDescription>Manual override wins when provided.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-ink">
            {formatValue(latestMeasurement?.adjusted_body_fat_pct ?? null, "%")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest waist</CardTitle>
            <CardDescription>Waist at navel from the newest check-in.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-ink">{formatValue(latestMeasurement?.waist_navel_cm ?? null, " cm")}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total check-ins</CardTitle>
            <CardDescription>Historical measurement entries stored so far.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-ink">{measurements.length}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{editingMeasurement ? "Edit measurement" : "Add measurement"}</CardTitle>
            <CardDescription>Derived fields are calculated on save. Blank fields stay blank.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="measurement-date">Date</Label>
                <Input id="measurement-date" type="date" {...form.register("date")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="measurement-neck">Neck (cm)</Label>
                <Input id="measurement-neck" type="number" step="0.1" {...form.register("neck_cm", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="measurement-waist-navel">Waist at navel (cm)</Label>
                <Input id="measurement-waist-navel" type="number" step="0.1" {...form.register("waist_navel_cm", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="measurement-waist-narrow">Waist at narrowest (cm)</Label>
                <Input id="measurement-waist-narrow" type="number" step="0.1" {...form.register("waist_narrow_cm", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="measurement-chest">Chest (cm)</Label>
                <Input id="measurement-chest" type="number" step="0.1" {...form.register("chest_cm", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="measurement-hips">Hips (cm)</Label>
                <Input id="measurement-hips" type="number" step="0.1" {...form.register("hips_cm", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="measurement-glutes">Glutes (cm)</Label>
                <Input id="measurement-glutes" type="number" step="0.1" {...form.register("glutes_cm", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="measurement-arm-relaxed">Arm relaxed (cm)</Label>
                <Input id="measurement-arm-relaxed" type="number" step="0.1" {...form.register("arm_relaxed_cm", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="measurement-arm-flexed">Arm flexed (cm)</Label>
                <Input id="measurement-arm-flexed" type="number" step="0.1" {...form.register("arm_flexed_cm", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="measurement-thigh-mid">Mid-thigh (cm)</Label>
                <Input id="measurement-thigh-mid" type="number" step="0.1" {...form.register("thigh_mid_cm", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="measurement-thigh-upper">Upper thigh (cm)</Label>
                <Input id="measurement-thigh-upper" type="number" step="0.1" {...form.register("thigh_upper_cm", optionalNumber)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="measurement-calf">Calf (cm)</Label>
                <Input id="measurement-calf" type="number" step="0.1" {...form.register("calf_cm", optionalNumber)} />
              </div>

              <div className="space-y-2 sm:col-span-2 xl:col-span-3">
                <Label htmlFor="measurement-adjusted-bf">Adjusted body fat override (%)</Label>
                <Input
                  id="measurement-adjusted-bf"
                  type="number"
                  step="0.1"
                  placeholder="Optional override for the calculated estimate"
                  {...form.register("adjusted_body_fat_pct", optionalNumber)}
                />
              </div>

              <div className="space-y-2 sm:col-span-2 xl:col-span-3">
                <Label htmlFor="measurement-notes">Notes</Label>
                <Textarea
                  id="measurement-notes"
                  placeholder="Lighting, hydration, or anything else that affects interpretation."
                  {...form.register("notes", { setValueAs: (value) => (value === "" ? null : value) })}
                />
              </div>

              <div className="sm:col-span-2 xl:col-span-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-ink/65">
                  {mutationError ? (
                    <span className="text-ember">{mutationError}</span>
                  ) : statusMessage ?? (
                    "Lean and fat mass are filled when there is a logged bodyweight on or before the measurement date."
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {editingMeasurement ? (
                    <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  ) : null}
                  <Button className="w-full sm:w-auto" disabled={saveMutation.isPending} type="submit">
                    {saveMutation.isPending ? "Saving..." : editingMeasurement ? "Update measurement" : "Save measurement"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Measurement history</CardTitle>
            <CardDescription>Each check-in keeps both the raw values and the calculated readout.</CardDescription>
          </CardHeader>
          <CardContent>
            {measurementsQuery.isLoading ? <p className="text-sm text-ink/65">Loading measurements...</p> : null}
            {!measurementsQuery.isLoading && measurements.length === 0 ? (
              <p className="text-sm leading-6 text-ink/65">
                No measurements yet. Add a check-in to start building body-fat and ratio history.
              </p>
            ) : null}

            {measurements.length > 0 ? (
              <div className="space-y-3">
                {measurements.map((measurement) => (
                  <div className="rounded-[24px] border border-ink/10 bg-white/80 p-4 sm:p-5" key={measurement.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Check-in</p>
                        <p className="mt-2 text-xl font-semibold text-ink">{formatDate(measurement.date)}</p>
                        <p className="mt-1 text-sm text-ink/60">Waist {formatValue(measurement.waist_navel_cm, " cm")}</p>
                      </div>
                      <div className="rounded-full bg-canvas px-3 py-2 text-sm font-semibold text-ink">
                        Adjusted BF {formatValue(measurement.adjusted_body_fat_pct, "%")}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MetricCard label="Navy BF" value={formatValue(measurement.navy_body_fat_pct, "%")} />
                      <MetricCard label="Lean mass" value={formatValue(measurement.lean_mass_kg, " kg")} />
                      <MetricCard label="Fat mass" value={formatValue(measurement.fat_mass_kg, " kg")} />
                      <MetricCard label="Chest:waist" value={formatValue(measurement.chest_waist_ratio)} />
                    </div>

                    {measurement.notes ? <p className="mt-4 text-sm leading-6 text-ink/65">{measurement.notes}</p> : null}

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={() => setEditingMeasurement(measurement)}>
                        Edit
                      </Button>
                      <Button
                        className="w-full sm:w-auto"
                        type="button"
                        variant="ghost"
                        onClick={() => handleDelete(measurement.id)}
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
