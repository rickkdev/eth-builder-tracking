"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  type AnalyticsStats,
  type LeaderboardEntry,
  type TimeRange,
  type VolumeTrendPoint,
  fetchLeaderboard,
  fetchStats,
  fetchVolumeTrend,
} from "~~/services/dune";

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: "7D", value: "7d" },
  { label: "28D", value: "28d" },
  { label: "90D", value: "90d" },
  { label: "All", value: "all" },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatEth(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

const AnalyticsPage: NextPage = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("28d");
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [volumeTrend, setVolumeTrend] = useState<VolumeTrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (range: TimeRange) => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, leaderboardData, trendData] = await Promise.all([
        fetchStats(),
        fetchLeaderboard(range),
        fetchVolumeTrend(range),
      ]);
      setStats(statsData);
      setLeaderboard(leaderboardData);
      setVolumeTrend(trendData);
    } catch {
      setError("Failed to load analytics data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(timeRange);
  }, [timeRange, loadData]);

  return (
    <div className="flex items-center flex-col grow pt-10 px-4">
      <div className="max-w-6xl w-full">
        <h1 className="text-center text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-center text-base-content/70 mb-8">Live builder tag tracking metrics across Ethereum.</p>

        {/* Time Range Selector */}
        <div className="flex justify-center mb-8">
          <div className="join">
            {TIME_RANGES.map(({ label, value }) => (
              <button
                key={value}
                className={`join-item btn btn-sm ${timeRange === value ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setTimeRange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="text-center p-8">
            <p className="text-error mb-4">{error}</p>
            <button className="btn btn-primary btn-sm" onClick={() => loadData(timeRange)}>
              Retry
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {isLoading
            ? [1, 2, 3].map(i => (
                <div key={i} className="card bg-base-200 animate-pulse">
                  <div className="card-body items-center">
                    <div className="h-8 bg-base-300 rounded w-24 mb-2"></div>
                    <div className="h-4 bg-base-300 rounded w-32"></div>
                  </div>
                </div>
              ))
            : stats && (
                <>
                  <div className="card bg-base-200 shadow-sm">
                    <div className="card-body items-center text-center p-5">
                      <p className="text-3xl font-bold text-primary">{formatNumber(stats.totalCodesMinted)}</p>
                      <p className="text-sm text-base-content/60">Codes Minted</p>
                    </div>
                  </div>
                  <div className="card bg-base-200 shadow-sm">
                    <div className="card-body items-center text-center p-5">
                      <p className="text-3xl font-bold text-primary">{formatNumber(stats.totalAttributedTxs)}</p>
                      <p className="text-sm text-base-content/60">Attributed Transactions</p>
                    </div>
                  </div>
                  <div className="card bg-base-200 shadow-sm">
                    <div className="card-body items-center text-center p-5">
                      <p className="text-3xl font-bold text-primary">{formatEth(stats.totalFeesEth)} ETH</p>
                      <p className="text-sm text-base-content/60">Total Fees Tracked</p>
                    </div>
                  </div>
                </>
              )}
        </div>

        {/* Volume Trend Chart */}
        <div className="card bg-base-200 shadow-sm mb-8">
          <div className="card-body">
            <h2 className="card-title text-lg">Volume Trend</h2>
            {isLoading ? (
              <div className="h-64 bg-base-300 rounded animate-pulse"></div>
            ) : volumeTrend.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeTrend}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(var(--p))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="oklch(var(--p))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--bc) / 0.1)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="oklch(var(--bc) / 0.3)"
                      tickFormatter={v => {
                        const d = new Date(v);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="oklch(var(--bc) / 0.3)" tickFormatter={v => `${v} Ξ`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(var(--b2))",
                        border: "1px solid oklch(var(--bc) / 0.1)",
                        borderRadius: "8px",
                        fontSize: "13px",
                      }}
                      formatter={value => [`${Number(value ?? 0).toFixed(2)} ETH`, "Volume"]}
                      labelFormatter={label => new Date(label).toLocaleDateString()}
                    />
                    <Area
                      type="monotone"
                      dataKey="volumeEth"
                      stroke="oklch(var(--p))"
                      fill="url(#volumeGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-base-content/50">No data available</div>
            )}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="card bg-base-200 shadow-sm mb-8">
          <div className="card-body">
            <h2 className="card-title text-lg">
              Top Codes by Volume
              <span className="text-sm font-normal text-base-content/50">
                ({TIME_RANGES.find(t => t.value === timeRange)?.label})
              </span>
            </h2>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-12 bg-base-300 rounded animate-pulse"></div>
                ))}
              </div>
            ) : leaderboard.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Code</th>
                      <th className="text-right">Transactions</th>
                      <th className="text-right hidden sm:table-cell">Unique Users</th>
                      <th className="text-right">Volume (ETH)</th>
                      <th className="text-right hidden sm:table-cell">Fees (ETH)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map(entry => (
                      <tr key={entry.code} className="hover">
                        <td className="text-base-content/50">{entry.rank}</td>
                        <td>
                          <Link href={`/explore?code=${entry.code}`} className="font-mono text-primary hover:underline">
                            {entry.code}
                          </Link>
                        </td>
                        <td className="text-right font-mono">{formatNumber(entry.txCount)}</td>
                        <td className="text-right font-mono hidden sm:table-cell">{formatNumber(entry.uniqueUsers)}</td>
                        <td className="text-right font-mono">{formatEth(entry.volumeEth)}</td>
                        <td className="text-right font-mono hidden sm:table-cell">{formatEth(entry.feesEth)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-base-content/50">No leaderboard data available</div>
            )}
          </div>
        </div>

        {/* Data source note */}
        <div className="text-center text-sm text-base-content/40 mb-8">
          {process.env.NEXT_PUBLIC_DUNE_API_KEY ? (
            <p>Data powered by Dune Analytics. Refreshes every 10 minutes.</p>
          ) : (
            <p>
              Showing sample data.{" "}
              <Link href="/docs#analytics" className="underline hover:text-base-content/60">
                Configure Dune API
              </Link>{" "}
              for live metrics.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
