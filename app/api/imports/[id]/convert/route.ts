import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { ResultSetHeader } from "mysql2";
import { pool } from "@/lib/db";
import { getMongoDb } from "@/lib/mongo";
import { getSession } from "@/lib/auth";

type StoredImport = {
  userId: number;
  status: string;
  sourceName?: string;
  rows: unknown[];
};

type CategoryRow = RowDataPacket & {
  category_id: number;
  name: string;
  transaction_type: "INCOME" | "EXPENSE";
};

type NormalizedRow = {
  description: string;
  amount: number;
  date: string;
  type: "INCOME" | "EXPENSE";
  categoryId: number;
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

function inferCategory(
  description: string,
  type: "INCOME" | "EXPENSE"
): string {
  const text = description.toLowerCase();

  if (type === "INCOME") {
    if (/salary|payroll|wage/.test(text)) return "Salary";
    if (/freelance|contract work/.test(text)) return "Freelance";
    return "Other";
  }

  if (/rent|housing|landlord/.test(text)) return "Housing";
  if (/grocery|groceries|supermarket|vegetable|provision/.test(text)) {
    return "Groceries";
  }
  if (/metro|cab|uber|taxi|bus|transport|fuel|petrol/.test(text)) {
    return "Transport";
  }
  if (/electric|water bill|wifi|internet|utility|bill/.test(text)) {
    return "Bills & utilities";
  }
  if (/food|lunch|dinner|restaurant|cafe|coffee|order|swiggy|zomato/.test(text)) {
    return "Food & dining";
  }
  if (/shopping|clothing|apparel|amazon|flipkart/.test(text)) {
    return "Shopping";
  }
  if (/pharmacy|medicine|medical|doctor|health/.test(text)) {
    return "Health";
  }
  if (/subscription|music|netflix|spotify/.test(text)) {
    return "Subscriptions";
  }

  return "Other";
}

function normalizeRow(
  input: unknown,
  categories: CategoryRow[]
): NormalizedRow {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new Error("Every statement row must be an object.");
  }

  const row = input as Record<string, unknown>;
  const descriptionValue =
    row.description ?? row.title ?? row.narration ?? row.particulars;

  if (
    typeof descriptionValue !== "string" ||
    !descriptionValue.trim() ||
    descriptionValue.trim().length > 150
  ) {
    throw new Error("Each row needs a description of 1–150 characters.");
  }

  if (!validDate(row.date)) {
    throw new Error("Each row needs a valid date in YYYY-MM-DD format.");
  }

  const amount = Number(row.amount);

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 9999999999.99
  ) {
    throw new Error("Each row needs a valid positive amount.");
  }

  const rawType = String(
    row.type ?? row.transaction_type ?? ""
  ).toLowerCase().trim();

  let type: "INCOME" | "EXPENSE";

  if (["credit", "income", "deposit", "cr"].includes(rawType)) {
    type = "INCOME";
  } else if (
    ["debit", "expense", "withdrawal", "dr"].includes(rawType)
  ) {
    type = "EXPENSE";
  } else {
    throw new Error(
      "Each row must identify income/credit or expense/debit."
    );
  }

  const explicitCategory =
    typeof row.category === "string" ? row.category.trim() : "";

  const explicitMatch = categories.find(
    (category) =>
      category.name === explicitCategory &&
      category.transaction_type === type
  );

  const categoryName =
    explicitMatch?.name ?? inferCategory(descriptionValue, type);

  const category = categories.find(
    (item) =>
      item.name === categoryName &&
      item.transaction_type === type
  );

  if (!category) {
    throw new Error(
      `No matching ${type.toLowerCase()} category exists for "${categoryName}".`
    );
  }

  return {
    description: descriptionValue.trim(),
    amount,
    date: row.date,
    type,
    categoryId: Number(category.category_id),
  };
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { message: "Please sign in to convert statement imports." },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { message: "Invalid import ID." },
      { status: 400 }
    );
  }

  let db;

  try {
    db = await getMongoDb();
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to MongoDB." },
      { status: 500 }
    );
  }

  const imports = db.collection<StoredImport>("bank_statement_imports");
  const objectId = new ObjectId(id);

  // Only find a batch belonging to the signed-in user.
  const batch = await imports.findOne({
    _id: objectId,
    userId: session.userId,
  });

  if (!batch) {
    return NextResponse.json(
      { message: "Import batch not found." },
      { status: 404 }
    );
  }

  if (batch.status !== "PENDING_REVIEW") {
    return NextResponse.json(
      {
        message:
          "This import is not pending review or has already been processed.",
      },
      { status: 409 }
    );
  }

  if (
    !Array.isArray(batch.rows) ||
    batch.rows.length === 0 ||
    batch.rows.length > 500
  ) {
    return NextResponse.json(
      { message: "The import must contain between 1 and 500 rows." },
      { status: 400 }
    );
  }

  let normalizedRows: NormalizedRow[];

  try {
    const [categoryRows] = await pool.query<CategoryRow[]>(
      "SELECT category_id, name, transaction_type FROM categories"
    );

    normalizedRows = batch.rows.map((row) =>
      normalizeRow(row, categoryRows)
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "The statement contains invalid rows.",
      },
      { status: 400 }
    );
  }

  // Claim the batch for this user to prevent simultaneous conversion.
  const claim = await imports.updateOne(
    {
      _id: objectId,
      userId: session.userId,
      status: "PENDING_REVIEW",
    },
    {
      $set: {
        status: "CONVERTING",
        conversionStartedAt: new Date(),
      },
    }
  );

  if (claim.modifiedCount !== 1) {
    return NextResponse.json(
      { message: "This batch is already being processed." },
      { status: 409 }
    );
  }

  let connection: PoolConnection | undefined;
  let mysqlCommitted = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Insert the transactions under the authenticated user's ID.
    for (const row of normalizedRows) {
      await connection.execute<ResultSetHeader>(
        `INSERT INTO transactions
          (user_id, category_id, transaction_type,
           description, amount, transaction_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          session.userId,
          row.categoryId,
          row.type,
          row.description,
          row.amount,
          row.date,
        ]
      );
    }

    await connection.commit();
    mysqlCommitted = true;

    const finalized = await imports.updateOne(
      {
        _id: objectId,
        userId: session.userId,
        status: "CONVERTING",
      },
      {
        $set: {
          status: "CONVERTED",
          convertedAt: new Date(),
          convertedCount: normalizedRows.length,
        },
        $unset: { conversionStartedAt: "" },
      }
    );

    if (finalized.modifiedCount !== 1) {
      return NextResponse.json(
        {
          message:
            "Transactions were created in MySQL, but MongoDB could not confirm the final status. Do not retry this batch; check its status first.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: "CONVERTED",
      convertedCount: normalizedRows.length,
      message: "Statement rows were converted into MySQL transactions.",
    });
  } catch (error) {
    console.error("Import conversion failed:", error);

    if (!mysqlCommitted) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {
          // Preserve the original failure.
        }
      }

      try {
        await imports.updateOne(
          {
            _id: objectId,
            userId: session.userId,
            status: "CONVERTING",
          },
          {
            $set: { status: "PENDING_REVIEW" },
            $unset: { conversionStartedAt: "" },
          }
        );
      } catch (resetError) {
        console.error("Unable to reset import status:", resetError);
      }
    }

    return NextResponse.json(
      {
        message: mysqlCommitted
          ? "MySQL transactions were created, but MongoDB could not confirm the final status. Do not retry this batch."
          : "Conversion failed. The MySQL transaction was rolled back where possible.",
      },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}