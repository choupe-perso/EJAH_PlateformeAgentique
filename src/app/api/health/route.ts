import { NextResponse } from "next/server";
import { prisma } from "@/data/db";
import { appEnvironment } from "@/shared/env";

export async function GET() {
  const environment = appEnvironment();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", environment, database: "up" });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        environment,
        database: "down",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 503 }
    );
  }
}
