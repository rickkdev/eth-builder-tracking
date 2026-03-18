# Dune Analytics - BuilderTag

DuneSQL queries for parsing ERC-8021 builder tag suffixes from Ethereum mainnet transactions and producing attribution metrics.

## Queries

| # | File | Description |
|---|------|-------------|
| 1 | `01_parse_8021_suffixes.sql` | Parse transactions with ERC-8021 suffixes - detects 0x8021 marker, extracts ASCII code |
| 2 | `02_codes_with_owners.sql` | Join parsed codes with TagRegistry events to get code owners |
| 3 | `03_daily_metrics.sql` | Daily volume (ETH), gas fees, unique users per code |
| 4 | `04_top_codes_28d.sql` | Top 50 codes by 28-day transaction count and volume |
| 5 | `05_fee_leaderboard.sql` | Leaderboard ranked by total fees generated (SUM gas_used * gas_price) |
| 6 | `06_all_registered_codes.sql` | All registered codes with current owners (replaces subgraph) |

## Setup on Dune

### Creating Dashboards

1. Go to [dune.com](https://dune.com) and sign in
2. Click **New Query** and paste a query from this directory
3. Replace template variables:
   - `{{tag_registry_address}}` — deployed TagRegistry contract address
   - `query_XXXXXX` — replace with the saved Query 1 ID (queries 2-5 reference it)
   - `topic1 = 0x` — replace with the `keccak256("TagMinted(uint256,string,address)")` event topic hash
4. Save each query with a descriptive name
5. Create a new dashboard and add query visualizations

### Recommended Dashboard Layout

- **Top row**: Summary stats (total codes, total txs, total fees) from Query 5
- **Middle**: Leaderboard table from Query 4, volume chart from Query 3
- **Bottom**: All codes table from Query 6

### Query Dependencies

```
Query 1 (parse suffixes) ──> Query 2 (join with owners)
                         ──> Query 3 (daily metrics)
                         ──> Query 4 (top codes 28d)
                         ──> Query 5 (fee leaderboard)

Query 6 (all codes) is standalone - reads directly from contract events
```

Save Query 1 first, note its query ID, then update the `query_XXXXXX` references in Queries 2-5.

## Using the Dune API

Fetch query results programmatically via the [Dune API](https://docs.dune.com/api-reference/overview):

### Authentication

```bash
export DUNE_API_KEY="your_api_key_here"
```

### Execute a Query

```bash
# Trigger execution
curl -X POST "https://api.dune.com/api/v1/query/{query_id}/execute" \
  -H "X-Dune-API-Key: $DUNE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query_parameters": {"tag_registry_address": "0xYOUR_CONTRACT_ADDRESS"}}'
```

### Get Results

```bash
# Get latest results (cached)
curl "https://api.dune.com/api/v1/query/{query_id}/results" \
  -H "X-Dune-API-Key: $DUNE_API_KEY"
```

### TypeScript Example

```typescript
const DUNE_API_KEY = process.env.DUNE_API_KEY;
const BASE_URL = "https://api.dune.com/api/v1";

async function fetchQueryResults(queryId: number) {
  const response = await fetch(`${BASE_URL}/query/${queryId}/results`, {
    headers: { "X-Dune-API-Key": DUNE_API_KEY! },
  });
  const data = await response.json();
  return data.result.rows;
}

// Example: fetch leaderboard
const leaderboard = await fetchQueryResults(QUERY_4_ID);
```

### Caching Strategy

- Dune caches query results after each execution
- Recommended refresh interval: **5-15 minutes** for dashboard data
- Use `max_age_hours` parameter to control cache freshness:

```bash
curl "https://api.dune.com/api/v1/query/{query_id}/results?max_age_hours=0.25" \
  -H "X-Dune-API-Key: $DUNE_API_KEY"
```

## Query Syntax Notes

- All queries use **DuneSQL (Trino)** syntax — not Spark SQL
- `ethereum.transactions` and `ethereum.logs` are the primary tables
- `bytearray_substring()`, `bytearray_to_uint256()`, `from_utf8()` are Dune-specific functions
- Use `0x` prefix for hex literals (e.g., `0x80218021`)
- `DATE_TRUNC('day', block_time)` for time aggregation
- `NOW() - INTERVAL '28' DAY` for rolling windows
