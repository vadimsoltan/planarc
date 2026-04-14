import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { z } from "zod";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { ApiError, dailyLogApi, measurementApi, workoutApi } from "../lib/api";
import type { DailyLog, DailyLogPayload, Measurement, MeasurementPayload, Workout, WorkoutPayload } from "../lib/types";

const workoutTypes = [
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "legs", label: "Legs" },
  { value: "upper", label: "Upper" },
  { value: "lower", label: "Lower" },
  { value: "custom", label: "Custom" },
] as const;

const exerciseCategories = [
  { value: "compound", label: "Compound" },
  { value: "isolation", label: "Isolation" },
  { value: "cardio", label: "Cardio" },
  { value: "core", label: "Core" },
] as const;

const todayString = new Date().toISOString().slice(0, 10);

const optionalNumber = {
  setValueAs: (value: string) => (value === "" ? null : Number(value)),
};

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

const workoutSetSchema = z.object({
  set_number: z.number().int().min(1).max(100),
  weight: z.number().min(0).max(2000),
  reps: z.number().int().min(0).max(1000),
  rir: z.number().min(0).max(10).nullable(),
  notes: z.string().max(4000).nullable(),
});

const workoutExerciseSchema = z
  .object({
    exercise_name: z.string().min(1, "Exercise name is required").max(120),
    exercise_order: z.number().int().min(1).max(100),
    category: z.enum(["compound", "isolation", "cardio", "core"]),
    sets: z.array(workoutSetSchema).min(1, "Add at least one set"),
  })
  .superRefine((value, ctx) => {
    const setNumbers = value.sets.map((setEntry) => setEntry.set_number);
    if (new Set(setNumbers).size !== setNumbers.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Set numbers must be unique within an exercise.",
        path: ["sets"],
      });
    }
  });

const workoutSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    workout_type: z.enum(["push", "pull", "legs", "upper", "lower", "custom"]),
    duration_minutes: z.number().int().min(0).max(1440).nullable(),
    notes: z.string().max(4000).nullable(),
    exercises: z.array(workoutExerciseSchema).min(1, "Add at least one exercise"),
  })
  .superRefine((value, ctx) => {
    const exerciseOrders = value.exercises.map((exercise) => exercise.exercise_order);
    if (new Set(exerciseOrders).size !== exerciseOrders.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exercise order values must be unique within a workout.",
        path: ["exercises"],
      });
    }
  });

type DailyLogFormValues = z.infer<typeof dailyLogSchema>;
type MeasurementFormValues = z.infer<typeof measurementSchema>;
type WorkoutFormValues = z.infer<typeof workoutSchema>;

function createDefaultDailyLog(date: string): DailyLogFormValues {
  return {
    date,
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
}

function createDefaultMeasurement(date: string): MeasurementFormValues {
  return {
    date,
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
}

function createEmptySet(setNumber: number): WorkoutFormValues["exercises"][number]["sets"][number] {
  return {
    set_number: setNumber,
    weight: 0,
    reps: 0,
    rir: null,
    notes: null,
  };
}

function createEmptyExercise(exerciseOrder: number): WorkoutFormValues["exercises"][number] {
  return {
    exercise_name: "",
    exercise_order: exerciseOrder,
    category: "compound",
    sets: [createEmptySet(1)],
  };
}

function createDefaultWorkout(date: string): WorkoutFormValues {
  return {
    date,
    workout_type: "push",
    duration_minutes: null,
    notes: null,
    exercises: [createEmptyExercise(1)],
  };
}

function toDailyLogFormValues(log: DailyLog): DailyLogFormValues {
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

function toMeasurementFormValues(measurement: Measurement): MeasurementFormValues {
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

function toWorkoutFormValues(workout: Workout): WorkoutFormValues {
  return {
    date: workout.date,
    workout_type: workout.workout_type,
    duration_minutes: workout.duration_minutes,
    notes: workout.notes,
    exercises: workout.exercises.map((exercise) => ({
      exercise_name: exercise.exercise_name,
      exercise_order: exercise.exercise_order,
      category: exercise.category,
      sets: exercise.sets.map((setEntry) => ({
        set_number: setEntry.set_number,
        weight: setEntry.weight,
        reps: setEntry.reps,
        rir: setEntry.rir,
        notes: setEntry.notes,
      })),
    })),
  };
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

function formatValue(value: number | string | null, suffix = "") {
  if (value == null || value === "") {
    return "--";
  }
  return `${value}${suffix}`;
}

function formatWorkoutType(value: string) {
  return workoutTypes.find((item) => item.value === value)?.label ?? value;
}

function completionLabel(saved: boolean) {
  return saved ? "Saved" : "Open";
}

function SectionBadge({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="rounded-full bg-canvas px-3 py-2 text-sm font-semibold text-ink">
      {label}: {completionLabel(complete)}
    </div>
  );
}

type ExerciseEditorProps = {
  index: number;
  control: Control<WorkoutFormValues>;
  register: UseFormRegister<WorkoutFormValues>;
  setValue: UseFormSetValue<WorkoutFormValues>;
  onRemove: () => void;
  removeDisabled: boolean;
};

function ExerciseEditor({ index, control, register, setValue, onRemove, removeDisabled }: ExerciseEditorProps) {
  const setsFieldArray = useFieldArray({
    control,
    name: `exercises.${index}.sets` as const,
  });

  useEffect(() => {
    setValue(`exercises.${index}.exercise_order`, index + 1, { shouldDirty: false });
    setsFieldArray.fields.forEach((_, setIndex) => {
      setValue(`exercises.${index}.sets.${setIndex}.set_number` as const, setIndex + 1, { shouldDirty: false });
    });
  }, [index, setValue, setsFieldArray.fields.length]);

  return (
    <div className="rounded-[24px] border border-ink/10 bg-canvas/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Exercise {index + 1}</p>
          <p className="mt-1 text-sm text-ink/60">Keep this light: just the exercise and the key sets.</p>
        </div>
        <Button className="w-full sm:w-auto" disabled={removeDisabled} onClick={onRemove} type="button" variant="ghost">
          Remove
        </Button>
      </div>

      <input type="hidden" {...register(`exercises.${index}.exercise_order` as const, { valueAsNumber: true })} />

      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
        <div className="space-y-2">
          <Label htmlFor={`check-in-exercise-name-${index}`}>Exercise name</Label>
          <Input id={`check-in-exercise-name-${index}`} placeholder="Incline Smith Bench" {...register(`exercises.${index}.exercise_name` as const)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`check-in-exercise-category-${index}`}>Category</Label>
          <select
            className="h-12 w-full rounded-2xl border border-ink/15 bg-white/80 px-4 text-base text-ink outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20 md:h-11 md:text-sm"
            id={`check-in-exercise-category-${index}`}
            {...register(`exercises.${index}.category` as const)}
          >
            {exerciseCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {setsFieldArray.fields.map((setField, setIndex) => (
          <div className="rounded-2xl border border-ink/10 bg-white/80 p-4" key={setField.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-ink">Set {setIndex + 1}</p>
              <Button
                className="w-full sm:w-auto"
                disabled={setsFieldArray.fields.length === 1}
                onClick={() => setsFieldArray.remove(setIndex)}
                type="button"
                variant="ghost"
              >
                Remove set
              </Button>
            </div>

            <input
              type="hidden"
              {...register(`exercises.${index}.sets.${setIndex}.set_number` as const, {
                valueAsNumber: true,
              })}
            />

            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor={`check-in-exercise-${index}-set-${setIndex}-weight`}>Weight</Label>
                <Input
                  id={`check-in-exercise-${index}-set-${setIndex}-weight`}
                  step="0.1"
                  type="number"
                  {...register(`exercises.${index}.sets.${setIndex}.weight` as const, { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`check-in-exercise-${index}-set-${setIndex}-reps`}>Reps</Label>
                <Input
                  id={`check-in-exercise-${index}-set-${setIndex}-reps`}
                  type="number"
                  {...register(`exercises.${index}.sets.${setIndex}.reps` as const, { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`check-in-exercise-${index}-set-${setIndex}-rir`}>RIR</Label>
                <Input
                  id={`check-in-exercise-${index}-set-${setIndex}-rir`}
                  step="0.5"
                  type="number"
                  {...register(`exercises.${index}.sets.${setIndex}.rir` as const, optionalNumber)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`check-in-exercise-${index}-set-${setIndex}-notes`}>Set notes</Label>
                <Input
                  id={`check-in-exercise-${index}-set-${setIndex}-notes`}
                  placeholder="Tempo, pause, failure, etc."
                  {...register(`exercises.${index}.sets.${setIndex}.notes` as const, {
                    setValueAs: (value) => (value === "" ? null : value),
                  })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Button
          className="w-full sm:w-auto"
          onClick={() => setsFieldArray.append(createEmptySet(setsFieldArray.fields.length + 1))}
          type="button"
          variant="outline"
        >
          Add set
        </Button>
      </div>
    </div>
  );
}

export function CheckInPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(todayString);
  const [logStatusMessage, setLogStatusMessage] = useState<string | null>(null);
  const [measurementStatusMessage, setMeasurementStatusMessage] = useState<string | null>(null);
  const [workoutStatusMessage, setWorkoutStatusMessage] = useState<string | null>(null);

  const dailyLogsQuery = useQuery({
    queryKey: ["daily-logs"],
    queryFn: () => dailyLogApi.list(),
  });
  const measurementsQuery = useQuery({
    queryKey: ["measurements"],
    queryFn: () => measurementApi.list(),
  });
  const workoutsQuery = useQuery({
    queryKey: ["workouts"],
    queryFn: () => workoutApi.list(),
  });

  const dailyLogForm = useForm<DailyLogFormValues>({
    resolver: zodResolver(dailyLogSchema),
    defaultValues: createDefaultDailyLog(selectedDate),
  });
  const measurementForm = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementSchema),
    defaultValues: createDefaultMeasurement(selectedDate),
  });
  const workoutForm = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutSchema),
    defaultValues: createDefaultWorkout(selectedDate),
  });
  const workoutExercisesFieldArray = useFieldArray({
    control: workoutForm.control,
    name: "exercises",
  });

  useEffect(() => {
    workoutExercisesFieldArray.fields.forEach((_, index) => {
      workoutForm.setValue(`exercises.${index}.exercise_order`, index + 1, { shouldDirty: false });
    });
  }, [workoutExercisesFieldArray.fields.length, workoutForm]);

  const logs = dailyLogsQuery.data ?? [];
  const measurements = measurementsQuery.data ?? [];
  const workouts = workoutsQuery.data ?? [];
  const selectedLog = logs.find((log) => log.date === selectedDate) ?? null;
  const selectedMeasurement = measurements.find((measurement) => measurement.date === selectedDate) ?? null;
  const selectedWorkout = workouts.find((workout) => workout.date === selectedDate) ?? null;

  useEffect(() => {
    dailyLogForm.reset(selectedLog ? toDailyLogFormValues(selectedLog) : createDefaultDailyLog(selectedDate));
  }, [dailyLogForm, selectedDate, selectedLog]);

  useEffect(() => {
    measurementForm.reset(selectedMeasurement ? toMeasurementFormValues(selectedMeasurement) : createDefaultMeasurement(selectedDate));
  }, [measurementForm, selectedDate, selectedMeasurement]);

  useEffect(() => {
    workoutForm.reset(selectedWorkout ? toWorkoutFormValues(selectedWorkout) : createDefaultWorkout(selectedDate));
  }, [selectedDate, selectedWorkout, workoutForm]);

  const saveLogMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: DailyLogPayload }) =>
      id == null ? dailyLogApi.create(payload) : dailyLogApi.update(id, payload),
    onSuccess: async () => {
      setLogStatusMessage(selectedLog ? "Daily inputs updated." : "Daily inputs saved.");
      await queryClient.invalidateQueries({ queryKey: ["daily-logs"] });
    },
  });

  const saveMeasurementMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: MeasurementPayload }) =>
      id == null ? measurementApi.create(payload) : measurementApi.update(id, payload),
    onSuccess: async () => {
      setMeasurementStatusMessage(selectedMeasurement ? "Measurements updated." : "Measurements saved.");
      await queryClient.invalidateQueries({ queryKey: ["measurements"] });
    },
  });

  const saveWorkoutMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: WorkoutPayload }) =>
      id == null ? workoutApi.create(payload) : workoutApi.update(id, payload),
    onSuccess: async () => {
      setWorkoutStatusMessage(selectedWorkout ? "Workout updated." : "Workout saved.");
      await queryClient.invalidateQueries({ queryKey: ["workouts"] });
    },
  });

  const dailyMutationError = saveLogMutation.error instanceof ApiError ? saveLogMutation.error.message : null;
  const measurementMutationError = saveMeasurementMutation.error instanceof ApiError ? saveMeasurementMutation.error.message : null;
  const workoutMutationError = saveWorkoutMutation.error instanceof ApiError ? saveWorkoutMutation.error.message : null;

  async function handleSaveDailyLog(values: DailyLogFormValues) {
    setLogStatusMessage(null);
    await saveLogMutation.mutateAsync({ id: selectedLog?.id ?? null, payload: values });
  }

  async function handleSaveMeasurements(values: MeasurementFormValues) {
    setMeasurementStatusMessage(null);
    await saveMeasurementMutation.mutateAsync({ id: selectedMeasurement?.id ?? null, payload: values });
  }

  async function handleSaveWorkout(values: WorkoutFormValues) {
    setWorkoutStatusMessage(null);
    await saveWorkoutMutation.mutateAsync({ id: selectedWorkout?.id ?? null, payload: values });
  }

  const recentDates = useMemo(() => {
    const allDates = new Set<string>();
    logs.forEach((log) => allDates.add(log.date));
    measurements.forEach((measurement) => allDates.add(measurement.date));
    workouts.forEach((workout) => allDates.add(workout.date));
    return [...allDates].sort((left, right) => right.localeCompare(left)).slice(0, 6);
  }, [logs, measurements, workouts]);

  const recentWeight = selectedLog?.weight_kg ?? logs.find((log) => log.weight_kg != null)?.weight_kg ?? null;
  const selectedWaist = selectedMeasurement?.waist_navel_cm ?? null;
  const selectedWorkoutSummary = selectedWorkout
    ? `${formatWorkoutType(selectedWorkout.workout_type)} • ${selectedWorkout.exercises.length} exercise${selectedWorkout.exercises.length === 1 ? "" : "s"}`
    : "No workout logged";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Check-in</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink">Daily check-in</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/68">
          One page for the daily essentials: weight, food, measurements, and training for the same date.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Selected day</CardTitle>
              <CardDescription>Everything on this page saves against one date.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <Label htmlFor="check-in-date">Date</Label>
                  <Input
                    id="check-in-date"
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <SectionBadge label="Daily inputs" complete={Boolean(selectedLog)} />
                  <SectionBadge label="Measurements" complete={Boolean(selectedMeasurement)} />
                  <SectionBadge label="Workout" complete={Boolean(selectedWorkout)} />
                </div>
              </div>

              {recentDates.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Recent days</p>
                  <div className="flex flex-wrap gap-2">
                    {recentDates.map((date) => (
                      <button
                        className={[
                          "rounded-full px-4 py-2 text-sm font-semibold transition",
                          date === selectedDate ? "bg-ink text-white" : "bg-canvas text-ink hover:bg-white",
                        ].join(" ")}
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        type="button"
                      >
                        {formatDate(date)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily inputs</CardTitle>
              <CardDescription>Weight, food, steps, and recovery in the simplest possible daily view.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={dailyLogForm.handleSubmit(handleSaveDailyLog)}>
                <input type="hidden" {...dailyLogForm.register("date")} />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="check-in-weight">Morning weight (kg)</Label>
                    <Input id="check-in-weight" type="number" step="0.1" {...dailyLogForm.register("weight_kg", optionalNumber)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check-in-calories">Calories</Label>
                    <Input id="check-in-calories" type="number" {...dailyLogForm.register("calories", optionalNumber)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check-in-protein">Protein (g)</Label>
                    <Input id="check-in-protein" type="number" step="0.1" {...dailyLogForm.register("protein_g", optionalNumber)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check-in-steps">Steps</Label>
                    <Input id="check-in-steps" type="number" {...dailyLogForm.register("steps", optionalNumber)} />
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3">
                  <input id="check-in-training-day" className="h-4 w-4 accent-ember" type="checkbox" {...dailyLogForm.register("is_training_day")} />
                  <Label htmlFor="check-in-training-day" className="cursor-pointer">
                    Training day
                  </Label>
                </div>

                <details className="rounded-[24px] border border-ink/10 bg-white/70 p-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    More food and recovery fields
                  </summary>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="check-in-carbs">Carbs (g)</Label>
                      <Input id="check-in-carbs" type="number" step="0.1" {...dailyLogForm.register("carbs_g", optionalNumber)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-in-fat">Fat (g)</Label>
                      <Input id="check-in-fat" type="number" step="0.1" {...dailyLogForm.register("fat_g", optionalNumber)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-in-sleep">Sleep hours</Label>
                      <Input id="check-in-sleep" type="number" step="0.1" {...dailyLogForm.register("sleep_hours", optionalNumber)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-in-cardio-minutes">Cardio minutes</Label>
                      <Input id="check-in-cardio-minutes" type="number" {...dailyLogForm.register("cardio_minutes", optionalNumber)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-in-cardio-type">Cardio type</Label>
                      <Input
                        id="check-in-cardio-type"
                        placeholder="Incline walk, bike, etc."
                        {...dailyLogForm.register("cardio_type", { setValueAs: (value) => (value === "" ? null : value) })}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2 xl:col-span-3">
                      <Label htmlFor="check-in-notes">Notes</Label>
                      <Textarea
                        id="check-in-notes"
                        placeholder="Energy, hunger, recovery, or anything else worth noting."
                        {...dailyLogForm.register("notes", { setValueAs: (value) => (value === "" ? null : value) })}
                      />
                    </div>
                  </div>
                </details>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-ink/65">
                    {dailyMutationError ? <span className="text-ember">{dailyMutationError}</span> : logStatusMessage ?? "Save the daily essentials for this date."}
                  </div>
                  <Button className="w-full sm:w-auto" disabled={saveLogMutation.isPending} type="submit">
                    {saveLogMutation.isPending ? "Saving..." : selectedLog ? "Update daily inputs" : "Save daily inputs"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Measurements</CardTitle>
              <CardDescription>Keep the visible fields focused on the markers that change the plan fastest.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={measurementForm.handleSubmit(handleSaveMeasurements)}>
                <input type="hidden" {...measurementForm.register("date")} />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="check-in-waist">Waist at navel (cm)</Label>
                    <Input id="check-in-waist" type="number" step="0.1" {...measurementForm.register("waist_navel_cm", optionalNumber)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check-in-neck">Neck (cm)</Label>
                    <Input id="check-in-neck" type="number" step="0.1" {...measurementForm.register("neck_cm", optionalNumber)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check-in-chest">Chest (cm)</Label>
                    <Input id="check-in-chest" type="number" step="0.1" {...measurementForm.register("chest_cm", optionalNumber)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check-in-adjusted-bf">Adjusted body fat (%)</Label>
                    <Input id="check-in-adjusted-bf" type="number" step="0.1" {...measurementForm.register("adjusted_body_fat_pct", optionalNumber)} />
                  </div>
                </div>

                <details className="rounded-[24px] border border-ink/10 bg-white/70 p-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    More measurement fields
                  </summary>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="check-in-waist-narrow">Waist at narrowest (cm)</Label>
                      <Input id="check-in-waist-narrow" type="number" step="0.1" {...measurementForm.register("waist_narrow_cm", optionalNumber)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-in-hips">Hips (cm)</Label>
                      <Input id="check-in-hips" type="number" step="0.1" {...measurementForm.register("hips_cm", optionalNumber)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-in-glutes">Glutes (cm)</Label>
                      <Input id="check-in-glutes" type="number" step="0.1" {...measurementForm.register("glutes_cm", optionalNumber)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-in-arm-relaxed">Arm relaxed (cm)</Label>
                      <Input id="check-in-arm-relaxed" type="number" step="0.1" {...measurementForm.register("arm_relaxed_cm", optionalNumber)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-in-arm-flexed">Arm flexed (cm)</Label>
                      <Input id="check-in-arm-flexed" type="number" step="0.1" {...measurementForm.register("arm_flexed_cm", optionalNumber)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-in-thigh-mid">Mid-thigh (cm)</Label>
                      <Input id="check-in-thigh-mid" type="number" step="0.1" {...measurementForm.register("thigh_mid_cm", optionalNumber)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-in-thigh-upper">Upper thigh (cm)</Label>
                      <Input id="check-in-thigh-upper" type="number" step="0.1" {...measurementForm.register("thigh_upper_cm", optionalNumber)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-in-calf">Calf (cm)</Label>
                      <Input id="check-in-calf" type="number" step="0.1" {...measurementForm.register("calf_cm", optionalNumber)} />
                    </div>
                    <div className="space-y-2 sm:col-span-2 xl:col-span-3">
                      <Label htmlFor="check-in-measurement-notes">Notes</Label>
                      <Textarea
                        id="check-in-measurement-notes"
                        placeholder="Lighting, hydration, pump, or anything else that affects interpretation."
                        {...measurementForm.register("notes", { setValueAs: (value) => (value === "" ? null : value) })}
                      />
                    </div>
                  </div>
                </details>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-ink/65">
                    {measurementMutationError ? (
                      <span className="text-ember">{measurementMutationError}</span>
                    ) : measurementStatusMessage ?? (
                      "Save measurements only when you take them."
                    )}
                  </div>
                  <Button className="w-full sm:w-auto" disabled={saveMeasurementMutation.isPending} type="submit">
                    {saveMeasurementMutation.isPending ? "Saving..." : selectedMeasurement ? "Update measurements" : "Save measurements"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workout</CardTitle>
              <CardDescription>Only open this section when you trained. The rest of the check-in stays simple.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={workoutForm.handleSubmit(handleSaveWorkout)}>
                <input type="hidden" {...workoutForm.register("date")} />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
                  <div className="space-y-2">
                    <Label htmlFor="check-in-workout-type">Workout type</Label>
                    <select
                      className="h-12 w-full rounded-2xl border border-ink/15 bg-white/80 px-4 text-base text-ink outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20 md:h-11 md:text-sm"
                      id="check-in-workout-type"
                      {...workoutForm.register("workout_type")}
                    >
                      {workoutTypes.map((workoutType) => (
                        <option key={workoutType.value} value={workoutType.value}>
                          {workoutType.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check-in-workout-duration">Duration (min)</Label>
                    <Input id="check-in-workout-duration" type="number" {...workoutForm.register("duration_minutes", optionalNumber)} />
                  </div>
                  <div className="space-y-2 sm:col-span-2 xl:col-span-1">
                    <Label htmlFor="check-in-workout-notes">Session notes</Label>
                    <Input
                      id="check-in-workout-notes"
                      placeholder="Energy, swaps, or context"
                      {...workoutForm.register("notes", { setValueAs: (value) => (value === "" ? null : value) })}
                    />
                  </div>
                </div>

                <details className="rounded-[24px] border border-ink/10 bg-white/70 p-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    Exercise sets
                  </summary>
                  <div className="mt-4 space-y-4">
                    {workoutExercisesFieldArray.fields.map((exerciseField, index) => (
                      <ExerciseEditor
                        control={workoutForm.control}
                        index={index}
                        key={exerciseField.id}
                        onRemove={() => workoutExercisesFieldArray.remove(index)}
                        register={workoutForm.register}
                        removeDisabled={workoutExercisesFieldArray.fields.length === 1}
                        setValue={workoutForm.setValue}
                      />
                    ))}

                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => workoutExercisesFieldArray.append(createEmptyExercise(workoutExercisesFieldArray.fields.length + 1))}
                      type="button"
                      variant="outline"
                    >
                      Add exercise
                    </Button>
                  </div>
                </details>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-ink/65">
                    {workoutMutationError ? (
                      <span className="text-ember">{workoutMutationError}</span>
                    ) : workoutStatusMessage ?? (
                      "Skip this section on rest days."
                    )}
                  </div>
                  <Button className="w-full sm:w-auto" disabled={saveWorkoutMutation.isPending} type="submit">
                    {saveWorkoutMutation.isPending ? "Saving..." : selectedWorkout ? "Update workout" : "Save workout"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Selected day status</CardTitle>
              <CardDescription>The current day at a glance, without leaving the page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[24px] border border-ink/10 bg-white/75 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Date</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{formatDate(selectedDate)}</p>
              </div>

              <div className="grid gap-3">
                <StatLine label="Weight" value={formatValue(recentWeight, " kg")} />
                <StatLine label="Waist" value={formatValue(selectedWaist, " cm")} />
                <StatLine label="Workout" value={selectedWorkoutSummary} />
                <StatLine label="Training day" value={dailyLogForm.watch("is_training_day") ? "Yes" : "No"} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What is saved</CardTitle>
              <CardDescription>Use this to see what is still missing for the selected day.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusRow title="Daily inputs" description={selectedLog ? "Weight, food, and recovery are saved." : "No daily inputs saved yet."} complete={Boolean(selectedLog)} />
              <StatusRow
                title="Measurements"
                description={selectedMeasurement ? "A measurement check-in exists for this date." : "No measurements saved yet."}
                complete={Boolean(selectedMeasurement)}
              />
              <StatusRow
                title="Workout"
                description={selectedWorkout ? `${formatWorkoutType(selectedWorkout.workout_type)} workout saved.` : "No workout saved yet."}
                complete={Boolean(selectedWorkout)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-canvas px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">{label}</p>
      <p className="mt-2 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function StatusRow({ title, description, complete }: { title: string; description: string; complete: boolean }) {
  return (
    <div className="rounded-[24px] border border-ink/10 bg-white/75 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-sm leading-6 text-ink/60">{description}</p>
        </div>
        <span className={["rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]", complete ? "bg-moss/15 text-moss" : "bg-canvas text-ink/55"].join(" ")}>
          {complete ? "Saved" : "Open"}
        </span>
      </div>
    </div>
  );
}
