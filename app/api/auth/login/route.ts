import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import {
  createSessionToken,
  SESSION_COOKIE,
} from "@/lib/auth";

const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

type LoginUser = RowDataPacket & {
  user_id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role: "USER" | "ADMIN";
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 }
    );
  }

  const { email, password } = body as {
    email?: unknown;
    password?: unknown;
  };

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password ||
    email.trim().length > 254 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return NextResponse.json(
      { message: "Enter a valid email and password." },
      { status: 400 }
    );
  }

  try {
    const [users] = await pool.execute<LoginUser[]>(
      `SELECT user_id, full_name, email, password_hash, role
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    if (
      users.length === 0 ||
      !(await bcrypt.compare(password, users[0].password_hash))
    ) {
      return NextResponse.json(
        { message: "Incorrect email or password." },
        { status: 401 }
      );
    }

    const user = users[0];

    if (user.role !== "USER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "This account has an invalid role." },
        { status: 403 }
      );
    }

    const token = createSessionToken({
      userId: Number(user.user_id),
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: Number(user.user_id),
        fullName: user.full_name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("Login failed:", error);

    return NextResponse.json(
      { message: "Unable to sign in right now." },
      { status: 500 }
    );
  }
}