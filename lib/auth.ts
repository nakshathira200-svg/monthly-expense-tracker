import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "rupeewise_session";

const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

export type AuthSession = {
  userId: number;
  email: string;
  fullName: string;
  role: "USER" | "ADMIN";
  expiresAt: number;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Check .env.local."
    );
  }

  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export function createSessionToken(
  user: Omit<AuthSession, "expiresAt">
): string {
  const session: AuthSession = {
    ...user,
    expiresAt:
      Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };

  const payload = Buffer.from(JSON.stringify(session)).toString(
    "base64url"
  );

  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(
  token: string
): AuthSession | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [payload, signature] = parts;
    const expectedSignature = sign(payload);

    const suppliedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      return null;
    }

    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as AuthSession;

    if (
      !Number.isSafeInteger(session.userId) ||
      session.userId <= 0 ||
      typeof session.email !== "string" ||
      typeof session.fullName !== "string" ||
      !["USER", "ADMIN"].includes(session.role) ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) {
      return null;
    }

    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export function setSessionCookie(
  response: Response & {
    cookies: {
      set: (
        name: string,
        value: string,
        options: Record<string, unknown>
      ) => void;
    };
  },
  token: string
): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export function clearSessionCookie(
  response: Response & {
    cookies: {
      set: (
        name: string,
        value: string,
        options: Record<string, unknown>
      ) => void;
    };
  }
): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}