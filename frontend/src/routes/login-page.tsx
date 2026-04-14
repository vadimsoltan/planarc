import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { ApiError } from "../lib/api";
import { useLogin, useSession } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionQuery = useSession();
  const loginMutation = useLogin();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  if (sessionQuery.isLoading) {
    return (
      <div className="panel-grid flex min-h-screen items-center justify-center px-6">
        <div className="rounded-full border border-white/70 bg-white/80 px-6 py-3 text-sm font-semibold text-ink shadow-panel">
          Checking for an existing session...
        </div>
      </div>
    );
  }

  if (sessionQuery.data) {
    return <Navigate to="/plan" replace />;
  }

  const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/plan";

  async function onSubmit(values: LoginValues) {
    await loginMutation.mutateAsync(values);
    navigate(destination, { replace: true });
  }

  const errorMessage =
    loginMutation.error instanceof ApiError ? loginMutation.error.message : "Use your seeded admin credentials to sign in.";

  return (
    <div className="panel-grid flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[32px] border border-white/70 bg-ink px-8 py-10 text-white shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sand/70">Fitness tracker</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Private body recomposition workspace.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-sand/80">
            A calmer private workspace for logging nutrition, measurements, training, and goals across desktop and mobile.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/6 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand/60">Simple daily capture</p>
              <p className="mt-3 text-2xl font-semibold">Logs built for phones</p>
              <p className="mt-2 text-sm text-sand/75">Large tap targets and stacked cards keep quick entries easy on smaller screens.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/6 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand/60">Session model</p>
              <p className="mt-3 text-2xl font-semibold">Server-side cookies</p>
              <p className="mt-2 text-sm text-sand/75">Opaque tokens stay in HTTP-only cookies and can be invalidated on logout.</p>
            </div>
          </div>
        </div>

        <Card className="self-center">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use the seeded admin credentials from your environment configuration.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" autoComplete="username" {...form.register("username")} />
                {form.formState.errors.username ? (
                  <p className="text-sm text-ember">{form.formState.errors.username.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
                {form.formState.errors.password ? (
                  <p className="text-sm text-ember">{form.formState.errors.password.message}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-ink/10 bg-sand/35 px-4 py-3 text-sm text-ink/70">{errorMessage}</div>

              <Button className="w-full" disabled={loginMutation.isPending} type="submit">
                {loginMutation.isPending ? "Signing in..." : "Enter workspace"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
