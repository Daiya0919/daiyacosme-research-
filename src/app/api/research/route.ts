import { NextResponse } from "next/server";
import { z } from "zod";
import { runResearch } from "@/lib/research-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  years: z.array(z.number().int()).min(1),
  awardSlugs: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  extraKeyword: z.string().optional(),
  perQueryLimit: z.number().int().min(1).max(20).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const v = Schema.parse(body);
    const result = await runResearch(v);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
