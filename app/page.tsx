"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type TransactionType = "Income" | "Expense";

type Transaction = {
  id: number;
  title: string;
  category: string;
  date: string;
  amount: number;
  type: TransactionType;
};

const categories = [
  "Housing",
  "Groceries",
  "Transport",
  "Food & dining",
  "Bills & utilities",
  "Shopping",
  "Health",
  "Subscriptions",
  "Salary",
  "Freelance",
  "Other",
];

const categoryStyle: Record<
  string,
  { icon: string; color: string; bg: string }
> = {
  Housing: { icon: "⌂", color: "#6366F1", bg: "#EEF2FF" },
  Groceries: { icon: "◈", color: "#059669", bg: "#D1FAE5" },
  Transport: { icon: "↗", color: "#0284C7", bg: "#E0F2FE" },
  "Food & dining": { icon: "♨", color: "#EA580C", bg: "#FFEDD5" },
  "Bills & utilities": { icon: "ϟ", color: "#CA8A04", bg: "#FEF9C3" },
  Shopping: { icon: "◇", color: "#DB2777", bg: "#FCE7F3" },
  Health: { icon: "+", color: "#DC2626", bg: "#FEE2E2" },
  Subscriptions: { icon: "↻", color: "#7C3AED", bg: "#EDE9FE" },
  Salary: { icon: "₹", color: "#059669", bg: "#D1FAE5" },
  Freelance: { icon: "✳", color: "#0284C7", bg: "#E0F2FE" },
  Other: { icon: "•", color: "#64748B", bg: "#F1F5F9" },
};

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const dateLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [databaseStatus, setDatabaseStatus] = useState<
    "loading" | "connected" | "error"
  >("loading");

  const [selectedMonth, setSelectedMonth] = useState("2026-10");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [budget, setBudget] = useState(30000);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("30000");

  const [draft, setDraft] = useState({
    title: "",
    amount: "",
    category: "Food & dining",
    type: "Expense" as TransactionType,
    date: "2026-10-18",
  });

  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const [editDraft, setEditDraft] = useState({
    title: "",
    amount: "",
    category: "Food & dining",
    type: "Expense" as TransactionType,
    date: "2026-10-18",
  });

  // Load actual transaction records from the MySQL-backed API.
  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      try {
        const response = await fetch("/api/transactions", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Transactions API returned ${response.status}`);
        }

        const data: Transaction[] = await response.json();

        if (!cancelled) {
          setTransactions(
            data.map((transaction) => ({
              ...transaction,
              id: Number(transaction.id),
              amount: Number(transaction.amount),
            }))
          );
          setDatabaseStatus("connected");
        }
      } catch (error) {
        console.error("Failed to load MySQL transactions:", error);

        if (!cancelled) {
          setDatabaseStatus("error");
        }
      }
    }

    void loadTransactions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBudget() {
      try {
        const response = await fetch(
          `/api/budgets?month=${selectedMonth}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Unable to load the saved budget.");
        }

        const result: { month: string; budget: number } =
          await response.json();

        if (!cancelled && result.month === selectedMonth) {
          setBudget(Number(result.budget));
          setBudgetInput(String(result.budget));
        }
      } catch (error) {
        console.error("Failed to load monthly budget:", error);
      }
    }

    void loadBudget();

    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);
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
  const monthTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.date.startsWith(selectedMonth))
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    [transactions, selectedMonth]
  );

  const income = monthTransactions
    .filter((t) => t.type === "Income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = monthTransactions
    .filter((t) => t.type === "Expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const remaining = income - expenses;
  const budgetUsed = budget > 0 ? (expenses / budget) * 100 : 0;

  const categoryTotals = monthTransactions
    .filter((t) => t.type === "Expense")
    .reduce<Record<string, number>>((totals, t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
      return totals;
    }, {});

  const categoryRows = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1]
  );

  const visibleTransactions = monthTransactions.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === "All" || t.type === filterType;

    return matchesSearch && matchesType;
  });

  const monthLabel = new Date(
    `${selectedMonth}-01T00:00:00`
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  async function handleAddTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(draft.amount);

    if (
      !draft.title.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !draft.date
    ) {
      alert("Enter a description, date, and valid amount greater than zero.");
      return;
    }

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: draft.title.trim(),
          amount,
          category: draft.category,
          type: draft.type,
          date: draft.date,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save transaction.");
      }

      const saved = result as Transaction;

      setTransactions((previous) => [
        saved,
        ...previous.filter((transaction) => transaction.id !== saved.id),
      ]);

      setSelectedMonth(saved.date.slice(0, 7));
      setSearch("");
      setFilterType("All");
      setShowForm(false);
      setDatabaseStatus("connected");

      setDraft({
        title: "",
        amount: "",
        category: "Food & dining",
        type: "Expense",
        date: "2026-10-18",
      });
    } catch (error) {
      console.error("Failed to save transaction:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to save transaction. Please try again."
      );
    }
  }

  async function handleDeleteTransaction(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this transaction?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/transactions?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete transaction.");
      }

      setTransactions((previous) =>
        previous.filter((transaction) => transaction.id !== id)
      );
    } catch (error) {
      console.error("Failed to delete transaction:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to delete transaction. Please try again."
      );
    }
  }

  function startEditing(transaction: Transaction) {
    setEditingTransaction(transaction);

    setEditDraft({
      title: transaction.title,
      amount: String(transaction.amount),
      category: transaction.category,
      type: transaction.type,
      date: transaction.date,
    });
  }

  async function handleUpdateTransaction(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!editingTransaction) return;

    const amount = Number(editDraft.amount);

    if (
      !editDraft.title.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !editDraft.date
    ) {
      alert("Enter a valid description, amount, and date.");
      return;
    }

    try {
      const response = await fetch("/api/transactions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingTransaction.id,
          title: editDraft.title.trim(),
          amount,
          category: editDraft.category,
          type: editDraft.type,
          date: editDraft.date,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update transaction.");
      }

      const saved = result as Transaction;

      setTransactions((previous) =>
        previous.map((transaction) =>
          transaction.id === saved.id ? saved : transaction
        )
      );

      setSelectedMonth(saved.date.slice(0, 7));
      setEditingTransaction(null);
      setDatabaseStatus("connected");
    } catch (error) {
      console.error("Failed to update transaction:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to update transaction."
      );
    }
  }

  async function saveBudget() {
    const amount = Number(budgetInput);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Enter a valid budget greater than zero.");
      return;
    }

    try {
      const response = await fetch("/api/budgets", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: selectedMonth,
          budget: amount,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save the budget.");
      }

      setBudget(Number(result.budget));
      setBudgetInput(String(result.budget));
      setEditingBudget(false);
    } catch (error) {
      console.error("Failed to save monthly budget:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to save the budget. Please try again."
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white px-5 py-7 lg:flex">
        <a href="#overview" className="mb-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-bold text-white">
            ₹
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight">
              RupeeWise
            </span>
            <span className="block text-xs text-slate-400">
              Personal finance
            </span>
          </span>
        </a>

        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Workspace
        </p>

        <nav className="space-y-2">
          <a
            href="#overview"
            className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
          >
            <span>▦</span> Overview
          </a>
          <a
            href="#transactions"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span>↔</span> Transactions
          </a>
          <a
            href="#budgets"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span>◎</span> Monthly budget
          </a>
          <a
            href="#categories"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span>◷</span> Spending categories
          </a>
          <a
            href="/imports"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span>⇧</span> Bank statement imports
          </a>
        </nav>

        <div className="mt-auto rounded-2xl bg-slate-900 p-5 text-white">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg">
            ₹
          </div>
          <p className="text-sm font-semibold">Small steps add up.</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Track your spending, build better habits, and make every rupee
            count.
          </p>
        </div>

        <p className="mt-5 text-center text-[10px] text-slate-400">
          RUPEEWISE · DEMO VERSION
        </p>
      </aside>

      <main className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
            <div>
              <p className="text-xs font-medium text-slate-400">
                PERSONAL FINANCE / OVERVIEW
              </p>
              <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                Monthly expense tracker
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="sr-only" htmlFor="month">
                Select month
              </label>
              <select
                id="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500"
              >
                <option value="2026-10">October 2026</option>
                <option value="2026-09">September 2026</option>
              </select>

              <button
                onClick={() => setShowForm(!showForm)}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                + Add transaction
              </button>
              <button
  type="button"
  onClick={async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Sign out failed.");
      }
    } catch (error) {
      console.error("Sign out request failed:", error);
    } finally {
      window.location.replace("/login");
    }
  }}
  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
>
  Sign out
</button>
            </div>
          </div>
        </header>

        <div
          id="overview"
          className="mx-auto max-w-[1500px] space-y-7 px-5 py-7 sm:px-8 lg:px-10 lg:py-9"
        >
          <section className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p
                className={`mb-2 text-xs font-semibold ${
                  databaseStatus === "connected"
                    ? "text-emerald-700"
                    : databaseStatus === "error"
                      ? "text-rose-600"
                      : "text-slate-400"
                }`}
              >
                {databaseStatus === "connected"
                  ? "● Connected to MySQL"
                  : databaseStatus === "error"
                    ? "● Could not load database transactions"
                    : "● Loading transactions..."}
              </p>
              <p className="text-sm text-slate-500">
                Here is your financial snapshot for
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {monthLabel}
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              All amounts in Indian rupees (INR ₹)
            </p>
          </section>

          {databaseStatus === "error" && (
            <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              We could not load transactions from MySQL. Check the Next.js
              server logs and the database connection settings.
              <button
                onClick={() => window.location.reload()}
                className="ml-2 font-semibold underline"
              >
                Try again
              </button>
            </section>
          )}

          {showForm && (
            <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">Add a transaction</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Record money coming in or going out.
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>

              <form
                onSubmit={handleAddTransaction}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <label className="text-sm font-medium text-slate-700">
                  Description
                  <input
                    required
                    value={draft.title}
                    onChange={(e) =>
                      setDraft({ ...draft, title: e.target.value })
                    }
                    placeholder="e.g. Grocery shopping"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Amount (₹)
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={draft.amount}
                    onChange={(e) =>
                      setDraft({ ...draft, amount: e.target.value })
                    }
                    placeholder="e.g. 1200"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Transaction type
                  <select
                    value={draft.type}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        type: e.target.value as TransactionType,
                        category:
                          e.target.value === "Income"
                            ? "Salary"
                            : "Food & dining",
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-emerald-500"
                  >
                    <option value="Expense">Expense</option>
                    <option value="Income">Income</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Category
                  <select
                    value={draft.category}
                    onChange={(e) =>
                      setDraft({ ...draft, category: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-emerald-500"
                  >
                    {categories
                      .filter((category) =>
                        draft.type === "Income"
                          ? ["Salary", "Freelance", "Other"].includes(category)
                          : category !== "Salary" && category !== "Freelance"
                      )
                      .map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Date
                  <input
                    required
                    type="date"
                    value={draft.date}
                    onChange={(e) =>
                      setDraft({ ...draft, date: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-emerald-500"
                  />
                </label>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
                  >
                    Add to current view
                  </button>
                </div>
              </form>

              <p className="mt-3 text-xs text-amber-700">
                Currently, new entries are added to this page session only.
                Persistent saving to MySQL will be implemented separately.
              </p>
            </section>
          )}

          {editingTransaction && (
            <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">Edit transaction</h3>
              <p className="mt-1 text-sm text-slate-500">
                Changes will be saved to MySQL.
              </p>

              <form
                onSubmit={handleUpdateTransaction}
                className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <label className="text-sm font-medium text-slate-700">
                  Description
                  <input
                    required
                    value={editDraft.title}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, title: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Amount (₹)
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editDraft.amount}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, amount: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Type
                  <select
                    value={editDraft.type}
                    onChange={(e) => {
                      const type = e.target.value as TransactionType;

                      setEditDraft({
                        ...editDraft,
                        type,
                        category: type === "Income" ? "Salary" : "Food & dining",
                      });
                    }}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3"
                  >
                    <option value="Expense">Expense</option>
                    <option value="Income">Income</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Category
                  <select
                    value={editDraft.category}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, category: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3"
                  >
                    {categories
                      .filter((category) =>
                        editDraft.type === "Income"
                          ? ["Salary", "Freelance", "Other"].includes(category)
                          : category !== "Salary" && category !== "Freelance"
                      )
                      .map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Date
                  <input
                    required
                    type="date"
                    value={editDraft.date}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, date: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
                  />
                </label>

                <div className="flex items-end gap-3">
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
                  >
                    Save changes
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingTransaction(null)}
                    className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Total income</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
                  ↙
                </span>
              </div>
              <p className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
                {money(income)}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Money received this month
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Total expenses
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-lg text-orange-600">
                  ↗
                </span>
              </div>
              <p className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
                {money(expenses)}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Money spent this month
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Remaining balance
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600">
                  ₹
                </span>
              </div>
              <p
                className={`mt-5 text-2xl font-bold tracking-tight sm:text-3xl ${
                  remaining < 0 ? "text-rose-600" : "text-slate-900"
                }`}
              >
                {money(remaining)}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Income minus expenses
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Budget remaining
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-lg text-violet-600">
                  ◎
                </span>
              </div>
              <p className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
                {money(budget - expenses)}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                From your monthly spending limit
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
            <div
              id="budgets"
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7 xl:col-span-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">Monthly budget</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Keep your spending within your limit.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setBudgetInput(String(budget));
                    setEditingBudget(!editingBudget);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {editingBudget ? "Close" : "Edit budget"}
                </button>
              </div>

              {editingBudget && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <label className="flex-1 text-sm font-medium">
                    Monthly limit (₹)
                    <input
                      type="number"
                      min="1"
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
                    />
                  </label>
                  <button
                    onClick={saveBudget}
                    className="mt-6 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Save limit
                  </button>
                </div>
              )}

              <div className="mt-7 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">You&apos;ve spent</p>
                  <p className="mt-1 text-3xl font-bold">{money(expenses)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Budget limit</p>
                  <p className="mt-1 text-lg font-semibold">{money(budget)}</p>
                </div>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetUsed > 100
                      ? "bg-rose-500"
                      : budgetUsed >= 80
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                />
              </div>

              <div className="mt-3 flex justify-between gap-3 text-xs">
                <span
                  className={
                    budgetUsed >= 80
                      ? "font-semibold text-amber-600"
                      : "text-emerald-700"
                  }
                >
                  {budgetUsed > 100
                    ? "Budget exceeded"
                    : budgetUsed >= 80
                      ? "Approaching your limit"
                      : "Within your budget"}
                </span>
                <span className="font-semibold text-slate-600">
                  {budgetUsed.toFixed(1)}% used
                </span>
              </div>

              {budgetUsed >= 80 && (
                <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                  {budgetUsed > 100
                    ? "Your spending has exceeded the monthly budget. Review your expenses."
                    : "You have used at least 80% of your monthly budget. Keep an eye on further spending."}
                </p>
              )}

              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Budget left</p>
                  <p className="mt-2 text-lg font-bold">
                    {money(budget - expenses)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Savings rate</p>
                  <p className="mt-2 text-lg font-bold">
                    {income > 0
                      ? `${((remaining / income) * 100).toFixed(1)}%`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div
              id="categories"
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7 xl:col-span-2"
            >
              <div>
                <h3 className="text-lg font-bold">Spending categories</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Where your money goes.
                </p>
              </div>

              {categoryRows.length === 0 ? (
                <p className="mt-8 text-sm text-slate-400">
                  {databaseStatus === "loading"
                    ? "Loading expenses..."
                    : "No expenses recorded for this month yet."}
                </p>
              ) : (
                <div className="mt-6 space-y-5">
                  {categoryRows.slice(0, 6).map(([category, amount]) => {
                    const style =
                      categoryStyle[category] || categoryStyle.Other;
                    const share = expenses > 0 ? (amount / expenses) * 100 : 0;

                    return (
                      <div key={category}>
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-semibold"
                            style={{
                              color: style.color,
                              backgroundColor: style.bg,
                            }}
                          >
                            {style.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap justify-between gap-2">
                              <span className="text-sm font-semibold">
                                {category}
                              </span>
                              <span className="text-sm font-semibold">
                                {money(amount)}
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${share}%`,
                                  backgroundColor: style.color,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section
            id="transactions"
            className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
              <div>
                <h3 className="text-lg font-bold">Recent transactions</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Your income and expenses for {monthLabel}.
                </p>
              </div>
              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {visibleTransactions.length} records
              </span>
            </div>

            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-7">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions..."
                aria-label="Search transactions"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 sm:max-w-xs"
              />

              <select
                aria-label="Filter transaction type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 sm:ml-auto"
              >
                <option value="All">All transactions</option>
                <option value="Income">Income only</option>
                <option value="Expense">Expenses only</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-7 py-4 font-semibold">Transaction</th>
                    <th className="px-4 py-4 font-semibold">Category</th>
                    <th className="px-4 py-4 font-semibold">Date</th>
                    <th className="px-4 py-4 font-semibold">Type</th>
                    <th className="px-7 py-4 text-right font-semibold">Amount</th>
                    <th className="px-5 py-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleTransactions.map((transaction) => {
                    const style =
                      categoryStyle[transaction.category] || categoryStyle.Other;

                    return (
                      <tr
                        key={transaction.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-7 py-4">
                          <div className="flex items-center gap-3">
                            <span
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-semibold"
                              style={{
                                color: style.color,
                                backgroundColor: style.bg,
                              }}
                            >
                              {style.icon}
                            </span>
                            <span className="text-sm font-semibold">
                              {transaction.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-500">
                          {transaction.category}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-500">
                          {dateLabel(transaction.date)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              transaction.type === "Income"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-orange-50 text-orange-700"
                            }`}
                          >
                            {transaction.type}
                          </span>
                        </td>
                        <td
                          className={`px-7 py-4 text-right text-sm font-bold ${
                            transaction.type === "Income"
                              ? "text-emerald-600"
                              : "text-slate-800"
                          }`}
                        >
                          {transaction.type === "Income" ? "+" : "−"}
                          {money(transaction.amount)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(transaction)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteTransaction(transaction.id)
                              }
                              className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {visibleTransactions.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-sm text-slate-400"
                      >
                        {databaseStatus === "loading"
                          ? "Loading transactions..."
                          : "No matching transactions. Try another search or add a transaction."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="pb-3 text-center text-xs leading-6 text-slate-400">
            RupeeWise · Monthly Expense Tracker
            <br />
            Transactions are loaded from MySQL. New entries and budget edits
            are still temporary until their save endpoints are implemented.
          </footer>
        </div>
      </main>
    </div>
  );
}