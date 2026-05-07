# Japancosme Research

8つの主要美容アワード（@cosme / LIPS / VOCE / MAQUIA / 美的 / LDK the Beauty / WWD Beauty / 楽天）の **2021〜2025年** 受賞SKUを横串で取り込み、独自の表彰軸（**Japancosmeアワード**）に再編集する **化粧品市場リサーチSaaSのリファレンス実装** です。

「ランキング表示だけ」ではなく、**なぜ売れているのか／次に何を作るべきか／どのアワードロジックで勝てるのか** を構造化することを設計目標にしています（商品企画・OEM開発・ブランド投資判断用途）。

## できること

- **総合カンバンUI** — 8つのJapancosme賞（総合大賞 / トレンド / 定番名品 / 成分評価 / 肌悩み / コスパ / EXPERT / EC / NEXTGEN ほか）を Salesforce 風の横スクロール列で表示
- **カテゴリ別ランキング** — 化粧水〜メンズコスメまで17カテゴリでスコア順に横展開
- **SKU詳細** — 受賞履歴タイムライン / 10軸スコア レーダー / AI生成の「売れる理由」「商品開発示唆」 / 類似SKU / 出典URL一覧
- **リサーチ実行** — 年度・アワード・カテゴリ・キーワードを選んでWeb検索ジョブを発火（プロバイダ差替え可能）
- **データ管理** — SKU・アワード・出典・**重複候補**（normalizedName類似度）・**スコア再計算 + Japancosme賞再構築**
- **CSV出力** — `sku_master` / `award_results` / `japancosme_rankings` / `raw_sources` の4種をUTF-8 BOM付きで配信

## 技術スタック

- Next.js 14 (App Router, Server Actions) + TypeScript
- Tailwind CSS + shadcn互換の自前最小コンポーネント (Radix Primitivesベース)
- Prisma + PostgreSQL（SQLiteへの差し替えも可）
- Recharts（スコアレーダー）
- Zod（入力バリデーション）
- Web検索: **provider差し替え可能**（mock / firecrawl / 任意拡張）
- LLM: **provider差し替え可能**（mock / Anthropic Claude / OpenAI）

## ディレクトリ構成

```
prisma/
  schema.prisma         Award / SKU / AwardResult / Source / JapancosmeRanking / SKUAnalysis / ResearchJob ほか
  seed.ts               リアル媒体・カテゴリ・18 SKUのサンプル投入 + スコア計算 + Japancosme賞構築

src/app/
  page.tsx              総合カンバン（画面1）
  category/page.tsx     カテゴリ別ランキング（画面2）
  sku/[id]/page.tsx     SKU詳細（画面3）
  research/page.tsx     リサーチ実行 + ジョブ履歴 + 要確認データ（画面4）
  admin/page.tsx        データ管理（画面5）
  actions.ts            Server Actions: runResearch / rebuild / regenerateAnalysis / merge / dupe検出
  api/csv/[type]/       CSV配信
  api/research/         REST API でもジョブ起動可

src/lib/
  prisma.ts             Prisma シングルトン
  scoring.ts            10軸スコアリング + trend/classic分類
  japancosme.ts         Japancosme賞 表彰軸 × 並び替え × 選定理由
  csv.ts                4種CSVビルダー
  normalize.ts          表記揺れ統合（NFKC + 記号除去 + Levenshtein）
  research-job.ts       Web検索 → Source保存 → ログ
  search/               provider抽象（mock, firecrawl）
  ai/                   provider抽象（mock, claude, openai）

src/components/
  ui/                   Button / Card / Badge / Input / Tabs / Select / Dialog / Progress / Table
  nav.tsx               ヘッダー
  kanban-board.tsx      画面1のカンバン
  sku-card.tsx          各カードの見た目
  ranking-table.tsx     画面2の表 + 検索
  score-chart.tsx       Rechartsレーダー
  timeline.tsx          受賞履歴タイムライン
```

## セットアップ

### 1. 依存インストール

```bash
pnpm install   # または npm install / yarn
```

### 2. データベース

PostgreSQL推奨。Dockerで簡単に立てる例：

```bash
docker run --name japancosme-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=japancosme -p 5432:5432 -d postgres:16
```

`.env` を作成（`.env.example`をコピー）：

```bash
cp .env.example .env
```

### 3. スキーマ反映 + シード投入

```bash
pnpm db:push      # スキーマをDBに反映（マイグレーション運用なら db:migrate）
pnpm db:seed      # サンプルデータ + スコア計算 + Japancosme賞構築
```

### 4. 開発サーバ

```bash
pnpm dev          # http://localhost:3000
```

ホームでカンバンが表示されます。`/category`でカテゴリ別、`/sku/<id>`で詳細、`/research`でリサーチ、`/admin`で管理 + CSVダウンロードできます。

### SQLite で素早く試したい場合

`prisma/schema.prisma` の `provider` を `sqlite` に変えて、`String[]` を `Json` に置き換えるだけで動作します（受賞数は少なめ、配列クエリは弱くなります）。`.env` の `DATABASE_URL` を `file:./prisma/dev.db` に変更してください。

## Web検索 / LLM の本番接続

### 検索プロバイダ（`SEARCH_PROVIDER`）

| 値 | 説明 |
|---|---|
| `mock` | ダミーHitsを返す。UI動作確認用。 |
| `firecrawl` | [Firecrawl](https://firecrawl.dev) `/v1/search`。`FIRECRAWL_API_KEY` 必須。リトライ + バックオフ実装済み。 |

新しいプロバイダを足す場合は `src/lib/search/types.ts` の `SearchProvider` を実装し、`src/lib/search/index.ts` の `getSearchProvider()` に追加してください。

### LLMプロバイダ（`LLM_PROVIDER`）

| 値 | 説明 |
|---|---|
| `mock` | 入力データから決定論的に分析文を組み立てる。APIキー不要。 |
| `anthropic` / `claude` | Anthropic Messages API。`ANTHROPIC_API_KEY` 必須。`ANTHROPIC_MODEL` で切替（既定 `claude-sonnet-4-6`）。 |
| `openai` / `gpt` | OpenAI Chat Completions。`OPENAI_API_KEY` 必須。`response_format=json_object`使用。 |

## データの流れ

```
[リサーチ実行画面]
   ↓ Server Action: runResearchAction
[runResearch] - SearchProvider.search() を年度×アワード×クエリ分発火
   ↓ Source upsert (URL × award × year でユニーク)
[Source]      - 信頼度 < 0.6 で needsReview 立つ
   ↓ (将来) LLM抽出 → AwardResult / SKU 自動生成
[手動 or AI] → AwardResult / SKU 確定
   ↓ Server Action: rebuildAction
[scoring.ts]  - 10軸スコア + trend/classic分類
[japancosme.ts] - 表彰軸ごとに重み配分を変えて並び替え → JapancosmeRanking再構築
   ↓
[カンバン / カテゴリ / SKU詳細] が再描画される
```

## 表記揺れ統合

- すべての SKU.name は `normalize()` (NFKC正規化 + 空白/記号除去 + 小文字化) して `normalizedName` に保存
- 重複候補は `findDuplicateCandidatesAction(threshold=0.85)` で Levenshtein 類似度から抽出
- 統合は `mergeSkuAction(keepId, dropId)` で AwardResult を集約してから drop を削除し、自動でスコア再計算

## CSVスキーマ

`/api/csv/<type>` で取得できます。すべてUTF-8 BOM付きでExcelでも文字化けしません。

- `sku_master.csv` — sku_id, brand_name, sku_name, category, price, volume, launch_year, ingredients, skin_concerns, skin_tone_fit, trend_or_classic, total_score
- `award_results.csv` — result_id, year, award_name, award_category, rank, brand_name, sku_name, source_url, source_title, comment, confidence_score
- `japancosme_rankings.csv` — ranking_id, japancosme_award_type, rank, sku_id, brand_name, sku_name, total_score, award_score, trend_score, classic_score, review_power_score, ec_power_score, expert_score, test_score, reason
- `raw_sources.csv` — source_id, url, title, award_name, year, fetched_at, raw_text_excerpt, reliability, needs_review

## 設計上の注意

- **公式サイト・媒体公式・EC公式優先**: 検索結果から本文抽出する段階（Phase2）で、ドメインごとに reliability を補正してください（`src/lib/research-job.ts` 内の `reliability` をルール化）。
- **個人ブログ・二次情報は補助**: needsReview を立て、Admin画面で確認してから AwardResult に昇格させる運用。
- **robots.txt / 利用規約**: 取得時に robots を確認するhookを `runResearch` に追加してください（雛形は未実装）。
- **取得できない情報は推測しない**: スコア計算は実データのみから決定的に算出。空欄は空欄のまま。
- **APIキーは .env**: コミットしないでください。`.env.local` を使う場合は Next.js が自動で読みます。

## 今後拡張すべきポイント

1. **Phase2: Source本文 → AwardResult/SKU 抽出** — Source.rawText からLLMで `[{ year, awardCategory, rank, brand, skuName, comment }...]` をJSON抽出する pipeline を `src/lib/extraction.ts` に追加。表記揺れは `normalize()` を経由してSKUにmerge。
2. **画像取得** — 公式EC（楽天/各ブランド公式）から image URL を `imageUrl` に補完するjob。
3. **ランキング履歴の保存** — Japancosme表彰の年次スナップショットを別テーブルで保持し、年度比較を可能に。
4. **市場トレンド分析画面** — `getAiProvider().analyzeMarketTrend()` を叩いて、年度別／カテゴリ別／成分／肌悩みのシフトを可視化（Recharts LineChartで時系列）。
5. **OEM向けレポートPDF出力** — SKU詳細を1ページで PDF 化（@react-pdf/renderer）。経営会議への持ち込み用。
6. **権限制御** — リサーチ実行・Admin操作は社内のみ。NextAuth + role を導入。
7. **多言語化** — i18n基盤の導入。中国・台湾・韓国向け。
8. **SNSメトリクスの取り込み** — TikTok / Instagram のhashtag量を `Trend Score` に補正係数として加える。
9. **A/B用の重み設定** — `scoring.ts` の重みをDB管理にして、表彰ロジックをUIから調整できるように。
10. **テスト**: `lib/scoring.ts` `lib/normalize.ts` `lib/japancosme.ts` の単体テスト（vitest推奨）。

## 実行手順サマリ

```bash
cp .env.example .env
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
# open http://localhost:3000
```

検索もLLMもAPIキー不要で動きます（モックプロバイダ）。本番は `.env` の `SEARCH_PROVIDER` / `LLM_PROVIDER` を切り替えるだけでOK。
