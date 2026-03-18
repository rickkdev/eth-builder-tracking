-- Query 4: Top 50 builder tags by 28-day attributed transaction count and volume
-- Leaderboard query for the analytics dashboard.

WITH parsed_attributed_txs AS (
    -- Reference to Query 1 output
    -- Replace XXXXXX with Query 1's saved query ID in Dune
    SELECT
        tx_hash,
        block_time,
        sender,
        value_eth,
        fee_eth,
        builder_tag
    FROM query_XXXXXX -- Replace with Query 1 saved query ID
    WHERE block_time >= NOW() - INTERVAL '28' DAY
)

SELECT
    builder_tag,
    -- Transaction metrics
    COUNT(*) AS tx_count_28d,
    COUNT(DISTINCT sender) AS unique_users_28d,
    -- Volume metrics
    SUM(value_eth) AS total_volume_eth_28d,
    -- Fee metrics
    SUM(fee_eth) AS total_fees_eth_28d,
    -- Average transaction value
    AVG(value_eth) AS avg_tx_value_eth,
    -- First and last seen
    MIN(block_time) AS first_tx_28d,
    MAX(block_time) AS last_tx_28d
FROM parsed_attributed_txs
GROUP BY builder_tag
ORDER BY tx_count_28d DESC
LIMIT 50
