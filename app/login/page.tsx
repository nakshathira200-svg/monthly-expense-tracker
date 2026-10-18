"use client";

import { useState, type FormEvent } from "react";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        mode === "login" ? "/api/auth/login" : "/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            mode === "login"
              ? { email: email.trim(), password }
              : {
                  fullName: fullName.trim(),
                  email: email.trim(),
                  password,
                }
          ),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Authentication failed.");
      }

    window.location.replace("/");
    return;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setError("");
    setPassword("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-5 py-10 text-slate-900">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
        <section className="flex flex-col justify-between bg-slate-900 p-8 text-white sm:p-12">
          <div>
            <a href="/" className="inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-2xl font-bold">
                ₹
              </span>
              <span className="text-xl font-bold tracking-tight">
                RupeeWise
              </span>
            </a>

            <p className="mt-16 text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
              Personal finance made clearer
            </p>

            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Make every rupee count.
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              Track your income, understand your monthly spending, manage
              budgets, and build better financial habits in one place.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold text-emerald-400">₹</p>
              <p className="mt-2 text-sm font-medium">Indian currency</p>
              <p className="mt-1 text-xs text-slate-400">
                Amounts shown in INR
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold text-emerald-400">◎</p>
              <p className="mt-2 text-sm font-medium">Monthly budgets</p>
              <p className="mt-1 text-xs text-slate-400">
                Plan spending with purpose
              </p>
            </div>
          </div>
        </section>

        <section className="p-7 sm:p-12">
          <a
            href="/"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            ← Back to dashboard
          </a>

          <div className="mt-10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Your account
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              {mode === "login" ? "Welcome back" : "Create an account"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {mode === "login"
                ? "Sign in to continue managing your finances."
                : "Get started with your personal finance dashboard."}
            </p>
          </div>

          <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => changeMode("login")}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={() => changeMode("register")}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {mode === "register" && (
              <label className="block text-sm font-semibold text-slate-700">
                Full name
                <input
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  maxLength={100}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Enter your name"
                />
              </label>
            )}

            <label className="block text-sm font-semibold text-slate-700">
              Email address
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="you@example.com"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Password
              <input
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={mode === "register" ? 8 : undefined}
                maxLength={72}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder={
                  mode === "register"
                    ? "At least 8 characters"
                    : "Enter your password"
                }
              />
            </label>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-800"
              >
                {error}
              </div>
            )}

            {message && (
              <div
                role="status"
                className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800"
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Your password is hashed before being stored in the database.
            Keep your login details private.
          </p>
        </section>
      </div>
    </main>
  );
}