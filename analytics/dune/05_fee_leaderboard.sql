-- Query 5: Leaderboard ranked by total fees generated
-- Shows which builder tags are responsible for the most gas fees on Ethereum.
-- Uses effective_gas_price (includes priority fee) for accurate fee calculation.

WITH parsed_attributed_txs AS (
    -- Reference to Query 1 output
    -- Replace XXXXXX with Query 1's saved query ID in Dune
    SELECT
        tx_hash,
        block_time,
        sender,
        value_eth,
        gas_used,
        gas_price,
        fee_eth,
        builder_tag
    FROM query_XXXXXX -- Replace with Query 1 saved query ID
)

SELECT
    builder_tag,
    -- Fee metrics (primary sort)
    SUM(fee_eth) AS total_fees_eth,
    SUM(gas_used) AS total_gas_used,
    -- Transaction metrics
    COUNT(*) AS total_tx_count,
    COUNT(DISTINCT sender) AS total_unique_users,
    -- Volume
    SUM(value_eth) AS total_volume_eth,
    -- Averages
    AVG(fee_eth) AS avg_fee_per_tx_eth,
    AVG(gas_used) AS avg_gas_per_tx,
    -- Time range
    MIN(block_time) AS first_attributed_tx,
    MAX(block_time) AS last_attributed_tx,
    -- Days active
    DATE_DIFF('day', MIN(block_time), MAX(block_time)) + 1 AS days_active
FROM parsed_attributed_txs
GROUP BY builder_tag
ORDER BY total_fees_eth DESC
