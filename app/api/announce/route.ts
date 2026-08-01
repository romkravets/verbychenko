import { createConfirmToken } from "@/lib/announce-confirm-token";
import { db } from "@/lib/db";
import {
  generateAnnouncement,
  generateCommercialAnnouncement,
} from "@/lib/llm";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

// Field length limits to prevent LLM token abuse
const LIMITS = {
  name: 80,
  city: 80,
  about: 800,
  lookingFor: 500,
  itemTitle: 200,
  price: 30,
  contactPhone: 20,
};

function truncate(val: unknown, max: number): string {
  return String(val ?? "").slice(0, max);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний запит" }, { status: 400 });
  }

  // Rate limit: 5 submissions per IP per 10 minutes
  const ip = getIp(req);
  const rl = rateLimit(`announce:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Забагато запитів. Спробуйте через кілька хвилин." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const type = (body.type as string) === "COMMERCIAL" ? "COMMERCIAL" : "DATING";

  // ── Commercial ─────────────────────────────────────────────────────────
  if (type === "COMMERCIAL") {
    const { city, itemTitle, price, contactPhone, about, name } =
      body as Record<string, unknown>;
    if (!city || !itemTitle || !about) {
      return NextResponse.json(
        { error: "Заповніть обов'язкові поля: місто, що пропонується, деталі" },
        { status: 400 },
      );
    }

    let aiText: string;
    try {
      aiText = await generateCommercialAnnouncement({
        city: truncate(city, LIMITS.city),
        itemTitle: truncate(itemTitle, LIMITS.itemTitle),
        price: price ? truncate(price, LIMITS.price) : undefined,
        contactPhone: contactPhone
          ? truncate(contactPhone, LIMITS.contactPhone)
          : undefined,
        about: truncate(about, LIMITS.about),
      });
    } catch (err) {
      console.error("[announce/commercial] LLM error:", err);
      return NextResponse.json(
        { error: "Не вдалося згенерувати текст. Спробуйте ще раз." },
        { status: 502 },
      );
    }

    let announcement: { id: string };
    try {
      announcement = await db.announcement.create({
        data: {
          type: "COMMERCIAL",
          name: truncate(name ?? "Оголошувач", LIMITS.name),
          age: 0,
          city: truncate(city, LIMITS.city),
          about: truncate(about, LIMITS.about),
          lookingFor: "",
          itemTitle: truncate(itemTitle, LIMITS.itemTitle),
          price: price ? truncate(price, LIMITS.price) : undefined,
          contactPhone: contactPhone
            ? truncate(contactPhone, LIMITS.contactPhone)
            : undefined,
          aiText,
        },
      });
    } catch (err) {
      console.error("[announce/commercial] DB error:", err);
      return NextResponse.json(
        { error: "Помилка збереження." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: announcement.id,
      aiText,
      confirmToken: createConfirmToken(announcement.id),
    });
  }

  // ── Dating ─────────────────────────────────────────────────────────────
  const {
    name,
    age,
    city,
    height,
    weight,
    hairColor,
    education,
    housing,
    about,
    lookingFor,
  } = body as Record<string, unknown>;

  if (!name || !age || !city || !about || !lookingFor) {
    return NextResponse.json(
      { error: "Заповніть всі обов'язкові поля" },
      { status: 400 },
    );
  }

  let aiText: string;
  try {
    aiText = await generateAnnouncement({
      name: truncate(name, LIMITS.name),
      age: Number(age),
      city: truncate(city, LIMITS.city),
      height: height ? Number(height) : undefined,
      weight: weight ? Number(weight) : undefined,
      hairColor: hairColor ? truncate(hairColor, 40) : undefined,
      education: education ? truncate(education, 100) : undefined,
      housing: housing ? truncate(housing, 100) : undefined,
      about: truncate(about, LIMITS.about),
      lookingFor: truncate(lookingFor, LIMITS.lookingFor),
    });
  } catch (err) {
    console.error("[announce] LLM error:", err);
    return NextResponse.json(
      { error: "Не вдалося згенерувати текст. Спробуйте ще раз." },
      { status: 502 },
    );
  }

  let announcement: { id: string };
  try {
    announcement = await db.announcement.create({
      data: {
        type: "DATING",
        name: truncate(name, LIMITS.name),
        age: Number(age),
        city: truncate(city, LIMITS.city),
        height: height ? Number(height) : undefined,
        weight: weight ? Number(weight) : undefined,
        hairColor: hairColor ? truncate(hairColor, 40) : undefined,
        education: education ? truncate(education, 100) : undefined,
        housing: housing ? truncate(housing, 100) : undefined,
        about: truncate(about, LIMITS.about),
        lookingFor: truncate(lookingFor, LIMITS.lookingFor),
        aiText,
      },
    });
  } catch (err) {
    console.error("[announce] DB error:", err);
    return NextResponse.json(
      { error: "Помилка збереження. Спробуйте ще раз." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: announcement.id,
    aiText,
    confirmToken: createConfirmToken(announcement.id),
  });
}
