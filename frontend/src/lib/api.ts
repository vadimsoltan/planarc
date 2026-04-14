import type {
  DailyLog,
  DailyLogPayload,
  DashboardAnalytics,
  GoalStatus,
  Measurement,
  MeasurementPayload,
  Phase,
  ProjectionAnalytics,
  Profile,
  ProfileUpdate,
  StrengthAnalytics,
  UserSummary,
  Workout,
  WorkoutPayload,
} from "./types";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type ApiRequestInit = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

function isPlainJsonBody(body: ApiRequestInit["body"]): body is Record<string, unknown> {
  return (
    typeof body === "object" &&
    body !== null &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(body)
  );
}

async function parseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const isJsonBody = isPlainJsonBody(init.body);
  const requestBody: BodyInit | null | undefined = isJsonBody
    ? JSON.stringify(init.body)
    : (init.body as BodyInit | null | undefined);

  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(isJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    body: requestBody,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await parseBody(response);
  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail: string }).detail)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export const authApi = {
  login(payload: { username: string; password: string }) {
    return apiRequest<void>("/api/auth/login", { method: "POST", body: payload });
  },
  logout() {
    return apiRequest<void>("/api/auth/logout", { method: "POST" });
  },
  me() {
    return apiRequest<UserSummary>("/api/auth/me");
  },
};

export const profileApi = {
  getProfile() {
    return apiRequest<Profile>("/api/profile");
  },
  updateProfile(payload: ProfileUpdate) {
    return apiRequest<Profile>("/api/profile", { method: "PUT", body: payload });
  },
};

export const phaseApi = {
  getPhases() {
    return apiRequest<Phase[]>("/api/phases");
  },
};

export const goalsApi = {
  getGoals() {
    return apiRequest<GoalStatus[]>("/api/goals");
  },
};

function withQueryParams(path: string, params?: Record<string, string | undefined>) {
  const url = new URL(path, "http://localhost");
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return `${url.pathname}${url.search}`;
}

export const dailyLogApi = {
  list(params?: { start_date?: string; end_date?: string }) {
    return apiRequest<DailyLog[]>(withQueryParams("/api/daily-logs", params));
  },
  create(payload: DailyLogPayload) {
    return apiRequest<DailyLog>("/api/daily-logs", { method: "POST", body: payload });
  },
  update(id: number, payload: DailyLogPayload) {
    return apiRequest<DailyLog>(`/api/daily-logs/${id}`, { method: "PUT", body: payload });
  },
  remove(id: number) {
    return apiRequest<void>(`/api/daily-logs/${id}`, { method: "DELETE" });
  },
};

export const measurementApi = {
  list(params?: { start_date?: string; end_date?: string }) {
    return apiRequest<Measurement[]>(withQueryParams("/api/measurements", params));
  },
  create(payload: MeasurementPayload) {
    return apiRequest<Measurement>("/api/measurements", { method: "POST", body: payload });
  },
  update(id: number, payload: MeasurementPayload) {
    return apiRequest<Measurement>(`/api/measurements/${id}`, { method: "PUT", body: payload });
  },
  remove(id: number) {
    return apiRequest<void>(`/api/measurements/${id}`, { method: "DELETE" });
  },
};

export const workoutApi = {
  list() {
    return apiRequest<Workout[]>("/api/workouts");
  },
  getById(id: number) {
    return apiRequest<Workout>(`/api/workouts/${id}`);
  },
  create(payload: WorkoutPayload) {
    return apiRequest<Workout>("/api/workouts", { method: "POST", body: payload });
  },
  update(id: number, payload: WorkoutPayload) {
    return apiRequest<Workout>(`/api/workouts/${id}`, { method: "PUT", body: payload });
  },
  remove(id: number) {
    return apiRequest<void>(`/api/workouts/${id}`, { method: "DELETE" });
  },
};

export const analyticsApi = {
  getDashboard() {
    return apiRequest<DashboardAnalytics>("/api/analytics/dashboard");
  },
  getProjections() {
    return apiRequest<ProjectionAnalytics>("/api/analytics/projections");
  },
  getStrength() {
    return apiRequest<StrengthAnalytics>("/api/analytics/strength");
  },
};
