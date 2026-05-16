import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Returns a random approved announcement for the splash overlay.
// Rotates between types: newest COMMERCIAL first, then DATING, then random.
export async function GET() {
  const approved = await db.announcement.findMany({
    where: { status: "APPROVED", aiText: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 20,
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

  // Prefer commercial if any exist
  const commercial = approved.filter((a) => a.type === "COMMERCIAL");
  const pool = commercial.length > 0 ? commercial : approved;
  const pick = pool[Math.floor(Math.random() * pool.length)];

  return NextResponse.json({ announcement: pick });
}
