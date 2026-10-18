"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type ImportBatch = {
  id: string;
  sourceName: string;
  importedAt: string;
  status: string;
  rowCount: number;
  preview: Record<string, unknown>[];
};

const sampleRows = JSON.stringify(
  [
    {
      date: "2026-10-15",
      description: "Grocery store",
      amount: 1250,
      type: "debit",
    },
    {
      date: "2026-10-16",
      description: "Salary credit",
      amount: 45000,
      type: "credit",
    },
  ],
  null,
  2
);

export default function ImportsPage() {
  const [sourceName, setSourceName] = useState(
    "sample-bank-statement.csv"
  );
  const [rowsText, setRowsText] = useState(sampleRows);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
useEffect(() => {
  let cancelled = false;

  async function verifySession() {
    try {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Session verification failed.");
      }

      const result = await response.json();

      if (!cancelled && !result.authenticated) {
        window.location.replace("/login");
      }
    } catch {
      if (!cancelled) {
        window.location.replace("/login");
      }
    }
  }

  void verifySession();

  return () => {
    cancelled = true;
  };
}, []);
  const loadBatches = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/imports", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load import history.");
      }

      const data: ImportBatch[] = await response.json();
      setBatches(data);
    } catch (error) {
      console.error("Failed to load imports:", error);
      setMessage({
        type: "error",
        text: "Could not load import history. Check MongoDB.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!sourceName.trim()) {
      setMessage({
        type: "error",
        text: "Enter a statement name.",
      });
      return;
    }

    let rows: unknown;

    try {
      rows = JSON.parse(rowsText);
    } catch {
      setMessage({
        type: "error",
        text: "The statement rows must be valid JSON.",
      });
      return;
    }

    if (
      !Array.isArray(rows) ||
      rows.length === 0 ||
      rows.length > 500 ||
      rows.some(
        (row) =>
          row === null ||
          typeof row !== "object" ||
          Array.isArray(row)
      )
    ) {
      setMessage({
        type: "error",
        text: "Enter an array containing 1–500 statement row objects.",
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/imports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceName: sourceName.trim(),
          rows,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Import could not be saved.");
      }

      setMessage({
        type: "success",
        text: `Import saved to MongoDB for review. ${result.rowCount} rows stored.`,
      });

      await loadBatches();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleConvert(batchId: string) {
    const confirmed = window.confirm(
      "Convert this batch into MySQL transactions? Every row in the batch will be added."
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/imports/${encodeURIComponent(batchId)}/convert`,
        { method: "POST" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Conversion failed.");
      }

      setMessage({
        type: "success",
        text: `${result.convertedCount} rows converted into MySQL transactions.`,
      });

      await loadBatches();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to convert this batch.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-5 py-8 text-slate-900 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <a
              href="/"
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              ← Back to dashboard
            </a>
            <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-slate-400">
              RupeeWise / Data management
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Bank statement imports
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Submit structured statement rows for review before they are
              converted into financial transactions.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            MongoDB import storage
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-3">
            <h2 className="text-lg font-bold">Create an import batch</h2>
            <p className="mt-1 text-sm text-slate-500">
              This demonstration accepts JSON-formatted rows. It does not
              upload or parse a CSV file directly.
            </p>

            <form onSubmit={handleImport} className="mt-6 space-y-5">
              <label className="block text-sm font-semibold text-slate-700">
                Statement name
                <input
                  value={sourceName}
                  onChange={(event) => setSourceName(event.target.value)}
                  maxLength={255}
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                  placeholder="e.g. October bank statement"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Statement rows (JSON)
                <textarea
                  value={rowsText}
                  onChange={(event) => setRowsText(event.target.value)}
                  required
                  rows={12}
                  spellCheck={false}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-emerald-500"
                />
              </label>

              <p className="text-xs leading-5 text-slate-400">
                Use fictional sample data for testing. Do not paste account
                numbers, card details, or other sensitive banking information.
              </p>

              {message && (
                <div
                  role="status"
                  className={`rounded-xl p-3 text-sm ${
                    message.type === "success"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-rose-50 text-rose-800"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving import..." : "Save import batch"}
              </button>
            </form>
          </div>

          <aside className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-bold">Import workflow</h2>
            <p className="mt-1 text-sm text-slate-500">
              How imported records are handled.
            </p>

            <div className="mt-6 space-y-5">
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                  1
                </span>
                <div>
                  <p className="text-sm font-semibold">Submit statement rows</p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Provide a statement name and its structured rows.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                  2
                </span>
                <div>
                  <p className="text-sm font-semibold">Store in MongoDB</p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Preserve flexible original data for review.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">
                  3
                </span>
                <div>
                  <p className="text-sm font-semibold">Review before conversion</p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Conversion into MySQL transactions is a separate workflow
                    we will implement later.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold">Import history</h2>
              <p className="mt-1 text-sm text-slate-500">
                Previously stored statement batches.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadBatches()}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Refresh history
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <p className="p-6 text-sm text-slate-500">
                Loading import history...
              </p>
            ) : batches.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">
                No imports saved yet.
              </p>
            ) : (
              batches.map((batch) => (
                <article key={batch.id} className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{batch.sourceName}</h3>
                      <p className="mt-1 break-all text-xs text-slate-400">
                        Import ID: {batch.id}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {new Date(batch.importedAt).toLocaleString("en-IN")}
                        {" · "}
                        {batch.rowCount} rows
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          batch.status === "CONVERTED"
                            ? "bg-emerald-50 text-emerald-800"
                            : batch.status === "CONVERTING"
                              ? "bg-blue-50 text-blue-800"
                              : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {batch.status}
                      </span>

                      {batch.status === "PENDING_REVIEW" && (
                        <button
                          type="button"
                          onClick={() => void handleConvert(batch.id)}
                          disabled={saving}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Convert to MySQL
                        </button>
                      )}
                    </div>
                  </div>

                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-emerald-700">
                      View row preview
                    </summary>
                    <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-700">
                      {JSON.stringify(batch.preview, null, 2)}
                    </pre>
                  </details>
                </article>
              ))
            )}
          </div>
        </section>

        <footer className="pb-4 text-center text-xs text-slate-400">
          RupeeWise · Bank statement import demonstration
        </footer>
      </div>
    </main>
  );
}