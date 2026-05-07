"use client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

type Props = {
  scores: {
    awardScore: number; trendScore: number; classicScore: number;
    categoryFitScore: number; reviewPowerScore: number; ecPowerScore: number;
    expertScore: number; testScore: number; differentiationScore: number; marketabilityScore: number;
  };
};

export function ScoreChart({ scores }: Props) {
  const data = [
    { k: "受賞実績", v: scores.awardScore },
    { k: "トレンド", v: scores.trendScore },
    { k: "定番", v: scores.classicScore },
    { k: "カテゴリ適合", v: scores.categoryFitScore },
    { k: "口コミ", v: scores.reviewPowerScore },
    { k: "EC", v: scores.ecPowerScore },
    { k: "専門家", v: scores.expertScore },
    { k: "実測", v: scores.testScore },
    { k: "差別化", v: scores.differentiationScore },
    { k: "市場性", v: scores.marketabilityScore },
  ];
  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid stroke="#e4e4e7" />
          <PolarAngleAxis dataKey="k" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Radar dataKey="v" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.25} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
