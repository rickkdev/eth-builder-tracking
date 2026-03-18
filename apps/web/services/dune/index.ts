/**
 * Dune Analytics data fetching layer.
 *
 * Provides a unified interface for fetching analytics data.
 * Uses Dune API when NEXT_PUBLIC_DUNE_API_KEY is set, otherwise falls back to mock data.
 * Caches results for 10 minutes to avoid excessive API calls.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type TimeRange = "7d" | "28d" | "90d" | "all";

export type AnalyticsStats = {
  totalCodesMinted: number;
  totalAttributedTxs: number;
  totalFeesEth: number;
};

export type LeaderboardEntry = {
  rank: number;
  code: string;
  txCount: number;
  uniqueUsers: number;
  volumeEth: number;
  feesEth: number;
};

export type VolumeTrendPoint = {
  date: string; // YYYY-MM-DD
  volumeEth: number;
  txCount: number;
  feesEth: number;
};

// ── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ── Dune API ─────────────────────────────────────────────────────────────────

const DUNE_API_BASE = "https://api.dune.com/api/v1";

async function fetchDuneQuery<T>(queryId: string): Promise<T[] | null> {
  const apiKey = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_DUNE_API_KEY : undefined;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${DUNE_API_BASE}/query/${queryId}/results`, {
      headers: { "X-Dune-API-Key": apiKey },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.result?.rows ?? null;
  } catch {
    return null;
  }
}

// ── Mock Data ────────────────────────────────────────────────────────────────

function generateMockVolumeTrend(days: number): VolumeTrendPoint[] {
  const points: VolumeTrendPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const base = 50 + Math.sin(i / 7) * 20;
    points.push({
      date: d.toISOString().split("T")[0],
      volumeEth: Math.round((base * 0.5 + Math.random() * base * 0.5) * 100) / 100,
      txCount: Math.floor(base + Math.random() * 40),
      feesEth: Math.round((base * 0.002 + Math.random() * 0.005) * 10000) / 10000,
    });
  }
  return points;
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, code: "uniswap", txCount: 12450, uniqueUsers: 3210, volumeEth: 45230.5, feesEth: 89.42 },
  { rank: 2, code: "aave_v3", txCount: 8932, uniqueUsers: 2105, volumeEth: 32100.8, feesEth: 67.31 },
  { rank: 3, code: "opensea", txCount: 7621, uniqueUsers: 4530, volumeEth: 18920.3, feesEth: 52.18 },
  { rank: 4, code: "lido", txCount: 6543, uniqueUsers: 1890, volumeEth: 128450.0, feesEth: 48.92 },
  { rank: 5, code: "compound", txCount: 5210, uniqueUsers: 1432, volumeEth: 21340.6, feesEth: 41.05 },
  { rank: 6, code: "curve", txCount: 4892, uniqueUsers: 1105, volumeEth: 67230.1, feesEth: 38.76 },
  { rank: 7, code: "maker", txCount: 4321, uniqueUsers: 982, volumeEth: 34560.4, feesEth: 35.12 },
  { rank: 8, code: "sushi", txCount: 3654, uniqueUsers: 1340, volumeEth: 12340.7, feesEth: 28.43 },
  { rank: 9, code: "ens", txCount: 3210, uniqueUsers: 2870, volumeEth: 4530.2, feesEth: 24.67 },
  { rank: 10, code: "zora", txCount: 2890, uniqueUsers: 1920, volumeEth: 8920.5, feesEth: 21.34 },
  { rank: 11, code: "blur", txCount: 2543, uniqueUsers: 1650, volumeEth: 15670.3, feesEth: 18.92 },
  { rank: 12, code: "balancer", txCount: 2210, uniqueUsers: 780, volumeEth: 19340.8, feesEth: 16.45 },
  { rank: 13, code: "gnosis", txCount: 1987, uniqueUsers: 654, volumeEth: 8760.1, feesEth: 14.23 },
  { rank: 14, code: "safe", txCount: 1765, uniqueUsers: 1230, volumeEth: 45670.9, feesEth: 12.87 },
  { rank: 15, code: "eigen", txCount: 1543, uniqueUsers: 890, volumeEth: 23450.2, feesEth: 11.34 },
];

const MOCK_STATS: AnalyticsStats = {
  totalCodesMinted: 247,
  totalAttributedTxs: 89432,
  totalFeesEth: 523.67,
};

// ── Public API ───────────────────────────────────────────────────────────────

// Replace these with actual Dune query IDs when dashboards are created
const QUERY_IDS = {
  stats: process.env.NEXT_PUBLIC_DUNE_QUERY_STATS || "",
  leaderboard: process.env.NEXT_PUBLIC_DUNE_QUERY_LEADERBOARD || "",
  volumeTrend: process.env.NEXT_PUBLIC_DUNE_QUERY_VOLUME_TREND || "",
};

export async function fetchStats(): Promise<AnalyticsStats> {
  const cacheKey = "stats";
  const cached = getCached<AnalyticsStats>(cacheKey);
  if (cached) return cached;

  if (QUERY_IDS.stats) {
    const rows = await fetchDuneQuery<Record<string, number>>(QUERY_IDS.stats);
    if (rows && rows.length > 0) {
      const row = rows[0];
      const stats: AnalyticsStats = {
        totalCodesMinted: row.total_codes_minted ?? 0,
        totalAttributedTxs: row.total_attributed_txs ?? 0,
        totalFeesEth: row.total_fees_eth ?? 0,
      };
      setCache(cacheKey, stats);
      return stats;
    }
  }

  setCache(cacheKey, MOCK_STATS);
  return MOCK_STATS;
}

export async function fetchLeaderboard(timeRange: TimeRange = "28d"): Promise<LeaderboardEntry[]> {
  const cacheKey = `leaderboard-${timeRange}`;
  const cached = getCached<LeaderboardEntry[]>(cacheKey);
  if (cached) return cached;

  if (QUERY_IDS.leaderboard) {
    const rows = await fetchDuneQuery<Record<string, unknown>>(QUERY_IDS.leaderboard);
    if (rows && rows.length > 0) {
      const entries: LeaderboardEntry[] = rows.map((row, i) => ({
        rank: i + 1,
        code: String(row.builder_code ?? ""),
        txCount: Number(row.tx_count ?? 0),
        uniqueUsers: Number(row.unique_users ?? 0),
        volumeEth: Number(row.total_volume_eth ?? 0),
        feesEth: Number(row.total_fees_eth ?? 0),
      }));
      setCache(cacheKey, entries);
      return entries;
    }
  }

  // Mock: adjust values by time range
  const multiplier = timeRange === "7d" ? 0.25 : timeRange === "28d" ? 1 : timeRange === "90d" ? 3 : 8;
  const mockData = MOCK_LEADERBOARD.map(entry => ({
    ...entry,
    txCount: Math.round(entry.txCount * multiplier),
    uniqueUsers: Math.round(entry.uniqueUsers * multiplier * 0.7),
    volumeEth: Math.round(entry.volumeEth * multiplier * 100) / 100,
    feesEth: Math.round(entry.feesEth * multiplier * 100) / 100,
  }));
  setCache(cacheKey, mockData);
  return mockData;
}

export async function fetchVolumeTrend(timeRange: TimeRange = "28d"): Promise<VolumeTrendPoint[]> {
  const cacheKey = `volume-trend-${timeRange}`;
  const cached = getCached<VolumeTrendPoint[]>(cacheKey);
  if (cached) return cached;

  if (QUERY_IDS.volumeTrend) {
    const rows = await fetchDuneQuery<Record<string, unknown>>(QUERY_IDS.volumeTrend);
    if (rows && rows.length > 0) {
      const points: VolumeTrendPoint[] = rows.map(row => ({
        date: String(row.day ?? row.date ?? ""),
        volumeEth: Number(row.total_volume_eth ?? row.volume_eth ?? 0),
        txCount: Number(row.tx_count ?? 0),
        feesEth: Number(row.total_fees_eth ?? row.fees_eth ?? 0),
      }));
      setCache(cacheKey, points);
      return points;
    }
  }

  const days = timeRange === "7d" ? 7 : timeRange === "28d" ? 28 : timeRange === "90d" ? 90 : 365;
  const mockData = generateMockVolumeTrend(days);
  setCache(cacheKey, mockData);
  return mockData;
}
