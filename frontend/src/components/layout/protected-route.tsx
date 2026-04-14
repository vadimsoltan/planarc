import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useSession } from "../../lib/auth";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const location = useLocation();
  const sessionQuery = useSession();

  if (sessionQuery.isLoading) {
    return (
      <div className="panel-grid flex min-h-screen items-center justify-center px-6">
        <div className="rounded-full border border-white/70 bg-white/80 px-6 py-3 text-sm font-semibold text-ink shadow-panel">
          Restoring your session...
        </div>
      </div>
    );
  }

  if (!sessionQuery.data) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

