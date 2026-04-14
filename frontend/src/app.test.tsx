import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, vi } from "vitest";

import AppRoutes from "./App";
import { renderWithProviders } from "./test/test-utils";

type MockConfig = {
  status: number;
  body?: unknown;
};

const seededDashboard = {
  summary: {
    current_phase_name: "Aggressive Recomp",
    current_phase_description: "Phase 1 focused on aggressive body recomposition and strength regain.",
    current_weight_kg: 93.8,
    seven_day_avg_weight_kg: 94.3,
    current_waist_cm: 92,
    current_estimated_body_fat_pct: 20.2,
    current_calorie_target_kcal: 2000,
    current_calorie_target_context: "rest day",
    calorie_target_training_kcal: 2200,
    calorie_target_rest_kcal: 2000,
    protein_target_min_g: 200,
    protein_target_max_g: 210,
    weekly_avg_calories: 2092.86,
    weekly_avg_protein_g: 203,
    weekly_avg_steps: 8728.57,
    estimated_weekly_weight_loss_rate_kg: 1.24,
    projected_goal_date: "2026-05-17",
    goal_weight_kg: 87,
    next_milestone_label: "Reach 88.0 kg",
    progress_toward_next_milestone_pct: 17.1,
    remaining_to_next_milestone_kg: 5.8,
  },
  weight_series: [
    { date: "2026-04-07", weight_kg: 93.9, seven_day_avg_weight_kg: 94.4 },
    { date: "2026-04-08", weight_kg: 93.8, seven_day_avg_weight_kg: 94.3 },
  ],
  waist_series: [
    { date: "2026-04-04", waist_navel_cm: 94 },
    { date: "2026-04-08", waist_navel_cm: 92 },
  ],
  body_fat_series: [
    { date: "2026-04-04", adjusted_body_fat_pct: 21.0, navy_body_fat_pct: 20.7 },
    { date: "2026-04-08", adjusted_body_fat_pct: 20.2, navy_body_fat_pct: 20.1 },
  ],
  adherence_series: [
    {
      date: "2026-04-07",
      calories_actual: 2100,
      calories_target: 2200,
      protein_actual_g: 207,
      protein_target_g: 200,
      steps_actual: 8800,
      steps_target: 8000,
    },
    {
      date: "2026-04-08",
      calories_actual: 2050,
      calories_target: 2000,
      protein_actual_g: 204,
      protein_target_g: 200,
      steps_actual: 9100,
      steps_target: 8000,
    },
  ],
};

const seededProjections = {
  projected_goal_date: "2026-05-17",
  pace_assessment: "on_track",
  suggested_calorie_adjustment_kcal: 0,
  suggested_training_day_calories_kcal: 2200,
  suggested_rest_day_calories_kcal: 2000,
  suggested_phase_transition_date: "2026-05-17",
  weekly_target_weight_min_kg: 93.2,
  weekly_target_weight_max_kg: 93.6,
  expected_next_measurement_milestone: "Look for the next waist check-in to land around 91.0 cm.",
  primary_recommendation: "Continue the current plan. Waist is trending down while strength is stable or improving.",
  warnings: [],
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

afterEach(() => {
  vi.restoreAllMocks();
});

test("unauthenticated navigation redirects to login", async () => {
  vi.stubGlobal(
    "fetch",
    createFetchMock({
      "GET /api/auth/me": { status: 401, body: { detail: "Authentication required" } },
    }),
  );

  renderWithProviders(<AppRoutes />, ["/dashboard"]);

  expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
});

test("successful login lands on the protected dashboard", async () => {
  vi.stubGlobal(
    "fetch",
    createFetchMock({
      "GET /api/auth/me": [
        { status: 401, body: { detail: "Authentication required" } },
        { status: 200, body: { id: 1, username: "admin" } },
      ],
      "POST /api/auth/login": { status: 204 },
      "GET /api/analytics/dashboard": { status: 200, body: seededDashboard },
      "GET /api/analytics/projections": { status: 200, body: seededProjections },
    }),
  );

  const user = userEvent.setup();
  renderWithProviders(<AppRoutes />, ["/login"]);

  await user.type(await screen.findByLabelText("Username"), "admin");
  await user.type(screen.getByLabelText("Password"), "test-password");
  await user.click(screen.getByRole("button", { name: "Enter workspace" }));

  expect(await screen.findByRole("heading", { name: "Current status and projection" })).toBeInTheDocument();
  expect(await screen.findByText(/Active phase:/)).toBeInTheDocument();
  expect(screen.getAllByText(/Aggressive Recomp/).length).toBeGreaterThan(0);
});

test("refresh while authenticated restores the session", async () => {
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
  expect(screen.getByText("Signed in as admin")).toBeInTheDocument();
});

test("logout returns the user to the login screen", async () => {
  vi.stubGlobal(
    "fetch",
    createFetchMock({
      "GET /api/auth/me": { status: 200, body: { id: 1, username: "admin" } },
      "GET /api/analytics/dashboard": { status: 200, body: seededDashboard },
      "GET /api/analytics/projections": { status: 200, body: seededProjections },
      "POST /api/auth/logout": { status: 204 },
    }),
  );

  const user = userEvent.setup();
  renderWithProviders(<AppRoutes />, ["/dashboard"]);

  await screen.findByRole("heading", { name: "Current status and projection" });
  await user.click(screen.getByRole("button", { name: "Sign out" }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });
});
