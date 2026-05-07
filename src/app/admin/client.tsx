"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { rebuildAction } from "../actions";

export function AdminActions() {
  const [pending, start] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  return (
    <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await rebuildAction();
          setMsg(`再計算完了: ${r.skus} SKU`);
        })}
      >
        {pending ? "処理中…" : "スコア再計算 + DaiyaCosme賞再構築"}
      </Button>
      {msg && <span className="text-sm text-emerald-700">{msg}</span>}
    </div>
  );
}
