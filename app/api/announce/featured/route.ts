import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Returns a random approved announcement.
// ?type=DATING     → only dating announcements
// ?type=COMMERCIAL → only commercial announcements
// ?exclude=id1,id2 → comma-separated IDs to skip (prevents repeats in a session)
// no param         → any approved (used for the splash overlay)
export async function GET(req: NextRequest) {
  const typeParam = req.nextUrl.searchParams.get("type"); // "DATING" | "COMMERCIAL" | null
  const excludeParam = req.nextUrl.searchParams.get("exclude"); // comma-separated IDs
  const excludeIds = excludeParam
    ? excludeParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const approved = await db.announcement.findMany({
    where: {
      status: "APPROVED",
      aiText: { not: null },
      ...(typeParam ? { type: typeParam as "DATING" | "COMMERCIAL" } : {}),
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      type: true,
      name: true,
      city: true,
      aiText: true,
      itemTitle: true,
      price: true,
      contactPhone: true,
    },
  });

  if (approved.length === 0) {
    return NextResponse.json({ announcement: null });
  }

  const pick = approved[Math.floor(Math.random() * approved.length)];
  return NextResponse.json({ announcement: pick });
}
