import { NextResponse } from "next/server";

const pins: { who: string; t: string; at: string }[] = [];

export async function GET() {
  return NextResponse.json({ pins, template: true, persist: "memory-this-instance" });
}

export async function POST(req: Request) {
  const body = await req.json();
  const who = String(body.who || "neighbor");
  const t = String(body.t || "").trim().slice(0, 500);
  if (!t) return NextResponse.json({ ok: false }, { status: 400 });
  const rec = { who, t, at: new Date().toISOString() };
  pins.unshift(rec);
  if (pins.length > 80) pins.pop();
  return NextResponse.json({ ok: true, rec, count: pins.length });
}
