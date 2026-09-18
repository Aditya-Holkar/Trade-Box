import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const dynamic = "force-dynamic";

const unavailable = () =>
  NextResponse.json(
    { error: "Authentication is not configured. Set DATABASE_URL and BETTER_AUTH_SECRET." },
    { status: 503 },
  );

export async function GET(request: Request) {
  if (!auth) return unavailable();
  return toNextJsHandler(auth).GET(request);
}

export async function POST(request: Request) {
  if (!auth) return unavailable();
  return toNextJsHandler(auth).POST(request);
}
