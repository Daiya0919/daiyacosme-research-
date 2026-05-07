import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResearchForm } from "./form";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const awards = await prisma.award.findMany({ orderBy: { name: "asc" } });
  const categories = await prisma.category.findMany({ orderBy: { order: "asc" } });
  const jobs = await prisma.researchJob.findMany({
    orderBy: { startedAt: "desc" },
    take: 10,
    include: { logs: { orderBy: { createdAt: "desc" }, take: 5 } },
  });
  const needsReview = await prisma.source.findMany({
    where: { needsReview: true },
    orderBy: { fetchedAt: "desc" },
    take: 20,
    include: { award: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">リサーチ実行</h1>
        <p className="text-sm text-zinc-500 mt-1">
          検索クエリは自動生成されます (例: "{`{アワード名} {年} {カテゴリ} 受賞 商品`}"). 公式・媒体公式・EC公式を優先し、信頼度が低いものは「要確認」フラグを立てます。
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>パラメータ</CardTitle></CardHeader>
        <CardContent>
          <ResearchForm
            awards={awards.map((a) => ({ slug: a.slug, name: a.name }))}
            categories={categories.map((c) => c.name)}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>取得状況（直近10ジョブ）</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {jobs.length === 0 && <p className="text-sm text-zinc-500">まだリサーチジョブがありません。</p>}
            {jobs.map((j) => (
              <div key={j.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={j.status === "completed" ? "classic" : j.status === "failed" ? "warn" : "info"}>{j.status}</Badge>
                    <span className="text-zinc-500 text-xs">{new Date(j.startedAt).toLocaleString("ja-JP")}</span>
                  </div>
                  <div className="text-xs">取得 {j.collected} / 要確認 {j.needsReview}</div>
                </div>
                {j.error && <div className="mt-2 text-xs text-red-600">{j.error}</div>}
                <ul className="mt-2 space-y-0.5 text-xs text-zinc-600">
                  {j.logs.map((l) => <li key={l.id}>{l.level}: {l.message}</li>)}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>要確認データ（直近20件）</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {needsReview.length === 0 && <p className="text-sm text-zinc-500">要確認の出典はありません。</p>}
            {needsReview.map((s) => (
              <div key={s.id} className="rounded-md border px-3 py-2 text-sm flex items-start gap-2">
                <Badge variant="warn">信頼度 {Math.round(s.reliability * 100)}</Badge>
                <div className="flex-1 min-w-0">
                  <a href={s.url} target="_blank" rel="noreferrer" className="block hover:underline truncate">
                    {s.title || s.url}
                  </a>
                  <div className="text-xs text-zinc-500">{s.award?.name} {s.year}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
