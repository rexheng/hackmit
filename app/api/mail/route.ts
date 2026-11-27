import { NextResponse } from "next/server";
import { sendCivicMail } from "@/lib/mail";

export async function POST(req: Request) {
  const body = await req.json();
  const citizenName = String(body.citizenName || "").trim().slice(0, 120);
  const citizenEmail = String(body.citizenEmail || "").trim().slice(0, 180);
  const city = String(body.city || "").trim().slice(0, 80);
  const extraTo = String(body.extraTo || "").trim().slice(0, 180);
  const subject = String(body.subject || "Restamp").slice(0, 180);
  const letter = String(body.body || "").slice(0, 20_000);

  if (!citizenName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(citizenEmail)) {
    return NextResponse.json(
      { ok: false, demo: false, error: "Name and a valid From email are required." },
      { status: 400 },
    );
  }

  const result = await sendCivicMail({
    citizenName,
    citizenEmail,
    city,
    extraTo,
    subject,
    body: letter,
  });

  return NextResponse.json(result, { status: result.ok || result.demo ? 200 : 502 });
}
