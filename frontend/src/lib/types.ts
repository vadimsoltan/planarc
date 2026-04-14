export type UserSummary = {
  id: number;
  username: string;
};

export type Profile = {
  id: number;
  user_id: number;
  age: number;
  sex: "male" | "female" | "other";
  height_cm: number;
  start_weight_kg: number;
  current_goal_weight_kg: number;
  estimated_body_fat_start: number;
  adjusted_body_fat_current: number | null;
  default_step_target: number;
  default_training_days_per_week: number;
};

export type ProfileUpdate = {
  age: number;
  sex: "male" | "female" | "other";
  height_cm: number;
  start_weight_kg: number;
  current_goal_weight_kg: number;
  adjusted_body_fat_current: number | null;
  default_training_days_per_week: number;
  default_step_target: number;
};

export type Phase = {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  calorie_training: number | null;
  calorie_rest: number | null;
  protein_target_min: number | null;
  protein_target_max: number | null;
  fat_target: number | null;
  carb_target_training: number | null;
  carb_target_rest: number | null;
  target_weight_min: number | null;
  target_weight_max: number | null;
  target_body_fat_min: number | null;
  target_body_fat_max: number | null;
  target_weekly_loss_min: number | null;
  target_weekly_loss_max: number | null;
  is_active: boolean;
};

export type DailyLog = {
  id: number;
  user_id: number;
  date: string;
  weight_kg: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  steps: number | null;
  cardio_minutes: number | null;
  cardio_type: string | null;
  sleep_hours: number | null;
  is_training_day: boolean;
  notes: string | null;
};

export type DailyLogPayload = Omit<DailyLog, "id" | "user_id">;

export type Measurement = {
  id: number;
  user_id: number;
  date: string;
  neck_cm: number | null;
  waist_navel_cm: number | null;
  waist_narrow_cm: number | null;
  chest_cm: number | null;
  hips_cm: number | null;
  glutes_cm: number | null;
  arm_relaxed_cm: number | null;
  arm_flexed_cm: number | null;
  thigh_mid_cm: number | null;
  thigh_upper_cm: number | null;
  calf_cm: number | null;
  navy_body_fat_pct: number | null;
  adjusted_body_fat_pct: number | null;
  lean_mass_kg: number | null;
  fat_mass_kg: number | null;
  waist_height_ratio: number | null;
  chest_waist_ratio: number | null;
  notes: string | null;
};

export type MeasurementPayload = Omit<
  Measurement,
  "id" | "user_id" | "navy_body_fat_pct" | "lean_mass_kg" | "fat_mass_kg" | "waist_height_ratio" | "chest_waist_ratio"
>;

export type DashboardSummary = {
  current_phase_name: string | null;
  current_phase_description: string | null;
  current_weight_kg: number | null;
  seven_day_avg_weight_kg: number | null;
  current_waist_cm: number | null;
  current_estimated_body_fat_pct: number | null;
  current_calorie_target_kcal: number | null;
  current_calorie_target_context: string | null;
  calorie_target_training_kcal: number | null;
  calorie_target_rest_kcal: number | null;
  protein_target_min_g: number | null;
  protein_target_max_g: number | null;
  weekly_avg_calories: number | null;
  weekly_avg_protein_g: number | null;
  weekly_avg_steps: number | null;
  estimated_weekly_weight_loss_rate_kg: number | null;
  projected_goal_date: string | null;
  goal_weight_kg: number | null;
  next_milestone_label: string | null;
  progress_toward_next_milestone_pct: number | null;
  remaining_to_next_milestone_kg: number | null;
};

export type WeightTrendPoint = {
  date: string;
  weight_kg: number;
  seven_day_avg_weight_kg: number;
};

export type WaistTrendPoint = {
  date: string;
  waist_navel_cm: number;
};

export type BodyFatTrendPoint = {
  date: string;
  adjusted_body_fat_pct: number | null;
  navy_body_fat_pct: number | null;
};

export type AdherenceTrendPoint = {
  date: string;
  calories_actual: number | null;
  calories_target: number | null;
  protein_actual_g: number | null;
  protein_target_g: number | null;
  steps_actual: number | null;
  steps_target: number | null;
};

export type DashboardAnalytics = {
  summary: DashboardSummary;
  weight_series: WeightTrendPoint[];
  waist_series: WaistTrendPoint[];
  body_fat_series: BodyFatTrendPoint[];
  adherence_series: AdherenceTrendPoint[];
};

export type WorkoutType = "push" | "pull" | "legs" | "upper" | "lower" | "custom";
export type ExerciseCategory = "compound" | "isolation" | "cardio" | "core";

export type WorkoutSet = {
  id: number;
  set_number: number;
  weight: number;
  reps: number;
  rir: number | null;
  notes: string | null;
};

export type WorkoutExercise = {
  id: number;
  workout_id: number;
  exercise_name: string;
  exercise_order: number;
  category: ExerciseCategory;
  sets: WorkoutSet[];
};

export type Workout = {
  id: number;
  user_id: number;
  date: string;
  workout_type: WorkoutType;
  duration_minutes: number | null;
  notes: string | null;
  exercises: WorkoutExercise[];
};

export type WorkoutSetPayload = Omit<WorkoutSet, "id">;

export type WorkoutExercisePayload = {
  exercise_name: string;
  exercise_order: number;
  category: ExerciseCategory;
  sets: WorkoutSetPayload[];
};

export type WorkoutPayload = {
  date: string;
  workout_type: WorkoutType;
  duration_minutes: number | null;
  notes: string | null;
  exercises: WorkoutExercisePayload[];
};

export type StrengthHistoryPoint = {
  date: string;
  estimated_1rm: number;
  total_volume: number;
  best_weight: number;
  best_reps: number;
};

export type StrengthExerciseAnalytics = {
  exercise_name: string;
  category: string | null;
  reference_estimated_1rm: number | null;
  latest_estimated_1rm: number | null;
  best_estimated_1rm: number | null;
  strength_recovery_pct: number | null;
  latest_volume: number | null;
  best_weight: number | null;
  best_reps: number | null;
  total_sessions: number;
  history: StrengthHistoryPoint[];
};

export type StrengthAnalytics = {
  exercises: StrengthExerciseAnalytics[];
};

export type ProjectionAnalytics = {
  projected_goal_date: string | null;
  pace_assessment: string;
  suggested_calorie_adjustment_kcal: number;
  suggested_training_day_calories_kcal: number | null;
  suggested_rest_day_calories_kcal: number | null;
  suggested_phase_transition_date: string | null;
  weekly_target_weight_min_kg: number | null;
  weekly_target_weight_max_kg: number | null;
  expected_next_measurement_milestone: string | null;
  primary_recommendation: string;
  warnings: string[];
};

export type GoalStatus = {
  id: number;
  user_id: number;
  period_type: string;
  metric_name: string;
  start_date: string;
  end_date: string;
  target_value: number | null;
  min_value: number | null;
  max_value: number | null;
  unit: string;
  status: "ahead" | "on_track" | "caution" | "off_track";
  actual_value: number | null;
  progress_pct: number | null;
  target_display: string;
  status_reason: string | null;
};
