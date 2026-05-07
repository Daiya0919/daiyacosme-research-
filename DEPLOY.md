# DaiyaCosme Research — 本番デプロイ手順 (Vercel + Neon)

> 「いつでも誰でも見られる固定URL」を発行するための手順。GitHub に push → Vercel で import → Neon (Serverless Postgres) を環境変数で繋ぐ → 初回 DB 投入、の4ステップ。

## 構成図

```
┌─────────────────────┐         ┌──────────────────────┐
│ GitHub              │  push   │ Vercel               │
│ daiyacosme-research │ ──────▶ │ Next.js build/deploy │
└─────────────────────┘         └──────────────────────┘
                                          │
                                          │ DATABASE_URL (env var)
                                          ▼
                                ┌──────────────────────┐
                                │ Neon Postgres        │
                                │ (Serverless)         │
                                └──────────────────────┘
```

## 1. Neon プロジェクト作成（5分・無料）

1. <https://neon.tech> でサインアップ（GitHub連携が一番早い）
2. **Create Project** → リージョンは Tokyo `ap-southeast-1` または近場を選択
3. プロジェクト作成後、ダッシュボードの **Connection string** をコピー
   - 形式: `postgresql://USER:PASS@xxxx.aws.neon.tech/neondb?sslmode=require`
   - **Pooled connection** ではなく **Direct connection** を使う（Prisma migrate がプール越しでエラーになるため）

## 2. GitHub リポジトリへ push

```bash
# まだリモート未設定の場合
gh repo create daiyacosme-research --private --source=. --push
# 既にローカルでcommit済みなら自動でpushされる
```

または手動で：

```bash
gh repo create daiyacosme-research --private
git remote add origin git@github.com:<your-account>/daiyacosme-research.git
git push -u origin main
```

## 3. Vercel に import（5分）

1. <https://vercel.com> にサインイン → **Add New** → **Project**
2. GitHub の `daiyacosme-research` を **Import**
3. **Configure Project** で次の環境変数を追加：

| Key | Value | 説明 |
|---|---|---|
| `DATABASE_URL` | Neonのconnection string | 必須 |
| `SEARCH_PROVIDER` | `mock` | あとでfirecrawl等に切替可 |
| `LLM_PROVIDER` | `mock` | あとでanthropic/openaiに切替可 |
| `NEXT_PUBLIC_APP_NAME` | `DaiyaCosme Research` | ヘッダ表示 |

4. **Deploy** をクリック → 1-2 分でビルド完了 → `https://daiyacosme-research.vercel.app` のような固定URLが発行される

> Build Command / Output Directory はデフォルト (`next build` / `.next`) のままでOK。`postinstall: prisma generate` で Prisma Client は自動生成される。

## 4. 本番DBの初期化（一度だけ）

Vercel デプロイ直後の DB は空なので、ローカルから本番Neonにスキーマpushとシード投入をします。

```bash
# 本番のDATABASE_URLを一時的に環境変数として設定
# Windows PowerShell の場合:
$env:DATABASE_URL="postgresql://USER:PASS@xxxx.aws.neon.tech/neondb?sslmode=require"
# bash/zsh の場合:
export DATABASE_URL="postgresql://USER:PASS@xxxx.aws.neon.tech/neondb?sslmode=require"

# スキーマpush（テーブル作成）
npx prisma db push

# サンプルSKUと受賞データを投入
npx tsx prisma/seed.ts

# 楽天市場から実商品画像と販売ページURLを取得
npx tsx scripts/fetch-product-images.ts
```

完了すると、Vercel の URL を開くと 18 SKU の総合カンバンがそのまま見えます。

## 5. 動作確認

- `/` カンバン → DaiyaCosme賞10列、各列に選定式と実商品画像
- `/category` カテゴリ別ランキング
- `/sku/<id>` SKU詳細
- `/admin` データ管理 + CSV 4種ダウンロード
- `/api/csv/sku_master` などのCSV配信

## 運用Tips

### 画像/データを更新したい

ローカルから DATABASE_URL を本番に向けてスクリプトを叩くだけ：

```bash
$env:DATABASE_URL="<本番URL>"
npx tsx scripts/fetch-product-images.ts   # 画像を最新化
npx tsx prisma/seed.ts                     # SKU/受賞を再投入したい時
```

### Web検索を本物に切替

Vercel Dashboard → Project → Settings → Environment Variables で：
- `SEARCH_PROVIDER=firecrawl`、`FIRECRAWL_API_KEY=fc-xxxx` を設定
- `LLM_PROVIDER=anthropic`、`ANTHROPIC_API_KEY=sk-ant-xxxx` を設定

その後 Deployments → Redeploy で反映。

### 本番DBの内容確認

```bash
$env:DATABASE_URL="<本番URL>"
npx prisma studio
# http://localhost:5555 でブラウザGUIが開きDBを直接編集可能
```

### 認証 / アクセス制限を後付けしたい

- 簡単: Vercel の **Password Protection** (Pro plan, $20/mo) で全URLにパスワード
- 本格: NextAuth + Google OAuth + ロール（admin/viewer）。`src/middleware.ts` で `/admin` `/research` に認可チェック

### コスト目安（初期）

| サービス | プラン | 料金 |
|---|---|---|
| Vercel | Hobby | $0 (個人/非商用) または Pro $20/mo |
| Neon | Free | $0 (storage 0.5GB / compute 191時間/月) |
| **合計** | | **$0 ~ $20/月** |

データ量が増えたら Neon Launch ($19/mo) または Pro へ。

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| Vercelビルド時に `Cannot find module '.prisma/client'` | `package.json` の `postinstall: prisma generate` が入っているか確認 |
| 本番で `Connection refused` | DATABASE_URL の `?sslmode=require` がついているか確認 |
| `Module not found: '@prisma/client'` | Vercel Build Command を `prisma generate && next build` に変更 |
| `next build` 時に DB に繋ごうとして失敗 | 全ページに `export const dynamic = "force-dynamic"` が付いているか確認（このリポジトリは付与済み） |
| Neonの無料枠で `Database is starting up` | 初回アクセスは数秒待つ（cold start）。気になるなら有料プランへ |
