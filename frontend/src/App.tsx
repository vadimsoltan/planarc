import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/app-shell";
import { ProtectedRoute } from "./components/layout/protected-route";
import { CheckInPage } from "./routes/check-in-page";
import { DashboardPage } from "./routes/dashboard-page";
import { DailyLogsPage } from "./routes/daily-logs-page";
import { GoalsPage } from "./routes/goals-page";
import { LoginPage } from "./routes/login-page";
import { MeasurementsPage } from "./routes/measurements-page";
import { SettingsPage } from "./routes/settings-page";
import { WorkoutsPage } from "./routes/workouts-page";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/plan" replace />} />
        <Route path="/dashboard" element={<Navigate to="/plan" replace />} />
        <Route path="/plan" element={<DashboardPage />} />
        <Route path="/check-in" element={<CheckInPage />} />
        <Route path="/daily-logs" element={<DailyLogsPage />} />
        <Route path="/measurements" element={<MeasurementsPage />} />
        <Route path="/workouts" element={<WorkoutsPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/plan" replace />} />
    </Routes>
  );
}
