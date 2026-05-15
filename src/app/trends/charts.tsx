"use client";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from "recharts";

type ByYear     = { year: string; total: number; korean: number; domestic: number };
type ByCategory = { name: string; count: number };
type ByAward    = { name: string; count: number };
type KoreanRatio = { year: string; ratio: number };

const NAVY   = "#0f2a5a";
const AMBER  = "#c9922a";
const STEEL  = "#4d7dba";
const MUTED  = "#b3c8e8";

export function TrendCharts({
  byYear, byCategory, byAward, koreanRatio,
}: {
  byYear: ByYear[];
  byCategory: ByCategory[];
  byAward: ByAward[];
  koreanRatio: KoreanRatio[];
}) {
  return (
    <div className="space-y-6">
      {/* 受賞件数推移 + 韓国コスメ比率 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-navy-100 bg-white shadow-card p-5">
          <p className="section-title">年度別受賞件数（国内 vs 韓国系）</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byYear} barSize={18} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ef" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e6ef" }}
                labelStyle={{ color: NAVY, fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="domestic" name="国内" stackId="a" fill={STEEL} radius={[0,0,2,2]} />
              <Bar dataKey="korean"   name="韓国系" stackId="a" fill={AMBER} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-navy-100 bg-white shadow-card p-5">
          <p className="section-title">韓国コスメ受賞比率推移（%）</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={koreanRatio}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ef" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e6ef" }}
                formatter={(v: number) => [`${v}%`, "韓国比率"]}
              />
              <Line
                type="monotone" dataKey="ratio" name="韓国比率"
                stroke={AMBER} strokeWidth={2} dot={{ fill: AMBER, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* カテゴリ別 + アワード別 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-navy-100 bg-white shadow-card p-5">
          <p className="section-title">カテゴリ別受賞件数 TOP10</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byCategory} layout="vertical" barSize={12} margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ef" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: "#1a2e4a" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e6ef" }} />
              <Bar dataKey="count" name="受賞件数" radius={[0,2,2,0]}>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? AMBER : i < 3 ? STEEL : MUTED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-navy-100 bg-white shadow-card p-5">
          <p className="section-title">アワード別受賞件数</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byAward} layout="vertical" barSize={12} margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ef" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 10, fill: "#1a2e4a" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e6ef" }} />
              <Bar dataKey="count" name="受賞件数" fill={NAVY} radius={[0,2,2,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
