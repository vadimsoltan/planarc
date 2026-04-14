import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const savedWorkout = {
  id: 1,
  user_id: 1,
  date: "2026-04-15",
  workout_type: "push",
  duration_minutes: 75,
  notes: "Felt sharp.",
  exercises: [
    {
      id: 1,
      workout_id: 1,
      exercise_name: "Incline Smith Bench",
      exercise_order: 1,
      category: "compound",
      sets: [
        {
          id: 1,
          set_number: 1,
          weight: 205,
          reps: 5,
          rir: 1,
          notes: null,
        },
      ],
    },
  ],
};

const strengthPayload = {
  exercises: [
    {
      exercise_name: "Incline Smith Bench",
      category: "compound",
      reference_estimated_1rm: 255,
      latest_estimated_1rm: 239.17,
      best_estimated_1rm: 239.17,
      strength_recovery_pct: 93.79,
      latest_volume: 1025,
      best_weight: 205,
      best_reps: 5,
      total_sessions: 1,
      history: [
        {
          date: "2026-04-15",
          estimated_1rm: 239.17,
          total_volume: 1025,
          best_weight: 205,
          best_reps: 5,
        },
      ],
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

test("workouts page saves a nested workout and refreshes strength analytics", async () => {
  vi.stubGlobal(
    "fetch",
    createFetchMock({
      "GET /api/auth/me": { status: 200, body: { id: 1, username: "admin" } },
      "GET /api/workouts": [
        { status: 200, body: [] },
        { status: 200, body: [savedWorkout] },
      ],
      "GET /api/analytics/strength": [
        { status: 200, body: { exercises: [] } },
        { status: 200, body: strengthPayload },
      ],
      "POST /api/workouts": { status: 201, body: savedWorkout },
    }),
  );

  const user = userEvent.setup();
  renderWithProviders(<AppRoutes />, ["/workouts"]);

  expect(await screen.findByText("Workout tracking")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-04-15" } });
  await user.type(screen.getByLabelText("Duration (min)"), "75");
  await user.type(screen.getByLabelText("Exercise name"), "Incline Smith Bench");
  await user.clear(screen.getByLabelText("Weight"));
  await user.type(screen.getByLabelText("Weight"), "205");
  await user.clear(screen.getByLabelText("Reps"));
  await user.type(screen.getByLabelText("Reps"), "5");
  await user.click(screen.getByRole("button", { name: "Save workout" }));

  expect(await screen.findByText("Workout saved.")).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getAllByText("2026-04-15").length).toBeGreaterThan(0);
  });
  expect(screen.getAllByText("Incline Smith Bench").length).toBeGreaterThan(0);
});

test("workouts page renders stored strength recovery analytics", async () => {
  vi.stubGlobal(
    "fetch",
    createFetchMock({
      "GET /api/auth/me": { status: 200, body: { id: 1, username: "admin" } },
      "GET /api/workouts": { status: 200, body: [savedWorkout] },
      "GET /api/analytics/strength": { status: 200, body: strengthPayload },
    }),
  );

  renderWithProviders(<AppRoutes />, ["/workouts"]);

  expect(await screen.findByText("Strength recovery")).toBeInTheDocument();
  expect((await screen.findAllByText("Incline Smith Bench")).length).toBeGreaterThan(0);
  expect(screen.getAllByText("93.8%").length).toBeGreaterThan(0);
  expect(screen.getByText("Estimated 1RM trend")).toBeInTheDocument();
});
