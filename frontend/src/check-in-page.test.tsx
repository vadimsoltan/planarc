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

test("check-in page saves daily inputs for the selected date", async () => {
  vi.stubGlobal(
    "fetch",
    createFetchMock({
      "GET /api/auth/me": { status: 200, body: { id: 1, username: "admin" } },
      "GET /api/daily-logs": [
        { status: 200, body: [] },
        {
          status: 200,
          body: [
            {
              id: 1,
              user_id: 1,
              date: "2026-04-12",
              weight_kg: 94.4,
              calories: 2140,
              protein_g: 205,
              carbs_g: null,
              fat_g: null,
              steps: 9100,
              cardio_minutes: null,
              cardio_type: null,
              sleep_hours: null,
              is_training_day: false,
              notes: null,
            },
          ],
        },
      ],
      "GET /api/measurements": { status: 200, body: [] },
      "GET /api/workouts": { status: 200, body: [] },
      "POST /api/daily-logs": {
        status: 201,
        body: {
          id: 1,
          user_id: 1,
          date: "2026-04-12",
          weight_kg: 94.4,
          calories: 2140,
          protein_g: 205,
          carbs_g: null,
          fat_g: null,
          steps: 9100,
          cardio_minutes: null,
          cardio_type: null,
          sleep_hours: null,
          is_training_day: false,
          notes: null,
        },
      },
    }),
  );

  const user = userEvent.setup();
  renderWithProviders(<AppRoutes />, ["/check-in"]);

  expect(await screen.findByRole("heading", { name: "Daily check-in" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-04-12" } });
  await user.type(screen.getByLabelText("Morning weight (kg)"), "94.4");
  await user.type(screen.getByLabelText("Calories"), "2140");
  await user.type(screen.getByLabelText("Protein (g)"), "205");
  await user.type(screen.getByLabelText("Steps"), "9100");
  await user.click(screen.getByRole("button", { name: "Save daily inputs" }));

  expect(await screen.findByText("Daily inputs saved.")).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByText("Daily inputs: Saved")).toBeInTheDocument();
  });
});
