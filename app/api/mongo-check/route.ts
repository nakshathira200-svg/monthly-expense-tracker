import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongo";

export async function GET() {
  try {
    const db = await getMongoDb();
    const result = await db.command({ ping: 1 });

    return NextResponse.json({
      ok: result.ok === 1,
      database: db.databaseName,
      message: "MongoDB connection successful",
    });
  } catch (error) {
    console.error("MongoDB connection check failed:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          "MongoDB connection failed. Check the service and configuration.",
      },
      { status: 500 }
    );
  }
}