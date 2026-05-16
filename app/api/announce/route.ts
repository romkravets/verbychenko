import { db } from "@/lib/db";
import { generateAnnouncement, generateCommercialAnnouncement } from "@/lib/llm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний запит" }, { status: 400 });
  }

  const type = (body.type as string) === "COMMERCIAL" ? "COMMERCIAL" : "DATING";

  // ── Commercial ─────────────────────────────────────────────────────────
  if (type === "COMMERCIAL") {
    const { city, itemTitle, price, contactPhone, about, name } = body as Record<string, unknown>;
    if (!city || !itemTitle || !about) {
      return NextResponse.json(
        { error: "Заповніть обов'язкові поля: місто, що пропонується, деталі" },
        { status: 400 }
      );
    }

    let aiText: string;
    try {
      aiText = await generateCommercialAnnouncement({
        city: String(city),
        itemTitle: String(itemTitle),
        price: price ? String(price) : undefined,
        contactPhone: contactPhone ? String(contactPhone) : undefined,
        about: String(about),
      });
    } catch (err) {
      console.error("[announce/commercial] LLM error:", err);
      return NextResponse.json(
        { error: "Не вдалося згенерувати текст. Спробуйте ще раз." },
        { status: 502 }
      );
    }

    let announcement: { id: string };
    try {
      announcement = await db.announcement.create({
        data: {
          type: "COMMERCIAL",
          name: String(name ?? "Оголошувач"),
          age: 0,
          city: String(city),
          about: String(about),
          lookingFor: "",
          itemTitle: String(itemTitle),
          price: price ? String(price) : undefined,
          contactPhone: contactPhone ? String(contactPhone) : undefined,
          aiText,
        },
      });
    } catch (err) {
      console.error("[announce/commercial] DB error:", err);
      return NextResponse.json({ error: "Помилка збереження." }, { status: 500 });
    }

    return NextResponse.json({ id: announcement.id, aiText });
  }

  // ── Dating ─────────────────────────────────────────────────────────────
  const { name, age, city, height, weight, hairColor, education, housing, about, lookingFor } =
    body as Record<string, unknown>;

  if (!name || !age || !city || !about || !lookingFor) {
    return NextResponse.json({ error: "Заповніть всі обов'язкові поля" }, { status: 400 });
  }

  let aiText: string;
  try {
    aiText = await generateAnnouncement({
      name: String(name),
      age: Number(age),
      city: String(city),
      height: height ? Number(height) : undefined,
      weight: weight ? Number(weight) : undefined,
      hairColor: hairColor ? String(hairColor) : undefined,
      education: education ? String(education) : undefined,
      housing: housing ? String(housing) : undefined,
      about: String(about),
      lookingFor: String(lookingFor),
    });
  } catch (err) {
    console.error("[announce] LLM error:", err);
    return NextResponse.json(
      { error: "Не вдалося згенерувати текст. Спробуйте ще раз." },
      { status: 502 }
    );
  }

  let announcement: { id: string };
  try {
    announcement = await db.announcement.create({
      data: {
        type: "DATING",
        name: String(name),
        age: Number(age),
        city: String(city),
        height: height ? Number(height) : undefined,
        weight: weight ? Number(weight) : undefined,
        hairColor: hairColor ? String(hairColor) : undefined,
        education: education ? String(education) : undefined,
        housing: housing ? String(housing) : undefined,
        about: String(about),
        lookingFor: String(lookingFor),
        aiText,
      },
    });
  } catch (err) {
    console.error("[announce] DB error:", err);
    return NextResponse.json({ error: "Помилка збереження. Спробуйте ще раз." }, { status: 500 });
  }

  return NextResponse.json({ id: announcement.id, aiText });
}
