-- Query 3: Daily volume (ETH), gas fees, and unique users per builder code
-- Aggregates attributed transaction metrics at daily granularity per code.
--
-- Depends on: Query 1 logic for parsing ERC-8021 suffixes.
-- In Dune, save Query 1 as a view/materialized query and reference it here,
-- or inline the CTE. Below uses a CTE reference pattern.

-- Replace {{parsed_txs_query_id}} with the saved Query 1 ID when using Dune API,
-- or inline the full Query 1 CTE here.

WITH parsed_attributed_txs AS (
    -- Reference to Query 1 output - in Dune, use:
    -- SELECT * FROM query_{{parsed_txs_query_id}}
    -- For standalone use, inline Query 1 CTEs here
    SELECT
        tx_hash,
        block_time,
        block_number,
        sender,
        receiver,
        value_eth,
        gas_used,
        gas_price,
        fee_eth,
        builder_code
    FROM query_XXXXXX -- Replace XXXXXX with Query 1's saved query ID
)

SELECT
    DATE_TRUNC('day', block_time) AS day,
    builder_code,
    -- Transaction count
    COUNT(*) AS tx_count,
    -- Unique senders (users)
    COUNT(DISTINCT sender) AS unique_users,
    -- Total ETH volume transferred
    SUM(value_eth) AS total_volume_eth,
    -- Total gas fees paid (in ETH)
    SUM(fee_eth) AS total_fees_eth,
    -- Average fee per transaction
    AVG(fee_eth) AS avg_fee_eth,
    -- Total gas consumed
    SUM(gas_used) AS total_gas_used
FROM parsed_attributed_txs
GROUP BY
    DATE_TRUNC('day', block_time),
    builder_code
ORDER BY day DESC, total_volume_eth DESC
