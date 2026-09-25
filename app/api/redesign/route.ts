import { NextResponse } from "next/server";
import { interpretRedesign } from "@/lib/redesign";
import { HERO, type LayoutState } from "@/lib/site";

export async function POST(req: Request) {
  const body = (await req.json()) as { prompt?: string; layout?: LayoutState };
  const prompt = (body.prompt || "").slice(0, 4000);
  const layout = body.layout || HERO.layout;
  return NextResponse.json(interpretRedesign(prompt, layout));
}
