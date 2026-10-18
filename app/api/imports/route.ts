import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongo";
import { getSession } from "@/lib/auth";

type ImportRow = Record<string, unknown>;

type ImportBatch = {
  userId: number;
  sourceName: string;
  importedAt: Date;
  status: "PENDING_REVIEW" | "CONVERTING" | "CONVERTED";
  rowCount: number;
  rows: ImportRow[];
};

function unauthorized() {
  return NextResponse.json(
    { message: "Please sign in to access statement imports." },
    { status: 401 }
  );
}

// GET: return only the signed-in user's import batches.
export async function GET() {
  const session = await getSession();

  if (!session) return unauthorized();

  try {
    const db = await getMongoDb();

    const batches = await db
      .collection<ImportBatch>("bank_statement_imports")
      .find({ userId: session.userId })
      .sort({ importedAt: -1 })
      .limit(20)
      .toArray();

    return NextResponse.json(
      batches.map((batch) => ({
        id: batch._id.toString(),
        sourceName: batch.sourceName,
        importedAt: batch.importedAt.toISOString(),
        status: batch.status,
        rowCount: batch.rowCount,
        preview: batch.rows.slice(0, 3),
      }))
    );
  } catch (error) {
    console.error("Import batches GET failed:", error);

    return NextResponse.json(
      { message: "Unable to load statement imports." },
      { status: 500 }
    );
  }
}

// POST: create an import batch owned by the signed-in user.
export async function POST(request: Request) {
  const session = await getSession();

  if (!session) return unauthorized();

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 }
    );
  }

  const { sourceName, rows } = body as {
    sourceName?: unknown;
    rows?: unknown;
  };

  if (
    typeof sourceName !== "string" ||
    !sourceName.trim() ||
    sourceName.trim().length > 255
  ) {
    return NextResponse.json(
      { message: "Provide a valid statement name." },
      { status: 400 }
    );
  }

  if (
    !Array.isArray(rows) ||
    rows.length === 0 ||
    rows.length > 500
  ) {
    return NextResponse.json(
      { message: "Provide between 1 and 500 statement rows." },
      { status: 400 }
    );
  }

  const validRows = rows.every(
    (row) =>
      row !== null &&
      typeof row === "object" &&
      !Array.isArray(row)
  );

  if (!validRows) {
    return NextResponse.json(
      { message: "Each statement row must be an object." },
      { status: 400 }
    );
  }

  try {
    const db = await getMongoDb();

    const batch: ImportBatch = {
      userId: session.userId,
      sourceName: sourceName.trim(),
      importedAt: new Date(),
      status: "PENDING_REVIEW",
      rowCount: rows.length,
      rows: rows as ImportRow[],
    };

    const result = await db
      .collection<ImportBatch>("bank_statement_imports")
      .insertOne(batch);

    return NextResponse.json(
      {
        ok: true,
        id: result.insertedId.toString(),
        sourceName: batch.sourceName,
        status: batch.status,
        rowCount: batch.rowCount,
        message: "Statement import saved for review.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Import batches POST failed:", error);

    return NextResponse.json(
      { message: "Unable to save the statement import." },
      { status: 500 }
    );
  }
}