# 別環境への完全移行手順 (Daiya0919 アカウント想定)

このドキュメント通りに進めれば、現在の `nagata1010/daiyacosme-research` と **完全に同じデータ・同じ画面** の DaiyaCosme Research を別 GitHub アカウント・別サーバーで再現できます。

## 完全再現のスナップショット

リポジトリ内 `migrations/snapshot/` に、現Supabase の全データが JSON で保存されています（2026-05-14 時点）。

| テーブル | 行数 |
|---|---|
| Award | 8 |
| Brand | 713 |
| Category | 28 |
| **SKU** | **3,991** |
| AwardResult | 6,815 |
| Source | 2,878 |
| DaiyaCosmeRanking | 80 |
| SKUAnalysis | 18 |
| SimilarSKU | 13 |
| ResearchJob | 5 |
| ResearchLog | 101 |

このスナップショットを新DBにインポートすれば、楽天画像・@cosmeメーカー情報・スコア・ランキング全部含めて完全に同じ状態になります。

---

## 全体像

```
[現環境]                            [Daiya0919 新環境]
GitHub: nagata1010/...        →    GitHub: Daiya0919/daiyacosme-research
Supabase: mgbvmoer...         →    新Postgres (Supabase Free または Neon)
Vercel: AIKASU's projects     →    Daiya0919 の Vercel team
URL: daiyacosme-research.vercel.app  →  daiyacosme-research-<xxx>.vercel.app
```

---

## Step 1: GitHub リポジトリ移行

### Option A: 既存リポジトリをコラボレーターで共有（最も簡単）

1. `https://github.com/nagata1010/daiyacosme-research/settings/access` を開く
2. **Add people** → `Daiya0919` を **Admin** で追加
3. Daiya0919 で GitHub にログインして、招待を承認
4. Daiya0919 の側で：
   ```bash
   gh auth login   # Daiya0919 として認証
   git clone https://github.com/nagata1010/daiyacosme-research.git
   cd daiyacosme-research
   ```

### Option B: Daiya0919 アカウントに新リポジトリを作成（完全独立）

1. Daiya0919 で `gh auth login`
2. 現リポジトリをクローン → 新リポジトリへ push：
   ```bash
   git clone https://github.com/nagata1010/daiyacosme-research.git daiyacosme-research
   cd daiyacosme-research
   gh repo create Daiya0919/daiyacosme-research --private --source=. --remote=daiya --push
   ```

### Option C: コード ZIP として転送

1. nagata1010 側で：
   ```bash
   git archive --format=zip --output=daiyacosme-research.zip HEAD
   ```
2. ZIP を Daiya0919 環境に転送（メール/Drive/USB等）
3. Daiya0919 側で展開 → `git init` → `gh repo create` → push

---

## Step 2: ローカル環境セットアップ（Daiya0919 マシン）

```bash
# Node.js 20+ 必須
node --version

# 依存インストール
npm install

# .env を作成
cp .env.example .env
# .env を編集: DATABASE_URL を後で書き換える
```

---

## Step 3: 新Postgres を作成

### Option A: Supabase Free（推奨）

1. <https://supabase.com> で **Daiya0919 用のアカウント** にサインイン（または Daiya0919 の GitHub で新規登録）
2. **New Project** → 設定：
   - Name: `daiyacosme`
   - Database Password: **強いパスワードを設定**（メモ必須）
   - Region: **Northeast Asia (Tokyo)**
   - Pricing Plan: Free
3. プロジェクト作成後（2分待つ）
4. 画面右上 **Connect** → **ORMs** タブ → **Prisma** を選択
5. 表示される `.env` スニペットの **DIRECT_URL の方**（port 5432）をコピー
6. `[YOUR-PASSWORD]` を実際のパスワードに置換

形式：
```
postgresql://postgres.xxxxxxxxxxxxxxx:【パスワード】@aws-X-ap-northeast-X.pooler.supabase.com:5432/postgres
```

### Option B: Neon Free

1. <https://neon.tech> で Daiya0919 でサインアップ
2. New Project → name `daiyacosme`, region Tokyo
3. ダッシュボードから接続文字列をコピー（**Direct connection** を使用）

---

## Step 4: スキーマ反映 + データインポート

```bash
# 環境変数を新DBに向ける
# Windows PowerShell:
$env:DATABASE_URL="postgresql://postgres.xxx:【パスワード】@aws-X-ap-northeast-X.pooler.supabase.com:5432/postgres"
# bash/zsh:
export DATABASE_URL="postgresql://postgres.xxx:..."

# 1. テーブル作成
npx prisma db push

# 2. snapshot から全データ流し込み (約2-3分)
npx tsx scripts/import-data.ts
```

成功時の出力：
```
✓ All counts match source. Import successful.
```

行数が一致しない場合は警告が出ます。

---

## Step 5: ローカルで動作確認（オプション）

```bash
npx next dev
# http://localhost:3000 で 3,991 SKU が見えれば OK
```

---

## Step 6: Vercel デプロイ（Daiya0919 アカウント）

1. <https://vercel.com> に **Daiya0919 の GitHub で** サインイン
2. **Add New** → **Project** → `daiyacosme-research` を **Import**
3. Environment Variables に4つ追加：

| Key | Value |
|---|---|
| `DATABASE_URL` | Step 3 で取得した接続文字列（パスワード置換済み） |
| `SEARCH_PROVIDER` | `mock` |
| `LLM_PROVIDER` | `mock` |
| `NEXT_PUBLIC_APP_NAME` | `DaiyaCosme Research` |

4. **Deploy** → 約2分で完了 → 固定URL発行（`https://daiyacosme-research-xxxx.vercel.app`）

---

## Step 7: 動作検証

新URLで以下を確認：

- [ ] `/` カンバン: 10賞×TOP8表示、選定式と実画像
- [ ] `/category` カテゴリ別: 28カテゴリのタブ
- [ ] `/sku/[id]` 詳細: 受賞履歴 + 製造販売元 + スコアレーダー
- [ ] `/admin` 管理: SKU 3,991件、Award 8件、AwardResult 6,815件
- [ ] `/api/csv/sku_master` CSV配信

---

## 同期維持（オプション）

このリポジトリで今後データ更新が走った場合に、Daiya0919 環境にも反映するには：

### A. snapshot を再エクスポートして再インポート
nagata1010 側で:
```bash
DATABASE_URL=<current> npx tsx scripts/export-data.ts
git add migrations/snapshot && git commit -m "snapshot $(date +%Y-%m-%d)" && git push
```

Daiya0919 側で:
```bash
git pull
DATABASE_URL=<new> npx tsx scripts/import-data.ts
```

### B. スクリプト再実行（完全な独立運用）
Daiya0919 側で：
```bash
DATABASE_URL=<new> npx tsx prisma/seed.ts                  # 初期18件
DATABASE_URL=<new> npx tsx scripts/fetch-cosme-awards.ts   # @cosme
DATABASE_URL=<new> npx tsx scripts/fetch-rakuten-awards.ts # 楽天
DATABASE_URL=<new> npx tsx scripts/fetch-magazine-awards.ts # VOCE/MAQUIA/美的
DATABASE_URL=<new> npx tsx scripts/fetch-product-images.ts # 画像
DATABASE_URL=<new> npx tsx scripts/fetch-manufacturer.ts   # 製造販売元
DATABASE_URL=<new> npx tsx scripts/recategorize-skus.ts    # カテゴリ
DATABASE_URL=<new> npx tsx scripts/rebuild-rankings.ts     # スコア
```

⚠ B は @cosme/楽天/雑誌の現時点の状態を再取得するので、データ内容が微妙に変わる可能性あり（受賞コメント・画像・メーカー情報など）。完全一致を求めるなら A の snapshot import を使うこと。

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `npx prisma db push` で Authentication failed | パスワード置換ミス・Direct/Pooled間違い |
| `import-data.ts` が途中で停止 | Supabaseの無料枠 connection limit。`BATCH=100` に下げる |
| Vercelビルドで Cannot find module '.prisma/client' | `package.json` の `postinstall: prisma generate` が消えてないか確認 |
| 行数が source と一致しない | `import-data.ts` 再実行（冪等な実装、`skipDuplicates: true` 付き） |

---

## ファイル構成

このリポジトリで再現に必要なファイル：

```
migrations/snapshot/        ← 全データの JSON ダンプ（8.4 MB）
  _meta.json                  エクスポート時刻 + 行数
  award.json
  brand.json
  category.json
  sku.json                    （3,991 件、最大ファイル）
  awardResult.json            （6,815 件）
  source.json                 （2,878 件）
  daiyaCosmeRanking.json
  sKUAnalysis.json
  similarSKU.json
  researchJob.json
  researchLog.json

scripts/export-data.ts      ← 現DBから JSON ダンプを生成
scripts/import-data.ts      ← snapshot から新DB へ流し込む
```
