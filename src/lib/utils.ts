import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function yen(n?: number | null) {
  if (n == null) return "—";
  return `¥${n.toLocaleString("ja-JP")}`;
}

export function pct(n: number) {
  return `${Math.round(n)}`;
}

/**
 * SQLite用に String カラムへ JSON文字列で保存している配列を、安全に string[] に展開する。
 */
export function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v !== "string" || !v) return [];
  try {
    const j = JSON.parse(v);
    return Array.isArray(j) ? j.map(String) : [];
  } catch {
    return [];
  }
}

export function listToJson(arr: string[] | undefined | null): string {
  return JSON.stringify(arr ?? []);
}
