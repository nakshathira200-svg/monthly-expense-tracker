import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";

type BudgetRow = RowDataPacket & {
  total_budget: number | string;
};

function validMonth(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
  );
}

function unauthorized() {
  return NextResponse.json(
    { message: "Please sign in to access your budget." },
    { status: 401 }
  );
}

// GET: retrieve the signed-in user's budget for a selected month.
export async function GET(request: Request) {
  const session = await getSession();

  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (!validMonth(month)) {
    return NextResponse.json(
      { message: "Provide a valid month in YYYY-MM format." },
      { status: 400 }
    );
  }

  try {
    const [rows] = await pool.execute<BudgetRow[]>(
      `SELECT total_budget
       FROM monthly_budgets
       WHERE user_id = ? AND budget_month = ?
       LIMIT 1`,
      [session.userId, `${month}-01`]
    );

    return NextResponse.json({
      month,
      budget: rows.length ? Number(rows[0].total_budget) : 30000,
    });
  } catch (error) {
    console.error("Budget GET failed:", error);

    return NextResponse.json(
      { message: "Unable to load the monthly budget." },
      { status: 500 }
    );
  }
}

// PUT: save or update the signed-in user's monthly budget.
export async function PUT(request: Request) {
  const session = await getSession();

  if (!session) return unauthorized();

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 }
    );
  }

  const { month, budget } = body as {
    month?: unknown;
    budget?: unknown;
  };

  if (
    !validMonth(month) ||
    typeof budget !== "number" ||
    !Number.isFinite(budget) ||
    budget <= 0 ||
    budget > 9999999999.99
  ) {
    return NextResponse.json(
      { message: "Provide a valid month and positive budget amount." },
      { status: 400 }
    );
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO monthly_budgets
         (user_id, budget_month, total_budget)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_budget = VALUES(total_budget)`,
      [session.userId, `${month}-01`, budget]
    );

    return NextResponse.json({
      ok: true,
      month,
      budget,
    });
  } catch (error) {
    console.error("Budget PUT failed:", error);

    return NextResponse.json(
      { message: "Unable to save the monthly budget." },
      { status: 500 }
    );
  }
}