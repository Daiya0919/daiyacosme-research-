import { NextResponse } from "next/server";
import { buildCsv, CSV_TYPES, type CsvType } from "@/lib/csv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { type: string } }) {
  if (!(CSV_TYPES as readonly string[]).includes(params.type)) {
    return NextResponse.json({ error: "unknown csv type" }, { status: 400 });
  }
  const body = await buildCsv(params.type as CsvType);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${params.type}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
