import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";

type TransactionRow = RowDataPacket & {
  id: number;
  title: string;
  category: string;
  date: string;
  amount: number | string;
  type: "Income" | "Expense";
};

type CategoryRow = RowDataPacket & {
  category_id: number;
};

function validDate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function unauthorized() {
  return NextResponse.json(
    { message: "Please sign in to access your transactions." },
    { status: 401 }
  );
}

async function findCategory(
  category: string,
  type: "INCOME" | "EXPENSE"
) {
  const [rows] = await pool.execute<CategoryRow[]>(
    `SELECT category_id
     FROM categories
     WHERE name = ? AND transaction_type = ?
     LIMIT 1`,
    [category, type]
  );

  return rows[0] ?? null;
}

async function getSavedTransaction(id: number, userId: number) {
  const [rows] = await pool.execute<TransactionRow[]>(
    `SELECT
       t.transaction_id AS id,
       t.description AS title,
       c.name AS category,
       DATE_FORMAT(t.transaction_date, '%Y-%m-%d') AS date,
       t.amount,
       CASE
         WHEN t.transaction_type = 'INCOME' THEN 'Income'
         ELSE 'Expense'
       END AS type
     FROM transactions t
     JOIN categories c ON c.category_id = t.category_id
     WHERE t.transaction_id = ? AND t.user_id = ?
     LIMIT 1`,
    [id, userId]
  );

  if (!rows.length) return null;

  return {
    ...rows[0],
    id: Number(rows[0].id),
    amount: Number(rows[0].amount),
  };
}

// GET: list only the signed-in user's transactions.
export async function GET() {
  const session = await getSession();

  if (!session) return unauthorized();

  try {
    const [rows] = await pool.execute<TransactionRow[]>(
      `SELECT
         t.transaction_id AS id,
         t.description AS title,
         c.name AS category,
         DATE_FORMAT(t.transaction_date, '%Y-%m-%d') AS date,
         t.amount,
         CASE
           WHEN t.transaction_type = 'INCOME' THEN 'Income'
           ELSE 'Expense'
         END AS type
       FROM transactions t
       JOIN categories c ON c.category_id = t.category_id
       WHERE t.user_id = ?
       ORDER BY t.transaction_date DESC, t.transaction_id DESC`,
      [session.userId]
    );

    return NextResponse.json(
      rows.map((row) => ({
        ...row,
        id: Number(row.id),
        amount: Number(row.amount),
      }))
    );
  } catch (error) {
    console.error("Transactions GET failed:", error);

    return NextResponse.json(
      { message: "Unable to load transactions." },
      { status: 500 }
    );
  }
}

// POST: create a transaction for the signed-in user.
export async function POST(request: Request) {
  const session = await getSession();

  if (!session) return unauthorized();

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 }
    );
  }

  const { title, amount, category, date, type } = body as Record<
    string,
    unknown
  >;

  const parsedAmount = Number(amount);

  const transactionType =
    type === "Income"
      ? "INCOME"
      : type === "Expense"
        ? "EXPENSE"
        : null;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 150 ||
    typeof category !== "string" ||
    !validDate(date) ||
    !transactionType ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0 ||
    parsedAmount > 9999999999.99
  ) {
    return NextResponse.json(
      { message: "Enter valid transaction details." },
      { status: 400 }
    );
  }

  try {
    const matchedCategory = await findCategory(
      category.trim(),
      transactionType
    );

    if (!matchedCategory) {
      return NextResponse.json(
        { message: "Category does not match the transaction type." },
        { status: 400 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO transactions
         (user_id, category_id, transaction_type,
          description, amount, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        session.userId,
        matchedCategory.category_id,
        transactionType,
        title.trim(),
        parsedAmount,
        date,
      ]
    );

    const saved = await getSavedTransaction(
      Number(result.insertId),
      session.userId
    );

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error("Transactions POST failed:", error);

    return NextResponse.json(
      { message: "Unable to save the transaction." },
      { status: 500 }
    );
  }
}

// PUT: update a transaction owned by the signed-in user.
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

  const { id, title, amount, category, date, type } = body as Record<
    string,
    unknown
  >;

  const transactionId = Number(id);
  const parsedAmount = Number(amount);

  const transactionType =
    type === "Income"
      ? "INCOME"
      : type === "Expense"
        ? "EXPENSE"
        : null;

  if (
    !Number.isSafeInteger(transactionId) ||
    transactionId <= 0 ||
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 150 ||
    typeof category !== "string" ||
    !category.trim() ||
    !validDate(date) ||
    !transactionType ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0 ||
    parsedAmount > 9999999999.99
  ) {
    return NextResponse.json(
      { message: "Enter valid transaction details." },
      { status: 400 }
    );
  }

  try {
    const existing = await getSavedTransaction(
      transactionId,
      session.userId
    );

    if (!existing) {
      return NextResponse.json(
        { message: "Transaction not found." },
        { status: 404 }
      );
    }

    const matchedCategory = await findCategory(
      category.trim(),
      transactionType
    );

    if (!matchedCategory) {
      return NextResponse.json(
        { message: "Category does not match the transaction type." },
        { status: 400 }
      );
    }

    await pool.execute(
      `UPDATE transactions
       SET description = ?,
           amount = ?,
           category_id = ?,
           transaction_type = ?,
           transaction_date = ?
       WHERE transaction_id = ? AND user_id = ?`,
      [
        title.trim(),
        parsedAmount,
        matchedCategory.category_id,
        transactionType,
        date,
        transactionId,
        session.userId,
      ]
    );

    const saved = await getSavedTransaction(
      transactionId,
      session.userId
    );

    return NextResponse.json(saved);
  } catch (error) {
    console.error("Transactions PUT failed:", error);

    return NextResponse.json(
      { message: "Unable to update the transaction." },
      { status: 500 }
    );
  }
}

// DELETE: remove only a transaction owned by the signed-in user.
export async function DELETE(request: Request) {
  const session = await getSession();

  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));

  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json(
      { message: "Provide a valid transaction ID." },
      { status: 400 }
    );
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM transactions
       WHERE transaction_id = ? AND user_id = ?`,
      [id, session.userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Transaction not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      deletedId: id,
    });
  } catch (error) {
    console.error("Transactions DELETE failed:", error);

    return NextResponse.json(
      { message: "Unable to delete the transaction." },
      { status: 500 }
    );
  }
}