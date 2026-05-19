import { BarChart2, Award, TrendingUp, BookOpen, Star, ShoppingCart, FlaskConical, Package, Zap, Globe } from "lucide-react";

export const metadata = {
  title: "スコアリング方法論 | ダイヤ総研",
};

const SCORE_AXES = [
  {
    key: "awardScore",
    label: "受賞実績スコア",
    weight: 16,
    icon: Award,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    formula: "Σ(rankToPoints(順位) × 媒体ウェイト) ÷ (受賞数 × 1.5)",
    detail: "全受賞履歴の質を加重平均で算出。単純な受賞数ではなく「少ない受賞で高評価」を得たSKUほど伸びる設計。",
  },
  {
    key: "trendScore",
    label: "トレンドスコア",
    weight: 12,
    icon: TrendingUp,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    formula: "直近受賞数(2024-25) × 18 + UGC/EC受賞数 × 8 + 新顔ボーナス 25",
    detail: "2024-25年の直近2年を重視。過去の実績がなく直近に突出したSKUには「新顔ボーナス+25」を加算。",
  },
  {
    key: "classicScore",
    label: "定番スコア",
    weight: 12,
    icon: BookOpen,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    formula: "継続受賞年数 × 18 + 異なる媒体種数 × 6",
    detail: "2021-2025の5年間で継続的に受賞し、かつ複数の媒体種（UGC・専門誌・EC等）にまたがるSKUを高評価。",
  },
  {
    key: "reviewPowerScore",
    label: "口コミスコア",
    weight: 10,
    icon: Star,
    color: "text-pink-600",
    bg: "bg-pink-50",
    border: "border-pink-200",
    formula: "UGC系受賞数 × 22 + UGC系rankToPoints合計 ÷ 4",
    detail: "@cosme・LIPS等のUGC（ユーザー生成コンテンツ）系アワードの実績から実消費者の支持強度を算出。",
  },
  {
    key: "ecPowerScore",
    label: "ECスコア",
    weight: 8,
    icon: ShoppingCart,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    formula: "EC系受賞数 × 28 + EC系rankToPoints合計 ÷ 3",
    detail: "楽天・Amazon等EC系アワードの結果からオンライン販売力を評価。重み係数は全軸中最大でリピート購買を反映。",
  },
  {
    key: "expertScore",
    label: "専門家スコア",
    weight: 10,
    icon: BookOpen,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    formula: "雑誌・業界紙受賞数 × 18 + 同系rankToPoints合計 ÷ 4",
    detail: "VOCE・MAQUIA・美的・WWDなど編集部・専門家評価の強度を測定。B2B説明資料の根拠として有効。",
  },
  {
    key: "testScore",
    label: "実測スコア",
    weight: 8,
    icon: FlaskConical,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    formula: "試験評価系受賞数 × 35 + 同系rankToPoints合計 ÷ 2",
    detail: "LDKなどの第三者試験・ラボ評価系アワードの結果。主観評価ではなく測定値に基づく評価のため係数を高く設定。",
  },
  {
    key: "categoryFitScore",
    label: "カテゴリ適合スコア",
    weight: 6,
    icon: Package,
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    formula: "総受賞数 × 12 + 30",
    detail: "当該カテゴリにおける存在感を受賞実績数で近似。ベーススコア30を設定し、実績ゼロでも最低限の評価を保持。",
  },
  {
    key: "differentiationScore",
    label: "差別化スコア",
    weight: 8,
    icon: Zap,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    formula: "40 + トレンド成分ヒット数 × 15",
    detail: "レチノール・ナイアシンアミド・CICA・PDRN・ビタミンC・グルタチオン・ペプチド・セラミド・PHA・マデカソサイド・ピテラの11成分を評価対象として、含有成分のユニーク度を算出。",
  },
  {
    key: "marketabilityScore",
    label: "市場性スコア",
    weight: 10,
    icon: Globe,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    formula: "7軸の重み付き合計 + 価格帯ボーナス (¥2,000以下:+4 / ¥5,000以下:+6 / ¥12,000以下:+3)",
    detail: "受賞・トレンド・口コミ・EC・専門家・実測・差別化の7軸を再合成。さらに価格帯別の市場浸透しやすさをボーナスで補正。",
  },
];

const AWARD_TYPES = [
  {
    type: "OVERALL_GRAND",
    label: "総合大賞",
    formula: "総合スコア順（10軸の重み付き合計）",
    desc: "全アワード横断で最も強いSKU。",
  },
  {
    type: "TREND",
    label: "トレンド大賞",
    formula: "トレンド × 1.3 + 口コミ × 0.5 + EC × 0.4 + 韓国コスメ補正 +8",
    desc: "直近で急上昇しているSKU。",
  },
  {
    type: "CLASSIC",
    label: "定番名品賞",
    formula: "定番 × 1.3 + 専門家 × 0.5 + 受賞 × 0.5",
    desc: "3年以上評価され続けているSKU。",
  },
  {
    type: "INGREDIENT",
    label: "成分評価賞",
    formula: "差別化 × 1.4 + 専門家 × 0.6 + 成分数 × 4",
    desc: "レチノール・ナイアシンアミド・CICA等、成分価値が明確なSKU。",
  },
  {
    type: "CONCERN",
    label: "肌悩み解決賞",
    formula: "肌悩み数 × 12 + 実測 × 0.6 + 口コミ × 0.5",
    desc: "乾燥・毛穴・くすみ・ニキビ・敏感肌・エイジングに対応するSKU。",
  },
  {
    type: "TONE",
    label: "肌カラー・メイク適性賞",
    formula: "肌カラー数 × 14 + 口コミ × 0.5 + トレンド × 0.4",
    desc: "イエベ春／秋・ブルベ夏／冬の適性が明確なSKU。",
  },
  {
    type: "VALUE",
    label: "コスパ賞",
    formula: "実測 + EC × 0.7 + 価格帯ボーナス (¥1,500以下:+25 / ¥3,000以下:+18)",
    desc: "価格に対する性能が高いSKU。",
  },
  {
    type: "EXPERT",
    label: "プロ評価賞",
    formula: "専門家 × 1.4 + 定番 × 0.4",
    desc: "VOCE・MAQUIA・美的・WWDの編集部・美容家評価が高いSKU。",
  },
  {
    type: "EC",
    label: "ECヒット賞",
    formula: "EC × 1.5 + 口コミ × 0.5",
    desc: "楽天・レビュー数・リピート性が強いSKU。",
  },
  {
    type: "NEXTGEN",
    label: "次世代ブランド賞",
    formula: "韓国コスメ +35 / プレステージ -10 + トレンド + 新作補正 (2022年以降:+22)",
    desc: "韓国コスメ・新興ブランド・SNS発・D2Cブランドなど。",
  },
];

const MEDIA_TYPES = [
  { code: "ugc", label: "UGC（口コミ）", example: "@cosme ベストコスメ、LIPS" },
  { code: "ec", label: "EC（電子商取引）", example: "楽天ビューティアワード" },
  { code: "magazine", label: "雑誌・編集部", example: "美的、VOCE、MAQUIA" },
  { code: "trade", label: "業界紙・プロ", example: "WWD BEAUTY" },
  { code: "test_lab", label: "第三者試験評価", example: "LDK the Beauty" },
];

export default function MethodologyPage() {
  const totalWeight = SCORE_AXES.reduce((a, s) => a + s.weight, 0);

  return (
    <div className="space-y-10 max-w-4xl">

      {/* ヘッダー */}
      <div className="border-b border-navy-100 pb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-navy-400 mb-1">
          ダイヤ総研 · スコアリング方法論
        </p>
        <h1 className="text-2xl font-bold text-navy-900">スコアリング・ロジック</h1>
        <p className="text-sm text-navy-500 mt-1.5 max-w-xl">
          8大アワード × 5年分（2021-2025）の受賞データを構造化し、10軸の独自スコアで再評価する方法論を説明する。
          各スコアは 0-100 に正規化される。
        </p>
      </div>

      {/* rankToPoints */}
      <section>
        <p className="section-title">順位→点数変換 (rankToPoints)</p>
        <div className="rounded-lg border border-navy-100 bg-white p-5 shadow-card">
          <p className="text-xs text-navy-500 mb-3">
            受賞順位を共通点数に変換する基礎関数。全スコアの入力として使われる。
          </p>
          <div className="font-mono text-xs bg-navy-50 rounded p-3 text-navy-800 mb-4">
            rankToPoints(rank) = max(20, 100 − (rank − 1) × 12)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-navy-100">
                  <th className="text-left py-2 px-3 text-navy-400 font-semibold">順位</th>
                  {[1, 2, 3, 4, 5, 6, 7, 8, "入賞のみ"].map((r) => (
                    <th key={r} className="text-center py-2 px-2 text-navy-400 font-semibold">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 px-3 text-navy-600 font-medium">点数</td>
                  {[100, 88, 76, 64, 52, 40, 28, 20, 50].map((p, i) => (
                    <td key={i} className="text-center py-2 px-2 font-mono font-bold text-navy-900">{p}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 10軸スコア */}
      <section>
        <p className="section-title">10軸スコア詳細</p>
        <div className="space-y-3">
          {SCORE_AXES.map((axis) => {
            const Icon = axis.icon;
            return (
              <div key={axis.key} className={`rounded-lg border ${axis.border} bg-white shadow-card overflow-hidden`}>
                <div className={`flex items-center gap-3 px-4 py-3 ${axis.bg}`}>
                  <Icon className={`h-4 w-4 ${axis.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${axis.color}`}>{axis.label}</span>
                      <span className="text-[10px] font-semibold text-navy-400 bg-white/80 rounded px-1.5 py-0.5 border border-navy-100">
                        総合ウェイト {axis.weight}%
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="w-16 h-1.5 rounded-full bg-navy-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${axis.color.replace("text-", "bg-")}`}
                        style={{ width: `${(axis.weight / totalWeight) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="font-mono text-[11px] bg-navy-50 rounded px-3 py-2 text-navy-700 break-all">
                    {axis.formula}
                  </div>
                  <p className="text-xs text-navy-500 leading-relaxed">{axis.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 総合スコア */}
      <section>
        <p className="section-title">総合スコア (totalScore)</p>
        <div className="rounded-lg border border-navy-100 bg-white p-5 shadow-card">
          <div className="font-mono text-xs bg-navy-50 rounded p-3 text-navy-800 mb-4 leading-relaxed">
            totalScore =<br />
            &nbsp;&nbsp;受賞実績 × 0.16<br />
            &nbsp;+ トレンド × 0.12<br />
            &nbsp;+ 定番 × 0.12<br />
            &nbsp;+ 口コミ × 0.10<br />
            &nbsp;+ EC × 0.08<br />
            &nbsp;+ 専門家 × 0.10<br />
            &nbsp;+ 実測 × 0.08<br />
            &nbsp;+ カテゴリ適合 × 0.06<br />
            &nbsp;+ 差別化 × 0.08<br />
            &nbsp;+ 市場性 × 0.10
          </div>
          <p className="text-xs text-navy-500">
            全スコアが 0–100 に正規化された後、上記の重みで線形合成する。合計ウェイトは 1.00。
            市場性スコア自体が7軸の再合成であるため、実質的にはダブルスタック構造となっている。
          </p>
        </div>
      </section>

      {/* 媒体種別 */}
      <section>
        <p className="section-title">データソース · 媒体種別</p>
        <div className="rounded-lg border border-navy-100 bg-white shadow-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50">
                <th className="text-left py-2.5 px-4 text-navy-400 font-semibold">コード</th>
                <th className="text-left py-2.5 px-4 text-navy-400 font-semibold">種別</th>
                <th className="text-left py-2.5 px-4 text-navy-400 font-semibold">代表例</th>
              </tr>
            </thead>
            <tbody>
              {MEDIA_TYPES.map((m, i) => (
                <tr key={m.code} className={i % 2 === 0 ? "" : "bg-navy-50/40"}>
                  <td className="py-2.5 px-4 font-mono text-navy-700">{m.code}</td>
                  <td className="py-2.5 px-4 text-navy-800 font-medium">{m.label}</td>
                  <td className="py-2.5 px-4 text-navy-500">{m.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* DaiyaCosme 10大賞 */}
      <section>
        <p className="section-title">DaiyaCosme 独自 10大賞 · 選定方式</p>
        <p className="text-xs text-navy-500 mb-3">
          各賞は基礎スコアを異なる係数で再重み付けして順位を決定する。同じSKUが複数賞に選ばれることもある。
        </p>
        <div className="space-y-2">
          {AWARD_TYPES.map((a, i) => (
            <div key={a.type} className="rounded-lg border border-navy-100 bg-white shadow-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-navy-900 text-white text-[10px] font-bold mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold text-navy-900">{a.label}</span>
                    <span className="text-[10px] text-navy-400 font-mono">{a.type}</span>
                  </div>
                  <p className="text-xs text-navy-500 mb-2">{a.desc}</p>
                  <div className="font-mono text-[11px] bg-amber-50 border border-amber-100 rounded px-3 py-1.5 text-amber-800 break-all">
                    {a.formula}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 注記 */}
      <section className="rounded-lg border border-navy-100 bg-navy-50 p-5">
        <p className="text-xs font-semibold text-navy-700 mb-2">注記 · 免責事項</p>
        <ul className="text-xs text-navy-500 space-y-1.5 list-disc list-inside leading-relaxed">
          <li>本スコアは当社独自の分析モデルであり、各アワード主催者の公式評価とは異なる。</li>
          <li>データ収集対象は 2021-2025 年の公開受賞情報。随時更新される。</li>
          <li>成分・効能の評価はラベル情報・公開文献を参照したものであり、医学的・薬学的証明ではない。</li>
          <li>スコアリングロジックは予告なく改訂される場合がある。</li>
        </ul>
      </section>

    </div>
  );
}
