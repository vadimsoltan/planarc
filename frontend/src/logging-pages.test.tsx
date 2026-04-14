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

afterEach(() => {
  vi.restoreAllMocks();
});

test("daily logs page creates a new log and refreshes the list", async () => {
  vi.stubGlobal(
    "fetch",
    createFetchMock({
      "GET /api/auth/me": { status: 200, body: { id: 1, username: "admin" } },
      "GET /api/daily-logs": [
        {
          status: 200,
          body: [
            {
              id: 1,
              user_id: 1,
              date: "2026-04-10",
              weight_kg: 95,
              calories: 2200,
              protein_g: 200,
              carbs_g: 180,
              fat_g: 60,
              steps: 8000,
              cardio_minutes: null,
              cardio_type: null,
              sleep_hours: 7.5,
              is_training_day: true,
              notes: null,
            },
          ],
        },
        {
          status: 200,
          body: [
            {
              id: 2,
              user_id: 1,
              date: "2026-04-11",
              weight_kg: 94.7,
              calories: 2150,
              protein_g: 205,
              carbs_g: 170,
              fat_g: 58,
              steps: 9500,
              cardio_minutes: 20,
              cardio_type: "Incline walk",
              sleep_hours: 8,
              is_training_day: false,
              notes: "Recovered well.",
            },
            {
              id: 1,
              user_id: 1,
              date: "2026-04-10",
              weight_kg: 95,
              calories: 2200,
              protein_g: 200,
              carbs_g: 180,
              fat_g: 60,
              steps: 8000,
              cardio_minutes: null,
              cardio_type: null,
              sleep_hours: 7.5,
              is_training_day: true,
              notes: null,
            },
          ],
        },
      ],
      "POST /api/daily-logs": {
        status: 201,
        body: {
          id: 2,
          user_id: 1,
          date: "2026-04-11",
          weight_kg: 94.7,
          calories: 2150,
          protein_g: 205,
          carbs_g: 170,
          fat_g: 58,
          steps: 9500,
          cardio_minutes: 20,
          cardio_type: "Incline walk",
          sleep_hours: 8,
          is_training_day: false,
          notes: "Recovered well.",
        },
      },
    }),
  );

  const user = userEvent.setup();
  renderWithProviders(<AppRoutes />, ["/daily-logs"]);

  expect(await screen.findByText("Daily logs")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-04-11" } });
  await user.type(screen.getByLabelText("Morning weight (kg)"), "94.7");
  await user.type(screen.getByLabelText("Calories"), "2150");
  await user.type(screen.getByLabelText("Protein (g)"), "205");
  await user.type(screen.getByLabelText("Steps"), "9500");
  await user.click(screen.getByRole("button", { name: "Save log" }));

  expect(await screen.findByText("Daily log created.")).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByText("04/11/2026")).toBeInTheDocument();
  });
});

test("measurements page renders stored derived values", async () => {
  vi.stubGlobal(
    "fetch",
    createFetchMock({
      "GET /api/auth/me": { status: 200, body: { id: 1, username: "admin" } },
      "GET /api/measurements": {
        status: 200,
        body: [
          {
            id: 1,
            user_id: 1,
            date: "2026-04-11",
            neck_cm: 36.5,
            waist_navel_cm: 94,
            waist_narrow_cm: null,
            chest_cm: 102,
            hips_cm: null,
            glutes_cm: null,
            arm_relaxed_cm: null,
            arm_flexed_cm: null,
            thigh_mid_cm: null,
            thigh_upper_cm: null,
            calf_cm: null,
            navy_body_fat_pct: 21.25,
            adjusted_body_fat_pct: 21.25,
            lean_mass_kg: 74.02,
            fat_mass_kg: 19.97,
            waist_height_ratio: 0.4821,
            chest_waist_ratio: 1.0851,
            notes: "Baseline check-in.",
          },
        ],
      },
    }),
  );

  renderWithProviders(<AppRoutes />, ["/measurements"]);

  expect(await screen.findByRole("heading", { name: "Measurements" })).toBeInTheDocument();
  expect(await screen.findByText("74.02 kg")).toBeInTheDocument();
  expect(screen.getAllByText("21.25%").length).toBeGreaterThan(0);
  expect(screen.getByText("04/11/2026")).toBeInTheDocument();
});
