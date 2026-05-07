"use client";
import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import Link from "next/link";
import { yen } from "@/lib/utils";
import { Input } from "./ui/input";

type Row = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number | null;
  totalScore: number;
  trendOrClassic: string;
  awardCount: number;
};

export function RankingTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = React.useState("");
  const filtered = React.useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter((r) =>
      [r.name, r.brand, r.category].some((s) => s.toLowerCase().includes(k)),
    );
  }, [q, rows]);

  return (
    <div className="space-y-3">
      <Input placeholder="検索: ブランド / SKU / カテゴリ" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>ブランド</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead className="text-right">価格</TableHead>
              <TableHead className="text-right">受賞</TableHead>
              <TableHead>判定</TableHead>
              <TableHead className="text-right">スコア</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-zinc-500">{i + 1}</TableCell>
                <TableCell>
                  <Link href={`/sku/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                </TableCell>
                <TableCell>{r.brand}</TableCell>
                <TableCell>{r.category}</TableCell>
                <TableCell className="text-right">{yen(r.price)}</TableCell>
                <TableCell className="text-right">{r.awardCount}</TableCell>
                <TableCell>
                  <Badge variant={r.trendOrClassic === "trend" ? "trend" : r.trendOrClassic === "classic" ? "classic" : r.trendOrClassic === "both" ? "both" : "secondary"}>
                    {r.trendOrClassic === "trend" ? "トレンド" : r.trendOrClassic === "classic" ? "定番" : r.trendOrClassic === "both" ? "両立" : "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-bold text-rose-600">{Math.round(r.totalScore)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
