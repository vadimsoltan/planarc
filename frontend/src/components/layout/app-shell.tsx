import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useLogout, useSession } from "../../lib/auth";
import { Button } from "../ui/button";

const primaryNavItems = [
  { to: "/plan", label: "Plan" },
  { to: "/check-in", label: "Check-in" },
  { to: "/settings", label: "Settings" },
];

function resolveActiveNav(pathname: string) {
  if (pathname.startsWith("/settings")) {
    return primaryNavItems[2];
  }

  if (pathname.startsWith("/plan") || pathname.startsWith("/dashboard") || pathname.startsWith("/goals")) {
    return primaryNavItems[0];
  }

  return primaryNavItems[1];
}

function MenuButton({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <button
      aria-controls="mobile-navigation"
      aria-expanded={isOpen}
      aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 bg-white/80 text-ink transition hover:bg-white"
      onClick={onClick}
      type="button"
    >
      <span className="sr-only">{isOpen ? "Close navigation menu" : "Open navigation menu"}</span>
      <span className="flex flex-col gap-1.5">
        <span className={["h-0.5 w-5 rounded-full bg-current transition", isOpen ? "translate-y-2 rotate-45" : ""].join(" ")} />
        <span className={["h-0.5 w-5 rounded-full bg-current transition", isOpen ? "opacity-0" : ""].join(" ")} />
        <span className={["h-0.5 w-5 rounded-full bg-current transition", isOpen ? "-translate-y-2 -rotate-45" : ""].join(" ")} />
      </span>
    </button>
  );
}

function PrimaryNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {primaryNavItems.map((item) => (
        <NavLink
          key={item.to}
          onClick={onNavigate}
          to={item.to}
          className={({ isActive }) =>
            [
              "rounded-full px-4 py-2.5 text-sm font-medium transition",
              isActive ? "bg-ink text-white" : "bg-canvas text-ink/70 hover:bg-white hover:text-ink",
            ].join(" ")
          }
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionQuery = useSession();
  const logoutMutation = useLogout();
  const username = sessionQuery.data?.username ?? "private user";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeNav = useMemo(() => resolveActiveNav(location.pathname), [location.pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    await logoutMutation.mutateAsync();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen px-3 py-3 sm:px-4 md:px-6">
      <div className="mx-auto max-w-6xl space-y-3">
        <header className="rounded-[28px] border border-white/70 bg-white/75 px-4 py-4 shadow-panel backdrop-blur sm:px-5 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="lg:hidden">
                <MenuButton isOpen={mobileMenuOpen} onClick={() => setMobileMenuOpen((current) => !current)} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Planarc</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold text-ink sm:text-2xl">Private Recomp Workspace</h1>
                  <span className="rounded-full bg-canvas px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/55">
                    {activeNav.label}
                  </span>
                </div>
              </div>
            </div>

            <Button className="shrink-0" variant="outline" onClick={handleLogout} disabled={logoutMutation.isPending}>
              {logoutMutation.isPending ? "Signing out..." : "Sign out"}
            </Button>
          </div>

          <div className="mt-4 hidden items-center justify-between gap-4 lg:flex">
            <nav className="flex flex-wrap gap-2">
              <PrimaryNavigation />
            </nav>
            <p className="text-sm text-ink/55">Signed in as {username}</p>
          </div>
        </header>

        <main className="rounded-[28px] border border-white/70 bg-white/55 shadow-panel backdrop-blur">
          <div className="px-4 py-5 sm:px-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-50 bg-ink/35 p-3 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          role="presentation"
        >
          <div
            aria-label="Navigation menu"
            className="ml-auto flex h-full w-full max-w-xs flex-col rounded-[28px] border border-white/20 bg-ink px-5 py-5 text-white shadow-panel"
            id="mobile-navigation"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sand/70">Menu</p>
                <p className="mt-1 text-lg font-semibold text-white">{username}</p>
              </div>
              <MenuButton isOpen={mobileMenuOpen} onClick={() => setMobileMenuOpen(false)} />
            </div>

            <nav className="mt-6 flex flex-col gap-2">
              <PrimaryNavigation onNavigate={() => setMobileMenuOpen(false)} />
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
