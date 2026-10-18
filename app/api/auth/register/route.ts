import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { ResultSetHeader } from "mysql2";
import { pool } from "@/lib/db";
import {
  createSessionToken,
  SESSION_COOKIE,
} from "@/lib/auth";


const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 }
    );
  }

  const { fullName, email, password } = body as {
    fullName?: unknown;
    email?: unknown;
    password?: unknown;
  };

  if (
    typeof fullName !== "string" ||
    !fullName.trim() ||
    fullName.trim().length > 100 ||
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    email.trim().length > 254 ||
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return NextResponse.json(
      {
        message:
          "Enter a valid name and email, and a password of at least 8 characters.",
      },
      { status: 400 }
    );
  }

  const normalizedName = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES (?, ?, ?, 'USER')`,
      [normalizedName, normalizedEmail, passwordHash]
    );

    const token = createSessionToken({
      userId: result.insertId,
      email: normalizedEmail,
      fullName: normalizedName,
      role: "USER",
    });

    const response = NextResponse.json(
      {
        ok: true,
        user: {
          id: result.insertId,
          fullName: normalizedName,
          email: normalizedEmail,
          role: "USER",
        },
      },
      { status: 201 }
    );

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (error) {
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? error.code
        : undefined;

    if (errorCode === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    console.error("Registration failed:", error);

    return NextResponse.json(
      { message: "Unable to create your account." },
      { status: 500 }
    );
  }
}