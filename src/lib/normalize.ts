/**
 * 表記揺れ統合のための正規化ロジック。
 * - 全角/半角統一 (NFKC)
 * - 空白除去
 * - 記号除去
 * - 小文字化
 * これを `normalizedName` として保存することで、表記揺れSKUを同一視する。
 */
export function normalize(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[\s　]+/g, "")
    .replace(/[!-/:-@[-`{-~]/g, "")
    .toLowerCase();
}

/**
 * Levenshtein距離。重複候補抽出に使う（短い文字列向けの簡易実装）。
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

export function similarity(a: string, b: string): number {
  const an = normalize(a);
  const bn = normalize(b);
  if (!an.length && !bn.length) return 1;
  const d = levenshtein(an, bn);
  return 1 - d / Math.max(an.length, bn.length);
}
