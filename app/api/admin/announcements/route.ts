import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function requireSecret(req: NextRequest) {
  const auth = req.headers.get("x-admin-secret");
  const secret = process.env.EPISODE_BUILD_SECRET;
  if (!secret || auth !== secret) return false;
  return true;
}

// GET /api/admin/announcements — list pending
export async function GET(req: NextRequest) {
  if (!requireSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ announcements });
}

// PATCH /api/admin/announcements — approve/reject by id
export async function PATCH(req: NextRequest) {
  if (!requireSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, status } = (await req.json()) as {
    id: string;
    status: "APPROVED" | "REJECTED";
  };
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  const updated = await db.announcement.update({
    where: { id },
    data: { status },
  });
  return NextResponse.json({ updated });
}
