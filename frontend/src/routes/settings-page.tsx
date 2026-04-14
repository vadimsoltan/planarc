import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { profileApi } from "../lib/api";
import type { ProfileUpdate } from "../lib/types";

const profileSchema = z.object({
  age: z.number().int().min(0).max(120),
  sex: z.enum(["male", "female", "other"]),
  height_cm: z.number().positive(),
  start_weight_kg: z.number().positive(),
  current_goal_weight_kg: z.number().positive(),
  adjusted_body_fat_current: z.number().min(0).max(100).nullable(),
  default_training_days_per_week: z.number().int().min(0).max(14),
  default_step_target: z.number().int().min(0).max(100000),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [saveState, setSaveState] = useState<string | null>(null);
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: profileApi.getProfile,
  });
  const mutation = useMutation({
    mutationFn: (payload: ProfileUpdate) => profileApi.updateProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(["profile"], profile);
      setSaveState("Profile settings saved.");
    },
  });
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      age: 29,
      sex: "male",
      height_cm: 195,
      start_weight_kg: 95,
      current_goal_weight_kg: 87,
      adjusted_body_fat_current: 22,
      default_training_days_per_week: 5,
      default_step_target: 8000,
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      form.reset({
        age: profileQuery.data.age,
        sex: profileQuery.data.sex,
        height_cm: profileQuery.data.height_cm,
        start_weight_kg: profileQuery.data.start_weight_kg,
        current_goal_weight_kg: profileQuery.data.current_goal_weight_kg,
        adjusted_body_fat_current: profileQuery.data.adjusted_body_fat_current,
        default_training_days_per_week: profileQuery.data.default_training_days_per_week,
        default_step_target: profileQuery.data.default_step_target,
      });
    }
  }, [form, profileQuery.data]);

  async function onSubmit(values: ProfileFormValues) {
    setSaveState(null);
    await mutation.mutateAsync(values);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Profile settings</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink">Profile settings</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
          Keep the defaults that power your dashboard, adherence targets, and projections up to date.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Values here are persisted for the single private user account.</CardDescription>
        </CardHeader>
        <CardContent>
          {profileQuery.isLoading ? <p className="text-sm text-ink/65">Loading profile...</p> : null}

          <form className="grid gap-5 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input id="age" type="number" {...form.register("age", { valueAsNumber: true })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sex">Sex</Label>
              <select
                id="sex"
                className="h-12 w-full rounded-2xl border border-ink/15 bg-white/80 px-4 text-base text-ink outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20 md:h-11 md:text-sm"
                {...form.register("sex")}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="height_cm">Height (cm)</Label>
              <Input id="height_cm" type="number" step="0.1" {...form.register("height_cm", { valueAsNumber: true })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_weight_kg">Start weight (kg)</Label>
              <Input
                id="start_weight_kg"
                type="number"
                step="0.1"
                {...form.register("start_weight_kg", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_goal_weight_kg">Goal weight (kg)</Label>
              <Input
                id="current_goal_weight_kg"
                type="number"
                step="0.1"
                {...form.register("current_goal_weight_kg", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjusted_body_fat_current">Adjusted body fat (%)</Label>
              <Input
                id="adjusted_body_fat_current"
                type="number"
                step="0.1"
                {...form.register("adjusted_body_fat_current", {
                  setValueAs: (value) => (value === "" ? null : Number(value)),
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_training_days_per_week">Training days / week</Label>
              <Input
                id="default_training_days_per_week"
                type="number"
                {...form.register("default_training_days_per_week", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_step_target">Default step target</Label>
              <Input
                id="default_step_target"
                type="number"
                {...form.register("default_step_target", { valueAsNumber: true })}
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-ink/65">
                {saveState ?? "Saved changes will show on the dashboard immediately."}
                {mutation.isError ? <span className="text-ember"> Unable to save the profile right now.</span> : null}
              </div>

              <Button className="w-full sm:w-auto" disabled={mutation.isPending} type="submit">
                {mutation.isPending ? "Saving..." : "Save profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
