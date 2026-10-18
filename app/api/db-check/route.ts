import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";


type DatabaseCheckRow = RowDataPacket & {
  database_name: string;
  category_count: number;
};

export async function GET() {
  try {
    const [rows] = await pool.query<DatabaseCheckRow[]>(
      `SELECT DATABASE() AS database_name,
        (SELECT COUNT(*) FROM categories) AS category_count`
    );

    const result = rows[0];

    return NextResponse.json({
      ok: true,
      database: result.database_name,
      categoryCount: Number(result.category_count),
    });
  } catch (error) {
    console.error("MySQL connection check failed:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "MySQL connection failed. Check server configuration.",
      },
      { status: 500 }
    );
  }
}