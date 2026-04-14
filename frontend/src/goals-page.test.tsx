import { screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import AppRoutes from "./App";
import { renderWithProviders } from "./test/test-utils";

type MockConfig = {
  status: number;
  body?: unknown;
};

function createFetchMock(handlers: Record<string, MockConfig | MockConfig[]>) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const pathname = new URL(url, "http://localhost").pathname;
    const key = `${method} ${pathname}`;
    const handler = handlers[key];

    if (!handler) {
      throw new Error(`Unhandled fetch request: ${key}`);
    }

    const response = Array.isArray(handler) ? handler.shift() : handler;
    if (!response) {
      throw new Error(`No remaining mocked responses for ${key}`);
    }

    return new Response(response.body == null ? null : JSON.stringify(response.body), {
      status: response.status,
      headers: response.body == null ? undefined : { "Content-Type": "application/json" },
    });
  });
}

const seededDashboard = {
  summary: {
    current_phase_name: "Aggressive Recomp",
    current_phase_description: "Phase 1 focused on aggressive body recomposition and strength regain.",
    current_weight_kg: 93.7,
    seven_day_avg_weight_kg: 94.1,
    current_waist_cm: 92,
    current_estimated_body_fat_pct: 20.5,
    current_calorie_target_kcal: 2000,
    current_calorie_target_context: "rest day",
    calorie_target_training_kcal: 2200,
    calorie_target_rest_kcal: 2000,
    protein_target_min_g: 200,
    protein_target_max_g: 210,
    weekly_avg_calories: 2075,
    weekly_avg_protein_g: 205,
    weekly_avg_steps: 7100,
    estimated_weekly_weight_loss_rate_kg: 0.7,
    projected_goal_date: "2026-06-18",
    goal_weight_kg: 87,
    next_milestone_label: "Reach 88.0 kg",
    progress_toward_next_milestone_pct: 18.6,
    remaining_to_next_milestone_kg: 5.7,
  },
  weight_series: [],
  waist_series: [],
  body_fat_series: [],
  adherence_series: [],
};

const seededProjections = {
  projected_goal_date: "2026-06-18",
  pace_assessment: "on_track",
  suggested_calorie_adjustment_kcal: 0,
  suggested_training_day_calories_kcal: 2200,
  suggested_rest_day_calories_kcal: 2000,
  suggested_phase_transition_date: "2026-06-18",
  weekly_target_weight_min_kg: 92.8,
  weekly_target_weight_max_kg: 93.2,
  expected_next_measurement_milestone: "Look for the next waist check-in to land around 91.0 cm.",
  primary_recommendation: "Continue the current plan. Waist is trending down while strength is stable or improving.",
  warnings: [],
};

const seededGoals = [
  {
    id: 1,
    user_id: 1,
    period_type: "biweekly",
    metric_name: "Average weight loss",
    start_date: "2026-03-30",
    end_date: "2026-04-13",
    target_value: null,
    min_value: 0.35,
    max_value: null,
    unit: "kg/week",
    status: "ahead",
    actual_value: 0.7,
    progress_pct: 200,
    target_display: ">= 0.35 kg/week",
    status_reason: "Average pace is 0.70 kg/week against a minimum of 0.35.",
  },
  {
    id: 2,
    user_id: 1,
    period_type: "biweekly",
    metric_name: "Steps average",
    start_date: "2026-03-30",
    end_date: "2026-04-13",
    target_value: null,
    min_value: 8000,
    max_value: null,
    unit: "steps/day",
    status: "off_track",
    actual_value: 7100,
    progress_pct: 88.8,
    target_display: ">= 8000 steps/day",
    status_reason: "Average steps are 7100 steps/day against a minimum of 8000.",
  },
  {
    id: 3,
    user_id: 1,
    period_type: "monthly",
    metric_name: "Waist change",
    start_date: "2026-03-14",
    end_date: "2026-04-13",
    target_value: null,
    min_value: 1,
    max_value: 2,
    unit: "cm",
    status: "on_track",
    actual_value: 2,
    progress_pct: 133.3,
    target_display: "1-2 cm",
    status_reason: "Waist change is 2.00 cm versus the target range 1.0-2.0.",
  },
];

const seededPhases = [
  {
    id: 1,
    user_id: 1,
    name: "Aggressive Recomp",
    description: "Phase 1 focused on aggressive body recomposition and strength regain.",
    start_date: "2026-04-01",
    end_date: "2026-06-24",
    calorie_training: 2200,
    calorie_rest: 2000,
    protein_target_min: 200,
    protein_target_max: 210,
    fat_target: 60,
    carb_target_training: null,
    carb_target_rest: null,
    target_weight_min: 87,
    target_weight_max: 88,
    target_body_fat_min: null,
    target_body_fat_max: null,
    target_weekly_loss_min: 0.5,
    target_weekly_loss_max: 0.9,
    is_active: true,
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

test("dashboard renders projection guidance", async () => {
  vi.stubGlobal(
    "fetch",
    createFetchMock({
      "GET /api/auth/me": { status: 200, body: { id: 1, username: "admin" } },
      "GET /api/analytics/dashboard": { status: 200, body: seededDashboard },
      "GET /api/analytics/projections": { status: 200, body: seededProjections },
    }),
  );

  renderWithProviders(<AppRoutes />, ["/dashboard"]);

  expect(await screen.findByRole("heading", { name: "Current status and projection" })).toBeInTheDocument();
  expect(screen.getByText("Projection details")).toBeInTheDocument();
  expect(screen.getAllByText("on track").length).toBeGreaterThan(0);
  expect(screen.getByText("Continue the current plan. Waist is trending down while strength is stable or improving.")).toBeInTheDocument();
});

test("goals page renders live statuses and phase progress", async () => {
  vi.stubGlobal(
    "fetch",
    createFetchMock({
      "GET /api/auth/me": { status: 200, body: { id: 1, username: "admin" } },
      "GET /api/goals": { status: 200, body: seededGoals },
      "GET /api/phases": { status: 200, body: seededPhases },
      "GET /api/analytics/dashboard": { status: 200, body: seededDashboard },
    }),
  );

  renderWithProviders(<AppRoutes />, ["/goals"]);

  expect(await screen.findByText("Goals and phase status")).toBeInTheDocument();
  expect(screen.getByText("Active phase progress")).toBeInTheDocument();
  expect(screen.getAllByText("Aggressive Recomp").length).toBeGreaterThan(0);
  expect(screen.getByText("Average weight loss")).toBeInTheDocument();
  expect(screen.getByText("Steps average")).toBeInTheDocument();
  expect(screen.getAllByText("off track").length).toBeGreaterThan(0);
});
