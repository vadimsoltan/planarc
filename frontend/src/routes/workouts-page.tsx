import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { z } from "zod";

import { TrendChartCard } from "../components/dashboard/trend-chart-card";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { ApiError, analyticsApi, workoutApi } from "../lib/api";
import type { Workout, WorkoutPayload } from "../lib/types";

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

type WorkoutFormValues = z.infer<typeof workoutSchema>;

const todayString = new Date().toISOString().slice(0, 10);

const optionalNumber = {
  setValueAs: (value: string) => (value === "" ? null : Number(value)),
};

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

const defaultValues: WorkoutFormValues = {
  date: todayString,
  workout_type: "push",
  duration_minutes: null,
  notes: null,
  exercises: [createEmptyExercise(1)],
};

function toFormValues(workout: Workout): WorkoutFormValues {
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

function formatWorkoutType(value: string) {
  return workoutTypes.find((item) => item.value === value)?.label ?? value;
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
    <Card className="border border-ink/10 bg-canvas/65 shadow-none">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Exercise {index + 1}</CardTitle>
          <CardDescription>Name the movement once, then add the sets underneath.</CardDescription>
        </div>

        <Button className="w-full sm:w-auto" disabled={removeDisabled} onClick={onRemove} type="button" variant="ghost">
          Remove exercise
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <input type="hidden" {...register(`exercises.${index}.exercise_order` as const, { valueAsNumber: true })} />

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div className="space-y-2">
            <Label htmlFor={`exercise-name-${index}`}>Exercise name</Label>
            <Input id={`exercise-name-${index}`} placeholder="Incline Smith Bench" {...register(`exercises.${index}.exercise_name` as const)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`exercise-category-${index}`}>Category</Label>
            <select
              className="h-12 w-full rounded-2xl border border-ink/15 bg-white/80 px-4 text-base text-ink outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20 md:h-11 md:text-sm"
              id={`exercise-category-${index}`}
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

        <div className="space-y-3">
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
                  <Label htmlFor={`exercise-${index}-set-${setIndex}-weight`}>Weight</Label>
                  <Input
                    id={`exercise-${index}-set-${setIndex}-weight`}
                    step="0.1"
                    type="number"
                    {...register(`exercises.${index}.sets.${setIndex}.weight` as const, { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`exercise-${index}-set-${setIndex}-reps`}>Reps</Label>
                  <Input
                    id={`exercise-${index}-set-${setIndex}-reps`}
                    type="number"
                    {...register(`exercises.${index}.sets.${setIndex}.reps` as const, { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`exercise-${index}-set-${setIndex}-rir`}>RIR</Label>
                  <Input
                    id={`exercise-${index}-set-${setIndex}-rir`}
                    step="0.5"
                    type="number"
                    {...register(`exercises.${index}.sets.${setIndex}.rir` as const, optionalNumber)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`exercise-${index}-set-${setIndex}-notes`}>Set notes</Label>
                  <Input
                    id={`exercise-${index}-set-${setIndex}-notes`}
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

        <Button
          className="w-full sm:w-auto"
          onClick={() => setsFieldArray.append(createEmptySet(setsFieldArray.fields.length + 1))}
          type="button"
          variant="outline"
        >
          Add set
        </Button>
      </CardContent>
    </Card>
  );
}

export function WorkoutsPage() {
  const queryClient = useQueryClient();
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const workoutsQuery = useQuery({
    queryKey: ["workouts"],
    queryFn: () => workoutApi.list(),
  });
  const strengthQuery = useQuery({
    queryKey: ["analytics", "strength"],
    queryFn: analyticsApi.getStrength,
  });
  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: WorkoutPayload }) =>
      id == null ? workoutApi.create(payload) : workoutApi.update(id, payload),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => workoutApi.remove(id),
  });
  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutSchema),
    defaultValues,
  });
  const exercisesFieldArray = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  useEffect(() => {
    exercisesFieldArray.fields.forEach((_, index) => {
      form.setValue(`exercises.${index}.exercise_order`, index + 1, { shouldDirty: false });
    });
  }, [exercisesFieldArray.fields.length, form]);

  const workouts = workoutsQuery.data ?? [];
  const strengthExercises = strengthQuery.data?.exercises ?? [];

  useEffect(() => {
    if (editingWorkout) {
      form.reset(toFormValues(editingWorkout));
    }
  }, [editingWorkout, form]);

  useEffect(() => {
    if (workouts.length === 0) {
      if (selectedWorkoutId !== null) {
        setSelectedWorkoutId(null);
      }
      return;
    }

    const selectedExists = selectedWorkoutId != null && workouts.some((workout) => workout.id === selectedWorkoutId);
    if (!selectedExists) {
      setSelectedWorkoutId(workouts[0].id);
    }
  }, [selectedWorkoutId, workouts]);

  useEffect(() => {
    if (strengthExercises.length === 0) {
      if (selectedExerciseName !== null) {
        setSelectedExerciseName(null);
      }
      return;
    }

    const selectedExists =
      selectedExerciseName != null && strengthExercises.some((exercise) => exercise.exercise_name === selectedExerciseName);
    if (!selectedExists) {
      setSelectedExerciseName(strengthExercises[0].exercise_name);
    }
  }, [selectedExerciseName, strengthExercises]);

  async function onSubmit(values: WorkoutFormValues) {
    setStatusMessage(null);
    const savedWorkout = await saveMutation.mutateAsync({ id: editingWorkout?.id ?? null, payload: values });
    setStatusMessage(editingWorkout ? "Workout updated." : "Workout saved.");
    setEditingWorkout(null);
    form.reset(defaultValues);
    setSelectedWorkoutId(savedWorkout.id);
    setSelectedExerciseName(savedWorkout.exercises[0]?.exercise_name ?? null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["workouts"] }),
      queryClient.invalidateQueries({ queryKey: ["analytics", "strength"] }),
    ]);
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this workout?")) {
      return;
    }
    setStatusMessage(null);
    await deleteMutation.mutateAsync(id);
    setStatusMessage("Workout deleted.");
    if (editingWorkout?.id === id) {
      setEditingWorkout(null);
      form.reset(defaultValues);
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["workouts"] }),
      queryClient.invalidateQueries({ queryKey: ["analytics", "strength"] }),
    ]);
  }

  function handleCancelEdit() {
    setEditingWorkout(null);
    form.reset(defaultValues);
    setStatusMessage(null);
  }

  function handleEditWorkout(workout: Workout) {
    setEditingWorkout(workout);
    setSelectedWorkoutId(workout.id);
    setSelectedExerciseName(workout.exercises[0]?.exercise_name ?? null);
    setStatusMessage(null);
  }

  const selectedWorkout = workouts.find((workout) => workout.id === selectedWorkoutId) ?? null;
  const selectedStrength = strengthExercises.find((exercise) => exercise.exercise_name === selectedExerciseName) ?? null;
  const totalSets = workouts.reduce(
    (sum, workout) => sum + workout.exercises.reduce((exerciseSum, exercise) => exerciseSum + exercise.sets.length, 0),
    0,
  );
  const topRecovery = strengthExercises.reduce<number | null>((best, exercise) => {
    if (exercise.strength_recovery_pct == null) {
      return best;
    }
    if (best == null || exercise.strength_recovery_pct > best) {
      return exercise.strength_recovery_pct;
    }
    return best;
  }, null);
  const mutationError =
    saveMutation.error instanceof ApiError
      ? saveMutation.error.message
      : deleteMutation.error instanceof ApiError
        ? deleteMutation.error.message
        : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Training sessions</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink">Workout tracking</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/68">
          Log a session in one pass, then review the important pieces without getting buried in tables.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total sessions</CardTitle>
            <CardDescription>Saved workout sessions so far.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-ink">{workouts.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total sets</CardTitle>
            <CardDescription>All tracked sets across saved sessions.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-ink">{totalSets}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tracked exercises</CardTitle>
            <CardDescription>Distinct exercises with saved history.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-ink">{strengthExercises.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top recovery</CardTitle>
            <CardDescription>Best PR-baseline recovery among matched reference lifts.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-ink">{formatNumber(topRecovery, "%", 1)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{editingWorkout ? "Edit workout" : "Log workout"}</CardTitle>
            <CardDescription>Start with the session basics, then stack the exercises and sets below.</CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
                <div className="space-y-2">
                  <Label htmlFor="workout-date">Date</Label>
                  <Input id="workout-date" type="date" {...form.register("date")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workout-type">Workout type</Label>
                  <select
                    className="h-12 w-full rounded-2xl border border-ink/15 bg-white/80 px-4 text-base text-ink outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20 md:h-11 md:text-sm"
                    id="workout-type"
                    {...form.register("workout_type")}
                  >
                    {workoutTypes.map((workoutType) => (
                      <option key={workoutType.value} value={workoutType.value}>
                        {workoutType.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workout-duration">Duration (min)</Label>
                  <Input id="workout-duration" type="number" {...form.register("duration_minutes", optionalNumber)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workout-notes">Session notes</Label>
                <Textarea
                  id="workout-notes"
                  placeholder="Energy, setup changes, exercise swaps, or anything else worth remembering."
                  {...form.register("notes", { setValueAs: (value) => (value === "" ? null : value) })}
                />
              </div>

              <div className="space-y-4">
                {exercisesFieldArray.fields.map((exerciseField, index) => (
                  <ExerciseEditor
                    control={form.control}
                    index={index}
                    key={exerciseField.id}
                    onRemove={() => exercisesFieldArray.remove(index)}
                    register={form.register}
                    removeDisabled={exercisesFieldArray.fields.length === 1}
                    setValue={form.setValue}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => exercisesFieldArray.append(createEmptyExercise(exercisesFieldArray.fields.length + 1))}
                  type="button"
                  variant="outline"
                >
                  Add exercise
                </Button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-ink/65">
                  {mutationError ? (
                    <span className="text-ember">{mutationError}</span>
                  ) : statusMessage ?? (
                    "Estimated 1RM and strength recovery are derived from your saved sets."
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {editingWorkout ? (
                    <Button className="w-full sm:w-auto" onClick={handleCancelEdit} type="button" variant="outline">
                      Cancel
                    </Button>
                  ) : null}

                  <Button className="w-full sm:w-auto" disabled={saveMutation.isPending} type="submit">
                    {saveMutation.isPending ? "Saving..." : editingWorkout ? "Update workout" : "Save workout"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workout sessions</CardTitle>
              <CardDescription>Tap a session to inspect it, or jump straight into edit mode.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {workoutsQuery.isLoading ? <p className="text-sm text-ink/65">Loading workouts...</p> : null}
              {!workoutsQuery.isLoading && workouts.length === 0 ? (
                <p className="text-sm leading-6 text-ink/65">No workouts yet. Save your first session to start building exercise history.</p>
              ) : null}

              {workouts.map((workout) => {
                const isSelected = selectedWorkoutId === workout.id;
                const setCount = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
                return (
                  <div
                    className={[
                      "rounded-[24px] border px-4 py-4 transition",
                      isSelected ? "border-ember/50 bg-ember/8" : "border-ink/10 bg-white/70 hover:border-ink/20",
                    ].join(" ")}
                    key={workout.id}
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => setSelectedWorkoutId(workout.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedWorkoutId(workout.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">{formatWorkoutType(workout.workout_type)}</p>
                          <p className="mt-2 text-lg font-semibold text-ink">{workout.date}</p>
                          <p className="mt-1 text-sm text-ink/60">
                            {workout.exercises.length} exercises • {setCount} sets • {formatWhole(workout.duration_minutes, " min")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <Button
                        className="w-full sm:w-auto"
                        onClick={() => handleEditWorkout(workout)}
                        type="button"
                        variant="outline"
                      >
                        Edit
                      </Button>
                      <Button
                        className="w-full sm:w-auto"
                        onClick={async () => {
                          await handleDelete(workout.id);
                        }}
                        type="button"
                        variant="ghost"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session detail</CardTitle>
              <CardDescription>Nested exercise and set history for the selected workout.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {!selectedWorkout ? (
                <p className="text-sm leading-6 text-ink/65">Pick a saved workout to inspect the exercises, sets, and volume breakdown.</p>
              ) : (
                <>
                  <div className="rounded-[24px] bg-canvas/75 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">{formatWorkoutType(selectedWorkout.workout_type)}</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">{selectedWorkout.date}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/65">{selectedWorkout.notes ?? "No session notes saved."}</p>
                  </div>

                  <div className="space-y-4">
                    {selectedWorkout.exercises.map((exercise) => {
                      const totalVolume = exercise.sets.reduce((sum, setEntry) => sum + setEntry.weight * setEntry.reps, 0);
                      return (
                        <div className="rounded-[24px] border border-ink/10 bg-white/80 p-4" key={exercise.id}>
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">{exercise.category}</p>
                              <p className="mt-2 text-lg font-semibold text-ink">{exercise.exercise_name}</p>
                              <p className="mt-1 text-sm text-ink/60">
                                {exercise.sets.length} sets • {formatWhole(totalVolume, " volume")}
                              </p>
                            </div>

                            <Button className="w-full sm:w-auto" onClick={() => setSelectedExerciseName(exercise.exercise_name)} type="button" variant="outline">
                              View history
                            </Button>
                          </div>

                          <div className="mt-4 space-y-3">
                            {exercise.sets.map((setEntry) => (
                              <div className="rounded-2xl bg-canvas/75 p-4" key={setEntry.id}>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="text-sm font-semibold text-ink">Set {setEntry.set_number}</p>
                                  <p className="text-sm text-ink/60">RIR {setEntry.rir ?? "--"}</p>
                                </div>
                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                  <MetricDetail label="Weight" value={formatNumber(setEntry.weight, "", 1)} />
                                  <MetricDetail label="Reps" value={setEntry.reps.toString()} />
                                  <MetricDetail label="Notes" value={setEntry.notes ?? "--"} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Strength recovery</CardTitle>
            <CardDescription>Best current estimated 1RM versus the seeded reference anchors.</CardDescription>
          </CardHeader>

          <CardContent>
            {strengthQuery.isLoading ? <p className="text-sm text-ink/65">Loading exercise analytics...</p> : null}
            {!strengthQuery.isLoading && strengthExercises.length === 0 ? (
              <p className="text-sm leading-6 text-ink/65">Save a workout with sets to populate exercise trends and recovery percentages.</p>
            ) : null}

            {strengthExercises.length > 0 ? (
              <div className="space-y-3">
                {strengthExercises.map((exercise) => (
                  <div className="rounded-[24px] border border-ink/10 bg-white/80 p-4 sm:p-5" key={exercise.exercise_name}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                          {exercise.category ?? "Uncategorized"}
                        </p>
                        <p className="mt-2 text-xl font-semibold text-ink">{exercise.exercise_name}</p>
                        <p className="mt-1 text-sm text-ink/60">{exercise.total_sessions} logged session{exercise.total_sessions === 1 ? "" : "s"}</p>
                      </div>
                      <div className="rounded-full bg-canvas px-3 py-2 text-sm font-semibold text-ink">
                        Recovery {formatNumber(exercise.strength_recovery_pct, "%", 1)}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <MetricDetail label="Best 1RM" value={formatNumber(exercise.best_estimated_1rm, "", 2)} />
                      <MetricDetail label="Reference 1RM" value={formatNumber(exercise.reference_estimated_1rm, "", 2)} />
                      <MetricDetail label="Latest 1RM" value={formatNumber(exercise.latest_estimated_1rm, "", 2)} />
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <Button className="w-full sm:w-auto" onClick={() => setSelectedExerciseName(exercise.exercise_name)} type="button" variant="outline">
                        Inspect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selected exercise</CardTitle>
            <CardDescription>Drill into one lift to inspect pace, volume, and recovery.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {!selectedStrength ? (
              <p className="text-sm leading-6 text-ink/65">Choose an exercise from the recovery list or a session card to inspect its trend.</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-canvas p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Exercise</p>
                    <p className="mt-2 text-xl font-semibold text-ink">{selectedStrength.exercise_name}</p>
                    <p className="mt-1 text-sm text-ink/60">{selectedStrength.category ?? "Uncategorized"}</p>
                  </div>

                  <div className="rounded-2xl bg-canvas p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Recovery</p>
                    <p className="mt-2 text-xl font-semibold text-ink">{formatNumber(selectedStrength.strength_recovery_pct, "%", 1)}</p>
                    <p className="mt-1 text-sm text-ink/60">
                      Best 1RM {formatNumber(selectedStrength.best_estimated_1rm, "", 2)} vs reference {formatNumber(selectedStrength.reference_estimated_1rm, "", 2)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <MetricDetail label="Latest 1RM" value={formatNumber(selectedStrength.latest_estimated_1rm, "", 2)} />
                  <MetricDetail label="Latest volume" value={formatWhole(selectedStrength.latest_volume, "")} />
                  <MetricDetail
                    label="Best set"
                    value={
                      selectedStrength.best_weight != null && selectedStrength.best_reps != null
                        ? `${selectedStrength.best_weight.toFixed(1)} x ${selectedStrength.best_reps}`
                        : "--"
                    }
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TrendChartCard
          title="Estimated 1RM trend"
          description="Best estimated 1RM by session for the selected exercise."
          data={selectedStrength?.history ?? []}
          emptyText="Pick an exercise with saved sessions to populate the strength trend."
          lines={[
            {
              key: "estimated_1rm",
              label: "Estimated 1RM",
              color: "#14213d",
              formatter: (value) => value.toFixed(2),
            },
          ]}
        />

        <TrendChartCard
          title="Volume trend"
          description="Session volume for the selected exercise based on saved sets."
          data={selectedStrength?.history ?? []}
          emptyText="Volume points will appear after the first saved session for a selected exercise."
          lines={[
            {
              key: "total_volume",
              label: "Volume",
              color: "#c86b3c",
              formatter: (value) => Math.round(value).toString(),
            },
          ]}
        />
      </div>
    </div>
  );
}

function MetricDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/75 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">{label}</p>
      <p className="mt-2 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
